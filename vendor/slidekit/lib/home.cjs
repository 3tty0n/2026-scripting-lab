'use strict';

const { splitFrontmatter } = require('./render.cjs');
const { expandHref } = require('./gist.cjs');

const LINK = /^\[([^\]]+)\]\(([^)]+)\)\s*$/;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  const parts = [];
  const tmp = String(s).replace(/`([^`]+)`/g, (_, c) => {
    parts.push('<code>' + esc(c) + '</code>');
    return '\0' + (parts.length - 1) + '\0';
  });
  let html = esc(tmp)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html.replace(/\0(\d+)\0/g, (_, i) => parts[i]);
}

function kind(line) {
  const t = line.trim();
  if (!t) return 'blank';
  if (t.startsWith('### ')) return 'h3';
  if (t.startsWith('## ')) return 'h2';
  if (LINK.test(t)) return 'link';
  if (/^[-*] /.test(t)) return 'list';
  if (t.startsWith('>')) return 'quote';
  if (t.startsWith('<!--') || /^<[a-zA-Z]/.test(t)) return 'html';
  return 'para';
}

function splitH2(text) {
  const m = text.match(/^(\d+)\s*(.*)$/);
  if (m) return { num: m[1], heading: m[2].trim() };
  return { num: '', heading: text.trim() };
}

function splitH3(text) {
  const m = text.trim().match(/^(.*?)\s*\{([A-Za-z])\}\s*$/);
  if (m) return { title: m[1].trim(), variant: m[2].toUpperCase() };
  return { title: text.trim(), variant: '' };
}

function releaseOf(links, num, decks) {
  const dirs = new Set((decks || []).map((d) => d.dir));
  for (const a of links) {
    const m = String(a.href).match(/^([^/#?]+)\//);
    if (m && dirs.has(m[1])) return m[1];
  }
  if (!num) return '';
  if (dirs.has(num)) return num;
  const hit = [...dirs].find((d) => d.startsWith(num + '-'));
  return hit || '';
}

function readWhile(lines, i, pred) {
  const out = [];
  while (i < lines.length && pred(lines[i])) {
    out.push(lines[i]);
    i++;
  }
  return { out, i };
}

function readHtml(lines, i) {
  const t = lines[i].trim();
  if (t.startsWith('<!--')) {
    let s = lines[i];
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
      if (i < lines.length) s += '\n' + lines[i];
    }
    return { html: s + '\n', i: i + 1 };
  }
  const tag = t.match(/^<([a-zA-Z][\w-]*)/)[1];
  const close = new RegExp('</' + tag + '>', 'i');
  let s = lines[i];
  if (close.test(s) || /\/>\s*$/.test(t)) return { html: s + '\n', i: i + 1 };
  i++;
  while (i < lines.length && !close.test(lines[i])) {
    s += '\n' + lines[i];
    i++;
  }
  if (i < lines.length) {
    s += '\n' + lines[i];
    i++;
  }
  return { html: s + '\n', i };
}

function parseHome(raw, decks, gists) {
  const { data, body } = splitFrontmatter(raw);
  const lines = String(body).replace(/\r\n/g, '\n').split('\n');
  let intro = '';
  const sections = [];
  let section = null;
  let card = null;
  let i = 0;

  function finishCard() {
    if (!card) return;
    card.release = releaseOf(card.links, section && section.num, decks);
    section.cards.push(card);
    card = null;
  }

  function finishSection() {
    finishCard();
    if (section) sections.push(section);
    section = null;
  }

  function addHtml(html) {
    if (!html) return;
    if (card) {
      finishCard();
    }
    if (!section) intro += html;
    else if (section.cards.length) section.tail += html;
    else section.lead += html;
  }

  function addPara(html) {
    if (card) {
      if (!card.body) card.body = html;
      else card.notes.push(html);
      return;
    }
    const cls = section ? ' class="note"' : '';
    addHtml('<p' + cls + '>' + html + '</p>\n');
  }

  while (i < lines.length) {
    const k = kind(lines[i]);
    if (k === 'blank') {
      i++;
      continue;
    }
    if (k === 'h2') {
      finishSection();
      const h = splitH2(lines[i].trim().slice(3).trim());
      section = { num: h.num, heading: h.heading, lead: '', cards: [], tail: '' };
      i++;
      continue;
    }
    if (k === 'h3') {
      if (!section) {
        section = { num: '', heading: '', lead: '', cards: [], tail: '' };
      }
      finishCard();
      const h = splitH3(lines[i].trim().slice(4).trim());
      card = { title: inline(h.title), variant: h.variant, body: '', notes: [], links: [], release: '' };
      i++;
      continue;
    }
    if (k === 'link') {
      const { out, i: next } = readWhile(lines, i, (ln) => kind(ln) === 'link');
      const links = out.map((ln) => {
        const m = ln.trim().match(LINK);
        const href = expandHref(m[2], gists);
        return { text: m[1], href, download: /\.ipynb(\?|$)/i.test(href) && !/^[a-z]+:/i.test(href) };
      });
      i = next;
      if (card) card.links.push(...links);
      else {
        addHtml(
          '<div class="links">' +
            links
              .map(
                (a, n) =>
                  '<a' +
                  (n === 0 ? ' class="primary"' : '') +
                  ' href="' +
                  esc(a.href) +
                  '"' +
                  (a.download ? ' download' : '') +
                  '>' +
                  esc(a.text) +
                  '</a>',
              )
              .join('') +
            '</div>\n',
        );
      }
      continue;
    }
    if (k === 'list') {
      const items = [];
      while (i < lines.length) {
        const kk = kind(lines[i]);
        if (kk === 'list') {
          items.push(lines[i].trim().replace(/^[-*] /, ''));
          i++;
        } else if (items.length && kk === 'para' && /^\s/.test(lines[i])) {
          items[items.length - 1] += '\n' + lines[i].trim();
          i++;
        } else {
          break;
        }
      }
      addHtml('<ul>\n' + items.map((t) => '<li>' + inline(t) + '</li>').join('\n') + '\n</ul>\n');
      continue;
    }
    if (k === 'quote') {
      const { out, i: next } = readWhile(lines, i, (ln) => kind(ln) === 'quote');
      i = next;
      const text = out.map((ln) => ln.trim().replace(/^>\s?/, '')).join(' ');
      addHtml('<div class="callout">' + inline(text) + '</div>\n');
      continue;
    }
    if (k === 'html') {
      const block = readHtml(lines, i);
      i = block.i;
      addHtml(block.html);
      continue;
    }
    const { out, i: next } = readWhile(lines, i, (ln) => kind(ln) === 'para');
    i = next;
    addPara(inline(out.join('\n')));
  }
  finishSection();
  return { data: data || {}, intro, sections };
}

module.exports = { parseHome, inline };
