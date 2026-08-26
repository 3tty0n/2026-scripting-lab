#!/usr/bin/env node
/** lite.json の contents を JupyterLite 用ディレクトリへ展開する。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
    return;
  }
  fs.copyFileSync(src, dest);
}

function fetchFile(url, dest) {
  const r = spawnSync('curl', ['-sL', '--max-time', '60', '-o', dest, url], {
    stdio: 'inherit',
  });
  if (r.status !== 0 || !fs.existsSync(dest) || fs.statSync(dest).size === 0) {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return false;
  }
  return true;
}

function stage(cfg, dest, root) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of cfg.contents || []) {
    const from = typeof item === 'string' ? item : item.from;
    const to = typeof item === 'string' ? path.basename(item) : item.to;
    const src = path.resolve(root, from);
    if (!fs.existsSync(src)) {
      throw new Error('slidekit-lite: missing ' + src);
    }
    copy(src, path.join(dest, to));
  }
  for (const item of cfg.fetch || []) {
    const out = path.join(dest, item.as);
    const local = item.local && path.resolve(root, item.local);
    if (local && fs.existsSync(local)) {
      copy(local, out);
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (!fetchFile(item.url, out)) {
      console.warn('slidekit-lite: skip fetch ' + item.url);
    }
  }
}

function loadCfg(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function empty(cfg) {
  return !(cfg.contents && cfg.contents.length) && !(cfg.fetch && cfg.fetch.length);
}

if (process.argv[2] === '--check') {
  const cfg = loadCfg(path.resolve(process.argv[3]));
  process.exit(empty(cfg) ? 1 : 0);
}

const cfgPath = path.resolve(process.argv[2]);
const dest = path.resolve(process.argv[3]);
const root = process.cwd();
const cfg = loadCfg(cfgPath);
stage(cfg, dest, root);
