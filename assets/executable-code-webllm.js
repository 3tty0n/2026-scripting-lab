(function () {
  const MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
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

  // エンジンは初回だけ生成するシングルトン。2 回目以降は即座に解決される
  async function getEngine() {
    if (!window.webllm) {
      throw new Error('web-llm が読み込めていません (ネットワークを確認)');
    }
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

  function addCell(code) {
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('code-cell')) return;
    const source = code.textContent;
    const cell = document.createElement('div');
    cell.className = 'code-cell';
    pre.parentNode.insertBefore(cell, pre);
    const editorHost = document.createElement('div');
    editorHost.className = 'code-editor';
    editorHost.setAttribute('aria-label', '編集可能な JavaScript コード');
    pre.classList.add('print-source');
    cell.append(editorHost, pre);

    const editor = ace.edit(editorHost);
    editor.session.setMode('ace/mode/javascript');
    editor.setTheme('ace/theme/one_dark');
    editor.setKeyboardHandler('ace/keyboard/emacs');
    editor.setValue(source, -1);
    editor.setOptions({
      displayIndentGuides: false,
      fontFamily: 'IBM Plex Mono, SFMono-Regular, Menlo, monospace',
      fontSize: '25px',
      highlightActiveLine: false,
      highlightGutterLine: false,
      maxLines: 30,
      minLines: Math.max(2, source.split('\n').length),
      printMargin: false,
      showFoldWidgets: false,
      showGutter: true,
      showLineNumbers: true,
      tabSize: 2,
      useSoftTabs: true,
      wrap: false,
    });
    editor.renderer.setScrollMargin(16, 16, 20, 64);

    function updatePrintSource() {
      code.textContent = editor.getValue();
      code.removeAttribute('data-highlighted');
      if (window.hljs) window.hljs.highlightElement(code);
      window.dispatchEvent(new Event('resize'));
    }

    editor.session.on('change', updatePrintSource);

    const actions = document.createElement('div');
    actions.className = 'code-actions';
    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'run-cell';
    run.textContent = '▶';
    run.title = 'コードを実行';
    run.setAttribute('aria-label', 'コードを実行');
    const output = document.createElement('pre');
    output.className = 'cell-output';
    output.hidden = true;
    actions.appendChild(run);
    cell.append(actions, output);

    function write(text) {
      output.hidden = false;
      output.textContent += (output.textContent ? '\n' : '') + text;
      output.scrollTop = output.scrollHeight;
    }

    async function execute() {
      if (run.disabled) return;
      run.disabled = true;
      run.classList.add('running');
      output.hidden = false;
      output.textContent = '';
      // ダウンロード進捗の出力を間引く (完了報告は常に出す)
      let lastAt = 0;
      const onProgress = (line) => {
        const now = Date.now();
        if (!/準備完了/.test(line) && now - lastAt < 300) return;
        lastAt = now;
        write(line);
      };
      listeners.add(onProgress);
      try {
        const AsyncFunction =
          Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(
          'webllm', 'getEngine', 'state', 'MODEL', 'console',
          '"use strict";\n' + editor.getValue()
        );
        await fn(window.webllm, getEngine, state, MODEL, makeConsole(write));
      } catch (error) {
        write(`${error.name || 'Error'}: ${error.message || error}`);
      } finally {
        listeners.delete(onProgress);
        run.disabled = false;
        run.classList.remove('running');
        window.dispatchEvent(new Event('resize'));
      }
    }

    run.addEventListener('click', execute);
    editor.commands.addCommand({
      name: 'runSlideCell',
      bindKey: { mac: 'Command-Enter', win: 'Ctrl-Enter' },
      exec: execute,
      readOnly: true,
    });
  }

  window.ExecutableCode = {
    id: 'executable-code',
    init: (deck) => {
      deck.getRevealElement().querySelectorAll('pre code.language-javascript')
        .forEach(addCell);
    },
  };
}());
