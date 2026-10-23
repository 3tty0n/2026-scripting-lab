---
title: スクリプト言語演習 2026 (TMU)
kicker: Scripting Languages · 2026
heading: スクリプト言語演習 2026
credit: "担当: 佐藤、草野、伊澤、大久保"
---

課題は **Google Colab** で進めます。
**「Colab で開く」**を押し、Colab の
`ファイル → ドライブにコピーを保存` で自分の控えを作ってから書き始めてください。
書き終えたら `ファイル → .ipynb をダウンロード` で保存して kibaco に提出します。

## 06

### 動的言語としての Python の基礎

スクリプト言語は動的型付け言語 (動的言語) のサブセットです。
スクリプト言語の理解を深めるために、動的言語の基礎を Python を通して学びます。

[Colab で開く](gist:06_basics.ipynb)
[スライド (PDF)](06-basics/06-basics-beamer.pdf)
[.ipynb を保存](exercises/06_basics.ipynb)

## CS 07

### テキスト処理: 文章生成と計算

第6回で勉強した内容を少し発展させます。
テキストのトーカナイズ (字句解析) から文章生成と計算まで行います。

[Colab で開く](gist:07_text.ipynb)
[スライド (PDF)](07-text/07-text-beamer.pdf)
[.ipynb を保存](exercises/07_text.ipynb)

## CS 08

### 簡易インタプリタの実装

スタックベース言語 Forth のインタプリタを作ります。
第7回の逆ポーランド電卓に `: 名前 … ;` を足して
**実行中に語彙を増やせる**ようにすると、電卓が言語になります。

[Colab で開く](gist:08_forth.ipynb)
[スライド (PDF)](08-forth/08-forth-beamer.pdf)
[.ipynb を保存](exercises/08_forth.ipynb)

## EECS 05

### Python の使い方・数値計算・グラフ

Colab での Python の使い方から始め、numpy で数値を計算し、
ファイルの読み書きと matplotlib でのグラフ作成までを学びます。

[Colab で開く](gist:eecs05_python.ipynb)
[スライド (PDF)](eecs05-python/eecs05-python-beamer.pdf)
[.ipynb を保存](exercises/eecs05_python.ipynb)

## EECS 06

### データ構造・繰り返し・分岐

リスト・辞書・`for`・`while`・`if` を使って、データを数えたり判定したりします。

[Colab で開く](gist:eecs06_data.ipynb)
[スライド (PDF)](eecs06-data/eecs06-data-beamer.pdf)
[.ipynb を保存](exercises/eecs06_data.ipynb)

## EECS 07

### 簡易インタプリタの実装

スタックと「記号 → 関数」の表を使って、小さな言語 Forth のインタプリタを作ります。

[Colab で開く](gist:eecs07_forth.ipynb)
[スライド (PDF)](eecs07-forth/eecs07-forth-beamer.pdf)
[.ipynb を保存](exercises/eecs07_forth.ipynb)

## 提出

- すべてのセルを上から実行し、**出力を残したまま**保存する
- Colab の `ファイル → .ipynb をダウンロード` で保存
- 各課題の下の**確認セル**が `OK` と出れば正解。各回とも満点100
- 確認セル (`# [CHECK]`) は自分で確かめる用。
      **消しても教員の採点は別のテストで行う**が、自分では確かめられなくなるので残すこと。
      書き換えても点は変わりません

## どうしても Colab を使いたくない人向け

<details class="alt">
  <summary>JupyterLite がブラウザで使えます!</summary>
  <p class="note">
    下のリンクから、このページの中で Jupyter が立ち上がります (JupyterLite)。
    <strong>書いた内容はそのブラウザにだけ残るので、作業を中断した時や提出前に必ず
    <code>File → Download</code> で <code>.ipynb</code> を保存してください。</strong>
  </p>
  <div class="links">
    <a data-release="06-basics" href="jupyter-lite/notebooks/index.html?path=06_basics.ipynb">CS 第6回</a>
    <a data-release="07-text" href="jupyter-lite/notebooks/index.html?path=07_text.ipynb">CS 第7回</a>
    <a data-release="08-forth" href="jupyter-lite/notebooks/index.html?path=08_forth.ipynb">CS 第8回</a>
    <a data-release="eecs05-python" href="jupyter-lite/notebooks/index.html?path=eecs05_python.ipynb">EECS 第5回</a>
    <a data-release="eecs06-data" href="jupyter-lite/notebooks/index.html?path=eecs06_data.ipynb">EECS 第6回</a>
    <a data-release="eecs07-forth" href="jupyter-lite/notebooks/index.html?path=eecs07_forth.ipynb">EECS 第7回</a>
  </div>
</details>
