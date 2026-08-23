<!-- .slide: class="title-slide" -->

Scripting Languages / 01
<!-- .element: class="kicker" -->

# Python の関数とデコレータ

### スクリプト言語演習 第1回

---

## 今日やること

### 関数もただの値

- 実行時に作られるオブジェクト
- 変数にもリストにも、**辞書にも格納**
- 引数にも返り値にも

```python
def square(x):
    return x * x

f = square          # 変数に代入できる
f(5)                # ==> 25
square.__name__     # ==> 'square'
```

---

## 前提を確認

### 型を持つのは変数ではなく値

- 型宣言は不要。別の型も代入可能
- リストは書き換え可能、辞書はキーから値を参照
- ブロックは字下げ、スペースは4個

```python
n, name, flag = 42, "Alice", True
x = 10
x = "文字列"        # 型を持つのは値

xs = [3, 1, 4]
xs.append(9); xs.pop()
d = {"a": 1}
d.get("z", 0)       # 無いキーでも落ちない

[x**2 for x in range(5) if x % 2 == 0]
```

細かい文法は末尾の付録へ
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

01
<!-- .element: class="num" -->

## 関数を辞書に入れる

---

## `if` の連鎖を辞書に置き換える

### 分岐は表の参照へ

- `if` を並べると、演算子の数だけ関数が伸長
- 関数を辞書に入れ、名前で処理を参照
- 演算子が増えても `calc` は1行のまま

```python
def calc(op, a, b):
    if op == "add":
        return a + b
    elif op == "sub":
        return a - b
    else:
        return -1
```

```python
import operator
OPS = {"add": operator.add, "sub": operator.sub, "mul": operator.mul}

def calc(op, a, b):
    return OPS.get(op)(a, b)
```

---

## 動いている最中に機能が増える

### 辞書への代入が語彙の追加

- コンパイル言語では、分岐のたびに再ビルド
- Python では辞書に関数を足すだけ
- 関数を値として扱えるため、選択肢を表に保持

```python
OPS["max"] = max        # ここで語彙がひとつ増える
calc("max", 3, 9)       # 9
```

実行中の組み立て直しが、動的言語の面白さ
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

02
<!-- .element: class="num" -->

## デコレータ：関数を包む

---

## 関数の中で関数を返す

### 内側の関数は外側の変数を保持

- 関数の中で別の関数を定義可能
- 返した関数は、外側の引数 `n` を保持したまま動作
- これを**クロージャ**と呼ぶ

```python
def multiplier(n):
    def inner(x):
        return x * n     # 外側の n を覚えたまま
    return inner

double = multiplier(2)
double(10)   # 20
```

---

## `@` はただの糖衣構文

### 定義直後の関数の書き換え

- `logged` は関数を受け取り、別の関数を返す
- 手で `add = logged(add)` と書くのと意味は同一
- `@deco` は「定義の直後に `f = deco(f)`」と読む

```python
def logged(func):
    def wrapper(*args):
        print(f"{func.__name__}{args}")
        return func(*args)
    return wrapper

def add(a, b):
    return a + b
add = logged(add)
```

```python
@logged
def add(a, b):
    return a + b
```

---

## 計算結果を覚えて再利用する

### 同じ引数なら二度計算しない

- `cache` はクロージャが保持する辞書
- タプルは辞書のキーになるため、引数ごと結果を保存
- 関数の中身はそのまま、呼び出し方だけを包む

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

## 1行でも大きな効果

### 中身を変えずに計算量を削減

- `tarai` の本文は1文字も変更なし
- 同じ引数の再計算をやめただけ
- 1行追加で、呼び出しは約5万分の1

| `tarai(12, 6, 0)` | 呼び出し回数 | 時間 |
|---|---|---|
| `@memo` なし | 12,604,861 回 | 約 1 秒 |
| `@memo` あり | **225 回** | 一瞬 |

同じ計算の繰り返し。一度出した答えを覚えておけば足りる
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

03
<!-- .element: class="num" -->

## 定義と同時に登録する

---

## 定義した瞬間に辞書へ登録する

### 一覧表は手で管理しない

- `command` は関数を辞書に足して、そのまま返す
- `@command("shout")` の時点で `COMMANDS` に載る
- 定義と登録が一度に済み、一覧がずれない

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

関数を書いた場所が、そのままコマンド表
<!-- .element: class="note" -->

---

## 文字列から命令を実行する

### 分ける、引く、呼ぶ

