# slidekit

[English](README.md)

講義スライド用の静的サイトジェネレータ。
`src/` のディレクトリが Reveal.js デッキになる。PDF だけ置いたディレクトリは Beamer / PowerPoint の置き場。

## セットアップ

```sh
git clone <this repository> && cd <this repository>
./bin/slidekit init "授業名" my-course
cd my-course
./bin/slidekit create 01
npm run serve
```

## コースの構成

```
src/
  index.md
  _data/site.json
  _data/release.yaml       # 任意
  _data/jupyter-lite.json  # 任意
  01-intro/slides.md       # Reveal
  02-guest/slides.pdf      # Beamer / PowerPoint
```

`src/<dir>/` が単位。`slides.md` があれば Reveal、PDF だけなら `/<dir>/` で埋め込む。
追加のメタデータは任意の `deck.yaml`:

```yaml
title: 第3回
code: webllm
model: Qwen3.5-0.8B-q4f16_1-MLC
```

無ければタイトルは先頭の `# 見出し` (またはディレクトリ名)。Reveal の `code` は既定で `python`。

実コースの使用例: [2026-scripting-lang](https://github.com/3tty0n/2026-scripting-lang)。

## 公開 / 非公開 / 時限公開

`src/_data/release.yaml`:

```yaml
01-intro: public          # または 公開
02-draft: private         # または 非公開。_site に出さない
03-next:
  released_at: 2026-04-01T10:30:00+09:00
```

時限公開はトップのリンクだけ隠す（ファイルはビルドされる）。`private` はデッキごと出さない。書いていない回は公開。

## ビルド

```sh
slidekit build
slidekit serve
```

コース側の追加ファイルは `slidekit.config.js`:

```js
module.exports = {
  copy: ['grade.html', 'exercises'],
};
```

`style.css` と `assets/` はあればコピーする。

トップは `src/index.md`。YAML フロントマターがヘッダ (`title` / `kicker` / `heading` / `subtitle` / `credit`)。`## 01` と `### 見出し` がカードになる。リンクだけの行がボタン（先頭が primary、`.ipynb` は download）。`###` の `{A}` `{B}` がバリアント。`>` が強調枠。HTML はそのまま。`##` が無ければ `src/` のデッキ一覧。

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

`::: hstack wrap`、`::: hstack 2 1`、`::: hstack wrap 2 1` も使える。`|||` はコードフェンスの外に置く。

## 印刷用 PDF

```sh
slidekit-handout 01-intro
```

## JupyterLite

```json
{
  "contents": ["exercises/01_basics.ipynb"]
}
```

```sh
slidekit-jupyter-lite
```

設定は `src/_data/jupyter-lite.json`。無いか中身が空なら何もしない。公開先は `/jupyter-lite/`。
