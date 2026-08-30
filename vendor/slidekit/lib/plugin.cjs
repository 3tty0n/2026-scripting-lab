'use strict';

const { build, serve, discover } = require('./build.cjs');

module.exports = build;
module.exports.build = build;
module.exports.serve = serve;
module.exports.discover = discover;
