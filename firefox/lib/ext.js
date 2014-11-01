const { extRoot } = require('lib/loader');
const { readURI, readURISync } = require('sdk/net/url');

let getURL = function(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Bad argument');
  }

  if (!path.indexOf('/')) {
    return extRoot + path.replace(/^\/+/, '');
  }

  return extRoot + path.replace(/^([\/\.])*/, '');
};

exports.getURL = getURL;
exports.paths = {
  'lib/': getURL('lib/'),
  'data/': getURL('data/'),
  'shared/': getURL('data/shared/')
};

exports.loadSync = function(url) {
  return readURISync(this.url(url));
};

exports.load = function(url) {
  url = this.url(url);
  return readURI(url);
};