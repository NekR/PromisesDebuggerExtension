if (!global.Promise) return false;

var isChrome = typeof chrome !== 'undefined';

var getDesc = Object.getOwnPropertyDescriptor,
  hasOwn = Object.prototype.hasOwnProperty,
  recurciveGetDesc = function(object, prop) {
    do {
      var result = getDesc(object, prop);
    } while (!result && (object = Object.getPrototypeOf(object)));

    return result;
  };

var promiseByProxy = new WeakMap(),
  provider = PromisesDebugger.registerProvider('es6', {});

var promiseDesc = recurciveGetDesc(global, 'Promise'),
  originalPromise = global.Promise,
  originalPromiseResolve = recurciveGetDesc(originalPromise, 'resolve'),
  originalPromiseReject = recurciveGetDesc(originalPromise, 'reject'),
  originalPromiseAll = recurciveGetDesc(originalPromise, 'all'),
  originalPromiseRace = recurciveGetDesc(originalPromise, 'race'),
  PromiseForInstanceCheck;

if (!global.Proxy) {
  var PromiseProxy = (function() {
    var PromiseConstructor;
    var PromiseProxy = function(target, params) {
      if (typeof target === 'function') {
        return (PromiseConstructor = ProxyPromiseConstructor(target, params));
      } else if (target instanceof originalPromise) {
        return ProxyPromiseInstance(target, params);
      }
    };

    var ProxyPromiseInstance = function(target, params) {
      // target is instance of Promise

      var proxy = Object.create(PromiseConstructor.prototype);
      // target.proxyInstance = proxy;
      proxy.promise = target;

      if (params.get) {
        var thenDesc = recurciveGetDesc(target, 'then'),
          catchDesc = recurciveGetDesc(target, 'catch');

        Object.defineProperties(proxy, {
          then: {
            enumerable: thenDesc.enumerable,
            configurable: thenDesc.configurable,
            get: function() {
              return params.get(target, 'then')
            }
          },
          catch: {
            enumerable: catchDesc.enumerable,
            configurable: catchDesc.configurable,
            get: function() {
              return params.get(target, 'catch')
            }
          }
        });
      }

      return proxy;
    };

    var ProxyPromiseConstructor = function(target, params) {
      if (params.construct) {
        // This is proxy constructor
        var proxy = function PromiseProxy(executor) {
          var proxyInstance = params.construct(target, arguments);

          if (proxyInstance.promise) {
            this.promise = proxyInstance.promise;
          }
          
          return proxyInstance;
        };
      } else {
        var proxy = function() {};
      }

      if (params.get) {
        var PromiseConstructorPropGetter = function(prop) {
          var desc = recurciveGetDesc(target, prop);

          return {
            get: function() {
              return params.get(target, prop, target);
            },
            configurable: desc.configurable,
            enumerable: desc.enumerable
          };
        };

        Object.defineProperties(proxy, {
          resolve: PromiseConstructorPropGetter('resolve'),
          reject: PromiseConstructorPropGetter('reject'),
          all: PromiseConstructorPropGetter('all'),
          race: PromiseConstructorPropGetter('race')
        });
      }

      return proxy;
    };

    return PromiseProxy;
  }());
}

var makeProxy = function(target, params) {
  if (global.Proxy) {
    return new Proxy(target, params);
  } else {
    return PromiseProxy(target, params);
  }
};

var promiseWrap = function(promise, registeredData) {
  var doThen = function(onResolve, onReject, caller) {
    var resolve = function(val) {
      chaingRegistered.setValue({
        type: 'value',
        value: val
      });

      return val;
    },
    reject = function(val) {
      chaingRegistered.setValue({
        type: 'error',
        value: val
      });

      provider.reportError({
        value: val
      });

      return val;
    };

    if (onResolve == null) {
      onResolve = function() {};
    } else if (typeof onResolve !== 'function' && false) {
      throw new TypeError('...');
    }

    if (onReject == null) {
      onReject = function() {};
    } else if (typeof onReject !== 'function' && false) {
      throw new TypeError('...');
    }

    function onResolveWrap(val) {
      if (isChrome) {
        var ret = new originalPromise(function(retResolve, DONT_USE) {
          setTimeout(function() {
            ret.then(function(a) {
              resolve(a);
            }, function(b) {
              reject(b);
            });
          }, 0);

          var retVal = onResolve.call(promise, val);

          retResolve(retVal);
        });

        return ret;
      }

      var retVal = onResolve.call(promise, val);

      // resolve(retVal);
      return retVal;
    }

    function onRejectWrap(val) {
      if (isChrome) {
        var ret = new originalPromise(function(retResolve, DONT_USE) {
          setTimeout(function() {
            ret.then(function(a) {
              resolve(a);
            }, function(b) {
              reject(b);
            });
          }, 0);

          var retVal = onReject.call(promise, val);

          retResolve(retVal);
        });

        return ret;
      }

      var val = onReject.call(promise, val);
      // reject(val);
      return val;
    }

    var result = promise.then(onResolveWrap, onRejectWrap);

    try {
      throw new Error();
    } catch (e) {
      var stack = e.stack;
    }

    if (!isChrome) {
      result.then(resolve, reject);
    }

    caller = 'Promise.' + caller + '()';

    var chaingRegistered = provider.register(result, {
      topLevel: false,
      stack: stack,
      parent: registeredData,
      caller: caller
    });

    return promiseWrap(result, chaingRegistered);
  },
  thenWrap = function(onResolve, onReject) {
    return doThen.call(this, onResolve, onReject, 'then');
  },
  catchWrap = function(onReject) {
    return doThen.call(this, null, onReject, 'catch');
  };

  var proxy = makeProxy(promise, {
    get: function(target, name) {
      if (name === 'then') return thenWrap;
      if (name === 'catch') return catchWrap;

      return target[name];
    }
  });

  promiseByProxy.set(proxy, promise);

  return proxy;
};

