SLIDEKIT := bin
DECKS := $(shell node -p "JSON.parse(require('fs').readFileSync('src/_data/decks.json','utf8')).map(d=>d.dir).join(' ')")
HANDOUTS := $(DECKS:%=src/%/handout.pdf)

.PHONY: build serve lite handouts clean-handouts

build:
	npm run build

serve:
	npm run serve

lite:
	$(SLIDEKIT)/slidekit-lite

handouts: $(HANDOUTS)

src/%/handout.pdf: src/%/slides.md
	$(SLIDEKIT)/slidekit-handout $*

clean-handouts:
	rm -f $(HANDOUTS)
