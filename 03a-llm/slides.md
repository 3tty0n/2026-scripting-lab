<!-- .slide: class="title-slide" -->

<p class="kicker">Scripting Languages / 03-A</p>

# 小さな言語モデルを<br>手元で動かす

### スクリプト言語演習 第3回 (A)

---

## 今日のゴール

<div class="key-box">
手元の Transformer を動かし、<strong>生成ループを自分で書いて</strong>、
簡単な応答をするプログラムを作る。
</div>

- API キーは**不要**。モデルを落としてきて自分の環境で動かす
- 「文章が出てくる」中身が、ループと確率でできているという確認
- 必要なのは Colab だけ。GPU があれば速いが、CPU でも可

---

## 第2回でもう作っている

|  | 第2回: マルコフ連鎖 | 今日: 言語モデル |
|---|---|---|
| 次の語の予測 | `table[word]` を引く | `model(文脈)` を呼ぶ |
| 予測の中身 | 数えた回数の表 | 学習した重み (Transformer) |
| 見ている文脈 | 直前 1〜2 語 | 直前 数千トークン |
| 選び方 | `random.choices` + 温度 | サンプリング + 温度 |
| 生成 | 選んでつなげるループ | 選んでつなげるループ |

<div class="key-box">
今日やるのは<strong>「表を引く」を「関数を呼ぶ」に差し替える</strong>作業。
ループも温度も第2回のまま流用可能。
</div>

---

## 言語モデルがやっていること

<div class="key-box">
「ここまでの文字列」を受け取り、<strong>「次に来る1トークンの確率分布」</strong>を返す関数。
</div>

<div class="flow-container tight">
  <div class="flow-row">
    <div class="flow-box source">むかしむかし</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">言語モデル</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box output">ある: 0.41 &nbsp; 、: 0.22 &nbsp; お: 0.07 &nbsp; ...</div>
  </div>
</div>

<div class="highlight-box">
返ってくるのは文章ではなく、語彙すべて (数万語) に対する確率の一覧。
だから生成はループ。どれだけ長い文章も、1ステップの繰り返し。
</div>

---

## トークンと logits

<div class="lexer-container">
  <div class="lexer-row">
    <div class="lexer-input">"今日はいい天気"</div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-process"><div class="title">トークナイザ</div></div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-output">
      <div class="lexer-token">今日</div>
      <div class="lexer-token">は</div>
      <div class="lexer-token">いい</div>
      <div class="lexer-token">天気</div>
    </div>
  </div>
</div>

単語とも文字とも一致しない。よく出る文字列ほど1トークンにまとまる、統計的に決めた単位。
<!-- .element: class="note" -->

モデルが直接出すのは **logits**。大小に意味のある実数の並びで、確率ではない。
`softmax` を通してはじめて確率。

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
<!-- .element: class="output" -->

`logits` の形は (バッチ, 系列長, 語彙数)。欲しいのは最後の位置だけなので `[0, -1]`。
<!-- .element: class="note" -->

---

<!-- .slide: class="chapter" -->

<span class="num">01</span>

## 生成ループを書く

--

### greedy: 一番確率の高いものを選び続ける

```python
def generate_greedy(prompt, max_new_tokens=40):
    ids = tok(prompt, return_tensors="pt").input_ids

    for _ in range(max_new_tokens):
        with torch.no_grad():
            logits = model(ids).logits[0, -1]

        next_id = torch.argmax(logits)              # 一番大きいものを選ぶ
        if next_id.item() == tok.eos_token_id:      # 終端なら止める
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)   # 末尾に足す

    return tok.decode(ids[0])
```

<div class="key-box">
<strong>これで生成の全体。</strong>
第2回の <code>pick_next(table[word])</code> が <code>argmax(model(ids))</code> に変わっただけ。
</div>

--

### greedy の弱点

```text
>>> generate_greedy("好きな食べ物は")
好きな食べ物は何ですか？好きな食べ物は何ですか？好きな食べ物は...
```
<!-- .element: class="output" -->

<div class="warn-box">
毎回いちばん確率の高い語を選ぶため、同じ入力からは常に同じ出力。
そのうえ<strong>同じ言い回しのループに落ちやすい</strong>。
</div>

<div class="highlight-box">
対策は確率分布から<strong>ランダムに選ぶ</strong>方式。
ただし素直にやると変な語も拾うので、分布を整えてから選ぶのが要点。
</div>

--

### 温度と top-k

```python
def sample_next(logits, temperature=0.8, k=50):
    probs = torch.softmax(logits / temperature, dim=-1)   # 温度
    top = torch.topk(probs, k)                            # 上位 k 個だけ
    idx = torch.multinomial(top.values, 1)                # 重み付きくじ引き
    return top.indices[idx]
```

