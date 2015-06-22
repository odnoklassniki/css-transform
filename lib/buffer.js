/**
 * Transformation pipeline for buffer-based Vinyl files
 */
'use strict';

var through = require('through2');
var duplexer = require('duplexer2');
var postcss = require('postcss');

module.exports = function(file, transform, options, done) {
	if (typeof options === 'function') {
		done = options;
		options = {};
	}

	try {
		file.css = postcss.parse(file.contents.toString('utf8'), {from: file.path});
	} catch(err) {
		return done(err);
	}

	file.stringify = stringify;

	transform.pipe(through.obj(function(file, enc, next) {
		if (file.css) {
			file.contents = new Buffer(file.stringify());
			delete file.css;
		}
		delete file.stringify;

		next();
		done(null, file);
	}));
	transform.write(file);
};

function stringify() {
	return this.css.toResult().toString();
}