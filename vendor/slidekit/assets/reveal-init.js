(function () {
  const PRINT = /print-pdf/i.test(location.search);
  const CHECK = /check-size/i.test(location.search);

  function leaves() {
    return [...document.querySelectorAll('.reveal .slides section')]
      .filter((slide) => !slide.querySelector('section'));
  }

  function wrap(slide) {
    slide.classList.add('slide-content');
    if (slide.querySelector(':scope > .slide-fit')) return;
    const inner = document.createElement('div');
    inner.className = 'slide-fit';
    [...slide.childNodes].forEach((node) => {
      if (node.matches && node.matches('aside.notes')) return;
      inner.appendChild(node);
    });
    slide.appendChild(inner);
  }

  const BOX = /(?:key|warn|highlight)-box/;

  function boxClass(el) {
    return [...el.classList].find((c) => BOX.test(c));
  }

  // Reveal の .element は直前の要素に付く。末尾の `code` や **強調** に
  // 吸われるので、まず li/p へ戻してからリスト全体を箱にする。
  function boxLists(slide) {
    const root = slide.querySelector(':scope > .slide-fit') || slide;
    root.querySelectorAll('code, strong, em, a, del, span').forEach((el) => {
      if (!boxClass(el) || el.closest('pre')) return;
      const block = el.closest('li, p');
      if (!block) return;
      const cls = boxClass(el);
      el.classList.remove(cls);
      block.classList.add(cls);
    });
    root.querySelectorAll('pre').forEach((pre) => {
      if (!boxClass(pre)) return;
      const li = pre.closest('li');
      if (!li) return;
      const cls = boxClass(pre);
      pre.classList.remove(cls);
      li.classList.add(cls);
    });
    [...root.querySelectorAll('li, ul, ol')].filter(boxClass).forEach((el) => {
      const cls = boxClass(el);
      let node = el;
      while (node.parentElement) {
        const parent = node.parentElement;
        const last = parent.lastElementChild === node;
        if (!last || !/^(UL|OL|LI)$/.test(parent.tagName)) break;
        node.classList.remove(cls);
        parent.classList.add(cls);
        node = parent;
      }
    });
    [...root.querySelectorAll('p')].filter(boxClass).forEach((p) => {
      const prev = p.previousElementSibling;
      if (!prev || !/^(UL|OL)$/.test(prev.tagName)) return;
      const cls = boxClass(p);
      const wrap = document.createElement('div');
      wrap.className = cls;
      p.classList.remove(cls);
      prev.classList.remove(cls);
      prev.parentNode.insertBefore(wrap, prev);
      wrap.append(prev, p);
    });
  }

  // ### をタイトル直上のサブタイトルにする。
  // h3 のまま残す（サイズは既存の h3 ルールに従う）。色だけ赤くする。
  function placeSubtitles() {
    leaves().forEach((slide) => {
      if (slide.classList.contains('title-slide')) return;
      const inner = slide.querySelector(':scope > .slide-fit') || slide;
      const title = inner.querySelector(':scope > h2');
      if (!title) return;
      let sub = inner.querySelector(':scope > h3.slide-subtitle');
      if (!sub) {
        const prev = title.previousElementSibling;
        const next = title.nextElementSibling;
        sub =
          prev && prev.matches('h3') ? prev :
          next && next.matches('h3') ? next :
          null;
        if (!sub) return;
        sub.classList.add('slide-subtitle');
      }
      if (sub.nextElementSibling !== title) inner.insertBefore(sub, title);
    });
  }

  const SLIDE_W = 1920;
  const SLIDE_H = 1080;

  function fit(slide) {
    const inner = slide.querySelector(':scope > .slide-fit');
    if (!inner) return;
    inner.style.transform = 'none';
    inner.style.zoom = '';
    inner.style.left = '';
    inner.style.top = '';
    inner.style.position = '';
    inner.querySelectorAll('pre').forEach((pre) => { pre.style.fontSize = ''; });
    if (slide.classList.contains('title-slide') || slide.classList.contains('chapter')) return;
    if (PRINT) {
      slide.style.width = SLIDE_W + 'px';
      slide.style.height = SLIDE_H + 'px';
      slide.style.overflow = 'hidden';
    }
    inner.querySelectorAll('pre').forEach((pre) => {
      if (pre.scrollWidth <= pre.clientWidth + 2) return;
      const s = pre.clientWidth / pre.scrollWidth;
      pre.style.fontSize = `calc(0.7em * ${s})`;
    });
    const cs = getComputedStyle(slide);
    const h = SLIDE_H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = Math.min(1, h / Math.max(inner.scrollHeight, 1));
    if (scale < 0.999) inner.style.zoom = String(scale);
  }

  function addPdfHints() {
    if (PRINT) return;
    const slides = leaves();
    if (!slides.length) return;
    const href = location.pathname + '?print-pdf';
    [slides[0], slides[slides.length - 1]].forEach((slide) => {
      const inner = slide.querySelector(':scope > .slide-fit') || slide;
      if (inner.querySelector('.pdf-hint')) return;
      const p = document.createElement('p');
      p.className = 'pdf-hint';
      const a = document.createElement('a');
      a.href = href;
      a.textContent = 'PDF として保存';
      p.append(
        a,
        document.createTextNode(
          ' : 印刷 => PDFに保存。向きは横、用紙は US Legal、背景グラフィックをオン'
        )
      );
      inner.appendChild(p);
    });
  }

  function layout(first) {
    const all = leaves();
    if (all[0]) all[0].classList.add('title-slide');
    if (all[0]) {
      const firstParagraph = all[0].querySelector('p');
      if (firstParagraph) firstParagraph.classList.add('kicker');
    }
    all.forEach((slide) => {
      slide.querySelectorAll('blockquote').forEach((note) => {
        note.classList.add('note');
      });
    });
    leaves().forEach(wrap);
    if (first) {
      leaves().forEach(boxLists);
      addPdfHints();
    }
    placeSubtitles();
    leaves().forEach(fit);
  }

  function addPrintBanner() {
    const bar = document.createElement('div');
    bar.className = 'print-pdf-banner';
    bar.innerHTML =
      '<strong>PDF は横向き・US Legal。</strong> ' +
      '宛先は「PDFに保存」。向きは横、用紙は US Legal、余白なし、背景グラフィックをオン。';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '印刷ダイアログを開く';
    btn.addEventListener('click', () => window.print());
    bar.appendChild(btn);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  const CourseLayout = {
    id: 'course-layout',
    init: (deck) => {
      layout(true);
      if (!PRINT) return;
      addPrintBanner();
      const st = document.createElement('style');
      st.textContent = '@page { size: legal landscape; margin: 0; }';
      document.head.appendChild(st);
      const refit = () => leaves().forEach(fit);
      deck.on('print-ready', refit);
      deck.on('pdf-ready', refit);
    },
  };

  // ::: hstack [wrap] [flex...] ... ||| ... :::  →  <div class="r-hstack">...</div>
  function expandHstack(md) {
    const openRe = /^::: *(?:r-)?hstack\b(.*)$/;
    const closeRe = /^::: *$/;
    const colRe = /^\|\|\| *$/;
    const fenceRe = /^(`{3,}|~{3,})/;
    const lines = md.split('\n');
    const out = [];
    let fence = null;

    function splitCols(bodyLines, weights, wrap) {
      const cols = [[]];
      let f = null;
      for (const line of bodyLines) {
        const fm = line.match(fenceRe);
        if (fm) {
          if (!f) f = fm[1];
          else if (line.startsWith(f)) {
            f = null;
            // ```lang は閉じと同時に次フェンス開始
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
      const cls = 'r-hstack slide-hstack' + (wrap ? ' code-wrap' : '');
      const parts = [`<div class="${cls}">`, ''];
      cols.forEach((col, i) => {
        const flex = weights[i] || 1;
        parts.push(`<div class="slide-hstack-col" style="flex:${flex}">`, '');
        parts.push(col.join('\n').replace(/^\n+|\n+$/g, ''));
        parts.push('', '</div>', '');
      });
      parts.push('</div>');
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
      const tokens = (om[1] || '').trim().split(/\s+/).filter(Boolean);
      const wrap = tokens.includes('wrap');
      const weights = tokens.filter((t) => /^\d+(\.\d+)?$/.test(t)).map(Number);
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
        // 閉じ忘れでも後続スライドは落とさない
        out.push(line, ...body);
        continue;
      }
      out.push(...splitCols(body, weights, wrap));
    }
    return out.join('\n');
  }

  // ```python wrap → pre.code-wrap (Ace / 静的コードの折り返し)
  function expandCodeFlags(md) {
    const lines = md.split('\n');
    const out = [];
    let fence = null;
    let wrap = false;
    for (const line of lines) {
      if (!fence) {
        const m = line.match(/^(`{3,}|~{3,})(.*)$/);
        if (!m) {
          out.push(line);
          continue;
        }
        const mark = m[1];
        const tokens = m[2].trim().split(/\s+/).filter(Boolean);
        wrap = tokens.includes('wrap');
        out.push(mark + tokens.filter((t) => t !== 'wrap').join(' '));
        fence = mark;
        continue;
      }
      out.push(line);
      if (line.startsWith(fence) && /^(`{3,}|~{3,})\s*$/.test(line)) {
        if (wrap) out.push('<!-- .element: class="code-wrap" -->');
        fence = null;
        wrap = false;
      }
    }
    return out.join('\n');
  }

  function expandMarkdownDsl(md) {
    return expandCodeFlags(expandHstack(md));
  }

  // slides.md を fetch → DSL 展開 → インライン化 (キャッシュ回避も兼ねる)
  function loadMarkdown() {
    return Promise.all(
      [...document.querySelectorAll('[data-markdown]')].map(async (el) => {
        const src = el.getAttribute('data-markdown');
        if (!src || /^(https?:|data:)/i.test(src)) return;
        const url = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
        const text = await fetch(url).then((r) => {
          if (!r.ok) throw new Error('failed to load ' + src + ': ' + r.status);
          return r.text();
        });
        const ta = document.createElement('textarea');
        ta.setAttribute('data-template', '');
        // Reveal Markdown は textarea.textContent を読む (.value だと空になる)
        ta.textContent = expandMarkdownDsl(text);
        el.removeAttribute('data-markdown');
        el.setAttribute('data-markdown', '');
        el.appendChild(ta);
      })
    );
  }

  loadMarkdown().then(() =>
    Reveal.initialize({
      width: 1920,
      height: 1080,
      margin: 0.06,
      minScale: 0.2,
      maxScale: 2,
      center: false,
      backgroundTransition: 'none',
      fragments: false,
      hash: true,
      controls: true,
      controlsTutorial: false,
      controlsLayout: 'bottom-right',
      slideNumber: 'c/t',
      showSlideNumber: 'all',
      pdfMaxPagesPerSlide: 1,
      pdfSeparateFragments: false,
      plugins: [RevealMarkdown, RevealHighlight, CourseLayout, ExecutableCode],
      transition: 'none',
    }).then(() => {
      if (PRINT) return;
      Reveal.on('slidechanged', (ev) => fit(ev.currentSlide));
      Reveal.on('resize', () => layout(false));
      document.fonts.ready.then(() => layout(false));
      leaves().forEach((slide) => {
        slide.querySelectorAll('img').forEach((img) => {
          if (!img.complete) img.addEventListener('load', () => fit(slide), { once: true });
        });
      });
      if (!CHECK) return;
      const pending = [...document.images].filter((img) => !img.complete);
      Promise.all([
        document.fonts.ready,
        ...pending.map((img) => new Promise((res) => img.addEventListener('load', res, { once: true }))),
      ]).then(async () => {
        const rows = [];
        for (const [i, slide] of leaves().entries()) {
          const idx = Reveal.getIndices(slide);
          Reveal.slide(idx.h, idx.v);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const inner = slide.querySelector(':scope > .slide-fit');
          if (!inner) continue;
          inner.style.transform = 'none';
          const cs = getComputedStyle(slide);
          const w = slide.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const h = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
          rows.push({
            i,
            title: ((slide.querySelector('h1, h2') || {}).textContent || '').trim().slice(0, 48),
            dw: Math.round(inner.scrollWidth - w),
            dh: Math.round(inner.scrollHeight - h),
          });
        }
        const pre = document.createElement('pre');
        pre.id = 'size-report';
        pre.textContent = JSON.stringify({
          n: rows.length,
          bad: rows.filter((r) => r.dw > 4 || r.dh > 4),
          tight: rows.filter((r) => r.dh > -24 || r.dw > -24),
        });
        document.documentElement.appendChild(pre);
      });
    })
  );
}());
