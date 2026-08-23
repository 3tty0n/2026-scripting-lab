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
      const title = inner.querySelector(':scope > h2, :scope > h3');
      if (!title) return;
      if (OWN.test(title.textContent.trim())) return;
      if (!section) return;
      const label = document.createElement('p');
      label.className = 'section-label';
      label.textContent = section;
      title.insertAdjacentElement('afterend', label);
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

  function layout() {
    leaves().forEach(wrap);
    addSectionLabels();
    leaves().forEach(fit);
  }

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
    pdfMaxPagesPerSlide: 1,
    pdfSeparateFragments: false,
    plugins: [RevealMarkdown, RevealHighlight],
    slideNumber: 'c/t',
    transition: 'none',
  }).then(() => {
    layout();
    Reveal.on('slidechanged', (ev) => fit(ev.currentSlide));
    Reveal.on('resize', layout);
    Reveal.on('pdf-ready', layout);
    document.fonts.ready.then(layout);
    leaves().forEach((slide) => {
      slide.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', () => fit(slide), { once: true });
      });
    });
  });
}());
