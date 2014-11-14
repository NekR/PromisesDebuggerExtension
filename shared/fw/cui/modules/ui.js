var utils = require('utils'),
  lib = require('lib');

var exports = {
  events: events.map([
    'propChange',
    'childControl',
    'changeState',
    'idControl',
    'destroy',
    'show',
    'hide',
    'remove',
    'attach',
    'detach',
    'resize',
    
    /* not used */
    'change',
    'select',
    'disabled',
    'enabled',
    'load',
    'error',
    'open',
    'close',
    'activate',
  ]),
  mixins: {},
  controls: {},
  states: {
    hover: 'hover',
    active: 'active',
    focus: 'focus',
    none: '',
    blur: 'blur',
    error: 'error',
    click: 'click',
    disabled: 'disabled',
    loading: 'loading',
    selected: 'selected',
    readonly: 'readonly'
  },
  elements: {},
  types: {},
  keys: {
    DELETE: 46,
    DOWN: 40,
    RIGHT: 39,
    UP: 38,
    LEFT: 37,
    ESC: 27,
    ENTER: 13,
    BACKSPACE: 8,
    SPACE: 32,
    END: 35,
    HOME: 36
  },
  cache: function(object, key, value) {
    var cahceObj = libCache(object, UI_CACHE_KEY);

    if (!object || !cahceObj) return null;

    if (typeof key === 'undefined') {
      return cahceObj;
    }

    if (key === null) {
      libCache(object, UI_CACHE_KEY, null);
    }

    if (typeof value !== 'undefined') {
      return (cahceObj[key] = value);
    } else {
      return cahceObj[key];
    }
  },
  is: function(control, type) {
    if (!control) return false;

    // type = utils.type2class(type);

    return typeof controls[type] === 'function' &&
      control instanceof controls[type];
  },
  get: function(key) {
    if (hasOwn.call(elements, key)) {
      return elements[key];
    }

    return null;
  },
  rect: function(element) {
    var cache = uiCache(element),
      data = cache[RECT_DATA_KEY];

    if (!data) {
      data = cache[RECT_DATA_KEY] = {
        rect: element.getBoundingClientRect(),
        scrollTop: window.pageYOffset,
        scrollLeft: window.pageXOffset
      };

      var handler = function() {
        events.remove(element, exports.events.resize, handler);
        events.remove(window, 'resize', handler);
        cache[RECT_DATA_KEY] = null;
      };

      events.on(element, exports.events.resize, handler);
      events.on(window, 'resize', handler);

      return data.rect;
    }

    var rect = data.rect,
      offsetLeft = (data.scrollLeft - window.pageXOffset),
      offsetTop = (data.scrollTop - window.pageYOffset);

    return {
      left: rect.left + offsetLeft,
      top: rect.top + offsetTop,
      right: rect.right + offsetLeft,
      bottom: rect.bottom + offsetTop,
      width: rect.width,
      height: rect.height
    };
  },
  create: function createControl(type, options, node) {
    var instance;

    if (typeof controls[type] === 'undefined') {
      return null;
    }

    (options || (options = {})).type = type;
    type = controls[type];

    node || (node = document.createElement('div'));
    instance = new type(node, options);

    return instance;
  },
  define: function defineControl(type, options) {
    var parent,
      proto,
      meta,
      properties,
      mixins;

    options || (options = {});

    parent = options.parent;
    parent = parent && hasOwn.call(controls, parent) ? parent : 'element';

    if (parent !== type && hasOwn.call(controls, type)) {
      throw new Error('Cannot define duplicate control: ' + type);
    }

    parent = controls[parent];

    if (isArray(mixins = options.mixins) && mixins.length) {
      mixins = mixins.map(function(mixin) {
        return controls[mixin];
      });
    } else {
      mixins = null;
    }

    if (options.contains || options.base /* real dom node*/) {
      proto = {};

      if (isArray(options.contains)) {
        proto.contains = options.contains/*.map(function(type) {
          return utils.type2class(type);
        })*/;
      }

      if (isArray(options.base /* real dom node*/)) {
        proto.base /* real dom node*/ = options.base /* real dom node*/;
      }
    }

    properties = options.properties;

    if (typeof properties === 'object' && !isArray(properties)) {
      meta = {
        properties: handleProperties(properties)
      };
    }

    return (controls[type] = utils.inherits({
      parent: parent,
      handler: options.handler,
      meta: meta,
      proto: proto,
      mixins: mixins,
      name: type
    }));
  },
  control: function(viewOrBase, control) {
    var control = uiCache(viewOrBase, UI_CONTROL_CACHE_KEY, control);
    return control;
  },

  DEFAULT_TYPE: '',
  DEFAULT_PROP: ''
};

