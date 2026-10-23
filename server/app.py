#!/usr/bin/env python3
"""演習用の採点サーバ。標準ライブラリだけで動く。

    python3 server/app.py                    # http://localhost:8000
    python3 server/app.py --port 9000 --host 0.0.0.0

学生がノートブックを送ってくる。サーバが採点して、結果を返し、ダッシュボードに出す。
点数を出すのはあくまでサーバ側なので、学生の手元で数字をいじっても意味がない。

  GET  /submit        提出窓口。ブラウザから .ipynb をアップロードして、その場で採点結果を見る
  POST /api/submit    ノートブックを受け取り、採点して結果を返す
  POST /api/results   手元で grade.py を回した結果をまとめて受け取る
  GET  /              ダッシュボード。誰がどの項目で止まっているかが見える
  GET  /api/results   ダッシュボードが読む JSON

提出者の区別には UUID を使う。名前は入れても入れなくてもよい。
ブラウザから初めて提出したとき、サーバが UUID を発行して cookie (sid) に入れる。
同じブラウザなら以後は同じ UUID になるので、2回目からは何も入力しなくていい。
ノートブックから提出する場合は、受け取った UUID を手元のファイルに覚えておいて使い回す。

学生のコードを実行するので、server/sandbox.py の制限つきで動かす。
外に公開するなら Docker (server/Dockerfile) を使うこと。

第8回A はモデルの読み込みが要る。GPU か Apple Silicon の載った機械で動かすこと
(Mac Studio なら MPS が使われる)。1件あたり1〜2分かかるので、
同時に走らせる数を --jobs で絞ってある。
"""
import argparse
import json
import uuid
import pathlib
import sqlite3
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sandbox import grade_notebook          # noqa: E402
from grading.grade import load_checks       # noqa: E402

DB_PATH = pathlib.Path(__file__).resolve().parent / "progress.db"
TASKS = ("06", "07", "08a", "08", "e05", "e06", "e07")
MAX_UPLOAD = 8 * 1024 * 1024
COOKIE = "sid"
_lock = threading.Lock()
_slots = threading.Semaphore(2)      # 同時に走らせる採点の数。--jobs で変える


# ---------------------------------------------------------------- 保存

def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("""CREATE TABLE IF NOT EXISTS progress (
        sid     TEXT NOT NULL,          -- 提出者の UUID
        task    TEXT NOT NULL,
        label   TEXT NOT NULL,          -- 本人が入れた名前 (空でもよい)
        score   INTEGER NOT NULL,
        total   INTEGER NOT NULL,
        results TEXT NOT NULL,
        source  TEXT NOT NULL,
        updated REAL NOT NULL,
        PRIMARY KEY (sid, task))""")
    return conn


def new_sid():
    return str(uuid.uuid4())


def parse_cookies(header):
    jar = {}
    for part in (header or "").split(";"):
        k, _, v = part.strip().partition("=")
        if k:
            jar[k] = v
    return jar


def save(sid, task, label, score, total, results, note):
    with _lock, db() as conn:
        conn.execute(
            "INSERT INTO progress VALUES (?,?,?,?,?,?,?,?) "
            "ON CONFLICT(sid, task) DO UPDATE SET "
            "label=CASE WHEN excluded.label != '' THEN excluded.label ELSE progress.label END, "
            "score=excluded.score, total=excluded.total, results=excluded.results, "
            "source=excluded.source, updated=excluded.updated",
            (sid, task, label, score, total,
             json.dumps(results, ensure_ascii=False), note, time.time()))


def load_all(task=None):
    with db() as conn:
        rows = conn.execute(
            "SELECT sid, task, label, score, total, results, source, updated FROM progress"
            + (" WHERE task = ?" if task else "") + " ORDER BY updated DESC",
            (task,) if task else ()).fetchall()
    return [{"sid": r[0], "short": r[0][:8], "task": r[1], "label": r[2],
             "score": r[3], "total": r[4], "results": json.loads(r[5]),
             "source": r[6], "updated": r[7]} for r in rows]


# ---------------------------------------------------------------- 画面

