var jsx = require('jsx-templates');
var fs = require('fs');
var path = require('path');

var JSX_SRC_PATH = __dirname + '/shared/jsx/';
var JSX_DIST_PATH = __dirname + '/shared/jsx_dist/jsx_dist.js';

var dir = fs.readdirSync(path.resolve(JSX_SRC_PATH));
var result = ["var jsx = require('jsx');"];

dir.forEach(function(file) {
  var filePath = path.resolve(JSX_SRC_PATH, file);
  var input = fs.readFileSync(filePath);
  var name = file.lastIndexOf('.');

  name = file.slice(0, name === -1 ? file.length : name);

  var output = jsx.generate(name, input);
  result.push(output);
});

fs.writeFileSync(path.resolve(JSX_DIST_PATH), result.join('\n\n'));