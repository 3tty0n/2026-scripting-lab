#!/usr/bin/env node
'use strict';

const { loadGists, loadTxt, expandHref, colabUrl, findFile } = require('../lib/gist.cjs');

const g = loadGists({
  user: '3tty0n',
  '01_basics.ipynb': 'c3f350eac43bfaceee52c4e46211acf8',
  'exercises/02_text.ipynb': 'b22ee21987175a8a41d05effd8a58deb',
});
if (g.user !== '3tty0n' || g.files.length !== 2) throw new Error('load');
if (g.files[0].file !== 'exercises/01_basics.ipynb') throw new Error('dir ' + g.files[0].file);
if (g.files[1].file !== 'exercises/02_text.ipynb') throw new Error('path');

const nested = loadGists({ user: 'u', files: { 'a.ipynb': 'id1' } });
if (!findFile(nested, 'a.ipynb') || findFile(nested, 'a.ipynb').id !== 'id1') throw new Error('nested');

const txt = loadTxt('01_basics.ipynb abc\n# skip\n02_text.ipynb def\n');
if (txt.files.length !== 2 || txt.files[0].file !== 'exercises/01_basics.ipynb') throw new Error('txt');

const href = expandHref('gist:01_basics.ipynb', g);
const want = colabUrl('3tty0n', 'c3f350eac43bfaceee52c4e46211acf8', 'exercises/01_basics.ipynb');
if (href !== want) throw new Error('expand ' + href);
if (expandHref('01-basics/', g) !== '01-basics/') throw new Error('passthrough');

let threw = false;
try {
  expandHref('gist:nope.ipynb', g);
} catch (e) {
  threw = /unknown gist/.test(e.message);
}
if (!threw) throw new Error('unknown');

console.log('ok');
