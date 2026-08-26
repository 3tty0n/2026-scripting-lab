const fs = require('fs');
const decks = require('./src/_data/decks.json');

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy('style.css');
  eleventyConfig.addPassthroughCopy('grade.html');
  eleventyConfig.addPassthroughCopy('app.js');
  // 解答ノートは渡さない (exercises/solutions は gitignore)
  for (const name of fs.readdirSync('exercises')) {
    if (!name.endsWith('.ipynb')) continue;
    eleventyConfig.addPassthroughCopy({
      [`exercises/${name}`]: `exercises/${name}`,
    });
  }
  eleventyConfig.addPassthroughCopy('grading');
  for (const deck of decks) {
    const dir = `src/${deck.dir}`;
    const slides = `${dir}/slides.md`;
    if (!fs.existsSync(slides)) {
      throw new Error(`missing ${slides}`);
    }
    if (!fs.existsSync(`${dir}/index.njk`)) {
      throw new Error(`missing ${dir}/index.njk`);
    }
    eleventyConfig.addPassthroughCopy({ [slides]: `${deck.dir}/slides.md` });
    const handout = `${dir}/handout.pdf`;
    if (fs.existsSync(handout)) {
      eleventyConfig.addPassthroughCopy({ [handout]: `${deck.dir}/handout.pdf` });
    }
  }

  eleventyConfig.setTemplateFormats(['njk', 'html', 'liquid', '11ty.js']);
  eleventyConfig.ignores.add('**/node_modules/**');
  // slides.md はテンプレートではなく静的コピー
  eleventyConfig.ignores.add('**/slides.md');

  // 変更監視: slides / handout も rebuild 対象にする
  eleventyConfig.addWatchTarget('src/**/slides.md');
  eleventyConfig.addWatchTarget('src/**/handout.pdf');
  eleventyConfig.addWatchTarget('assets');

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: false,
  };
};
