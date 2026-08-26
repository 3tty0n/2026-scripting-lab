const fs = require('fs');
const path = require('path');

const KIT = __dirname;
const DECK_PAGE = fs.readFileSync(path.join(KIT, 'templates/deck.njk'), 'utf8');
const HOME_LAYOUT = fs.readFileSync(path.join(KIT, 'templates/home.njk'), 'utf8');

/**
 * Reveal + Markdown デッキの Eleventy プラグイン。
 * コース側: src/_data/decks.json と src/<dir>/slides.md
 */
function slidekit(eleventyConfig, opts = {}) {
  const cwd = opts.root || process.cwd();
  const src = opts.src || 'src';
  const decksFile = opts.decksFile || path.join(cwd, src, '_data/decks.json');
  const decks = opts.decks || JSON.parse(fs.readFileSync(decksFile, 'utf8'));

  eleventyConfig.addPassthroughCopy({
    [path.join(KIT, 'assets')]: 'assets',
    [path.join(KIT, 'runtime')]: 'runtime',
    [path.join(KIT, 'contrib')]: 'contrib',
  });

  eleventyConfig.setTemplateFormats(['njk', 'html', 'liquid', 'md', '11ty.js']);
  eleventyConfig.ignores.add('**/slides.md');
  eleventyConfig.addTemplate('_includes/slidekit-home.njk', HOME_LAYOUT);

  const srcDir = path.join(cwd, src);
  const hasIndex = ['index.md', 'index.njk', 'index.html'].some((f) =>
    fs.existsSync(path.join(srcDir, f)),
  );
  if (!hasIndex) {
    eleventyConfig.addTemplate('index.md', '---\nlayout: slidekit-home\npermalink: /\n---\n');
  }
  eleventyConfig.addWatchTarget(path.join(KIT, 'assets'));
  eleventyConfig.addWatchTarget(path.join(KIT, 'runtime'));
  eleventyConfig.addWatchTarget(path.join(KIT, 'contrib'));
  eleventyConfig.addWatchTarget(path.join(cwd, src, '**/slides.md'));
  eleventyConfig.addWatchTarget(path.join(cwd, src, '**/handout.pdf'));

  const liteCache = opts.liteCache || path.join(cwd, '.cache/jupyterlite');
  if (fs.existsSync(liteCache)) {
    eleventyConfig.addPassthroughCopy({ [liteCache]: 'lite' });
    eleventyConfig.addWatchTarget(liteCache);
  }

  for (const deck of decks) {
    const dir = path.join(cwd, src, deck.dir);
    const slides = path.join(dir, 'slides.md');
    if (!fs.existsSync(slides)) {
      throw new Error(`slidekit: missing ${slides}`);
    }
    eleventyConfig.addPassthroughCopy({ [slides]: `${deck.dir}/slides.md` });
    const handout = path.join(dir, 'handout.pdf');
    if (fs.existsSync(handout)) {
      eleventyConfig.addPassthroughCopy({ [handout]: `${deck.dir}/handout.pdf` });
    }
    eleventyConfig.addTemplate(`${deck.dir}.njk`, DECK_PAGE, {
      permalink: `/${deck.dir}/`,
      title: deck.title,
      code: deck.code || 'none',
      model: deck.model || '',
      models: Array.isArray(deck.models) ? deck.models.join(',') : (deck.models || ''),
    });
  }
}

module.exports = slidekit;
