<!-- .slide: class="title-slide" -->

<p class="kicker">Scripting Languages / 01</p>

# 関数が値であること

### スクリプト言語演習 第1回

---

## 今日やること

<p class="lead">Python では<strong>関数も、ただの値</strong>。</p>

```python
def square(x):
    return x * x

f = square          # 変数に入る
f(5)                # 25

square.__name__     # 'square'   名前も取り出せる
```

<div class="key-box">
関数は実行時に作られるただのオブジェクト。
変数に入る。リストに入る。<strong>辞書に入る</strong>。引数にも返り値にもなる。
ここから何ができるか、今日は3つ。
</div>

---

## 前提だけ確認

```python
n, name, flag = 42, "Alice", True   # 型宣言は不要
x = 10
x = "文字列"        # 別の型を入れ直せる。型を持つのは値のほう

xs = [3, 1, 4]      # リスト: 書き換え可能
xs.append(9); xs.pop()
d = {"a": 1}        # 辞書: キーから値を引く
d.get("z", 0)       # 無いキーでも落ちない

[x**2 for x in range(5) if x % 2 == 0]   # 内包表記
```

<div class="warn-box">
ブロックは <code>{ }</code> ではなく<strong>字下げ</strong>。スペース4個で統一。
</div>

細かい文法は末尾の付録。詰まったらそちらを参照。
<!-- .element: class="note" -->

---

<!-- .slide: class="chapter" -->

<span class="num">01</span>

## ディスパッチテーブル

--

### `if` の連鎖を辞書に置き換える

<div class="two-column">
  <div>
    <h4>if を並べる</h4>

```python
def calc(op, a, b):
    if op == "add":
        return a + b
    elif op == "sub":
        return a - b
    ...       # 演算子の数だけ伸びる
```

  </div>
  <div>
    <h4>辞書を引く</h4>

```python
import operator

OPS = {
    "add": operator.add,
    "sub": operator.sub,
    "mul": operator.mul,
}

def calc(op, a, b):
    return OPS[op](a, b)
```

  </div>
</div>

<div class="key-box">
演算子が何種類に増えても <code>calc</code> は1行のまま。しかも
<strong>プログラムが動いている最中でも</strong> <code>OPS</code> に追加可能。
</div>

--

### 動いている最中に機能が増える

```python
OPS["max"] = max        # ここで語彙がひとつ増える
calc("max", 3, 9)       # 9
```

<div class="highlight-box">
コンパイル型の言語なら、分岐を増やすのはビルドし直しの作業。
Python では<strong>ただの辞書への代入</strong>。
</div>

この性質が、今日の残り2つの土台。
<!-- .element: class="note" -->

---

<!-- .slide: class="chapter" -->

<span class="num">02</span>

## デコレータ

--

### まず、関数を返す関数

```python
def multiplier(n):
    def inner(x):        # 関数の中で関数を定義し
        return x * n     # 外側の n を覚えたまま
    return inner         # 返す

double = multiplier(2)
double(10)   # 20
```

<div class="key-box">
<code>inner</code> は <code>n</code> を抱えたまま外へ出ていく。これが<strong>クロージャ</strong>。
</div>

--

### `@` はただの糖衣構文

```python
def logged(func):
    def wrapper(*args):
        print(f"{func.__name__}{args}")
        return func(*args)
    return wrapper
```

<div class="two-column">
  <div>
    <h4>手で書き換える</h4>

```python
def add(a, b):
    return a + b

add = logged(add)
```

  </div>
  <div>
    <h4><code>@</code> を使う</h4>

```python
@logged
def add(a, b):
    return a + b
```

  </div>
</div>

<div class="key-box">
この2つは<strong>まったく同じ意味</strong>。
<code>@deco</code> を見たら「定義の直後に <code>f = deco(f)</code>」と読み替え。
</div>

--

### メモ化してみる

```python
def memo(func):
    cache = {}                     # クロージャが覚えている辞書
    def wrapper(*args):
        if args not in cache:      # タプルは辞書のキーになる
            cache[args] = func(*args)
        return cache[args]
    return wrapper

@memo
def tarai(x, y, z):                # 竹内関数
    if x <= y:
        return y
    return tarai(tarai(x-1, y, z),
                 tarai(y-1, z, x),
                 tarai(z-1, x, y))
```

--

### 1行足しただけ

| `tarai(12, 6, 0)` | 関数の呼び出し回数 | 時間 |
|---|---|---|
| `@memo` なし | 12,604,861 回 | 約 1 秒 |
| `@memo` あり | **225 回** | 一瞬 |

<div class="key-box">
<strong>tarai の中身は1文字も変えていない。</strong>
上に1行足しただけで、仕事量が5万分の1。
</div>

同じ引数の組で何度も呼ばれていたのが原因。1度出した答えを覚えておけば済む話。
<!-- .element: class="note" -->

---

<!-- .slide: class="chapter" -->

<span class="num">03</span>

## 表を自動で作る

--

### 定義した瞬間に辞書へ登録する

