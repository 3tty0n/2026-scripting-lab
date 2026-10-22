#!/usr/bin/env python3
"""Reveal 用の slides.md を、pandoc -t beamer 用の Markdown に変える (標準入力 → 標準出力)。

使い方: beamer-prep.py ROOT < slides.md   (ROOT はコースのルート。画像の相対パスを直すのに使う)

- `::: hstack [wrap] [比...]` ... `|||` ... `:::` を、Beamer の段組み (columns) にする
- コードの `wrap` 指定と、`<!-- .element: ... -->` の行を取り除く
- 環境変数 BEAMER_BREAK=2,6 で指定したページのフレームは、はみ出したら次のページへ続ける
- 先頭のスライドを YAML のタイトル情報 (title / subtitle / author / institute) にする
- スライドの区切り `---` を消す (`##` が1枚ずつのフレームになるため)
- `### 小見出し` を、直前の `##` フレームのサブタイトル (\\framesubtitle) にする
- 見出しの中のコード (`x`) は \\texttt に置き換える (フレームの題の中では verbatim が使えない)
"""
import json
import os
import re
import sys

LATEX_SPECIAL = {'\\': r'\textbackslash{}', '{': r'\{', '}': r'\}', '_': r'\_', '#': r'\#',
                 '%': r'\%', '&': r'\&', '$': r'\$', '^': r'\^{}', '~': r'\~{}'}


FENCE = re.compile(r'^(`{3,}|~{3,})(.*)$')


def convert_dsl(text, root):
    """hstack を columns に、wrap と .element のコメントを除き、画像のパスを絶対パスにする"""
    out, fence, i = [], None, 0
    lines = text.split('\n')
    cols = None          # hstack の中にいるときは、列ごとの行のリスト
    ratios = []

    def emit(line):
        (cols[-1] if cols is not None else out).append(line)

    while i < len(lines):
        line = lines[i]
        i += 1
        m = FENCE.match(line)
        if fence is None and m:
            fence = m.group(1)
            flags = [t for t in m.group(2).split() if t != 'wrap']
            emit(fence + ' '.join(flags))
            continue
        if fence is not None:
            emit(line)
            if line.startswith(fence) and re.match(r'^(`{3,}|~{3,})\s*$', line):
                fence = None
            continue
        if re.match(r'^\s*<!--\s*\.element:', line):
            continue
        h = re.match(r'^::: *(?:r-)?hstack\b(.*)$', line)
        if h and cols is None:
            cols, ratios = [[]], [float(t) for t in h.group(1).split() if re.fullmatch(r'\d+(\.\d+)?', t)]
            continue
        if cols is not None and re.match(r'^\|\|\| *$', line):
            cols.append([])
            continue
        if cols is not None and re.match(r'^::: *$', line):
            weights = ratios if len(ratios) == len(cols) else [1.0] * len(cols)
            total = sum(weights)
            out.append(':::::: {.columns}')
            for col, w in zip(cols, weights):
                out.append(f'::::: {{.column width="{96 * w / total:.0f}%"}}')
                if len(set(weights)) == 1:      # 同じ幅の段は狭いので、コードの字を小さくする
                    out += [r'\renewcommand{\codesize}{\scriptsize}', '']
                out += col
                out.append(':::::')
            out.append('::::::')
            cols = None
            continue
        emit(re.sub(r'\]\((?:\./)?\.\./assets/', '](' + root + '/assets/', line))
    return '\n'.join(out)


def split_slides(text):
    """コードの囲み (```) の外にある `---` の行で分ける"""
    slides, cur, fence = [], [], None
    for line in text.split('\n'):
        m = re.match(r'^(`{3,}|~{3,})', line)
        if m:
            if fence is None:
                fence = m.group(1)
            elif line.startswith(fence):
                fence = None
        if fence is None and line.strip() == '---':
            slides.append(cur)
            cur = []
        else:
            cur.append(line)
    slides.append(cur)
    return slides


def heading(text):
    """見出しの文字列を、フレームの題に置ける形にする"""
    def code(m):
        body = ''.join(LATEX_SPECIAL.get(ch, ch) for ch in m.group(1))
        return r'\texttt{' + body + '}'
    parts = re.split(r'(`[^`]+`)', text)
    out = []
    for p in parts:
        if p.startswith('`') and p.endswith('`') and len(p) > 2:
            out.append(code(re.match(r'`([^`]+)`', p)))
        else:
            out.append(''.join(LATEX_SPECIAL.get(ch, ch) if ch in '\\{}_#%&$^~' else ch for ch in p))
    return ''.join(out)


def title_meta(lines):
    label = title = sub = ''
    authors = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if s.startswith('### '):
            sub = s[4:].strip()
        elif s.startswith('# '):
            title = s[2:].strip()
        elif not title:
            label = s
        else:
            authors.append(s)
    return label, title, sub, ' / '.join(authors)


def main():
    root = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else '.'
    slides = split_slides(convert_dsl(sys.stdin.read(), root))
    label, title, sub, author = title_meta(slides[0])
    out = ['---']
    out.append('title: ' + json.dumps(title, ensure_ascii=False))
    if sub:
        out.append('subtitle: ' + json.dumps(sub, ensure_ascii=False))
    if author:
        out.append('author: ' + json.dumps(author, ensure_ascii=False))
    if label:
        out.append('institute: ' + json.dumps(label, ensure_ascii=False))
    out += ['---', '']
    breaks = {int(n) for n in os.environ.get('BEAMER_BREAK', '').split(',') if n.strip()}
    for k, body in enumerate(slides[1:], 1):
        lines = list(body)
        while lines and not lines[0].strip():
            lines.pop(0)
        if not lines or not lines[0].startswith('## '):
            out += lines + ['']
            continue
        attr = ' {.allowframebreaks}' if k + 1 in breaks else ''     # k 枚目のフレームは PDF の k+1 ページ目
        out.append('## ' + heading(lines[0][3:].strip()) + attr)
        lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)
        if lines and lines[0].startswith('### '):
            out += ['', r'\framesubtitle{' + heading(lines[0][4:].strip()) + '}', '']
            lines.pop(0)
        out += lines + ['']
    sys.stdout.write('\n'.join(out))


if __name__ == '__main__':
    main()