PAGE = """<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<title>採点結果</title>
<style>
 :root{--ink:#14140f;--paper:#faf8f4;--rule:#c4bcab;--muted:#4f4a40;
       --accent:#a02b0c;--teal:#0a544c;--sand:#f6e9c6;
       --mono:'IBM Plex Mono',SFMono-Regular,Menlo,monospace}
 *{box-sizing:border-box}
 body{font-family:'Hiragino Sans','Noto Sans JP',sans-serif;background:var(--paper);
      color:var(--ink);margin:0;padding:32px 24px 64px;line-height:1.6}
 .wrap{max-width:1100px;margin:0 auto}
 h1{font-size:1.6rem;margin:0 0 4px;letter-spacing:-.02em}
 .sub{color:var(--muted);font-size:.9rem;margin:0 0 24px}
 .bar{display:flex;gap:0;margin:0 0 24px;flex-wrap:wrap}
 .bar a{font-family:var(--mono);font-size:.82rem;font-weight:600;text-decoration:none;
        color:var(--ink);padding:8px 16px;border:2px solid var(--ink);margin:0 -2px -2px 0}
 .bar a.on{background:var(--accent);border-color:var(--accent);color:#fff}
 table{border-collapse:collapse;width:100%;font-size:.86rem}
 th{background:var(--ink);color:var(--paper);text-align:left;padding:8px 10px;font-weight:600}
 td{border-bottom:1px solid var(--rule);padding:7px 10px;vertical-align:middle}
 td.name{font-weight:600}
 .q{display:inline-block;width:30px;text-align:center;font-family:var(--mono);
    font-size:.72rem;padding:3px 0;margin-right:3px;border:2px solid var(--rule);color:var(--muted)}
 .q.ok{background:var(--teal);border-color:var(--teal);color:#fff}
 .q.ng{background:var(--sand);border-color:#6d5410;color:#6d5410}
 .score{font-family:var(--mono);font-weight:600}
 .src{font-size:.72rem;color:var(--muted)}
 .stats{display:flex;gap:0;margin:0 0 24px;flex-wrap:wrap}
 .stat{border:2px solid var(--ink);padding:14px 20px;margin:0 -2px -2px 0;min-width:150px}
 .stat .n{font-family:var(--mono);font-size:1.7rem;font-weight:600;line-height:1}
 .stat .l{font-size:.76rem;color:var(--muted);margin-top:4px}
 .empty{border:2px dashed var(--rule);padding:40px;text-align:center;color:var(--muted)}
 .stuck{background:#f7ded2}
</style></head><body><div class="wrap">
<h1>採点結果</h1>
<p class="sub">提出されたノートブックをサーバで採点した結果です。数秒ごとに更新。 &nbsp;<a href="/submit">提出窓口はこちら</a></p>
<div class="bar" id="tabs"></div>
<div class="stats" id="stats"></div>
<div id="table"></div>
</div>
<script>
let task = new URLSearchParams(location.search).get('task') || '06';
const TASKS = ['06','07','08','e05','e06','e07'];

function tabs(){
  document.getElementById('tabs').innerHTML = TASKS.map(t =>
    `<a href="?task=${t}" class="${t===task?'on':''}">${t.startsWith('e') ? 'EECS 第' + Number(t.slice(1)) : 'CS 第' + Number(t)}回</a>`).join('');
}

function render(rows, qids){
  const stats = document.getElementById('stats');
  const n = rows.length;
  const done = rows.filter(r => r.score === r.total).length;
  const avg = n ? (rows.reduce((a,r)=>a+r.score,0)/n).toFixed(1) : '-';
  stats.innerHTML =
    `<div class="stat"><div class="n">${n}</div><div class="l">提出した人数</div></div>` +
    `<div class="stat"><div class="n">${done}</div><div class="l">満点</div></div>` +
    `<div class="stat"><div class="n">${avg}</div><div class="l">平均点</div></div>`;

  const box = document.getElementById('table');
  if(!n){ box.innerHTML = '<div class="empty">まだ提出がありません</div>'; return; }

  // つまずいている人 = 直近5分以内に更新があり、満点でない
  const now = Date.now()/1000;
  const head = '<tr><th>提出者</th><th>点</th><th>項目ごと</th><th>提出時刻</th></tr>';
  const body = rows.map(r => {
    const cells = qids.map(q =>
      `<span class="q ${r.results[q]===undefined?'':(r.results[q]>0?'ok':'ng')}">${q}</span>`).join('');
    const ago = Math.round(now - r.updated);
    const active = ago < 300 && r.score < r.total;
    return `<tr class="${active?'stuck':''}">` +
      `<td class="name">${r.label || '(名前なし)'}<br><span class="src">${r.short}</span></td>` +
      `<td class="score">${r.score}/${r.total}</td>` +
      `<td>${cells}</td>` +
      `<td class="src">${ago<60?ago+'秒前':Math.round(ago/60)+'分前'} · ${r.source}</td></tr>`;
  }).join('');
  box.innerHTML = `<table>${head}${body}</table>`;
}

async function tick(){
  const r = await fetch(`/api/results?task=${task}`);
  const d = await r.json();
  render(d.rows, d.qids);
}
tabs(); tick(); setInterval(tick, 3000);
</script></body></html>
"""


