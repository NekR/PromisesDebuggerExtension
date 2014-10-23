var exports = {},
  lib = require('lib'),
  utils = require('utils'),
  hasOwn = Object.prototype.hasOwnProperty;

exports.eventsArr = [
  'load',
  'error',
  'progress',
  'timeout',
  'end',
  'abort',
  'result'
];

exports.events = events.getMap(module.name, exports.eventsArr);
exports.events.load = exports.events.result;

var AjaxError = function AjaxError(reason, status, transport) {
  Error.call(this);

  this.reason = reason;
  this.status = status;
  this.transport = transport;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AjaxError);
  }
},
ajax = exports;

AjaxError.prototype = Object.create(Error.prototype);

var JSONPCount = 0,
  FN_KEY = '_jsonpCallback',
  DEFAULT_JSONP_CALLBACK = 'callback';

var requestTypes = {
  urlencoded: 'application/x-www-form-urlencoded',
  json: 'application/json',
  text: 'text/plain'
},
requestTypeHandlers = {
  urlencoded: function(data) {
    return Sync.escape(data);
  },
  json: function(data) {
    return JSON.stringify(data);
  },
  text: function(data) {
    return data;
  }
},
responseTypes = {
  json: function(text) {
    return text ? JSON.parse(text) : null;
  }
},
responseTypesMap = {
  'application/json': 'json'
};

var appendQuery = function(url, query) {
  if (url.indexOf('?') !== -1) {
    return url + '&' + query;
  } else {
    return url + '?' + query;
  }
},
extendPromise = function(promise, map) {
  events.wrap(promise, {
    noEventForward: true
  });

  exports.eventsArr.forEach(function(eventKey) {
    promise[eventKey] = function(val) {
      if (typeof val === 'function') {
        events.on(promise, exports.events[eventKey], val);
        return this;
      }

      if (map && hasOwn.call(map, eventKey)) {
        map[eventKey].call(promise, val);
      } else {
        events.fire(promise, exports.events[eventKey], val);
      }

      return this;
    };
  });
},
getAjaxError = function(reason, status, transport, name) {
  var error = new AjaxError(reason, status, transport);

  error.transportName = name;
  error[name] = transport;

  return error;
};

