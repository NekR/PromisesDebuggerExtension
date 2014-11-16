module.exports = {
  set: function(key, value) {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (e) {
      return Promise.reejct(e);
    }
  },
  get: function(key) {
    try {
      var val = localStorage.getItem(key);
      return Promise.resolve(val);
    } catch (e) {
      return Promise.reejct(e);
    }
  },
  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (e) {
      return Promise.reejct();
    }
  },
  clear: function() {
    try {
      localStorage.clear();
      return Promise.resolve();
    } catch (e) {
      return Promise.reejct();
    }
  },
  getAll: function() {
    try {
      var all = Object.keys(localStorage).reduce(function(result, key) {
        result[key] = localStorage.getItem(key);

        return result;
      }, {});

      return Promise.resolve(all);
    } catch (e) {
      return Promise.reject(e);
    }
  }
};