SUBMIT_PAGE = """<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>課題の提出</title>
<style>
 :root{--ink:#14140f;--paper:#faf8f4;--rule:#c4bcab;--muted:#4f4a40;
       --accent:#a02b0c;--teal:#0a544c;--sand:#f6e9c6;--sandline:#6d5410;
       --mono:'IBM Plex Mono',SFMono-Regular,Menlo,monospace}
 *{box-sizing:border-box}
 body{font-family:'Hiragino Sans','Noto Sans JP',sans-serif;background:var(--paper);
      color:var(--ink);margin:0;padding:40px 24px 80px;line-height:1.7}
 .wrap{max-width:760px;margin:0 auto}
 h1{font-size:1.7rem;margin:0 0 4px;letter-spacing:-.02em}
 .sub{color:var(--muted);font-size:.92rem;margin:0 0 28px}
 label{display:block;font-size:.85rem;font-weight:600;margin:18px 0 6px}
 select,input[type=text]{font:inherit;padding:9px 12px;border:2px solid var(--ink);
   background:#fff;border-radius:0;width:100%;max-width:340px}
 .drop{border:3px dashed var(--rule);padding:36px 20px;text-align:center;
       margin:8px 0 0;background:#fff;cursor:pointer}
 .drop.on{border-color:var(--accent);background:#fff6f2}
 .drop .big{font-size:1rem;font-weight:600}
 .drop .small{font-size:.82rem;color:var(--muted);margin-top:6px}
 button{font:inherit;font-weight:600;padding:11px 26px;border:none;
        background:var(--accent);color:#fff;cursor:pointer;margin-top:20px}
 button:disabled{background:var(--muted);cursor:progress}
 table{border-collapse:collapse;width:100%;font-size:.88rem;margin-top:18px}
 th{background:var(--ink);color:var(--paper);text-align:left;padding:7px 10px}
 td{border-bottom:1px solid var(--rule);padding:6px 10px}
 tr.ng td{background:var(--sand)}
 .total{font-family:var(--mono);font-size:1.5rem;font-weight:600;margin-top:18px}
 .id{font-family:var(--mono);font-size:.8rem;color:var(--muted);
     border-left:6px solid var(--rule);padding:10px 14px;margin-top:32px;background:#fff}
 .err{border-left:6px solid var(--accent);background:#f7ded2;padding:12px 16px;margin-top:18px;
      font-size:.88rem;white-space:pre-wrap}
 .note{font-size:.82rem;color:var(--muted)}
 #out{margin-top:26px}
</style></head><body><div class="wrap">
<h1>課題の提出</h1>
<p class="sub">.ipynb をアップロードすると、その場で採点して結果を返します。何度でもやり直せます。</p>

<label for="task">どの回か</label>
<select id="task">
  <optgroup label="CS">
  <option value="06">第6回 Python の関数と辞書</option>
  <option value="07">第7回 テキスト処理と文章生成</option>
  <option value="08">第8回 Forth インタプリタの実装</option>
  </optgroup>
  <optgroup label="EECS">
  <option value="e05">第5回 Python の使い方・数値計算・グラフ</option>
  <option value="e06">第6回 データ構造・繰り返し・分岐</option>
  <option value="e07">第7回 簡易インタプリタの実装</option>
  </optgroup>
</select>

<label for="label">名前 (任意。空でもよい)</label>
<input type="text" id="label" placeholder="山田太郎 / 学籍番号など" maxlength="40">

<label>ノートブック</label>
<div class="drop" id="drop">
  <div class="big">ここに .ipynb をドロップ</div>
  <div class="small">またはクリックして選ぶ</div>
  <input type="file" id="file" accept=".ipynb" hidden>
</div>

<button id="go" disabled>提出する</button>
<div id="out"></div>

<div class="id">
  あなたの提出者ID<br>
  <strong id="sid">__SID__</strong><br>
  <span class="note">このブラウザで提出するかぎり、同じIDが使われます。
  別の端末から出すときは、このIDを控えて先生に伝えてください。</span>
</div>
</div>
<script>
const $ = s => document.querySelector(s);
let content = null, fname = null;

function pick(f){
  if(!f) return;
  if(!f.name.endsWith('.ipynb')){ alert('.ipynb を選んでください'); return; }
  const r = new FileReader();
  r.onload = e => { content = e.target.result; fname = f.name;
    $('#drop').querySelector('.big').textContent = f.name;
    $('#drop').querySelector('.small').textContent =
      Math.round(f.size/1024) + ' KB / 選び直すにはもう一度クリック';
    $('#go').disabled = false; };
  r.readAsText(f);
}

$('#drop').onclick = () => $('#file').click();
$('#file').onchange = e => pick(e.target.files[0]);
$('#drop').ondragover = e => { e.preventDefault(); $('#drop').classList.add('on'); };
$('#drop').ondragleave = () => $('#drop').classList.remove('on');
$('#drop').ondrop = e => { e.preventDefault(); $('#drop').classList.remove('on');
                           pick(e.dataTransfer.files[0]); };

$('#go').onclick = async () => {
  $('#go').disabled = true;
  $('#go').textContent = '採点しています...';
  $('#out').innerHTML = '<p class="note">第8回A はモデルの読み込みがあるので数分かかります。'
                      + 'このページを閉じないでください。</p>';
  try{
    const res = await fetch('/api/submit', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({task:$('#task').value, label:$('#label').value,
                            notebook: content})});
    const d = await res.json();
    if(d.student_id) $('#sid').textContent = d.student_id;
    if(!d.ok){
      $('#out').innerHTML = '<div class="err">採点できませんでした\n'
        + (d.error||'').slice(0,600) + '</div>';
    } else {
      const rows = d.results.map(([q,t,got,pts,msg]) =>
        `<tr class="${got?'':'ng'}"><td>${q}</td><td>${t}</td>`
        + `<td>${got}/${pts}</td><td>${got?'':(msg||'').split('\n')[0].slice(0,60)}</td></tr>`).join('');
      $('#out').innerHTML =
        `<table><tr><th>項目</th><th>内容</th><th>点</th><th>ひとこと</th></tr>${rows}</table>`
        + `<div class="total">${d.score} / ${d.total}</div>`
        + (d.score===d.total ? '<p>全問正解です。</p>' : '<p class="note">直してもう一度出せます。</p>');
    }
  }catch(e){
    $('#out').innerHTML = '<div class="err">送れませんでした\n' + e + '</div>';
  }
  $('#go').disabled = false;
  $('#go').textContent = '提出する';
};
</script></body></html>
"""


