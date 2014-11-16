var getURL = env.getURL;

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
  var self = this;

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

    xhr.open('GET', self.url(url), true);
    xhr.send();
  });
};