var ui = require('ui');
var hasOwn = Object.prototype.hasOwnProperty;

ui.define('class-map', {
  handler: function() {
    var self = this;
    var classMap = this.get('classMap');
    var map = {};
    var name2class = {};

    var compareProp = function(name, val) {
      if (!hasOwn.call(map, name)) return;

      var mapVal = map[name],
        add = mapVal === true ? !!val : (val + '') === mapVal,
        classVal = name2class[name];

      self.view.classList[add ? 'add' : 'remove'](classVal);
    },
    handlerMap = function() {
      Object.keys(classMap).forEach(function(key) {
        var equalIndex = key.search(/\s*=\s*/),
          originalKey = key;

        if (equalIndex === -1) {
          map[key] = true;
        } else {
          var val = key.slice(equalIndex + 1);
          key = key.slice(0, equalIndex);
          map[key] = val;
        }

        name2class[key] = classMap[originalKey];
      });
    };

    handlerMap();

    events.on(self, ui.events.propChange, function(e, data) {
      var type = data.type,
        name = data.name;

      console.log('prop change');

      switch (type) {
        case 'string':
        case 'boolean':
        case 'number': {
          compareProp(name, self.get(name));
        }
      }
    });
  },
  properties: {
    classMap: 'json'
  }
});