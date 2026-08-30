'use strict';

const path = require('path');
const yaml = require('js-yaml');
const nunjucks = require('nunjucks');

function deckNum(dir) {
  const m = String(dir).match(/^\d+/);
  return m ? m[0] : '';
}

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    return { data: {}, body: raw };
  }
  const nl = raw.indexOf('\n');
  const rest = raw.slice(nl + 1);
  const m = rest.match(/\r?\n---\r?\n/);
  if (!m) return { data: {}, body: raw };
  const yamlText = rest.slice(0, m.index);
  const body = rest.slice(m.index + m[0].length);
  return { data: yaml.load(yamlText) || {}, body };
}

class FrontmatterLoader extends nunjucks.FileSystemLoader {
  getSource(name) {
    const result = super.getSource(name);
    if (!result) return null;
    return {
      src: splitFrontmatter(result.src).body,
      path: result.path,
      noCache: true,
    };
  }
}

function filters(e) {
  e.addFilter('deckNum', deckNum);
  e.addFilter('dump', (v) => JSON.stringify(v));
  return e;
}

function createEnv(dirs) {
  const paths = [].concat(dirs).filter(Boolean);
  const e = new nunjucks.Environment(new FrontmatterLoader(paths, { noCache: true }), {
    autoescape: false,
  });
  return filters(e);
}

function render(tpl, ctx) {
  return filters(new nunjucks.Environment(null, { autoescape: false })).renderString(tpl, ctx);
}

module.exports = { render, createEnv, splitFrontmatter, deckNum, KIT: path.join(__dirname, '..') };
