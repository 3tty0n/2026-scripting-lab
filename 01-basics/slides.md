<!-- .slide: class="title-slide" -->

Scripting Languages / 01
<!-- .element: class="kicker" -->

# Python の関数とデコレータ

### スクリプト言語演習 第1回

---

## 今日やること

Pythonでは**関数もただの値**。
<!-- .element: class="lead" -->

```python
def square(x):
    return x * x

f = square          # 変数に入る
f(5)                # 25

square.__name__     # 'square'   名前も取り出せる
```

関数は実行時に作られるオブジェクト。
変数にも、リストにも、<strong>辞書にも入る</strong>。引数にも返り値にもなる。
今日は、この性質を使った例を3つ見る。
<!-- .element: class="key-box" -->

---

## 前提を確認

```python
n, name, flag = 42, "Alice", True   # 型宣言は不要
x = 10
x = "文字列"        # 別の型も代入できる。型を持つのは値

xs = [3, 1, 4]      # リスト: 書き換え可能
xs.append(9); xs.pop()
d = {"a": 1}        # 辞書: キーから値を引く
d.get("z", 0)       # 無いキーでも落ちない

[x**2 for x in range(5) if x % 2 == 0]   # 内包表記
```

ブロックは <code>{ }</code> ではなく<strong>字下げ</strong>で表す。スペース4個でそろえる。
<!-- .element: class="warn-box" -->

細かい文法は末尾の付録にまとめてある。必要になったら参照。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

01
<!-- .element: class="num" -->

## 関数を辞書に入れる

---

### `if` の連鎖を辞書に置き換える

<div class="left-column">
<h4>if を並べる</h4>
<pre><code class="language-python">def calc(op, a, b):
    if op == "add":
        return a + b
    elif op == "sub":
        return a - b
    ...       # 演算子の数だけ伸びる</code></pre>
</div>

<div class="right-column">
<h4>辞書を引く</h4>
<pre><code class="language-python">import operator

OPS = {
    "add": operator.add,
    "sub": operator.sub,
    "mul": operator.mul,
}

def calc(op, a, b):
    return OPS.get(op)(a, b)</code></pre>
</div>

演算子が増えても <code>calc</code> は1行のまま。
<strong>プログラムの実行中でも</strong> <code>OPS</code> に追加できる。
<!-- .element: class="key-box" -->

---

### 動いている最中に機能が増える

```python
OPS["max"] = max        # ここで語彙がひとつ増える
calc("max", 3, 9)       # 9
```

コンパイルが必要な言語では、分岐を増やすたびにビルドし直す。
Pythonでは<strong>辞書に代入するだけ</strong>。
<!-- .element: class="highlight-box" -->

関数を値として扱えると、処理の選択肢を辞書に持てる。次は、関数を受け取って別の関数を返す。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

02
<!-- .element: class="num" -->

## デコレータ：関数を包む

---

### まず、関数を返す関数

```python
def multiplier(n):
    def inner(x):        # 関数の中で関数を定義する
        return x * n     # 外側の n を覚えたまま
    return inner         # 関数を返す

double = multiplier(2)
double(10)   # 20
```

<code>inner</code> は外側の <code>n</code> を覚えたまま返される。これが<strong>クロージャ</strong>。
<!-- .element: class="key-box" -->

---

### `@` はただの糖衣構文

```python
def logged(func):
    def wrapper(*args):
        print(f"{func.__name__}{args}")
        return func(*args)
    return wrapper
```

<div class="left-column">
<h4>手で書き換える</h4>
<pre><code class="language-python">def add(a, b):
    return a + b

add = logged(add)</code></pre>
</div>

<div class="right-column">
<h4><code>@</code> を使う</h4>
<pre><code class="language-python">@logged
def add(a, b):
    return a + b</code></pre>
</div>

この2つの意味は<strong>まったく同じ</strong>。
<code>@deco</code> は「定義の直後に <code>f = deco(f)</code>」と読み替える。
<!-- .element: class="key-box" -->

---

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

---

### 1行足しただけ

| `tarai(12, 6, 0)` | 関数の呼び出し回数 | 時間 |
|---|---|---|
| `@memo` なし | 12,604,861 回 | 約 1 秒 |
| `@memo` あり | **225 回** | 一瞬 |

<strong>tarai の中身は1文字も変えていない。</strong>
上に1行足しただけで、計算量が約5万分の1になる。
<!-- .element: class="key-box" -->

