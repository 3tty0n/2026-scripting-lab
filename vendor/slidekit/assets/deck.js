/* Reveal デッキの共通壳。各回の index.html は title と data-* だけ持つ。 */
(function () {
  const boot = document.currentScript;
  const assets = new URL('.', boot.src).href;
  const root = new URL('..', boot.src).href;
  const v = new URL(boot.src).searchParams.get('v') || '1';
  const markdown = boot.dataset.markdown || 'slides.md';
  const code = boot.dataset.code || 'python'; // python | webllm | none
  window.SlidekitWebLLM = {
    model: boot.dataset.model || '',
    models: (boot.dataset.models || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
  const cdn = {
    reveal: 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.2.1',
    hljs: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0',
    ace: 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2',
  };

  function css(href) {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    document.head.appendChild(el);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error('failed to load ' + src));
      document.body.appendChild(el);
    });
  }

  css(cdn.reveal + '/reset.min.css');
  css(cdn.reveal + '/reveal.min.css');
  css(cdn.reveal + '/theme/white.min.css');
  css(cdn.hljs + '/styles/base16/gruvbox-dark-hard.min.css');
  css(assets + 'slides.css?v=' + v);

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div class="reveal"><div class="slides">` +
      `<section data-markdown="${markdown}"` +
      ` data-separator="^\\r?\\n---\\r?\\n"` +
      ` data-separator-vertical="^\\r?\\n--\\r?\\n"` +
      ` data-charset="utf-8"></section>` +
      `</div></div>`
  );

  (async function () {
    await loadScript(cdn.reveal + '/reveal.min.js');
    await loadScript(cdn.reveal + '/plugin/markdown/markdown.min.js');
    await loadScript(cdn.hljs + '/highlight.min.js');
    await loadScript(cdn.reveal + '/plugin/highlight/highlight.min.js');
    await loadScript(cdn.ace + '/ace.min.js');
    await loadScript(cdn.ace + '/keybinding-emacs.min.js');
    if (code === 'python' || code === 'webllm') {
      await loadScript(root + 'runtime/cell.js?v=' + v);
    }
    if (code === 'python') {
      await loadScript(root + 'runtime/python.js?v=' + v);
    } else if (code === 'webllm') {
      await loadScript(root + 'contrib/webllm.js?v=' + v);
    } else {
      window.ExecutableCode = { id: 'executable-code', init() {} };
    }
    await loadScript(assets + 'reveal-init.js?v=' + v);
  })().catch((err) => {
    document.body.innerHTML =
      '<pre style="padding:2em;white-space:pre-wrap">' +
      String(err && err.message ? err.message : err) +
      '</pre>';
  });
})();
