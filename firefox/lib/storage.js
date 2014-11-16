var storage = require('sdk/simple-storage').storage;

module.exports = {
  set: function(key, value) {
    try {
      storage[key] = value;
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  },
  get: function(key) {
    try {
      var val = storage[key];
      return Promise.resolve(val);
    } catch (e) {
      return Promise.reject(e);
    }
  },
  remove: function(key) {
    try {
      delete storage[key];
      return Promise.resolve();
    } catch (e) {
      return Promise.reject();
    }
  },
  clear: function() {
    try {
      Object.keys(storage).forEach(function(key) {
        delete storage[key];
      });

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  },
  getAll: function() {
    return Promise.resolve(storage);
  }
};