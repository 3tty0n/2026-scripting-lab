#!/usr/bin/env python3
"""提出された .ipynb を自動採点する。

使い方:
    python3 grading/grade.py 01 提出物/*.ipynb
    python3 grading/grade.py 02 提出物/ --csv 結果.csv

学生のノートブック内の確認セル (先頭が "# [CHECK]") は実行しない。
代わりに grading/checks/ にある正式な採点コードを、学生の名前空間に対して走らせる。
これで確認セルを書き換えても点にはならない。
"""
import argparse
import contextlib
import io
import json
import linecache
import os
import pathlib
import signal
import sys
import traceback

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from notebook import parse, FormatError      # noqa: E402

TASKS = {
    "01": "01_basics",
    "02": "02_text",
    "03a": "03a_llm",
    "03b": "03b_forth",
}


class Timeout(Exception):
    pass


@contextlib.contextmanager
def time_limit(seconds):
    """1セルあたりの実行時間を制限する。無限ループ対策"""
    def handler(signum, frame):
        raise Timeout(f"{seconds} 秒を超えた")

    old = signal.signal(signal.SIGALRM, handler)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def load_checks(task):
    """checks/<task>.py から CHECKS を読む"""
    ns = {}
    path = HERE / "checks" / f"{TASKS[task]}.py"
    exec(compile(path.read_text(encoding="utf-8"), str(path), "exec"), ns)
    return ns["CHECKS"]


def student_cells(nb_path):
    """確認セルとシェルコマンドを除いた、学生のコードセルを順に返す。

    形が壊れていれば FormatError を投げる (採点0点とは別扱い)。
    """
    text = pathlib.Path(nb_path).read_text(encoding="utf-8", errors="replace")
    return parse(text, pathlib.Path(nb_path).name)["code"]


def no_input(*_args, **_kwargs):
    raise RuntimeError("採点中は input() を使えない。引数で受け取る形に直すこと")


def failing_line(code):
    """メッセージの無い assert のために、引っかかった行そのものを見せる"""
    tb = sys.exc_info()[2]
    lineno = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename.startswith("<check"):
            lineno = tb.tb_lineno
        tb = tb.tb_next
    if not lineno:
        return ""
    lines = code.split("\n")
    if 1 <= lineno <= len(lines):
        return "この行で失敗: " + lines[lineno - 1].strip()[:70]
    return ""


def advise(ns, task, qid, err, msg):
    """落ちた項目に、次にやることを一行足す。

    助言を作るのは学生の名前空間の中 (contracts.py の diagnose)。
    定義した関数をその場で呼び直したり、構文木を見たりして手がかりを探す。
    """
    if "→" in msg:
        return msg
    try:
        with time_limit(20), contextlib.redirect_stdout(io.StringIO()):
            hint = ns["diagnose"](task, qid, err)
    except BaseException:
        hint = ""
    return msg + ("\n→ " + hint if hint else "")


def load_prelude():
    """確認セルの中で使う道具 (need / holds など) の定義"""
    ns = {}
    exec(compile((HERE / "contracts.py").read_text(encoding="utf-8"),
                 "contracts.py", "exec"), ns)
    return ns["PRELUDE"]


def run_notebook(nb_path, cell_timeout):
    """学生のセルを順に実行し、できあがった名前空間を返す"""
    ns = {"__name__": "__student__", "input": no_input}
    exec(compile(load_prelude(), "<prelude>", "exec"), ns)
    errors = []
    for i, code in enumerate(student_cells(nb_path), 1):
        # 学生のコードを linecache に登録しておく。
        # こうすると採点側から inspect.getsource が使え、
        # 「どう書いたか」を構文木から見て助言できる (contracts.py の tags)。
        name = f"<cell {i}>"
        linecache.cache[name] = (len(code), None, code.splitlines(True), name)
        try:
            with time_limit(cell_timeout), contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code, name, "exec"), ns)
        except Timeout as e:
            errors.append(f"セル{i}: タイムアウト ({e})")
        except SystemExit:
            pass
        except BaseException as e:
            errors.append(f"セル{i}: {type(e).__name__}: {e}")
    return ns, errors


def grade(nb_path, task, cell_timeout=60, check_timeout=120):
    checks = load_checks(task)
    try:
        ns, cell_errors = run_notebook(nb_path, cell_timeout)
    except FormatError as e:
        # 中身が0点なのではなく、そもそも読めなかった
        return {"file": str(nb_path), "task": task, "score": 0,
                "total": sum(c[2] for c in checks), "results": [],
                "cell_errors": [], "format_error": str(e)}

    results, earned, total = [], 0, 0
    for qid, title, points, body in checks:
        code = "\n".join(body)
        total += points
        try:
            with time_limit(check_timeout), contextlib.redirect_stdout(io.StringIO()):
                # ns のコピーではなく ns 自体で実行する。
                # 学生の関数が global 宣言でモジュール変数を書き換えるため、
                # 別 dict にすると書き換えが見えなくなる。
                exec(compile(code, f"<check {qid}>", "exec"), ns)
        except Timeout:
            results.append((qid, title, 0, points, "タイムアウト"))
        except AssertionError as e:
            msg = str(e) or failing_line(code) or "assert に引っかかった"
            results.append((qid, title, 0, points, advise(ns, task, qid, e, msg)))
        except BaseException as e:
            results.append((qid, title, 0, points,
                            advise(ns, task, qid, e, f"{type(e).__name__}: {e}")))
        else:
            earned += points
            results.append((qid, title, points, points, "OK"))
    return {
        "file": str(nb_path),
        "task": task,
        "score": earned,
        "total": total,
        "results": results,
        "cell_errors": cell_errors,
        "facts": list(ns.get("_FACTS", [])),
    }


