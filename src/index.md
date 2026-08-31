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
書き終えたら `ファイル → .ipynb をダウンロード` で保存して提出します。

## 01

### Python 入門

Python の基礎を簡潔に学びます。動的言語としての特徴も学習します。

[Colab で開く](https://colab.research.google.com/gist/3tty0n/c3f350eac43bfaceee52c4e46211acf8/01_basics.ipynb)
[スライド](01-basics/)
[ハンドアウト](01-basics/handout.pdf)
[.ipynb を保存](exercises/01_basics.ipynb)

## 02

### テキスト処理と文章生成

1回目で勉強した内容を少し発展させます。
テキストのトーカナイズ (字句解析) から文章生成と計算まで行います。

[Colab で開く](https://colab.research.google.com/gist/3tty0n/b22ee21987175a8a41d05effd8a58deb/02_text.ipynb)
[スライド](02-text/)
[ハンドアウト](02-text/handout.pdf)
[.ipynb を保存](exercises/02_text.ipynb)

## 03 総合演習

A と B は**どちらか一方**だけ実施します。担当教員の指示に従ってください。

### 言語モデルの仕組みと実装 {A}

小さな言語モデルを使用したチャットアプリを実装します。
0.7B の Transformer を Colab に読み込んで、生成ループを実装します。
API キーなど特別な準備は不要です。

この回はモデルを動かすので Colab が基本です。
`ランタイムのタイプを変更 → T4 GPU` にすると速くなります。

[Colab で開く](https://colab.research.google.com/gist/3tty0n/1c0f3cf4d3f4fb2f30354677156e75ea/03a_llm.ipynb)
[スライド](03a-llm/)
[ハンドアウト](03a-llm/handout.pdf)
[.ipynb を保存](exercises/03a_llm.ipynb)

### Forth インタプリタの実装 {B}

スタックベース言語 Forth のインタプリタを作ります。
第2回の逆ポーランド電卓に `: 名前 … ;` を足して
**実行中に語彙を増やせる**ようにすると、電卓が言語になります。

[Colab で開く](https://colab.research.google.com/gist/3tty0n/97852f1114d1b445a903b5a641f07ce7/03b_forth.ipynb)
[スライド](03b-forth/)
[ハンドアウト](03b-forth/handout.pdf)
[.ipynb を保存](exercises/03b_forth.ipynb)

## 提出

- すべてのセルを上から実行し、**出力を残したまま**保存する
- Colab の `ファイル → .ipynb をダウンロード` で保存
- 各課題の下の**確認セル**が `OK` と出れば正解。各回とも満点100
- 確認セル (`# [CHECK]`) は自分で確かめる用。
      **消しても教員の採点は別のテストで行う**が、自分では確かめられなくなるので残すこと。
      書き換えても点は変わりません

> **正式な提出は kibaco から。**
> 採点ページは出来具合いを確かめるための場所で、そこに置いても提出したことにはなりません。

## どうしても Colab を使いたくない人向け

<details class="alt">
  <summary>JupyterLite がブラウザで使えます!</summary>
  <p class="note">
    下のリンクから、このページの中で Jupyter が立ち上がります (JupyterLite)。
    <strong>書いた内容はそのブラウザにだけ残るので、作業を中断した時や提出前に必ず
    <code>File → Download</code> で <code>.ipynb</code> を保存してください。</strong>
    第3回A は WebGPU 対応ブラウザ (Chrome / Edge / Chromium) でモデルを動かします
    (初回だけダウンロード)。
  </p>
  <div class="links">
    <a data-release="01-basics" href="lite/notebooks/index.html?path=01_basics.ipynb">第1回</a>
    <a data-release="02-text" href="lite/notebooks/index.html?path=02_text.ipynb">第2回</a>
    <a data-release="03a-llm" href="lite/notebooks/index.html?path=03a_llm_webllm.ipynb">第3回A (WebLLM 版)</a>
    <a data-release="03b-forth" href="lite/notebooks/index.html?path=03b_forth.ipynb">第3回B</a>
  </div>
</details>
