const self = require('sdk/self');
const { Loader, Require } = require('toolkit/loader');

let options = require('@loader/options');

let extRoot = options.prefixURI + options.name + '/';

options.paths['shared/'] = self.data.url('shared/ext_modules/');
options.paths['lib/'] = options.paths['./'];
options.paths['data/'] = self.data.url('');

let replacemntLoader = Loader(options);
let replacemntRequire = Require(replacemntLoader);

exports.extRoot = extRoot;
exports.require = replacemntRequire;