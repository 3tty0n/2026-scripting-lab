#!/usr/bin/env python3
"""Beamer の PDF で、内容が下 (フッタ) にはみ出したページ番号をカンマ区切りで出す。

使い方: beamer-overflow.py FILE.pdf     (pdftotext が無ければ何も出さない)
ページ番号の「n/N」だけのフッタの語は数えない。
"""
import re
import shutil
import subprocess
import sys


def main():
    if not shutil.which('pdftotext'):
        return
    out = subprocess.run(['pdftotext', '-bbox', sys.argv[1], '-'],
                         capture_output=True, text=True).stdout
    bad = []
    for n, page in enumerate(out.split('<page ')[1:], 1):
        height = float(re.search(r'height="([\d.]+)"', page).group(1))
        ys = [float(m.group(1)) for m in re.finditer(
            r'<word xMin="[\d.]+" yMin="[\d.]+" xMax="[\d.]+" yMax="([\d.]+)">([^<]*)', page)
            if not re.fullmatch(r'\d+/\d+', m.group(2))]
        if ys and max(ys) > height * 0.93:
            bad.append(n)
    print(','.join(map(str, bad)))


if __name__ == '__main__':
    main()
