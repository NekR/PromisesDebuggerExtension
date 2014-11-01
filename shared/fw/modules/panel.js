

['updateSetting'].forEach(function(method) {
  exports[method] = PromisesPanel[method].bind(PromisesPanel);
});