(function () {
  let runtimePromise;

  function runtime() {
    if (!runtimePromise) {
      runtimePromise = loadPyodide().then((pyodide) => {
        pyodide.runPython(`
import ast
import contextlib
import io

def _run_slide_cell(source):
    tree = ast.parse(source, mode="exec")
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = ast.Expression(tree.body.pop().value)
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
        exec(compile(tree, "<slide>", "exec"), globals())
        value = eval(compile(last, "<slide>", "eval"), globals()) if last else None
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
