var fs = require('fs');
var path = require('path');
var assert = require('assert');
var del = require('del');
var vfs = require('vinyl-fs');
var transform = require('../').stream;

function read(filePath, isString) {
	return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
}

function src(pattern) {
	return vfs.src(pattern, {cwd: __dirname, base: __dirname});
}

function dest(dir) {
	return vfs.dest(path.join(__dirname, dir));
}

describe('CSS importer', function() {
	before(function(done) {
		del('./out', {cwd: __dirname}, done);
	});

	it('transform URLs', function(done) {
		src('./css/file1.css')
		.pipe(transform({prefix: '/a/b'}))
		.pipe(dest('./out'))
		.on('end', function() {
			assert.equal(read('out/css/file1.css'), read('fixtures/file1.css'));
			done();
		});
	});

	it('throw exception', function(done) {
		src('./css/error.css')
		.pipe(transform({prefix: '/a/b'}))
		.on('error', function(err) {
			assert(err);
			assert(err.message.indexOf('css/error.css') !== -1, 'Error contains file name');
			done();
		});
	});

	it('rewrite static assets', function(done) {
		src('./css/file2.css')
		.pipe(transform({
			prefix: '/a/b',
			transformUrl: function(url, file, ctx) {
				return ctx.stats ? '/-/' + ctx.stats.hash + url : url;
			},
			mode: 'xhtml'
		}))
		.pipe(dest('out'))
		.on('end', function() {
			assert.equal(read('out/css/file2.css'), read('fixtures/file2-custom-transform.css'));
			done();
		});
	});
});
