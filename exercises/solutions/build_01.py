import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from _build import build
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
build(f"{ROOT}/exercises/01_basics.ipynb", f"{HERE}/01_basics.ipynb", {
"print(f'呼び出し回数: {CALLS:,} 回 / {time.time() - t0:.2f} 秒')": '''CALLS = 0


def tarai(x, y, z):
    global CALLS
    CALLS += 1
    if x <= y:
        return y
    return tarai(tarai(x-1, y, z), tarai(y-1, z, x), tarai(z-1, x, y))


import time
CALLS = 0
t0 = time.time()
print('tarai(12, 6, 0) =', tarai(12, 6, 0))
print(f'呼び出し回数: {CALLS:,} 回 / {time.time() - t0:.2f} 秒')''',

"def distinct_args": '''def distinct_args(x, y, z):
    seen = set()

    def walk(x, y, z):
        seen.add((x, y, z))
        if x <= y:
            return y
        return walk(walk(x-1, y, z), walk(y-1, z, x), walk(z-1, x, y))

    walk(x, y, z)
    return len(seen)


print(distinct_args(10, 5, 0), distinct_args(12, 6, 0))''',

"OPS = {": '''import operator

OPS = {
    '+': operator.add, '-': operator.sub, '*': operator.mul,
    '/': operator.floordiv, '%': operator.mod, '**': operator.pow,
}


def calc(op, a, b):
    if op not in OPS:
        raise ValueError(f'知らない演算子: {op}')
    return OPS[op](a, b)


print(calc('+', 3, 4), calc('*', 3, 4), calc('**', 2, 10))''',

"def memo(func):": '''def memo(func):
    cache = {}

    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]

    wrapper.cache = cache
    return wrapper''',

"# TODO: 課題1 と同じ中身を、tarai_memo を呼ぶ形で書く": '''MEMO_CALLS = 0


@memo
def tarai_memo(x, y, z):
    global MEMO_CALLS
    MEMO_CALLS += 1
    if x <= y:
        return y
    return tarai_memo(tarai_memo(x-1, y, z), tarai_memo(y-1, z, x), tarai_memo(z-1, x, y))


import time
MEMO_CALLS = 0
t0 = time.time()
print('tarai_memo(12, 6, 0) =', tarai_memo(12, 6, 0))
print(f'呼び出し回数: {MEMO_CALLS:,} 回 / {time.time() - t0:.4f} 秒')''',

"COMMANDS = {}": '''COMMANDS = {}


def command(name):
    def deco(func):
        COMMANDS[name] = func
        return func
    return deco


def run(line):
    name, *args = line.split()
    if name not in COMMANDS:
        raise ValueError(f'知らない命令: {name}')
    return COMMANDS[name](*args)''',

"def trace(func):": '''def trace(func):
    depth = 0

    def wrapper(*args):
        nonlocal depth
        print('  ' * depth + f'{func.__name__}{args}')
        depth += 1
        try:
            r = func(*args)
        finally:
            depth -= 1
        print('  ' * depth + f'-> {r}')
        return r

    return wrapper


@trace
def tarai_t(x, y, z):
    if x <= y:
        return y
    return tarai_t(tarai_t(x-1, y, z), tarai_t(y-1, z, x), tarai_t(z-1, x, y))


print('結果:', tarai_t(3, 2, 1))''',

"def help_text():": '''import inspect


def help_text():
    lines = []
    for name in sorted(COMMANDS):
        f = COMMANDS[name]
        params = ' '.join(f'<{p}>' for p in inspect.signature(f).parameters)
        lines.append(f'{name} {params}'.ljust(28) + (f.__doc__ or ''))
    return '\\n'.join(lines)


print(help_text())''',
})
