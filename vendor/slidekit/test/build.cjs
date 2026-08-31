#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { build } = require('../lib/build.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slidekit-build-'));
fs.mkdirSync(path.join(root, 'src/01-hello'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/01-hello/slides.md'), '# Hello\n');
fs.mkdirSync(path.join(root, 'src/02-talk'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/02-talk/slides.pdf'), '%PDF-1.4\n');
fs.mkdirSync(path.join(root, 'src/03-secret'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/03-secret/slides.md'), '# Secret\n');
fs.mkdirSync(path.join(root, 'src/_data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/_data/site.json'), '{"title":"T","lang":"ja"}');
fs.writeFileSync(
  path.join(root, 'src/_data/release.yaml'),
  '01-hello: public\n03-secret: private\n',
);
fs.writeFileSync(path.join(root, 'style.css'), 'body{}');
fs.writeFileSync(
  path.join(root, 'src/index.md'),
  '---\ntitle: Custom\n---\n\n<p>BODY</p>\n',
);

const { outDir, decks } = build({ root });
const by = Object.fromEntries(decks.map((d) => [d.dir, d]));
if (by['01-hello'].kind !== 'reveal') throw new Error('reveal');
if (by['02-talk'].kind !== 'pdf') throw new Error('pdf');
const hello = fs.readFileSync(path.join(outDir, '01-hello/index.html'), 'utf8');
if (!hello.includes('data-code="python"') || !hello.includes('Hello')) throw new Error(hello);
if (!fs.existsSync(path.join(outDir, '01-hello/slides.md'))) throw new Error('slides copy');
if (!fs.existsSync(path.join(outDir, '02-talk/slides.pdf'))) throw new Error('pdf copy');
const home = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
if (!home.includes('BODY') || !home.includes('<title>Custom</title>')) throw new Error(home);
if (home.includes('{%')) throw new Error('extends leftover ' + home);
if (!fs.existsSync(path.join(outDir, 'style.css'))) throw new Error('style');
if (!fs.existsSync(path.join(outDir, 'assets/deck.js'))) throw new Error('kit assets');
if (fs.existsSync(path.join(outDir, '03-secret'))) throw new Error('private emitted');
if (!home.includes('"status":"private"')) throw new Error('private dump ' + home);
fs.rmSync(root, { recursive: true, force: true });
console.log('ok');
