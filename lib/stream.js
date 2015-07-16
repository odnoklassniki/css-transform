/**
 * Transformation pipeline for stream-based Vinyl files
 */
'use strict';

var through = require('through2');
var postcss = require('postcss');
var readContents = require('./read-contents');

/**
 * Returns a transformaton stream that applies content transformations from
 * `transform` stream to `file` contents
 * Applies `transform` stream on given stream-content Vinyl file instance
 * @param  {Vinyl} file Vinyl file instance to transform
 * @param  {stream.Transform} transform Transformation stream for file
 * is ready 
 */
module.exports = function(file, transform) {
	return readContents(function(contents, callback) {
		var f = file.clone();
		f.contents = contents;
		f.stringify = stringify;
		try {
			f.css = postcss.parse(f.contents.toString(), {from: f.path});
		} catch(err) {
			return callback(err);
		}

		// transform file content on tree level
		var self = this;
		transform
		.once('finish', function() {
			// write transformed tree as file content
			self.push(f.css ? new Buffer(f.stringify()) : f.contents);
			callback();
		})
		.end(f);
	});
}

function stringify() {
	return this.css.toResult().toString();
}