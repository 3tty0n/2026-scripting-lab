#!/usr/bin/env node
'use strict';

const { normalizeRelease, isPrivate } = require('../lib/release.cjs');

const n = normalizeRelease({
  a: 'public',
  b: '公開',
  c: 'private',
  d: '非公開',
  e: { released_at: '2027-04-01T10:30:00+09:00' },
  f: { status: '時限公開', released_at: new Date('2027-01-01T00:00:00Z') },
  g: new Date('2026-04-01T01:30:00Z'),
});

if (n.a.status !== 'public' || n.b.status !== 'public') throw new Error('public');
if (n.c.status !== 'private' || n.d.status !== 'private') throw new Error('private');
if (n.e.status !== 'scheduled' || !n.e.released_at) throw new Error('e');
if (n.f.status !== 'scheduled' || n.f.released_at !== '2027-01-01T00:00:00.000Z') throw new Error('f ' + n.f.released_at);
if (n.g.status !== 'scheduled' || !n.g.released_at) throw new Error('g');
if (!isPrivate(n, 'c') || isPrivate(n, 'a') || isPrivate(n, 'e')) throw new Error('isPrivate');

console.log('ok');
