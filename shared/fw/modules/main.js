var ui = require('ui');
var parser = require('parser');
var panel = require('panel');

ui.define('main', {
  handler: function() {
    var self = this;

    var headTpl = self.get('template', 'head');
    var needReloadTpl = self.get('template', 'need-reload');

    events.on(self, parser.events.parsed, function() {
      var head = self.children.head;
      var needReload = self.children.needReload;

      head.render(headTpl.compile());
      needReload.render(needReloadTpl.compile());
    });
  }
});

ui.define('attach-button', {
  parent: 'button',
  handler: function() {
    var self = this;

    events.on(self.node, 'click', function() {
      panel.sendServiceAction(self.get('serviceAction'));

      self.get('attachToggle').then(function(toggle) {
        toggle.set('selected', true);
      });
    });
  },
  properties: {
    serviceAction: 'string',
    attachToggle: 'target'
  }
});

ui.define('attach-toggle', {
  parent: 'button',
  handler: function() {
    var self = this;

    events.on(panel.events.updateAttach, function(data) {
      self.set('selected', data.attached);
    });

    self.set('selected', panel.get('attached'));

    events.on(self.node, 'click', function() {
      var selected = self.get('selected');

      if (!selected) {
        panel.sendServiceAction('attach');
      } else {
        panel.sendServiceAction('detach');
      }

      self.set('selected', !selected);
    });
  },
  properties: {
    selected: 'boolean'
  }
});

ui.define('clear-button', {
  parent: 'button',
  handler: function() {
    var self = this;

    events.on(self.node, 'click', function() {
      panel.doClear();
    });
  }
});

ui.define('settings-button', {
  parent: 'button',
  handler: function() {
    var self = this;

    events.on(self.node, 'click', function() {
      // self.get('popup').then();
    });
  },
  properties: {
    popup: 'target'
  }
});