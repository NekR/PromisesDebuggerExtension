var prefs = new (require('shared/prefs.js').Prefs);
var ext = require('shared/ext.js');
var backend = require('shared/backend.js');
var global = this;

var backendCode = backend.getCode();

parent.postMessage({
  PromisesWorker: true,
  action: 'backend_code',
  message: {
    code: backendCode
  }
}, '*');