if (file === 'embed.js') {
  var child_process = require('child_process');
  var path_mod = require('path');

  child_process.spawn('node', ['build_jsx.js'], {
    cwd: path_mod.resolve(root)
  });
}