<!-- .slide: class="title-slide" -->

<p class="kicker">Scripting Languages / 02</p>

# 数えて、選んで、<br>つなげる

### スクリプト言語演習 第2回

---

## 今日作るもの

<p class="lead">テキストを読み込んで、<strong>そのテキストらしい文章を自動生成する</strong>プログラム。</p>

<div class="flow-container">
  <div class="flow-row">
    <div class="flow-box source">文章<span class="flow-label">元になるテキスト</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">刻む<span class="flow-label">トークンに分割</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">数える<span class="flow-label">次に来る語の統計</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box output">生成<span class="flow-label">1語ずつ選んで伸ばす</span></div>
  </div>
</div>

<div class="key-box">
手法の名前は<strong>マルコフ連鎖</strong>。統計を取って、そこから確率的に選ぶだけの古典的な方法。
必要なのは辞書とループ、それだけ。
</div>

---

## 前回からのつながり

| 第1回で作ったもの | 今日の使い道 |
|---|---|
| `split` で文字列を分ける | トークン化の土台 |
| 辞書 | 「単語 → 次に来た語の回数」の表 |
| ディスパッチテーブル `COMMANDS` | 逆ポーランド電卓の中身に流用 |
| 登録デコレータ `@command` | ワード表 `@word` として再登場 |

---

## 刻む

```python
import re

text = "Hello, world! It's a nice day."

text.split()                        # ['Hello,', 'world!', ...] 記号が残る
re.findall(r"[a-z']+", text.lower())
# ['hello', 'world', "it's", 'a', 'nice', 'day']
```

<div class="lexer-container">
  <div class="lexer-row">
    <div class="lexer-input">"3 4 + 2 *"</div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-process"><div class="title">split()</div></div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-output">
      <div class="lexer-token">3</div>
      <div class="lexer-token">4</div>
      <div class="lexer-token">+</div>
      <div class="lexer-token">2</div>
      <div class="lexer-token">*</div>
    </div>
  </div>
</div>

<div class="key-box">
文字列を意味のある単位 (<strong>トークン</strong>) に切り分ける作業が<strong>字句解析</strong>。
テキスト処理も言語処理系も、入口は同じ。
</div>

---

## 数える

```python
from collections import Counter, defaultdict

Counter(words)["the"]       # 3
Counter(words).most_common(2)
```

隣り合うペアを数えれば、「次に何が来たか」の表。

```python
following = defaultdict(Counter)      # 無いキーは自動で空 Counter

for a, b in zip(words, words[1:]):    # zip で隣り合う2語の組
    following[a][b] += 1
```

<div class="key-box">
この3行が今日の主役。
<code>Counter</code> は無いキーを引くと 0 を返すので、初期化を書く手間も不要。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">01</span>

## マルコフ連鎖で生成する

--

### 考え方

<p class="lead">「今の単語」だけを見て「次の単語」を決め、それを繰り返す。</p>

<div class="eval-loop-container">
  <div class="eval-main-flow">
    <div class="eval-box read">今の単語</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="eval-box get">次の語の<br>回数表を引く</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="eval-box eval">回数に応じて<br>1つ選ぶ</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="eval-box read">つなげる</div>
  </div>
  <div class="loop-arrow"></div>
</div>

<div class="highlight-box">
覚えているのは直前の1語だけ。それでも元の文章の「くせ」はかなり再現される。
</div>

--

### 表を作る

```python
def build_table(tokens):
    table = defaultdict(Counter)
    for a, b in zip(tokens, tokens[1:]):
        table[a][b] += 1
    return table

text = "I like cats. I like dogs. I love cats."
table = build_table(text.lower().replace(".", "").split())
```

```text
table["i"]     -> Counter({'like': 2, 'love': 1})
table["like"]  -> Counter({'cats': 1, 'dogs': 1})
```
<!-- .element: class="output" -->

<div class="key-box">
<code>table["i"]</code> が表しているのは
<strong>「i の次は 2/3 の確率で like、1/3 で love」</strong>という確率分布。
</div>

--

### 回数に応じて1つ選ぶ

```python
import random

def pick_next(counter):
    words = list(counter.keys())
    weights = list(counter.values())      # 回数をそのまま重みに
    return random.choices(words, weights=weights)[0]

pick_next(table["i"])    # 'like' が出やすく、'love' がたまに出る
```

<div class="warn-box">
<code>random.choice</code> (単数形) は等確率。重み付きは <code>random.choices</code> (複数形) のほうで、
しかも<strong>返るのはリスト</strong>。末尾の <code>[0]</code> を落とす人が毎年いる。
</div>

--

### ループで文章にする

```python
def generate(table, start, n=30):
    word = start
    result = [word]
    for _ in range(n):
        if word not in table:      # 次が無い語に行き着いたら終わり
            break
        word = pick_next(table[word])
        result.append(word)
    return " ".join(result)
```

<div class="key-box">
<strong>予測 → 選ぶ → つなげる。</strong>
これが文章生成の基本形。表の中身が何であれ、外側のループはこの形。
</div>

--

### 温度: どれくらい冒険するか

重みを `1/T` 乗してから引く。

```python
weights = [c ** (1 / temperature) for c in counter.values()]
```

| 温度 | 重み `(3, 1)` が | ふるまい |
|---|---|---|
| `0.1` | `(59049, 1)` | ほぼ最頻語だけ。安全で単調 |
| `1.0` | `(3, 1)` | 元の統計どおり |
| `5.0` | `(1.25, 1)` | ほぼ等確率。多様だが破綻しやすい |

