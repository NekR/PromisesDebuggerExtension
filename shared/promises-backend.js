console.log('PromisesDebugger inside');

(function(global) {
  "use strict";

  if (global.PromisesDebugger) return;

  var hasOwn = Object.prototype.hasOwnProperty;

  var PromisesDebugger = {
    debugging: [],
    topLevel: [],
    diffs: [],
    promiseToRecord: new WeakMap(),
    promiseByProxy: new WeakMap(),
    nextId: 0,
    providers: {},
    providerResults: {},

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

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            value = value.valueOf();
          }

          var isPromise = PromisesDebugger.isPromise(value);

          if (isPromise) {
            var record = PromisesDebugger.get(isPromise);

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
        id: this.nextId++,
        chaining: [],
        stack: params && params.stack,
        topLevel: params ? params.topLevel !== false : true,
      },
      topLevel = registeredData.topLevel,
      parentPromise,
      name = params && params.name || '',
      caller = params.caller;

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
          parentPromise: parentPromise,
          name: name,
          caller: caller
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
    },
    initProviders: function() {
      Object.keys(PromisesDebugger.providers).forEach(function(key) {
        var provider = PromisesDebugger.providers[key];
        
        var result = provider();

        if (result) {
          PromisesDebugger.providerResults[key] = result;
        }
      });
    },
    isPromise: function(promise) {
      var result;

      Object.keys(PromisesDebugger.providerResults).some(function(key) {
        var provider = PromisesDebugger.providerResults[key];

        if (provider && provider.isPromise) {
          var isPromise = provider.isPromise(promise);

          if (isPromise) {
            result = isPromise;
            return true;
          }
        }
      });

      return result;
    }
  };

  window.PromisesDebugger = PromisesDebugger;
}(this));