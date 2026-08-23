<!-- .slide: class="title-slide" -->

Scripting Languages / 02
<!-- .element: class="kicker" -->

# テキスト処理と文章生成

### スクリプト言語演習 第2回

---

## 今日のゴール

### 文章らしい新しい一文の生成

- 手元の文章を読み、そのくせを集計
- 次の語を確率で選び、文をつなげる
- **状態・表・ループ**があれば生成器は書ける

![文章をまねる生成器の流れ](../assets/diagrams/flow-text-generation.svg)

マルコフ連鎖は、この考え方を使う最初の例
<!-- .element: class="note" -->

---

## 第1回の道具をそのまま使える

### 文字列・辞書・デコレータが今日の部品

- `split` は、単語に分ける出発点
- 辞書に「次の語の回数」を記録
- 登録デコレータで、操作を後から追加

| 第1回で作ったもの | 今回の使い道 |
|---|---|
| `split` で文字列を分ける | 単語に分ける出発点 |
| 辞書 | 「単語 → 次の語の回数」を記録 |
| ディスパッチテーブル | 「記号 → 実行する操作」を登録 |
| 登録デコレータ | 操作をあとから追加 |

---

## 文字列を単語に分ける

### 意味のある単位に切ってから扱う

- 空白で切るだけでは、記号が単語に残留
- 正規表現で、必要な文字だけを取り出す
- この作業を**字句解析**と呼ぶ

```python
import re
text = "Hello, world! It's a nice day."

text.split()                        # 記号が残る
re.findall(r"[a-z']+", text.lower())
# ['hello', 'world', "it's", 'a', 'nice', 'day']
```

文章生成でも電卓でも、まずここから
<!-- .element: class="note" -->

---

## 隣り合う単語を数える

### 次に来る語の候補

- 1語の出現回数だけでは、続きは不明
- 隣り合う2語を数えると、「この語の次」が見える
- `Counter` は、初めて出る語の回数も 0 から集計

```python
from collections import Counter, defaultdict

following = defaultdict(Counter)

for a, b in zip(words, words[1:]):
    following[a][b] += 1
```

この3行で「単語 → 次の語の回数」の表
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

設計図
<!-- .element: class="num" -->

## 状態を表とループで更新する

---

## 文章生成も電卓も同じ形

### 次の状態は表から決定

- 機械はいまの**状態**を保持
- **表**を引いて、次にすることを選択
- **ループ**で状態を更新

| 機械 | 状態 | 表に入れるもの | ループで行うこと |
|---|---|---|---|
| 文章生成 | 今の単語 | 次に来た語と回数 | 次の語を選ぶ |
| 電卓 | 数のスタック | 記号と操作の関数 | 1トークンを実行する |

同じ形を、まず文章生成で使い、次に電卓でも利用
<!-- .element: class="note" -->

---

## 状態を1語にすると文章が続く

### 直前の1語だけを見て次を決定

- 覚えるのは今の単語だけ
- 次の語を選んだら、それが新しい状態
- 1語でも、元の文章らしいくせは残留

![今の単語を更新する生成ループ](../assets/diagrams/eval-markov.svg)

長い文脈はまだ使わない。まずこの1語の機械を完成
<!-- .element: class="note" -->

---

## 表は次の語の回数を持つ

### 回数はそのまま確率

- 隣り合う2語を順に数え、辞書に加算
- `table["i"]` は「i の次に何が来たか」
- この例では like が 2/3、love が 1/3

```python
def build_table(tokens):
    table = defaultdict(Counter)
    for a, b in zip(tokens, tokens[1:]):
        table[a][b] += 1
    return table

text = "I like cats. I like dogs. I love cats."
table = build_table(text.lower().replace(".", "").split())
# table["i"]    -> Counter({'like': 2, 'love': 1})
# table["like"] -> Counter({'cats': 1, 'dogs': 1})
```

---

## 回数を重みにして次の語を選ぶ

### よく出た語ほど選ばれやすい

- `random.choice` は等確率なので、ここでは不使用
- `random.choices` は重み付きで選択
- 返り値はリストなので、末尾の `[0]` が必要

```python
import random

def pick_next(counter):
    words = list(counter.keys())
    weights = list(counter.values())
    return random.choices(words, weights=weights)[0]

pick_next(table["i"])    # 'like' が出やすく、'love' がたまに出る
```

重みを回数にすると、元の文章の頻度がそのまま残る
<!-- .element: class="note" -->

---

## 状態を更新すると文章が続く

### 予測、選択、接続

- 今の語が**状態**、`table` が**表**
- `for` が状態を更新する**ループ**
- 次の語が表に無ければ、そこで終了

```python
def generate(table, start, n=30):
    word = start
    result = [word]
    for _ in range(n):
        if word not in table:
            break
        word = pick_next(table[word])
        result.append(word)
    return " ".join(result)
```

---

## 温度で意外さを調整する

### 偏りの強化と緩和

- 重みを `1/T` 乗してから次の語を選択
- 温度が小さいと最頻語に偏り、大きいとばらつく
- `T = 1` のとき、元の統計どおり

```python
weights = [c ** (1 / temperature) for c in counter.values()]
```

| 温度 | 重み `(3, 1)` | 出力の傾向 |
|---|---|---|
| `0.1` | `(59049, 1)` | 最頻語に偏る。安定するが単調 |
| `1.0` | `(3, 1)` | 元の統計どおり |
| `5.0` | `(1.25, 1)` | ほぼ等確率。多様だが崩れやすい |

温度は確率のつまみ。モデルの作り直しは不要
<!-- .element: class="note" -->

---

## 文脈を増やすほど表は大きくなる

### 数え上げだけで文章を作る限界

