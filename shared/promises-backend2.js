console.log('PromisesDebugger inside');

(function(global) {
  "use strict";

  if (!global.Promise || global.PromisesDebugger) return;

  var getDesc = Object.getOwnPropertyDescriptor,
    hasOwn = Object.prototype.hasOwnProperty,
    recurciveGetDesc = function(object, prop) {
      do {
        var result = getDesc(object, prop);
      } while (!result && (object = Object.getPrototypeOf(object)));

      return result;
    },
    isPlainObject = function(obj) {
      var proto = Object.getPrototypeOf(obj);

      return proto === Object.prototype || proto == null;
    };

  var isChrome = typeof chrome !== 'undefined';

  console.log('IS CHROME', isChrome);

  var PromisesDebugger = {
    debugging: [],
    topLevel: [],
    diffs: [],
    promiseToRecord: new WeakMap(),
    promiseByProxy: new WeakMap(),
    nextId: 0,

    get: function(promise) {
      return PromisesDebugger.promiseToRecord.get(promise);
    },
    register: function(promise, params) {
      var registeredData = {
        promise: promise,
        setValue: function(val) {
          var value = val.value,
            sendData = {
              id: registeredData.id,
              state: val.type
            };

          if (value instanceof originalPromise) {
            value = PromisesDebugger.promiseByProxy.get(value) || value;

            var record = PromisesDebugger.promiseToRecord.get(value);

            sendData.value = {
              type: 'promise',
              id: record.id
            };
          } else if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            // truncate long strings
            if (typeof value === 'string' && value.length > 100) {
              value = value.slice(0, 100);
            }

            sendData.value = {
              type: 'primitive',
              value: value,
              primitive: typeof value
            };
          } else if (value instanceof Error) {
            sendData.value = {
              type: 'error',
              error: {
                stack: value.stack,
                message: value.message,
                code: value.code
              }
            };
          } else if (Array.isArray(value)) {
            sendData.value = {
              type: 'array'
            };
          } else if (value && typeof value === 'object') {
            if (isPlainObject(value)) {
              try {
                value = JSON.stringify(value, function replacer(key, val) {
                  if (typeof val === 'string' && val.length > 30) {
                    return val.slice(0, 30) + ' ...';
                  }

                  return val;
                }, '  ');
              } catch (e) {

              }
            }

            if (typeof value === 'string') {
              sendData.value = {
                type: 'json',
                json: value
              };
            } else {
              sendData.value = {
                type: 'object',
                object: value + ''
              };
            }
          } else if (typeof value === 'function') {
            sendData.value = {
              type: 'function',
              function: value + ''
            };
          } else {
            // console.log('value unknown:', value);
            sendData.value = {
              type: 'unknown',
              typeOf: typeof value
            };
          }

          this.value = value;
          this.state = val.type;

          PromisesDebugger.requestUpdate({
            event: 'value',
            data: sendData
          });
        },
        id: this.nextId++,
        chaining: [],
        stack: params && params.stack,
        topLevel: params ? params.topLevel !== false : true,
      },
      topLevel = registeredData.topLevel,
      parentPromise;

      this.debugging.push(registeredData);

      if (topLevel) {
        this.topLevel.push(registeredData);
      } else {
        params.parent.chaining.push(registeredData);
        parentPromise = params.parent.id;
      }

      this.requestUpdate({
        event: 'create',
        data: {
          id: registeredData.id,
          topLevel: topLevel,
          stack: registeredData.stack,
          parentPromise: parentPromise
        }
      });

      if (params && hasOwn.call(params, 'value')) {
        registeredData.setValue(params.value);
      }

      this.promiseToRecord.set(promise, registeredData);

      promise.__recordData__ = registeredData;

      return registeredData;
    },
    dumpTopLevel: function() {
      this.dumpArray(this.topLevel, 'TopLevel Promises');
    },
    dumpArray: function(array, title) {
      console.groupCollapsed(title);

      array.concat().reverse().forEach(function(record, i) {
        var data;

        console.groupCollapsed('Promise ' + i);

        if (!hasOwn.call(record, 'value')) {
          data = {
            PromiseValue: '[[No Value]]',
            PromiseStatus: 'Pending'
          };
        }

        if (record.value.type === 'error') {
          data = {
            PromiseValue: record.value.value,
            PromiseStatus: 'Error'
          };
        } else {
          data = {
            PromiseValue: typeof record.value.value,
            PromiseStatus: 'OK'
          };
        }

        console.log('PromiseValue:', data.PromiseValue);
        console.log('PromiseStatus:', data.PromiseStatus);
        if (record.chaining.length) {
          PromisesDebugger.dumpArray(record.chaining, 'Chaining Promises');
        }

        console.groupEnd();
      });

      console.groupEnd();
    },
    requestUpdate: function(diffData) {
      setTimeout(function() {

        // console.log('requestUpdate');

        window.postMessage({
          PromisesDebugger: true,
          message: diffData
        }, '*');
      }, 0);
    }
  };

  var promiseDesc = recurciveGetDesc(global, 'Promise'),
    originalPromise = global.Promise,
    originalPromiseResolve = recurciveGetDesc(originalPromise, 'resolve'),
    originalPromiseReject = recurciveGetDesc(originalPromise, 'reject'),
    originalPromiseAll = recurciveGetDesc(originalPromise, 'all'),
    originalPromiseRace = recurciveGetDesc(originalPromise, 'race');

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
    var thenWrap = function(onResolve, onReject) {
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

        return val;
      };

      var result = promise.then(onResolve ? function onResolveWrap(val) {
        if (typeof onResolve !== 'function') return;

        if (isChrome) {
          var useVal = val;
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
      } : null, onReject ? function onRejectWrap(val) {
        if (typeof onReject !== 'function') return;

        if (isChrome) {
          var ret = new originalPromise(function(DONT_USE, retReject) {
            setTimeout(function() {
              ret.catch(function(b) {
                reject(b);
              });
            }, 0);

            var retVal = onReject.call(promise, val);

            // suppress native rethrow
            // setTimeout(function() {
              // try {
                retReject(retVal);
              // } catch (e) {};
            // }, 0);
          });

          return ret;
        }

        var val = onReject.call(promise, val);
        // reject(val);
        return val;
      } : null);

      try {
        throw new Error();
      } catch (e) {
        var stack = e.stack;
      }

      if (!isChrome) {
        result.then(resolve, reject);
      }

      var chaingRegistered = PromisesDebugger.register(result, {
        topLevel: false,
        stack: stack,
        parent: registeredData
      });

      return promiseWrap(result, chaingRegistered);
    },
    catchWrap = function(onReject) {
      var reject = function(val) {
        chaingRegistered.setValue({
          type: 'error',
          value: val
        });
      };

      var result = promise.catch(function onRejectWrap(val) {
        if (typeof onReject !== 'function') return;

        if (isChrome) {
          var ret = new originalPromise(function(DONT_USE, retReject) {
            setTimeout(function() {
              ret.then(null, function(b) {
                reject(b);
              });
            }, 0);

            var retVal = onReject.call(promise, val);

            // suppress native rethrow
            // setTimeout(function() {
              // try {
                retReject(retVal);
              // } catch (e) {};
            // }, 0);
          });

          return ret;
        }

        var val = onReject.call(promise, val);
        // reject(val);
        return val;
      });

      try {
        throw new Error();
      } catch (e) {
        var stack = e.stack;
      }

      if (!isChrome) {
        result.catch(reject);
      }

      var chaingRegistered = PromisesDebugger.register(result, {
        topLevel: false,
        stack: stack,
        parent: registeredData
      });

      return promiseWrap(result, chaingRegistered);
    };

    var proxy = makeProxy(promise, {
      get: function(target, name) {
        if (name === 'then') return thenWrap;
        // if (name === 'catch') return catchWrap;
        if (name === 'catch') return function(onReject) {
          return thenWrap.call(this, null, onReject);
        };

        return target[name];
      }
    });

    PromisesDebugger.promiseByProxy.set(proxy, promise);

    return proxy;
  };

  Object.defineProperty(global, 'Promise', {
    value: makeProxy(originalPromise, {
      construct: function(Promise, args) {
        var executor = args[0];

        var promise = new Promise(function(resolve, reject) {
          return executor.call(this, function resolveWrap(val) {
            var value = {
              type: 'value',
              value: val
            };

            if (registeredData) {
              registeredData.setValue(value);
            } else {
              registerValue = value;
            }

            return resolve.call(this, val);
          }, function rejectWrap(val) {
            var value = {
              type: 'error',
              value: val
            };

            if (registeredData) {
              registeredData.setValue(value);
            } else {
              registerValue = value;
            }

            return reject.call(this, val);
          })
        });

        var stack,
          registerValue;

        try {
          throw new Error();
        } catch (e) {
          stack = e.stack;
        }

        var registeredData = PromisesDebugger.register(promise, {
          stack: stack
        });

        if (registerValue) {
          registeredData.setValue(registerValue);
        }

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
    var result = originalPromiseResolve.value.call(originalPromise, val),
      value = {
        type: 'value',
        value: val
      };

    try {
      throw new Error();
    } catch (e) {
      var stack = e.stack;
    }

    var registeredData = PromisesDebugger.register(result, {
      value: value,
      stack: stack
    });

    return promiseWrap(result, registeredData);
  };

  fake.reject = function(val) {
    var result = originalPromiseReject.value.call(originalPromise, val),
      value = {
        type: 'error',
        value: val
      };

    try {
      throw new Error();
    } catch (e) {
      var stack = e.stack;
    }

    var registeredData = PromisesDebugger.register(result, {
      value: value,
      stack: stack
    });

    return promiseWrap(result, registeredData);
  };

  fake.all = function(arr) {
    arr = arr.map(function(proxy) {
      return PromisesDebugger.promiseByProxy.get(proxy);
    });

    var result = originalPromiseAll.value.call(originalPromise, arr);

    try {
      throw new Error();
    } catch (e) {
      var stack = e.stack;
    }

    var registeredData = PromisesDebugger.register(result, {
      stack: stack
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
      return PromisesDebugger.promiseByProxy.get(proxy);
    });

    var result = originalPromiseRace.value.call(originalPromise, arr);

    try {
      throw new Error();
    } catch (e) {
      var stack = e.stack;
    }

    var registeredData = PromisesDebugger.register(result, {
      stack: stack
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

  window.PromisesDebugger = PromisesDebugger;
}(this));