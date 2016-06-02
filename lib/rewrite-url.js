/**
 * Rewrites URLs in given CSS file on object level: resolves paths to
 * absolute from given `config.root` and adds `config.prefix` before it.
 */
'use strict';

const path = require('path');
const stream = require('stream');
const parse = require('./parse');
const fileStats = require('./file-stats');

const defaultConfig = {
	/**
	 * Prefix to add to rewritten url
	 */
	prefix: '',

	/**
	 * Check if given URL is valid for rewriting
	 * @param  {String}
	 * @return {Boolean}
	 */
	validUrl: function(url) {
		return !/^([a-z]+:)?\/\//i.test(url) && !/^data:/.test(url) && !/^#/.test(url);
	},

	/**
	 * Method is called right before rewritten URL is witten back
	 * to element attribute. Can be used to arbitrary change URL
	 * @param  {String} url  Rewritten URL
	 * @param  {File} file Vinyl file instance
	 * @param  {Object} ctx Context object used for transformation
	 * @return {String}
	 */
	transformUrl: function(url, file, ctx) {
		return url;
	}
};

module.exports = function(file, config) {
	config = createConfig(config);

    return parse(file, config)
    .then(file => {
        var base = config.baseDir || path.resolve(file.cwd, file.base);
		// rewrite properties
		file.css.walkDecls(function(decl) {
			decl.value = replaceUrl(decl.value, file, base, config);
		});

		// rewrite @import
		file.css.walkAtRules(function(rule) {
			if (rule.name === 'import') {
				rule.params = replaceUrl(rule.params, file, base, config);
			}
		});

        return file;
    });
};

module.exports.stream = function(config) {
    return new stream.Transform({
        objectMode: true,
        transform(file, enc, next) {
            module.exports(file, config)
            .then(file => next(null, file), next);
        }
    });
};

module.exports.config = defaultConfig;
module.exports.createConfig = createConfig;
module.exports.absoluteUrl = absoluteUrl;
module.exports.rebuildUrl = rebuildUrl;

function createConfig(config) {
	if (typeof config === 'function') {
		config = {transformUrl: config};
	}

	if (typeof config === 'string') {
		config = {prefix: config};
	}

	return Object.assign({}, defaultConfig, config);
}

/**
 * Returns absolute URL for given resource
 * @param  {String} url       URL to resolve (for example, value of <img src="">)
 * @param  {String} parentUrl Path to parent file that refers `url`
 * @param  {String} root      Path to document root.
 * @return {String}
 */
function absoluteUrl(url, parentUrl, root) {
	if (url[0] === '/') {
		return url;
	}

	var urlParts = url.split('#');
	var out = path.normalize(path.join(path.dirname(parentUrl), urlParts[0]));
	// console.log('out', out);
	if (out.substr(0, root.length) === root) {
		out = out.substr(root.length);
		// console.log('trim root', root, out);
		if (out[0] !== '/') {
			out = '/' + out;
		}
	}

	urlParts[0] = out;
	return urlParts.join('#');
}

/**
 * Переделывает указанный URL: добавляет к нему `prefix` и следит
 * за «чистотой» адреса
 * @param  {String} url
 * @param  {String} prefix
 * @return {String}
 */
function rebuildUrl(url, prefix) {
	if (prefix) {
		url = path.join(prefix, url).replace(/\/{2,}/g, '/');
	}

	return url;
}

function replaceUrl(str, file, base, config) {
	return str.replace(/url\((['"]?)(.+?)\1\)/g, function(str, quote, url) {
		var targetUrl = url.trim();
		if (config.validUrl(targetUrl)) {
			var absUrl = absoluteUrl(targetUrl, file.path, base);
			targetUrl = rebuildUrl(absUrl, config.prefix);
			if (config.transformUrl) {
				targetUrl = config.transformUrl(targetUrl, file, {
					clean: absUrl,
					config: config,
					type: 'css',
					stats: fileStats(absUrl, file, config)
				});
			}
		}

		return 'url(' + quote + targetUrl + quote + ')';
	});
}