def print_report(r, verbose):
    name = pathlib.Path(r["file"]).name
    if r.get("format_error"):
        print(f"\n{'=' * 72}\n{name}   フォーマットエラー\n{'=' * 72}")
        print("  " + str(r["format_error"]).replace("\n", "\n  "))
        print("  ※ 中身を採点できていない。0点として扱わず、出し直してもらうこと")
        return
    print(f"\n{'=' * 72}\n{name}   {r['score']} / {r['total']}\n{'=' * 72}")
    for qid, title, got, pts, msg in r["results"]:
        mark = "OK  " if got else "NG  "
        line = f"  {mark} {qid:5} {title:30} {got:3}/{pts:<3}"
        if got != pts:
            head, *rest = (msg or "").splitlines()
            line += f"  {head[:60]}"
            print(line)
            for extra in rest:
                print(f"{'':16}{extra[:74]}")
            continue
        print(line)
    for f in r.get("facts", []):
        print(f"  ・{f}")
    if r["cell_errors"] and verbose:
        print("  -- 実行時のエラー (参考) --")
        for e in r["cell_errors"]:
            print(f"     {e}")


def post_results(url, task, reports):
    """採点結果をまとめて送る。サーバを立てない運用のとき使う。

    送るのは点数だけで、学生のコードは送らない。
    """
    import urllib.request

    ok = 0
    for r in reports:
        student = pathlib.Path(r["file"]).stem
        body = json.dumps({
            "student": student, "task": task,
            "score": r["score"], "total": r["total"],
            "results": {q: g for q, _t, g, _p, _m in r["results"]},
        }, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=30).read()
            ok += 1
        except Exception as e:
            print(f"  送信できなかった {student}: {e}")
    print(f"\n{ok} / {len(reports)} 件を送信した: {url}")


def check_setup(task):
    """配布状態のノートブックを採点する。全項目 0 点なら配線は正しい。

    模範解答はこのリポジトリに置いていない (公開されるため)。
    採点器そのものが動くかどうかだけを、ここで確かめる。
    """
    nb = HERE.parent / "exercises" / f"{TASKS[task]}.ipynb"
    if not nb.exists():
        sys.exit(f"{nb} が見つからない")
    checks = load_checks(task)
    print(f"配布物: {nb.name}")
    print(f"検査項目: {len(checks)} 件 / 満点 {sum(c[2] for c in checks)}")
    r = grade(nb, task)
    ng = [q for q, _t, got, _p, _m in r["results"] if got]
    print_report(r, verbose=True)
    if r["score"] != 0:
        print(f"\n異常: 白紙のはずが {r['score']} 点。項目 {ng} を見直すこと")
        return 1
    print("\n正常: 白紙は 0 点。採点器は動いている")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("task", choices=sorted(TASKS), help="どの回の課題か")
    ap.add_argument("paths", nargs="*", help=".ipynb ファイル、またはそれを含むディレクトリ")
    ap.add_argument("--check-setup", action="store_true",
                    help="配布状態のノートブックを採点し、採点器が動くかだけ確かめる")
    ap.add_argument("--csv", help="集計結果を CSV で書き出す")
    ap.add_argument("--post", metavar="URL",
                    help="採点結果を送る先 (server/app.py の /api/results か "
                         "Apps Script のウェブアプリ URL)")
    ap.add_argument("--json", help="詳細を JSON で書き出す")
    ap.add_argument("--cell-timeout", type=int, default=60, help="1セルの制限秒数")
    ap.add_argument("--check-timeout", type=int, default=120, help="1採点項目の制限秒数")
    ap.add_argument("-v", "--verbose", action="store_true", help="実行時エラーも表示")
    args = ap.parse_args()

    if args.check_setup:
        return check_setup(args.task)

    if not args.paths:
        sys.exit("採点する .ipynb を指定すること (確認だけなら --check-setup)")

    files = []
    for p in args.paths:
        p = pathlib.Path(p)
        files.extend(sorted(p.glob("*.ipynb")) if p.is_dir() else [p])
    if not files:
        sys.exit("採点対象の .ipynb が見つからない")

    reports = []
    for f in files:
        try:
            r = grade(f, args.task, args.cell_timeout, args.check_timeout)
        except Exception:
            traceback.print_exc()
            r = {"file": str(f), "task": args.task, "score": 0, "total": 0,
                 "results": [], "cell_errors": ["採点自体が失敗"]}
        reports.append(r)
        print_report(r, args.verbose)

    if args.csv:
        import csv
        qids = [q for q, *_ in load_checks(args.task)]
        with open(args.csv, "w", newline="", encoding="utf-8") as fp:
            w = csv.writer(fp)
            w.writerow(["file", "score", "total", "format_error"] + qids)
            for r in reports:
                got = {q: g for q, _t, g, _p, _m in r["results"]}
                w.writerow([pathlib.Path(r["file"]).name, r["score"], r["total"],
                            r.get("format_error", "")]
                           + [got.get(q, 0) for q in qids])
        print(f"\nCSV を書き出した: {args.csv}")

    if args.post:
        post_results(args.post, args.task, reports)

    if args.json:
        pathlib.Path(args.json).write_text(
            json.dumps(reports, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"JSON を書き出した: {args.json}")

    if len(reports) > 1:
        avg = sum(r["score"] for r in reports) / len(reports)
        print(f"\n{len(reports)} 件 / 平均 {avg:.1f} 点")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
