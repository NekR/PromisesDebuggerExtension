var lib = require('lib');

var selectableEvents = [
  'selectionstart',
  'selectstart',
  'dragstart'
  // 'mousedown',
  //'touchstart'
],
focusableEvents = [
  'DOMActivate',
  'activate',
  'beforeactivate',
  'focus',
  'focusin'
],
defaultSelectOptions = {
  preventTab: false,
  onlySelf: false,
  useCapture: true
};

var isArray = Array.isArray,
  extend = lib.extend,
  call = Function.call,
  hasOwn = Object.prototype.hasOwnProperty,
  hasTouch = 'ontouchstart' in document;

var R_TYPE_2_CLASS = /(?:\b)(\w)([\w\-]+)(?:\b)/ig,
  R_CSS_2_DOM = /-([a-z]|[0-9])/ig,
  R_MS_PREFIX = /^-ms-/,
  R_CAMEL_2_CSS = /[A-Z](?=\w)/g,
  R_URL = /^(?:(http(?:s?)\:)?\/\/([a-zA-Z_\-а-яА-ЯёЁ0-9\.]+))?(\:\d+)?(\/(?:[^?#]*)?)?(\?(?:[^#]*)?)?(#[\S]*)?/g,
  UNSELECTABLED_KEY = '_unselectabledObject';

var toUpperCase = function(str, letter) {
  return (letter + '').toUpperCase();
},
type2class = function(str, p1, p2) {
  return (p1 + '').toUpperCase() + exports.css2dom(p2);
},
camel2css = function(w) {
  return ('-' + w).toLowerCase();
};

var exports = {
  escapeHTML: function escapeHTML(value) {
    return value && (value + '')
      .replace(/&/gi, '&amp;')
      .replace(/</gi, '&lt;')
      .replace(/>/gi, '&gt')
      .replace(/"/gi, '&quot;')
      .replace(/'/gi, '&apos;')
      .replace(/\//gi, '&#x2F;') || '';
  },
  makeUnselectable: function(node, options) {
    options = extend({}, defaultSelectOptions, options);

    var bindEvents = options.preventTab ?
      selectableEvents.concat(focusableEvents) : selectableEvents,
      cache = lib.cache(node),
      unselectables = cache[UNSELECTABLED_KEY] || (cache[UNSELECTABLED_KEY] = []),
      listeners = {},
      send = {
        options: options,
        listeners: listeners
      };

    bindEvents.forEach(function(key) {
      var listener = function(e) {
        var target = e.target;

        if (options.onlySelf && target !== node) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        return false;
      };

      events.on(node, key, listener, options.useCapture);
      listeners[key] = listener;
    });

    events.on(node, 'touchstart', listeners['touchstart'] = function() {}, false);

    node.setAttribute('unselectable', 'on');
    node.setAttribute('draggable', 'false');

    if (options.preventTab) {
      send.tabIndex = node.tabIndex | 0;
      node.tabIndex = -1;
    }

    unselectables.push(send);
  },
  restoreSelectable: function(node) {
    var unselectables = lib.cache(node)[UNSELECTABLED_KEY],
      send,
      options,
      useCapture,
      listeners;

    if (!unselectables || !unselectables.length) return;

    send = unselectables.pop(),
    listeners = send.listeners,
    options = send.options,
    useCapture = options.useCapture;

    lib.each(listeners, function(val, key) {
      events.remove(node, key, val, useCapture);
    });

    if (!unselectables.length) {
      node.removeAttribute('unselectable');
      node.removeAttribute('draggable');
    }

    if (options.preventTab) {
      var tabIndex = send.tabIndex;
      if (isFinite(tabIndex)) {
        node.tabIndex = tabIndex;
      }
    }
  },
  getBox: function(node, options, params) {
    var computed = window.getComputedStyle(node),
      data = {},
      offset = 0;

    options = {
      border: typeof options.border === 'boolean' ? options.border : false,
      metric: typeof options.metric === 'boolean' ? options.metric : true,
      inner: typeof options.inner === 'boolean' ? options.inner : true,
      outer: typeof options.outer === 'boolean' ? options.outer : false
    };

    if (options.inner) {
      options.border = false;
      options.outer = false;
      offset = -(parseInt(computed[params.padding[0]]) + parseInt(computed[params.padding[1]]));
    }

    if (options.outer) {
      offset = parseInt(computed[params.margin[0]]) + parseInt(computed[params.margin[1]]);
    }

    return (options.metric ? (options.border ? node[params.metric[0]] : node[params.metric[1]]) : 0) + offset;
  },
  boxHeight: function(node, options) {
    return exports.getBox(node, options, {
      margin: ['marginTop', 'marginBottom'],
      padding: ['paddingTop', 'paddingBottom'],
      metric: ['offsetHeight', 'clientHeight']
    });
  },
  boxWidth: function(node, options) {
    return exports.getBox(node, options, {
      margin: ['marginLeft', 'marginRight'],
      padding: ['paddingLeft', 'paddingRight'],
      metric: ['offsetWidth', 'clientWidth']
    });
  },
  css2dom: function(str) {
    return str.replace(R_MS_PREFIX, 'ms-').replace(R_CSS_2_DOM, toUpperCase);
  },
  type2class: function(type) {
    return (type || '').replace(R_TYPE_2_CLASS, type2class);
  },
  camel2css: function(str) {
    return str.replace(R_CAMEL_2_CSS, camel2css);
  },
  checkIntoView: function(node, height) {
    var rect = node.nodeType ? rect = node.getBoundingClientRect() : node;
    height || (height = window.innerHeight);

    var topHeight = rect.top + rect.height,
      isBetween = (rect.top > 0 && topHeight < height),
      isAbove = (rect.top < 0 && topHeight < 0 && topHeight < height),
      isBelow = (rect.top > 0 && rect.top > height && topHeight > height),
      isOutflow = (rect.top < 0 && rect.top + rect.height > height),
      singleOutflow = !isBelow && !isAbove && !isBetween && !isOutflow,
      isHidden = !rect.width && !rect.height;

    return {
      isIntoView: isHidden ? false :
        isBetween || (!isAbove && !isBelow) || isOutflow,
      isBetween: isBetween,
      isAbove: isAbove,
      isBelow: isBelow,
      isOutflow: isOutflow,
      isOutflowBottom: singleOutflow && rect.top > 0,
      isOutflowTop: singleOutflow && rect.top < 0,
      rect: rect,
      topHeight: topHeight,
      height: height
    };
  },
  html2fragment: function(string, iterator) {
    var div = document.createElement('div'),
      child,
      iterate = typeof iterator === 'function',
      fragment = document.createDocumentFragment();

    div.innerHTML = string;

    while (child = div.firstChild) {
      if (!iterate || iterator(child) !== true) {
        fragment.appendChild(child);
      }
    }

    div = null;
    return fragment;
  },
  attr: function(node, attr, value) {
    if (!node || !attr) return null;

    if (value !== void 0 || value === null) {
      node.setAttribute(attr, value);
      return value;
    }

    // return node.hasAttribute(attr) ? node.getAttribute(attr) : void 0;
    attr = node.getAttribute(attr);
    return attr == null ? void 0 : attr;
  },
  debounce: function(fn, delay, thisArg) {
    var timer,
      throttle = function() {
        if (timer) clearTimeout(timer);
        var args = arguments,
          _this = thisArg || this;

        timer = setTimeout(function() {
          fn.apply(_this || null, args);
        }, delay);
      };

    throttle.stop = function() {
      if (timer) clearTimeout(timer);
    };

    return throttle;
  },
  goLink: function(url, target) {
    var go = function() {
      try {
        window.location.assign(url);
      } catch (e) {
        window.location.href = url;
      }
    };

    //if (target && target !== '_self') {
      var a = document.createElement('a');

      a.href = url || '';
      a.target = target || '';
      document.body.appendChild(a);

      //setTimeout(function() {
        if (a.click) {
          try {
            a.click();
          } catch (e) {
            go();
          }

          window.focus();
        } else {
          go();
        }

        setTimeout(function() {
          document.body.removeChild(a);
          a = null;
        }, 1);
      //}, 1);
    /*} else {
      go();
    }*/
  },
  touchDOM: function(callback) {
    return new Promise(function(resolve) {
      requestAnimationFrame(function() {
        callback();

        setTimeout(function() {
          resolve();
        }, 1);
      });
    });
  }
};

var ParsedURL = function(url) {
  url = url.trim();
  R_URL.lastIndex = 0;

  var match = R_URL.exec(url);

  if (!match) {
    return null;
  }

  if (!match[0]) {
    match[4] = location.pathname.replace(/(\/)[^\/?#]*?$/, '$1' + url);
  }

  var protocol = match[1] || location.protocol,
    hostname = match[2] || location.hostname,
    port = match[3] || '',
    pathname = match[4] || location.pathname,
    search = match[5] || '',
    hash = match[6] || '',
    origin = protocol + '//' + hostname + port;

  this.protocol = protocol,
  this.hostname = hostname,
  this.host = hostname + port,
  this.port = port,
  this.pathname = pathname,
  this.path = pathname + search,
  this.search = search,
  this.hash = hash,
  this.origin = origin,
  this.href = origin + pathname + search + hash;
};

exports.parseUrl = function(url) {
  if (typeof url !== 'string') {
    return url instanceof ParsedURL ? url : null
  }

  return new ParsedURL(url);
};

exports.inherits = function(options) {
  var handler = options.handler,
    parent = options.parent,
    proto = options.proto,
    meta = options.meta,
    mixins = options.mixins,
    name = options.name || 'unnamed' + Date.now(),
    parentMixins,
    handlers,
    classProto;

  if (parent) {
    classProto = Class.prototype = Object.create(parent.prototype);
    parentMixins = parent.__mixins__;
  } else {
    classProto = Class.prototype;
  }

  if (isArray(mixins) && mixins.length) {
    mixins = mixins.filter(function(mix) {
      if (!mix || parentMixins &&
          parentMixins.indexOf(mix) !== -1) return false;

      extend(true, Class, mix);
      extend(classProto, mix.prototype);

      return true;
    });
  }

  handlers = (parent && parent.__handlers__ || []).concat(mixins ? mixins.reduce(function(result, mix) {
    return result.concat(mix.__handlers__);
  }, []) : []).filter(function(handler, i, arr) {
    return arr.indexOf(handler) === i;
  });

  handler && handlers.push(handler);

  extend(true, Class, parent, meta);
  extend(classProto, proto);

  classProto.constructor = Class;

  if (parent) {
    classProto.__super__ = parent;
    classProto.__parent__ = parent.prototype;
  }

  Class.toString = function() {
    return '[User Class ' + name + ']';
  };

  classProto.toString = function() {
    return '[User Object ' + name + ']';
  };

  Class.__name__ = name;
  Class.__mixins__ = mixins;
  Class.__handlers__ = handlers;

  function Class() {
    var self = this;

    if (parent && !(this instanceof parent)) {
      self = Object.create(parent.prototype);
    }

    for (var i = 0, len = handlers.length, handler; i < len; i++) {
      handler = handlers[i];
      /*mix && */handler.apply(self, arguments);
    }

    return self;
  }

  return Class;
};