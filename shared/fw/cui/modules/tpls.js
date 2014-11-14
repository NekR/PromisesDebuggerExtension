var ui = require('ui');
var types = require('types');
var typedCache = types.typedCache;

var exports = {
  store: new Map(),
  register: function(name, templater) {
    this.store.set(name, {
      compile: templater.compile,
      register: templater.register,
      get: function(tpl) {
        return {
          compile: function(data) {
            return templater.compile(tpl, data);
          }
        };
      }
    });

    if (templater.default) {
      this.setDefault(name);
    }
  },
  setDefault: function(name) {
    this.default = this.store.get(name);
  }
};

ui.type.define('tpl', {
  factory: function(number) {
    return {
      _default: null
    };
  },
  get: function(control, name, key) {
    if (!key) {
      key = 'main';
    }

    var tpl = typedCache('tpl', control, name);
    var picked;

    if (tpl) {
      picked = tpl[key] + '';
    } else if (tpl = control.get('json:' + name)) {
      typedCache('tpl', control, name, tpl);
      picked = tpl[key] + '';
    } else if (tpl = control.get('string:' + name)) {
      tpl = {
        main: tpl
      };

      typedCache('tpl', control, name, tpl);
      picked = tpl[key];
    } else {
      picked = this._default;
    }

    if (!picked) {
      return null;
    }

    var templater = exports.default;

    return templater.get(picked);
  },
  set: function(control, name, value) {
    typedCache('tpl', control, name, value);
    return value;
  }
});