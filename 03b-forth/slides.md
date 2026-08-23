<!-- .slide: class="title-slide" -->

Scripting Languages / 03-B
<!-- .element: class="kicker" -->

# Forth インタプリタの実装

### スクリプト言語演習 第3回 (B)

---

## 今日作るもの

第2回の逆ポーランド電卓に、<strong><code>: 名前 ... ;</code> による
ユーザ定義ワード</strong>を足す。
実行中に語彙を増やせれば、電卓が言語になる。
<!-- .element: class="key-box" -->

---

## Forth とは

1970年頃、Charles Mooreが電波望遠鏡の制御用に開発した。処理系が小さく、組み込み機器や Open Firmware で長く使われてきた。
<!-- .element: class="note" -->

| 特徴 | 内容 |
|---|---|
| 逆ポーランド記法 | `3 4 +` のように演算子を後ろに書く |
| スタック指向 | 引数も返り値もすべてスタック経由 |
| 文法がほぼない | 空白区切りの「ワード」が並んでいるだけ |
| 拡張が前提 | 組み込みワードとユーザ定義ワードに区別がない |

構文解析はほぼ要らない。今日の実装は<strong>字句解析とディスパッチだけ</strong>。
処理系を自分で書く題材として、かなり小さい。
<!-- .element: class="key-box" -->

---

## 第2回の電卓を土台にする

| 回 | 作ったもの | 今日の役割 |
|---|---|---|
| 第1回 | `@command` によるコマンド表と `run()` | ワード辞書とディスパッチ |
| 第1回 | ディスパッチテーブル `OPS[op](a, b)` | 組み込みワードの実装 |
| 第2回 | `split` によるトークン化 | 字句解析 |
| 第2回 | ワード表方式の逆ポーランド電卓 | 今日の出発点 |

まずは第2回と同じ電卓を、スタックとワード表で組み立て直す。

---
<!-- .slide: class="chapter" -->

01
<!-- .element: class="num" -->

## スタックと辞書

---

## スタックで計算する

`3 4 + 2 *` を左から処理する。括弧も優先順位も必要ない。

| 読んだもの | スタック |
|---|---|
| `3` | `[3]` |
| `4` | `[3, 4]` |
| `+` | `[7]` |
| `2` | `[7, 2]` |
| `*` | `[14]` |

<code>10 3 -</code> は <code>7</code>。先に pop されるのは <code>3</code> のほう。
<code>b - a</code> と書くと符号が反転する。ここは実装でよく間違える。
<!-- .element: class="warn-box" -->

---

## ディスパッチループ

![Forthのディスパッチループ](../assets/diagrams/forth-dispatch.svg)

---

## ワードを辞書に登録する

```python
import operator

def binop(f):                        # 2引数関数をワードにする
    def run(stack):
        b, a = stack.pop(), stack.pop()
        stack.append(f(a, b))
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

ここまでは第2回の電卓と同じ。Forthらしさが出るのは、次の `: ... ;` から。
<!-- .element: class="note" -->

---
<!-- .slide: class="chapter" -->

02
<!-- .element: class="num" -->

## 実行中に語彙を増やす

---

## ユーザ定義ワード

```text
: SQUARE DUP * ;     ( 2乗を計算するワードを定義 )
5 SQUARE .           ( 25 を出力 )

: DOUBLE DUP + ;
: QUADRUPLE DOUBLE DOUBLE ;
5 QUADRUPLE .        ( 20 を出力 )
```

<code>:</code> から <code>;</code> までのトークン列を辞書に保存する。
名前が出てきたら、その列を評価する。
定義したワードは別のワードからも呼べるので、<code>QUADRUPLE</code> は
<code>DOUBLE</code> を利用できる。
<!-- .element: class="key-box" -->

組み込みワードとユーザ定義ワードの扱いに差がない。ここがForthの面白さだ。
<!-- .element: class="note" -->

---

## 動的言語だからできること

```python
WORDS["SQUARE"] = lambda s: s.append(s.pop() ** 2)
# この行が動いた瞬間から SQUARE が使えるようになる
```

Pythonの辞書は実行中に書き換えられる。Forthの <code>: SQUARE DUP * ;</code> も同じで、
ユーザ定義を実行中に辞書へ登録しているだけだ。
<!-- .element: class="highlight-box" -->

Python自身も内部ではスタックマシンを使う。
<code>dis</code> でバイトコードを見ると、今日書く処理に似た命令列が現れる。
<!-- .element: class="key-box" -->

---

## まとめ

- **インタプリタ**: 字句解析 → ディスパッチループ → 結果
- **Forth のプログラム**: 逆ポーランド記法で並んだワードの列
- **Forth の処理系**: スタックと辞書でできている
- **動的言語**: 実行中に辞書を書き換えて、言語自体を伸ばせる

発展課題の <code>IF ... THEN</code> まで実装できれば、小さいながらも言語処理系になる。
<!-- .element: class="key-box" -->

---
<!-- .slide: class="chapter" -->

課題
<!-- .element: class="num" -->

## 小さな言語を完成させる

---

## 取り組む課題

スタックと辞書を使い、電卓からForthインタプリタへ段階的に広げる。

| # | 課題 |
|---|---|
| 1 | 算術だけのインタプリタ (`+ - * /`) |
| 2 | スタック操作ワード (`. DUP DROP SWAP OVER ROT`) |
| 3 | ユーザ定義ワード `: 名前 ... ;` |
| 4 | 対話ループ (REPL) |

発展: 比較演算子 `< > =` / `IF ... ELSE ... THEN` による条件分岐

---

## 進め方

- ページの「Colab で開く」から課題を開き、「ドライブにコピーを保存」しておく
- 課題0に第2回のスタック操作コードを移す
- 課題1から順に `TODO` を埋め、確認セルを実行する
- 確認セルは変更せず、最後に `score()` を実行して提出する

課題3の `: 名前 ... ;` が山場。定義したワードを辞書に登録し、
組み込みワードと同じ評価ループで実行できれば完成に近い。
<!-- .element: class="key-box" -->
