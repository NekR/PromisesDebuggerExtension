var ui = require('ui');
var parser = require('parser');
var utils = require('utils');
var uiStates = ui.states;

var exports = {
  events: events.map([
    'deactiveControl'
  ])
};

var statesMap = {
  hover: {
    allow: ['none', 'active', 'focus'],
    from: ['none']
  },
  active: {
    blocks: ['hover'],
    from: ['none', 'hover']
  },
  focus: {
    blocks: ['hover', 'active'],
    from: ['none', 'hover', 'active']
  },
  error: {
    blocks: ['none', 'hover', 'active', 'focus', 'selected']
  },
  selected: {
    blocks: ['none', 'hover', 'active', 'focus'],
    from: ['none', 'hover', 'active', 'focus']
  },
  loading: {
    blocks: ['none', 'hover', 'active', 'focus', 'selected']
  },
  readonly: {
    blocks: ['none', 'hover', 'active', 'focus', 'selected', 'loading', 'error']
  },
  disabled: {
    blocks: ['none', 'hover', 'active', 'focus', 'selected', 'loading', 'error', 'readonly']
  }
};

var originalStateSet = parser.OriginalElement.properties.state.set;

ui.define('live-element', {
  handler: function() {
    var self = this;
    var view = this.view;
    var node = this.node;

    var beforeActivate = uiStates.none;

    var ACTIVATE_EVENT = 'mousedown';
    var DEACTIVATE_EVENT = 'mouseup mousedown';
    var DOC_DEACTIVATE_EVENT = DEACTIVATE_EVENT;

    var deactiveHandler = function(e) {
      if (!self) return;

      if (self.get('state') === uiStates.active) {
        if (e.currentTarget === document || e.target === view || view.contains(e.target)) {
          self.set('state', uiStates.none, {
            silent: false,
            direct: false
          });

          if (beforeActivate !== ui.state.none) {
            self.set('state', beforeActivate, {
              direct: true
            });
          }
        } else if (beforeActivate === uiStates.hover) {
          self.set('state', uiStates.none, {
            direct: true
          });
        }
      }

      events.remove(view, [DEACTIVATE_EVENT, ui.events.destroy], deactiveHandler);
      events.remove(document, DOC_DEACTIVATE_EVENT, deactiveHandler);
    };

    var activeHandler = function(e) {
      if (!self) return;

      var state = self.get('state');

      if (state !== uiStates.none && state !== uiStates.hover) return;

      beforeActivate = state;

      self.set('state', uiStates.active, {
        direct: true
      });

      events.once(document, ACTIVATE_EVENT, docActivateHandler);
      events.on(view, [DEACTIVATE_EVENT, ui.events.destroy], deactiveHandler);
    };

    var docActivateHandler = function() {
      if (!self || self.zombie) return;

      events.on(document, DOC_DEACTIVATE_EVENT, deactiveHandler);
    };

    events.on(self, ui.events.destroy, function() {
      self = view = node = null;
    });

    events.on(view, 'mouseenter mouseleave', function(e) {
      var state = self.get('state');

      if (state !== uiStates.none && state !== uiStates.hover) return;

      if (e.type === 'mouseenter') {
        state = uiStates.hover;
      } else {
        state = uiStates.none;
      }

      self.set('state', state, {
        direct: true
      });
    });

    events.on(view, ACTIVATE_EVENT, activeHandler);
    events.on(view, exports.events.deactiveControl, deactiveHandler);

    events.on(self, ui.events.changeState, function(e, data) {
      if (data.state === uiStates.disabled && !self.get('disabled')) {
        self.set('disabled', true);
      } else if (data.state === uiStates.none && self.get('disabled')) {
        self.set('disabled', false);
      }
    });
  },
  properties: {
    state: {
      type: 'string',
      set: function(control, name, state, params) {
        if (params) {
          var direct = params.direct,
            silent = params.silent;
        }

        var current = control.get(name),
          currentMap = statesMap[current],
          newMap = statesMap[state];

        if (state === current) {
          return state;
        }

        if (direct) {
          var iter = function(state) {
            return uiStates[state] === current;
          };

          if ((currentMap && (currentMap = currentMap.blocks) &&
            currentMap.some(iter)) ||
              (newMap && (newMap = newMap.from) && !newMap.some(iter))) {
            return;
          }
        }

        // console.log('state: ', state === '' ? '(empty)' : state);

        originalStateSet.call(this, control, name, state, {
          state: state,
          direct: direct,
          silent: silent
        });

        // control.set(this.type + ':' + name, state);
      }
    },
    disabled: {
      type: 'boolean',
      set: function(control, name, value) {
        var node = control.node;

        if (value) {
          node.blur();
          utils.makeUnselectable(node, {
            preventTab: true
          });
        } else {
          utils.restoreSelectable(node);
        }

        control.set('boolean:' + name, value);
        node.disabled = value;
      }
    }
  }
});

ui.define('focusable', {
  parent: 'live-element',
  handler: function() {
    var self = this;
    var node = this.node;

    var getValue = function(control) {
      return control.get('value');
    };

    var listenInput = function() {
      if (getValue(self) !== startValue) {
        self.set('state', uiStates.none, {
          silent: false,
          direct: false
        });

        self.set('state', uiStates.focus);
        events.remove(self, ui.events.change, listenInput);
      }
    };

    var startValue = getValue(self);

    events.on(node, 'focus blur', function(e) {
      var state = self.get('state');

      if (state === uiStates.error ||
          state === uiStates.loading ||
          state === uiStates.disabled) return;

      state = e.type === 'focus' ? uiStates.focus : uiStates.none;

      self.set('state', state, {
        direct: true
      });
    });

    events.on(self, ui.events.changeState, function(e, data) {
      if (data.state !== uiStates.error) return;

      events.on(node, 'focus', function() {
        startValue = getValue(self);
        events.on(self, ui.events.change, listenInput);
      });
    });

    if (!node.hasAttribute('tabindex')) {
      self.set('tabIndex', 0);
    }
  },
  properties: {
    tabIndex: {
      type: 'default',
      get: function(control) {
        return control.node.tabIndex;
      },
      set: function(control, name, value) {
        control.node.tabIndex = value;
      }
    }
  }
});