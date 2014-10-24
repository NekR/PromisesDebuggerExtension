console.log('PromisesDebugger inside');

(function(global) {
  "use strict";

  if (global.PromisesDebugger) return;

  var hasOwn = Object.prototype.hasOwnProperty;

  var PromisesDebugger = {
    promiseToRecord: new WeakMap(),
    nextId: 0,
    providers: {},

    get: function(promise) {
      return PromisesDebugger.promiseToRecord.get(promise);
    },
    requestUpdate: function(diffData) {
      setTimeout(function() {

        // console.log('requestUpdate');

        window.postMessage({
          PromisesDebugger: true,
          method: 'requestUpdate',
          message: diffData
        }, '*');
      }, 0);
    },
    registerProvider: function(name, config) {
      var provider = new Provider(name, config);

      PromisesDebugger.providers[name] = provider;

      return provider;
    },
    reportError: function(provider, error) {
      var errValue = error.value;

      if (errValue instanceof Error) {
        var value = {
          stack: error.value.stack,
          message: error.value.message,
          name: error.value.name
        };
      } else {
        var value = {
          message: errValue + ''
        };
      }

      setTimeout(function() {
        window.postMessage({
          PromisesDebugger: true,
          method: 'reportError',
          message: {
            error: {
              value: value
            },
            provider: provider.name
          }
        }, '*');
      }, 0);
    }
  };

  var Provider = function(name, config) {
    this.name = name;
    this.config = config;
  };

  Provider.prototype = {
    get: function(promise) {
      return PromisesDebugger.promiseToRecord.get(promise);
    },
    reportError: function(error) {
      PromisesDebugger.reportError(this, error);
    },
    register: function(promise, params) {
      var provider = this;

      var registeredData = {
        promise: promise,
        setValue: function(val) {
          var value = val.value,
            sendData = {
              id: registeredData.id,
              state: val.type
            };

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            value = value.valueOf();
          }

          var isPromise;

          if (provider.isPromise && (isPromise = provider.isPromise(value))) {
            var record = provider.get(isPromise);

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
            var keys = Object.keys(value),
              allKeys = Object.getOwnPropertyNames(value),
              objStr = value + '',
              objName = objStr.match(/^\[object (\w+?)\]$/);

            objName = objName ? objName[1] : objStr;

            if (keys && (keys.length || allKeys.length)) {
              sendData.value = {
                type: 'keys',
                keys: keys,
                allKeys: allKeys
              };
            } else {
              sendData.value = {
                type: 'object',
                object: value + ''
              };
            }
          } else if (typeof value === 'function') {
            var strVal = value + '',
              nameEnd = strVal.indexOf(')'),
              isNative = strVal.indexOf('[native code]') !== -1;

            sendData.value = {
              type: 'function',
              function: isNative ? strVal : strVal.slice(0, nameEnd + 1)
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
        id: PromisesDebugger.nextId++,
        chaining: [],
        stack: params && params.stack,
        topLevel: params ? params.topLevel !== false : true,
        provider: provider.name
      },
      topLevel = registeredData.topLevel,
      parentPromise,
      name = params && params.name || '',
      caller = params.caller;

      if (topLevel) {
        
      } else {
        params.parent.chaining.push(registeredData);
        parentPromise = params.parent.id;
      }

      PromisesDebugger.requestUpdate({
        event: 'create',
        data: {
          id: registeredData.id,
          topLevel: topLevel,
          stack: registeredData.stack,
          parentPromise: parentPromise,
          name: name,
          caller: caller
        }
      });

      if (params && hasOwn.call(params, 'value')) {
        registeredData.setValue(params.value);
      }

      PromisesDebugger.promiseToRecord.set(promise, registeredData);
      promise.__recordData__ = registeredData;

      return registeredData;
    },
  };

  PromisesDebugger.Provider = Provider;

  window.PromisesDebugger = PromisesDebugger;
}(this));