SLIDEKIT := bin
DECKS := $(patsubst src/%/slides.md,%,$(wildcard src/*/slides.md))
HANDOUTS := $(DECKS:%=src/%/handout.pdf)

.PHONY: build serve jupyter-lite handouts clean-handouts

build:
	npm run build

serve:
	npm run serve

jupyter-lite:
	$(SLIDEKIT)/slidekit-jupyter-lite

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md
	$(SLIDEKIT)/slidekit-handout $*

clean-handouts:
	rm -f $(HANDOUTS)
