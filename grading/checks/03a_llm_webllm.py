"""第3回A (ブラウザ版) の検査項目。

課題3 (温度と top-k / top-p) と、発展課題の「部品となる純関数」を採点する。
モデルは呼ばないので、JupyterLite の中でも決定的に動く。
"""
CHECKS = [
    ('q3', '温度と top-k / top-p (課題3)', 20, [
        "need('sample_next', arity=3)",
        "need('sample_next_top_p', arity=3)",
        "import torch",
        "lg = torch.randn(100)",
        "for _ in range(5):",
        "    i = sample_next(lg, 0.8, 10)",
        "    assert isinstance(i, int) and 0 <= i < 100",
        "for _ in range(5):",
        "    i = sample_next_top_p(lg, 0.8, 0.9)",
        "    assert isinstance(i, int) and 0 <= i < 100",
        "for _ in range(5):",
        "    i = sample_next_top_p(lg, 0.8, 0.5)",
        "    assert isinstance(i, int) and 0 <= i < 100",
    ]),
    ('e1', '繰り返しの検出 (発展1)', 20, [
        "need('has_repeat', arity=2)",
        "assert has_repeat('I like cats. I like cats. Yes', 3)",
        "assert not has_repeat('the quick brown fox', 3)",
        "assert has_repeat('la la la', 1)",
        "assert not has_repeat('', 3)",
    ]),
    ('e2', 'コンテキストと圧縮 (発展2)', 20, [
        "need('estimate_tokens', arity=1)",
        "need('compact', arity=2)",
        "assert estimate_tokens([{'role': 'user', 'content': 'あいうえお'}]) >= 1",
        "msgs = [",
        "    {'role': 'system', 'content': 's'},",
        "    {'role': 'user', 'content': 'あ' * 200},",
        "    {'role': 'assistant', 'content': 'い' * 200},",
        "    {'role': 'user', 'content': 'う'},",
        "]",
        "c = compact(msgs, 50)",
        "assert c[0]['role'] == 'system'",
        "assert len(c) < len(msgs)",
    ]),
    ('e3', 'ストリーミング表示 (発展3)', 20, [
        "need('collect', arity=1)",
        "assert collect(['む', 'か', 'し']) == 'むかし'",
        "assert collect([]) == ''",
        "assert collect(['a', 'b', 'c']) == 'abc'",
    ]),
    ('e4', 'エフォート (発展4)', 20, [
        "need('EFFORT', kind=dict)",
        "assert set(EFFORT) == {'low', 'medium', 'high'}",
        "need('effort_opts', arity=1)",
        "o = effort_opts('high')",
        "assert 'max_tokens' in o and 'temperature' in o",
        "assert effort_opts('high')['max_tokens'] > effort_opts('low')['max_tokens']",
        "assert effort_opts('low')['temperature'] > effort_opts('high')['temperature']",
    ]),
]