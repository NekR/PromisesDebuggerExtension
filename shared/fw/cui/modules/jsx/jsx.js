var lib = require('lib');
var tpls = require('tpls');

(function(global) {
  "use strict";

  var jsx = {
    components: {}
  };

  var hasOwn = Object.prototype.hasOwnProperty;
  var isArray = Array.isArray;

  var Node = function() {};

  var Element = function(tag, props, children) {
    this.type = 'element';
    this.name = tag;
    this.props = Object(props);
    this.children = isArray(children) ? children : [];
  };

  var Component = function(component, props, children) {
    this.type = 'component';
    this.component = component.name;
    this.renderer = component.renderer;

    this.props = Object(props);
    this.children = isArray(children) ? children : [];
    this.tree = this.renderer(jsx);

    if (!(this.tree instanceof Node)) {
      throw new TypeError('Wrong tree value');
    }
  };

  Element.prototype = Object.create(Node.prototype);
  Component.prototype = Object.create(Node.prototype);

  jsx.tag = function(tag, props, children) {
    var delimiterIndex = tag.indexOf(':');

    if (delimiterIndex !== -1) {
      var ns = tag.slice(0, delimiterIndex);
      tag = tag.slice(delimiterIndex + 1);
    }

    if (ns) {
      console.warn(
        'Component namespaces are currently ignored:',
        ns + ':' + tag, '->', tag
      );
    }

    if (hasOwn.call(jsx.components, tag)) {
      var element = new Component(jsx.components[tag], props, children);
    } else {
      var element = new Element(tag, props, children);
      var isPossibleComponent = tag[0] === tag[0].toUpperCase();

      if (isPossibleComponent) {
        console.warn('Possible [', tag,
          '] component is not found, element used instead');
      }
    }

    return element;
  };

  jsx.register = function(name, options) {
    var renderer = options.renderer;

    jsx.components[name] = {
      options: options,
      renderer: renderer,
      name: name
    };
  };

  jsx.compile = function(component, props, children) {
    if (!hasOwn.call(jsx.components, component)) {
      throw new Error('Component not found');
    }

    component = new Component(jsx.components[component], props, children);

    return component;
  };

  jsx.toDOM = function(node, params) {
    var fragment = document.createDocumentFragment();
    var onElement = params.onElement || params.onEnterElement;
    var onLeaveElement = params.onLeaveElement;
    var onComponent = params.onComponent;
    var onText = params.onText;

    var elementDepth = 0;

    var parseElement = function(node, domParent) {
      var domElement = document.createElement(node.name);
      var sendParams = {
        depth: elementDepth
      };

      domParent.appendChild(domElement);

      if (onElement) {
        onElement(node, domElement, sendParams);
      }

      lib.each(node.props, function(val, key) {
        if (key === 'style') {
          // need special units handling
          // e.g. width: 10 -> width: '10px'
          lib.extend(domElement.style, val);
        } else {
          domElement[key] = val;
        }
      });

      elementDepth++;
      node.children.forEach(function(childNode) {
        doParse(childNode, domElement);
      });
      elementDepth--;

      if (onLeaveElement) {
        onLeaveElement(node, domElement, sendParams);
      }
    };

    var parseComponent = function(node, domParent) {
      if (onComponent) {
        onComponent(node);
      }

      // may this is batter place for calling |renderer| on component

      // forward component tree
      doParse(node.tree, domParent);
    };

    var parsePrivitive = function(value, domParent, depth) {
      if (value == null || typeof value === 'string' && !value) {
        // ignore void values and empty strings
        return;
      }

      depth = depth | 0;

      if (typeof value === 'function') {
        value = value();
      }

      // cases
      if (isArray(value)) {
        if (depth > 3) {
          console.warn('Too much depth [array]');
          return;
        }

        value.forEach(function(item) {
          parsePrivitive(item, domParent, depth + 1);
        });
      } else /*if (typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
      ) */{
        if (onText) {
          onText(value, depth);
        }

        domParent.appendChild(document.createTextNode(value + ''));
      }
    };

    var doParse = function(node, domParent) {
      if (node instanceof jsx.Component) {
        parseComponent(node, domParent);
      } else if (node instanceof jsx.Element) {
        parseElement(node, domParent);
      } else {
        parsePrivitive(node, domParent);
      }
    };

    doParse(node, fragment);

    return fragment;
  };

  jsx.Component = Component;
  jsx.Element = Element;
  jsx.Node = Node;

  if (typeof module !== 'undefined') {
    module.exports = jsx;
  } else {
    global.jsx = jsx;
  }

  tpls.register('jsx', {
    default: true,
    compile: jsx.compile,
    register: jsx.register
  });
}(this));