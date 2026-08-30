#!/usr/bin/env node
'use strict';

const { render } = require('../lib/render.cjs');

const home = render(
  '{% if site.kicker %}<p>{{ site.kicker }}</p>{% endif %}{% for deck in decks %}<a href="{{ deck.dir }}/">{{ deck.dir | deckNum }} {{ deck.title }}</a>{% if deck.kind == "pdf" %}PDF{% endif %}{% endfor %}var R={% if release %}{{ release | dump | safe }}{% else %}null{% endif %};',
  {
    site: { kicker: 'K' },
    decks: [
      { dir: '01-hello', title: 'Hello', kind: 'reveal' },
      { dir: '02-talk', title: 'Talk', kind: 'pdf' },
    ],
    release: { '01-hello': { released_at: '2026-01-01' } },
  },
);
if (!home.includes('<p>K</p>')) throw new Error('kicker');
if (!home.includes('01 Hello')) throw new Error('deckNum ' + home);
if (!home.includes('PDF')) throw new Error('pdf if');
if (!home.includes('"released_at"')) throw new Error('dump');

const pdf = render(
  '{% if pdfs.length > 1 %}<nav>{% for pdf in pdfs %}<a>{{ pdf }}</a>{% endfor %}</nav>{% endif %}<iframe src="{{ primary }}">',
  { pdfs: ['a.pdf', 'b.pdf'], primary: 'a.pdf' },
);
if (!pdf.includes('<a>a.pdf</a>') || !pdf.includes('src="a.pdf"')) throw new Error(pdf);

console.log('ok');