var hasOwn = Object.prototype.hasOwnProperty,
  slice = Array.prototype.slice,
  isArray = Array.isArray,
  css2dom = utils.css2dom,
  controls = exports.controls,
  elements = exports.elements,
  types = exports.types,
  states = exports.states,
  extend = lib.extend,
  libCache = lib.cache,
  uiCache = exports.cache,
  uiControl = exports.control,
  idInc = 0;

var RECT_DATA_KEY = 'rect_data',
  UI_CACHE_KEY = 'ui_cache',
  UI_CONTROL_CACHE_KEY = 'ui_control_cache',
  DEFAULT_TYPE = exports.DEFAULT_TYPE,
  DEFAULT_PROP = exports.DEFAULT_PROP;

var destroy = function(params) {
  if (this.zombie) {
    console.log('destroy return by the zombie');
    return;
  }

  var parent = this.parent,
    view = this.view,
    node = this.node,
    i,
    children = this.children.concat(),
    name = this.get('name'),
    id = this.get('id'),
    marker,
    parentChildren;

  if (!params.onlyChildren) {
    if (params.remove) {
      view.remove();
    }

    if (parent && (parentChildren = parent.children)) {
      i = parentChildren.indexOf(this);
      i !== -1 && parentChildren.splice(i, 1);
      parentChildren[name] = null;

      parentChildren.forEach(function(child, index) {
        child.index = index;
      });
    }

    if (id) {
      elements[id] = null;
    }

    if ((marker = this.get('_attachMarker')) && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }

    view && events.clean(view);
    node && events.clean(node);

    uiCache(view, null);
    uiCache(node, null);

    uiControl(view, null);

    this.view =
      this.node =
      this.parent =
      this.children = null;

    this.zombie = true;
    // Object.freeze(this);
  }

  children.forEach(function(child) {
    child.destroy();
  });
},
getControl = function(type, callback, byInstance) {
  var compare = byInstance ? exports.is : function(control, type) {
    return control.type === type;
  };

  if (typeof callback !== 'function') {
    return this.children.filter(function(child) {
      return compare(child, type);
    });
  } else if (this.view.parsed) {
    this.children.forEach(function(child) {
      if (compare(child, type)) {
        callback(child);
      }
    });
  } else {
    events.expr(this.view, exports.events.childControl, function(e, child) {
      if (compare(child, type)) {
        callback(child);
        return true;
      }
    });
  }
},
generateUID = function() {
  return ++idInc;
},
accessors = function(control, accessor, args) {
  if (control.zombie) return;

  var tmp = control.constructor.properties,
    args = slice.call(args, 0),
    name = args[0].split(':'),
    type;

  if (name.length > 1) {
    type = name[0];
    args[0] = name = name[1];

    if (!hasOwn.call(types, type) || !hasOwn.call(types[type], accessor)) {
      type = DEFAULT_TYPE;
    }

    tmp = exports.type.getDefaultInstance(type);
  } else {
    name = name[0];
    type = tmp[name];

    if (type && hasOwn.call(type, accessor)) {
      tmp = type;
    } else {
      tmp = tmp[DEFAULT_PROP];
    }

    type = tmp.type;
  }

  var result = tmp[accessor].apply(tmp, [control].concat(args));;

  if (accessor === 'set') {
    control.notifyChange(type, name);
  }

  return result;
},
handleProperties = function(properties) {
  return Object.keys(properties).reduce(function(result, key) {
    var val = result[key],
      type = '',
      args,
      accessors;

    if (typeof val === 'string') {
      type = val;
    } else if (isArray(val)) {
      type = (val[0] + '');
      args = val.slice(1);
    } else if (typeof val === 'object') {
      type = (val.type + '');
      args = val.args;
      accessors = {
        get: val.get,
        set: val.set
      };
    }/* else {
      val = null;
    }*/

    type = type.toLowerCase();

    if (type && hasOwn.call(types, type)) {
      result[key] = exports.type.create(type, args, accessors);
    } else {
      if (typeof val !== 'object' || isArray(val)) {
        val = null;
      }

      result[key] = val;
    }

    return result;
  }, properties);
};

