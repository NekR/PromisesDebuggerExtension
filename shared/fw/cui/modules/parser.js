var ui = require('ui'),
  utils = require('utils'),
  lib = require('lib'),
  types = require('types');

var parsers = [],
  isArray = Array.isArray,
  lastParsedContols = null,
  controls = ui.controls,
  elements = ui.elements,
  hasOwn = Object.prototype.hasOwnProperty;

var addMountPoint = function(params) {
  var resolveMount;
  var promise = new Promise(function(resolve) {
    resolveMount = resolve
  });

  (params.capture || (params.capture = {}))[MOUNT_POINT] = promise;

  return resolveMount;
};

var exports = {
  events: events.map([
    'mounted',
    'iterate',
    'add',
    'parse',
    'reparse',
    'reparseend',
    'insert',
    'show',
    'setState',
    'parsed',
    'parseComplete',
    'beforeCompile',
  ]),
  currentParser: function() {
    return parsers.length ? parsers[parsers.length - 1] : null;
  },
  breakCurrent: function() {
    var parser = exports.currentParser();

    if (parser) {
      parser.breakCurrent();
    }
  },
  lastParsed: function() {
    return lastParsedContols || [];
  },
  trackParser: function(parser) {
    if (!parser.transformed) {
      parsers.push(parser);

      parser.promise.then(function(control) {
        parsers.pop();
      });
    }
  },

  parse: function(root, params) {
    if (isArray(root)) {
      var list = [],
        i = 0,
        len = root.length;

      for (; i < len; i++) {
        list.push(parseSingle(root[i], params));
      }

      return Promise.all(lastParsedContols = list);
    }

    return Promise.all(lastParsedContols = [parseSingle(root, params)]);
  },
  parseSingle: function(root, params) {
    var handler;

    exports.registered.some(function(parser) {
      var checked = parser.check(root);

      if (checked) {
        handler = parser.parse;
        return true;
      }
    });

    if (!handler) {
      return Promise.reject(new Error('No parser'));
    }

    if (params && !params.parent) {
      var mount = addMountPoint(params);
    }

    var parser = handler(root, params);

    if (mount) {
      parser.promise.then(function() {
        mount();
      });
    }

    return parser.promise;
  },
  render: function(content, params) {
    var handler;

    exports.registered.some(function(parser) {
      var checked = parser.check(content);

      if (checked) {
        handler = parser.render;
        return true;
      }
    });

    if (!handler) {
      return Promise.reject(new Error('No renderer'));
    }

    var mount = addMountPoint(params);
    var parser = handler(content, params);

    parser.promise.then(function() {
      mount();
    });

    return parser.promise;
  },
  insert: function(content, params) {
    var handler;

    exports.registered.some(function(parser) {
      var checked = parser.check(content);

      if (checked) {
        handler = parser.insert;
        return true;
      }
    });

    if (!handler) {
      return Promise.reject(new Error('No renderer'));
    }

    var mount = addMountPoint(params);
    var parser = handler(content, params);

    parser.promise.then(function() {
      mount();
    });

    return parser.promise;
  },
  getControlNode: function(control, element) {
    var node = (control.prototype.base || '') + '';

    if (!node || element.matches(node)) {
      return element;
    } else {
      return element.querySelector(node);
    }
  },
  getControlClass: function(type) {
    var ControlClass = null;
    var _classes;
    var _class = /*type2class*/(type || '')
      .replace(/\s+/, exports.CONTROL_TYPES_SEPARATOR);

    if (hasOwn.call(controls, _class)) {
      ControlClass = controls[_class];
    } else {
      types = _class && _class.split(exports.CONTROL_TYPES_SEPARATOR);
      _classes = types && types.length > 1;
      _classes = _classes && types.filter(function(type) {
        return hasOwn.call(controls, type);
      });
      
      if (_classes && _classes.length) {
        type = /*types.join(CONTROL_TYPES_SEPARATOR);
        */_class = _classes.join(exports.CONTROL_TYPES_SEPARATOR);

        ControlClass = controls[_class] || (controls[_class] = utils.inherits({
          parent: controls[_classes.shift()],
          mixins: _classes.map(function(type) {
            return controls[type];
          }),
          name: _class
        }));
      }
    }

    return {
      type: type,
      class: ControlClass
    };
  },

  registered: [],

  MOUNT_POINT: 'parser:mountPoint',
  CONTROL_TYPES_SEPARATOR: '_'
};

var parseSingle = exports.parseSingle;
var getControlNode = exports.getControlNode;
var MOUNT_POINT = exports.MOUNT_POINT;

var typedCache = types.typedCache,
  OriginalElement = controls.element,
  defaultProp = types.defaultProp,
  defaultType = types.defaultType;

exports.OriginalElement = OriginalElement;

var properties = {
  auto: 'number',
  length: 'number',
  params: 'json',
  options: 'json',
  errors: 'json',
  id: {
    type: 'string',
    get: function(control, name) {
      var id = typedCache(this.type, control, name) || control.view.id ||
        ui.types.string.get.call(this, control, name);

      return id;
    },
    set: function(control, name, value) {
      var id = control.get(name);

      if (value === id) return;

      if (id && hasOwn.call(elements, id)) {
        elements[id] = null;
      }

      typedCache(this.type, control, name, value);
      elements[value] = control;

      // return ui.types.string.set.call(this, control, name, value);
    }
  },
  name: {
    type: 'string',
    set: function(control, name, value) {
      var nameProp = control.get(name),
        parent,
        children;

      if (value === nameProp) return;

      parent = control.parent;
      children = parent && parent.children;

      if (children && hasOwn.call(children, nameProp)) {
        children[nameProp] = null;
      }

      if (parent) {
        children[value] = control;
      }

      return ui.types.string.set.call(this, control, name, value);
    }
  },
  target: 'target',
  control: 'string',
  source: 'string'
};

properties[ui.DEFAULT_PROP] = {
  get: ui.types.string.get,
  set: defaultProp.set
};

var fakeElementProto = {
  render: function(content) {
    var len = this.children.length;

    if (!content && len) return;

    if (len) {
      this.destroy({
        onlyChildren: true
      });
    }

    return exports.render(content, {
      parent: this
    });
  }
};

fakeElementProto.insert = function(content, customParams) {
  var self = this,
    params = {
      parent: self
    },
    index;

  customParams && (params = lib.extend(customParams, params));

  return exports.insert(content, params);
};

[
  {
    key: 'after',
    delta: 1
  }, {
    key: 'before',
    delta: 0
  }
].forEach(function(method) {
  var delta = method.delta,
    key = method.key;

  fakeElementProto[key] = function(content, customParams) {
    (customParams || (customParams = {})).index = this.index + delta

    return this.parent.insert(content, customParams);
  };
});

[
  {
    key: 'append'
  }, {
    key: 'prepend',
    index: 0
  }
].forEach(function(method) {
  var key = method.key;

  fakeElementProto[key] = function(content, customParams) {
    (customParams || (customParams = {})).index = method.index;

    return this.insert(content, customParams);
  };
});

controls.element = utils.inherits({
  parent: OriginalElement,
  handler: function FakeElement(node, params) {
    var self = this;

    if (!this.get('control').trim()) {
      this.set('control', params && params.type || this.type);
    }

    events.register(this, exports.events.mounted, function(event) {
      self.get('capture', MOUNT_POINT).then(function() {
        setTimeout(function() {
          events.fire(self, event);
        }, 1);
      });
    });
  },
  proto: fakeElementProto,
  meta: {
    properties: ui.handleProperties(properties)
  }
});