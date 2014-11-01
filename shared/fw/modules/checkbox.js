var ui = require('ui'),
  parser = require('parser');

var exports = {
  events: events.getMap(module.name, [
    'checked'
  ])
};

ui.define('checkbox', {
  base: ['input[type="checkbox"]'],
  handler: function() {
    var self = this,
      selfChecked = self.get('checked'),
      baseChecked = self.node.checked;

    if (selfChecked && !baseChecked) {
      self.node.checked = true;
    } else if (!selfChecked && baseChecked) {
      self.set('boolean:checked', true);
    }

    events.on(self.node, 'click change', function() {
      var checked = self.node.checked;

      if (self.get('checked') !== checked) {
        self.set('boolean:checked', checked);
        events.fire(self, exports.events.checked);
      }
    });
  },
  properties: {
    checked: ['boolean', false, {
      set: function(control, name, value) {
        this.node.checked = value;
      }
    }]
  }
});