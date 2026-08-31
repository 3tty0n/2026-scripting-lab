'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const RESERVED = new Set(['user', 'dir', 'files']);

function fail(msg) {
  console.error('slidekit gist: ' + msg);
  process.exit(1);
}

function loadGists(doc, dir) {
  const out = { user: '', dir: dir || 'exercises', files: [] };
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return out;
  if (doc.user) out.user = String(doc.user);
  if (doc.dir) out.dir = String(doc.dir);
  const map = doc.files && typeof doc.files === 'object' && !Array.isArray(doc.files) ? doc.files : doc;
  for (const [key, val] of Object.entries(map)) {
    if (RESERVED.has(key) || typeof val !== 'string' || !val.trim()) continue;
    const name = key.trim();
    out.files.push({
      name,
      file: name.includes('/') ? name : path.join(out.dir, name),
      id: val.trim(),
    });
  }
  return out;
}

function loadTxt(text, dir) {
  const files = [];
  for (const line of String(text).split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [name, id] = t.split(/\s+/);
    if (!name || !id) continue;
    files.push({
      name,
      file: name.includes('/') ? name : path.join(dir || 'exercises', name),
      id,
    });
  }
  return { user: '', dir: dir || 'exercises', files };
}

function loadFromCwd(cwd) {
  cwd = cwd || process.cwd();
  for (const rel of ['src/_data/gists.yaml', 'src/_data/gists.yml', 'src/_data/gists.json']) {
    const p = path.join(cwd, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    const doc = rel.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
    return { ...loadGists(doc), path: p };
  }
  const txt = path.join(cwd, 'tools/gists.txt');
  if (fs.existsSync(txt)) return { ...loadTxt(fs.readFileSync(txt, 'utf8')), path: txt };
  return { user: '', dir: 'exercises', files: [], path: '' };
}

function findFile(gists, spec) {
  const s = String(spec).replace(/^gist:/, '');
  const base = path.basename(s);
  return (
    (gists.files || []).find(
      (f) => f.name === s || f.file === s || path.basename(f.file) === base || path.basename(f.name) === base,
    ) || null
  );
}

function colabUrl(user, id, file) {
  return 'https://colab.research.google.com/gist/' + user + '/' + id + '/' + path.basename(file);
}

function expandHref(href, gists) {
  const m = String(href).match(/^gist:(.+)$/);
  if (!m || !gists) return href;
  const rec = findFile(gists, m[1]);
  if (!rec) throw new Error('unknown gist: ' + m[1]);
  if (!gists.user) throw new Error('gists.yaml needs user: for Colab links');
  return colabUrl(gists.user, rec.id, rec.file);
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || cmd + ' failed';
    fail(err);
  }
  return r;
}

function needGh() {
  const r = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) fail('gh is required (https://cli.github.com/)');
}

function fetchGist(id, name, dest) {
  const r = spawnSync(
    'gh',
    ['api', 'gists/' + id, '--jq', '.files["' + name + '"].raw_url'],
    { encoding: 'utf8' },
  );
  if (r.status !== 0 || !r.stdout.trim()) fail('cannot read gist ' + id + ' (' + name + ')');
  const curl = spawnSync('curl', ['-sL', r.stdout.trim(), '-o', dest], { encoding: 'utf8' });
  if (curl.status !== 0) fail('cannot download gist ' + id);
}

function sync(opts) {
  const cwd = opts.cwd || process.cwd();
  const check = !!opts.check;
  const gists = loadFromCwd(cwd);
  if (!gists.files.length) {
    console.log('slidekit gist: no gists.yaml (or tools/gists.txt)');
    return 0;
  }
  needGh();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slidekit-gist-'));
  let stale = 0;
  try {
    for (const rec of gists.files) {
      const local = path.resolve(cwd, rec.file);
      if (!fs.existsSync(local)) fail('missing ' + rec.file);
      const remote = path.join(tmp, path.basename(rec.file));
      fetchGist(rec.id, path.basename(rec.name), remote);
      if (fs.readFileSync(local).equals(fs.readFileSync(remote))) continue;
      stale++;
      const url = 'https://gist.github.com/' + rec.id;
      if (check) {
        console.log('stale: ' + rec.file + '  ' + url);
      } else {
        run('gh', ['gist', 'edit', rec.id, '-f', path.basename(rec.name), local], { cwd });
        console.log('sent:  ' + rec.file + '  ' + url);
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (stale === 0) console.log('Gist is updated');
  return check && stale ? 1 : 0;
}

function dumpGists(gists) {
  const doc = {};
  if (gists.user) doc.user = gists.user;
  if (gists.dir && gists.dir !== 'exercises') doc.dir = gists.dir;
  for (const rec of gists.files) doc[rec.name] = rec.id;
  return yaml.dump(doc, { lineWidth: 80 });
}

function add(file, opts) {
  const cwd = opts.cwd || process.cwd();
  needGh();
  const local = path.resolve(cwd, file);
  if (!fs.existsSync(local)) fail('missing ' + file);
  const created = run('gh', ['gist', 'create', '--public', local], { cwd });
  const url = created.stdout.trim().split(/\n/).pop();
  const id = url.replace(/.*\//, '');
  let gists = loadFromCwd(cwd);
  const name = file.includes('/') ? file : path.basename(file);
  const rec = findFile(gists, name);
  if (rec) rec.id = id;
  else gists.files.push({ name, file: name.includes('/') ? name : path.join(gists.dir, name), id });
  if (!gists.user) {
    const u = spawnSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' });
    if (u.status === 0) gists.user = u.stdout.trim();
  }
  const dest = gists.path && gists.path.endsWith('.txt') ? path.join(cwd, 'src/_data/gists.yaml') : gists.path || path.join(cwd, 'src/_data/gists.yaml');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, dumpGists(gists));
  console.log(url);
  console.log('write ' + path.relative(cwd, dest));
}

const HOOK = `#!/bin/sh
# slidekit gist
set -eu
cd "$(git rev-parse --show-toplevel)"
if ! command -v gh >/dev/null 2>&1; then
  echo "No gh; skipping gist update" >&2
  exit 0
fi
if [ -x bin/slidekit ]; then
  bin/slidekit gist
elif command -v slidekit >/dev/null 2>&1; then
  slidekit gist
else
  npx slidekit gist
fi
`;

function hook(opts) {
  const cwd = opts.cwd || process.cwd();
  const dir = path.join(cwd, '.git/hooks');
  if (!fs.existsSync(dir)) fail('not a git repo');
  const dest = path.join(dir, 'pre-push');
  if (fs.existsSync(dest) && !fs.readFileSync(dest, 'utf8').includes('slidekit gist')) {
    fail('pre-push exists; add `slidekit gist` there, or remove the hook');
  }
  fs.writeFileSync(dest, HOOK);
  fs.chmodSync(dest, 0o755);
  console.log('write ' + dest);
}

function cli(argv, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const a = argv[0];
  if (a === '--check' || a === 'check') return process.exit(sync({ cwd, check: true }));
  if (a === 'hook') return hook({ cwd });
  if (a === 'add') {
    if (!argv[1]) fail('slidekit gist add <file>');
    return add(argv[1], { cwd });
  }
  if (a && a.startsWith('-')) fail('unknown flag ' + a);
  if (a) fail('usage: slidekit gist [--check | hook | add <file>]');
  process.exit(sync({ cwd, check: false }));
}

module.exports = { loadGists, loadTxt, loadFromCwd, findFile, colabUrl, expandHref, sync, add, hook, cli };
