import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from _build import build
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
build(f"{ROOT}/exercises/03a_llm.ipynb", f"{HERE}/03a_llm.ipynb", {
"def top_candidates": '''def top_candidates(text, n=10):
    probs = torch.softmax(next_logits(encode(text)), dim=-1)
    top = torch.topk(probs, n)
    return [(tok.decode([int(i)]), float(p))
            for p, i in zip(top.values, top.indices)]


for t, p in top_candidates('むかしむかし、あるところに'):
    print(f'{t!r:20} {p:.4f}')''',

"def generate_greedy": '''def generate_greedy(prompt, max_new_tokens=40):
    ids = encode(prompt)
    for _ in range(max_new_tokens):
        logits = next_logits(ids)
        next_id = torch.argmax(logits)
        if next_id.item() == tok.eos_token_id:
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)
    return tok.decode(ids[0], skip_special_tokens=True)


print(generate_greedy('むかしむかし、あるところに'))''',

"def repetition_rate": '''from collections import Counter


def repetition_rate(text, n=3):
    words = text.split()
    grams = [tuple(words[i:i + n]) for i in range(len(words) - n + 1)]
    if not grams:
        return 0.0
    counts = Counter(grams)
    return sum(1 for g in grams if counts[g] >= 2) / len(grams)


out = generate_greedy('好きな食べ物は', 80)
print(out)
print('繰り返し率:', repetition_rate(out))''',

"def sample_next(logits": '''def sample_next(logits, temperature=0.8, k=50):
    probs = torch.softmax(logits / temperature, dim=-1)
    top = torch.topk(probs, k)
    idx = torch.multinomial(top.values, 1)
    return top.indices[idx]


def generate(prompt, max_new_tokens=60, temperature=0.8, k=50):
    ids = encode(prompt)
    for _ in range(max_new_tokens):
        next_id = sample_next(next_logits(ids), temperature, k)
        if next_id.item() == tok.eos_token_id:
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)
    return tok.decode(ids[0], skip_special_tokens=True)


for t in [0.3, 0.8, 1.5]:
    print(f'--- temperature = {t} ---')
    print(generate('プログラミングを学ぶと', max_new_tokens=40, temperature=t))
    print()''',

"def chat(messages": '''def chat(messages, max_new_tokens=60, temperature=0.7, k=50):
    prompt = tok.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True)
    ids = encode(prompt)
    start = ids.shape[1]
    for _ in range(max_new_tokens):
        next_id = sample_next(next_logits(ids), temperature, k)
        if next_id.item() in tok.all_special_ids:
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)
    return tok.decode(ids[0, start:], skip_special_tokens=True)


msgs = [
    {'role': 'system', 'content': 'あなたは簡潔に答えるアシスタントです。'},
    {'role': 'user', 'content': '日本の首都はどこですか？'},
]
print(chat(msgs))''',

"def chat_session": '''SYSTEM = '簡潔に答えてください。'


def chat_session(user_lines, max_new_tokens=40):
    history = [{'role': 'system', 'content': SYSTEM}]
    replies = []
    for line in user_lines:
        history.append({'role': 'user', 'content': line})
        reply = chat(history, max_new_tokens=max_new_tokens)
        replies.append(reply)
        history.append({'role': 'assistant', 'content': reply})
    return replies


print(chat_session(['犬と猫はどちらが好き？', 'なぜ？']))''',

"def sample_next_top_p": '''def sample_next_top_p(logits, temperature=0.8, p=0.9):
    probs = torch.softmax(logits / temperature, dim=-1)
    sp, si = torch.sort(probs, descending=True)
    mask = torch.cumsum(sp, dim=-1) - sp < p
    kept_p, kept_i = sp[mask], si[mask]
    return kept_i[torch.multinomial(kept_p, 1)]''',

"def apply_penalty": '''def apply_penalty(logits, used_ids, penalty=1.2):
    out = logits.clone()
    for i in set(used_ids):
        if out[i] > 0:
            out[i] = out[i] / penalty
        else:
            out[i] = out[i] * penalty
    return out


def generate_penalized(prompt, max_new_tokens=80, penalty=1.2, temperature=0.8):
    ids = encode(prompt)
    for _ in range(max_new_tokens):
        lg = apply_penalty(next_logits(ids), ids[0].tolist(), penalty)
        next_id = sample_next(lg, temperature, 50)
        if next_id.item() == tok.eos_token_id:
            break
        ids = torch.cat([ids, next_id.view(1, 1)], dim=1)
    return tok.decode(ids[0], skip_special_tokens=True)


out = generate_penalized('好きな食べ物は')
print(out)
print('繰り返し率:', repetition_rate(out))''',
})
