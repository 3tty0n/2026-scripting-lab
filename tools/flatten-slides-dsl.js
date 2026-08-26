#!/usr/bin/env node
/**
 * slides.md の Reveal 向け Markdown DSL を、handout (pandoc) 用に潰す。
 * - ::: hstack ... ||| ... ::: → 列を上から順に連結
 * - ```lang wrap → ```lang
 * - <!-- .element: ... --> 行を除去
 */
'use strict';

const fs = require('fs');

function flattenHstack(md) {
  const openRe = /^::: *(?:r-)?hstack\b(.*)$/;
  const closeRe = /^::: *$/;
  const colRe = /^\|\|\| *$/;
  const fenceRe = /^(`{3,}|~{3,})/;
  const lines = md.split('\n');
  const out = [];
  let fence = null;

  function flattenCols(bodyLines) {
    const cols = [[]];
    let f = null;
    for (const line of bodyLines) {
      const fm = line.match(fenceRe);
      if (fm) {
        if (!f) f = fm[1];
        else if (line.startsWith(f)) {
          f = null;
          if (/^(`{3,}|~{3,})\S/.test(line)) f = fm[1];
        }
        cols[cols.length - 1].push(line);
        continue;
      }
      if (!f && colRe.test(line)) {
        cols.push([]);
        continue;
      }
      cols[cols.length - 1].push(line);
    }
    const parts = [];
    cols.forEach((col, i) => {
      if (i) parts.push('');
      parts.push(col.join('\n').replace(/^\n+|\n+$/g, ''));
    });
    return parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fm = line.match(fenceRe);
    if (fm) {
      if (!fence) fence = fm[1];
      else if (line.startsWith(fence)) fence = null;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    const om = line.match(openRe);
    if (!om) {
      out.push(line);
      continue;
    }
    const body = [];
    let closed = false;
    let bf = null;
    for (i++; i < lines.length; i++) {
      const L = lines[i];
      const bfm = L.match(fenceRe);
      if (bfm) {
        if (!bf) bf = bfm[1];
        else if (L.startsWith(bf)) {
          bf = null;
          if (/^(`{3,}|~{3,})\S/.test(L)) bf = bfm[1];
        }
        body.push(L);
        continue;
      }
      if (!bf && closeRe.test(L)) {
        closed = true;
        break;
      }
      body.push(L);
    }
    if (!closed) {
      out.push(line, ...body);
      continue;
    }
    out.push(...flattenCols(body));
  }
  return out.join('\n');
}

function stripCodeFlags(md) {
  const lines = md.split('\n');
  const out = [];
  let fence = null;
  for (const line of lines) {
    if (!fence) {
      const m = line.match(/^(`{3,}|~{3,})(.*)$/);
      if (!m) {
        out.push(line);
        continue;
      }
      const mark = m[1];
      const tokens = m[2].trim().split(/\s+/).filter(Boolean);
      const kept = tokens.filter((t) => t !== 'wrap');
      out.push(mark + (kept.length ? kept.join(' ') : ''));
      fence = mark;
      continue;
    }
    out.push(line);
    if (line.startsWith(fence) && /^(`{3,}|~{3,})\s*$/.test(line)) fence = null;
  }
  return out.join('\n');
}

function stripElementComments(md) {
  return md
    .split('\n')
    .filter((line) => !/^\s*<!--\s*\.element:/.test(line))
    .join('\n');
}

function flatten(md) {
  return stripElementComments(stripCodeFlags(flattenHstack(md)));
}

const input = process.argv[2];
const raw = input ? fs.readFileSync(input, 'utf8') : fs.readFileSync(0, 'utf8');
process.stdout.write(flatten(raw));
