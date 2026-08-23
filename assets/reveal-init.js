(function () {
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
      if (!title) return;
      if (OWN.test(title.textContent.trim())) return;
      if (!section) return;
      const label = document.createElement('p');
      label.className = 'section-label';
      label.textContent = section;
      const sub = title.nextElementSibling;
      const after = sub && sub.tagName === 'H3' ? sub : title;
      after.insertAdjacentElement('afterend', label);
    });
  }

  function fit(slide) {
    const inner = slide.querySelector(':scope > .slide-fit');
    if (!inner) return;
    inner.style.transform = 'none';
    const cs = getComputedStyle(slide);
    const w = slide.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const scale = Math.min(1, w / inner.scrollWidth, h / inner.scrollHeight);
    if (scale < 0.999) inner.style.transform = `scale(${scale})`;
  }

  function layout(first) {
    leaves().forEach(wrap);
    if (first) leaves().forEach(boxLists);
    addSectionLabels();
    leaves().forEach(fit);
  }

  // slides.md を毎回取り直す (http.server だとブラウザが古いファイルを握ることがある)
  document.querySelectorAll("[data-markdown]").forEach((el) => {
    const src = el.getAttribute("data-markdown");
    if (!src || /^(https?:|data:)/i.test(src)) return;
    el.setAttribute("data-markdown", src + (src.includes("?") ? "&" : "?") + "t=" + Date.now());
  });

  Reveal.initialize({
    width: 1920,
    height: 1080,
    margin: 0.04,
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
    plugins: [RevealMarkdown, RevealHighlight],
    transition: 'none',
  }).then(() => {
    layout(true);
    Reveal.on('slidechanged', (ev) => fit(ev.currentSlide));
    Reveal.on('resize', () => layout(false));
    Reveal.on('pdf-ready', () => layout(false));
    document.fonts.ready.then(() => layout(false));
    leaves().forEach((slide) => {
      slide.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', () => fit(slide), { once: true });
      });
    });
  });
}());
