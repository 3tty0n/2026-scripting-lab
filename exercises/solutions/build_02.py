import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from _build import build
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
build(f"{ROOT}/exercises/02_text.ipynb", f"{HERE}/02_text.ipynb", {
"def tokenize_file": '''import re


def tokenize_file(path):
    tokens = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.lstrip().startswith('#'):
                continue
            tokens.extend(re.findall(r"[a-z']+", line.lower()))
    return tokens


toks = tokenize_file('sample.txt')
print(len(toks), toks[:12])''',

"def build_table(tokens):": '''from collections import defaultdict, Counter


def build_table(tokens):
    table = defaultdict(Counter)
    for a, b in zip(tokens, tokens[1:]):
        table[a][b] += 1
    return table


table = build_table(tokenize_file('sample.txt'))
for w in ['i', 'the', 'like']:
    print(f'{w:6} -> {dict(table[w])}')''',

"def top_following": '''def top_following(table, word, n=5):
    if word not in table:
        return []
    items = table[word].items()
    return sorted(items, key=lambda kv: (-kv[1], kv[0]))[:n]


big_tokens = tokenize_file(BOOK)
big_table = build_table(big_tokens)
print(f'{len(big_tokens):,} 語 / 異なり語数 {len(set(big_tokens)):,}')
print('the の次:', top_following(big_table, 'the', 5))''',

"def pick_next(counter):": '''import random


def pick_next(counter):
    words = list(counter.keys())
    weights = list(counter.values())
    return random.choices(words, weights=weights)[0]


def generate(table, start, n=30):
    word = start
    result = [word]
    for _ in range(n):
        if word not in table or not table[word]:
            break
        word = pick_next(table[word])
        result.append(word)
    return ' '.join(result)


random.seed(0)
for _ in range(3):
    print(generate(big_table, 'the', 25))
    print()''',

"WORDS = {}": '''import operator

WORDS = {}


def word(name):
    def deco(func):
        WORDS[name] = func
        return func
    return deco


def _mk(f):
    def run(s):
        b, a = s.pop(), s.pop()
        s.append(f(a, b))
    return run


for _n, _f in [('+', operator.add), ('-', operator.sub),
               ('*', operator.mul), ('/', operator.floordiv)]:
    WORDS[_n] = _mk(_f)


@word('DUP')
def _(s):
    s.append(s[-1])


@word('DROP')
def _(s):
    s.pop()


@word('SWAP')
def _(s):
    b, a = s.pop(), s.pop()
    s.extend([b, a])


@word('OVER')
def _(s):
    b, a = s.pop(), s.pop()
    s.extend([a, b, a])


@word('ROT')
def _(s):
    c, b, a = s.pop(), s.pop(), s.pop()
    s.extend([b, c, a])


def evaluate(stack, text):
    for token in text.split():
        if token in WORDS:
            WORDS[token](stack)
        elif token.lstrip('-').isdigit():
            stack.append(int(token))
        else:
            raise ValueError(f'知らないワード: {token}')


def calc_rpn(text):
    s = []
    evaluate(s, text)
    return s


print(calc_rpn('3 4 + 2 *'))''',

"def pick_next_t": '''def pick_next_t(counter, temperature=1.0):
    words = list(counter.keys())
    weights = [c ** (1 / temperature) for c in counter.values()]
    return random.choices(words, weights=weights)[0]


def generate_t(table, start, n=30, temperature=1.0):
    word = start
    result = [word]
    for _ in range(n):
        if word not in table or not table[word]:
            break
        word = pick_next_t(table[word], temperature)
        result.append(word)
    return ' '.join(result)


random.seed(0)
for t in [0.2, 1.0, 3.0]:
    print(f'--- temperature = {t} ---')
    print(generate_t(big_table, 'the', 25, temperature=t))
    print()''',

"def build_table2": '''def build_table2(tokens):
    table = defaultdict(Counter)
    for a, b, c in zip(tokens, tokens[1:], tokens[2:]):
        table[(a, b)][c] += 1
    return table


def generate2(table, start_pair, n=30):
    a, b = start_pair
    result = [a, b]
    for _ in range(n):
        if (a, b) not in table or not table[(a, b)]:
            break
        c = pick_next(table[(a, b)])
        result.append(c)
        a, b = b, c
    return ' '.join(result)


big_table2 = build_table2(big_tokens)
random.seed(0)
print('bigram :', generate(big_table, 'the', 25))
print()
print('trigram:', generate2(big_table2, ('the', 'queen'), 25))''',
})
