"""exercises/*.ipynb の確認セルから grading/checks/*.py を生成する。

ノートブックの確認セルを直したら、これを実行して採点定義を作り直すこと。

    python3 grading/build_checks.py
"""
import json, pathlib, re

POINTS = {
 "01_basics": {"q1":10,"q1b":10,"q2":20,"q3":15,"q3b":15,"q4":20,"b1":5,"b2":5},
 "02_text":   {"q1":20,"q2":15,"q2b":10,"q3":20,"q4":25,"b1":5,"b2":5},
 "03a_llm":   {"q1":20,"q2":20,"q2b":5,"q3":10,"q3p":10,"q4":10,"q4b":5,"e1":5,"e2":5,"e3":5,"e4":5},
 "03b_forth": {"q1":20,"q2":20,"q3":25,"q4":15,"b1":10,"b2":10},
}
TITLES = {
 "01_basics": {"q1":"竹内関数","q1b":"異なる引数の組","q2":"ディスパッチテーブル",
               "q3":"@memo","q3b":"memo を tarai に適用","q4":"コマンド表",
               "b1":"@trace","b2":"help の自動生成"},
 "02_text":   {"q1":"トークン化","q2":"次の語の表","q2b":"上位の続き語","q3":"マルコフ連鎖生成",
               "q4":"逆ポーランド電卓","b1":"温度","b2":"trigram"},
 "03a_llm":   {"q1":"上位候補","q2":"greedy 生成","q2b":"繰り返し率","q3":"温度付き top-k",
               "q3p":"top-p","q4":"chat","q4b":"会話の継続","e1":"繰り返しの検出",
               "e2":"コンテキストと圧縮","e3":"ストリーミング表示","e4":"エフォート"},
 "03b_forth": {"q1":"算術","q2":"スタック操作ワード","q3":"ユーザ定義ワード","q4":"REPL",
               "b1":"比較演算子","b2":"IF/ELSE/THEN"},
}

HEADER = '''"""自動採点の検査項目。ノートブックの確認セルと同じ内容。

grading/grade.py が読み込み、学生の名前空間に対して実行する。
このファイルは exercises/*.ipynb の確認セルから生成されている。
手で書き換えず、ノートブック側を直すこと。
"""

CHECKS = [
'''

def build(nb_path, key):
    nb = json.loads(pathlib.Path(nb_path).read_text(encoding="utf-8"))
    out = []
    for c in nb["cells"]:
        if c["cell_type"] != "code":
            continue
        src = "".join(c["source"])
        m = re.match(r"# \[CHECK\] (\S+)\n(.*)", src, re.S)
        if not m:
            continue
        qid, body = m.group(1), m.group(2)
        out.append((qid, TITLES[key][qid], POINTS[key][qid], body.rstrip()))
    missing = set(POINTS[key]) - {q for q, *_ in out}
    if missing:
        print(f"  !! {key}: 確認セルが無い項目 {sorted(missing)}")
    total = sum(p for _q, _t, p, _b in out)
    parts = [HEADER]
    for qid, title, pts, body in out:
        parts.append(f"    ({qid!r}, {title!r}, {pts}, [\n")
        for line in body.split("\n"):
            parts.append(f"        {line!r},\n")
        parts.append("    ]),\n")
    parts.append("]\n\n")
    parts.append("# 本文は行ごとの文字列のリスト。grade.py が改行で連結して実行する。\n")
    parts.append(f"# 満点: {total}\n")
    pathlib.Path("grading/checks", key + ".py").write_text("".join(parts), encoding="utf-8")
    print(f"  {key}: {len(out)} 項目 / 満点 {total}")

if __name__ == "__main__":
    for nb, key in [("exercises/01_basics.ipynb", "01_basics"),
                    ("exercises/02_text.ipynb", "02_text"),
                    ("exercises/03a_llm.ipynb", "03a_llm"),
                    ("exercises/03b_forth.ipynb", "03b_forth")]:
        build(nb, key)
