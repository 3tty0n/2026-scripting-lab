(function () {
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js';
  let runtimePromise;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error('failed to load ' + src));
      document.body.appendChild(el);
    });
  }

  function runtime() {
    if (!runtimePromise) {
      runtimePromise = loadScript(PYODIDE).then(() => loadPyodide()).then((pyodide) => {
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

  window.ExecutableCode = SlidekitCell.plugin({
    selector: 'pre code.language-python',
    aceMode: 'ace/mode/python',
    tabSize: 4,
    label: '編集可能な Python コード',
    async run(source, ui) {
      const pyodide = await runtime();
      pyodide.globals.set('_slide_source', source);
      const result = await pyodide.runPythonAsync('_run_slide_cell(_slide_source)');
      ui.set(result || '(出力なし)');
    },
  });
}());
