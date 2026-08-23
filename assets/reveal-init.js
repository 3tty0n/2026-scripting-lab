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

  const OWN = /^(まとめ|今日やること|今日作るもの|今日のゴール|前提を確認)$/;

  function addSectionLabels() {
    let section = '導入';
    leaves().forEach((slide) => {
      if (slide.classList.contains('title-slide')) {
        section = '導入';
        return;
      }
      if (slide.classList.contains('chapter')) {
        const num = slide.querySelector('.num');
        const h2 = slide.querySelector('h2');
        const name = h2 ? h2.textContent.trim() : '';
        const n = num ? num.textContent.trim() : '';
        section = [n, name].filter(Boolean).join('  ');
        return;
      }
      const inner = slide.querySelector(':scope > .slide-fit') || slide;
      if (inner.querySelector(':scope > .section-label')) return;
      const title = inner.querySelector(':scope > h2');
      if (!title || !section) return;
      if (OWN.test(title.textContent.trim())) return;
      const label = document.createElement('p');
      label.className = 'section-label';
      label.textContent = section;
      inner.insertBefore(label, inner.firstChild);
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
          ' — 印刷 → PDFに保存。向きは横、用紙は US Legal、背景グラフィックをオン'
        )
      );
      inner.appendChild(p);
    });
  }

  function layout(first) {
    leaves().forEach(wrap);
    if (first) {
      leaves().forEach(boxLists);
      addPdfHints();
    }
    addSectionLabels();
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

  // slides.md を毎回取り直す (http.server だとブラウザが古いファイルを握ることがある)
  document.querySelectorAll("[data-markdown]").forEach((el) => {
    const src = el.getAttribute("data-markdown");
    if (!src || /^(https?:|data:)/i.test(src)) return;
    el.setAttribute("data-markdown", src + (src.includes("?") ? "&" : "?") + "t=" + Date.now());
  });

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
    plugins: [RevealMarkdown, RevealHighlight, CourseLayout],
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
  });
}());
