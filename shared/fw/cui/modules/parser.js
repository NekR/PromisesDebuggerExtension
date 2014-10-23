var ui = require('ui'),
  utils = require('utils'),
  lib = require('lib'),
  // Stack of parsers
  parsers = [],
  slice = Array.prototype.slice,
  isArray = Array.isArray,
  globalCapture = {},
  lastParsedContols = null,
  type2class = utils.type2class,
  utilsAttr = utils.attr,
  camel2css = utils.camel2css,
  controls = ui.controls,
  elements = ui.elements,
  uiStates = ui.states,
  uiCache = ui.cache,
  uiControl = ui.control,
  //hasOwn = Function.call.bind(Object.prototype.hasOwnProperty),
  hasOwn = Object.prototype.hasOwnProperty;

var exports = {
  events: events.getMap(module.name, [
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
  create: function(control, tag) {
    (tag && tag.nodeType === Node.ELEMENT_NODE) ||
      (tag = document.createElement('div'));

    tag.setAttribute(CONTROLS_ATTR, control);
    return tag;
  },
  parse: function parse(root, params) {
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
  parseFromString: function(str, options, beforeParse) {
    var items = [],
      fragment = utils.html2fragment(str, function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          items.push(node);
        }
      });

    if (typeof beforeParse === 'function') {
      beforeParse(fragment);
    }

    // events.fire(exports.events.parse, items, options);
    exports.parse(items, options);
    items = exports.lastParsed();

    return items;
  },
  currentNode: function() {
    return parsers.length ? parsers[parsers.length - 1] : null;
  },
  breakCurrent: function() {
    var node = exports.currentNode();

    if (node) {
      node.children = [];
    }
  },
  lastParsed: function() {
    return lastParsedContols || [];
  }
};

var CONTROL_TYPES_SEPARATOR = '_',
  CONTROLS_SELECTOR = '[data-control]',
  CONTROLS_ATTR = 'data-control',
  ATTR_PREFIX = 'data-';

var parseSingle = function(root, params) {
  var list = root.querySelectorAll(CONTROLS_SELECTOR),
    tree = createNodeTree(root, list, params && params.parent);

  return parseTree(tree, params);
},
createNodeTree = function(root, list, parent) {
  list = slice.call(list, 0);

  var last = root = {
      element: root,
      parent: {
        element: parent || null,
        children: [],
        parent: null
      },
      children: []
    },
    parents = [],
    i = 0,
    target,
    position,
    item,
    lastParent;

  for (; i < list.length; i++) {
    if (!(target = list[i])) continue;

    if (last) {
      position = target.compareDocumentPosition(last.element);

      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        lastParent = parents.length && parents[parents.length - 1];

        if (position & Node.DOCUMENT_POSITION_CONTAINS) {
          parents.push(lastParent = last);
        } else {
          while (lastParent && !lastParent.element.contains(target)) {
            parents.pop();
            lastParent = parents.length && parents[parents.length - 1];
          }
        }

        last = {
          element: target,
          parent: lastParent,
          children: []
        };

        if (lastParent) {
          lastParent.children.push(last);
        } else {
          console.error('has no last parent, some thing wrong');
        }
      } else if (position & Node.DOCUMENT_POSITION_DISCONNECTED) {
        console.error('disconnected');
      } else {
        console.error('unknown');
      }
    }
  }

  last = parents = item = target = null;

  return root;
},
parseTree = function(node, params) {
  init: if (!uiControl(element = node.element)) {
    params || (params = {});
    parent = params.parent || node.parent && node.parent.element;

    if (parent) {
      parent = uiControl(parent);
    }

    type = element.getAttribute(CONTROLS_ATTR);
    _class = /*type2class*/(type || '').replace(/\s+/, CONTROL_TYPES_SEPARATOR);
    types = _class && _class.split(CONTROL_TYPES_SEPARATOR);

    if (!type || !hasOwn.call(controls, _class)) {
      if (types && types.length > 1 && (_classes = types.filter(function(type) {
            return hasOwn.call(controls, type);
          })).length) {
        // Do refactoring here
        type = /*_classes.join(CONTROL_TYPES_SEPARATOR);
        */_class = _classes.join(CONTROL_TYPES_SEPARATOR);

        control = controls[_class] || (controls[_class] = utils.inherits({
          parent: controls[_classes.shift()],
          mixins: _classes.map(function(type) {
            return controls[type];
          }),
          name: _class
        }));

        debug('auto-produced new class [', _class, ']');
      } else {
        if (type) {
          debug('cannot find the [', type, '] control');
        } else {
          //  console.log('has no type', node);
        }

        break init;
      }
    } else {
      control = controls[_class];
    }

    var type,
      types,
      _class,
      _classes,
      element,
      parent,
      children,
      control,
      send = {
        view: element,
        parent: parent,
        properties: params.properties,
        capture: params.capture,
        index: params.index
      },
      result,
      sendParams,
      level = params.level | 0;

    if (types.length > 1) {
      type = _class;
    }

    parsers.push(node);

    if (control = getControlNode(control, element)) {
      //console.time('control [' + type + ']');
      result = ui.create(type, send, control);
      //console.timeEnd('control [' + type + ']');
    }

    parsers.pop();
  } else {
    //events.fire(element, exports.events.reparse);
  }

  if (!result) {
    sendParams = params ? {
      parent: parent,
      level: params.level,
      properties: params.properties,
      capture: params.capture,
      index: params.index
    } : null;
  } else {
    sendParams = {
      level: ++level
    };

    if (window.__DEBUG && window.__DEBUG_PARSE_TREE) {
      debugElementTree(element, level);
    }
  }

  // override control var
  // now it's resulted control of parsing

  control = result || uiControl(element);

  if ((children = node.children).length) {
    var wait = children.reduce(function(promise, child) {
      return promise.then(function() {
        return parseTree(child, sendParams);
      }).then(function(firstControl) {
        if (!control && firstControl) {
          control = firstControl;
        }
      });
    }, Promise.resolve(control));
  } else {
    wait = Promise.resolve();
  }

  return wait.then(function() {
    if (type && result) {
      result.set('parsed', true);
      events.fire(element, exports.events.parsed);
    } else if (uiControl(element)) {
      //events.fire(element, exports.events.reparseend);
    }

    return control || null;
  });
  // return control || null;
};

