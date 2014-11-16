var ui = require('ui');
var parser = require('parser');
var types = require('types');
var utils = require('utils');
var lib = require('lib');
var jsx = require('jsx');

var getControlNode = parser.getControlNode,
  slice = Array.prototype.slice,
  type2class = utils.type2class,
  controls = ui.controls,
  uiControl = ui.control,
  hasOwn = Object.prototype.hasOwnProperty,
  isArray = Array.isArray;

parser.registered.push(exports);

exports.CONTROLS_KEY = 'control';

var dataNamespace = parser.DATA_NAMESPACE;
var controlKey = exports.CONTROLS_KEY;
var propsKey = 'props';
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

exports.check = function(root) {
  return (root instanceof jsx.Node);
};

exports.parseInternal = function(root, params) {
  var result = parseJSX(root, params);
  var parserInstance = createParser(result.controls);

  parser.trackParser(parserInstance);

  return {
    parser: parserInstance,
    dom: result.dom
  };
};

exports.parse = function(root, params) {
  if (!exports.check(root)) {
    throw new TypeError('Not a jsx.Node');
  }

  return exports.parseInternal(root, params).parser;
};

exports.render = function(root, params) {
  var node = params.parent.node;
  var result = exports.parseInternal(root, params);
  var parser = result.parser;

  parser.promise = parser.promise.then(function(controls) {
    return utils.touchDOM(function() {
      node.innerHTML = '';
      node.append(result.dom);
    }).then(function() {
      return controls;
    });
  });

  return parser;
};

exports.insert = function(root, params) {
  var index = hasOwn.call(params, 'index') ? params.index : void 0;
  var target = params.parent;

  var result = exports.parseInternal(root, params);
  var parser = result.parser;

  parser.promise = parser.promise.then(function(controls) {
    return utils.touchDOM(function() {
      var child;

      if (index != null && (child = target.children[index])) {
        child.view.before(result.dom);
      } else {
        target.view.append(result.dom);
      }
    }).then(function() {
      return controls;
    });
  });

  return parser;
};

// jsx.tags tree -> jsx.Node tree -> jsx.DOMTree -> Controls tree -> out


// in -> jsx.Node
// out <- Promise
var parseJSX = function(node, params) {
  params || (params = {});

  var tree = {
    children: []
  };

  var currentControl = tree;

  var dom = jsx.toDOM(node, {
    onEnterElement: function(node, domElement, params) {
      var nodeProps = node.props;
      var uiProps = nodeProps[dataNamespace];

      if (!uiProps || !uiProps[controlKey]) {
        return;
      }

      var control = uiProps[controlKey];
      var props = uiProps[propsKey];

      if (
        !props || isArray(props) ||
        (props.valueOf && typeof props.valueOf() !== 'object')
      ) {
        props = {};
      }

      lib.each(uiProps, function(val, key) {
        if (key === controlKey || key === propsKey) return;

        props[key] = val;
      });

      var send = {
        node: node,
        control: control,
        props: props,
        domElement: domElement,
        children: [],
        parent: null
      };

      if (!currentControl.domElement) {
        send.parent = currentControl;
        currentControl.children.push(send);
        currentControl = send;
        return;
      }

      var position = domElement
        .compareDocumentPosition(currentControl.domElement);

      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        if (position & Node.DOCUMENT_POSITION_CONTAINS) {
          send.parent = currentControl;
          currentControl.children.push(send);
          currentControl = send;
        } else {
          var parent;

          while (
            (parent = currentControl.parent) && parent.domElement &&
            !parent.domElement.contains(domElement)
          ) {
            currentControl = currentControl.parent;
          }

          if (!parent) {
            parent = currentControl;
          }

          send.parent = parent;
          parent.children.push(send);
          currentControl = send;
        }
      } else if (position & Node.DOCUMENT_POSITION_DISCONNECTED) {
        console.error('disconnected');
      } else {
        console.error('unknown');
      }
    }
  });

  var controls = tree.children.map(function(node) {
    var type = node.control;
    var view = node.domElement;
    var props = node.props;

    return parseControl(type, {
      view: view,
      properties: lib.extend({}, node.props, params.properties),
      capture: params.capture,
      index: params.index,
      parent: params.parent
    }, node);
  });

  return {
    dom: dom,
    controls: Promise.all(controls)
  };
};

var parseControl = function(type, options, node) {
  var controlClass = parser.getControlClass(type);
  var controlNode = controlClass.class &&
    parser.getControlNode(controlClass.class, options.view);

  if (!controlNode) {
    return Promise.reject(new Error('No control node'));
  }

  currentNodes.push(node);

  var result = ui.create(controlClass.type, options, controlNode);

  currentNodes.pop();

  if (!node.children.length) {
    return Promise.resolve(result);
  }

  var children = node.children.map(function(childNode) {
    return parseControl(childNode.control, {
      view: childNode.domElement,
      properties: lib.extend({}, childNode.props),
      parent: result
    }, childNode);
  });

  return Promise.all(children).then(function() {
    result.set('parsed', true);
    events.fire(result.view, parser.events.parsed);

    return result;
  });
};