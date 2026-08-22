<!-- .slide: class="title-slide" -->

<p class="kicker">Scripting Languages / 03-B</p>

# Forth インタプリタ<br>実装演習

### スクリプト言語演習 第3回 (B)

---

## 第1回・第2回で作ったもの

| 回 | 作ったもの | 今日の役割 |
|---|---|---|
| 第1回 | `@command` によるコマンド表と `run()` | ワード辞書とディスパッチ |
| 第1回 | ディスパッチテーブル `OPS[op](a, b)` | 組み込みワードの実装 |
| 第2回 | `split` によるトークン化 | 字句解析 |
| 第2回 | ワード表方式の逆ポーランド電卓 | 今日の出発点 |

<div class="key-box">
Forth が電卓と決定的に違うのは、
<strong><code>: 名前 ... ;</code> でユーザが実行中に語彙を増やせる</strong>点。
ここができて、はじめて「言語」。
</div>

---

## Forth とは

1970年頃に Charles Moore が電波望遠鏡の制御用に開発。処理系が極端に小さく、
組み込み機器や Open Firmware で長く使われてきた言語。
<!-- .element: class="note" -->

| 特徴 | 内容 |
|---|---|
| 逆ポーランド記法 | `3 4 +` のように演算子を後ろに書く |
| スタック指向 | 引数も返り値もすべてスタック経由 |
| 文法が無い | 空白区切りの「ワード」が並んでいるだけ |
| 拡張が前提 | 組み込みワードとユーザ定義ワードに区別がない |

<div class="key-box">
構文解析が不要。だから今日の実装は<strong>字句解析とディスパッチだけ</strong>。
処理系を自分で書く練習として、おそらく最短の題材。
</div>

---

## スタックで計算する

`3 4 + 2 *` を左から処理する。括弧も優先順位も要らない。

| 読んだもの | スタック |
|---|---|
| `3` | `[3]` |
| `4` | `[3, 4]` |
| `+` | `[7]` |
| `2` | `[7, 2]` |
| `*` | `[14]` |

<div class="warn-box">
<code>10 3 -</code> は <code>7</code>。先に pop されるのは <code>3</code> のほう。
<code>b - a</code> と書くと符号が反転する。ここは必ず1回間違えるところ。
</div>

---

## ディスパッチループ

<div class="eval-loop-container">
  <div class="eval-main-flow">
    <div class="eval-box read">トークンを<br>1つ読む</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="eval-box get">辞書を引く</div>
    <div class="flow-arrow">&#8594;</div>
    <div class="eval-box eval">スタックを<br>操作する</div>
  </div>
  <div class="eval-branches">
    <div class="eval-branch">
      <div class="condition">数値だった</div>
      <div class="action">スタックに push</div>
    </div>
    <div class="eval-branch">
      <div class="condition">ワードだった</div>
      <div class="action">対応する関数を呼ぶ</div>
    </div>
    <div class="eval-branch">
      <div class="condition">知らない</div>
      <div class="action">エラー</div>
    </div>
  </div>
  <div class="loop-arrow"></div>
</div>

---

## ワードを並べる

```python
import operator

def binop(f):                        # 2引数関数をワードに変える
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

ここまでは第2回の電卓と同じ。Forth らしくなるのは次の `: ... ;` から。
<!-- .element: class="note" -->

---

## ユーザ定義ワード

```text
: SQUARE DUP * ;     ( 2乗を計算するワードを定義 )
5 SQUARE .           ( 25 を出力 )

: DOUBLE DUP + ;
: QUADRUPLE DOUBLE DOUBLE ;
5 QUADRUPLE .        ( 20 を出力 )
```
<!-- .element: class="output" -->

<div class="key-box">
<code>:</code> から <code>;</code> までのトークン列を辞書に保存し、その名前が出てきたら中身を評価。
定義済みのワードを本体から呼べるので、<code>QUADRUPLE</code> は <code>DOUBLE</code> を利用可能。
</div>

組み込みワードとユーザ定義ワードの扱いに差が無い。ここが Forth の気持ちよさ。
<!-- .element: class="note" -->

---

## 動的言語だからできること

```python
WORDS["SQUARE"] = lambda s: s.append(s.pop() ** 2)
# この行が動いた瞬間から SQUARE が使えるようになる
```

<div class="highlight-box">
Python の辞書は実行中に書き換え可能。Forth の <code>: SQUARE DUP * ;</code> がやっているのも、
まさにこれ。ユーザが書いた定義を、走っている最中に辞書へ登録するだけ。
</div>

<div class="key-box">
Python 自身も内部はスタックマシン。
<code>dis</code> モジュールでバイトコードを覗けば、今日書くものによく似た命令列。
</div>

---

## 演習課題

| # | 課題 |
|---|---|
| 1 | 算術だけのインタプリタ (`+ - * /`) |
| 2 | スタック操作ワード (`. DUP DROP SWAP OVER ROT`) |
| 3 | ユーザ定義ワード `: 名前 ... ;` |
| 4 | 対話ループ (REPL) |

発展: 比較演算子 `< > =` / `IF ... ELSE ... THEN` による条件分岐

課題3 が山場。`exercises/03b_forth.ipynb` の課題0 に第2回のスタック操作を写してから開始。
<!-- .element: class="note" -->

---

## まとめ

- **インタプリタ**: 字句解析 → ディスパッチループ → 結果
- **Forth のプログラム**: 逆ポーランド記法で並んだワードの列
- **Forth の処理系**: スタックと辞書、それだけ
- **動的言語**: 実行中に辞書を書き換えて、言語自体を伸ばせる

<div class="key-box">
発展課題の <code>IF ... THEN</code> まで書けたら、小さいながら本物の言語処理系。
</div>
