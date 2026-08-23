#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

python3 -m pip install -q jupyterlite-core==0.8.3 jupyterlite-pyodide-kernel==0.8.5 jupyter-server

rm -rf _lite_contents lite .jupyterlite.doit.db
mkdir -p _lite_contents
cp exercises/01_basics.ipynb exercises/02_text.ipynb \
   exercises/03b_forth.ipynb _lite_contents/
cp grading/autograde.py grading/contracts.py grading/notebook.py _lite_contents/
cp -r grading/checks _lite_contents/checks
if [ -f alice.txt ]; then
  cp alice.txt _lite_contents/alice.txt
else
  curl -sL --max-time 60 https://www.gutenberg.org/files/11/11-0.txt \
    -o _lite_contents/alice.txt || rm -f _lite_contents/alice.txt
fi

jupyter lite build --contents _lite_contents --output-dir lite
rm -rf _lite_contents .jupyterlite.doit.db

echo
echo "Built JupyterLite: lite/"
echo "  python3 -m http.server 8000"
echo "  Open: http://127.0.0.1:8000/lite/lab/index.html"