```python
COMMANDS = {}

def command(name):
    def deco(func):
        COMMANDS[name] = func     # 登録して
        return func               # 関数はそのまま返す
    return deco

@command("shout")
def shout(text):
    return text.upper() + "!!"

@command("rev")
def rev(text):
    return text[::-1]
```

定義を書いただけで `COMMANDS` が埋まる。一覧を手で書き写す手間が不要。
<!-- .element: class="note" -->

--

### これで「文字列を実行」できる

```python
def run(line):
    name, *args = line.split()      # 先頭が命令、残りが引数
    if name not in COMMANDS:
        raise ValueError(f"知らない命令: {name}")
    return COMMANDS[name](*args)

run("shout hello")    # 'HELLO!!'
run("rev abc")        # 'cba'
```

<div class="lexer-container">
  <div class="lexer-row">
    <div class="lexer-input">"shout hello"</div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-process"><div class="title">split</div><div class="sub">字句解析</div></div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-process"><div class="title">COMMANDS[name]</div><div class="sub">ディスパッチ</div></div>
    <div class="big-arrow">&#8594;</div>
    <div class="lexer-token">HELLO!!</div>
  </div>
</div>

<div class="key-box">
文字列を刻んで、辞書を引いて、呼ぶ。これで<strong>処理系の骨格</strong>。
</div>

---

## おまけ: どこまで動的なのか

```python
class Echo:
    def __getattr__(self, name):          # 無いメソッドが呼ばれたとき
        def method(*args):
            print(f"{name} が {args} で呼ばれました")
        return method                     # その場で関数を作って返す

e = Echo()
e.jump(3)
e.どんな名前でも("いける")
```

```text
jump が (3,) で呼ばれました
どんな名前でも が ('いける',) で呼ばれました
```
<!-- .element: class="output" -->

<div class="warn-box">
<code>Echo</code> はメソッドを1つも定義していない。呼ばれてから作っている。
強力な反面、読む側は定義を探しても何も見つからない代物。
</div>

---

## 演習課題

| # | 課題 | ねらい |
|---|---|---|
| 1 | 竹内関数を実装し、呼び出し回数を数える | 再帰、爆発する計算量 |
| 2 | ディスパッチテーブルで電卓 | 辞書に関数を入れる |
| 3 | `@memo` を書き、課題1 に貼る | デコレータ、クロージャ |
| 4 | `@command` と `run()` でコマンド表 | 字句解析 + ディスパッチ |

発展: `@trace` で再帰の木を表示 / `__doc__` から `help` を自動生成

`exercises/01_basics.ipynb`。各課題の下の<strong>確認セル</strong>が `OK` なら正解。
<!-- .element: class="note" -->

---

## まとめ

- **関数は値** — 変数にも辞書にも入る
- **ディスパッチテーブル** — `if` の連鎖が辞書ひとつに畳まれる
- **デコレータ** — 中身を変えずに機能を足す道具。`@deco` は `f = deco(f)`
- **登録デコレータ** — 定義と同時に表ができあがる

<div class="key-box">
共通するのは<strong>プログラム自身を、動いている最中に組み立て直せる</strong>という一点。
これが動的言語の面白いところ。
</div>

---

<!-- .slide: class="chapter" -->

<span class="num">付録</span>

## 文法の早見表

--

### 型・文字列・演算

```python
7 / 2       # 3.5   常に float
7 // 2      # 3     切り捨て除算
7 % 2       # 1     剰余
2 ** 200    # 桁あふれしない。代わりに遅い

s = "スクリプト"
s[0], s[-1], s[0:3], s[::-1]    # 添字・スライス・逆順
"ab" * 3, "a" + "b", "ス" in s
f"{name:>10} | {score:6.2f}"    # 幅と桁数
f"{score = }"                   # 式ごと表示 (printデバッグ用)
```

文字列は変更不可。`s[0] = "X"` はエラー。
<!-- .element: class="note" -->

--

### 制御構造

```python
if 0 < x < 100:        # 連鎖して書ける
    ...
if not items:          # 空の list/str/dict・0・None は False 扱い
    ...

for i, name in enumerate(names):        # 添字も欲しいとき
for a, b in zip(names, scores):         # 2つ並行に
for i in range(2, 10, 3):               # 開始, 終了, 刻み

try:
    n = int(s)
except ValueError:    # 予期する例外だけを、失敗する1行で囲む
    n = 0
```

`for i in range(len(xs))` と書きたくなったら、`enumerate` か `zip` で十分。
<!-- .element: class="note" -->

--

### 落とし穴

```python
xs = xs.sort()        # None が入る。sort() は書き換えて None を返す
xs = sorted(xs)       # こちらが新しいリストを返す

def add(xs, item):
    xs.append(item)   # 呼び出し元のリストが書き換わる
    return xs

def bad(item, xs=[]): # デフォルト値は定義時に1回だけ作られ、使い回される
    xs.append(item)   # bad(1) -> [1],  bad(2) -> [1, 2]
    return xs
```

リストや辞書は参照渡し。書き換える関数か、新しく作る関数か。決めたら混ぜないこと。
<!-- .element: class="note" -->
