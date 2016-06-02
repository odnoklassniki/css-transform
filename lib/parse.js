/**
 * Parses contents of given Vinyl file into PostCSS object model and stores it
 * as a `.css` property of file. Also replaces file contents with stream that
 * will stringify PostCSS model on-demand.
 *
 * Does nothing if file is a stream and already contains `.css` property
 */
'use strict';

const stream = require('stream');
const postcss = require('postcss');

module.exports = function(file, options) {
    if (file.isStream() && file.css) {
        return Promise.resolve(file);
    }

    return readFile(file)
    .then(content => {
        file.css = postcss.parse(content.toString(), {from: file.path});
        file.contents = stringify(file.css, options);
        return file;
    });
};

/**
 * Transform stream for parsing CSS in a stream of Vinyl files (Gulp/VinylFS)
 * @return {stream.Transform}
 */
module.exports.stream = function(options) {
    return new stream.Transform({
        objectMode: true,
        transform(file, enc, next) {
            module.exports(file, options).then(file => next(null, file), next);
        }
    });
};

/**
 * Reads content of given Vinyl file
 * @param  {Vinyl} file
 * @return {Promise}
 */
function readFile(file) {
    return new Promise((resolve, reject) => {
        var chunks = [];
        file.pipe(new stream.Transform({
            transform(chunk, enc, next) {
                chunks.push(chunk);
                next();
            },
            flush(next) {
                var content = Buffer.concat(chunks);
                this.push(content);
                resolve(content);
                next();
            }
        }));
    });
}

function stringify(model, options) {
	return new stream.Readable({
        read() {
            var content;
            try {
        		content = model.toResult().toString();
        	} catch(e) {
        		// possible error: invalid previous source map
                try {
                    content = model.toResult({map: false}).toString();
                } catch (e2) {
                    return this.emit('error', e2);
                }
        	}

            this.push(content);
            this.push(null);
        }
    });
}
