<!-- .slide: class="title-slide" -->

Scripting Languages / 03-A
<!-- .element: class="kicker" -->

# 言語モデルの仕組みと実装

### スクリプト言語演習 第3回 (A)

---

## 今日のゴール

手元で Transformer を動かし、<strong>生成ループを自分で書く</strong>。
最後に、簡単な応答プログラムを作る。
<!-- .element: class="key-box" -->

- APIキーは**不要**。モデルをダウンロードし、自分の環境で動かす
- 文章が出てくる仕組みが、ループと確率でできていると確かめる
- Colabがあれば始められる。GPUなら速いが、CPUでも動く

---

## 第2回でもう作っている

|  | 第2回：マルコフ連鎖 | 今日：言語モデル |
|---|---|---|
| 次の語の予測 | `table[word]` を引く | `model(文脈)` を呼ぶ |
| 予測の中身 | 数えた回数の表 | 学習した重み (Transformer) |
| 見ている文脈 | 直前 1〜2 語 | 直前 数千トークン |
| 選び方 | `random.choices` + 温度 | サンプリング + 温度 |
| 生成 | 選んでつなげるループ | 選んでつなげるループ |

今日は<strong>「表を引く」を「関数を呼ぶ」に置き換える</strong>。
ループも温度も、第2回のものをそのまま使える。
<!-- .element: class="key-box" -->

---

## 言語モデルがやっていること

「ここまでの文字列」を受け取り、<strong>「次に来る1トークンの確率分布」</strong>を返す。
<!-- .element: class="key-box" -->

![言語モデルの入出力](../assets/diagrams/flow-llm.svg)

返ってくるのは文章ではなく、語彙（数万語）それぞれの確率。
だから文章の生成はループになる。長い文章も、1ステップを繰り返して作る。
<!-- .element: class="highlight-box" -->

---

## トークンと logits

![トークナイザの入出力](../assets/diagrams/lexer-tokenizer.svg)

トークンは、単語とも1文字とも限らない。よく現れる文字列をまとめた、統計的な単位。
<!-- .element: class="note" -->

モデルが直接出すのは **logits**。大小だけが意味を持つ実数の並びで、
まだ確率ではない。`softmax` を通すと確率になる。

```python
probs = torch.softmax(logits, dim=-1)   # すべて 0 以上、合計 1
```

---

## 1ステップだけ動かす

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")

ids = tok("むかしむかし、あるところに", return_tensors="pt").input_ids
with torch.no_grad():
    logits = model(ids).logits[0, -1]     # 最後の位置 = 次の予測

probs = torch.softmax(logits, dim=-1)
top = torch.topk(probs, 5)
```

```text
お 0.312    一 0.145    おじいさん 0.098    男 0.041
```

`logits` の形は (バッチ, 系列長, 語彙数)。次の語の予測に使うのは最後の位置なので `&#91;0, -1&#93;` を取る。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

01
<!-- .element: class="num" -->

## 生成ループを書く

---

### greedy：最も確率の高いトークンを選び続ける

```python
def generate_greedy(prompt, max_new_tokens=40):
    ids = tok(prompt, return_tensors="pt").input_ids

    for _ in range(max_new_tokens):
        with torch.no_grad():
            logits = model(ids).logits[0, -1]

        next_id = torch.argmax(logits)              # 最大のものを選ぶ
        if next_id.item() == tok.eos_token_id:      # 終端なら止める
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)   # 末尾に足す

    return tok.decode(ids[0])
```

