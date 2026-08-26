# slidekit

[English](README.md)

Markdown の講義スライドを Reveal.js として出す、Eleventy 用のプラグイン。印刷用 PDF と、ブラウザで動く JupyterLite も同じ枠から組み立てる。

初回は `slidekit init` まで読む。記法は、必要なときに下の節を引く。

## 依存に足す

```json
{ "dependencies": { "slidekit": "github:3tty0n/slidekit" } }
```

Eleventy は Node。handout は Pandoc と XeLaTeX。JupyterLite は Python 3。いずれもコース側で入れる。

## コースを足す

```sh
npx --yes -p github:3tty0n/slidekit slidekit init "授業名" my-course
cd my-course
npm install
npx slidekit create 01
```

`init` の引数は授業名。ディレクトリはそこから作った slug。別の名前にしたければ第二引数。`create 01` は `src/01/slides.md` を置き、トップの一覧に足す。題を付けるなら `slidekit create 01 "第1回"`。`--code` は `python`（既定）、`webllm`、`none`。

トップは `src/index.md`（導入の文章）と、`decks.json` を読むレイアウト。一覧は手で書かない。

## コース側に置くもの

| パス | 役割 |
|---|---|
| `src/_data/decks.json` | デッキ一覧。`dir` / `title` / `code` |
| `src/<dir>/slides.md` | スライド本文 |
| `src/_data/lite.json` | JupyterLite に載せるファイル（任意） |
| `assets/` | 図。スライドからは `../assets/...` |
| `src/index.md` | トップの文章。一覧は `decks.json` |

`code` は `python`（Ace と Pyodide）、`webllm`（Ace と WebLLM。`contrib/`）、`none`（ハイライトのみ）。

`webllm` のときは `model` に WebLLM のモデル id を書く。省略時は `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`。`models` を書くとスライド上の選択はその一覧だけになる。書かなければ WebLLM のプリセット一覧が出る。その場だけ変えるなら `?model=...`。セルには `MODEL` と `getEngine(id)` が入る。

```json
[
  { "dir": "01-basics", "title": "第1回: Python 入門", "code": "python" },
  {
    "dir": "03-llm",
    "title": "第3回",
    "code": "webllm",
    "model": "Qwen3.5-0.8B-q4f16_1-MLC"
  }
]
```

## Eleventy から呼ぶ

```js
const slidekit = require('slidekit');

module.exports = (eleventyConfig) => {
  slidekit(eleventyConfig);
};
```

プラグインは `assets/`・`runtime/`・`contrib/` を `_site/` へコピーし、各 `slides.md` を渡し、`/<dir>/index.html` を書く。`.cache/jupyterlite` があれば `_site/lite` にもコピーする。

既定では Eleventy の入力は `src/`、出力は `_site/`。変えたいときは `slidekit(eleventyConfig, { src, root, decksFile, liteCache })`。

デッキは `/01-basics/` で開く。`file://` では `slides.md` を読めない。

## スライドの Markdown

横の区切りは単独行の `---`。縦は単独行の `--`。

`#` と `##` がタイトル。`##` の直前か直後の `###` は赤サブタイトルになる。

````markdown
::: hstack

左

|||

右

:::
````

`::: hstack wrap`、`::: hstack 2 1`、`::: hstack wrap 2 1` も使える。`|||` はコードフェンスの外に置く。フェンスを閉じてから `|||` や `:::` を書く。

フェンス単位の折り返し:

````markdown
```python wrap
long_name = something_very_long(...)
```
````

`::: hstack wrap` では Ace の行番号を左列から右列へ通す。

この左右分割は素の Reveal Markdown にはない。`reveal-init.js` が読み込み時に展開する。

## 印刷用 PDF

```sh
npx slidekit-handout 01-basics
```

`src/01-basics/handout.pdf` を書く。同じ Markdown から `hstack` と `wrap` を落としてから Pandoc と XeLaTeX に渡す。カレントはコースのルート。

## JupyterLite

`src/_data/lite.json` に、ノートブック側へ載せるファイルを書く。scaffold の初期値は `"contents": []`。ファイルが無い、または `contents` と `fetch` が空なら `slidekit-lite` は何もしない。

```json
{
  "contents": [
    "exercises/01_basics.ipynb"
  ],
  "fetch": [
    { "url": "https://example.com/data.txt", "as": "data.txt", "local": "data.txt" }
  ]
}
```

文字列はファイル名だけをルートに置く。`from` / `to` で行き先を指定する。`fetch` は `local` が無ければ URL を取る。

採点用のスクリプトは slidekit には入らない。コース側に置く。Lite のカーネルから import するなら `contents` に足し、`eleventy.config.js` でもディレクトリをコピーする。

```sh
npx slidekit-lite
npx eleventy
```

先に Lite（`.cache/jupyterlite`）、あとから Eleventy（`_site/lite`）。Eleventy は `_site` を空にしてから書くので、Lite を `_site/lite` にだけ出すと消える。

配信は Eleventy の `--serve`。`http://127.0.0.1:8000/lite/lab/index.html`。