Object.defineProperty(global, 'Promise', {
  value: PromiseForInstanceCheck = makeProxy(originalPromise, {
    construct: function(Promise, args) {
      var executor = args[0],
        registerValue,
        name = executor.name;

      if (typeof executor !== 'function') throw new TypeError('...');

      var promise = new Promise(function(resolve, reject) {
        var result = executor.call(this, function resolveWrap(val) {
          /*var value = {
            type: 'value',
            value: val
          };

          if (registeredData) {
            registeredData.setValue(value);
          } else {
            registerValue = value;
          }*/

          if (registerValue) return;

          return resolve.call(this, val);
        }, function rejectWrap(val) {
          /*var value = {
            type: 'error',
            value: val
          };

          if (registeredData) {
            registeredData.setValue(value);
          } else {
            registerValue = value;
          }*/

          if (registerValue) return;

          return reject.call(this, val);
        });

        return result;
      });

      try {
        throw new Error();
      } catch (e) {
        var stack = e.stack;
      }

      var caller = 'new Promise()';

      var registeredData = provider.register(promise, {
        stack: stack,
        caller: caller,
        name: name
      });

      promise.then(function(val) {
        var value = {
          type: 'value',
          value: val
        };

        registerValue = value;

        registeredData.setValue(value);
      }, function(val) {
        var value = {
          type: 'error',
          value: val
        };

        registerValue = value;

        provider.reportError({
          value: val
        });

        registeredData.setValue(value);
      });

      /*if (registerValue) {
        registeredData.setValue(registerValue);
      }*/

      return promiseWrap(promise, registeredData);
    },
    get: function(target, name) {
      // console.log('get', arguments);

      if (fake.hasOwnProperty(name)) {
        return fake[name];
      }

      return target[name];
    }
  }),
  enumerable: promiseDesc.enumerable,
  configurable: promiseDesc.configurable,
  writable: promiseDesc.writable
});

var fake = {};

fake.resolve = function(val) {
  var result = originalPromiseResolve.value.call(originalPromise, val);

  try {
    throw new Error();
  } catch (e) {
    var stack = e.stack;
  }

  var registeredData = provider.register(result, {
    stack: stack,
    caller: 'Promise.resolve()'
  });

  result.then(function(val) {
    registeredData.setValue({
      type: 'value',
      value: val
    });
  });

  return promiseWrap(result, registeredData);
};

fake.reject = function(val) {
  var result = originalPromiseReject.value.call(originalPromise, val);

  try {
    throw new Error();
  } catch (e) {
    var stack = e.stack;
  }

  var registeredData = provider.register(result, {
    stack: stack,
    caller: 'Promise.reject()'
  });

  result.then(null, function(val) {
    registeredData.setValue({
      type: 'error',
      value: val
    });

    provider.reportError({
      value: val
    });
  });

  return promiseWrap(result, registeredData);
};

fake.all = function(arr) {
  arr = arr.map(function(proxy) {
    return promiseByProxy.get(proxy);
  });

  var result = originalPromiseAll.value.call(originalPromise, arr);

  try {
    throw new Error();
  } catch (e) {
    var stack = e.stack;
  }

  var registeredData = provider.register(result, {
    stack: stack,
    caller: 'Promise.all()'
  });

  result.then(function(val) {
    registeredData.setValue({
      type: 'value',
      value: val
    });
  }, function(val) {
    registeredData.setValue({
      type: 'error',
      value: val
    });
  });

  return promiseWrap(result, registeredData);
};

fake.race = function(arr) {
  arr = arr.map(function(proxy) {
    return promiseByProxy.get(proxy);
  });

  var result = originalPromiseRace.value.call(originalPromise, arr);

  try {
    throw new Error();
  } catch (e) {
    var stack = e.stack;
  }

  var registeredData = provider.register(result, {
    stack: stack,
    caller: 'Promise.race()'
  });

  result.then(function(val) {
    registeredData.setValue({
      type: 'value',
      value: val
    });
  }, function(val) {
    registeredData.setValue({
      type: 'error',
      value: val
    });
  });

  return promiseWrap(result, registeredData);
};

provider.isPromise = function(value) {
  if (value instanceof originalPromise ||
      value instanceof PromiseForInstanceCheck
  ) {
    value = promiseByProxy.get(value) || value;
    return value;
  }
};