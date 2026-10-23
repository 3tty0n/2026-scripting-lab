---
title: スクリプト言語演習 2026 (TMU)
kicker: Scripting Languages · 2026
heading: スクリプト言語演習 (CS, EECS) 2026
subtitle: Python 演習 全3回
credit: "担当: 伊澤 侑祐 (情報科学科、助教、yizawa _at_ tmu.ac.jp)"
---

課題は **Google Colab** で進めます。
**「Colab で開く」**を押し、Colab の
`ファイル → ドライブにコピーを保存` で自分の控えを作ってから書き始めてください。
書き終えたら `ファイル → .ipynb をダウンロード` で保存して kibaco に提出します。

## 06

### Python 入門

Python の基礎を簡潔に学びます。動的言語としての特徴も学習します。

[Colab で開く](gist:06_basics.ipynb)
[スライド (PDF)](06-basics/06-basics-beamer.pdf)
[.ipynb を保存](exercises/06_basics.ipynb)

## 07

### テキスト処理: 文章生成と計算

第6回で勉強した内容を少し発展させます。
テキストのトーカナイズ (字句解析) から文章生成と計算まで行います。

[Colab で開く](gist:07_text.ipynb)
[スライド (PDF)](07-text/07-text-beamer.pdf)
[.ipynb を保存](exercises/07_text.ipynb)

## 08

### 簡易インタプリタの実装

スタックベース言語 Forth のインタプリタを作ります。
第7回の逆ポーランド電卓に `: 名前 … ;` を足して
**実行中に語彙を増やせる**ようにすると、電卓が言語になります。

[Colab で開く](gist:08_forth.ipynb)
[スライド (PDF)](08-forth/08-forth-beamer.pdf)
[.ipynb を保存](exercises/08_forth.ipynb)

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
    <a data-release="06-basics" href="jupyter-lite/notebooks/index.html?path=06_basics.ipynb">第6回</a>
    <a data-release="07-text" href="jupyter-lite/notebooks/index.html?path=07_text.ipynb">第7回</a>
    <a data-release="08-forth" href="jupyter-lite/notebooks/index.html?path=08_forth.ipynb">第8回</a>
  </div>
</details>