<div class="key-box">
確率分布を尖らせるか平らにするかのつまみ。
確率から1つ選ぶ仕組みには、たいていこの<strong>温度</strong>が付いてくる。
</div>

--

### この方式の限界

直前2語をキーにすれば質は上がる。ただし。

| 見る語数 | 出力の質 | 問題 |
|---|---|---|
| 1語 (bigram) | 単語のつながりだけそれらしい | すぐ意味が壊れる |
| 2語 (trigram) | かなり自然になる | 元の文章の丸写しが増える |
| 5語 | ほぼ丸写し | 組み合わせが表に無くなる |

<div class="key-box">
<strong>長い文脈を見たい。でも表が持てない。</strong>
語数を1つ増やすたびに、表に必要な組み合わせは語彙数の倍。ここが数え上げ方式の壁。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">02</span>

## スタックとディスパッチ

--

### 逆ポーランド記法

`3 4 +` という並びを左から処理する。最後に入れたものから取り出す (LIFO)。

| 読んだもの | やること | スタック |
|---|---|---|
| `3` | 数なので push | `[3]` |
| `4` | 数なので push | `[3, 4]` |
| `+` | 2つ pop して足し、結果を push | `[7]` |

Python ではリストがそのままスタック。`append` が push、`pop` が pop。
<!-- .element: class="note" -->

<div class="warn-box">
<code>10 3 -</code> は <code>7</code>。先に pop されるのは <code>3</code> のほう。
<code>a - b</code> の順を取り違えると符号が反転する。ここは実際やると必ず1回間違える。
</div>

--

### 第1回のコマンド表を持ってくる

```python
WORDS = {}

def word(name):                      # 第1回の @command と同じ形
    def deco(func):
        WORDS[name] = func
        return func
    return deco

@word("+")
def _(stack):
    b, a = stack.pop(), stack.pop()
    stack.append(a + b)

@word("DUP")
def _(stack):
    stack.append(stack[-1])
```

--

### 評価するのは 6 行

```python
def evaluate(stack, text):
    for token in text.split():       # 字句解析
        if token in WORDS:
            WORDS[token](stack)      # ディスパッチ
        else:
            stack.append(int(token))
```

<div class="flow-container">
  <div class="flow-row">
    <div class="flow-box source">"3 4 + 2 *"</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">split<span class="flow-label">字句解析</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box process">for token<span class="flow-label">ディスパッチループ</span></div>
    <div class="flow-arrow">&#8594;</div>
    <div class="flow-box output">[14]<span class="flow-label">スタック</span></div>
  </div>
</div>

<div class="key-box">
<code>if</code> の連鎖がどこにも無い。ワードを何種類足しても、この6行は不変。
</div>

---

## 演習課題

| # | 課題 | ねらい |
|---|---|---|
| 1 | ファイルを読んでトークン列にする | ファイル入出力、正規表現 |
| 2 | 「次に来た語」の表を作る | defaultdict, Counter, zip |
| 3 | マルコフ連鎖で文章を生成する | 重み付き抽選、生成ループ |
| 4 | ワード表方式で逆ポーランド電卓 | 字句解析 + ディスパッチ |

発展: 温度を付けて 0.2 / 1.0 / 3.0 を比べる / trigram にして bigram と比べる

`exercises/02_text.ipynb`。課題3 の出力は各自まったく違うものが出る。面白い文が出たら見せること。
<!-- .element: class="note" -->

---

## まとめ

- **刻む** → **数える** → **選ぶ** → **つなげる** で文章生成
- **温度** — 分布を尖らせるか平らにするかのつまみ
- **スタック + ワード表** — 逆ポーランド式が動く処理系のできあがり

<div class="key-box">
どちらも中身は<strong>辞書とループ</strong>。
統計を辞書に持つか、関数を辞書に持つか、それだけの違い。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">付録</span>

## 課題で使う道具

--

### ファイルを読む

```python
with open("data.txt", encoding="utf-8") as f:
    text = f.read()          # 全体を1つの文字列として

with open("data.txt", encoding="utf-8") as f:
    for line in f:           # 1行ずつ (大きくても安全)
        line = line.strip()
        if not line or line.startswith("#"):
            continue
```

`with` を使えば、途中で例外が飛んでも必ず閉じる。
日本語を扱うなら `encoding="utf-8"` は必須。省略すると Windows で文字化け。
<!-- .element: class="note" -->

--

### 正規表現

| 記法 | 意味 |
|---|---|
| `.` | 任意の1文字 |
| `\d` `\w` `\s` | 数字 / 英数字とアンダースコア / 空白 |
| `[abc]` `[^abc]` | いずれか1文字 / それ以外1文字 |
| `*` `+` `?` | 0回以上 / 1回以上 / 0か1回 |
| `( )` | グループ。取り出したい部分を囲む |

```python
re.findall(r"[a-z']+", text)     # 全部取り出す
re.sub(r"\d+", "N", text)        # 置き換える
m = re.match(r"(\d{4})-(\d{2})", s)
if m: year, month = m.groups()   # マッチしないと None が返る
```

パターンは `r"..."` で書く。`split` で足りる場面では `split` を優先。
<!-- .element: class="note" -->

--

### 並べ替えとスタック操作

```python
sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
# 回数の多い順、同数なら辞書順
```

| ワード | 動作 | スタックの変化 |
|---|---|---|
| `DUP` | 一番上を複製 | (a → a a) |
| `DROP` | 一番上を捨てる | (a → ) |
| `SWAP` | 上2つを入れ替え | (a b → b a) |
| `OVER` | 2番目を上にコピー | (a b → a b a) |
| `ROT` | 3番目を一番上へ | (a b c → b c a) |
