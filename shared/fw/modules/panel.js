var exports = {
  events: events.map([
    'updateAttach'
  ]),
  get: function(key) {
    return PromisesPanel.data[key];
  },
  set: function(key, val) {
    PromisesPanel.data[key] = val;
  }
};

[
  'updateSetting',
  'sendServiceAction',
  'doClear'
].forEach(function(method) {
  exports[method] = PromisesPanel[method].bind(PromisesPanel);
});

PromisesPanel.onEvent = function(event, data) {
  events.fire(exports.events[event], data);
};