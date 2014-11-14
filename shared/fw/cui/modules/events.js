var lib = require('lib'),
  libEvents = lib.events,
  slice = Array.prototype.slice,
  isArray = Array.isArray,
  hasOwn = Object.prototype.hasOwnProperty,
  defaultOptions = {};

var EVENTS_TARGET_KEY = 'events_node_target',
  EVENTS_NAMESPACE = 'mod_events',
  EVENTS_CACHE_KEY = 'events_center',
  EVENT_TARGET_TAG = 'event-target',
  EVENTS_REGISTER_HANDLERS = 'events_register_handlers';

var EventsCenter = function(node, options) {
  if (!node) return null;

  if (!node.addEventListener) {
    var cache = lib.cache(node);

    if (!(node = cache[EVENTS_TARGET_KEY])) {
      node = cache[EVENTS_TARGET_KEY] = document.createElement(EVENT_TARGET_TAG);
    }
  }

  options || (options = defaultOptions);

  this.eventLast = options.eventLast;
  this.eventForward = !options.noEventForward;
  this.queued = options.eventsQueue;
  this.node = node;
};

EventsCenter.init = function(node, options) {
  var cache = lib.cache(node),
    center = cache[EVENTS_CACHE_KEY];

  if (!center) {
    center = cache[EVENTS_CACHE_KEY] = new EventsCenter(node, options);
  }

  return center;
};

EventsCenter.addMethod = function(name, method) {
  EventsCenter.prototype[name] = function selfMethod(arg) {
    if (!arg) return this;

    if (typeof arg === 'object' && !isArray(arg)) {
      return selfMethod.apply(EventsCenter.init(arg), slice.call(arguments, 1));
    }

    if (typeof arg === 'string') {
      arg = arg.split(' ');
      if (arg.length === 1) {
        arg = arg[0];
      }
    }

    if (isArray(arg)) {
      var args = slice.call(arguments, 1);
      arg.forEach(function(arg) {
        method.apply(this, [arg].concat(args));
      }, this);

      return this;
    }

    return method.apply(this, arguments);
  };
};

EventsCenter.prototype = {
  all: function(nodes, event, callback, capture) {
    var len = nodes.length,
      node;

    for (var i = len; i--;) {
      (node = nodes[i]) && this.once(node, event, function() {
        if (!--len) {
          callback();
        }
      }, capture);
    }
  },
  group: function(nodes, event, callback, capture) {
    for (var i = nodes.length; i--;) {
      nodes[i] && this.on(nodes[i], event, callback, capture);
    }
  },
  proxy: function(what, who, params) {
    if (!isArray(what) || !isArray(who)) return this;
    var self = this;

    this.on(what[0], what[1], function(e, data) {
      self.fire(who[0], who[1], data, params);
    });
  },
  clean: function(node) {
    var cache = lib.cache(node),
      center = cache[EVENTS_CACHE_KEY];

    libEvents.clean(node, EVENTS_NAMESPACE);
    cache[EVENTS_CACHE_KEY] = null;
    cache[EVENTS_TARGET_KEY] = null;
    if (center) {
      center.node = null;
    }
  },
  add: function(node, event, options) {
    if (!event) {
      throw new Error('No event');
    }

    var cache = lib.cache(node),
      handlers = cache[EVENTS_REGISTER_HANDLERS],
      handler = handlers && hasOwn.call(handlers, event) && handlers[event];

    if (handler && !handler.called) {
      handler.called = true;
      handler.fn.call(node, event);
    }

    libEvents.add(node, event, options);
  }
};

