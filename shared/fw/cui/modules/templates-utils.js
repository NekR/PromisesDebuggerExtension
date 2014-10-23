
ui.define('compiler', {
  parent: 'element',
  properties: {
    template: ['Default']
  },
  handler: function() {
    var self = this,
      compile;

    this.compile = function(data, sanitization) {
      var config = {
        params: Sync.extend({}, self.get('params'))
      };

      compile || (compile = template(self.get('template')));

      if (typeof sanitization === 'undefined' || sanitization === true) {
        sanitize(data, 'request', config);
      } else {
        if (Array.isArray(data)) {
          data = data.concat();
        } else if (typeof data === 'object') {
          data = Sync.extend({}, data);
        }

        config.request = data;
      }

      events.fire(self.node, exports.events.beforeCompile, config);

      return compile(config);
    };
  }
});

ui.define('inline-template', {
  parent: 'compiler',
  handler: function() {
    var template = this.view.innerHTML,
      self = this;

    // IE wtf
    template = template.replace(/='([\s\S]*?)'/g, function(str, pattern) {
      return '="' + utils.escapeHTML(pattern) + '"';
    });

    this.set('template', template);
    this.view.innerHTML = '';

    events.on(this.view, ui.events.destroy, function() {
      self.view.innerHTML = template;
    });

    var node = exports.currentNode();

    if (node) {
      node.children = [];
    }
  }
});

//John Resig template pattern
//http://ejohn.org/blog/javascript-micro-templating/
function template(str, fn) {
  if (str.nodeType) {
    return template(str.innerHTML);
  } else {
    str = str.replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'");

    fn = new Function("var p=[],print=function(){p.push.apply(p,arguments);};" +
      "with(this){p.push('" + str + "');}return p.join('');");
  };

  return function(data) {
    return fn.call(data);
  };
}

function sanitize(value, key, self) {
  if (value && typeof value === 'string') {
    value = utils.escapeHTML(value);
  } else if (Array.isArray(value)) {
    (value = value.concat()).forEach(sanitize);
  } else if (value && typeof value === 'object' &&
             !(ui.is(value, 'element')) && !value.nodeType) {
    Sync.each(value = Sync.extend({}, value), sanitize);
  }

  self[key] = value;
}

function generateTemplate(text, name) {
  return (text && name) ? ui.create('compiler', {
    properties: {
      template: text,
      templateName: name
    }
  }) : null;
}

function generateFromMap(value, tplName) {
  var tmp,
    templates = modules.require('templates');

  value = Sync.extend({}, value);

  if (tplName) {
    return templates.hasTemplate(tmp = value[tplName]) ?
      generateTemplate(templates.getTemplate(tmp), tmp) : null;
  } else {
    Object.keys(value).forEach(function(tpl) {
      if (templates.hasTemplate(tmp = value[tpl])) {
        value[tpl] = generateTemplate(templates.getTemplate(tmp), tmp);
      } else {
        delete value[tpl];
      }
    });

    return value;
  }
}

ui.type.define('tpl', {
  factory: function(data) {
    return {
      _default: data || ''
    }
  },
  get: function(control, name, tplName) {
    var cache = typedCache(this.type, control, name),
      templates = modules.require('templates'),
      value,
      tmp = null;

    if (cache) {
      cache = cache.valueOf();

      if (cache instanceof ui.controls.Compiler && !tplName) {
        return generateTemplate(cache.get('template'), cache.get('templateName'));
      } else if (typeof cache === 'object' && !isArray(cache)) {
        return generateFromMap(cache, tplName);
      } else if (typeof cache === 'string' && !tplName) {
        return templates.hasTemplate(cache) ?
        generateTemplate(templates.getTemplate(cache), cache) : null;
      }
    }

    value = ui.types.json.get.call(this, control, name);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      tmp = generateFromMap(value, tplName);
    } else if (value = ui.types.string.get.call(this, control, name)) {
      tmp = templates.hasTemplate(value) ?
      generateTemplate(templates.getTemplate(value), value) : null;
    }

    return tmp;
  },
  set: function(control, name, value) {
    if (!value) return;

    if (typeof value === 'string') {
      var templates = modules.require('templates');

      if (templates.hasTemplate(value)) {
        return typedCache(this.type, control, name, value);
      }

    } else if (typeof value === 'object' &&
               value instanceof ui.controls.Compiler || !isArray(value)) {
      return typedCache(this.type, control, name, value);
    }
  }
});