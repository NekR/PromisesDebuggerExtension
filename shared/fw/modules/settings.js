var ui = require('ui'),
  parser = require('parser'),
  checkbox = require('checkbox'),
  panel = require('panel');

ui.define('settings', {
  handler: function() {
    var self = this;

    events.on(self, parser.events.parsed, function() {
      self.children.forEach(function(child) {
        events.on(child, checkbox.events.checked, function() {
          panel.updateSetting(child.get('string:setting'), child.get('checked'));
        });
      });
    });
  }
});