exports.handleProperties = handleProperties;
exports.type = {
  define: function(type, config) {
    types[type] = config;
  },
  create: function(type, args, accessors) {
    var config = types[type],
      factory = config.factory,
      instance;

    accessors || (accessors = config);

    instance = factory ? factory.apply(null, args) : {};
    instance.get = accessors.get || config.get;
    instance.set = accessors.set || config.set;

    instance.factory = factory;
    instance.type = type;

    return instance;
  },
  getDefaultInstance: function(type) {
    var config = types[type];

    return config.instance || (config.instance = exports.type.create(type));
  },
  get: function(type) {
    return types[type];
  }
};

exports.type.define(DEFAULT_TYPE, {
  get: function(control, name) {
    return uiCache(control.view, name);
  },
  set: function(control, name, value) {
    return uiCache(control.view, name, value);
  }
});

controls.element = utils.inherits({
  handler: function(node, params) {
    // Expected params
    // Changed to manual assignment for performance improvements
    if (params) {
      typeof params.type !== 'undefined' &&
        (this.type = params.type);
      typeof params.parent !== 'undefined' &&
        (this.parent = params.parent);
      typeof params.view !== 'undefined' &&
        (view = this.view = params.view);

      if (typeof params.index !== 'undefined') {
        var index = params.index;
      }
    }

    this.node = node;
    this.base = node;
    this.capture = params && params.capture || {};

    var parent = this.parent,
      self = this,
      normalPosition = true,
      view,
      children = this.children = [],
      contains = parent && parent.contains,
      properties = params && params.properties;

    view || (view = this.view = node);

    events.on(view, exports.events.destroy, function() {
      view = children = parent = self = node = null;
    });

    if (contains && contains.length) {
      normalPosition = false;

      var len = contains.length,
        i = 0;

      for (; i < len; i++) {
        if (exports.is(self, control)) {
          normalPosition = true;
          break;
        }
      }
    }

    if (properties) {
      lib.each(properties, function(val, key) {
        self.set(key, val);
      });
    }

    if (normalPosition) {
      var id = this.get('id');

      if (id && elements[id]) {
        debug('duplicates id: ', id, ' of control ', view, elements[id].view);
        // throw new Error();
      } else if (id) {
        elements[id] = this;
        // wtf here first arg
        events.fire(exports.events.idControl, this.node, this);
      } else {
        this.set('id', generateUID());
      }

      events.on(view, exports.events.childControl, function(e, child, index) {
        var name = child.get('name');

        // child.index = children.push(child) - 1;
        // child.parentControl = self;

        if (isFinite(index)) {
          child.index = index;

          children.forEach(function(iterChild) {
            if (iterChild.index >= index) {
              iterChild.index++;
            }
          });

          children.splice(index, 0, child);
        } else {
          child.index = children.push(child) - 1;
        }

        if (name && !isFinite(name)) {
          name = css2dom(name);

          if (!hasOwn.call(children, name)) {
            children[name] = child;
          } else {
            debug('duplicates named control ', child, ' of ',
                  self, ' parent', child.view, children[name]);
            // throw new Error();
          }
        }

        e.stopPropagation(); // fire only for first parent
      });

      // after all call event -- new child
      if (parent) {
        events.fire(parent.view, exports.events.childControl, this, index);
      }

      uiControl(view, this);
    } else {
      debug('warning: wrong control tree position', view);
      // throw new Error();
    }

    events.register(this, exports.events.propChange, function() {
      console.log('propChange registered');
      self.notifyChange = function(type, name) {
        console.log('notifyChange2');
        events.fire(self, exports.events.propChange, {
          type: type,
          name: name
        });
      };
    });
  }
});


