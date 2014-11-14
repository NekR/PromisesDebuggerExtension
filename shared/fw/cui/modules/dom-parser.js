var ui = require('ui');
var parser = require('parser');
var types = require('types');
var utils = require('utils');
var lib = require('lib');

var getControlNode = parser.getControlNode,
  slice = Array.prototype.slice,
  type2class = utils.type2class,
  controls = ui.controls,
  uiControl = ui.control,
  hasOwn = Object.prototype.hasOwnProperty;

parser.registered.push(exports);

exports.CONTROLS_ATTR = types.ATTR_PREFIX + 'control';
exports.CONTROLS_SELECTOR = '[' + exports.CONTROLS_ATTR + ']';

var currentNodes = [];

var currentNode = function() {
  return currentNodes.length ?
    currentNodes[currentNodes.length - 1] : null;
},
breakCurrent = function() {
  var node = currentNode();

  if (node) {
    node.children = [];
  }
},
createParser = function(promise, transformed) {
  return {
    breakCurrent: breakCurrent,
    promise: promise,
    transformed: transformed
  };
};

var isNode = function(root) {
  return root && root.nodeType;
};

var isString = function(root) {
  return typeof root === 'string';
};

exports.check = function(root) {
  return isNode(root) || isString(root);
};

exports.parse = function(root, params, beforeParse) {
  var handler;

  if (isNode(root)) {
    handler = function(root, params) {
      var promise = parseSingle(root, params);

      var parserInstance = createParser(promise);

      parser.trackParser(parserInstance);

      return parserInstance;
    };
  } else if (isString(root) && beforeParse) {
    handler = function(root, params) {
      var promise = parseFromString(root, params, beforeParse);

      return createParser(promise, true);
    };
  } else {
    throw new TypeError('Bad arguments');
  }

  return handler(root, params);
};

exports.render = function(content, params) {
  var node = params.parent.node;
  var parser = exports.parse(content, params, function(fragment) {
    content = fragment;
  });

  parser.promise = parser.promise.then(function(controls) {
    return utils.touchDOM(function() {
      node.innerHTML = '';
      node.append(content);
    }).then(function() {
      return controls;
    });
  });

  return parser;
};

exports.insert = function(content, params) {
  var index = hasOwn.call(params, 'index') ? params.index : void 0;
  var target = params.parent;

  var parser = exports.parse(content, params, function(fragment) {
    content = fragment;
  });

  parser.promise = parser.promise.then(function(controls) {
    return utils.touchDOM(function() {
      var child;

      if (index != null && (child = target.children[index])) {
        child.view.before(content);
      } else {
        target.view.append(content);
      }
    }).then(function() {
      return controls;
    });
  });

  return parser;
};

var parseFromString = function(str, options, beforeParse) {
  var items = [];

  var fragment = utils.html2fragment(str, function(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      items.push(node);
    }
  });

  if (typeof beforeParse === 'function') {
    beforeParse(fragment);
  }

  return parser.parse(items, options);
};

var parseSingle = function(root, params) {
  var list = root.querySelectorAll(exports.CONTROLS_SELECTOR),
    tree = createNodeTree(root, list, params && params.parent);

  return parseTree(tree, params);
};


var createNodeTree = function(root, list, parent) {
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
};

var parseTree = function(node, params) {
  init: if (!uiControl(element = node.element)) {
    params || (params = {});
    parent = params.parent;

    // disabled for now
    if (false && !parent) {
      parent = node.parent && node.parent.element;
      parent = parent && uiControl(parent);
    }

    type = element.getAttribute(exports.CONTROLS_ATTR);
    _class = /*type2class*/(type || '').replace(/\s+/, parser.CONTROL_TYPES_SEPARATOR);
    types = _class && _class.split(parser.CONTROL_TYPES_SEPARATOR);

    if (!type || !hasOwn.call(controls, _class)) {
      if (
        types && types.length > 1 && (_classes = types.filter(function(type) {
          return hasOwn.call(controls, type);
        })).length
      ) {
        type = /*types.join(CONTROL_TYPES_SEPARATOR);
        */_class = _classes.join(parser.CONTROL_TYPES_SEPARATOR);

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
          // console.log('has no type', node);
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

    currentNodes.push(node);

    if (control = getControlNode(control, element)) {
      result = ui.create(type, send, control);
    }

    currentNodes.pop();
  } else {
    // events.fire(element, parser.events.reparse);
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

  return wait.then(function(waitVal) {
    if (type && result) {
      result.set('parsed', true);
      events.fire(element, parser.events.parsed);
    } else if (uiControl(element)) {
      // events.fire(element, parser.events.reparseend);
    }

    // console.log(control, waitVal);

    return control || null;
  });
};

var debugElementTree = function(element, level) {
  console.log(new Array(level).join('|--') + element.getAttribute('data-control') +
              (element.getAttribute('data-name') ? '["' + element.getAttribute('data-name') + '"]' : '') +
              (element.getAttribute('data-id') || element.id ? '#' + (element.getAttribute('data-id') || element.id) : ''));
};