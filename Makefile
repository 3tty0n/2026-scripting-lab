DECKS := 01-basics 02-text 03a-llm 03b-forth
HANDOUTS := $(DECKS:%=src/%/handout.pdf)

.PHONY: handouts clean-handouts build serve jupyter-lite

build:
	npm run build

serve:
	npm run serve

jupyter-lite:
	npm run jupyter-lite

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md
	npx slidekit-handout $*

clean-handouts:
	rm -f $(HANDOUTS)
