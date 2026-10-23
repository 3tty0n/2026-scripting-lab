Scripting Languages / Transformer / 08-A (ブラウザ版)

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

- 課題の中身は同じ。動かす場所だけが違う
- torch 版は内部 (logits) を観察、この版は振る舞いを制御
- 初回だけモデルをダウンロードし、以後はブラウザがキャッシュ

| | Colab 版 | この版 (ブラウザ) |
|---|---|---|
| 言語 | Python | Python |
| 場所 | Colab の GPU | 自分のブラウザ (WebGPU) |
| 準備 | `pip install` | ページを開くだけ |
| 内部の logits | 直接観察できる | API の外側で隠れている |

> どちらか好きなほうで課題を進めてよい

---

## セットアップ

- モデルはノートブックのセットアップで読み込む
- 2 回目以降はキャッシュで即起動
- 生成中はタブを開いたままにする

```python
# ノートブックのセットアップで engine とヘルパー (ask / chat など) が使える
# このスライドのセルは、ノートブックでの実行例
```

---

## 第7回との共通点

- 次の語の予測と、選んでつなげるループ
- 回数の表を学習済みの関数へ置き換えた点
- 第7回と同じ温度の利用

| | 第7回：マルコフ連鎖 | 今日：言語モデル |
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

```python
import math

def softmax(xs):
    m = max(xs)
    es = [math.exp(x - m) for x in xs]
    s = sum(es)
    return [e / s for e in es]

probs = softmax([0.3, -1.2, 2.1, 0.0, 0.7])  # ダミーの logits
print([round(p, 3) for p in probs])
print("合計:", round(sum(probs), 3))  # 1 になる
```

![トークナイザの入出力](../assets/diagrams/lexer-tokenizer.svg)

---

## 1ステップの実行

- 文字列からトークン列への変換は WebLLM の内部
- `chat_reply` の返り値から、テキストとトークン数を取り出す
- ストリームの1かたまりが、およそ1トークン

```python
reply = chat_reply(
    [{"role": "user", "content": "むかしむかし、あるところに"}],
    max_tokens=16)

print("続き:", reply_text(reply))
print("入力のトークン数:", prompt_tokens(reply))
print("作ったトークン数:", completion_tokens(reply))
```

> tokenizer の内訳を直接見たいときは Colab 版 (`tok.tokenize`) を使う

---

## greedy サンプリング

- 毎回選ぶ、確率が最大のトークン
- 温度 0 でランダム性を消すのが一番簡単な方法
- 第7回の `pick_next` を `argmax` に置き換えた形

```python
print(ask("好きな食べ物は", temperature=0))
print(ask("好きな食べ物は", temperature=0))  # 同じ文字列になる
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

## 温度と top-k / top-p

- 温度で割った値への softmax
- top-k で候補を絞り、top-p で累積確率に入る候補を残す
- 低温で堅く、高温でばらける応答

```python
for t in [0.3, 0.8, 1.5]:
    print(f"T={t}:", ask("好みの音楽について一言",
                        temperature=t, top_p=0.9))
```

> 回数の `c ** (1/T)` と、logits の割り算の対応

---

## 発展：繰り返しの検出

- 同じフレーズを繰り返すと単調になる
- テキスト中の繰り返しを検出する純関数
- さらに `presence_penalty` で生成側にも手を入れる

```python
def has_repeat(text, n=3):
    words = text.split()
    seen = set()
    for i in range(len(words) - n + 1):
        chunk = tuple(words[i:i + n])
        if chunk in seen:
            return True
        seen.add(chunk)
    return False

print(has_repeat("I like cats. I like cats. Yes", 3))  # True
print(has_repeat("the quick brown fox", 3))             # False
```

> 発展課題での実装。本編では温度だけで十分

---

## 役割ごとのメッセージ

- system / user / assistant の3つの役割
- 書式への変換 (チャットテンプレート) は WebLLM の内部
- そのあとはいつもの生成ループ

```python
messages = [
    {"role": "system", "content": "あなたは簡潔に答えるアシスタントです。"},
    {"role": "user",   "content": "日本の首都は？"},
]

print(chat(messages, max_tokens=32))
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
- `history` は呼び出し側 (アプリ) が持つ

```python
history = [
    {"role": "system", "content": "あなたは簡潔に答えるアシスタントです。"},
]
history.append({"role": "user", "content": "日本の首都は？"})

reply = chat_reply(history, max_tokens=48)
text = reply_text(reply)
history.append({"role": "assistant", "content": text})
print(f"({total_tokens(reply)} トークン)", text)
```

> ▶ を押すたびに会話が1往復できる。履歴を全部渡すのがポイント

---

## 注意点

- 長い会話による速度低下と入力上限の超過
- 0.8B モデルで頻発する、もっともらしい誤り
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

> torch 版は内部を、ブラウザ版は振る舞いを見るための版

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
- 最後に作る、履歴を持つ簡易チャットアプリ

| # | 課題 |
|---|---|
| 1 | `usage` で、入力と出力それぞれのトークン数を表示する |
| 2 | temperature 0 で、同じ入力から同じ出力が返ることを確かめる |
| 3 | 温度 0.3 / 0.8 / 1.5 で出力を比べ、違いを一言でまとめる (top-k / top-p) |
| 4 | 履歴を保持する簡易チャットアプリ (`make_chat`) を作る |

> 発展：繰り返し検出 / コンテキスト圧縮 / ストリーミング / エフォート。
> ブラウザ版はノートブックの `score()` で自己確認できる

---

## 課題の進め方

- 課題は**JupyterLite のノートブック**で進める (Python)。トップページの
  「どうしても Colab を使いたくない人向け」から開く
- このスライドの ▶ セルはデモ用。書き換えの必要はない
- Colab 版とブラウザ版はどちらで提出してもよい

> どちらの版も `score()` で自己確認できる (ブラウザ版は発展課題を採点)