<strong>生成の基本形はこれだけ。</strong>
第2回の <code>pick_next(table&#91;word&#93;)</code> が
<code>argmax(model(ids))</code> に変わっただけで、流れは同じ。
<!-- .element: class="key-box" -->

---

### greedy の弱点

```text
>>> generate_greedy("好きな食べ物は")
好きな食べ物は何ですか？好きな食べ物は何ですか？好きな食べ物は...
```

毎回いちばん確率の高い語を選ぶため、同じ入力ならいつも同じ出力になる。
しかも<strong>同じ言い回しのループに落ちやすい</strong>。
<!-- .element: class="warn-box" -->

そこで、確率分布から<strong>ランダムに選ぶ</strong>。
ただし、そのままでは確率の低い語も拾うので、分布を整えてから選ぶ。
<!-- .element: class="highlight-box" -->

---

### 温度と top-k

```python
def sample_next(logits, temperature=0.8, k=50):
    probs = torch.softmax(logits / temperature, dim=-1)   # 温度
    top = torch.topk(probs, k)                            # 上位 k 個だけ
    idx = torch.multinomial(top.values, 1)                # 重み付き抽選
    return top.indices[idx]
```

温度で割ってから softmax。小さい数で割れば差が開き、大きい数で割れば縮む。上位 k 個に絞れば、確率の低い語を候補から外せる。`k=1` なら greedy と同じ。
<!-- .element: class="note" -->

第2回では回数を <code>c ** (1/T)</code> していた。
logits は確率の対数なので、ここでは<strong>割り算が同じ役割</strong>を果たす。
<!-- .element: class="key-box" -->

---

### 発展：top-p (nucleus) サンプリング

個数ではなく、**累積確率が p に達するまで**の語を候補にする。

```python
probs = torch.softmax(logits / temperature, dim=-1)
sorted_probs, sorted_idx = torch.sort(probs, descending=True)
cumsum = torch.cumsum(sorted_probs, dim=-1)

mask = cumsum - sorted_probs < p      # 累積が p に達するまで残す
next_id = sorted_idx[mask][torch.multinomial(sorted_probs[mask], 1)]
```

確率が偏っているときは候補が少なく、分散しているときは多くなる。
固定数の top-k より、分布の状態に合わせて候補数が変わる。`p = 0.9` あたりが定番。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

02
<!-- .element: class="num" -->

## 会話形式で応答させる

---

### 素のモデルは続きを書くだけ

```text
入力: 日本の首都は
出力: 日本の首都は東京である。人口は約1400万人で...
```

**Instructモデル**は「指示 → 応答」の形で追加学習されている。
決められた書式で入力すると、応答の続きを生成する。

```python
messages = [
    {"role": "system", "content": "あなたは簡潔に答えるアシスタントです。"},
    {"role": "user",   "content": "日本の首都は？"},
]
prompt = tok.apply_chat_template(
    messages, tokenize=False, add_generation_prompt=True)
```

---

### 中身はただの文字列

```text
<|im_start|>system
あなたは簡潔に答えるアシスタントです。<|im_end|>
<|im_start|>user
日本の首都は？<|im_end|>
<|im_start|>assistant
```

`<|im_start|>` のような特殊トークンで役割を区切っている。あとは、この文字列を先ほどの生成ループに渡す。
<!-- .element: class="note" -->

モデルが会話を記憶しているわけではない。
<strong>過去のやりとりを毎回すべて入力に含めているだけ</strong>。
「文脈を覚えている」ように見えるのは、そのため。
<!-- .element: class="key-box" -->

---

### 気をつけること

| 問題 | 対処 |
|---|---|
| 会話が長くなると遅い / 入力上限を超える | 古いやりとりを削る |
| 同じ語を繰り返す | 温度を上げる / 既出の語の logits を下げる |
| もっともらしい嘘を書く | 0.5B では**頻繁に起きる**。事実確認に使わない |
| 1トークンずつ全体を再計算していて遅い | 本来は KV キャッシュで使い回す |

今日書くループは、仕組みを確かめるための簡易実装。
実務では <code>model.generate(...)</code> を使う。内部で同じ処理を、
はるかに効率よく実行している。
<!-- .element: class="warn-box" -->

---

## まとめ

- 言語モデル = **次の1トークンの確率分布を返す関数**
- 生成 = **予測 → 選ぶ → つなげる** のループ
- greedy / 温度 / top-k の違いは「どう選ぶか」だけ
- 会話は、**履歴を毎回すべて渡す**ことで成り立っている

仕組みが分かれば、API の裏側で起きていることも同じ。
違うのはモデルの大きさと、実装の速さだけ。
<!-- .element: class="key-box" -->

---
<!-- .slide: class="chapter" -->

付録
<!-- .element: class="num" -->

## Transformer の中身

---

### 箱の中で起きていること

![Transformerの処理の流れ](../assets/diagrams/transformer-pipeline.svg)

理論の説明は機械学習の講義に譲り、今日は<strong>この箱を関数として使う</strong>ことに集中する。

---
<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 生成ループを実装する

---

## 取り組む課題

モデルを読み込み、次のトークンを選ぶ処理を少しずつ実装する。

| # | 課題 |
|---|---|
| 1 | 次のトークンの上位10候補と確率を表示する |
| 2 | `generate_greedy` を完成させ、同じ入力で結果が一致することを確かめる |
| 3 | 温度付き top-k を実装し、温度 0.3 / 0.8 / 1.5 で比べる |
| 4 | チャットテンプレートで3往復の会話を生成する |

発展: top-p サンプリング / 繰り返しペナルティ

---

## 進め方

- ページの「Colab で開く」から課題を開き、「ドライブにコピーを保存」しておく
- 最初の2セルを実行し、モデルの読み込みを始める
- 各課題の `TODO` を埋め、確認セルで結果を確かめる
- モデルの読み込みには数分かかる。CPUでは生成に時間がかかる

Colabでは、先に「ランタイムのタイプを変更」からT4 GPUを選ぶとよい。
確認セルは変更せず、最後に `score()` を実行してから提出する。
<!-- .element: class="highlight-box" -->
