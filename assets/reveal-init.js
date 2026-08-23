(function () {
  function markSlides() {
    document.querySelectorAll('.reveal .slides section').forEach((slide) => {
      slide.classList.add('slide-content');
    });
    window.requestAnimationFrame(() => {
      document.querySelectorAll('.reveal .slides section').forEach((slide) => {
        if (slide.scrollHeight > slide.clientHeight ||
            slide.scrollWidth > slide.clientWidth) {
          console.warn('スライドが枠を超えています', slide);
        }
      });
    });
  }

  Reveal.initialize({
    backgroundTransition: 'none',
    disableLayout: true,
    fragments: false,
    hash: true,
    pdfMaxPagesPerSlide: 1,
    pdfSeparateFragments: false,
    plugins: [RevealMarkdown, RevealHighlight],
    slideNumber: 'c/t',
    transition: 'none',
  }).then(markSlides);
}());