同じ引数で何度も計算していたからだ。1度計算した結果を覚えておけば、同じ計算を繰り返さずに済む。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

03
<!-- .element: class="num" -->

## 定義と同時に登録する

---

### 定義した瞬間に辞書へ登録する

```python
COMMANDS = {}

def command(name):
    def deco(func):
        COMMANDS[name] = func     # 辞書に登録する
        return func               # 関数はそのまま返す
    return deco

@command("shout")
def shout(text):
    return text.upper() + "!!"

@command("rev")
def rev(text):
    return text[::-1]
```

関数を定義すると、その場で `COMMANDS` に登録される。一覧を別に管理しなくてよい。
<!-- .element: class="note" -->

---

### 文字列から命令を実行する

```python
def run(line):
    name, *args = line.split()      # 先頭が命令、残りが引数
    if name not in COMMANDS:
        raise ValueError(f"知らない命令: {name}")
    return COMMANDS[name](*args)

run("shout hello")    # 'HELLO!!'
run("rev abc")        # 'cba'
```

![文字列から命令を実行する流れ](../assets/diagrams/lexer-command.svg)

文字列を分け、辞書を引き、関数を呼ぶ。これが<strong>処理系の骨格</strong>。
<!-- .element: class="key-box" -->

---

## まとめ

- **関数は値** — 変数にも辞書にも入る
- **ディスパッチテーブル** — `if` の連鎖が辞書ひとつに畳まれる
- **デコレータ** — 中身を変えずに機能を足す道具。`@deco` は `f = deco(f)`
- **登録デコレータ** — 定義と同時に表ができあがる

共通するのは、<strong>実行中にプログラムを組み立て直せる</strong>こと。
これが動的言語の面白さだ。
<!-- .element: class="key-box" -->

---

## 発展：どこまで動的なのか

```python
class Echo:
    def __getattr__(self, name):          # 呼ばれたときに作る
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

<code>Echo</code> はメソッドを1つも定義していない。呼ばれた時点で作っている。
強力だが、定義を探しても見つからないので、読み手には追いにくい。
<!-- .element: class="warn-box" -->

---
<!-- .slide: class="chapter" -->

付録
<!-- .element: class="num" -->

## 文法の早見表

---

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
f"{score = }"                   # 式と値を表示 (printデバッグ用)
```

文字列は変更不可。`s&#91;0&#93; = "X"` はエラー。
<!-- .element: class="note" -->

---

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
except ValueError:    # 変換に失敗したときだけ処理する
    n = 0
```

`for i in range(len(xs))` と書きたくなったら、`enumerate` か `zip` で十分。
<!-- .element: class="note" -->

---

### 落とし穴

```python
xs = xs.sort()        # sort() は書き換えて None を返す
xs = sorted(xs)       # こちらが新しいリストを返す

def add(xs, item):
    xs.append(item)   # 呼び出し元のリストが書き換わる
    return xs

def bad(item, xs=[]): # デフォルト値は定義時に1回だけ作られる
    xs.append(item)   # bad(1) -> [1],  bad(2) -> [1, 2]
    return xs
```

リストや辞書は関数の中で書き換えられる。書き換えるのか、新しく作るのかを決め、両方を混在させない。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 関数を組み合わせて実装する

---

## 取り組む課題

ここまでに見た<strong>辞書・デコレータ・登録</strong>を、順番に実装する。

| # | 課題 | ねらい |
|---|---|---|
| 1 | 竹内関数を実装し、呼び出し回数を数える | 再帰、爆発する計算量 |
| 2 | ディスパッチテーブルで電卓 | 辞書に関数を入れる |
| 3 | `@memo` を書き、課題1 に組み込む | デコレータ、クロージャ |
| 4 | `@command` と `run()` でコマンド表 | 字句解析、ディスパッチ |

発展: `@trace` で再帰の木を表示 / `__doc__` から `help` を自動生成

---

## 進め方

- ページの「Colab で開く」から課題を開き、「ドライブにコピーを保存」しておく
- 各課題の `TODO` を埋める
- 直下の確認セルを実行し、`OK` が出ることを確かめる
- 確認セルは変更せず、最後に実行結果を残して保存する
- `score()` で全問を確認してから提出する

課題3の `@memo` を課題1に組み込むと、関数の中身を変えずに
呼び出し回数を大きく減らせる。課題はこの流れで進める。
<!-- .element: class="key-box" -->
