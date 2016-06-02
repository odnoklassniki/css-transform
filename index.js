'use strict';

const rewriteUrl = require('./lib/rewrite-url');
const parse = require('./lib/rewrite-url');

module.exports = rewriteUrl;
module.exports.stream = rewriteUrl.stream;
module.exports.parse = parse;
