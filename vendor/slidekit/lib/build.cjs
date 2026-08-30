'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const yaml = require('js-yaml');
const { discover } = require('./discover.cjs');
const { createEnv, splitFrontmatter } = require('./render.cjs');

const KIT = path.join(__dirname, '..');

function loadData(dataDir) {
  const out = {};
  if (!fs.existsSync(dataDir)) return out;
  for (const name of fs.readdirSync(dataDir)) {
    const p = path.join(dataDir, name);
    if (!fs.statSync(p).isFile()) continue;
    const key = name.replace(/\.(json|ya?ml)$/, '');
    if (name.endsWith('.json')) out[key] = JSON.parse(fs.readFileSync(p, 'utf8'));
    else if (/\.ya?ml$/.test(name)) out[key] = yaml.load(fs.readFileSync(p, 'utf8'));
  }
  return out;
}

function loadConfig(cwd) {
  const file = path.join(cwd, 'slidekit.config.js');
  if (!fs.existsSync(file)) return {};
  const abs = require.resolve(file);
  delete require.cache[abs];
  return require(abs);
}

function copy(src, dest) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === 'solutions' || name === '.git' || name === 'node_modules' || name.startsWith('.')) {
        continue;
      }
      copy(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function write(dest, body) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
}

function extras(cwd, cfg) {
  const extra = cfg.copy || [];
  const always = ['style.css', 'assets'];
  return [...new Set([...always, ...extra])];
}

function build(opts = {}) {
  const cwd = opts.root || process.cwd();
  const src = opts.src || 'src';
  const out = opts.out || '_site';
  const srcDir = path.join(cwd, src);
  const outDir = path.join(cwd, out);
  const cfg = opts.config || loadConfig(cwd);
  const data = loadData(path.join(srcDir, '_data'));
  const decks = opts.decks || discover(srcDir);
  const site = data.site || {};
  const env = createEnv([srcDir, path.join(KIT, 'theme')]);
  const ctx = { ...data, site, decks };

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  copy(path.join(KIT, 'theme/assets'), path.join(outDir, 'assets'));
  copy(path.join(KIT, 'runtime'), path.join(outDir, 'runtime'));
  copy(path.join(KIT, 'contrib'), path.join(outDir, 'contrib'));

  for (const rel of extras(cwd, cfg)) {
    copy(path.join(cwd, rel), path.join(outDir, rel));
  }

  const liteCache = opts.liteCache || path.join(cwd, '.cache/jupyterlite');
  if (fs.existsSync(liteCache)) copy(liteCache, path.join(outDir, 'lite'));

  for (const deck of decks) {
    const dir = path.join(srcDir, deck.dir);
    for (const name of fs.readdirSync(dir)) {
      if (name === 'deck.yaml' || name.startsWith('.')) continue;
      copy(path.join(dir, name), path.join(outDir, deck.dir, name));
    }
    const page =
      deck.kind === 'pdf'
        ? env.render('pdf.njk', { ...ctx, ...deck })
        : env.render('deck.njk', {
            ...ctx,
            title: deck.title,
            code: deck.code || 'none',
            model: deck.model || '',
            models: deck.models.join(','),
          });
    write(path.join(outDir, deck.dir, 'index.html'), page);
  }

  if (fs.existsSync(path.join(srcDir, 'index.njk'))) {
    write(path.join(outDir, 'index.html'), env.render('index.njk', ctx));
  } else if (fs.existsSync(path.join(srcDir, 'index.html'))) {
    const { body } = splitFrontmatter(fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8'));
    write(path.join(outDir, 'index.html'), env.renderString(body, ctx));
  } else {
    let content = '';
    const indexMd = path.join(srcDir, 'index.md');
    if (fs.existsSync(indexMd)) {
      content = splitFrontmatter(fs.readFileSync(indexMd, 'utf8')).body;
    }
    write(path.join(outDir, 'index.html'), env.render('home.njk', { ...ctx, content, title: site.title }));
  }

  return { outDir, decks };
}

const MIME = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  md: 'text/markdown; charset=utf-8',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  ico: 'image/x-icon',
  wasm: 'application/wasm',
  txt: 'text/plain; charset=utf-8',
  ipynb: 'application/json',
  map: 'application/json',
};

function mime(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function serve(opts = {}) {
  const cwd = opts.root || process.cwd();
  const out = path.resolve(cwd, opts.out || '_site');
  const port = Number(opts.port) || 8000;
  build(opts);

  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.normalize(path.join(out, url));
    if (!file.startsWith(out)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime(file) });
    fs.createReadStream(file).pipe(res);
  });

  const srcDir = path.join(cwd, opts.src || 'src');
  const watch = [srcDir, path.join(KIT, 'theme'), path.join(KIT, 'runtime'), path.join(KIT, 'contrib')];
  const cfg = loadConfig(cwd);
  for (const rel of extras(cwd, cfg)) watch.push(path.join(cwd, rel));
  let timer;
  for (const dir of watch) {
    if (!fs.existsSync(dir)) continue;
    const opt = fs.statSync(dir).isDirectory() ? { recursive: true } : {};
    fs.watch(dir, opt, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          build(opts);
        } catch (err) {
          console.error(err);
        }
      }, 80);
    });
  }

  server.listen(port, () => {
    console.log('http://127.0.0.1:' + port + '/');
  });
  return server;
}

module.exports = { build, serve, discover, KIT };
