'use strict';

const PUBLIC = /^(public|open|公開)$/i;
const PRIVATE = /^(private|hidden|非公開)$/i;
const SCHEDULED = /^(scheduled|timed|時限公開)$/i;

function asIso(v) {
  if (v instanceof Date) return v.toISOString();
  if (v == null || v === '') return undefined;
  return String(v);
}

function fromLabel(s) {
  if (PUBLIC.test(s)) return { status: 'public' };
  if (PRIVATE.test(s)) return { status: 'private' };
  if (SCHEDULED.test(s)) return { status: 'scheduled' };
  return null;
}

function normalizeOne(val) {
  if (val instanceof Date) return { status: 'scheduled', released_at: val.toISOString() };
  if (typeof val === 'string') return fromLabel(val) || { status: 'scheduled', released_at: val };
  if (!val || typeof val !== 'object') return { status: 'public' };
  const label = val.status || val.visibility;
  const tagged = label != null ? fromLabel(String(label)) : null;
  const released_at = asIso(val.released_at || val.at || val['時限公開']);
  let status = tagged ? tagged.status : released_at ? 'scheduled' : 'public';
  if (val.private === true || val['非公開'] === true) status = 'private';
  if (val.public === true || val['公開'] === true) status = 'public';
  const out = { status };
  if (released_at) out.released_at = released_at;
  return out;
}

function normalizeRelease(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  const out = {};
  for (const [key, val] of Object.entries(doc)) out[key] = normalizeOne(val);
  return out;
}

function isPrivate(release, dir) {
  const cfg = release && release[dir];
  return !!(cfg && cfg.status === 'private');
}

module.exports = { normalizeRelease, isPrivate };
