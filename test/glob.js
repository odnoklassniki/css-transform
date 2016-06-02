var fs = require('fs');
var path = require('path');
var assert = require('assert');
var del = require('del');
var vfs = require('vinyl-fs');
var transform = require('../').stream;

function read(p) {
	return fs.readFileSync(path.join(__dirname, p), 'utf8');
}

function src(pattern, options) {
	return vfs.src(pattern, Object.assign({
		cwd: __dirname,
		base: __dirname,
	}, options));
}

function dest(dir) {
	return vfs.dest(path.join(__dirname, dir));
}

describe('Glob', function() {
	before(function(done) {
		del(['./out-stream', './out'], {cwd: __dirname}, done);
	});

	it('stream content', function(done) {
		src('./css/{file1,file2,blocks}.css', {buffer: false})
		.pipe(transform('/a/b'))
		.pipe(dest('out-stream'))
		.on('end', function() {
			assert.equal(read('out-stream/css/file1.css'), read('fixtures/file1.css'));
			assert.equal(read('out-stream/css/file2.css'), read('fixtures/file2.css'));
			// a pretty large file: make sure reader is properly resumed
			assert(read('out-stream/css/blocks.css'));
			done();
		});
	});

	it('buffer content', function(done) {
		src('./html/{file1,file2}.css')
		.pipe(transform('/a/b'))
		.pipe(dest('out'))
		.on('end', function() {
			assert.equal(read('out-stream/css/file1.css'), read('fixtures/file1.css'));
			assert.equal(read('out-stream/css/file2.css'), read('fixtures/file2.css'));
			done();
		});
	});
});