# ---------------------------------------------------------------- 通信

class Handler(BaseHTTPRequestHandler):
    server_version = "ScriptingCourse/1.0"

    def log_message(self, fmt, *a):
        sys.stderr.write(f"{self.address_string()} {fmt % a}\n")

    # ---- 返す道具
    def _send(self, code, body, ctype="application/json; charset=utf-8", cookie=None):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if cookie:
            # 1年もたせる。同じブラウザなら次回も同じ提出者として扱われる
            self.send_header("Set-Cookie",
                             f"{COOKIE}={cookie}; Max-Age=31536000; Path=/; SameSite=Lax")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, code, obj, cookie=None):
        self._send(code, json.dumps(obj, ensure_ascii=False), cookie=cookie)

    def _sid(self, body_sid=None):
        """提出者の UUID を決める。

        1. 本文に入っていればそれ (ノートブックからの提出)
        2. cookie にあればそれ (2回目以降のブラウザ)
        3. どちらも無ければ新しく発行する
        戻り値は (uuid, 新しく発行したか)
        """
        if body_sid and len(str(body_sid)) >= 8:
            return str(body_sid)[:64], False
        jar = parse_cookies(self.headers.get("Cookie"))
        if jar.get(COOKIE):
            return jar[COOKIE][:64], False
        return new_sid(), True

    def do_OPTIONS(self):
        self._send(204, b"")

    # ---- GET
    def do_GET(self):
        path, _, query = self.path.partition("?")
        params = dict(p.split("=", 1) for p in query.split("&") if "=" in p)

        if path == "/":
            return self._send(200, PAGE, "text/html; charset=utf-8")

        if path == "/submit":
            sid, fresh = self._sid()
            page = SUBMIT_PAGE.replace("__SID__", sid)
            return self._send(200, page, "text/html; charset=utf-8",
                              cookie=sid if fresh else None)

        if path == "/api/results":
            task = params.get("task", "06")
            if task not in TASKS:
                return self._json(400, {"error": "不明な課題"})
            rows = load_all(task)
            return self._json(200, {"rows": rows, "qids": qids_of(task)})

        if path == "/api/health":
            return self._json(200, {"ok": True})

        return self._json(404, {"error": "そんな道は無い"})

    # ---- POST
    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_UPLOAD:
            return self._json(413, {"error": "ファイルが大きすぎる"})
        raw = self.rfile.read(length)

        if self.path == "/api/results":
            # 手元で grade.py を回した結果をまとめて受け取る口
            try:
                d = json.loads(raw)
                task = d["task"]
                assert task in TASKS
                label = str(d.get("label") or d.get("student") or "")[:40]
                sid = d.get("student_id")
                if not sid:
                    # 一括採点はファイル名で識別する。UUID は名前から作って毎回同じにする
                    sid = str(uuid.uuid5(uuid.NAMESPACE_URL, "batch:" + label))
                    note = "一括"
                else:
                    sid, note = str(sid)[:64], "ブラウザ"
                save(sid, task, label, int(d["score"]), int(d["total"]),
                     {str(k): int(v) for k, v in d["results"].items()}, note)
            except Exception as e:
                return self._json(400, {"error": f"受け取れなかった: {e}"})
            return self._json(200, {"ok": True})

        if self.path == "/api/submit":
            # 本文は JSON。notebook は .ipynb の中身をそのまま文字列で入れる
            try:
                d = json.loads(raw)
                task = d.get("task", "06")
                label = (str(d.get("label") or d.get("student") or "")).strip()[:40]
                nb = d["notebook"].encode("utf-8")
                assert task in TASKS, "不明な課題"
            except Exception as e:
                return self._json(400, {"error": f"受け取れなかった: {e}"})

            sid, fresh = self._sid(d.get("student_id"))

            # 同時に走る採点の数を絞る (第8回A はモデルを読むので重い)
            with _slots:
                self.log_message("採点開始 sid=%s task=%s (%d bytes)",
                                 sid[:8], task, len(nb))
                t0 = time.time()
                r = grade_notebook(nb, task)
                self.log_message("採点終了 sid=%s %s点 (%.1f秒)",
                                 sid[:8], r.get("score"), time.time() - t0)
            if r.get("ok"):
                save(sid, task, label, r["score"], r["total"],
                     {q: g for q, _t, g, _p, _m in r["results"]},
                     f"{time.time() - t0:.0f}秒")
            r["student_id"] = sid
            return self._json(200, r, cookie=sid if fresh else None)

        return self._json(404, {"error": "そんな道は無い"})


def qids_of(task):
    """その回の検査項目 ID を並べて返す"""
    return [c[0] for c in load_checks(task)]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--jobs", type=int, default=2,
                    help="同時に走らせる採点の数 (既定2)")
    args = ap.parse_args()

    global _slots
    _slots = threading.Semaphore(args.jobs)

    db().close()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"提出窓口:       http://{args.host}:{args.port}/submit")
    print(f"ダッシュボード: http://{args.host}:{args.port}/")
    print(f"同時採点数:     {args.jobs}")
    print("止めるには Ctrl-C")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n終了")


if __name__ == "__main__":
    main()
