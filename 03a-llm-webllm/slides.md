Scripting Languages / Transformer / 03-A (WebLLM 版)

# 言語モデルの仕組みと実装

### スクリプト言語演習

---

## 本日の到達点

- ブラウザの中での言語モデルの実行
- 応答の選び方を決めるパラメータの利用
- 簡単な応答プログラムの作成

> API キー不要。WebGPU 対応ブラウザ (Chrome / Edge) でそのまま動く

---

## Colab 版との違い

- 課題の中身は同じ。動かす場所と言語が違うだけ
- torch 版は内部 (logits) を観察、この版は振る舞いを制御
- 初回だけモデルをダウンロードし、以後はブラウザがキャッシュ

| | Colab 版 | この版 (WebLLM) |
|---|---|---|
| 言語 | Python | JavaScript |
| 場所 | Colab の GPU | 自分のブラウザ (WebGPU) |
| 準備 | `pip install` | ページを開くだけ |
| 内部の logits | 直接観察できる | API の外側で隠れている |

> どちらか好きなほうで課題を進めてよい

---

## セットアップ

- 最初の ▶ でモデルを読み込む
- 2 回目以降はキャッシュで即起動
- 生成中はタブを開いたままにする

```javascript
// 最初の一回だけ時間がかかる (進捗が出力に出る)
console.log("キャッシュ済み:", await webllm.hasModelInCache(MODEL).catch(() => false));
const engine = await getEngine();
console.log("読み込んだモデル:", MODEL);
```

---

## 第2回との共通点

- 次の語の予測と、選んでつなげるループ
- 回数の表を学習済みの関数へ置き換えた点
- 第2回と同じ温度の利用

| | 第2回：マルコフ連鎖 | 今日：言語モデル |
|---|---|---|
| 次の語の予測 | `table[word]` を引く | `model(文脈)` を呼ぶ |
| 予測の中身 | 数えた回数の表 | 学習した重み |
| 見ている文脈 | 直前 1〜2 語 | 直前 数千トークン |
| 選び方 | `random.choices` + 温度 | サンプリング + 温度 |

---

## 言語モデルの処理

- 入力となる「ここまでの文字列」
- 出力となる、語彙ごとの確率
- 1ステップの繰り返しによる長い文章の生成

![言語モデルの入出力](../assets/diagrams/flow-llm.svg)

> 一度に1トークンしか返さないことによる、生成ループ

---

## トークンと確率

- 単語とも1文字とも限らないトークン
- logits に `softmax` を通して得る確率
- この部分はモデルなしで試せる

```javascript
function softmax(xs) {
  const m = Math.max(...xs);
  const es = xs.map((x) => Math.exp(x - m));
  const s = es.reduce((a, b) => a + b, 0);
  return es.map((e) => e / s);
}

const probs = softmax([0.3, -1.2, 2.1, 0.0, 0.7]); // ダミーの logits
console.log(probs.map((p) => p.toFixed(3)));
console.log("合計:", probs.reduce((a, b) => a + b)); // 1 になる
```

![トークナイザの入出力](../assets/diagrams/lexer-tokenizer.svg)

---

## 1ステップの実行

- 文字列からトークン列への変換は WebLLM の内部
- 返り値の `usage` で、入力と出力のトークン数がわかる
- ストリームの1かたまりが、およそ1トークン

```javascript
const engine = await getEngine();
const reply = await engine.chat.completions.create({
  messages: [{ role: "user", content: "むかしむかし、あるところに" }],
  max_tokens: 16,
});

console.log("続き:", reply.choices[0].message.content.trim());
console.log("入力のトークン数:", reply.usage.prompt_tokens);
console.log("作ったトークン数:", reply.usage.completion_tokens);
```

> tokenizer の内訳を直接見たいときは Colab 版 (`tok.tokenize`) を使う

---

## greedy サンプリング

- 毎回選ぶ、確率が最大のトークン
- 温度 0 でランダム性を消すのが一番簡単な方法
- 第2回の `pick_next` を `argmax` に置き換えた形

```javascript
const engine = await getEngine();

async function ask(prompt) {
  const reply = await engine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 24,
  });
  return reply.choices[0].message.content.trim();
}

console.log(await ask("好きな食べ物は"));
console.log(await ask("好きな食べ物は"));
```

---

## greedy の弱点

- 同じ入力に対する同じ出力
- 最上位の語だけを選ぶことによる単調さ
- 分布からのランダムな選択

```text
>>> ask("好きな食べ物は")
何ですか？何ですか？何ですか？...
```

> 低い確率の語を除くための、分布の調整

---

## 温度と top-p

- 温度で割った値への softmax
- 累積確率 p に入る候補への絞り込み
- 低温で堅く、高温でばらける応答

