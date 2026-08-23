import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from _build import build
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
build(f"{ROOT}/exercises/03b_forth.ipynb", f"{HERE}/03b_forth.ipynb", {
"for token in text.split():": '''def forth_eval(stack, text):
    for token in text.split():
        if token == '+':
            b, a = pop(stack), pop(stack); push(stack, a + b)
        elif token == '-':
            b, a = pop(stack), pop(stack); push(stack, a - b)
        elif token == '*':
            b, a = pop(stack), pop(stack); push(stack, a * b)
        elif token == '/':
            b, a = pop(stack), pop(stack); push(stack, a // b)
        elif token.lstrip('-').isdigit():
            push(stack, int(token))
        else:
            raise ValueError(f'知らないワード: {token}')


def run(text):
    s = stack_new()
    forth_eval(s, text)
    return s


print(run('3 4 + 2 *'))''',

"BUILTINS = {": '''import operator


def binop(f):
    def run_(stack):
        b = pop(stack)
        a = pop(stack)
        push(stack, f(a, b))
    return run_


def _dot(s):
    print(pop(s))


def _swap(s):
    b, a = pop(s), pop(s); push(s, b); push(s, a)


def _over(s):
    b, a = pop(s), pop(s)
    for x in (a, b, a):
        push(s, x)


def _rot(s):
    c, b, a = pop(s), pop(s), pop(s)
    for x in (b, c, a):
        push(s, x)


BUILTINS = {
    '+': binop(operator.add), '-': binop(operator.sub),
    '*': binop(operator.mul), '/': binop(operator.floordiv),
    '.': _dot,
    'DUP': lambda s: push(s, peek(s)),
    'DROP': lambda s: pop(s),
    'SWAP': _swap, 'OVER': _over, 'ROT': _rot,
}


def forth_eval(stack, text):
    for token in text.split():
        up = token.upper()
        if up in BUILTINS:
            BUILTINS[up](stack)
        elif token.lstrip('-').isdigit():
            push(stack, int(token))
        else:
            raise ValueError(f'知らないワード: {token}')''',

"USER_WORDS = {}": '''USER_WORDS = {}


def _find_else_then(tokens, start):
    """start から対応する ELSE / THEN の位置を返す"""
    depth, els = 0, None
    i = start
    while i < len(tokens):
        up = tokens[i].upper()
        if up == 'IF':
            depth += 1
        elif up == 'THEN':
            if depth == 0:
                return els, i
            depth -= 1
        elif up == 'ELSE' and depth == 0:
            els = i
        i += 1
    raise ValueError('対応する THEN がありません')


def forth_eval(stack, text):
    tokens = text.split() if isinstance(text, str) else text
    i = 0
    while i < len(tokens):
        token = tokens[i]
        up = token.upper()
        if token == ':':
            name = tokens[i + 1].upper()
            k = i + 2
            while tokens[k] != ';':
                k += 1
            USER_WORDS[name] = tokens[i + 2:k]
            i = k
        elif up == 'IF':
            cond = pop(stack)
            els, then = _find_else_then(tokens, i + 1)
            if cond != 0:
                forth_eval(stack, tokens[i + 1:els if els is not None else then])
            elif els is not None:
                forth_eval(stack, tokens[els + 1:then])
            i = then
        elif up in USER_WORDS:
            forth_eval(stack, USER_WORDS[up])
        elif up in BUILTINS:
            BUILTINS[up](stack)
        elif token.lstrip('-').isdigit():
            push(stack, int(token))
        else:
            raise ValueError(f'知らないワード: {token}')
        i += 1


USER_WORDS.clear()
print(run(': SQUARE DUP * ;  5 SQUARE'))''',

"def repl(lines):": '''def repl(lines):
    stack = stack_new()
    outputs = []
    for line in lines:
        if line.strip().lower() == 'bye':
            break
        try:
            forth_eval(stack, line)
            outputs.append(str(stack))
        except Exception as e:
            outputs.append('error: ' + str(e))
    return outputs


USER_WORDS.clear()
for out in repl(['3 4 +', '2 *', 'FOO', ': SQ DUP * ;', 'SQ', 'bye', '999']):
    print(out)''',

"# TODO: BUILTINS に追加": '''def _flag(f):
    return binop(lambda a, b: -1 if f(a, b) else 0)


BUILTINS['<'] = _flag(operator.lt)
BUILTINS['>'] = _flag(operator.gt)
BUILTINS['='] = _flag(operator.eq)''',

"# TODO: forth_eval に IF / ELSE / THEN を足す": '''# IF / ELSE / THEN は上の forth_eval に組み込み済み
print(run('1 IF 10 ELSE 20 THEN'), run('0 IF 10 ELSE 20 THEN'))''',
})
