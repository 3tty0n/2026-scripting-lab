const $ = s => document.querySelector(s);

/* kibaco の URL。科目のページが決まったらここを直す */
const KIBACO = 'https://kibaco.tmu.ac.jp/';
document.querySelectorAll('.kibaco-link').forEach(a => a.href = KIBACO);

/* ---- 提出者ID: cookie に UUID を持つ ---- */
function cookie(name){
  return document.cookie.split(';').map(s=>s.trim())
    .filter(s=>s.startsWith(name+'=')).map(s=>s.slice(name.length+1))[0];
}
let SID = cookie('sid');
if(!SID){
  SID = (crypto.randomUUID ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random()*16|0;
            return (c==='x' ? r : (r&0x3|0x8)).toString(16); }));
  document.cookie = 'sid=' + SID + '; Max-Age=31536000; Path=/; SameSite=Lax';
}
const sid = $('#sid');
if (sid) sid.textContent = SID;

/* ---- 集計の送り先。空なら送らない ----
   先生が server/app.py を動かしているならそのURL + /api/results、
   Apps Script を使うならそのウェブアプリURLを入れる ---- */
const ENDPOINT = '';

/* ---- Pyodide ---- */
let pyodide = null;
const RUNNER = `
import json, io, contextlib, linecache, traceback

def _no_input(*a, **k):
    raise RuntimeError("採点中は input() を使えない")

def _failing_line(code):
    import sys
    tb = sys.exc_info()[2]
    lineno = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename.startswith("<check"):
            lineno = tb.tb_lineno
        tb = tb.tb_next
    if not lineno:
        return ""
    lines = code.split("\\n")
    if 1 <= lineno <= len(lines):
        return "この行で失敗: " + lines[lineno - 1].strip()[:70]
    return ""

def _advise(ns, task, qid, err, msg):
    "落ちた項目に、次にやることを一行足す。助言は学生の名前空間の中で作る"
    if "→" in msg:
        return msg
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            hint = ns["diagnose"](task, qid, err)
    except BaseException:
        hint = ""
    return msg + ("\\n→ " + hint if hint else "")


def grade(nb_text, checks_src, prelude_src, notebook_src, filename, task):
    mod = {}
    exec(compile(notebook_src, "notebook.py", "exec"), mod)
    try:
        parsed = mod["parse"](nb_text, filename)
    except mod["FormatError"] as e:
        return json.dumps({"format_error": str(e)}, ensure_ascii=False)

    ns = {"__name__": "__student__", "input": _no_input}
    exec(compile(prelude_src, "<prelude>", "exec"), ns)
    cell_errors = []
    for i, code in enumerate(parsed["code"], 1):
        # linecache に載せておくと、採点側から学生のコードを構文木で見られる
        name = "<cell %d>" % i
        linecache.cache[name] = (len(code), None, code.splitlines(True), name)
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code, name, "exec"), ns)
        except BaseException as e:
            cell_errors.append("セル%d: %s: %s" % (i, type(e).__name__, e))

    cns = {}
    exec(compile(checks_src, "<checks>", "exec"), cns)

    results, earned, total = [], 0, 0
    for qid, title, points, body in cns["CHECKS"]:
        total += points
        code = "\\n".join(body)
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code, "<check %s>" % qid, "exec"), ns)
        except AssertionError as e:
            msg = str(e) or _failing_line(code) or "assert に引っかかった"
            results.append([qid, title, 0, points, _advise(ns, task, qid, e, msg)])
        except BaseException as e:
            results.append([qid, title, 0, points,
                            _advise(ns, task, qid, e, "%s: %s" % (type(e).__name__, e))])
        else:
            earned += points
            results.append([qid, title, points, points, "OK"])
    return json.dumps({"score": earned, "total": total, "results": results,
                       "cell_errors": cell_errors,
                       "facts": list(ns.get("_FACTS", []))}, ensure_ascii=False)
`;

const CHECK_FILES = {'06':'06_basics','07':'07_text','08a':'08a_llm','08b':'08b_forth'};
const cache = {};

async function grab(path){
  if(cache[path]) return cache[path];
  const r = await fetch(path);
  if(!r.ok) throw new Error(`${path} を読めませんでした (${r.status})`);
  return cache[path] = await r.text();
}
const loadChecks = task => grab(`grading/checks/${CHECK_FILES[task]}.py`);

/* need / holds の定義を contracts.py から取り出す */
async function loadPrelude(){
  if(cache.__prelude) return cache.__prelude;
  const src = await grab('grading/contracts.py');
  pyodide.runPython(`
import json as _j
_c = {}
exec(compile(${JSON.stringify(src)}, "contracts.py", "exec"), _c)
_prelude = _c["PRELUDE"]
`);
  return cache.__prelude = pyodide.globals.get('_prelude');
}

(async () => {
  const t0 = performance.now();
  pyodide = await loadPyodide();
  pyodide.runPython(RUNNER);
  const dt = ((performance.now()-t0)/1000).toFixed(1);
  $('#boot').textContent = `採点環境の準備ができました (${dt} 秒)。ブラウザの中で採点します。`;
  $('#boot').classList.add('ready');
  syncTask();
})();

