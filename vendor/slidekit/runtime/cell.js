(function () {
  function paintWrapLineNumbers(editor) {
    const layer = editor.renderer.$gutterLayer;
    if (!layer || !layer.element) return;
    layer.element.querySelectorAll('.ace-wrap-cont').forEach((n) => n.remove());
    if (!editor.session.getUseWrapMode()) return;
    const config = editor.renderer.layerConfig;
    const session = editor.session;
    for (let row = config.firstRow; row <= config.lastRow; row++) {
      const parts = session.getRowLength(row);
      if (parts <= 1) continue;
      const top = layer.$lines.computeLineTop(row, config, session);
      const num = String(row + session.$firstLineNumber);
      for (let i = 1; i < parts; i++) {
        const d = document.createElement('div');
        d.className = 'ace_gutter-cell ace-wrap-cont';
        d.textContent = num;
        d.style.top = `${top + i * config.lineHeight}px`;
        d.style.height = `${config.lineHeight}px`;
        layer.element.appendChild(d);
      }
    }
  }

  function enableWrapLineNumbers(editor) {
    editor.setOption('indentedSoftWrap', false);
    const paint = () => paintWrapLineNumbers(editor);
    editor.renderer.on('afterRender', paint);
    editor.session.on('changeWrapMode', paint);
    editor.session.on('changeWrapData', paint);
  }

  // ::: hstack wrap 内の複数セルは行番号を通す
  function syncHstackLineNumbers(el) {
    const hstack = el?.closest?.('.slide-hstack.code-wrap');
    if (!hstack) return;
    let next = 1;
    hstack.querySelectorAll('.code-cell .code-editor').forEach((host) => {
      const ed = ace.edit(host);
      ed.setOption('firstLineNumber', next);
      next += ed.session.getLength();
      paintWrapLineNumbers(ed);
    });
  }

  function addCell(code, opts) {
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('code-cell')) return;
    const source = code.textContent;
    const cell = document.createElement('div');
    cell.className = 'code-cell';
    pre.parentNode.insertBefore(cell, pre);
    const editorHost = document.createElement('div');
    editorHost.className = 'code-editor';
    editorHost.setAttribute('aria-label', opts.label);
    pre.classList.add('print-source');
    cell.append(editorHost, pre);

    const wrap = pre.classList.contains('code-wrap') || !!pre.closest('.code-wrap');
    const editor = ace.edit(editorHost);
    editor.session.setMode(opts.aceMode);
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
      tabSize: opts.tabSize,
      useSoftTabs: true,
      wrap,
      indentedSoftWrap: false,
    });
    editor.renderer.setScrollMargin(16, 16, 20, 64);
    if (wrap) enableWrapLineNumbers(editor);

    function updatePrintSource() {
      code.textContent = editor.getValue();
      code.removeAttribute('data-highlighted');
      if (window.hljs) window.hljs.highlightElement(code);
      syncHstackLineNumbers(cell);
      window.dispatchEvent(new Event('resize'));
    }

    editor.session.on('change', updatePrintSource);
    syncHstackLineNumbers(cell);

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

    const ui = {
      write(text) {
        output.hidden = false;
        output.textContent += (output.textContent ? '\n' : '') + text;
        output.scrollTop = output.scrollHeight;
      },
      set(text) {
        output.hidden = false;
        output.textContent = text;
      },
    };

    async function execute() {
      if (run.disabled) return;
      run.disabled = true;
      run.classList.add('running');
      output.hidden = false;
      output.textContent = '';
      try {
        await opts.run(editor.getValue(), ui);
      } catch (error) {
        ui.set(`${error.name || 'Error'}: ${error.message || error}`);
      } finally {
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

  window.SlidekitCell = {
    plugin(opts) {
      return {
        id: 'executable-code',
        init: (deck) => {
          deck.getRevealElement()
            .querySelectorAll(opts.selector)
            .forEach((el) => addCell(el, opts));
        },
      };
    },
  };
}());
