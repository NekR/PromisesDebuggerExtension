modules.ready(function() {
  modules.require('parser').parse(document.body);
});

modules.load({
  version: 1,
  deps: [
    'fw/lib/sync.js',
    'fw/cui/modules/lib.js',
    'fw/cui/modules/events.js',
    'fw/cui/modules/utils.js',
    'fw/cui/modules/ui.js',
    'fw/cui/modules/parser.js',

    'modules/panel.js',
    'modules/checkbox.js',
    'modules/settings.js',
    'modules/main.js'
  ],
  url: 'fw/cui/modules.js',
  path: './',
  debug: false,
  packaged: false,
  webapp: false,
  cache: false
});