/* ---- ファイル選択 ---- */
let content = null, fname = 'submission.ipynb';
function pick(f){
  if(!f) return;
  if(!f.name.endsWith('.ipynb')){ alert('.ipynb を選んでください'); return; }
  const r = new FileReader();
  r.onload = e => {
    content = e.target.result; fname = f.name;
    $('#drop').querySelector('.big').textContent = f.name;
    $('#drop').querySelector('.small').textContent =
      Math.round(f.size/1024) + ' KB / 選び直すにはもう一度クリック';
    syncTask();
  };
  r.readAsText(f);
}
function syncTask(){
  const llm = $('#task').value === '08a';
  $('#llm-note').style.display = llm ? 'block' : 'none';
  $('#drop').style.opacity = llm ? .4 : 1;
  $('#drop').style.pointerEvents = llm ? 'none' : 'auto';
  $('#go').disabled = llm || !content || !pyodide;
  if(llm) $('#out').innerHTML = '';
}
$('#task').onchange = syncTask;

$('#drop').onclick = () => $('#file').click();
$('#file').onchange = e => pick(e.target.files[0]);
$('#drop').ondragover = e => { e.preventDefault(); $('#drop').classList.add('on'); };
$('#drop').ondragleave = () => $('#drop').classList.remove('on');
$('#drop').ondrop = e => { e.preventDefault(); $('#drop').classList.remove('on');
                           pick(e.dataTransfer.files[0]); };

/* ---- 採点 ---- */
$('#go').onclick = async () => {
  const task = $('#task').value;
  $('#go').disabled = true; $('#go').textContent = '採点しています...';
  $('#out').innerHTML = '<p class="note">計算量の多い課題があるので、十数秒かかることがあります。</p>';
  await new Promise(r => setTimeout(r, 30));

  try{
    const [checks, prelude, nbmod] = await Promise.all(
      [loadChecks(task), loadPrelude(), grab('grading/notebook.py')]);
    const t0 = performance.now();
    const raw = pyodide.globals.get('grade')(content, checks, prelude, nbmod, fname, task);
    const d = JSON.parse(raw);
    const secs = ((performance.now()-t0)/1000).toFixed(1);
    if(d.format_error){
      $('#out').innerHTML = '<div class="err">ファイルの形が読めませんでした\n'
        + d.format_error + '</div>'
        + '<p class="note">中身を採点できていません。'
        + 'Colab の「ファイル → .ipynb をダウンロード」で保存し直してから、'
        + 'もう一度アップロードしてください。</p>';
    } else {
      show(d, task, secs);
      report(d, task);
    }
  }catch(e){
    $('#out').innerHTML = '<div class="err">採点できませんでした\n' + e + '</div>';
  }
  $('#go').disabled = false; $('#go').textContent = '採点する';
};

function show(d, task, secs){
  const esc = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const rows = d.results.map(([q,t,got,pts,msg]) => {
    const [head, ...rest] = (msg||'').split('\n');
    const cell = got ? '' : esc(head.slice(0,90))
      + rest.map(l => `<br><span class="fix">${esc(l.slice(0,110))}</span>`).join('');
    return `<tr class="${got?'':'ng'}"><td class="pt">${q}</td><td>${t}</td>`
      + `<td class="pt">${got}/${pts}</td><td>${cell}</td></tr>`;
  }).join('');
  const pct = d.total ? Math.round(d.score/d.total*100) : 0;
  let html = `<table><tr><th>項目</th><th>内容</th><th>点</th><th>直すところ</th></tr>${rows}</table>`
    + `<div class="bar"><i style="width:${pct}%"></i></div>`
    + `<div class="total">${d.score} / ${d.total}</div>`;
  if(d.score === d.total){
    html += '<div class="msg">全問正解です。この .ipynb を <a target="_blank" rel="noopener" href="'
          + KIBACO + '">kibaco</a> から提出してください。</div>';
  } else {
    const ng = d.results.filter(r => !r[2]).map(r => r[0]).join(', ');
    html += `<div class="warn">まだ通っていない項目: <strong>${ng}</strong><br>`
          + '直したらもう一度アップロードしてください。</div>';
  }
  if(d.facts && d.facts.length){
    html += '<div class="msg"><strong>採点中に見えたこと</strong><br>'
          + d.facts.map(f => '・' + f).join('<br>') + '</div>';
  }
  if(d.cell_errors && d.cell_errors.length){
    html += '<div class="err">実行中に出たエラー (参考)\n'
          + d.cell_errors.slice(0,6).join('\n') + '</div>';
  }
  html += `<p class="note">採点にかかった時間 ${secs} 秒</p>`;
  $('#out').innerHTML = html;
}

/* ---- 集計は裏で送る。学生には見せない ---- */
function report(d, task){
  if(!ENDPOINT) return;
  const body = JSON.stringify({
    student_id: SID, label: $('#label').value, task: task,
    score: d.score, total: d.total,
    results: Object.fromEntries(d.results.map(r => [r[0], r[2]]))});
  fetch(ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'},
                   body, keepalive:true}).catch(()=>{});
}
