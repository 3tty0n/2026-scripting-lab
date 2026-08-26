const slidekit = require('slidekit');

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  slidekit(eleventyConfig);
  eleventyConfig.addPassthroughCopy('style.css');
  eleventyConfig.addPassthroughCopy('assets');
  // Course extras, if you add them:
  // eleventyConfig.addPassthroughCopy('exercises');
  // eleventyConfig.addPassthroughCopy('grading');

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
