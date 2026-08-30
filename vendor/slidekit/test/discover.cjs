#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { discover } = require('../lib/discover.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slidekit-'));
const src = path.join(root, 'src');
fs.mkdirSync(path.join(src, '01-hello'), { recursive: true });
fs.writeFileSync(path.join(src, '01-hello', 'slides.md'), '# Hello\n\n---\n\nbody\n');
fs.mkdirSync(path.join(src, '02-talk'), { recursive: true });
fs.writeFileSync(path.join(src, '02-talk', 'slides.pdf'), '%PDF-1.4\n');
fs.mkdirSync(path.join(src, '03-llm'), { recursive: true });
fs.writeFileSync(path.join(src, '03-llm', 'slides.md'), '# LLM\n');
fs.writeFileSync(path.join(src, '03-llm', 'deck.yaml'), 'code: webllm\nmodel: X\n');
fs.mkdirSync(path.join(src, '_data'), { recursive: true });
fs.writeFileSync(path.join(src, 'skip-me.md'), '# no\n');

const decks = discover(src);
const by = Object.fromEntries(decks.map((d) => [d.dir, d]));
if (decks.length !== 3) throw new Error('count ' + decks.length);
if (by['01-hello'].kind !== 'reveal' || by['01-hello'].title !== 'Hello') {
  throw new Error('hello ' + JSON.stringify(by['01-hello']));
}
if (by['02-talk'].kind !== 'pdf' || by['02-talk'].primary !== 'slides.pdf') {
  throw new Error('pdf ' + JSON.stringify(by['02-talk']));
}
if (by['03-llm'].code !== 'webllm' || by['03-llm'].model !== 'X') {
  throw new Error('yaml ' + JSON.stringify(by['03-llm']));
}
fs.rmSync(root, { recursive: true, force: true });
console.log('ok');
