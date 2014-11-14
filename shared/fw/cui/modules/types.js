var ui = require('ui');
var lib = require('lib');
var utils = require('utils');

var controls = ui.controls,
  utilsAttr = utils.attr,
  camel2css = utils.camel2css,
  elements = ui.elements,
  uiCache = ui.cache,
  hasOwn = Object.prototype.hasOwnProperty;

var ATTR_PREFIX = 'data-';

var defaultProp = ui.type.get(controls.element.properties[ui.DEFAULT_PROP]);
var defaultType = ui.type.get(ui.DEFAULT_TYPE);

exports.defaultProp = defaultProp;
exports.defaultType = defaultType;
exports.ATTR_PREFIX = ATTR_PREFIX;

var typedCache = exports.typedCache = function(type, control, name, value) {
  var data = uiCache(control.view);

  if (type) {
    name = name + '[' + type + ']';
  }

  if (typeof value === 'undefined') {
    return data[name];
  }

  return (data[name] = value);
};

var attrData = function(node, attr, value) {
  attr = ATTR_PREFIX + camel2css(attr);
  return utilsAttr(node, attr, value);
};

ui.type.define(ui.DEFAULT_TYPE, {
  factory: function(value) {
    return {
      _default: value
    }
  },
  set: defaultType.set,
  get: function(control, name) {
    var value = defaultType.get.call(this, control, name);

    if (value === void 0) {
      value = this._default;
    }

    return value;
  }
});

ui.type.define('string', {
  factory: function(string) {
    return {
      _default: (string != null ? string + '' : '')
    }
  },
  get: function(control, name) {
    var data = defaultType.get.call(this, control, name); // || typedCache('', control, name);

    // if (control.type === 'screen') debugger;

    if (data === void 0) {
      data = typedCache('string', control, name);

      if (typeof data === 'string') {
        return data;
      }

      if (typeof data !== 'string' && (data = attrData(control.view, name))) {
        typedCache('string', control, name, data);
      } else {
        data = this._default;
      }
    }

    return data;
  },
  set: function(control, name, value) {
    attrData(control.view, name, value);
    return typedCache('string', control, name, value);
  }
});

/*ui.type.define('string', {
  factory: function(string) {
    return {
      _default: (string != null ? string + '' : '')
    }
  },
  get: function(control, name) {
    return control.get('string:' + name);
  },
  set: function(control, name, value) {
    control.set('string:' + name, value);
  }
});*/

ui.type.define('number', {
  factory: function(number) {
    return {
      _default: typeof number === 'number' && isFinite(number) ? +number : 0
    };
  },
  get: function(control, name) {
    var number = typedCache('number', control, name);

    if (number) {
      return number;
    }

    if (number = +control.get('string:' + name)) {
      typedCache('number', control, name, number);

      return number;
    }

    return this._default;
  },
  set: function(control, name, value) {
    if (isNaN(value)) {
      return value;
    }

    attrData(control.view, name, value);

    return typedCache('number', control, name, value);
  }
});

ui.type.define('array', {
  factory: function(arr, delimiter) {
    return {
      _default: isArray(arr) ? arr : null,
      _delimiter: delimiter && delimiter.source ? delimiter : /\s*,\s*/ig
    };
  },
  get: function(control, name) {
    var value = typedCache('array', control, name) ||
        control.get('string:' + name);

    if (value && typeof value === 'string') {
      value = value.split(this._delimiter);
      typedCache('array', control, name, value);
    } else {
      value = isArray(value) ? value : this._default;
    }

    return value;
  },
  set: function(control, name, value) {
    if (!isArray(value)) return value;

    return typedCache('array', control, name, value);
  }
});

ui.type.define('boolean', {
  factory: function(bool) {
    return {
      _default: !!bool
    };
  },
  get: function(control, name) {
    var data;

    if (typeof (data = typedCache('boolean', control, name)) === 'boolean') {
      return data;
    } else {
      data = control.get('string:' + name);

      if (data || data === 'false' || data === 'true') {
        data = data !== 'false';
        typedCache('boolean', control, name, data);
      } else {
        data = this._default;
      }

      return data;
    }
  },
  set: function(control, name, value) {
    if (typeof value !== 'boolean') {
      value = !!value;
    }

    attrData(control.view, name, value);

    return typedCache('boolean', control, name, value);
  }
});

