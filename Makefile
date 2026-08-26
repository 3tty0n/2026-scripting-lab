DECKS := 01-basics 02-text 03a-llm 03b-forth
HANDOUTS := $(DECKS:%=src/%/handout.pdf)

.PHONY: handouts clean-handouts build serve lite

build:
	npm run build

serve:
	npm run serve

lite:
	npm run lite

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md
	npx slidekit-handout $*

clean-handouts:
	rm -f $(HANDOUTS)
