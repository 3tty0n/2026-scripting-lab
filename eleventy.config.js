const fs = require('fs');
const slidekit = require('slidekit');

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  slidekit(eleventyConfig);

  eleventyConfig.addPassthroughCopy('style.css');
  eleventyConfig.addPassthroughCopy('grade.html');
  eleventyConfig.addPassthroughCopy('app.js');
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy('grading');
  for (const name of fs.readdirSync('exercises')) {
    if (!name.endsWith('.ipynb')) continue;
    eleventyConfig.addPassthroughCopy({
      [`exercises/${name}`]: `exercises/${name}`,
    });
  }
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