ajax.send = function(options) {
  var xhr = new XMLHttpRequest(),
    method = typeof options.method === 'string' ?
      options.method.toUpperCase() : 'GET',
    contentType = typeof options.contentType === 'string' ?
      options.contentType.toLowerCase() : 'urlencoded',
    data = options.data,
    url = options.url,
    responseType = typeof options.responseType === 'string' ?
      options.responseType.toLowerCase() : '';

  var promise = new Promise(function(resolve, reject) {
    var fireError = function(reason, status, event) {
      if (errorFired) return;
      errorFired = true;

      var error = getAjaxError(reason, status, xhr, 'xhr');

      if (event) {
        event.fire(promise, exports.events[event], error);
      } else {
        events.fire(promise, exports.events.error, error);
      }

      reject(error);
    },
    errorFired;

    if (typeof data === 'object' && data) {
      data = requestTypeHandlers[method === 'POST' ?
        contentType : 'urlencoded'](data);
    }

    typeof data === 'string' || (data = '');

    if (method !== 'POST' && data) {
      url = appendQuery(url, data);
      data = null;
    }

    xhr.url = url;
    xhr.open(method, url, /*async*/ true);
    
    if (responseType) {
      xhr.responseType = responseType;
    }

    if (options.withCredentials) {
      xhr.withCredentials = true;
    }

    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    if (method === 'POST' || contentType !== 'urlencoded') {
      xhr.setRequestHeader('Content-Type', requestTypes[contentType]);
    }

    if (options.headers) {
      Sync.each(options.headers, function(val, key) {
        xhr.setRequestHeader(key, val);
      });
    }

    events.on(xhr, 'load', function(e) {
      var response = xhr.response,
        responseType = xhr.responseType,
        hasError;

      if (!responseType && response) {
        responseType = xhr.getResponseHeader('Content-Type');
        responseType = responseType.split(';', 1)[0];

        if (hasOwn.call(responseTypesMap, responseType)) {
          responseType = responseTypesMap[responseType];
          var handleResponse = responseTypes[responseType];
        }
      }

      if (handleResponse) {
        try {
          response = response ? handleResponse(response) : '';
        } catch (e) {
          response = '';
          hasError = 'parseerror';
        }
      }

      if (hasError) {
        fireError(hasError);
        return;
      }

      var status = xhr.status,
        scheme = url.match(/^(\w+?\:)\/\//),
        isFsReq;

      if ((scheme && scheme[1] === 'file:') ||
        !scheme && window.location.protocol === 'file:') {
        isFsReq = true;
      }

      if ((status >= 200 && status < 300) || !status && isFsReq) {
        if (!status) {
          status = 200;
        }

        events.fire(promise, exports.events.result, response, status);

        resolve({
          response: response,
          status: status,
          xhr: xhr
        });
      } else if (status >= 400/* && status < 600*/) {
        fireError('httperror', status);
      } else if (status === 304) {
        // handle http cache here
        // if no cached content:
        fireError('cacheerror');
      }
    });

    events.on(xhr, 'error', function() {
      fireError('neterror');
    });

    events.on(xhr, 'progress', function(e) {
      events.fire(promise, exports.events.progress, {
        lengthComputable: e.lengthComputable,
        loaded: e.loaded,
        total: e.total
      });
    });

    events.on(xhr, 'abort', function() {
      // events.fire(promise, exports.events.abort);
      fireError('abort', void 0, 'timeout');
    });

    events.on(xhr, 'timeout', function() {
      // events.fire(promise, exports.events.timeout);
      fireError('timeout', void 0, 'timeout');
    });

    events.on(xhr, 'loadend', function() {
      events.fire(promise, exports.events.end, xhr);
    });

    xhr.send(data);
  });

  extendPromise(promise, {
    abort: function() {
      xhr.abort();
    }
  });

  return promise;
};

ajax.script = function(options) {
  var url = typeof options === 'string' ? options : options.url;

  if (typeof url !== 'string' || !url) {
    return Promise.reject(getAjaxError('nourl', void 0, null, 'script'));
    // return Promise.reject(new AjaxError('nourl'));
  }

  return new Promise(function(resolve, reject) {
    var script = loadScript(url, function(err) {
      if (err) {
        var error = getAjaxError('error', void 0, script, 'script');
        // var error = new AjaxError('error');

        reject(error);
      } else {
        resolve(script)
      }
    });
  });
};

ajax.jsonp = function(options) {
  var url = options.url,
    data = options.data || '',
    callbackKey = options.callbackKey || DEFAULT_JSONP_CALLBACK,
    aborted,
    abortMethod;

  var promise = new Promise(function(resolve, reject) {
    var fn = FN_KEY + (JSONPCount++),
      executed = false,
      loadedData;

    var fireError = function(reason, status, event) {
      if (errorFired) return;
      errorFired = true;

      var error = getAjaxError(reason, status, script, 'jsonp');

      if (event) {
        event.fire(promise, exports.events[event], error);
      } else {
        events.fire(promise, exports.events.error, error);
      }

      reject(error);
    },
    errorFired;

    if (typeof data === 'object') {
      data[callbackKey] = fn;
      data = Sync.escape(data);
    } else {
      data += (data ? '&' : '') + callbackKey + '=' + fn;
    }

    url = appendQuery(url, data);

    window[fn] = function(data) {
      executed = true;
      loadedData = data;
    };

    abortMethod = function() {
      if (aborted) return;

      window[fn] = null;
      aborted = true;
      script.remove();

      fireError('abort', void 0, 'abort');
      /*events.fire(promise, exports.events.abort);
      reject(new AjaxError('abort'));*/
    };

    var script = loadScript(url, function(err) {
      if (aborted) return;

      window[fn] = null;

      if (!executed || err) {/*
        var error = new AjaxError('error');
        events.fire(promise, exports.events.error, error);*/

        fireError('error');

        reject(error);
      } else {
        events.fire(promise, exports.events.result, loadedData);

        resolve({
          response: loadedData
        });
      }
    });
  });

  extendPromise(promise, {
    abort: abortMethod
  });

  return promise;
};

var FRAME_OPTIONS = {
  method: 'GET',
  enctype: 'application/x-www-form-urlencoded',
  action: '',
  global: false,
  target: '',
  timeout: 0
};

ajax.frame = function(options) {
  if (!options) {
    // return Promise.reject(new AjaxError('noarg'));
    return Promise.reject(getAjaxError('noarg', void 0, null, 'frame'));
  }

  var nodeName = options.nodeName;

  if (typeof nodeName === 'string' && nodeName.toLowerCase() === 'form') {
    form = options;

    options = lib.extend({}, FRAME_OPTIONS, arguments[1]);

    [
      'action',
      'method',
      'enctype',
      'global',
      'target'
    ].forEach(function(key) {
      var val = form.getAttribute(key);

      if (val) {
        options[key] = val;
      }
    });
  } else {
    options = lib.extend({}, FRAME_OPTIONS, options);
  }

  var target = document.body || document.head || document.documentElement,
    data,
    url,
    method,
    form,
    autoRemoveForm;

  var sendAsync = function() {
    var iframe,
      submit,
      key,
      ignoreLoad,
      pendingTimer,
      abortMethod;

    var promise = new Promise(function(resolve, reject) {
      var loadHandler = function() {
        if (ignoreLoad) return;

        setTimeout(cleanUp, 1);

        try {
          var win = this.contentWindow;
        } catch (e) {}

        if (win) {
          var response = options.responseHandler;

          if (response) {
            response = response(win);
          } else {
            response = win;
          }

          events.fire(promise, exports.events.result, response);

          resolve({
            response: response,
            win: win
          });
        } else {
          fireError('error');
        }
      },
      cleanUp = function() {
        try {
          target.removeChild(iframe);
        } catch (e) {};

        iframe = target = null;
        clearTimeout(pendingTimer);
      };

      var fireError = function(reason, status, event) {
        if (errorFired) return;
        errorFired = true;

        var error = getAjaxError(reason, status, iframe, 'frame');

        if (event) {
          event.fire(promise, exports.events[event], error);
        } else {
          events.fire(promise, exports.events.error, error);
        }

        reject(error);
      },
      errorFired;

      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'javascript: true';

      abortMethod = function() {
        ignoreLoad = true;

        try {
          if (this.contentWindow.stop) {
            this.contentWindow.stop();
          } else {
            this.contentWindow.document.execCommand('Stop');
          }
        } catch (e) {
          this.src = 'about:blank';
        }

        cleanUp();
        fireError('abort', void 0, 'abort');
      };

      isFinite(options.timeout) && (pendingTimer = setTimeout(function() {
        ignoreLoad = true;
        cleanUp();
        fireError('timeout', void 0, 'timeout');
      }, options.timeout));

      if (form) {
        submit = form.constructor.prototype.submit;
        key = 'iframe' + Date.now();
        iframe.id = iframe.name = form.target = key;

        events.once(iframe, 'load', function() {
          events.once(iframe, 'load', function() {
            loadHandler.apply(this, arguments);
            
            if (form.parentNode === target && autoRemoveForm) {
              target.removeChild(form);
            }

            form.target = null;
            form = null;
          });
          
          setTimeout(function() {
            submit.call(form);
          }, 1);
        });
      } else {
        events.on(iframe, 'load', loadHandler);
        iframe.src = url;
      }

      target.appendChild(iframe);
    });

    extendPromise(promise, {
      abort: abortMethod
    });

    return promise;
  },
  sendGlobal = function() {
    if (form) {
      var submit = form.constructor.prototype.submit;

      if (options.target) {
        form.target = options.target;
      }

      setTimeout(function() {
        submit.call(form);
      }, 1);
    } else {
      utils.goLink(url, options.target);
    }

    return Promise.resolve();
  };

  url = (options.action || options.url || window.location.href);
  method = (options.method + '').toUpperCase();

  if (method === 'POST' && !form) {
    form = document.createElement('form');
    form.style.display = 'none';
    form.action = url;
    form.method = 'POST';
    form.setAttribute('enctype', options.enctype);

    data = options.data;
    data && (data = lib.unescape(lib.escape(data), true));

    if (typeof data === 'object') {
      var fragment = document.createDocumentFragment();

      lib.each(data, function(val, key) {
        var input = document.createElement('input');

        input.type = 'hidden';
        input.name = key;
        input.value = val;

        fragment.append(input);
      });

      form.append(fragment);
    }

    autoRemoveForm = !options.global;
    target.append(form);
  } else if (method === 'GET') {
    data = options.data;
    data = data ? (typeof data === 'object' ? lib.escape(data) : data) : '';

    if (data = data.trim()) {
      url += (url.indexOf('?') !== -1 ? '&' : '?') + data;
    }
  }

  if (options.global) {
    return sendGlobal();
  }

  return sendAsync();
};

function loadScript(url, callback) {
  var script = document.createElement('script'),
    target = document.head,
    called = false;

  var end = function(e) {
    if (!called) {
      typeof callback === 'function' &&
        callback.call(script, e.type === 'error');

      called = true;
      target.removeChild(script);
    }
  };

  script.async = true;
  script.onerror = script.onload = end;
  script.src = url;

  return target.appendChild(script);
};