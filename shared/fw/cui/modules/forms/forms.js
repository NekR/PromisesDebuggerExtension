var ui = require('ui');
var parser = require('parser');
var utils = require('utils');

ui.define('button', {
  parent: 'focusable',
  handler: function() {

  },
  base: [
    'button',
    'a',
    '[role="button"]',
    'input[type="button"]',
    'input[type="submit"]'
  ]
});