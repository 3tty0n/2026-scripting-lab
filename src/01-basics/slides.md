Scripting Languages / Dynamic Languages / 01

# Python 入門: 関数とデコレータ

### スクリプト言語演習

伊澤 侑祐

---

## 本日の流れ: 関数を「書く」から「組み合わせる」へ

| 段階 | できるようになること | 主な道具 | 課題 |
|---|---|---|---|
| 0. 復習 | 値・リスト・辞書を使う | `list`, `dict`, `for` | |
| 1. 関数を書く | 定義し、呼び、自分自身も呼ぶ | `def`, 引数, 再帰 | 0, 1 |
| 2. 関数を値にする | 変数・辞書に入れて選ぶ | 関数を入れた辞書 | 2 |
| 3. 関数を包む | 本体を変えずに機能を足す | デコレータ | 3 |
| 4. 表に登録する | 文字列から関数を実行する | 登録デコレータ | 4 |

```python
def square(x):
    return x * x

f = square          # 関数も値なので、変数に代入できる
f(5)                # ==> 25
```

---

## 復習: Python の書き方
### 0. 復習

::: hstack wrap
- 動的型付け
  - 型宣言不要、実行時に型が決定 (runtime type, 動的型)
- 副作用 (side effect)
  - 変数に別の型の値も代入可能
- コレクション (標準データ構造) 操作
  - リスト (list): `append`, `pop`, etc.
  - 辞書 (dictionary): `get`, `set`, etc.
    - キーによる辞書の参照も可能
|||
```python
n, name, flag = 42, "Alice", True
x = 10
x = "文字列"        # 型を持つのは値

xs = [3, 1, 4]
xs.append(9)
xs.pop()

d = {"a": 1}
d.get("z", 0)       # 無いキーでも落ちない

[x**2 for x in range(5) if x % 2 == 0]
```
:::

---

## 復習: リストと繰り返し処理・例外
### 0. 復習

- リスト: 順番を持つ値の集まり

- リストを操作する便利な関数
  - `enumerate`: 添字と値を得る
  - `zip`: 2つのリストの対応する値を得る

```python
xs = [3, 1, 4]
xs.append(9)        # [3, 1, 4, 9]

names = ["Alice", "Bob"]
scores = ["73", "92"]

for i, name in enumerate(names):
    pass
for a, b in zip(names, scores):
    pass

s = "1234"
try:
    n = int(s)
except ValueError:
    n = 0

print(n)
```

---

## 復習: 辞書
### 0. 復習

- 辞書: 名前から値を引く対応表
- 繰り返し処理などで使用
- この後、**値に関数を入れた辞書**を使う

```python
score = {"alice": 80, "bob": 92}
score["bob"]       # 92
score.get("carol", 0)
```

---

## 関数: 名前を付けた処理のまとまり
### 1. 関数を書く

::: hstack wrap 1 2
- 関数の定義:
```text
def 関数名(引数名1, 引数名2, ...):
    関数ボディ   # インデントはスペース4つ
    ...
    return     # 値を返す
```
|||
- 名前付き引数を指定可能: `def 関数名(名前1=デフォルト値): ...`
- `return` が無い関数は `None` を返す

```python
def greet(name, suffix="!"):
    return "Hello, " + name + suffix

greet("Alice")
greet(name="Bob", suffix=".")
```
:::

---

## 関数は自分自身も呼べる (再帰)
### 1. 関数を書く

- 同じ形の、より小さい問題へ分ける
- **止まる条件を先に書く**。無いと永遠に呼び続ける

```python
def fib(n):
    if n <= 1:                         # 止まる条件
        return n
    return fib(n - 1) + fib(n - 2)     # 自分を呼ぶ

fib(10)    # ==> 55
```

```text
fib(4) ─ fib(3) ─ fib(2) ─ fib(1), fib(0)
       │        └ fib(1)
       └ fib(2) ─ fib(1), fib(0)
```

> 同じ `fib(2)` が何度も計算されている。後で効いてくる

---

## 関数の中から、外の変数を書き換えて呼び出しを数える
### 1. 関数を書く

- 関数の中で代入した変数は、ふつう**その関数だけの変数**
- 外の変数を書き換えるには `global` の宣言が要る

```python
CALLS = 0

def fib(n):
    global CALLS          # 外の CALLS を書き換える宣言
    CALLS += 1
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

CALLS = 0
fib(10)
print(CALLS)              # 177 回呼ばれた
```

---

## 竹内関数: 値は単純でも、呼び出し回数が爆発する
### 1. 関数を書く — 課題1

```text
tarai(x, y, z) = y                           (x <= y のとき)
               = tarai(tarai(x-1, y, z),
                       tarai(y-1, z, x),
                       tarai(z-1, x, y))     (それ以外)
```

