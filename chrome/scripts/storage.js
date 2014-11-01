var lastError = function() {
  return chrome.runtime.lastError;
};

module.exports = {
  set: function(key, value) {
    var pass = {};

    pass[key] = value;

    return new Promise(function(resolve, reject) {
      chrome.storage.local.set(pass, function() {
        if (lastError()) {
          reject(lastError());
          return;
        }

        resolve();
      });
    });
  },
  get: function(key) {
    if (typeof key !== 'string') {
      return Promise.reject(new TypeError('Bad argument'));
    }

    return new Promise(function(resolve, reject) {
      chrome.storage.local.get(key, function(items) {
        if (lastError()) {
          reject(lastError());
          return;
        }

        resolve(items[key]);
      });
    });
  },
  remove: function(key) {
    return new Promise(function(resolve, reject) {
      chrome.storage.local.remove(key, function() {
        if (lastError()) {
          reject(lastError());
          return;
        }

        resolve();
      });
    });
  },
  getAll: function() {
    return new Promise(function(resolve, reject) {
      chrome.storage.get(null, function(items) {
        if (lastError()) {
          reject(lastError());
          return;
        }

        resolve(items);
      });
    });
  },
};