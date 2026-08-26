"""確認セルの中で使う道具。

狙いは、学生に返るメッセージを「何が悪いか分かる」ものにすること。
素の assert だけだと NameError や AssertionError しか出ず、
「関数を作り忘れた」のか「中身が違う」のかが区別できない。

  need('calc', arity=3)   … そもそも定義されているか、引数の数は合っているか
  holds(...)              … 具体例ではなく、成り立つべき性質で確かめる
  watch('tarai')          … 実行中の呼び出しを横から観察する (AOP)
  tags('calc')            … 書き方の特徴を構文木から調べる
  note(...)               … 学生に見せる観察結果を残す

PRELUDE は、この中身をそのまま文字列にしたもの。
採点する側 (grade.py / autograde.py / grade.html) が、
学生の名前空間に流し込んでから確認セルを実行する。
"""

PRELUDE = r'''
import random as _random


class _Missing(AssertionError):
    pass


def need(name, arity=None, kind=None, ns=None):
    """名前が定義されていること、そして形が合っていることを確かめる。

    見つからなければ「定義されていない」と言い切る。
    NameError をそのまま出すより、何をすればいいか分かる。
    """
    import inspect
    ns = ns if ns is not None else globals()
    if name not in ns:
        raise _Missing(f"{name} が定義されていない")
    obj = ns[name]
    if obj is None:
        raise _Missing(f"{name} が None のまま (TODO を埋めていない)")

    if kind is not None and not isinstance(obj, kind):
        raise _Missing(
            f"{name} は {kind.__name__} のはずだが {type(obj).__name__} になっている")

    if arity is not None:
        if not callable(obj):
            raise _Missing(f"{name} が関数ではない ({type(obj).__name__})")
        try:
            params = inspect.signature(obj).parameters
        except (TypeError, ValueError):
            return obj
        required = [p for p in params.values()
                    if p.default is p.empty
                    and p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)]
        has_var = any(p.kind is p.VAR_POSITIONAL for p in params.values())
        if not has_var and not (len(required) <= arity <= len(params)):
            raise _Missing(
                f"{name} は引数を {arity} 個取るはずだが、"
                f"{len(params)} 個で定義されている")
    return obj


def holds(label, prop, examples, limit=200):
    """具体例ではなく、成り立つべき性質で確かめる。

    prop は「引数を受け取って True を返す」関数。
    examples は試したい入力の並び。破れたら、その入力を添えて知らせる。
    """
    count = 0
    for args in examples:
        if count >= limit:
            break
        count += 1
        if not isinstance(args, tuple):
            args = (args,)
        try:
            ok = prop(*args)
        except AssertionError:
            raise
        except BaseException as e:
            raise AssertionError(
                f"{label} … 入力 {args!r} で {type(e).__name__}: {e}")
        if not ok:
            raise AssertionError(f"{label} … 入力 {args!r} で成り立たなかった")


def ints(n=1, lo=-50, hi=50, count=60, seed=0):
    """整数の組をいくつか作る。性質の確認に使う"""
    r = _random.Random(seed)
    out = []
    for _ in range(count):
        out.append(tuple(r.randint(lo, hi) for _ in range(n))
                   if n > 1 else r.randint(lo, hi))
    return out


def words(count=40, seed=0):
    """英小文字の短い語をいくつか作る"""
    r = _random.Random(seed)
    return ["".join(r.choice("abcdefghij") for _ in range(r.randint(1, 6)))
            for _ in range(count)]

# ------------------------------------------------------------------ AOP
# 「関数の中身には触れず、まわりから振る舞いを観察する」道具。
# 結果が合っているかだけでなく、どう動いたかを見て助言できる。

_FACTS = []


def note(msg):
    """学生に見せる観察結果を残す。採点結果と一緒に表示される"""
    if msg not in _FACTS:
        _FACTS.append(msg)


def why(msg, fix):
    """失敗の理由と、次にやることを一緒に伝える"""
    raise AssertionError(f"{msg}\n→ {fix}")


class _Spy:
    """関数を包んで呼び出しを記録する。中身は元の関数のまま"""

    def __init__(self, name, fn):
        self.name, self.fn = name, fn
        self.calls = 0
        self.depth = 0
        self._live = 0
        self.args = []
        self.errors = []
        self._keep = True

    @property
    def inputs(self):
        """観察できた引数の組 (重複を除く)"""
        out = []
        for a in self.args:
            if a not in out:
                out.append(a)
        return out

    def __call__(self, *a, **k):
        # 何百万回も通る道なので、ここは軽くしておく
        self.calls += 1
        self._live += 1
        if self._live > self.depth:
            self.depth = self._live
        if self._keep:
            self.args.append(a)
            if len(self.args) >= 500:
                self._keep = False
        try:
            return self.fn(*a, **k)
        except BaseException as e:
            self.errors.append(e)
            raise
        finally:
            self._live -= 1

    def __repr__(self):
        return f"<{self.name} 呼び出し {self.calls} 回 / 深さ {self.depth}>"


class watch:
    """名前に「まわりの助言」を差し込み、抜けるときに元へ戻す。

        with watch('tarai') as w:
            tarai(10, 5, 0)
        assert w.calls == 343073

    再帰も数えられる。学生の関数は自分の名前を大域から引くため、
    差し替えた包みを通って戻ってくる。
    """

    def __init__(self, *names, ns=None):
        self.names = names
        self.ns = ns if ns is not None else globals()

    def __enter__(self):
        self.spies = {}
        for n in self.names:
            fn = need(n, ns=self.ns)
            if not callable(fn):
                raise _Missing(f"{n} が関数ではない ({type(fn).__name__})")
            spy = _Spy(n, fn)
            self.ns[n] = spy
            self.spies[n] = spy
        return self.spies[self.names[0]] if len(self.names) == 1 else self.spies

    def __exit__(self, *exc):
        for n, spy in self.spies.items():
            if self.ns.get(n) is spy:
                self.ns[n] = spy.fn
        return False


def observed(caller, callee, *args, ns=None):
    """caller を動かしたとき callee が実際に呼ばれたか。

    「表は作ったが使っていない」を見抜くために使う。
    """
    ns = ns if ns is not None else globals()
    with watch(callee, ns=ns) as spy:
        need(caller, ns=ns)(*args)
    return spy.calls > 0


def source(name, ns=None):
    """学生が書いたコードそのものを取り出す。取れなければ空文字"""
    import inspect
    obj = need(name, ns=ns)
    try:
        return inspect.getsource(obj)
    except (OSError, TypeError, IndentationError):
        return ""


def tags(name, ns=None):
    """書き方の特徴を構文木から拾う。

    返るのは文字列の集合。
      'if-chain'    if / elif の連鎖
      'loop'        for か while
      'recursion'   自分自身を呼んでいる
      'subscript'   [] で引いている
      'try'         例外を捕まえている
      'global'      global 宣言がある
      'comprehension'
      'calls:<名前>' その名前を呼んでいる
    """
    import ast, textwrap
    src = source(name, ns=ns)
    if not src:
        return set()
    try:
        tree = ast.parse(textwrap.dedent(src))
    except SyntaxError:
        return set()
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and any(isinstance(x, ast.If) for x in node.orelse):
            out.add("if-chain")
        elif isinstance(node, (ast.For, ast.While)):
            out.add("loop")
        elif isinstance(node, ast.Subscript):
            out.add("subscript")
        elif isinstance(node, ast.Try):
            out.add("try")
        elif isinstance(node, ast.Global):
            out.add("global")
        elif isinstance(node, (ast.ListComp, ast.DictComp, ast.SetComp,
                               ast.GeneratorExp)):
            out.add("comprehension")
        elif isinstance(node, ast.Call):
            f = node.func
            called = getattr(f, "id", None) or getattr(f, "attr", None)
            if called:
                out.add("calls:" + called)
                if called == name:
                    out.add("recursion")
    return out


def unchanged(name, *args, ns=None):
    """引数を書き換えていないことを確かめる。壊す関数はここで見つかる"""
    import copy
    fn = need(name, ns=ns)
    before = copy.deepcopy(args)
    fn(*copy.deepcopy(args))
    for i, (b, a) in enumerate(zip(before, args)):
        if b != a:
            why(f"{name} が {i + 1} 番目の引数を書き換えている",
                "受け取ったものを直接いじらず、コピーを作って返すこと")

# ------------------------------------------------------------------ 助言
# 検査に落ちたとき、学生の名前空間をその場で覗いて「次に何をすればいいか」
# を作る。ここは学生の名前空間の中で動くので、定義した関数をそのまま試せる。


def _probe_01_q1():
    if "tarai" not in globals():
        return ""
    globals()["CALLS"] = 0
    if tarai(1, 2, 3) != 2:
        return "x <= y のときは y をそのまま返すこと"
    globals()["CALLS"] = 0
    with watch("tarai") as spy:
        tarai(10, 5, 0)
    if spy.calls != 343073:
        return (f"tarai(10, 5, 0) で {spy.calls:,} 回呼ばれている "
                f"(正しくは 343,073 回)。x > y のときに3回呼ぶ形か確かめること")
    if globals().get("CALLS") != spy.calls:
        return (f"数え方がずれている。実際は {spy.calls:,} 回呼ばれているのに "
                f"CALLS は {globals().get('CALLS')}")
    return ""


def _probe_01_q2():
    t = tags("calc")
    if "if-chain" in t and not ({"subscript", "calls:get"} & t):
        return "OPS を作っても calc が if / elif で分けている。OPS[op](a, b) の形にすること"
    if not ({"subscript", "calls:get"} & t):
        return "calc の中から OPS を引いていない。表から関数を取り出して呼ぶこと"
    return ""


def _probe_01_q3():
    ran = []

    @memo
    def _f(x):
        ran.append(x)
        return x + 1

    _f(1); _f(1); _f(1)
    if len(ran) > 1:
        return "同じ引数で3回呼んだのに本体が動いている。cache にある値をそのまま返すこと"
    if not hasattr(_f, "cache"):
        return "包んだ関数に cache を持たせること (wrapper.cache = cache)"
    return ""


def _probe_01_q3b():
    if "tarai_memo" not in globals() or not hasattr(tarai_memo, "cache"):
        return "tarai_memo に @memo が付いていない"
    tarai_memo.cache.clear()
    tarai_memo(12, 6, 0)
    n = len(tarai_memo.cache)
    if n != 225:
        return f"cache に {n} 件しか残っていない (引数の組は 225 通り)。鍵の作り方を見直すこと"
    return ""


def _probe_01_q4():
    if not COMMANDS:
        return "COMMANDS が空。@command('名前') を付けたときに表へ入れること"
    return ""


def _probe_02_q1():
    toks = tokenize_file("sample.txt")
    if any(t != t.lower() for t in toks):
        return "大文字が残っている。lower() で揃えること"
    bad = [t for t in toks if not t.isalpha()]
    if bad:
        return f"記号が付いたままの語がある: {bad[:3]}"
    if len(toks) != 38:
        return f"{len(toks)} 語になっている (正しくは 38 語)。コメント行を飛ばしているか確かめること"
    return ""


def _probe_02_q3():
    from collections import Counter
    picks = [pick_next(Counter({"a": 9, "b": 1})) for _ in range(300)]
    if len(set(picks)) == 1:
        return "いつも同じ語を返している。回数を重みにして選ぶこと (random.choices)"
    if not 220 < picks.count("a") < 300:
        return f"重みが効いていない (9:1 のはずが {picks.count('a')}:{300 - picks.count('a')})"
    return ""


def _probe_03b_q2():
    keys = [k for k in BUILTINS]
    if keys and all(k == k.upper() for k in keys) and run("1 2 swap") != [2, 1]:
        return "BUILTINS は大文字で登録されている。引くときに word.upper() を通すこと"
    return ""


_PROBES = {
    ("01", "q1"): _probe_01_q1,
    ("01", "q2"): _probe_01_q2,
    ("01", "q3"): _probe_01_q3,
    ("01", "q3b"): _probe_01_q3b,
    ("01", "q4"): _probe_01_q4,
    ("02", "q1"): _probe_02_q1,
    ("02", "q3"): _probe_02_q3,
    ("03b", "q2"): _probe_03b_q2,
}

# 例外の種類から言えること。どの課題でも同じ
_BY_ERROR = [
    (RecursionError, "再帰が止まっていない。終了条件を先に書くこと"),
    (IndexError, "空のリストから取り出している。要素の数を確かめてから pop すること"),
    (KeyError, "辞書に無い鍵を引いている。in で確かめてから引くこと"),
    (ZeroDivisionError, "0 で割っている"),
    (TypeError, "引数の数か型が合っていない。返り値が None のままになっていないか"),
    (AttributeError, "その型には無いメソッドを呼んでいる"),
    (NameError, "名前が見つからない。セルを上から順に全部実行したか確かめること"),
]


# 上のどれにも当てはまらないときの、項目ごとの手がかり
_HINTS = {
    ("01", "q1"): "x <= y なら y。そうでなければ tarai を3回呼んで、その結果でまた tarai を呼ぶ",
    ("01", "q1b"): "呼び出し回数ではなく、現れた (x, y, z) の種類を数える。set に入れること",
    ("01", "q2"): "OPS は演算子から関数への表。calc は表から引いて呼ぶだけにする",
    ("01", "q3"): "cache を作り、引数を鍵にして結果を覚える。wrapper.cache = cache も忘れずに",
    ("01", "q3b"): "tarai と同じ中身に @memo を付けるだけ。再帰も tarai_memo を呼ぶこと",
    ("01", "q4"): "@command('名前') は関数を COMMANDS に入れて、そのまま返す",
    ("01", "b1"): "深さは大域の変数で持ち、呼ぶ前に増やして、終わったら必ず戻す",
    ("01", "b2"): "COMMANDS を sorted() で回し、docstring と引数名を並べる",
    ("02", "q1"): "# で始まる行は飛ばし、小文字にして、英字以外を区切りにする",
    ("02", "q2"): "隣り合う2語を zip(toks, toks[1:]) で取り出し、Counter に足す",
    ("02", "q2b"): "回数の多い順、同数なら語の辞書順。sorted のキーを (-回数, 語) にする",
    ("02", "q3"): "random.choices の weights に回数を渡す。次が無い語なら止める",
    ("02", "q4"): "数なら積む、ワードなら WORDS から引いてスタックを渡して呼ぶ",
    ("02", "b1"): "回数を 1/温度 乗して重みにする。低温ほど差が開く",
    ("02", "b2"): "鍵を2語の組にする。それ以外は bigram と同じ",
    ("03a", "q1"): "logits の最後の位置を取り、topk で上位を出す",
    ("03a", "q2"): "毎回いちばん確率の高い1語を選び、入力の末尾に足してもう一度通す",
    ("03a", "q3"): "logits を温度で割ってから top-k を残し、softmax して1語引く",
    ("03a", "q4"): "chat テンプレートを通してから生成し、応答の部分だけ切り出す",
    ("03b", "q1"): "数なら積む、+ - * / なら2つ取り出して結果を積む。順序に注意",
    ("03b", "q2"): "BUILTINS はワード名から関数への表。スタックを引数に取る",
    ("03b", "q3"): ": と ; の間を USER_WORDS に覚え、呼ばれたらその並びを実行する",
    ("03b", "q4"): "1行ずつ処理して結果を文字列で返す。スタックとワードは行をまたいで残す",
    ("03b", "b1"): "真は -1、偽は 0",
    ("03b", "b2"): "IF の位置から対応する ELSE / THEN を探す。入れ子は数を数えて対応づける",
}


def diagnose(task, qid, err=None):
    """落ちた項目について、学生の名前空間を見て助言を1行作る"""
    probe = _PROBES.get((task, qid))
    if probe is not None:
        try:
            msg = probe()
        except Exception:
            msg = ""
        if msg:
            return msg
    if err is not None and not isinstance(err, _Missing):
        for kind, msg in _BY_ERROR:
            if isinstance(err, kind):
                return msg
    return _HINTS.get((task, qid), "")

'''
