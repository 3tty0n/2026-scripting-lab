# slidekit

[日本語](README.ja.md)

Eleventy plugin. Lecture slides stay Markdown. The plugin turns them into Reveal.js decks. The same tree can produce an A4 PDF and a JupyterLite site.

## Install

```json
{ "dependencies": { "slidekit": "github:3tty0n/slidekit" } }
```

Needs Node for Eleventy, and Pandoc plus XeLaTeX if you build handouts. JupyterLite needs Python 3.

## New course

```sh
npx --yes -p github:3tty0n/slidekit slidekit init "My course"
cd my-course
npm install
npx slidekit create 01
```

`init` takes the course title. The directory is a slug of that title, or a second argument. `create 01` writes `src/01/slides.md` and appends the deck so the home page lists it. Optional title: `slidekit create 01 "Lecture 1"`. `--code` is `python` (default), `webllm`, or `none`.

Home page: `src/index.md` (intro text) plus a layout that lists every entry in `decks.json`. Edit the markdown for intro text. The deck list is filled from `decks.json`.

## What stays in the course repo

| Path | Role |
|---|---|
| `src/_data/decks.json` | Deck list: `dir`, `title`, `code` |
| `src/<dir>/slides.md` | Slide text |
| `src/_data/lite.json` | JupyterLite contents (optional) |
| `assets/` | Course figures. From a slide, link as `../assets/...` |
| `src/index.md` | Home page copy. The deck list comes from `decks.json` |

`code` is `python` (Ace + Pyodide), `webllm` (Ace + WebLLM, from `contrib/`), or `none` (highlight only).

For `webllm`, set `model` to a WebLLM model id. Omit it to keep `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`. `models` is an optional list for the on-slide picker; if omitted, the picker uses WebLLM's prebuilt catalog. Override for one session with `?model=...`. Cells receive `MODEL` and `getEngine(id)`.

`decks.json` example:

```json
[
  { "dir": "01-basics", "title": "Lecture 1: Python", "code": "python" },
  {
    "dir": "03-llm",
    "title": "Lecture 3",
    "code": "webllm",
    "model": "Qwen3.5-0.8B-q4f16_1-MLC"
  }
]
```

## Eleventy

```js
const slidekit = require('slidekit');

module.exports = (eleventyConfig) => {
  slidekit(eleventyConfig);
};
```

The plugin copies `assets/`, `runtime/`, and `contrib/` into `_site/`, copies each `slides.md`, and writes `/<dir>/index.html`. If `.cache/jupyterlite` exists, it copies that tree to `_site/lite`.

Default layout: Eleventy `input` is `src/`, `output` is `_site/`. Override with `slidekit(eleventyConfig, { src, root, decksFile, liteCache })`.

Open a deck at `/01-basics/`. `file://` will not load `slides.md`.

## Markdown on slides

Horizontal break: a line that is only `---`. Vertical break: a line that is only `--`.

`#` / `##` are titles. An `###` next to `##` becomes a red subtitle.

````markdown
::: hstack

left column

|||

right column

:::
````

Options: `::: hstack wrap`, `::: hstack 2 1`, `::: hstack wrap 2 1`. Column breaks (`|||`) must sit outside fenced code. Close each fence before `|||` or `:::`.

Line wrap on one fence:

````markdown
```python wrap
long_name = something_very_long(...)
```
````

`::: hstack wrap` also continues Ace line numbers across the columns, left to right.

This layout syntax is not part of Reveal Markdown. `reveal-init.js` expands it before Reveal parses the file.

## Handouts

```sh
npx slidekit-handout 01-basics
```

Writes `src/01-basics/handout.pdf`. The same Markdown is flattened first (`hstack` / `wrap` dropped), then Pandoc + XeLaTeX. Run from the course root.

## JupyterLite

`src/_data/lite.json` lists what goes into the notebook tree. The scaffold starts with `"contents": []`. Missing file, or empty `contents` and `fetch`, means `slidekit-lite` does nothing.

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

A string copies to the notebook root under its basename. `{ "from", "to" }` sets the destination name. `fetch` downloads a URL unless `local` already exists.

Grading scripts are not part of slidekit. Keep them in the course repo. If the Lite kernel should import them, add those paths to `contents` and copy the directory from `eleventy.config.js`.

```sh
npx slidekit-lite
npx eleventy
```

Build order matters: Lite first (`.cache/jupyterlite`), then Eleventy (`_site/lite`). Eleventy wipes `_site` on each run, so a Lite tree written only into `_site/lite` would disappear.

Serve with Eleventy (`--serve`). Open `http://127.0.0.1:8000/lite/lab/index.html`.
