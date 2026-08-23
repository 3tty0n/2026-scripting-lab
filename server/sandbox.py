"""学生のコードを、隔離した子プロセスで走らせる。

採点は grading/grade.py に任せ、ここは「安全に呼ぶ」ことだけを引き受ける。

かけている制限:
  - 実行時間 (SIGKILL まで)
  - CPU 時間 (RLIMIT_CPU)
  - メモリ (RLIMIT_AS)
  - 開けるファイル数 / 作れるプロセス数
  - 作業ディレクトリは使い捨ての一時ディレクトリ
  - 環境変数は最小限

これは「事故を防ぐ」ための壁であって、悪意ある学生を止めきるものではない。
本気で隔離するなら Docker を使うこと (server/Dockerfile)。
"""
import json
import os
import pathlib
import resource
import shutil
import subprocess
import sys
import tempfile

REPO = pathlib.Path(__file__).resolve().parent.parent

LIMITS = {
    "wall_seconds": 600,      # 全体の実行時間
    "cpu_seconds": 300,       # CPU 時間
    "memory_mb": 2048,        # アドレス空間
    "open_files": 256,
    "processes": 64,
    "output_bytes": 1 << 20,  # 標準出力の上限
}


def _apply_limits(limits):
    """子プロセス側で実行される"""
    def preexec():
        resource.setrlimit(resource.RLIMIT_CPU,
                           (limits["cpu_seconds"], limits["cpu_seconds"] + 5))
        mem = limits["memory_mb"] * 1024 * 1024
        try:
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
        except (ValueError, OSError):
            pass          # macOS では効かないことがある
        resource.setrlimit(resource.RLIMIT_NOFILE,
                           (limits["open_files"], limits["open_files"]))
        try:
            resource.setrlimit(resource.RLIMIT_NPROC,
                               (limits["processes"], limits["processes"]))
        except (ValueError, OSError):
            pass
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        os.setsid()       # シグナルをまとめて送れるようにする
    return preexec


def grade_notebook(nb_bytes, task, limits=None, python=None):
    """ノートブックのバイト列を採点し、grade.py の JSON をそのまま返す"""
    lim = dict(LIMITS, **(limits or {}))
    workdir = tempfile.mkdtemp(prefix="grade-")
    try:
        nb = pathlib.Path(workdir, "submission.ipynb")
        nb.write_bytes(nb_bytes)
        out = pathlib.Path(workdir, "result.json")

        cmd = [python or sys.executable,
               str(REPO / "grading" / "grade.py"), task, str(nb),
               "--json", str(out)]
        env = {
            "PATH": "/usr/bin:/bin:/usr/local/bin",
            "HOME": workdir,
            "LANG": "ja_JP.UTF-8",
            "PYTHONDONTWRITEBYTECODE": "1",
            # モデルのキャッシュは共有する (毎回1GB落とさないため)
            "HF_HOME": os.environ.get("HF_HOME",
                                      str(pathlib.Path.home() / ".cache" / "huggingface")),
        }
        try:
            p = subprocess.run(
                cmd, cwd=workdir, env=env, capture_output=True,
                timeout=lim["wall_seconds"], preexec_fn=_apply_limits(lim))
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "制限時間を超えた", "score": 0, "total": 0}

        if out.exists():
            try:
                reports = json.loads(out.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                reports = []
            if reports:
                r = reports[0]
                return {"ok": True, "score": r["score"], "total": r["total"],
                        "results": r["results"], "cell_errors": r["cell_errors"],
                        "facts": r.get("facts", [])}

        tail = p.stderr.decode("utf-8", "replace")[-lim["output_bytes"]:]
        return {"ok": False, "error": tail or "採点に失敗した", "score": 0, "total": 0}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
