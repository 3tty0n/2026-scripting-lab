# slidekit

[日本語](README.ja.md)

Eleventy plugin for lecture slides.
Write Markdown, get Reveal.js decks.
The same project can also build an A4 PDF and a JupyterLite site.

## Prerequisite

- `Node`
- `Python3`
- `XeLaTeX`
- `Pandoc`


## Install

First, clone this repo and work there:

```
git clone https://github.com/3tty0n/slidekit.git
cd slidekit
```

Then, you can scaffold:


```sh
./bin/slidekit init "My course"
cd my-course
./bin/slidekit create 01 "Lecture 1"
```

- `bin/slidekit init`: copies slidekit into `vendor/slidekit` and runs `npm install`.
- `bin/slidekit create 01`: writes `src/01/slides.md` and adds it to the home page.
  - `--code` is `python` (default), `webllm`, or `none`.

Home page text is in `src/index.md`. The deck list is in `decks.json`.

## Course files

| Path | Role |
|---|---|
| `src/_data/decks.json` | Deck list: `dir`, `title`, `code` |
| `src/_data/release.yaml` | Scheduled release times (optional) |
| `src/<dir>/slides.md` | Slide text |
| `src/_data/lite.json` | JupyterLite files (optional) |
| `assets/` | Figures. From a slide, link as `../assets/...` |
| `src/index.md` | Home page text. The deck list is in `decks.json` |

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

## Scheduled release

Write a per-deck release time in `src/_data/release.yaml`, and the home page list
replaces a deck link with a "coming soon" note until that time, then shows it.

```yaml
01-basics:
  released_at: 2026-04-01T10:30:00+09:00
02-text:
  released_at: 2026-04-08T10:30:00+09:00
```

Decks without an entry (or with a past time) stay public. This hides links using
the browser clock; the assets themselves (`/<dir>/`, `slides.md`, `.ipynb`) are
still reachable if the URL is known. For a hard gate, drop unreleased decks at
build time instead, driven by a scheduled CI run.

## Eleventy

```js
const slidekit = require('slidekit');

module.exports = (eleventyConfig) => {
  slidekit(eleventyConfig);
};
```

## Markdown

A line with only `---` starts a new horizontal slide. A line with only `--` starts a vertical slide.

`#` and `##` are titles. An `###` right before or after `##` becomes a red subtitle.

````markdown
::: hstack

left column

|||

right column

:::
````

Also valid: `::: hstack wrap`, `::: hstack 2 1`, `::: hstack wrap 2 1`.

Put `|||` outside fenced code. Close each fence before `|||` or `:::`.

Wrap one fence:

````markdown
```python wrap
long_name = something_very_long(...)
```
````

With `::: hstack wrap`, Ace line numbers continue from the left column to the right.

Reveal Markdown does not include this layout. `reveal-init.js` expands it when the deck loads.

## Handouts

```sh
./bin/slidekit-handout 01-basics # ==> src/01-basics/handout.pdf
```

## JupyterLite

List notebook files in `src/_data/lite.json`. The scaffold starts with `"contents": []`.

If the file is missing, or both `contents` and `fetch` are empty, `slidekit-lite` does nothing.

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
