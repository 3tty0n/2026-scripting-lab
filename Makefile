DECKS := 06-basics 07-text 08-forth
HANDOUTS := $(DECKS:%=src/%/handout.pdf)
BEAMERS := $(foreach d,$(DECKS),src/$(d)/$(d)-beamer.pdf)

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

# 出力名は <回>-beamer.pdf。ダウンロードしても他の回と名前が重ならない
define BEAMER_RULE
src/$(1)/$(1)-beamer.pdf: src/$(1)/slides.md tools/build-beamer.sh tools/beamer-prep.py tools/beamer-overflow.py tools/beamer-header.tex
	tools/build-beamer.sh $(1) $$@
endef
$(foreach d,$(DECKS),$(eval $(call BEAMER_RULE,$(d))))

# レジュメ (A4) と Beamer を一度に作る
pdfs: handouts beamer

clean-handouts:
	rm -f $(HANDOUTS) $(BEAMERS)
