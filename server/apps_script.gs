/**
 * 採点結果を受け取って、スプレッドシートに書き込む。
 * サーバを立てたくないときの受け皿。
 *
 * ---- 置き方 ----
 * 1. Google スプレッドシートを新規作成する
 * 2. 拡張機能 → Apps Script を開き、このファイルの中身を貼り付ける
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *      次のユーザーとして実行: 自分
 *      アクセスできるユーザー: 全員
 * 4. 出てきた https://script.google.com/macros/s/..../exec を控える
 * 5. そのURLを、学生に配るノートブックの ENDPOINT に書く
 *
 * ---- 送る側 ----
 * 提出物を手元で一括採点して、その結果をここへ送る。
 *
 *   python3 grading/grade.py 01 提出物/ --post https://script.google.com/.../exec
 *
 * 送られるのは点数だけで、学生のコードは送らない。
 * 採点しているのは grading/grade.py なので、数字は自動採点の結果そのもの。
 */

/** 採点結果を受け取る */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var student = String(d.student || '名無し').slice(0, 40);
    var task    = String(d.task || '');
    var score   = Number(d.score || 0);
    var total   = Number(d.total || 0);
    var results = d.results || {};

    if (['01', '02', '03a', '03b'].indexOf(task) < 0) {
      return json({ok: false, error: '不明な課題: ' + task});
    }

    var sheet = sheetFor(task, Object.keys(results));
    var row = findRow(sheet, student);
    var values = [student, score, total, new Date()]
                   .concat(Object.keys(results).map(function (k) { return results[k]; }));

    if (row > 0) {
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
    return json({ok: true, score: score, total: total});
  } catch (err) {
    return json({ok: false, error: String(err)});
  } finally {
    lock.releaseLock();
  }
}

/** ブラウザで開いたときの簡易ダッシュボード */
function doGet(e) {
  var task = (e && e.parameter && e.parameter.task) || '01';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName(task));
  if (!sheet) return HtmlService.createHtmlOutput('<p>まだ誰も送ってきていません</p>');

  var data = sheet.getDataRange().getValues();
  var head = data.shift();
  data.sort(function (a, b) { return b[3] - a[3]; });   // 更新が新しい順

  var html = '<meta charset="utf-8">'
    + '<style>body{font-family:sans-serif;padding:24px}'
    + 'table{border-collapse:collapse}th{background:#14140f;color:#fff;padding:6px 10px;text-align:left}'
    + 'td{border-bottom:1px solid #ccc;padding:5px 10px}'
    + '.done{background:#d5e8e5}</style>'
    + '<h2>第' + task + '回の進み具合</h2><table><tr>';
  head.forEach(function (h) { html += '<th>' + h + '</th>'; });
  html += '</tr>';
  data.forEach(function (r) {
    var done = r[1] === r[2];
    html += '<tr class="' + (done ? 'done' : '') + '">';
    r.forEach(function (c, i) {
      html += '<td>' + (i === 3 ? Utilities.formatDate(new Date(c),
                Session.getScriptTimeZone(), 'HH:mm:ss') : c) + '</td>';
    });
    html += '</tr>';
  });
  html += '</table><p>' + data.length + ' 名 / 満点 '
       + data.filter(function (r) { return r[1] === r[2]; }).length + ' 名</p>';
  return HtmlService.createHtmlOutput(html);
}

function sheetName(task) { return '第' + task + '回'; }

function sheetFor(task, qids) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName(task);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['学生', '点', '満点', '更新'].concat(qids));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 同じ学生の行があれば、その行番号を返す (無ければ 0) */
function findRow(sheet, student) {
  var col = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getValues();
  for (var i = 1; i < col.length; i++) {
    if (String(col[i][0]) === student) return i + 1;
  }
  return 0;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}