ui.type.define('json', {
  factory: function(data) {
    return {
      _default: data || null,
      _extend: function(data) {
        var _default = this._default;

        if (_default) {
          if (isArray(_default) && isArray(data)) {
            data = _default.concat(data);
          } else {
            data = lib.extend({}, _default, data);
          }
        }

        return data;
      }
    }
  },
  get: function(control, name) {
    var data = typedCache('json', control, name);

    if (!data) {
      data = control.get('string:' + name);

      try {
        data = JSON.parse(data);

        if (typeof data === 'number' && !isFinite(data)) {
          throw 1;
        }
      } catch (e) {
        data = null;
      }

      data = this._extend(data);
      typedCache('json', control, name, data);
    }

    return data;
  },
  set: function(control, name, value) {
    value = this._extend(value);
    return typedCache('json', control, name, value);
  }
});

ui.type.define('target', {
  factory: function() {
    return {
      _default: null
    };
  },
  get: function(control, name) {
    var target = control.get('string:' + name),
      fn,
      args;

    return new Promise(function(resolve, reject) {
      if (!target) {
        reject();
        return;
      }

      target = target.split(':');

      if (!target[0]) {
        fn = target[1];
        args = target.slice(2);
      } else {
        fn = 'id';
        args = [target[0]];
      }

      if (hasOwn.call(targetFunctions, fn)) {
        targetFunctions[fn].call(this, {
          control: control,
          name: name,
          callback: function(target) {
            resolve(target);
          },
          args: args
        });
      } else {
        reject();
      }
    });
  },
  set: function(control, name, target) {
    if (ui.is(target, 'element')) {
      target = target.get('id');
    } else if (typeof target !== 'string' || !hasOwn.call(elements, target)) {
      target = null;
    }

    if (target) {
      control.set(ui.DEFAULT_TYPE + ':' + name, target);
    }
  }
});

var getTargetByOffset = function(params, offset) {
  var callback = params.callback,
    index = (params.args[0] | 0) + offset,
    control = params.control,
    get = function() {
      return control.parent.children[control.index + index];
    },
    tmp;

  if (typeof callback === 'function') {
    if (tmp = get()) {
      callback.call(control, tmp);
    } else {
      var listenTarget = function(e, child) {
        if (child.index === control.index + index) {
          cleanUp();
          callback.call(control, child);
        }
      },
      cleanUp = function() {
        events.remove(control.parent.view, ui.events.childControl, listenTarget);
        events.remove(control.view, ui.events.destroy, cleanUp);
      };

      events.on(control.parent.view, ui.events.childControl, listenTarget);
      events.on(control.view, ui.events.destroy, cleanUp);
    }
  } else {
    return get() || null;
  }
};

var targetFunctions = {
  id: function(params) {
    var callback = params.callback,
      target = params.args[0],
      control = params.control;

    if (typeof callback === 'function') {
      if (hasOwn.call(elements, target)) {
        callback.call(control, elements[target]);
      } else {
        var listenTarget = function(node, control) {
          if (control.get('id') === target) {
            cleanUp();
            callback.call(control, control);
          }
        },
        cleanUp = function() {
          events.remove(ui.events.idControl, listenTarget);
          events.remove(control.view, ui.events.destroy, cleanUp);
        };

        events.on(ui.events.idControl, listenTarget);
        events.on(control.view, ui.events.destroy, cleanUp);
      }
    } else {
      return elements[target] || null;
    }
  },
  next: function(params) {
    return getTargetByOffset(params, 1);
  },
  prev: function(params) {
    return getTargetByOffset(params, -1);
  },
  parent: function(params) {
    var callback = params.callback,
      control = params.control,
      parent = control.parent || null;

    if (typeof callback === 'function') {
      callback.call(control, parent);
      return;
    }

    return parent;
  },
  child: function(params) {
    var callback = params.callback,
      index = (params.args[0] | 0),
      control = params.control,
      children = control.children,
      get = function() {
        return children[index];
      },
      tmp;

    if (typeof callback === 'function') {
      if (hasOwn(children, index)) {
        callback.call(this, get());
      } else {
        var listenTarget = function(e, child) {
          if (child.index === index) {
            cleanUp();
            callback.call(control, child);
          }
        },
        cleanUp = function() {
          events.remove(control.view, ui.events.childControl, listenTarget);
          events.remove(control.view, ui.events.destroy, cleanUp);
        };

        events.on(control.view, ui.events.childControl, listenTarget);
        events.on(control.view, ui.events.destroy, cleanUp);
      }
    } else {
      return get() || null;
    }
  },
  self: function(params) {
    var callback = params.callback,
      element = params.element;

    if (typeof callback === 'function') {
      callback.call(element, element);
      return;
    }

    return element;
  }
};