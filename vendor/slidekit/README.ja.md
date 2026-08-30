# slidekit

[English](README.md)


## セットアップ

```sh
git clone <this repository> && cd <this repository>
./bin/slidekit init "授業名" my-course
cd my-course
./bin/slidekit create 01
```

## コース側のセットアップ

| パス | 役割 |
|---|---|
| `src/_data/decks.json` | デッキ一覧。`dir` / `title` / `code` |
| `src/_data/release.yaml` | 時限公開の設定（任意） |
| `src/<dir>/slides.md` | スライド本文 |
| `src/_data/lite.json` | JupyterLite に載せるファイル（任意） |
| `assets/` | 図。スライドからは `../assets/...` |
| `src/index.md` | トップの文章。一覧は `decks.json` |


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

## 時限公開

`src/_data/release.yaml` にデッキごとの公開日時を書くと、トップの一覧のリンクを
公開時刻まで「公開前」に差し替えます。到達後は通常どおりリンクが出ます。

```yaml
01-basics:
  released_at: 2026-04-01T10:30:00+09:00
02-text:
  released_at: 2026-04-08T10:30:00+09:00
```

すぐ公開する回は書かない (または過去の日時にする) だけで、常時表示のままです。
ブラウザの時計で判定してリンクだけ隠す方式です。ページの実体 (`/<dir>/` や
`slides.md`、`.ipynb`) は URL を知っていれば開けるので、厳密な制限が要る場合は
「ビルド時に未公開分を落とす」運用を CI のスケジュール実行と組み合わせてください。

## Eleventy から呼ぶ

```js
const slidekit = require('slidekit');

module.exports = (eleventyConfig) => {
  slidekit(eleventyConfig);
};
```

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

## 印刷用 PDF

```sh
./bin/slidekit-handout 01-basics
```

## JupyterLite

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


```sh
./bin/slidekit-lite
npx eleventy
```
