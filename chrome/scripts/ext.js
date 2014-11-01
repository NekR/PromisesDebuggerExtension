var getURL = function(path) {
  return chrome.runtime.getURL(path);
};

exports.getURL = getURL;

exports.paths = {
  'data/': getURL('data/'),
  'lib/': getURL('scripts/'),
  'shared/': getURL('shared/')
};

exports.loadSync = function(url) {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', this.url(url), false);
  xhr.send();

  return xhr.response;
};

exports.load = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    var loaded = false;

    xhr.onload = function() {
      loaded = true;
      resolve(xhr.response);
    };

    xhr.onloadend = function() {
      if (loaded) return;
      reject();
    };

    xhr.open('GET', this.url(url), true);
    xhr.send();
  })
};