var getControlNode = function(control, element) {
  var node = (control.prototype.base || '') + '';

  if (!node || element.matches(node)) {
    return element;
  } else {
    return element.querySelector(node);
  }
},
typedCache = function(type, control, name, value) {
  var data = uiCache(control.view);

  if (type) {
    name = name + '[' + type + ']';
  }

  if (typeof value === 'undefined') {
    return data[name];
  }

  return (data[name] = value);
},
debugElementTree = function(element, level) {
  console.log(new Array(level).join('|--') + element.getAttribute('data-control') +
              (element.getAttribute('data-name') ? '["' + element.getAttribute('data-name') + '"]' : '') +
              (element.getAttribute('data-id') || element.id ? '#' + (element.getAttribute('data-id') || element.id) : ''));
},
attrData = function(node, attr, value) {
  attr = ATTR_PREFIX + camel2css(attr);
  return utilsAttr(node, attr, value);
},
OriginalElement = controls.element,
defaultProp = ui.type.get(OriginalElement.properties[ui.DEFAULT_PROP]),
defaultType = ui.type.get(ui.DEFAULT_TYPE);

exports.OriginalElement = OriginalElement;

(function() {
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
}());

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

    if (content) {
      if (typeof content === 'string') {
        this.node.innerHTML = content;
      } else if (content.nodeType) {
        this.node.innerHTML = '';
        this.node.append(content);
      }
    }

    exports.parse(this.view);
    // events.fire(exports.events.parse, this.view);
  }
};

fakeElementProto.insert = function(content, customParams) {
  var self = this,
    params = {
      parent: self
    },
    index;

  customParams && (params = Sync.extend(customParams, params));

  index = hasOwn.call(params, 'index') ? params.index : void 0;

  var control = exports.parseFromString(content, params, function(node) {
    var child;

    if (index != null && (child = self.children[index])) {
      child.view.before(node);
    } else {
      self.view.append(node);
    }
  });

  return control;
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

  /*fakeElementProto[key] = function(content, customParams) {
    var self = this,
      params = {
        parent: self.parent,
        index: self.index + delta
      };

    customParams && (params = Sync.extend(customParams, params));

    var control = exports.parseFromString(content, params, function(node) {
      self.view[key](node);
    })[0];

    return control;
  };*/

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
  },
  proto: fakeElementProto,
  meta: {
    properties: ui.handleProperties(properties)
  }
});

(function() {
/*   if (self instanceof ui.controls.Checkable) {
     startValue = getValue(self);
     events.on(node, 'change', function listenChange() {
       if (startValue !== getValue(self)) {
         // stupid hack
         self.set('state', ui.states.none);

         events.fire(exports.events.setState, self, {
           state: ui.states.focus,
           direct: true
         });

         events.remove(self.node, 'change', listenChange);
       }
     });
   } else {
     events.on(node, 'focus', function() {
       startValue = getValue(self);
       events.on(self, ui.events.change, listenInput);
     });
   }*/


  /*events.on(node, ui.events.changeState, function(e, data) {
    if (data.state === ui.states.readonly &&
        self.get('state') !== ui.states.disabled &&
        self.get('state') !== ui.states.loading) {
      self.set('readonly', true);

      events.once(node, ui.events.changeState, function(e, data) {
        if (data.state !== ui.states.readonly) {
          self.set('readonly', false);
        }
      });
    }
  });*/
}());