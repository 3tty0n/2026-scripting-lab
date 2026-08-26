"""ノートブックの中から、採点と同じ検査を走らせる。

学生はこれで自分の出来具合いを確かめる。教員が採点に使うのと同じ検査コードなので、
ここで全部 OK なら、そのまま出してよい。点数は出さない。

Colab では checks/ が手元に無いので、公開ページから取ってくる。

    from autograde import check, score
    check('q1')     # 1問だけ
    score()         # 全部まとめて OK / NG
"""
import contextlib
import io
import pathlib
import sys
import urllib.request

BASE_URL = "https://3tty0n.github.io/2026-scripting-lab/grading/checks"
TASKS = {
    "01": "01_basics",
    "02": "02_text",
    "03a": "03a_llm",
    "03b": "03b_forth",
    "03a_web": "03a_llm_webllm",
}

_cache = {}


def _caller_namespace():
    """呼び出し元 (ノートブック) の変数を取る"""
    try:
        from IPython import get_ipython
        ip = get_ipython()
        if ip is not None:
            return ip.user_ns
    except Exception:
        pass
    frame = sys._getframe(2)
    return frame.f_globals


def _load(task):
    """checks/<task>.py を読む。手元に無ければ公開ページから取得"""
    if task in _cache:
        return _cache[task]
    name = TASKS[task]
    local = [
        pathlib.Path(__file__).resolve().parent / "checks" / f"{name}.py",
        pathlib.Path("grading/checks") / f"{name}.py",
        pathlib.Path("checks") / f"{name}.py",
    ]
    src = None
    for p in local:
        if p.exists():
            src = p.read_text(encoding="utf-8")
            break
    if src is None:
        with urllib.request.urlopen(f"{BASE_URL}/{name}.py", timeout=20) as r:
            src = r.read().decode("utf-8")
    ns = {}
    exec(compile(src, f"checks/{name}.py", "exec"), ns)
    _cache[task] = ns["CHECKS"]
    return _cache[task]


def _task_of(ns):
    """ノートブックが設定した TASK を読む"""
    t = ns.get("TASK")
    if t not in TASKS:
        raise RuntimeError(
            "TASK が設定されていない。ノートブック冒頭の準備セルを実行すること")
    return t


_prelude_done = set()


def _ensure_prelude(ns):
    """need / holds を学生の名前空間に用意する"""
    if "need" in ns:
        return
    src = None
    for p in (pathlib.Path(__file__).resolve().parent / "contracts.py",
              pathlib.Path("grading/contracts.py"), pathlib.Path("contracts.py")):
        if p.exists():
            src = p.read_text(encoding="utf-8")
            break
    if src is None:
        with urllib.request.urlopen(
                BASE_URL.rsplit("/", 1)[0] + "/contracts.py", timeout=20) as r:
            src = r.read().decode("utf-8")
    tmp = {}
    exec(compile(src, "contracts.py", "exec"), tmp)
    exec(compile(tmp["PRELUDE"], "<prelude>", "exec"), ns)


def _advise(ns, task, qid, err, msg):
    """落ちた項目に、次にやることを一行足す"""
    if "→" in msg:
        return msg
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            hint = ns["diagnose"](task, qid, err)
    except BaseException:
        hint = ""
    return msg + ("\n→ " + hint if hint else "")


def setup(ns):
    """確認セルの中で使う道具 (need / holds / watch など) を用意する。

    ノートブックの準備セルから1回呼ぶ。これを呼んでおくと、
    確認セルをそのまま実行しても動く。
    """
    _ensure_prelude(ns)
    return None


def _run(code, ns, task=None, qid=None):
    # 検査コード自身の print('OK') は出さない。結果はこちらでまとめて表示する
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(code, "<check>", "exec"), ns)
    except AssertionError as e:
        return False, _advise(ns, task, qid, e,
                              str(e) or "assert に引っかかった")
    except BaseException as e:
        return False, _advise(ns, task, qid, e, f"{type(e).__name__}: {e}")
    return True, ""


def check(qid, ns=None):
    """1問だけ検査する"""
    ns = ns if ns is not None else _caller_namespace()
    _ensure_prelude(ns)
    task = _task_of(ns)
    for q, title, points, body in _load(task):
        if q != qid:
            continue
        ok, msg = _run("\n".join(body), ns, task, qid)
        if ok:
            print(f"OK  {qid} {title}")
            for f in ns.get("_FACTS", []):
                print(f"    ・{f}")
        else:
            print(f"NG  {qid} {title}")
            for line in msg.splitlines():
                print(f"    {line}")
        return ok
    raise KeyError(f"そんな検査項目は無い: {qid}")


def score(ns=None, quiet=False):
    """全部まとめて確かめる。点数ではなく OK / NG を出す"""
    ns = ns if ns is not None else _caller_namespace()
    _ensure_prelude(ns)
    task = _task_of(ns)
    rows = []
    for qid, title, _points, body in _load(task):
        ok, msg = _run("\n".join(body), ns, task, qid)
        rows.append((qid, title, ok, msg))

    if not quiet:
        width = max(len(t) for _q, t, *_ in rows)
        rule = "-" * (width + 12)
        print(rule)
        for qid, title, ok, msg in rows:
            print(f"{'OK ' if ok else 'NG '} {qid:4} {title}")
            if not ok and msg:
                for line in msg.splitlines():
                    print(f"       {line[:74]}")
        print(rule)
        for f in ns.get("_FACTS", []):
            print(f"・{f}")
        ng = [q for q, _t, ok, _m in rows if not ok]
        if ng:
            print("まだ NG: " + ", ".join(ng))
        else:
            print("すべて OK。この状態で提出すること")
    return None
