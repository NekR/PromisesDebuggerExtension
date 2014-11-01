var storage = require('shared/storage.js');
var ext = require('shared/ext.js');

var PREFS_KEY = 'prefs';
var PREFS_FILE = 'shared/prefs.json';

exports.Prefs = function(url) {
  this.url = url || PREFS_FILE;
  this.init();
};

exports.Prefs.prototype = {
  _prefs: null,
  init: function() {
    var self = this;

    this._prefs = storage.get(PREFS_KEY).then(function(prefs) {
      if (!prefs) return self.load();

      return prefs;
    }, function(err) {
      // do error log here

      return self.load();
    });
  },
  get: function(key) {
    return this._prefs.then(function(prefs) {
      return prefs[key];
    });
  },
  set: function(key, val) {
    return this._prefs.then(function(prefs) {
      prefs[key] = value;
      return storage.set(PREFS_KEY, prefs);
    });
  },
  getAll: function() {
    return this._prefs.then(function(prefs) {
      return prefs;
    });
  },
  load: function() {
    return ext.load(this.url).then(function(res) {
      if (!res) return null;

      res = res.replace(/\/\/([\s\S]+?)$/mg, '').trim();

      return JSON.parse(res);
    });
  }
};