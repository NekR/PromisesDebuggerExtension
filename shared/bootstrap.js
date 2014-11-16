modules.ready(function() {
  modules.require('parser').parse(document.body);
});

modules.load({
  version: 1,
  deps: [
    // sync lib
    'fw/cui/lib/sync.js',

    // cui modules
    'fw/cui/modules/lib.js',
    'fw/cui/modules/events.js',
    'fw/cui/modules/utils.js',
    'fw/cui/modules/ui.js',
    'fw/cui/modules/types.js',
    'fw/cui/modules/parser.js',
    'fw/cui/modules/dom-parser.js',
    'fw/cui/modules/tpls.js',
    // cui controls
    'fw/cui/modules/basic.js',
    'fw/cui/modules/forms/forms.js',
    'fw/cui/modules/class-map.js',

    // local modules

    // jsx modules
    'fw/cui/modules/jsx/jsx.js',
    'fw/cui/modules/jsx/jsx-parser.js',

    // jsx templates bundle
    'jsx_dist/jsx_dist.js',

    // next components
    'fw/modules/panel.js',
    'fw/modules/checkbox.js',
    'fw/modules/settings.js',
    'fw/modules/main.js'
  ],
  url: 'fw/cui/modules.js',
  path: './',
  debug: false,
  packaged: false,
  webapp: false,
  cache: false
});