| 呼び出し | 回数 |
|---|---|
| `tarai(10, 5, 0)` | 343,073 回 |
| `tarai(12, 6, 0)` | 12,604,861 回 |

- 形は `fib` と同じ: 止まる条件 → 自分を呼ぶ
- 引数は小さい整数なのに、1,260万回も呼ばれる
- **同じ引数の組が何度も現れる**。これを後で減らす

---

## 関数は値なので、変数に入れたり、渡したりできる
### 2. 関数を値にする

- 関数は数や文字列と同じ「値」
- 変数に代入でき、引数にも渡せる

```python
def square(x):
    return x * x

f = square          # 変数に代入できる
f(5)                # ==> 25

def apply_twice(func, x):
    return func(func(x))      # 関数を引数に受け取る

apply_twice(square, 3)        # ==> 81
```

---

## 辞書に関数を入れると、名前で呼び分けられる
### 2. 関数を値にする — 課題2

- 名前 (`"add"` など) から、関数を引く辞書
- `if` を並べずに済み、演算を足すときは辞書に1行足すだけ

::: hstack wrap
```python
def calc(op, a, b):
    if op == "add":
        return a + b
    elif op == "sub":
        return a - b
    else:
        return -1
```
|||
```python
import operator
OPS = {"add": operator.add, "sub": operator.sub, "mul": operator.mul}

def calc(op, a, b):
    if op not in OPS:
        raise ValueError(f"知らない演算: {op}")
    return OPS[op](a, b)

calc("add", 2, 3)  # 5
```
:::

---

## デコレータ: 関数を包んで、機能を足す
### 3. 関数を包む

- `logged`: 関数を受け取り、ログを出す関数で**包んで**返す
- `@logged` は `add = logged(add)` の短い書き方
- 元の関数 `add` の中身は書き換えない
- `*args`: 受け取った引数を、そのまま元の関数へ渡すための書き方

::: hstack wrap
```python
def logged(func):
    def wrapper(*args):
        print(f"{func.__name__}{args}")  # 前に表示
        return func(*args)               # 元を呼ぶ
    return wrapper

def add(a, b):
    return a + b
add = logged(add)
```
|||
```python
@logged
def add(a, b):
    return a + b

add(2, 3)  # ログ出力 + 5
```
:::

> `wrapper` が外側の `func` を覚えている仕組み (クロージャ) は付録。「そういうものだ」で進めてよい

---

## デコレータによる計算結果の再利用
### 3. 関数を包む — 課題3

- `cache`: 引数ごとに、結果を覚えておく辞書
  - 一度計算した引数なら、覚えた答えを返す
  - 関数本体は変えず、呼び出しだけを包む

```python
def memo(func):
    cache = {}
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper

@memo
def tarai(x, y, z):
    if x <= y:
        return y
    return tarai(tarai(x-1, y, z),
                 tarai(y-1, z, x),
                 tarai(z-1, x, y))
```

---

## 1行で得られる効果
### 3. 関数を包む — 課題3-b

- `tarai` の本文は変更不要
- 同じ引数に対する再計算の削減
- 1行の追加による、呼び出し回数の約5万分の1への削減

| `tarai(12, 6, 0)` | 呼び出し回数 | 時間 |
|---|---|---|
| `@memo` なし | 12,604,861 回 | 約 1 秒 |
| `@memo` あり | **225 回** | 一瞬 |

> 同じ計算の繰り返しでは、一度求めた答えを保存し再利用するのが最適化のポイント

---

## 関数を定義と同時に、表へ登録する
### 4. 表に登録する — 課題4

- `@command("shout")` を付けた関数が、`COMMANDS` に登録される
- 形は写して使ってよい: 名前を受け取り、関数を登録して、そのまま返す

```python
COMMANDS = {}

def command(name):
    def deco(func):
        COMMANDS[name] = func
        return func          # 包まずに、そのまま返す
    return deco

@command("shout")
def shout(text):
    return text.upper() + "!!"
```

> 関数の定義位置がそのままコマンド表になる

---

## 文字列による命令実行
### 4. 表に登録する — 課題4

- 先頭の語を命令、残りを引数として解釈
- 辞書にない命令へのエラー
- 文字列から処理系を動かす最小の骨格

::: hstack wrap
```python
COMMANDS = {}

def command(name):
    def deco(func):
        COMMANDS[name] = func
        return func
    return deco

@command("shout")
def shout(text):
    return text.upper() + "!!"
```
|||
```python
def run(line):
    name, *args = line.split()
    if name not in COMMANDS:
        raise ValueError(f"知らない命令: {name}")
    return COMMANDS[name](*args)

run("shout hello")    # 'HELLO!!'
```
:::

![文字列から命令を実行する流れ](../assets/diagrams/lexer-command.svg)

---

## 要点

