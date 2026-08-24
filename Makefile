DECKS := 01-basics 02-text 03a-llm 03b-forth
HANDOUTS := $(DECKS:%=%/handout.pdf)

.PHONY: handouts clean-handouts

handouts: $(HANDOUTS)

%/handout.pdf: %/slides.md assets/handout.tex tools/build-handout.sh
	tools/build-handout.sh $*

clean-handouts:
	rm -f $(HANDOUTS)
