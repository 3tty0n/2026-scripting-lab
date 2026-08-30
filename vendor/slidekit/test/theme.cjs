#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createEnv, render } = require('../lib/render.cjs');

const env = createEnv(path.join(__dirname, '../theme'));
const html = env.render('home.njk', {
  site: { title: 'T', kicker: 'K', lang: 'ja' },
  decks: [{ dir: '01-hello', title: 'Hello', kind: 'reveal' }],
  content: '<p>hi</p>',
  title: 'T',
  release: { '01-hello': { released_at: '2026-01-01T00:00:00Z' } },
});
if (!html.includes('<p>hi</p>')) throw new Error('content');
if (!html.includes('href="01-hello/"')) throw new Error('link');
if (!html.includes('"released_at"')) throw new Error('release dump');
if (html.includes('{%')) throw new Error('unexpanded ' + html);

const deck = env.render('deck.njk', {
  title: 'Hello',
  code: 'python',
  model: '',
  models: '',
  site: { assetVersion: '1' },
});
if (!deck.includes('data-code="python"') || deck.includes('data-model')) throw new Error(deck);

const inline = render('{{ title }}', { title: 'X' });
if (inline !== 'X') throw new Error('inline');

console.log('ok');
