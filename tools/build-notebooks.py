#!/usr/bin/env python3
"""演習ノートブックへ、自己確認 (check/score) の準備セルを自動注入する。

- 既存の準備セル (# [SKIP] ... 自己確認の準備) を、自己完結した1セルに置き換える
- 説明用マークダウン「自己確認の準備」を削除する
- 準備セルはメタデータで非表示にする
  - JupyterLite / JupyterLab: jupyter.source_hidden
  - Colab: cellView "form" (折りたたみフォーム)

使い方:
    python3 tools/build-notebooks.py            # exercises/ と exercises/solutions/
    python3 tools/build-notebooks.py exercises/ # 指定ディレクトリだけ
"""
import argparse
import pathlib
import sys

import nbformat

TASK_OF = {
    "06_basics.ipynb": "06",
    "07_text.ipynb": "07",
    "08a_llm.ipynb": "08a",
    "08a_llm_webllm.ipynb": "08a_web",
    "08b_forth.ipynb": "08b",
}

BASE = "https://3tty0n.github.io/2026-scripting-lab/grading"

PREP = """#@title 自動セットアップ (実行するだけ。中身は隠しています)
# [SKIP] 採点の対象外
# ---- 自己確認の準備 (check / score)。1回実行すればよい ----
import pathlib
import urllib.request

if not pathlib.Path('autograde.py').exists():
    try:
        urllib.request.urlretrieve(
            '{BASE}/autograde.py', 'autograde.py')
    except Exception as e:
        print('取得できませんでした:', e)

from autograde import check, score
TASK = '{task}'
"""

HIDDEN_MD = {
    "cellView": "form",
    "colab": {},
    "jupyter": {"source_hidden": True},
}


def fix_notebook(path):
    nb = nbformat.read(path, as_version=4)
    task = TASK_OF.get(path.name)
    if task is None:
        print(f"skip: {path} (対象外)")
        return None
    prep_idx = None
    inst_idx = None
    for i, cell in enumerate(nb.cells):
        src = "".join(cell.source)
        if cell.cell_type == "code" and "# [SKIP]" in src and "自己確認" in src and "準備" in src:
            prep_idx = i
        if (
            cell.cell_type == "markdown"
            and "自己確認の準備" in src
            and "下のセルを1回実行する" in src
        ):
            inst_idx = i
    if prep_idx is None:
        print(f"skip: {path} (準備セルが見つからない)")
        return None

    new = nbformat.v4.new_code_cell(
        PREP.format(BASE=BASE, task=task).splitlines(keepends=True)
    )
    new.metadata = dict(HIDDEN_MD)
    nb.cells[prep_idx] = new
    if inst_idx is not None:
        del nb.cells[inst_idx]
    nbformat.write(nb, path)
    return f"task={task} prep@cell{prep_idx} inst={inst_idx}"


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="*", default=["exercises", "exercises/solutions"])
    args = ap.parse_args(argv)
    changed = 0
    for d in args.dirs:
        for path in sorted(pathlib.Path(d).glob("*.ipynb")):
            r = fix_notebook(path)
            if r is not None:
                print(f"ok: {path} ({r})")
                changed += 1
    print(f"changed {changed} notebook(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))