温度で割ってから softmax。小さい数で割れば差が開き、大きい数で割れば縮む。
上位 k 個に絞れば裾の「ありえない語」は候補外。`k=1` なら greedy と同じ。
<!-- .element: class="note" -->

<div class="key-box">
第2回では回数を <code>c ** (1/T)</code> していた。
logits は確率の対数にあたるため、<strong>割り算が同じ役目</strong>。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">02</span>

## 応答させる

--

### 素のモデルは続きを書くだけ

```text
入力: 日本の首都は
出力: 日本の首都は東京である。人口は約1400万人で...
```
<!-- .element: class="output" -->

**Instruct モデル**は「指示 → 応答」の形で追加学習済み。
決められた書式で入力すれば、応答として続きが返る。

```python
messages = [
    {"role": "system", "content": "あなたは簡潔に答えるアシスタントです。"},
    {"role": "user",   "content": "日本の首都は？"},
]
prompt = tok.apply_chat_template(
    messages, tokenize=False, add_generation_prompt=True)
```

--

### 中身はただの文字列

```text
<|im_start|>system
あなたは簡潔に答えるアシスタントです。<|im_end|>
<|im_start|>user
日本の首都は？<|im_end|>
<|im_start|>assistant
```
<!-- .element: class="output" -->

`<|im_start|>` のような特殊トークンで役割を区切っているだけ。
あとはこの文字列を、さっきの生成ループに食わせるだけ。
<!-- .element: class="note" -->

<div class="key-box">
モデル自体は何も記憶していない。
<strong>過去のやりとりを毎回まるごと渡し直しているだけ</strong>。
「文脈を覚えている」ように見えるのは、この仕掛けのおかげ。
</div>

--

### 気をつけること

| 問題 | 対処 |
|---|---|
| 会話が伸びると遅くなる / 入力上限を超える | 古いやりとりを捨てる |
| 同じ語を繰り返す | 温度を上げる / 既出の語の logits を下げる |
| もっともらしい嘘を書く | 0.5B では**頻繁に起きる**。事実確認に使わない |
| 1トークンずつ全体を再計算していて遅い | 本来は KV キャッシュで使い回す |

<div class="warn-box">
今日書いたループは、あくまで仕組みを見るための実装。
実務で使うのは <code>model.generate(...)</code>。中で同じことを、桁違いに効率よく処理している。
</div>

---

## 演習課題

| # | 課題 |
|---|---|
| 1 | 次のトークンの上位10候補と確率を表示する |
| 2 | `generate_greedy` を完成させ、2回実行して結果が一致することを確かめる |
| 3 | 温度付き top-k を実装し、温度 0.3 / 0.8 / 1.5 で出力を比べる |
| 4 | チャットテンプレートを使って3往復の会話をする |

発展: top-p サンプリング / 繰り返しペナルティ

<div class="highlight-box">
<code>exercises/03a_llm.ipynb</code>。最初のセルでモデルの読み込みを開始しておくこと (数分かかる)。
</div>

---

## まとめ

- 言語モデル = **次の1トークンの確率分布を返す関数**
- 生成 = **予測 → 選ぶ → つなげる** のループ
- greedy / 温度 / top-k の違いは「どう選ぶか」だけ
- 会話は、**履歴を毎回まるごと渡し直す**ことで成り立っている

<div class="key-box">
中身が分かってしまえば、API の裏側で起きていることも同じ。
違うのはモデルの大きさと、実装の速さだけ。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">付録</span>

## Transformer の中身

--

### 箱の中で起きていること

<div class="flow-container tight">
  <div class="flow-row">
    <div class="flow-box source">トークン<br>ID 列</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">埋め込み層<span class="flow-label">ID &#8594; ベクトル</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">自己注意 &#215; N<span class="flow-label">互いを参照して<br>情報を混ぜる</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">出力層<span class="flow-label">語彙数の<br>スコアへ</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box output">logits</div>
  </div>
</div>

理論は機械学習の講義に譲る。今日は<strong>この箱を関数として使う</strong>ことに集中。

--

### top-p (nucleus) サンプリング

個数ではなく、**累積確率が p を超えるまで**を候補にする。

```python
probs = torch.softmax(logits / temperature, dim=-1)
sorted_probs, sorted_idx = torch.sort(probs, descending=True)
cumsum = torch.cumsum(sorted_probs, dim=-1)

mask = cumsum - sorted_probs < p      # 累積が p を超える手前まで残す
next_id = sorted_idx[mask][torch.multinomial(sorted_probs[mask], 1)]
```

自信のある場面では候補が少なく、迷っている場面では多くなる。
固定個数の top-k より状況に追従する方式。`p = 0.9` あたりが定番。
<!-- .element: class="note" -->