lib.each({
  action: function(event, callback, useCapture) {
    var eventForward = this.eventForward,
      eventLast = this.eventLast,
      node = this.node,
      self = this;

    this.add(node, event, {
      handler: function(e) {
        var args = e.detail || [],
          actionsDesc = args.length ? args[0] : null,
          actions = actionsDesc && actionsDesc.actions,
          actionKeys = actions && Object.keys(actions),
          actionEnd = actionsDesc && actionsDesc.end,
          actionCalled;

        if (actionKeys) {
          var newActions = {};

          actionKeys.forEach(function(key) {
            var action = actions[key];

            newActions[key] = function() {
              actionCalled = true;
              e.stopImmediatePropagation();
              return action.apply(this, arguments);
            };
          });

          actions = newActions;
          newActions = null;
        }

        args = [actionsDesc && actionsDesc.data, actions];

        if (eventForward) {
          args = self.eventLast ? (args.push(e), args) : [e].concat(args);
        }

        if (callback.apply(node, args) === false) {
          e.stopPropagation();
          e.preventDefault();
        }

        if (actionKeys) {
          actionKeys.forEach(function() {
            actions[key] = null;
          });

          /*actionsDesc.actions = */actions = null;
        }

        if (!actionCalled && typeof actionEnd === 'function') {
          actionEnd();
        }

        actionEnd = null;
      },
      callback: callback,
      capture: !!useCapture,
      namespace: EVENTS_NAMESPACE
    });
  },
  on: function(event, callback, useCapture) {
    var eventForward = this.eventForward,
      eventLast = this.eventLast,
      node = this.node,
      self = this;

    if (event == null) {
      // console.warn('Attempt to listen undefined event');
      throw new Error('Attempt to listen undefined event');
    }

    this.add(node, event, {
      handler: function(e) {
        var args = e.detail || [];

        if (eventForward) {
          args = self.eventLast ? (args.push(e), args) : [e].concat(args);
        }

        if (callback.apply(node, args) === false) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      callback: callback,
      capture: !!useCapture,
      namespace: EVENTS_NAMESPACE
    });

    return this;
  },
  remove: function(event, callback, useCapture) {
    if (event == null) {
      // console.warn('Attempt to remove undefined event');
      throw new Error('Attempt to remove undefined event');
    }

    if (typeof callback !== 'function') {
      if (typeof callback === 'boolean') {
        useCapture = callback;
      }

      var node = this.node;

      libEvents.removeAll(node, event, {
        capture: !!useCapture,
        namespace: EVENTS_NAMESPACE
      });

      return this;
    }

    var node = this.node;

    libEvents.remove(node, event, {
      callback: callback,
      capture: !!useCapture,
      namespace: EVENTS_NAMESPACE
    });

    return this;
  },
  fire: function(event) {
    var node = this.node;

    if (event == null) {
      // console.warn('Attempt to fire undefined event');
      throw new Error('Attempt to fire undefined event');
    }

    libEvents.dispatch(node, event, {
      options: {
        bubbles: false,
        cancelable: true,
        detail: slice.call(arguments, 1)
      },
      type: 'CustomEvent'
    });

    return this;
  },
  dispatch: function(event) {
    var node = this.node;

    if (event == null) {
      // console.warn('Attempt to dispatch undefined event');
      throw new Error('Attempt to dispatch undefined event');
    }

    libEvents.dispatch(node, event, {
      options: {
        bubbles: true,
        cancelable: true,
        detail: slice.call(arguments, 1)
      },
      type: 'CustomEvent'
    });

    return this;
  },
  once: function(event, callback) {
    var self = this,
      node = this.node,
      autoRemove = function() {
        callback.apply(this, arguments);
        self.remove(node, event, autoRemove);
      };

    return this.on(event, autoRemove);
  },
  delegate: function(event, selector, callback) {
    var eventForward = this.eventForward,
      node = this.node;

    this.add(node, event, {
      handler: function(e) {
        var target = e.target;

        do {
          if (target.matches(selector)) {
            var args = e.detail || [],
              control = target.uiControl;

            if (!control) {
              break;
            }

            if (eventForward) {
              args = [e, control].concat(args);
            }

            if (callback.apply(node, args) === false) {
              e.stopPropagation();
              e.preventDefault();
            }

            break;
          }
        } while (target !== this && (target = target.parentNode) &&
               target.nodeType !== Node.DOCUMENT_NODE);
      },
      callback: callback,
      capture: false,
      namespace: EVENTS_NAMESPACE
    });

    return this;
  },
  expr: function(event, fn) {
    var self = this,
      node = this.node;

    this.on(node, event, function exprHandler() {
      if (fn.apply(this, arguments)) {
        self.remove(event, exprHandler);
      }
    });
  },
  register: function(event, fn) {
    var node = this.node,
      self = this;

    var cache = lib.cache(node),
      handlers = cache[EVENTS_REGISTER_HANDLERS];

    if (!handlers) {
      handlers = cache[EVENTS_REGISTER_HANDLERS] = {};
    }

    if (hasOwn.call(handlers, event)) return;

    handlers[event] = {
      fn: fn,
      called: false
    };
  }
}, function(method, name) {
  EventsCenter.addMethod(name, method);
});

var events = new EventsCenter(
  document.createElement(EVENT_TARGET_TAG), {
    noEventForward: true
  }
);

events.EventsCenter = EventsCenter;

events.getMap = function(mod, list) {
  return list.reduce(function(map, event) {
    map[event] = event + '.' + mod;

    return map;
  }, {})
};

events.map = function(list) {
  var current = modules.current,
    name = current ? current.name : 'mod' + Date.now();

  return events.getMap(name, list);
};

events.wrap = function(node, options) {
  return EventsCenter.init(node, options);
};

var exports = events;

if (typeof modules !== 'undefined' && modules.globalRequire) {
  modules.globalRequire[module.name] = module.name;
}