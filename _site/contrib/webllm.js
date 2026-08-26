(function () {
  const MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  const CDN = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
  const webllmReady = import(CDN);
  let enginePromise;
  const state = {};   // セルをまたいで使える作業領域 (会話履歴など)
  const listeners = new Set();

  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    try {
      return (
        JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? String(x) : x)) ??
        String(v)
      );
    } catch (_) {
      return String(v);
    }
  }

  function makeConsole(write) {
    const emit = (...args) => write(args.map(fmt).join(' '));
    const nop = () => {};
    const c = { log: emit, info: emit, warn: emit, error: emit, dir: emit };
    c.assert = (cond, ...rest) => {
      if (!cond) emit('Assertion failed:', ...rest);
    };
    [
      'debug', 'trace', 'table', 'group', 'groupEnd', 'groupCollapsed',
      'time', 'timeEnd', 'timeLog', 'timeStamp', 'clear', 'count',
      'countReset', 'dirxml', 'profile', 'profileEnd',
    ].forEach((k) => { c[k] = nop; });
    return c;
  }

  function broadcast(line) {
    listeners.forEach((fn) => fn(line));
  }

  async function getEngine() {
    const webllm = window.webllm || (window.webllm = await webllmReady);
    if (!('gpu' in navigator)) {
      throw new Error(
        'WebGPU 非対応のブラウザです。Chrome / Edge の最新版で開いてください'
      );
    }
    if (!enginePromise) {
      enginePromise = webllm
        .CreateMLCEngine(MODEL, {
          initProgressCallback: (r) =>
            broadcast(`[読み込み中 ${Math.round(r.progress * 100)}%] ${r.text}`),
        })
        .then((engine) => {
          broadcast('[モデル準備完了]');
          return engine;
        });
      enginePromise.catch(() => { enginePromise = undefined; });
    }
    return enginePromise;
  }

  window.ExecutableCode = SlidekitCell.plugin({
    selector: 'pre code.language-javascript',
    aceMode: 'ace/mode/javascript',
    tabSize: 2,
    label: '編集可能な JavaScript コード',
    async run(source, ui) {
      let lastAt = 0;
      const onProgress = (line) => {
        const now = Date.now();
        if (!/準備完了/.test(line) && now - lastAt < 300) return;
        lastAt = now;
        ui.write(line);
      };
      listeners.add(onProgress);
      try {
        const webllm = window.webllm || (window.webllm = await webllmReady);
        const AsyncFunction =
          Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(
          'webllm', 'getEngine', 'state', 'MODEL', 'console',
          '"use strict";\n' + source
        );
        await fn(webllm, getEngine, state, MODEL, makeConsole(ui.write));
      } finally {
        listeners.delete(onProgress);
      }
    },
  });
}());
