/**
 * Стандартный препроцессор CSS, который меняет ссылки 
 * на ресурсы внутри документа. Работает на основе конфига:
 * пути относительно `root` превращаются в абсолютные
 * и им добавляется `prefix`.
 * Полученный адрес может быть переработан методом `transform`. 
 */
var path = require('path');
var extend = require('xtend');
var through = require('through2');
var fileStats = require('../lib/file-stats');

var defaultConfig = {
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

function createConfig(config) {
	if (typeof config === 'function') {
		config = {transformUrl: config};
	}

	if (typeof config === 'string') {
		config = {prefix: config};
	}

	return extend(defaultConfig, config);
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

module.exports = function(config) {
	config = createConfig(config);

	return through.obj(function(file, enc, next) {
		var base = path.resolve(file.cwd, file.base);
		// rewrite properties
		file.css.eachDecl(function(decl) {
			decl.value = replaceUrl(decl.value, file, base, config);
		});

		// rewrite @import
		file.css.eachAtRule(function(rule) {
			if (rule.name === 'import') {
				rule.params = replaceUrl(rule.params, file, base, config);
			}
		});

		next(null, file);
	});
};

module.exports.config = defaultConfig;
module.exports.createConfig = createConfig;
module.exports.absoluteUrl = absoluteUrl;
module.exports.rebuildUrl = rebuildUrl;