controls.element.prototype = {
  type: 'element',
  get: function getProperty() {
    return accessors(this, 'get', arguments);
  },
  set: function setProperty() {
    return accessors(this, 'set', arguments);
  },
  detach: function() {
    if (this.get('_attachMarker') || !this.view.parentNode) return false;

    var marker = document.createComment('attach marker: ' + this.get('id'));

    this.view.parentNode.replaceChild(marker, this.view);
    events.fire(this.view, exports.events.detach);

    return this.set('_attachMarker', marker);
  },
  attach: function() {
    var marker = this.get('_attachMarker');

    if (!marker) return false;

    if (!marker.parentNode) {
      throw new Error('Cannot attach back control to tree without marker in');
    }

    marker.replace(this.view);
    events.fire(this.view, exports.events.attach);

    this.set('_attachMarker', null);

    return true;
  },
  task: function(fn, delay) {
    var timer,
      self = this,
      removeHandler = function() {
        clearTimeout(timer);
      };

    events.on(self.view, exports.events.destroy, removeHandler);

    timer = setTimeout(function() {
      if (self.zombie) {
        console.warn('fired control task after control became zombie');
        return;
      }

      events.remove(self.view, exports.events.destroy, removeHandler);
      fn.call(self);
    }, delay || 1);
  },
  touch: function(callback) {
    var self = this;
    var doCancel;
    var removeHandler = function() {
      if (doCancel) doCancel();
    };

    events.on(self.view, exports.events.destroy, removeHandler);

    var promise = new Promise(function(resolve, reject) {
      var frame = requestAnimationFrame(function() {
        if (self.zombie) {
          reject(new Error('Cannot touch zombie'));
          return;
        }

        callback();

        var timer = setTimeout(function() {
          doCancel = null;

          if (self.zombie) {
            console.warn('Race between control touch and zombie, exit');
            return;
          }

          events.remove(self.view, exports.events.destroy, removeHandler);
          resolve();
        }, 1);

        doCancel = function() {
          clearTimeout(timer);
        };
      });

      doCancel = function() {
        cancelRequestAnimation(frame);
      };
    });

    return promise;
  },
  frame: function(fn) {
    var frame = {
      fn: fn
    };
  },
  remove: function() {
    this.destroy({
      remove: true,
      onlyChildren: false
    });
  },
  destroy: function(options) {
    options = options || {};

    if (!options.onlyChildren) {
      events.fire(this.view, exports.events.destroy, options);
    } else if (!options.remove) {
      events.fire(this.view, exports.events.destroyChildren, options);
    }
    
    if (options.remove) {
      events.fire(this.view, exports.events.remove, options);
    }

    destroy.call(this, options);
  },

  notifyChange: function(/* type, name */) {console.log('notifyChange');}
};

[
  'addEventListener',
  'removeEventListener',
  'dispatchEvent'
].forEach(function(key) {
  this[key] = function(event, fn, capture) {
    var view = this.view;
    
    if (view) {
      return key === 'dispatchEvent' ?
        view[key].call(view, event) :
        view[key].call(view, event, fn, capture);
    }
  };
}, controls.element.prototype);

var properties = {
  hidden: {
    get: function(control, name) {
      /*if ((cache = lib.cache(control.view)) && name in cache) {
        return cache[name];
      }*/

      var display = window.getComputedStyle(control.view).display,
        //hiddenValue = control.view.hidden,
        //style = control.view.style,
        hidden = false;

      if (display === 'none') {
        hidden = true;
      }

      return hidden;
    },
    set: function(control, name, value) {
      // value = !!value; // to boolean

      var hidden = this.get(control, name),
        view = control.view,
        hiddenValue = view.hidden,
        display,
        style,
        cache = uiCache(view),
        computed,
        lastDisplay;

      if (value && !hidden) {
        cache[name + '_lastDisplay'] = 
          display = (style = view.style).display;

        style.display = 'none';
        
        hidden = true;

        events.fire(view, exports.events.hide);
      } else if (!value && hidden) {
        display = (style = control.view.style).display;
        lastDisplay = cache[name + '_lastDisplay'] || '';

        if (display !== 'none' && hiddenValue) {
          view.hidden = false;
        } else if (display === 'none') {
          style.display = lastDisplay ? lastDisplay : '';
          display = '';
        }

        hidden = this.get(control, name);

        if (hidden) {
          style.display = (display ? display : 'block') + ' !important';
          hidden = false;
        }

        events.fire(control.view, exports.events.show);
      }

      cache[name] = hidden;

      return hidden;
    }
  },
  attached: {
    get: function(control) {
      return !control.get('_attachMarker');
    }
  },
  child: {
    get: function(control, name, type, callback) {
      return getControl.call(control, type, callback, 1);
    }
  },
  capture: {
    get: function(control, name, key) {
      var capture = control.capture;

      do {
        if (hasOwn.call(capture, key)) {
          return capture[key];
        }
      } while ((control = control.parent) && (capture = control.capture));
    },
    set: function(control, name, key, value) {
      control.capture[key] = value;
    }
  },
  state: {
    type: DEFAULT_TYPE,
    set: function(control, name, state, params) {
      control.set(this.type + ':' + name, state);
      control.set(DEFAULT_TYPE + ':' + name, state);
      
      if (!params || !params.silent) {
        events.fire(control, exports.events.changeState, params);
      }

      return state;
    }
  }
};

properties[DEFAULT_PROP] = DEFAULT_TYPE;

extend(controls.element, {
  properties: properties
});