- 先頭の語が命令、残りが引数
- 辞書に無ければ、知らない命令として破棄
- 文字列から処理系を起動する骨格はこれで十分

```python
def run(line):
    name, *args = line.split()
    if name not in COMMANDS:
        raise ValueError(f"知らない命令: {name}")
    return COMMANDS[name](*args)

run("shout hello")    # 'HELLO!!'
```

![文字列から命令を実行する流れ](../assets/diagrams/lexer-command.svg)

---

## まとめ

### 実行中のプログラムの組み立て直し

- **関数は値**。変数にも辞書にも格納
- **ディスパッチテーブル**。`if` の連鎖が辞書ひとつに
- **デコレータ**は中身を変えずに機能を追加。`@deco` は `f = deco(f)`

登録デコレータなら、定義と同時に表が完成
<!-- .element: class="note" -->

---

## 発展: どこまで動的なのか

### 呼ばれた時点でのメソッド生成

- `Echo` はメソッドを1つも定義していない
- `__getattr__` が、名前を見た瞬間に関数を返す
- 強力だが、定義を探しても見つからない

```python
class Echo:
    def __getattr__(self, name):
        def method(*args):
            print(f"{name} が {args} で呼ばれました")
        return method

e = Echo()
e.jump(3)
e.どんな名前でも("いける")
```

読み手には追いにくい。課題では不要
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

付録
<!-- .element: class="num" -->

## 文法の早見表

---

## 型・文字列・演算

### よく使う演算と文字列操作

- `/` は常に float、`//` は切り捨て
- 整数の桁あふれは起きない。その代わり遅い
- 文字列は変更不可。`s[0] = "X"` はエラー

```python
7 / 2       # 3.5
7 // 2      # 3
2 ** 200    # 桁あふれしない

s = "スクリプト"
s[0], s[-1], s[0:3], s[::-1]
f"{name:>10} | {score:6.2f}"
f"{score = }"                   # print デバッグ用
```

スライスと `in` で、ほとんどの文字列処理は十分
<!-- .element: class="note" -->

---

## 制御構造

### 分岐と繰り返し

- 比較は `0 < x < 100` と連鎖可能
- 空の list / str / dict、`0`、`None` は False
- 添字が欲しくなったら `range(len(...))` より `enumerate` か `zip`

```python
if 0 < x < 100:
    ...
if not items:
    ...

for i, name in enumerate(names):
for a, b in zip(names, scores):

try:
    n = int(s)
except ValueError:
    n = 0
```

例外は、失敗したときだけ処理
<!-- .element: class="note" -->

---

## 落とし穴

### 書き換えとデフォルト引数

- `sort()` は元を書き換えて `None` を返す
- リストを引数で受け取ると、呼び出し元まで変化
- デフォルト値の `[]` は、定義時に1回だけ生成

```python
xs = xs.sort()        # 間違い。sorted(xs) を使う
xs = sorted(xs)

def add(xs, item):
    xs.append(item)   # 呼び出し元のリストが書き換わる
    return xs

def bad(item, xs=[]):
    xs.append(item)   # bad(1) -> [1],  bad(2) -> [1, 2]
    return xs
```

書き換えるのか、新しく作るのかを決め、両方を混在させない
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 関数を組み合わせて実装する

---

## 取り組む課題

### 辞書・デコレータ・登録を順に実装

- ここまで見た道具を、課題の順に手を動かして確認
- あとの課題は、前の課題の結果を部品として利用
- 発展は必須ではない

| # | 課題 | ねらい |
|---|---|---|
| 1 | 竹内関数を実装し、呼び出し回数を数える | 再帰、爆発する計算量 |
| 2 | ディスパッチテーブルで電卓 | 辞書に関数を入れる |
| 3 | `@memo` を書き、課題1 に組み込む | デコレータ、クロージャ |
| 4 | `@command` と `run()` でコマンド表 | 字句解析、ディスパッチ |

発展: `@trace` で再帰の木を表示 / `__doc__` から `help` を自動生成
<!-- .element: class="note" -->

---

## 進め方

### 確認セルで確かめながら進行

- 「Colab で開く」から課題を開き、「ドライブにコピーを保存」
- 各課題の `TODO` を埋め、直下の確認セルで `OK` を確認
- 確認セルは消さない
  - 教員は別のテストケースで採点するので消しても害はない

課題3の `@memo` を課題1に組み込むと、関数の中身を変えずに呼び出し回数を削減
<!-- .element: class="note" -->
