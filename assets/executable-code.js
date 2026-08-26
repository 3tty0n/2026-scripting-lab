(function () {
  let runtimePromise;

  function runtime() {
    if (!runtimePromise) {
      runtimePromise = loadPyodide().then((pyodide) => {
        pyodide.runPython(`
import ast
import contextlib
import io

async def _run_slide_cell(source):
    tree = ast.parse(source, mode="exec")
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = tree.body.pop().value
    # セル内で代入される名前は global に置く (セル間で変数を共有するため)
    stores = {n.id for n in ast.walk(tree)
              if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
    body = ""
    if stores:
        body += "global " + ", ".join(sorted(stores)) + "\\n"
    body += ast.unparse(tree)
    if last is not None:
        body += "\\nreturn " + ast.unparse(last)
    # トップレベルの await を許すため、async 関数で包んでから実行する
    indented = "\\n".join(("    " + ln if ln.strip() else "") for ln in body.splitlines())
    exec(compile(f"async def _cell():\\n{indented}", "<slide>", "exec"), globals())
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
        value = await globals()["_cell"]()
    output = stream.getvalue()
    if value is not None:
        output += repr(value)
    return output
`);
        return pyodide;
      });
    }
    return runtimePromise;
  }

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

  function addCell(code) {
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('code-cell')) return;
    const source = code.textContent;
    const cell = document.createElement('div');
    cell.className = 'code-cell';
    pre.parentNode.insertBefore(cell, pre);
    const editorHost = document.createElement('div');
    editorHost.className = 'code-editor';
    editorHost.setAttribute('aria-label', '編集可能な Python コード');
    pre.classList.add('print-source');
    cell.append(editorHost, pre);

    const wrap = pre.classList.contains('code-wrap') || !!pre.closest('.code-wrap');
    const editor = ace.edit(editorHost);
    editor.session.setMode('ace/mode/python');
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
      tabSize: 4,
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

    async function execute() {
      if (run.disabled) return;
      run.disabled = true;
      run.classList.add('running');
      output.hidden = false;
      output.textContent = '';
      try {
        const pyodide = await runtime();
        pyodide.globals.set('_slide_source', editor.getValue());
        const result = await pyodide.runPythonAsync('_run_slide_cell(_slide_source)');
        output.textContent = result || '(出力なし)';
      } catch (error) {
        output.textContent = `${error.name || 'Error'}: ${error.message || error}`;
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

  window.ExecutableCode = {
    id: 'executable-code',
    init: (deck) => {
      deck.getRevealElement().querySelectorAll('pre code.language-python')
        .forEach(addCell);
    },
  };
}());
