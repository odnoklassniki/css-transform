/**
 * Transformation pipeline for stream-based Vinyl files
 */
'use strict';

var through = require('through2');
var duplexer = require('duplexer2');
var postcss = require('postcss');

/**
 * Applies `transform` stream on given stream-content Vinyl file instance
 * @param  {Vinyl} file Vinyl file instance to transform
 * @param  {stream.Transform} transform Transformation stream for file content
 * @param  {Object} options DOM parsing options
 * @param  {Function} done Callback function, invoked when transformation
 * is ready 
 */
module.exports = function(file, transform, options, done) {
	if (typeof options === 'function') {
		done = options;
		options = {};
	}

	var buf = null;
	// read file completely then parse it into tree
	file.contents = file.contents.pipe(through(function(chunk, enc, next) {
		buf = buf ? Buffer.concat([buf, chunk]) : chunk;
		next();
	}, function(complete) {
		var self = this;
		
		try {
			file.css = postcss.parse(buf.toString('utf8'), {from: file.path});
		} catch(err) {
			return done(err);
		}

		file.stringify = stringify;

		// transform file content on tree level
		transform.pipe(through.obj(function(file, enc, next) {
			if (file.css) {
				buf = new Buffer(file.stringify());
				delete file.css;
			}
			delete file.stringify;
			next();

			// write transformed tree as file content
			self.push(buf);
			buf = null;
			complete();

			done(null, file);
		}));

		transform.write(file);
	}));

};

function stringify() {
	return this.css.toResult().toString();
}