- 直前2語を見ると、出力は自然に
- 必要な組み合わせは、見る語数とともに急増
- 長すぎると、表に無い列ばかり

| 見る語数 | 出力の傾向 | 問題 |
|---|---|---|
| 1語 (bigram) | 単語のつながりは自然 | 文の意味は崩れやすい |
| 2語 (trigram) | かなり自然 | 元の文章を写しやすい |
| 5語 | ほぼ丸写し | 組み合わせが表に無くなる |

第3回の言語モデルは、この表を学習した関数に置換
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

もう一つの状態
<!-- .element: class="num" -->

## 複数の値はスタックに覚えさせる

---

## 逆ポーランド記法では左から読む

### 最後に入れた値から使用

- 括弧も優先順位も不要
- 数なら push、演算子なら pop して計算
- Python のリストが、そのままスタック

| 読んだもの | やること | スタック |
|---|---|---|
| `3` | 数なので push | `[3]` |
| `4` | 数なので push | `[3, 4]` |
| `+` | 2つ pop して足し、結果を push | `[7]` |

`10 3 -` の結果は `7`。先に pop されるのは `3`
<!-- .element: class="note" -->

---

## 表に関数を入れると操作を足せる

### 記号からスタックを更新する関数を参照

- 「単語 → 次の候補」だった表を「記号 → 関数」に置換
- 第1回の登録デコレータを、そのまま `@word` として利用
- ワードを足しても、評価の骨格は不変

```python
WORDS = {}

def word(name):
    def deco(func):
        WORDS[name] = func
        return func
    return deco

@word("+")
def _(stack):
    b, a = stack.pop(), stack.pop()
    stack.append(a + b)
```

引き算と割り算では、取り出す順序を逆にしない
<!-- .element: class="note" -->

---

## 評価ループは6行のまま増やせる

### 表から関数を選び、スタックを更新

- トークンに分け、表にあれば関数を呼ぶ
- 無ければ数として積む
- 操作を増やしても、このループは不変

```python
def evaluate(stack, text):
    for token in text.split():
        if token in WORDS:
            WORDS[token](stack)
        else:
            stack.append(int(token))
```

![スタックを更新する処理の流れ](../assets/diagrams/flow-rpn-loop.svg)

---

## 同じ骨格で2つの機械が動く

### 表の中身を替えると別の機械

- 状態、表、ループの3つがあれば十分
- 文章生成は語を選び、電卓は関数を実行
- **辞書とループ**が、両方の骨格

| | 文章を作る機械 | 計算する機械 |
|---|---|---|
| 状態 | 今の単語 | 数のスタック |
| 表 | 次の語の回数 | 記号と操作 |
| 更新 | 確率に従って選ぶ | 関数を実行する |

---
<!-- .slide: class="chapter" -->

付録
<!-- .element: class="num" -->

## 課題で使う道具

---

## ファイルは `with` で読む

### 途中で失敗しても閉じられる

- `read()` はファイル全体を1つの文字列に
- 大きいファイルは、行ごとに処理
- 日本語は `encoding="utf-8"` を指定

```python
with open("data.txt", encoding="utf-8") as f:
    text = f.read()

with open("data.txt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
```

省略すると、環境によって文字化け
<!-- .element: class="note" -->

---

## 正規表現で必要な部分を取り出す

### `split` で足りるなら、まず `split`

- パターンは `r"..."` で記述
- `findall` は全部取り出し、`sub` は置換
- マッチしないと `match` は `None`

| 記法 | 意味 |
|---|---|
| `.` | 任意の1文字 |
| `\d` `\w` `\s` | 数字 / 英数字と `_` / 空白 |
| `[abc]` `[^abc]` | いずれか / それ以外 |
| `*` `+` `?` | 0回以上 / 1回以上 / 0か1回 |
| `( )` | グループ。取り出したい部分 |

```python
re.findall(r"[a-z']+", text)
re.sub(r"\d+", "N", text)
m = re.match(r"(\d{4})-(\d{2})", s)
if m:
    year, month = m.groups()
```

---

## 並べ替えとスタック操作

### 課題でそのまま使う語彙

- 回数が多い順に並べ、同じ回数なら辞書順
- `DUP` や `SWAP` は、スタックの上を操作
- 電卓の課題では、これらのワードを登録

```python
sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
```

| ワード | 動作 | スタックの変化 |
|---|---|---|
| `DUP` | 一番上を複製 | (a → a a) |
| `DROP` | 一番上を捨てる | (a → ) |
| `SWAP` | 上2つを入れ替え | (a b → b a) |
| `OVER` | 2番目を上にコピー | (a b → a b a) |
| `ROT` | 3番目を一番上へ | (a b c → b c a) |

---
<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 小さな機械を段階的に作る

---

## 前の課題の結果を次で使う

### 1問ずつ動かして確かめれば最後まで到達

- 課題1〜3で、語を状態にする機械が完成
- 課題4では、同じ骨格のまま状態をスタックに置換
- 発展は、温度や2語文脈で出力を比較

| # | 課題 | ねらい |
|---|---|---|
| 1 | 文章をトークンに分ける | ファイル入出力、正規表現 |
| 2 | 「次に来る語」の表を作る | `defaultdict`、`Counter`、`zip` |
| 3 | 表を使って新しい一文を作る | 重み付き抽選、生成ループ |
| 4 | 表の値を操作に替え、電卓を動かす | スタック、ディスパッチ |

---

## 進め方

### 確認セルで確かめながら進行

- 「Colab で開く」から課題を開き、「ドライブにコピーを保存」
- 準備セルを実行し、各課題の `TODO` を埋める
- 確認セルは消さない
  - 教員は別のテストケースで採点するので消しても害はない

面白い出力や自作ワードがあれば共有可
<!-- .element: class="note" -->
