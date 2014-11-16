var ext = require('shared/ext.js');
var providers = [
  'es6'
];
var backendCode;

exports.providers = providers;
exports.getCode = function() {
  if (backendCode) return backendCode;

  var debugBackendCode = ext.loadSync('shared/promises-backend.js'),
    debugProvidersCode = '';

  providers.forEach(function(provider) {
    var code = ext.loadSync('shared/providers/' + provider + '.js');

    debugProvidersCode += ';(function(PromisesDebugger, global) {' +
      code + '}(PromisesDebugger, this));';
  });

  backendCode = debugBackendCode + debugProvidersCode;

  return backendCode;
};