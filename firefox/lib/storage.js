var storage = require('sdk/simple-storage').storage;

module.exports = {
  set: function(key, value) {
    try {
      storage[key] = value;
      return Promise.resolve();
    } catch (e) {
      return Promise.reejct(e);
    }
  },
  get: function(key) {
    try {
      var val = storage[key];
      return Promise.resolve(val);
    } catch (e) {
      return Promise.reejct(e);
    }
  },
  remove: function(key) {
    try {
      delete storage[key];
      return Promise.resolve();
    } catch (e) {
      return Promise.reejct();
    }
  },
  getAll: function() {
    return Promise.resolve(storage);
  }
};