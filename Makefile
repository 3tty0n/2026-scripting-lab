DECKS := 01-basics 02-text 03a-llm 03b-forth
HANDOUTS := $(DECKS:%=src/%/handout.pdf)
BEAMERS := $(DECKS:%=src/%/beamer.pdf)

.PHONY: handouts beamer pdfs clean-handouts build serve jupyter-lite

build:
	npm run build

serve:
	npm run serve

jupyter-lite:
	npm run jupyter-lite

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md
	npx slidekit-handout $*

# Beamer (LuaLaTeX)。同じ slides.md から作る
beamer: $(BEAMERS)

src/%/beamer.pdf: src/%/slides.md tools/build-beamer.sh tools/beamer-prep.py tools/beamer-overflow.py tools/beamer-header.tex
	tools/build-beamer.sh $* $@

# レジュメ (A4) と Beamer を一度に作る
pdfs: handouts beamer

clean-handouts:
	rm -f $(HANDOUTS) $(BEAMERS)
