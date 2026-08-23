<!-- .slide: class="title-slide" -->

Scripting Languages / 03-B
<!-- .element: class="kicker" -->

# Forth インタプリタの実装

### スクリプト言語演習 第3回 (B)

---

## 今日作るもの

- 第2回の逆ポーランド電卓が土台
- `: 名前 ... ;` で、実行中に語彙を追加
- 語彙が増えれば、電卓は言語に

組み込みワードと自分で定義したワードを、同じループで実行
<!-- .element: class="note" -->

---

## Forth とは

- 演算子は後ろに書き、値はすべてスタック経由
- プログラムは、空白で区切ったワードの列
- 組み込みとユーザ定義に、扱いの差は無し

| 特徴 | 内容 |
|---|---|
| 逆ポーランド記法 | `3 4 +` のように演算子を後ろに書く |
| スタック指向 | 引数も返り値もすべてスタック経由 |
| 文法がほぼない | 空白区切りの「ワード」が並んでいるだけ |
| 拡張が前提 | 組み込みとユーザ定義を区別しない |

今日の実装は字句解析とディスパッチだけ。処理系の題材として小さい
<!-- .element: class="note" -->

---

## 第2回の電卓を土台にする

- トークン化とスタックは第2回のまま利用
- ワード表は、第1回のディスパッチと同じ形
- まず同じ電卓を、スタックと辞書で再構成

| 回 | 作ったもの | 今日の役割 |
|---|---|---|
| 第1回 | `@command` と `run()` | ワード辞書とディスパッチ |
| 第1回 | ディスパッチテーブル | 組み込みワードの実装 |
| 第2回 | `split` によるトークン化 | 字句解析 |
| 第2回 | 逆ポーランド電卓 | 今日の出発点 |

---

<!-- .slide: class="chapter" -->

01
<!-- .element: class="num" -->

## スタックと辞書

---

## スタックで計算する

- 式を左から読む
- 数なら積み、演算子なら上から2つ取って計算
- `10 3 -` は `7`。先に pop されるのは `3`

| 読んだもの | スタック |
|---|---|
| `3` | `[3]` |
| `4` | `[3, 4]` |
| `+` | `[7]` |
| `2` | `[7, 2]` |
| `*` | `[14]` |

`b - a` と書くと符号が反転。ここは実装でよく間違える
<!-- .element: class="note" -->

---

## ディスパッチループ

- ワード表にあれば、その関数を呼ぶ
- 無ければ整数として積む
- 知らない語なら、そこで停止

![Forthのディスパッチループ](../assets/diagrams/forth-dispatch.svg)

この図が、今日書く評価関数そのもの
<!-- .element: class="note" -->

---

## ワードを辞書に登録する

- `binop` は、普通の関数をワードに変換
- 先に pop されるのが右辺
- `.` と `DUP` は、スタックを直接操作

```python
import operator

def binop(fn):
    def run(stack):
        b, a = stack.pop(), stack.pop()
        stack.append(fn(a, b))
    return run

WORDS = {
    "+": binop(operator.add), "-": binop(operator.sub),
    "*": binop(operator.mul), "/": binop(operator.floordiv),
    ".": lambda s: print(s.pop()),
    "DUP": lambda s: s.append(s[-1]),
}
```

---

## 評価する

- 空白で切り、大文字にそろえて表を参照
- 負号付きの整数も、数として積む
- Forth らしさは、次の `: ... ;` から

```python
def forth_eval(stack, code):
    for token in code.split():
        up = token.upper()
        if up in WORDS:
            WORDS[up](stack)
        elif token.lstrip("-").isdigit():
            stack.append(int(token))
        else:
            raise ValueError(f"知らないワード: {token}")
```

---

<!-- .slide: class="chapter" -->

02
<!-- .element: class="num" -->

## 実行中に語彙を増やす

---

## ユーザ定義ワード

- `:` から `;` までが、新しいワードの本体
- 名前が出てきたら、保存した列を評価
- 定義したワードは、別のワードからも呼び出し可能

```text
: SQUARE DUP * ;
5 SQUARE .           ( 25 )

: DOUBLE DUP + ;
: QUADRUPLE DOUBLE DOUBLE ;
5 QUADRUPLE .        ( 20 )
```

組み込みとユーザ定義の扱いに差は無し。ここが Forth の面白さ
<!-- .element: class="note" -->

---

## 動的言語だからできること

- Python の辞書は、動いている最中に書き換え可能
- Forth の `: SQUARE DUP * ;` も、同じことを実行
- その瞬間から、新しい名前が言語の一部に

```python
WORDS["SQUARE"] = lambda s: s.append(s.pop() ** 2)
# この行が動いた瞬間から SQUARE が使える
```

Python 自身も内部ではスタックマシン。`dis` でバイトコードを見ると、今日の処理に似た命令列が出現
<!-- .element: class="note" -->

---

## まとめ

- インタプリタは、字句解析とディスパッチで動作
- Forth の処理系は、スタックと辞書で構成
- 実行中に辞書を書き換えれば、言語自体を延長可能

発展の `IF ... THEN` まで実装できれば、小さいながらも言語処理系
<!-- .element: class="note" -->

---

<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 小さな言語を完成させる

---

## 取り組む課題

- まず算術とスタック操作を動作
- 山場は `: 名前 ... ;` の登録
- 最後に REPL を付けて対話可能に

| # | 課題 |
|---|---|
| 1 | 算術だけのインタプリタ (`+ - * /`) |
| 2 | スタック操作ワード (`. DUP DROP SWAP OVER ROT`) |
| 3 | ユーザ定義ワード `: 名前 ... ;` |
| 4 | 対話ループ (REPL) |

発展: 比較演算子 `<` `>` `=` / `IF ... ELSE ... THEN`
<!-- .element: class="note" -->

---

## 進め方

- 「Colab で開く」から課題を開き、「ドライブにコピーを保存」
- 課題0に第2回のスタック操作を移し、1から `TODO` を埋める
- 確認セルは消さない
  - 教員は別のテストケースで採点するので消しても害はない
