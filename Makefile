DECKS := 01-basics 02-text 03a-llm 03b-forth
HANDOUTS := $(DECKS:%=src/%/handout.pdf)

.PHONY: handouts clean-handouts build serve

build:
	npm run build

serve:
	npm run serve

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md assets/handout.tex tools/build-handout.sh
	tools/build-handout.sh $*

clean-handouts:
	rm -f $(HANDOUTS)
