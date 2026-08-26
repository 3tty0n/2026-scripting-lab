"""提出された .ipynb を読み、形が壊れていれば分かる言葉で知らせる。

採点そのものより前の段階。ここで落ちたら「フォーマットエラー」として
0点ではなく「採点できなかった」と扱う。両者は原因が違うので分けて出す。
"""
import json

CHECK_MARKER = "# [CHECK]"
SKIP_MARKER = "# [SKIP]"


class FormatError(Exception):
    """ノートブックの形が想定と違う"""

    def __init__(self, message, hint=""):
        super().__init__(message)
        self.message = message
        self.hint = hint

    def __str__(self):
        return self.message + (f"\n  → {self.hint}" if self.hint else "")


def _source_text(cell, index):
    src = cell.get("source", cell.get("input"))      # input は nbformat 3 の名残
    if src is None:
        return ""
    if isinstance(src, str):
        return src
    if isinstance(src, list):
        if not all(isinstance(x, str) for x in src):
            raise FormatError(
                f"{index}番目のセルの source に文字列でないものが混じっている",
                "ノートブックを開き直して保存し直すと直ることが多い")
        return "".join(src)
    raise FormatError(
        f"{index}番目のセルの source の形がおかしい ({type(src).__name__})",
        "Colab の「ファイル → .ipynb をダウンロード」で保存し直すこと")


def parse(text, filename="提出物"):
    """.ipynb の中身 (文字列) を読んで、正規化したセルの一覧を返す。

    返すのは {"code": [ソース文字列...], "n_cells": 総セル数} の形。
    採点対象外のセル ([CHECK] / [SKIP]) と、シェル行 (! や %) は落としてある。
    """
    if text is None or not text.strip():
        raise FormatError(f"{filename} が空",
                          "ファイルを取り違えていないか確認すること")

    head = text.lstrip()[:1]
    if head not in "{[":
        preview = text.strip()[:40].replace("\n", " ")
        raise FormatError(
            f"{filename} は JSON ではない (先頭が「{preview}」)",
            ".ipynb ではなく .py や .html を選んでいないか確認すること")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise FormatError(
            f"{filename} の JSON が壊れている ({e.lineno}行{e.colno}文字目: {e.msg})",
            "編集中に壊れた可能性がある。Colab で開き直して保存し直すこと")

    if not isinstance(data, dict):
        raise FormatError(f"{filename} の中身が辞書ではない",
                          "ノートブックとして保存されているか確認すること")

    fmt = data.get("nbformat")
    if fmt is not None and fmt < 4:
        raise FormatError(
            f"{filename} は古い形式のノートブック (nbformat {fmt})",
            "Jupyter か Colab で開いて保存し直すと新しい形式になる")

    cells = data.get("cells")
    if cells is None:
        raise FormatError(f"{filename} に cells が無い",
                          "ノートブックではないファイルの可能性がある")
    if not isinstance(cells, list):
        raise FormatError(
            f"{filename} の cells が配列ではない ({type(cells).__name__})",
            "Colab で開き直して保存し直すこと")

    code = []
    n_code = 0
    for i, cell in enumerate(cells, 1):
        if not isinstance(cell, dict):
            raise FormatError(f"{i}番目のセルが辞書ではない",
                              "Colab で開き直して保存し直すこと")
        if cell.get("cell_type") != "code":
            continue
        n_code += 1
        src = _source_text(cell, i)
        if src.lstrip().startswith((CHECK_MARKER, SKIP_MARKER)):
            continue
        lines = [l for l in src.split("\n") if not l.lstrip().startswith(("!", "%"))]
        body = "\n".join(lines)
        if body.strip():
            code.append(body)

    if n_code == 0:
        raise FormatError(f"{filename} にコードセルが1つも無い",
                          "課題を書いたノートブックを選んでいるか確認すること")

    return {"code": code, "n_cells": len(cells), "n_code": n_code}
