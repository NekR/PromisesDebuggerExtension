var ui = require('ui');

ui.define('test', {
  properties: {
    template: 'tpl'
  },
  handler: function() {
    var self = this;

    events.on(self.node, 'click', function(e) {
      e.preventDefault();

      var tpl = self.get('template');

      self.render(tpl.compile({
        text: 'blah'
      }));
    });
  }
});

ui.define('tested', {
  handler: function() {
    console.log('tested!');
  }
});