- **関数は値**: 変数や辞書に入れたり、引数に渡したりできる
- **辞書に関数を入れる**: `if` の連鎖が、表の参照になる
- **デコレータ**: 関数の中身を変えずに、前後の処理を足せる

---

## 課題一覧

- 必須課題: 0〜4
- 発展課題: 任意 (講義では扱わない)

| # | 課題 | ねらい | 対応する段階 |
|---|---|---|---|
| 0 | 関数を書く・渡す | 引数、デフォルト値、関数を引数に | 1, 2 |
| 1 | 竹内関数を実装し、呼び出し回数を数える | 再帰、爆発する計算量 | 1 |
| 2 | 辞書に関数を入れて電卓 | 辞書に関数を入れる | 2 |
| 3 | `@memo` を書き、課題1 に組み込む | デコレータ (関数を包む) | 3 |
| 4 | `@command` と `run()` でコマンド表 | 文字列から関数を実行する | 4 |

---

## 課題の進め方

- 「Colab で開く」から課題を開き、「ドライブにコピーを保存」
- 各課題の **例題セル** を実行して動きを見てから、`TODO` を埋める
- 直下の確認セルが `OK` になれば、その課題は完了
- 確認セルの保存
  - 教員は別のテストケースで採点するため、削除しても採点結果は不変

---

## 付録: 講義では扱わない補足

発展的な内容や復習。時間があるときや、質問が出たときに使う。

- 復習: 値と変数
- 復習: 型・文字列・演算子
- 実行時の機能追加
- よくある落とし穴: 新しく値を返すか、元を書き換えるか
- クロージャ: 外側の引数を覚えた関数を返す

---

## クロージャ: 外側の引数を覚えた関数を返す
### 付録

- 関数内での別の関数の定義
- 外側の引数 `n` を保持する返り値の関数

```python
def multiplier(n):
    def inner(x):
        return x * n     # 外側の n を覚えたまま
    return inner

double = multiplier(2)
double(10)   # 20
```

- デコレータの `wrapper` が外側の `func` を覚えているのも、この仕組み
- 名前を覚える必要はない。「関数が、作られた場所の変数を覚えている」でよい

---

## 復習: 値と変数
### 付録

- 値は整数・文字列・リストなどのオブジェクト
- 変数は値に付ける名前であり、型を固定しない
- `type()` による値の動的型の確認

```python
x = 10
name = "Alice"
x = "文字列"       # 型を持つのは値

type(x)             # str
type(name)          # str
```

---

## 復習: 型・文字列・演算子
### 付録

- `/` の常に `float` という結果と、`//` の切り捨て
- 整数の桁あふれなしと、処理速度の低下
- 変更不可の文字列と、`s[0] = "X"` のエラー

```python
name, score = "Alice", 92.5

7 / 2       # 3.5
7 // 2      # 3
2 ** 200    # 桁あふれしない

s = "スクリプト"
s[0], s[-1], s[0:3], s[::-1]
f"{name:>10} | {score:6.2f}"
f"{score = }"                   # print デバッグ用
```

---

## 実行時の機能追加
### 付録

- コンパイル済みのプログラムは機能追加時に再コンパイルする必要
- ディスパッチテーブルがあれば辞書への関数の追加だけで実現

::: hstack wrap
```python
def min(x, y):
    if x < y: return x
    else: return y
def add(x, y):
    return x + y

OPS = {"min": min, "add": add}
```
|||
```python
def max(x, y):
    if x > y: return x
    else: return y

OPS["max"] = max            # ここで語彙がひとつ増える

def calc(name, arg1, arg2): # 計算を行う本体
    return OPS[name](arg1, arg2)

calc("max", 3, 9)           # 9
```
:::

---

## よくある落とし穴: 新しく値を返すか、元を書き換えるか
### 付録

- ソート関数 (`sort`, `sorted`) による例
  - 新しく値を返す: `sorted`
  - 元を書き換える: `sort()` (`None` を返す )

- 引数のリストの変更
  - 呼び出し元にも及ぶ
  - デフォルト値の `[]`は定義時に1回だけ生成される


::: hstack wrap
```python
xs = [3, 1, 2]
result = xs.sort()    # None が返る — xs = xs.sort() は間違い
print(xs, result)     # [1, 2, 3] None

xs = [3, 1, 2]
xs = sorted(xs)       # 新しいリストを返す
print(xs)             # [1, 2, 3]
```
|||
```python
def add(xs, item):
    xs.append(item)   # 呼び出し元のリストが書き換わる
    return xs

def bad(item, xs=[]):
    xs.append(item)   # bad(1) -> [1],  bad(2) -> [1, 2]
    return xs

print(bad(1))  # [1]
print(bad(2))  # [1, 2] — デフォルト共有の落とし穴
```
:::
