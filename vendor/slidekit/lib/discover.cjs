'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SKIP = new Set(['_data', '_includes', '_layouts']);

function headingFrom(md) {
  const m = String(md).match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function loadMeta(dir) {
  const file = path.join(dir, 'deck.yaml');
  if (!fs.existsSync(file)) return {};
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  return doc && typeof doc === 'object' ? doc : {};
}

function listPdfs(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.pdf') && !name.startsWith('.'));
}

/**
 * src/<dir>/ をデッキとして拾う。
 * slides.md があれば Reveal、なければ PDF (Beamer / PowerPoint など) の置き場。
 */
function discover(srcDir) {
  if (!fs.existsSync(srcDir)) return [];
  const names = fs.readdirSync(srcDir).sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  );
  const decks = [];
  for (const name of names) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const dir = path.join(srcDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;

    const meta = loadMeta(dir);
    const slides = path.join(dir, 'slides.md');
    const hasSlides = fs.existsSync(slides);
    const pdfs = listPdfs(dir);
    if (!hasSlides && pdfs.length === 0) continue;

    const kind = hasSlides ? 'reveal' : 'pdf';
    let models = meta.models;
    if (typeof models === 'string') {
      models = models.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (!Array.isArray(models)) {
      models = [];
    }

    const deck = {
      dir: name,
      kind,
      title: meta.title || (hasSlides ? headingFrom(fs.readFileSync(slides, 'utf8')) : '') || name,
      code: meta.code || (kind === 'reveal' ? 'python' : 'none'),
      model: meta.model || '',
      models,
      pdfs,
    };
    if (kind === 'pdf') {
      deck.primary =
        pdfs.find((p) => /^slides?\.pdf$/i.test(p)) || pdfs[0];
    }
    decks.push(deck);
  }
  return decks;
}

module.exports = { discover, headingFrom, loadMeta };