```javascript
const engine = await getEngine();

for (const t of [0.3, 0.8, 1.5]) {
  const reply = await engine.chat.completions.create({
    messages: [{ role: "user", content: "好みの音楽について一言" }],
    temperature: t,
    top_p: 0.9,
    max_tokens: 24,
  });
  console.log(`T=${t}:`, reply.choices[0].message.content.trim());
}
```

> 回数の `c ** (1/T)` と、logits の割り算の対応

---

## 発展：繰り返しペナルティ

- 既出トークンの logits を下げる仕組み
- `presence_penalty` は出現で1回ぶん、`frequency_penalty` は回数ぶん
- 温度や top-p との組み合わせによる単調さの回避

```javascript
const engine = await getEngine();
const reply = await engine.chat.completions.create({
  messages: [{ role: "user", content: "好きな食べ物は" }],
  temperature: 0.8,
  presence_penalty: 0.5,
  max_tokens: 48,
});
console.log(reply.choices[0].message.content.trim());
```

> 発展課題での実装。本編では温度だけで十分

---

## 役割ごとのメッセージ

- system / user / assistant の3つの役割
- 書式への変換 (チャットテンプレート) は WebLLM の内部
- そのあとはいつもの生成ループ

```javascript
const engine = await getEngine();
const messages = [
  { role: "system", content: "あなたは簡潔に答えるアシスタントです。" },
  { role: "user",   content: "日本の首都は？" },
];

const reply = await engine.chat.completions.create({ messages, max_tokens: 32 });
console.log(reply.choices[0].message.content.trim());
```

> 実際に渡っているのは下のような形の文字列

<pre><code class="language-text">&lt;|im_start|&gt;system
あなたは簡潔に答えるアシスタントです。&lt;|im_end|&gt;
&lt;|im_start|&gt;user
日本の首都は？&lt;|im_end|&gt;
&lt;|im_start|&gt;assistant
</code></pre>

---

## 会話と履歴

- やりとり自体を記憶しているわけではないモデル
- 履歴を毎回すべて渡して成立する会話
- `state` はセルをまたいで使える作業領域

```javascript
const engine = await getEngine();
state.messages ??= [
  { role: "system", content: "あなたは簡潔に答えるアシスタントです。" },
];

state.messages.push({ role: "user", content: "日本の首都は？" });

const reply = await engine.chat.completions.create({
  messages: state.messages, max_tokens: 48,
});
const text = reply.choices[0].message.content.trim();
state.messages.push({ role: "assistant", content: text });
console.log(`(${reply.usage.total_tokens} トークン)`, text);
```

> ▶ を押すたびに履歴が伸びていく。「覚えている」のはこの仕組み

---

## 注意点

- 長い会話による速度低下と入力上限の超過
- 0.5B モデルで頻発する、もっともらしい誤り
- ブラウザ版特有の、初回ダウンロードとタブの扱い

| 問題 | 対処 |
|---|---|
| 会話が長い / 入力上限 | 古いやりとりを削る |
| 同じ語の繰り返し | 温度を上げる / penalty を効かせる |
| 事実ではない答え | 事実確認に使わない |
| 1トークンずつ再計算 | 本来は KV キャッシュで使い回す |
| 初回のダウンロードが遅い | Wi-Fi 推奨。2 回目からキャッシュ |
| 別タブに移ると遅くなる | 生成中はタブを開いておく |

> 内部で同じ処理を効率よく行う実装

---

## 要点

- 次の1トークンの確率分布を返す言語モデル
- 予測・選択・連結を繰り返す生成ループ
- 履歴を毎回すべて渡して成立する会話

> torch 版は内部を、WebLLM 版は振る舞いを見るための版

---

## Transformer の処理

- トークンのベクトル化と、注意機構による文脈の混合
- 最後に出力する語彙サイズの logits
- 理論の詳細は機械学習の講義

![Transformerの処理の流れ](../assets/diagrams/transformer-pipeline.svg)

> 入出力だけの扱いで記述できる生成ループ

---

## 課題一覧

- 最初に確認するトークン数
- temperature 0 による一致の確認
- 最後に作る、履歴による3往復の会話

| # | 課題 |
|---|---|
| 1 | `usage` で、入力と出力それぞれのトークン数を表示する |
| 2 | temperature 0 で、同じ入力から同じ出力が返ることを確かめる |
| 3 | 温度 0.3 / 0.8 / 1.5 で出力を比べ、違いを一言でまとめる (top-k) |
| 4 | 履歴を渡して3往復の会話を作る |

> 発展：top-p を変える / presence_penalty・frequency_penalty

---

## 課題の進め方

- 課題は**JupyterLite のノートブック**で進める (Python)。トップページの
  「どうしても Colab を使いたくない人向け」から開く
- このスライドの ▶ セルはデモ用。書き換えの必要はない
- Colab 版とブラウザ版はどちらで提出してもよい

> Colab 版には `score()` がある。ブラウザ版は出力を残して提出
