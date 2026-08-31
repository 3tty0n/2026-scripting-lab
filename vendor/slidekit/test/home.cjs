#!/usr/bin/env node
'use strict';

const { parseHome } = require('../lib/home.cjs');

const decks = [
  { dir: '01-basics' },
  { dir: '03a-llm' },
  { dir: '03b-forth' },
];

const { data, intro, sections } = parseHome(
  `---
title: Doc
heading: H1
kicker: K
---

課題は **Colab** と \`code\` です。

## 01

### Python 入門

基礎を学びます。

[Colab で開く](https://example.com/a.ipynb)
[スライド](01-basics/)
[.ipynb を保存](exercises/01_basics.ipynb)

## 03 総合演習

A と B は**どちらか一方**。

### 言語モデル {A}

本体。

メモです。

[Colab で開く](https://example.com/b.ipynb)
[スライド](03a-llm/)

### Forth {B}

[スライド](03b-forth/)

## 提出

- **出力を残した**まま
- \`OK\` と出る

> **正式な提出は kibaco から。**
> そこではない。

## その他

<details class="alt">
  <summary>Lite</summary>
</details>
`,
  decks,
);

if (data.title !== 'Doc' || data.heading !== 'H1') throw new Error('fm');
if (!intro.includes('<strong>Colab</strong>') || !intro.includes('<code>code</code>')) throw new Error('intro ' + intro);

const [s1, s3, sub, extra] = sections;
if (s1.num !== '01' || s1.cards[0].title !== 'Python 入門') throw new Error('s1');
if (s1.cards[0].links[0].download !== false) throw new Error('colab download');
if (s1.cards[0].links[2].download !== true) throw new Error('ipynb');
if (s1.cards[0].release !== '01-basics') throw new Error('release ' + s1.cards[0].release);

if (s3.heading !== '総合演習' || !s3.lead.includes('class="note"')) throw new Error('lead ' + s3.lead);
if (s3.cards[0].variant !== 'A' || s3.cards[1].variant !== 'B') throw new Error('variant');
if (s3.cards[0].notes.length !== 1) throw new Error('notes ' + JSON.stringify(s3.cards[0].notes));
if (s3.cards[0].release !== '03a-llm' || s3.cards[1].release !== '03b-forth') throw new Error('rel3');

if (sub.heading !== '提出' || !sub.lead.includes('<ul>') || !sub.lead.includes('class="callout"')) {
  throw new Error('submit ' + sub.lead);
}
if (!extra.lead.includes('<details class="alt">')) throw new Error('html ' + extra.lead);

console.log('ok');
