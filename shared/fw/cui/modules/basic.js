var ui = require('ui'),
  parser = require('parser'),
  utils = require('utils'),
  touch = require('touch'),
  uiStates = ui.states;

var exports = {
  events: events.getMap(module.name, [
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
},
originalStateSet = parser.OriginalElement.properties.state.set;

ui.define('live-element', {
  mixins: ['touch-element'],
  handler: function() {
    var startValue,
      self = this,
      view = this.view,
      node = this.node,
      beforeActive = ui.states.none,
      deactiveConst = 'mouseup mousedown',
      docDeactiveConst = deactiveConst,
      activeConst = 'mousedown';

    if (utils.hasTouch) {
      activeConst = 'touchstart';
      deactiveConst = 'touchend touchcancel touchleave';
      docDeactiveConst = 'touchend touchcancel';
    }

    var deactiveHandler = function(e) {
      if (!self) return;

      if (self.get('state') === ui.states.active) {console.log('deactive', e.type, e.currentTarget.nodeName);
        if (e.currentTarget === document || e.target === view || view.contains(e.target)) {
          if (!utils.hasTouch) {
            self.set('state', ui.states.none, {
              silent: false,
              direct: false
            });
          }

          self.set('state', beforeActive, {
            direct: true
          });
        } else if (beforeActive === ui.states.hover) {
          self.set('state', ui.states.none, {
            direct: true
          });
        }

        console.log(self.get('state'), self.view.getAttribute('data-state'));
        if (self.get('state') !== self.view.getAttribute('data-state')) {
          debugger;
        }
      }

      events.remove(view, deactiveConst + ' ' + ui.events.destroy, deactiveHandler);
      events.remove(document, docDeactiveConst, deactiveHandler);
    },
    activeHandler = function(e) {
      var state = self.get('state');

      if (state !== ui.states.none && state !== ui.states.hover) return;

      console.log('activate');

      beforeActive = state;
      self.set('state', ui.states.active, {
        direct: true
      });

      events.once(document, 'mousedown', function() {
        events.on(document, docDeactiveConst, deactiveHandler);
      });
      events.on(view,
        deactiveConst + ' ' + ui.events.destroy, deactiveHandler);
    };

    events.on(self, ui.events.destroy, function() {
      self = view = node = null;
    });

    events.on(view, 'mouseenter mouseleave', function(e) {
      var state = self.get('state');

      if (state !== ui.states.none && state !== ui.states.hover) return;

      if (e.type === 'mouseenter') {
        state = ui.states.hover;
      } else {
        state = ui.states.none;
      }

      self.set('state', state, {
        direct: true
      });
    });

    events.on(view, activeConst, activeHandler);
    events.on(view, exports.events.deactiveControl, deactiveHandler);

    events.on(self, ui.events.changeState, function(e, data) {
      if (data.state === ui.states.disabled) {
        events.fire(self, ui.events.disabled);
      } else if (data.state === ui.states.none && self.get('disabled')) {
        events.fire(self, ui.events.enabled);
      }
    });

    events.on(self, ui.events.disabled, function() {
      utils.makeUnselectable(node, {
        preventTab: true
      });

      self.set('disabled', true);
      node.blur();
    });

    events.on(self, ui.events.enabled, function() {
      utils.restoreSelectable(node);
      self.set('disabled', false);
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
        control.set('boolean:' + name, value);
        control.node.disabled = value;
      }
    }
  }
});

ui.define('focusable', {
  handler: function() {
    var self = this,
      node = this.node;

    var getValue = function(control) {
      return control.get('value');
    },
    listenInput = function() {
      if (getValue(self) !== startValue) {
        self.set('state', ui.states.none, {
          silent: false,
          direct: false
        });

        self.set('state', ui.states.focus);

        events.remove(self, ui.events.change, listenInput);
      }
    };

    events.on(node, 'focus blur', function(e) {
      var state = self.get('state');

      if (state === ui.states.error/* ||
          state === ui.states.loading ||
          state === ui.states.disabled*/) return;

      self.set('state', e.type === 'focus' ? ui.states.focus : ui.states.none, {
        direct: true
      });
    });

    events.on(self, ui.events.changeState, function(e, data) {
      if (data.state !== ui.states.error) return;

      events.on(node, 'focus', function() {
       startValue = getValue(self);
       events.on(self, ui.events.change, listenInput);
      });
    });
  }
});

/*ui.define('live-element', {
  mixins: ['touch-element'],
  handler: function() {
    var startValue,
      self = this,
      view = this.view,
      node = this.node,
      beforeActive = ui.states.none,
      deactiveConst = 'mouseup mousedown',
      docDeactiveConst = deactiveConst,
      activeConst = 'mousedown';

    if (utils.hasTouch) {
      activeConst = 'touchstart';
      deactiveConst = 'touchend touchcancel touchleave';
      docDeactiveConst = 'touchend touchcancel';
    }

    var deactiveHandler = function(e) {
      if (!self) return;

      if (self.get('state') === ui.states.active) {console.log('deactive', e.type, e.currentTarget.nodeName);
        if (e.currentTarget === document || e.target === view || view.contains(e.target)) {
          if (!utils.hasTouch) {
            self.set('state', ui.states.none, {
              silent: false,
              direct: false
            });
          }

          self.set('state', beforeActive, {
            direct: true
          });
        } else if (beforeActive === ui.states.hover) {
          self.set('state', ui.states.none, {
            direct: true
          });
        }

        console.log(self.get('state'), self.view.getAttribute('data-state'));
        if (self.get('state') !== self.view.getAttribute('data-state')) {
          debugger;
        }
      }

      events.remove(view, deactiveConst + ' ' + ui.events.destroy, deactiveHandler);
      events.remove(document, docDeactiveConst, deactiveHandler);
    },
    activeHandler = function(e) {
      var state = self.get('state');

      if (state !== ui.states.none && state !== ui.states.hover) return;

      console.log('activate');

      beforeActive = state;
      self.set('state', ui.states.active, {
        direct: true
      });

      events.once(document, 'mousedown', function() {
        events.on(document, docDeactiveConst, deactiveHandler);
      });
      events.on(view,
        deactiveConst + ' ' + ui.events.destroy, deactiveHandler);
    };

    events.on(self, ui.events.destroy, function() {
      self = view = node = null;
    });

    events.on(view, 'mouseenter mouseleave', function(e) {
      var state = self.get('state');

      if (state !== ui.states.none && state !== ui.states.hover) return;

      if (e.type === 'mouseenter') {
        state = ui.states.hover;
      } else {
        state = ui.states.none;
      }

      self.set('state', state, {
        direct: true
      });
    });

    events.on(view, activeConst, activeHandler);
    events.on(view, exports.events.deactiveControl, deactiveHandler);

    events.on(self, ui.events.changeState, function(e, data) {
      if (data.state === ui.states.disabled) {
        events.fire(self, ui.events.disabled);
      } else if (data.state === ui.states.none && self.get('disabled')) {
        events.fire(self, ui.events.enabled);
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

          if (
            (currentMap && (currentMap = currentMap.blocks) && currentMap.some(iter)) ||
            (newMap && (newMap = newMap.from) && !newMap.some(iter))
          ) {
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
    }
  }
});*/

/*utils.boxWidth(node, {
  inner: true
});*/