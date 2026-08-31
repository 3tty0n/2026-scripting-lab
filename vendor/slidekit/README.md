# slidekit

[日本語](README.ja.md)

Static site generator for lecture slides.
A directory in `src/` is a Reveal.js deck, or a place to put a Beamer / PowerPoint PDF.

## Prerequisite

- `Node`
- `Python3` (JupyterLite only)
- `XeLaTeX` / `Pandoc` (handouts only)

## Install

```sh
git clone https://github.com/3tty0n/slidekit.git
cd slidekit
./bin/slidekit init "My course"
cd my-course
./bin/slidekit create 01 "Lecture 1"
npm run serve
```

`slidekit init` copies this package into `vendor/slidekit` and runs `npm install`.
`slidekit create 01` writes `src/01/slides.md`.

## Course layout

```
src/
  index.md                 home (optional; kit supplies one)
  _data/site.json          title, kicker, …
  _data/release.yaml       scheduled release (optional)
  _data/jupyter-lite.json  JupyterLite files (optional)
  _data/gists.yaml         gist ids for Colab (optional)
  01-intro/
    slides.md              Reveal.js
    deck.yaml              extra metadata (optional)
  02-guest/
    slides.pdf             Beamer / PowerPoint, served as-is
assets/                    figures; from a slide, link as `../assets/...`
```

`src/<dir>/` is the unit. If it has `slides.md`, it becomes a Reveal deck.
If it only has PDFs, `/<dir>/` embeds the PDF.
Optional `deck.yaml`:

```yaml
title: Lecture 3
code: webllm
model: Qwen3.5-0.8B-q4f16_1-MLC
```

Without `deck.yaml`, the title is the first `# heading` (or the directory name).
Reveal decks default to `code: python`.

A real course using this kit: [2026-scripting-lang](https://github.com/3tty0n/2026-scripting-lang).

## Visibility

`src/_data/release.yaml`:

```yaml
01-intro: public          # or 公開
02-draft: private         # or 非公開 — omitted from _site
03-next:
  released_at: 2026-04-01T10:30:00+09:00
```

Timed entries hide home links until that instant (the files are still built). `private` does not emit the deck at all. Missing keys are public.

## Build

```sh
slidekit build    # → _site/
slidekit serve    # http://127.0.0.1:8000/
```

Course extras (files next to `src/`) are listed in `slidekit.config.js`:

```js
module.exports = {
  copy: ['grade.html', 'exercises'],
};
```

`style.css` and `assets/` are copied when they exist.

The home page is `src/index.md`. Front matter fills the header (`title`, `kicker`, `heading`, `subtitle`, `credit`). `## 01` / `### Title` become the numbered cards; a line that is only `[label](url)` becomes a button (first link is primary, `.ipynb` gets `download`). `{A}` / `{B}` on `###` mark variants. `>` is a callout. Raw HTML is kept. If `index.md` has no `##` sections, the kit lists decks from `src/`.

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
slidekit-handout 01-intro   # => src/01-intro/handout.pdf
```

## JupyterLite

```json
{
  "contents": ["exercises/01_basics.ipynb"],
  "fetch": [
    { "url": "https://example.com/data.txt", "as": "data.txt", "local": "data.txt" }
  ]
}
```

```sh
slidekit-jupyter-lite
```

Put that in `src/_data/jupyter-lite.json`. If the file is missing, or both `contents` and `fetch` are empty, `slidekit-jupyter-lite` does nothing. The built site is at `/jupyter-lite/`.

## Gists (Colab)

`src/_data/gists.yaml`:

```yaml
user: 3tty0n
01_basics.ipynb: c3f350eac43bfaceee52c4e46211acf8
```

In `index.md`, `[Colab で開く](gist:01_basics.ipynb)` becomes a Colab URL. Files without a slash live in `exercises/`.

```sh
slidekit gist            # push local notebooks to GitHub Gists
slidekit gist --check    # report drift, do not upload
slidekit gist add exercises/01_basics.ipynb
slidekit gist hook       # install a pre-push hook
```

Needs `gh`. `tools/gists.txt` (`filename id` per line) still works if the YAML is missing.
