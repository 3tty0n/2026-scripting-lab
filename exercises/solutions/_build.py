"""模範解答を埋めた .ipynb を作る。採点器の検証用。

solutions は {そのセルにしか出てこない目印: 差し替える中身} の辞書。
目印が複数のセルに当たる場合はエラーにする。
"""
import json, pathlib


def build(src, dst, solutions):
    nb = json.loads(pathlib.Path(src).read_text(encoding="utf-8"))
    code_cells = [c for c in nb["cells"]
                  if c["cell_type"] == "code"
                  and not "".join(c["source"]).lstrip().startswith(("# [CHECK]", "# [SKIP]"))]
    for key, repl in solutions.items():
        hits = [c for c in code_cells if key in "".join(c["source"])]
        if len(hits) != 1:
            raise SystemExit(f"目印 {key!r} が {len(hits)} 個のセルに当たった")
        lines = repl.split("\n")
        hits[0]["source"] = [l + "\n" for l in lines[:-1]] + [lines[-1]]
    pathlib.Path(dst).write_text(json.dumps(nb, ensure_ascii=False, indent=1),
                                 encoding="utf-8")
    print("  ->", pathlib.Path(dst).name)
