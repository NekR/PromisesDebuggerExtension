var ext = require('lib/ext');
var keys = Object.keys(ext.paths).sort();

var extUrl = function(url) {
  if (typeof url !== 'string') {
    throw new TypeError('Bad argument');
  }

  var pathFound = keys.some(function(path) {
    if (!url.indexOf(path)) {
      var prefix = ext.paths[path];

      url = prefix + url.slice(path.length);
      return true;
    }
  });

  if (pathFound) {
    return url;
  }

  return ext.getURL(url);
};

module.exports = {
  url: extUrl,
  load: ext.load,
  loadSync: ext.loadSync,
  paths: ext.paths,
  getURL: ext.getURL
};