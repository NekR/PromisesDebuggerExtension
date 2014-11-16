var env = {
  origin: window.location.origin + '/worker',
  getURL: function(path) {
    return env.origin + path.replace(/^\.?\/?/, '/');
  }
};