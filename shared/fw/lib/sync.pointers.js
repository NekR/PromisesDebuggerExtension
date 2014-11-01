// Copyright 2009-2012 by contributors, MIT License
// vim: ts=4 sts=4 sw=4 expandtab

//Add semicolon to prevent IIFE from being passed as argument to concated code.
;
// Module systems magic dance
(function () {


var prototypeOfObject = Object.prototype;
var hasOwn = prototypeOfObject.hasOwnProperty;

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;

if ((supportsAccessors = hasOwn.call(prototypeOfObject, "__defineGetter__"))) {
  defineGetter = prototypeOfObject.__defineGetter__;
  defineSetter = prototypeOfObject.__defineSetter__;
  lookupGetter = prototypeOfObject.__lookupGetter__;
  lookupSetter = prototypeOfObject.__lookupSetter__;
}

// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
if (!Object.getPrototypeOf) {
  // https://github.com/kriskowal/es5-shim/issues#issue/2
  // http://ejohn.org/blog/objectgetprototypeof/
  // recommended by fschaefer on github
  Object.getPrototypeOf = function getPrototypeOf(object) {
    return object.__proto__ || (
      object.constructor
        ? object.constructor.prototype
        : prototypeOfObject
    );
  };
}

//ES5 15.2.3.3
//http://es5.github.com/#x15.2.3.3

function doesGetOwnPropertyDescriptorWork(object) {
  try {
    object.sentinel = 0;
    return Object.getOwnPropertyDescriptor(
        object,
        "sentinel"
    ).value === 0;
  } catch (exception) {
    // returns falsy
  }
}

//check whether getOwnPropertyDescriptor works if it's given. Otherwise,
//shim partially.
if (Object.defineProperty) {
  var getOwnPropertyDescriptorWorksOnObject = 
    doesGetOwnPropertyDescriptorWork({});
  var getOwnPropertyDescriptorWorksOnDom = typeof document == "undefined" ||
  doesGetOwnPropertyDescriptorWork(document.createElement("div"));
  if (!getOwnPropertyDescriptorWorksOnDom || 
      !getOwnPropertyDescriptorWorksOnObject
  ) {
    var getOwnPropertyDescriptorFallback = Object.getOwnPropertyDescriptor;
  }
}

if (!Object.getOwnPropertyDescriptor || getOwnPropertyDescriptorFallback) {
  var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";

  Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
    if ((typeof object != "object" && typeof object != "function") || object === null) {
      throw new TypeError(ERR_NON_OBJECT + object);
    }

    // make a valiant attempt to use the real getOwnPropertyDescriptor
    // for I8's DOM elements.
    if (getOwnPropertyDescriptorFallback) {
      try {
        return getOwnPropertyDescriptorFallback.call(Object, object, property);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    // If object does not hasOwn property return undefined immediately.
    if (!hasOwn.call(object, property)) {
      return;
    }

    // If object has a property then it's for sure both `enumerable` and
    // `configurable`.
    var descriptor =  { enumerable: true, configurable: true };

    // If JS engine supports accessor properties then property may be a
    // getter or setter.
    if (supportsAccessors) {
      // Unfortunately `__lookupGetter__` will return a getter even
      // if object has own non getter property along with a same named
      // inherited getter. To avoid misbehavior we temporary remove
      // `__proto__` so that `__lookupGetter__` will return getter only
      // if it's owned by an object.
      var prototype = object.__proto__;
      object.__proto__ = prototypeOfObject;

      var getter = lookupGetter.call(object, property);
      var setter = lookupSetter.call(object, property);

      // Once we have getter and setter we can put values back.
      object.__proto__ = prototype;

      if (getter || setter) {
        if (getter) {
          descriptor.get = getter;
        }
        if (setter) {
          descriptor.set = setter;
        }
        // If it was accessor property we're done and return here
        // in order to avoid adding `value` to the descriptor.
        return descriptor;
      }
    }

    // If we got this far we know that object has an own property that is
    // not an accessor so we set it as a value and return descriptor.
    descriptor.value = object[property];
    descriptor.writable = true;
    return descriptor;
  };
}

// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
if (!Object.getOwnPropertyNames) {
  Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
    return Object.keys(object);
  };
}

// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!Object.create) {

  // Contributed by Brandon Benvie, October, 2012
  var createEmpty;
  var supportsProto = Object.prototype.__proto__ === null;
  if (supportsProto || typeof document == 'undefined') {
    createEmpty = function () {
      return { "__proto__": null };
    };
  } else {
    createEmpty = function () {
      return {};
    };
  }

  Object.create = function create(prototype, properties) {
    var object;
    function Type() {}  // An empty constructor.

    if (prototype === null) {
      object = createEmpty();
    } else {
      if (typeof prototype !== "object" && typeof prototype !== "function") {
        // In the native implementation `parent` can be `null`
        // OR *any* `instanceof Object`  (Object|Function|Array|RegExp|etc)
        // Use `typeof` tho, b/c in old IE, DOM elements are not `instanceof Object`
        // like they are in modern browsers. Using `Object.create` on DOM elements
        // is...err...probably inappropriate, but the native version allows for it.
        throw new TypeError("Object prototype may only be an Object or null"); // same msg as Chrome
      }
      Type.prototype = prototype;
      object = new Type();
      // IE has no built-in implementation of `Object.getPrototypeOf`
      // neither `__proto__`, but this manually setting `__proto__` will
      // guarantee that `Object.getPrototypeOf` will work as expected with
      // objects created using `Object.create`
      if (!supportsProto) {
        object.__proto__ = prototype;
      }
    }

    if (properties !== void 0) {
      Object.defineProperties(object, properties);
    }

    return object;
  };
}

// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//   http://msdn.microsoft.com/en-us/library/dd282900.aspx
//   http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//   https://bugs.webkit.org/show_bug.cgi?id=36423

function doesDefinePropertyWork(object) {
  try {
    Object.defineProperty(object, "sentinel", {});
    return "sentinel" in object;
  } catch (exception) {
    // returns falsy
  }
}

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
  var definePropertyWorksOnObject = doesDefinePropertyWork({});
  var definePropertyWorksOnDom = typeof document == "undefined" ||
    doesDefinePropertyWork(document.createElement("div"));
  if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
    var definePropertyFallback = Object.defineProperty,
      definePropertiesFallback = Object.defineProperties;
  }
}

if (!Object.defineProperty || definePropertyFallback) {
  var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
  var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
  var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                    "on this javascript engine";

  Object.defineProperty = function defineProperty(object, property, descriptor) {
    if ((typeof object != "object" && typeof object != "function") || object === null) {
      throw new TypeError(ERR_NON_OBJECT_TARGET + object);
    }
    if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null) {
      throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
    }
    // make a valiant attempt to use the real defineProperty
    // for I8's DOM elements.
    if (definePropertyFallback) {
      try {
        return definePropertyFallback.call(Object, object, property, descriptor);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    // If it's a data property.
    if (hasOwn.call(descriptor, "value")) {
      // fail silently if "writable", "enumerable", or "configurable"
      // are requested but not supported
      /*
      // alternate approach:
      if ( // can't implement these features; allow false but not true
        !(hasOwn.call(descriptor, "writable") ? descriptor.writable : true) ||
        !(hasOwn.call(descriptor, "enumerable") ? descriptor.enumerable : true) ||
        !(hasOwn.call(descriptor, "configurable") ? descriptor.configurable : true)
      )
        throw new RangeError(
          "This implementation of Object.defineProperty does not " +
          "support configurable, enumerable, or writable."
        );
      */

      if (supportsAccessors && (lookupGetter.call(object, property) ||
                    lookupSetter.call(object, property)))
      {
        // As accessors are supported only on engines implementing
        // `__proto__` we can safely override `__proto__` while defining
        // a property to make sure that we don't hit an inherited
        // accessor.
        var prototype = object.__proto__;
        object.__proto__ = prototypeOfObject;
        // Deleting a property anyway since getter / setter may be
        // defined on object itself.
        delete object[property];
        object[property] = descriptor.value;
        // Setting original `__proto__` back now.
        object.__proto__ = prototype;
      } else {
        object[property] = descriptor.value;
      }
    } else {
      if (!supportsAccessors) {
        throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
      }
      // If we got that far then getters and setters can be defined !!
      if (hasOwn.call(descriptor, "get")) {
        defineGetter.call(object, property, descriptor.get);
      }
      if (hasOwn.call(descriptor, "set")) {
        defineSetter.call(object, property, descriptor.set);
      }
    }
    return object;
  };
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties || definePropertiesFallback) {
  Object.defineProperties = function defineProperties(object, properties) {
    // make a valiant attempt to use the real defineProperties
    if (definePropertiesFallback) {
      try {
        return definePropertiesFallback.call(Object, object, properties);
      } catch (exception) {
        // try the shim if the real one doesn't work
      }
    }

    for (var property in properties) {
      if (hasOwn.call(properties, property) && property != "__proto__") {
        Object.defineProperty(object, property, properties[property]);
      }
    }
    return object;
  };
}

// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
if (!Object.seal) {
  Object.seal = function seal(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
if (!Object.freeze) {
  Object.freeze = function freeze(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// detect a Rhino bug and patch it
try {
  Object.freeze(function () {});
} catch (exception) {
  Object.freeze = (function freeze(freezeObject) {
    return function freeze(object) {
      if (typeof object == "function") {
        return object;
      } else {
        return freezeObject(object);
      }
    };
  })(Object.freeze);
}

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
if (!Object.preventExtensions) {
  Object.preventExtensions = function preventExtensions(object) {
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
  };
}

// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
if (!Object.isSealed) {
  Object.isSealed = function isSealed(object) {
    return false;
  };
}

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
if (!Object.isFrozen) {
  Object.isFrozen = function isFrozen(object) {
    return false;
  };
}

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
if (!Object.isExtensible) {
  Object.isExtensible = function isExtensible(object) {
    // 1. If Type(O) is not Object throw a TypeError exception.
    if (Object(object) !== object) {
      throw new TypeError(); // TODO message
    }
    // 2. Return the Boolean value of the [[Extensible]] internal property of O.
    var name = '';
    while (hasOwn.call(object, name)) {
      name += '?';
    }
    object[name] = true;
    var returnValue = hasOwn.call(object, name);
    delete object[name];
    return returnValue;
  };
}

if (!hasOwn.call(Function.prototype, 'bind')) {
  var slice = Array.prototype.slice;

  Object.defineProperty(Function.prototype, 'bind', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(thisArg) {
      var fn = this,
        args = arguments.length > 1 ? slice.call(arguments, 1) : null;

      return function() {
        var currentArgs = arguments.length ? slice.call(arguments) : null;

        currentArgs = args ?
          (currentArgs ? args.concat(currentArgs) : args) :
          currentArgs;

        if (!currentArgs || !currentArgs.length) {
          return fn.call(thisArg);
        }

        if (currentArgs.length === 1) {
          return fn.call(thisArg, currentArgs[0]);
        }

        return fn.apply(thisArg, currentArgs);
      }
    }
  })
}

})();(function() {
  "use strict";

  if (typeof WeakMap === 'undefined') {
    // need weak sets
    (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    },
    checkKey = function(key) {
      if (!key || typeof key === 'string' ||
      typeof key === 'number' || typeof key === 'boolean' ||
      typeof key === 'regexp') {
      throw new TypeError('value is not a non-null object');
      }
    },
    wrap = function(fn) {
      return function(key, val) {
      checkKey(key);
      return fn.call(this, key, val);
      };
    };

    WeakMap.prototype = {
      set: wrap(function(key, value) {
      var entry = key[this.name];
      if (entry && entry[0] === key)
        entry[1] = value;
      else
        defineProperty(key, this.name, {value: [key, value], writable: true});
      }),
      get: wrap(function(key) {
      var entry;
      return (entry = key[this.name]) && entry[0] === key ?
        entry[1] : undefined;
      }),
      delete: wrap(function(key) {
      this.set(key, undefined);
      })
    };

    window.WeakMap = WeakMap;
    })();
  }
}());/*! Native Promise Only
    v0.7.6-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
  // special form of UMD for polyfilling across evironments
  context[name] = context[name] || definition();
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
  /*jshint validthis:true */
  "use strict";

  var builtInProp, cycle, scheduling_queue,
    ToString = Object.prototype.toString,
    timer = (typeof setImmediate != "undefined") ?
      function timer(fn) { return setImmediate(fn); } :
      setTimeout
  ;

  // damnit, IE8.
  try {
    Object.defineProperty({},"x",{});
    builtInProp = function builtInProp(obj,name,val,config) {
      return Object.defineProperty(obj,name,{
        value: val,
        writable: true,
        configurable: config !== false
      });
    };
  }
  catch (err) {
    builtInProp = function builtInProp(obj,name,val) {
      obj[name] = val;
      return obj;
    };
  }

  // Note: using a queue instead of array for efficiency
  scheduling_queue = (function Queue() {
    var first, last, item;

    function Item(fn,self) {
      this.fn = fn;
      this.self = self;
      this.next = void 0;
    }

    return {
      add: function add(fn,self) {
        item = new Item(fn,self);
        if (last) {
          last.next = item;
        }
        else {
          first = item;
        }
        last = item;
        item = void 0;
      },
      drain: function drain() {
        var f = first;
        first = last = cycle = void 0;

        while (f) {
          f.fn.call(f.self);
          f = f.next;
        }
      }
    };
  })();

  function schedule(fn,self) {
    scheduling_queue.add(fn,self);
    if (!cycle) {
      cycle = timer(scheduling_queue.drain);
    }
  }

  // promise duck typing
  function isThenable(o) {
    var _then, o_type = typeof o;

    if (o != null &&
      (
        o_type == "object" || o_type == "function"
      )
    ) {
      _then = o.then;
    }
    return typeof _then == "function" ? _then : false;
  }

  function notify() {
    for (var i=0; i<this.chain.length; i++) {
      notifyIsolated(
        this,
        (this.state === 1) ? this.chain[i].success : this.chain[i].failure,
        this.chain[i]
      );
    }
    this.chain.length = 0;
  }

  // NOTE: This is a separate function to isolate
  // the `try..catch` so that other code can be
  // optimized better
  function notifyIsolated(self,cb,chain) {
    var ret, _then;
    try {
      if (cb === false) {
        chain.reject(self.msg);
      }
      else {
        if (cb === true) {
          ret = self.msg;
        }
        else {
          ret = cb.call(void 0,self.msg);
        }

        if (ret === chain.promise) {
          chain.reject(TypeError("Promise-chain cycle"));
        }
        else if (_then = isThenable(ret)) {
          _then.call(ret,chain.resolve,chain.reject);
        }
        else {
          chain.resolve(ret);
        }
      }
    }
    catch (err) {
      chain.reject(err);
    }
  }

  function resolve(msg) {
    var _then, def_wrapper, self = this;

    // already triggered?
    if (self.triggered) { return; }

    self.triggered = true;

    // unwrap
    if (self.def) {
      self = self.def;
    }

    try {
      if (_then = isThenable(msg)) {
        def_wrapper = new MakeDefWrapper(self);
        _then.call(msg,
          function $resolve$(){ resolve.apply(def_wrapper,arguments); },
          function $reject$(){ reject.apply(def_wrapper,arguments); }
        );
      }
      else {
        self.msg = msg;
        self.state = 1;
        if (self.chain.length > 0) {
          schedule(notify,self);
        }
      }
    }
    catch (err) {
      reject.call(def_wrapper || (new MakeDefWrapper(self)),err);
    }
  }

  function reject(msg) {
    var self = this;

    // already triggered?
    if (self.triggered) { return; }

    self.triggered = true;

    // unwrap
    if (self.def) {
      self = self.def;
    }

    self.msg = msg;
    self.state = 2;
    if (self.chain.length > 0) {
      schedule(notify,self);
    }
  }

  function iteratePromises(Constructor,arr,resolver,rejecter) {
    for (var idx=0; idx<arr.length; idx++) {
      (function IIFE(idx){
        Constructor.resolve(arr[idx])
        .then(
          function $resolver$(msg){
            resolver(idx,msg);
          },
          rejecter
        );
      })(idx);
    }
  }

  function MakeDefWrapper(self) {
    this.def = self;
    this.triggered = false;
  }

  function MakeDef(self) {
    this.promise = self;
    this.state = 0;
    this.triggered = false;
    this.chain = [];
    this.msg = void 0;
  }

  function Promise(executor) {
    if (typeof executor != "function") {
      throw TypeError("Not a function");
    }

    if (this.__NPO__ !== 0) {
      throw TypeError("Not a promise");
    }

    // instance shadowing the inherited "brand"
    // to signal an already "initialized" promise
    this.__NPO__ = 1;

    var def = new MakeDef(this);

    this["then"] = function then(success,failure) {
      var o = {
        success: typeof success == "function" ? success : true,
        failure: typeof failure == "function" ? failure : false
      };
      // Note: `then(..)` itself can be borrowed to be used against
      // a different promise constructor for making the chained promise,
      // by substituting a different `this` binding.
      o.promise = new this.constructor(function extractChain(resolve,reject) {
        if (typeof resolve != "function" || typeof reject != "function") {
          throw TypeError("Not a function");
        }

        o.resolve = resolve;
        o.reject = reject;
      });
      def.chain.push(o);

      if (def.state !== 0) {
        schedule(notify,def);
      }

      return o.promise;
    };
    this["catch"] = function $catch$(failure) {
      return this.then(void 0,failure);
    };

    try {
      executor.call(
        void 0,
        function publicResolve(msg){
          resolve.call(def,msg);
        },
        function publicReject(msg) {
          reject.call(def,msg);
        }
      );
    }
    catch (err) {
      reject.call(def,err);
    }
  }

  var PromisePrototype = builtInProp({},"constructor",Promise,
    /*configurable=*/false
  );

  builtInProp(
    Promise,"prototype",PromisePrototype,
    /*configurable=*/false
  );

  // built-in "brand" to signal an "uninitialized" promise
  builtInProp(PromisePrototype,"__NPO__",0,
    /*configurable=*/false
  );

  builtInProp(Promise,"resolve",function Promise$resolve(msg) {
    var Constructor = this;

    // spec mandated checks
    // note: best "isPromise" check that's practical for now
    if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
      return msg;
    }

    return new Constructor(function executor(resolve,reject){
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      resolve(msg);
    });
  });

  builtInProp(Promise,"reject",function Promise$reject(msg) {
    return new this(function executor(resolve,reject){
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      reject(msg);
    });
  });

  builtInProp(Promise,"all",function Promise$all(arr) {
    var Constructor = this;

    // spec mandated checks
    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }
    if (arr.length === 0) {
      return Constructor.resolve([]);
    }

    return new Constructor(function executor(resolve,reject){
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      var len = arr.length, msgs = Array(len), count = 0;

      iteratePromises(Constructor,arr,function resolver(idx,msg) {
        msgs[idx] = msg;
        if (++count === len) {
          resolve(msgs);
        }
      },reject);
    });
  });

  builtInProp(Promise,"race",function Promise$race(arr) {
    var Constructor = this;

    // spec mandated checks
    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    return new Constructor(function executor(resolve,reject){
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      iteratePromises(Constructor,arr,function resolver(idx,msg){
        resolve(msg);
      },reject);
    });
  });

  return Promise;
});/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, undefined) {
  "use strict";

  var R_QUERY_SEARCH = /^([\w\d]*)(\[[\s\S]*\])$/;

  var toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    arrayProto = Array.prototype,
    slice = arrayProto.slice,
    getKeys = Object.keys,
    Sync = window.Sync = function Sync() {},
    each = Sync.each = function(obj, fn, thisValue) {
      if (typeof fn !== 'function' || !obj) return obj;

      var keys = getKeys(obj),
        key,
        i = 0,
        len = keys.length;

      if (thisValue) {
        fn = fn.bind(thisValue);
      }

      for (; i < len; i++) {
        key = keys[i];

        if (key === 'prototype') continue;

        fn(obj[key], key, obj);
      }

      return obj;
    },
    // indicates that first passed argument
    // is object or not
    isObject = Sync.isObject = function(obj) {
      obj = obj && typeof obj.valueOf === 'function' && obj.valueOf() || obj;
      return obj != null && typeof obj === 'object';
    },
    isStrict = function() {
      return !this;
    },
    isArray = Array.isArray,
    extend = Sync.extend = function(tmp) {
      var args = arguments,
        overwrite = true,
        recurse = false,
        start = 1,
        end = args.length,
        to = args[0];

      if (end < 2) return tmp || null;

      if (typeof tmp === 'boolean') {
        to = args[start++];
        recurse = args[0];
      }

      if (typeof args[end - 1] === 'boolean') {
        overwrite = args[--end];
      }

      function action(value, key) {
        if (recurse && isObject(value) &&
            (to[key] && overwrite || !to[key])) {

          if (!isArray(to[key]) && !isObject(to[key])) {
            if (isArray(value)) {
              to[key] = [];
            } else if (value instanceof RegExp || typeof value === 'regexp') {
              to[key] = new RegExp(value);
            } else {
              to[key] = {};
            }
          }

          extend(recurse, to[key], value, overwrite);
        } else if (typeof value !== 'undefined') {
          !overwrite && key in to || (to[key] = value);
        }
      }

      for (; start < end; start++) {
        if (isArray(args[start])) {
          args[start].forEach(action);
        } else {
          each(args[start], action);
        }
      }

      return to;
    };

  Sync.toString = function() {
    return 'https://github.com/NekR/Sync';
  };

  var escape = function(key, val) {
      if (isArray(val)) {
        return val.map(function(deepVal, index) {
          return escape(key + '[' + index + ']', deepVal);
        }).join('&');
      } else if (typeof val === 'object') {
        return Object.keys(val).map(function(rest) {
          return escape(key + '[' + rest + ']', this[rest]);
        }, val).filter(function(val) {
          return val;
        }).join('&');
      } else {
        return key + '=' + encodeURIComponent(val);
      }
    },
    equal = function(first, second, recursion) {
      if (isArray(first)) {
        return first.every(function(val, i) {
          return recursion(val, second[i]);
        });
      } else if (typeof first === 'object' && first !== null) {
        return Object.keys(first).every(function(val) {
          return recursion(first[val], second[val]);
        });
      } else {
        return first === second;
      }
    },
    unescapePair = Sync.unescapePair = function(target, name, value) {
      name = decodeURIComponent(name);
      value = decodeURIComponent(value);
      
      var match = name.match(R_QUERY_SEARCH),
        rest;

      if (match) {
        name = match[1];
        rest = (rest = match[2]).slice(1, rest.length - 1);
        rest = rest.split('][').reduce(function(key, next) {
          if (!(key in target)) {
            target[key] = next ? {} : [];
          }

          target = target[key];
          return next;
        }, name);

        target[rest] = value;
      } else {
        target[name] = value;
      }
    };

  Sync.escape = function(obj) {
    return Object.keys(obj).map(function(key) {
      return escape(key, obj[key]);
    }).join('&');
  };

  Sync.equal = function(first, second) {
    if (first === second) {
      return true;
    } else if (!first || !second || typeof first !== typeof second ||
          first.length !== second.length) {
      return false;
    } else {
      return equal(first, second, Sync.equal);
    }
  };

  Sync.unescape = function(string, linear) {
    if (typeof string !== 'string') return null;

    return string.split('&').reduce(function(result, prop) {
      if (prop) {
        prop = prop.split('=');

        if (linear) {
          result[decodeURIComponent(prop[0])] = decodeURIComponent(prop[1]);
        } else {
          unescapePair(result, prop[0], prop[1]);
        }
      }

      return result;
    }, {});
  };

  Sync.cache = function(elem, hash, value) {
    var data = elem._ || (elem._ = {});

    if (!hash) {
      return data;
    } else {
      if (typeof value !== 'undefined') {
        return data[hash] = value;
      } else {
        return typeof data[hash] !== 'undefined' ?
          data[hash] : (data[hash] = {});
      }
    }
  };

  // need logger api
  // var logger = new Sync.Logger('loggerName');
  // logger.log('my log..') ->
  //   [loggerName]: my log..

  var logging = [];

  Sync.Logger = function(name) {
    this.name = name;
  };

  Sync.Logger.prototype = {
    log: function() {
      var args = slice.call(arguments);
      args.unshift('[' + this.name + ']');
      Sync.log.apply(null, args);
    }
  };

  Sync.log = function syncLog() {
    var log = slice.call(arguments);

    if (Sync.debug) {
      window.console.log.apply(window.console, log);
    }

    logging.push(log.join(' '));
  };

  Sync.logging = logging;
}(this));
/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

;(function(window, document, Sync, undefined) {
  "use strict";

  var R_CAMEL_2_CSS = /[A-Z](?=\w)/g;

  var Element = window.Element || window.HTMLElement,
    Document = window.Document || window.HTMLDocument,
    Node = window.Node,
    Text = window.Text,
    Comment = window.Comment,
    DocumentFragment = window.DocumentFragment || Document,
    createElement = typeof document.createElement === 'function' ?
      document.createElement.bind(document) : document.createElement,
    element = createElement('div'),
    head = document.getElementsByTagName('head')[0],
    NodeChildren = [
      Element,
      Document,
      Text
    ],
    applyingMutations = {
      prepend: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.insertBefore(node, this.firstChild);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      append: {
        handler: function() {
          var node = mutationMacro(arguments);

          if (node) {
            this.appendChild(node);
          }
        },
        targets: [Element, DocumentFragment, Document]
      },
      before: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      after: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.insertBefore(node, this.nextSibling);
          }
        },
        targets: [Element, Text, Comment]
      },
      replace: {
        handler: function() {
          var node,
            parent = this.parentNode;

          if (!parent) return;

          node = mutationMacro(arguments);

          if (node) {
            parent.replaceChild(node, this);
          }
        },
        targets: [Element, Text, Comment]
      },
      remove: {
        handler: function() {
          var parent = this.parentNode;

          if (!parent) return;

          parent.removeChild(this);
        },
        targets: [Element, Text, Comment]
      }
    };

  var camel2css = function(w) {
    return ('-' + w).toLowerCase();
  },
  mutationNodeTransform = function(node) {
    if (typeof node === 'string') {
      return document.createTextNode(node);
    }

    if (!node.nodeType) return null;

    return node;
  },
  mutationMacro = function(nodes) {
    if (!nodes) return null;

    if (nodes.length === 1) {
      return mutationNodeTransform(nodes[0]);
    }

    var fragment = document.createDocumentFragment(),
      i = 0,
      len = nodes.length,
      node;

    for (; i < len; i++) {
      node = mutationNodeTransform(nodes[i]);

      if (node) {
        fragment.appendChild(node);
      }
    }

    return fragment;
  },
  define = Object.defineProperty,
  getDescriptor = Object.getOwnPropertyDescriptor,
  slice = Array.prototype.slice,
  hasOwn = Object.prototype.hasOwnProperty;

  // IE8 targets
  if (!Node && document.attachEvent) {
    window.Node = Node = function Node() {};

    Node.prototype =
      document.documentElement.appendChild(document.createElement('Node'));

    document.documentElement.removeChild(Node.prototype);

    [
      'ELEMENT_NODE',
      'ATTRIBUTE_NODE',
      'TEXT_NODE',
      'CDATA_SECTION_NODE',
      'ENTITY_REFERENCE_NODE',
      'ENTITY_NODE',
      'PROCESSING_INSTRUCTION_NODE',
      'COMMENT_NODE',
      'DOCUMENT_NODE',
      'DOCUMENT_TYPE_NODE',
      'DOCUMENT_FRAGMENT_NODE',
      'NOTATION_NODE'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = value + 1;
    });

    [
      'DOCUMENT_POSITION_DISCONNECTED',
      'DOCUMENT_POSITION_PRECEDING',
      'DOCUMENT_POSITION_FOLLOWING',
      'DOCUMENT_POSITION_CONTAINS',
      'DOCUMENT_POSITION_CONTAINED_BY',
      'DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC'
    ].forEach(function(name, value) {
      Node[name] = Node.prototype[name] = Math.pow(2, value);
    });

    Node.prototype.attachEvent('onpropertychange', function() {
      var name,
        desc;

      if (window.event && (name = window.event.propertyName)) {
        desc = Object.getOwnPropertyDescriptor(Node.prototype, name);

        NodeChildren.forEach(function(child) {
          define(child.prototype, name, desc);
        });
      }
    });

    define(window, 'Node', {
      value: Node
    });

    (function() {
      var originalPropertyDefinition = define;

      define = Object.defineProperty =
        function defineProperty(object, name, description) {
          var ret = originalPropertyDefinition.apply(this, arguments),
            e;

          if (object.nodeType && object.fireEvent) {
            e = document.createEventObject();
            e.propertyName = name;
            object.fireEvent('onpropertychange', e);
          }

          return ret;
        };
    }());
  }

  /*var dom = Sync.dom = {
    inTree: function(elem) {
      return elem && elem.nodeType &&
        (elem.parentNode ? ((elem = elem.parentNode).nodeType ===
          Node.DOCUMENT_FRAGMENT_NODE ? dom.inTree(elem) : true) : false);
    },
    isView: function(view) {
      return view && view.setTimeout && view.clearTimeout;
    }
  };*/

  if (!document.head) {
    Object.defineProperty(document, 'head', {
      get: function() {
        return head;
      }
    });
  }

  if (!('origin' in window.location)) {
    try {
      define(window.location, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    } catch (e) {
      window.location.origin =
        window.location.protocol + '//' + window.location.host;
    }
  }

  if (!('origin' in document.createElement('a'))) {
    [
      'HTMLAnchorElement',
      'HTMLLinkElement',
      'HTMLAreaElement'
    ].forEach(function(key) {
      define(window[key].prototype, 'origin', {
        get: function() {
          return this.protocol + '//' + this.host;
        }
      });
    });
  }

  // IE8
  if (!('innerWidth' in window)) {
    Object.defineProperties(window, {
      innerWidth: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientWidth || 0;
          } else {
            return document.documentElement.clientWidth || 0;
          }
        }
      },
      innerHeight: {
        get: function() {
          if (document.compatMode !== 'CSS1Compat' && document.body) {
            return document.body.clientHeight || 0;
          } else {
            return document.documentElement.clientHeight || 0;
          }
        }
      }
    });
  }

  // IE8 also
  try {
    var nodeListSlice = slice.call(document.querySelectorAll('html'), 0);
  } catch (e) {
    nodeListSlice = null;
  } finally {
    if (!Array.isArray(nodeListSlice)) {
      define(Array.prototype, 'slice', {
        writable: true,
        configurable: true,
        enumerable: false,
        value: function(from, to) {
          if (this instanceof window.StaticNodeList ||
              this instanceof window.NodeList ||
              this instanceof window.HTMLCollection ||
              this instanceof window.HTMLFormElement ||
              this instanceof window.HTMLSelectElement) {

            from |= 0;
            typeof to === 'number' || (to = this.length);

            if (!isFinite(from) || !isFinite(to) ||
                (to > this.length && from > this.length)) {
              return [];
            }

            var result = [],
              i = (from < 0 ? this.length - from : from),
              len = (to < 0 ? this.length - to : to),
              item;

            for (; i < len; i++) {
              if (hasOwn.call(this, i) && (item = this[i])) {
                result.push(item);
              }
            }

            return result;
          } else {

            return slice.apply(this, arguments);
          }
        }
      });
    }
  }

  // IE8
  if (!('textContent' in element) && 'innerText' in Element.prototype) {
    define(Element.prototype, 'textContent', {
      get: function() {
        return this.innerText;
      },
      set: function(value) {
        this.innerText = value;
      }
    });

    define(Text.prototype, 'textContent', {
      get: function() {
        return this.nodeValue;
      },
      set: function(value) {
        this.nodeValue = value;
      }
    });
  }

  if (!('outerHTML' in element)) {
    define(Element.prototype, 'outerHTML', {
      get: function() {
        var tmp = document.createElement('div'),
          html;

        tmp.appendChild(this.cloneNode(true));
        html = tmp.innerHTML;
        tmp = null;

        return html;
      },
      set: function(value) {
        this.insertAdjacentHTML('beforebegin', value);
        this.remove();
      }
    });
  }

  // IE8
  if (!('sheet' in createElement('style')) &&
      'styleSheet' in HTMLStyleElement.prototype) {

    var _styleSheetHTMLKey = '_styleSheetHTMLKey';

    Object.defineProperties(HTMLStyleElement.prototype, {
      sheet: {
        get: function() {
          return this.styleSheet;
        }
      },
      appendChild: {
        value: function(node) {
          if (!node || !node.nodeType) throw TypeError('bad argument');

          if (node.nodeType === Node.TEXT_NODE) {
            this.innerHTML += node.textContent;
          }
        }
      },
      innerHTML: {
        get: function() {
          if (this.styleSheet) {
            return this.styleSheet.cssText;
          } else {
            return Sync.cache(this)[_styleSheetHTMLKey] || '';
          }
        },
        set: function(html) {
          if (!this.styleSheet) {
            var cache = Sync.cache(this),
              self = this,
              handler = function() {
                if (self.readyState === 'loading' ||
                    self.readyState === 'complete') {
                  self.detachEvent('onreadystatechange', handler);
                  self.innerHTML = cache[_styleSheetHTMLKey];
                }
              };

            cache[_styleSheetHTMLKey] =
              (cache[_styleSheetHTMLKey] || '') + html;

            this.attachEvent('onreadystatechange', handler);
          } else {
            this.styleSheet.cssText = html;
          }
        }
      }
    });
  }

  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  if (Node && !Node.prototype.contains &&
      'compareDocumentPosition' in Element.prototype) {
    var compareDocumentPosition = Element.prototype.compareDocumentPosition;
    define(Node.prototype, 'contains', {
      value: function contains(node) {
        return !!(compareDocumentPosition.call(this, node) & 16);
      }
    });
  }

  // IE8
  if (Node && !('compareDocumentPosition' in Node.prototype) &&
      'sourceIndex' in Node.prototype && 'contains' in Node.prototype) {
    define(Node.prototype, 'compareDocumentPosition', {
      value: function compareDocumentPosition(node) {
        var point = 0,
          getDocument = function(node) {
            for (var doc = node.parentNode; doc &&
                 doc.nodeType !== Node.DOCUMENT_NODE &&
                 doc.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
                 doc = doc.parentNode);

            return doc;
          };

        if (this === node) {
          return point;
        }

        if (this.contains(node)) {
          point |= Node.DOCUMENT_POSITION_CONTAINED_BY;
        }

        if (node.contains(this)) {
          point |= Node.DOCUMENT_POSITION_CONTAINS;
        }

        if ((this.sourceIndex === node.sourceIndex) ||
            (this.sourceIndex < 0 || node.sourceIndex < 0) ||
            getDocument(this) !== getDocument(node)) {
          point |= Node.DOCUMENT_POSITION_DISCONNECTED |
            Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        } else {
          point |= (this.sourceIndex < node.sourceIndex ?
                    Node.DOCUMENT_POSITION_FOLLOWING :
                    Node.DOCUMENT_POSITION_PRECEDING);
        }

        return point;
      }
    });
  }

  // IE8
  if (!('getComputedStyle' in window) &&
    'currentStyle' in Element.prototype) {
    define(window, 'getComputedStyle', {
      value: function(node) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          // temporary static only
          var ret = {},
            style = node.style,
            cur = node.currentStyle,
            key;

          for (key in cur) {
            try {
              ret[key] = style[key] || cur[key];
            } catch (e) {}
          }

          ret.cssFloat = ret.styleFloat;
          return ret;
        } else {
          return null;
        }
      }
    });
  }

  // ---
  // IE8
  if (!window.ClientRect && window.TextRectangle &&
      !('width' in window.TextRectangle)) {
    Object.defineProperties(TextRectangle.prototype, {
      width: {
        get: function() {
          return this.right - this.left;
        }
      },
      height: {
        get: function() {
          return this.bottom - this.top;
        }
      }
    });
  }

  if (!('hidden' in element)) {
    // IE8 wtf
    if ('runtimeStyle' in element) {
      define(Element.prototype, 'hidden', {
        get: function() {
          // return this.runtimeStyle.display === 'none';
          return this.hasAttribute('hidden');
        },
        set: function(value) {
          // need test in ie
          /*var style = this.runtimeStyle;

          if (!value && style.display === 'none') {
            style.display = '';
          } else if (value && style.display !== 'none') {
            style.display = 'none';
          }*/
        }
      });
    } else {
      define(Element.prototype, 'hidden', {
        get: function() {
          return this.hasAttribute('hidden');
        },
        set: function(value) {
          if (value) {
            this.setAttribute('hidden', '');
          } else {
            this.removeAttribute('hidden');
          }
        }
      });

      var _hiddenStyleSheet = createElement('style');
      _hiddenStyleSheet.innerHTML = '[hidden] { display: none }';
      head.appendChild(_hiddenStyleSheet);
    }
  }

  if (!('defaultView' in document) && document.parentWindow !== void 0) {
    define(Document.prototype, 'defaultView', {
      get: function() {
        return this.parentWindow;
      }
    });
  }

  

  // ---
  // Copy-pated from X-tags repo by Mozilla
  // http://github.com/mozilla/x-tag
  var prefix = Sync.prefix = (function() {
    var styles = window.getComputedStyle(document.documentElement),
      pre,
      dom;

      try {
        pre = (slice.call(styles).join('')
                .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
      } catch (e) {
        pre = 'ms';
      }

      dom = pre === 'ms' ? pre.toUpperCase() : pre;

    return {
      dom: dom,
      prop: dom.toLowerCase(),
      lowercase: pre,
      css: '-' + pre + '-',
      js: pre[0].toUpperCase() + pre.slice(1)
    };
  })();

  // HTML5

  if (!('matchesSelector' in Element.prototype) &&
      !((prefix.prop + 'MatchesSelector') in Element.prototype) &&
      !('matches' in Element.prototype)) {
    define(Element.prototype, 'matchesSelector', {
      value: document.createElement('output').cloneNode(true).outerHTML === '<:output></:output>' ? function(selector) {
        var frag = document.createDocumentFragment(),
          tmp,
          clone;

        frag.appendChild(frag.createElement(this.tagName));

        tmp = frag.appendChild(frag.createElement('div'));
        clone = tmp.appendChild(frag.createElement(this.tagName));

        clone.mergeAttributes(this);

        tmp = !!tmp.querySelector(selector);
        frag = null;
        clone = null;

        return tmp;
      } : function(selector) {
        var tmp = document.createElement('div'),
          clone = this.cloneNode(false);

        tmp.appendChild(clone);
        tmp = !!tmp.querySelector(selector);

        clone = null;
        return tmp;
      }
    });
  }

  if (!('matches' in Element.prototype)) {
    define(Element.prototype, 'matches', {
      value: function() {
        var key = prefix.prop + 'Matches';

        return (key in this ? this[key] : this[key + 'Selector'] || this.matchesSelector)
          .apply(this, arguments);
      }
    });
  }

  if (!('pageXOffset' in window) || !('pageYOffset' in window)) {
    define(window, 'pageXOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollLeft || 0,
                        document.documentElement.scrollLeft);
      }
    });

    define(window, 'pageYOffset', {
      get: function() {
        return Math.max(document.body && document.body.scrollTop || 0,
                        document.documentElement.scrollTop);
      }
    });
  }

  if ('insertBefore' in element && 'appendChild' in element) {
    (function() {
      try {
        element.insertBefore(document.createTextNode('test'), null);
      } catch (e) {
        var _originalInsertBefore = element.insertBefore;

        define(Element.prototype, 'insertBefore', {
          value: function(node, child) {
            if (!child) {
              return this.appendChild(node);
            }

            return _originalInsertBefore.call(this, node, child);
          }
        });
      }
    }());
  }

  [
    'prepend',
    'append',
    'replace',
    'before',
    'after',
    'remove'
  ].forEach(function(key) {
    if (key in applyingMutations) {
      var mutation = applyingMutations[key],
        targets = mutation.targets,
        handler = mutation.handler;

      targets.forEach(function(target) {
        target = target.prototype;

        if (!(key in target)) {
          define(target, key, {
            value: handler
          });
        }
      });
    }
  });

  // IE8 hellow
  if (!('cssFloat' in document.documentElement.style) &&
    'styleFloat' in document.documentElement.style &&
    'CSSStyleDeclaration' in window) {
    define(CSSStyleDeclaration.prototype, 'cssFloat', {
      get: function() {
        return this.styleFloat;
      },
      set: function(value) {
        return (this.styleFloat = value);
      }
    });
  }
}(this, document, Sync));(function(window, document, Sync, undefined) {
  "use strict";

  if (!document.addEventListener) return;

  var cache = Sync.cache,
    define = Object.defineProperty,
    hasOwn = Object.prototype.hasOwnProperty,
    events = {
      synced: {},
      natives: {},
      EventTarget: function() {},
      addEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          callback = params.callback || params.handler,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.addEventListener;
        }

        //if ((node + '').toLowerCase().indexOf('window') !== -1) return;

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });
        
        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(callback);

        if (index !== -1) {
          return;
        }

        callbacks.push(callback);
        store.push(params);

        if (method) {
          method.call(node, event, params.handler, !!capture);
        } else {
          node.addEventListener(event, params.handler, !!capture);
        }
      },
      removeEvent: function(node, event, params) {
        var callbacks,
          store,
          index,
          capture = params.capture,
          storeData,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

        callbacks = getCache({
          node: node,
          key: EVENTS_CALLBACKS_INDEX,
          namespace: namespace,
          event: event,
          capture: capture
        });

        store = getCache({
          node: node,
          key: EVENTS_HANDLERS_STORE,
          namespace: namespace,
          event: event,
          capture: capture
        });

        index = callbacks.indexOf(params.callback);

        if (index === -1 || !(storeData = store[index])) {
          return;
        }

        callbacks.splice(index, 1);
        store.splice(index, 1);

        if (method) {
          method.call(node, event, storeData.handler, capture);
        } else {
          node.removeEventListener(event, storeData.handler, capture);
        }
      },
      removeEventAll: function(node, event, params) {
        var capture = params.capture,
          namespace = (params.namespace || '') + '',
          method = params.method;

        if (namespace === events.NAMESPACE_NATIVE && !method) {
          method = natives.removeEventListener;
        }

        var remove = function(capture) {
          var callbacks,
          store;

          callbacks = getCache({
            node: node,
            key: EVENTS_CALLBACKS_INDEX,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store = getCache({
            node: node,
            key: EVENTS_HANDLERS_STORE,
            namespace: namespace,
            event: event,
            capture: capture
          });

          store.forEach(function(storeData, i) {
            if (method) {
              method.call(node, event, storeData.handler, capture);
            } else {
              node.removeEventListener(event, storeData.handler, capture);
            }
          });

          store.splice(0, store.length);
          callbacks.splice(0, callbacks.length);
        };

        if (capture == null) {
          remove(true);
          remove(false);
        } else {
          remove(capture);
        }
      },
      dispatchEvent: function(node, event, params) {
        var defaultAction = params.defaultAction,
          after = params.after,
          before = params.before,
          inter = window[params.type || 'CustomEvent'];

        event = new inter(event, params.options);

        if (typeof before === 'function') {
          before(event);
        }

        var result = node.dispatchEvent(event);

        if (typeof after === 'function') {
          after(event, result);
        }
        
        if (result && typeof defaultAction === 'function') {
          defaultAction.call(this, event);
        }

        return result;
      },
      cleanEvents: function(node, namespace) {
        if (!namespace || namespace === events.NAMESPACE_INTERNAL ||
          namespace === events.NAMESPACE_NATIVE) return;

        var clean = function(namespace) {
          if (!namespace) return;

          Sync.each(namespace, function(data, event) {
            data.capture.concat(data.bubbling).forEach(function(storeData) {
              node.removeEventListener(event, storeData.handler, storeData.capture);
            });
          });
        },
        store = Sync.cache(node, EVENTS_HANDLERS_STORE);

        delete Sync.cache(node, EVENTS_CALLBACKS_INDEX)[namespace];
        clean(store[namespace]);
        delete store[namespace];
      },
      shadowEventAddition: function(event, fn) {
        var resultSynced;

        events.syncEvent(event, function(synced) {
          resultSynced = synced;

          return {
            addEventListener: function(type, callback, capture) {
              events.addEvent(this, type, {
                handler: function(e) {
                  fn.call(this, e);
                  callback.call(this, e);
                },
                callback: callback,
                capture: capture,
                method: synced.addEventListener
              });
            },
            removeEventListener: function(type, callback, capture) {
              events.removeEvent(this, type, {
                callback: callback,
                capture: capture,
                method: synced.removeEventListener
              });
            }
          };
        });
      },
      syncEvent: function(event, handle) {
        var lastSynced = hasOwn.call(events.synced, event) ?
          events.synced[event] : natives;

        var newSynced = handle(lastSynced);

        if (!newSynced.addEventListener) {
          newSynced.addEventListener = lastSynced.addEventListener;
        }

        if (!newSynced.removeEventListener) {
          newSynced.removeEventListener = lastSynced.removeEventListener;
        }

        events.synced[event] = newSynced;
      },
      handleOnce: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        // console.log('handleOnceCache:', listeners);

        if (!listeners) {
          fn.call(obj);
        }

        cached[key] = ++listeners;
      },
      handleIfLast: function(obj, key, fn) {
        var cached = Sync.cache(obj, HANDLE_ONCE_STORE_KEY),
          listeners = cached[key] | 0;

        if (listeners) {
          cached[key] = --listeners;

          if (!listeners) {
            fn.call(obj);
          }
        }
      },
      shadowEventProp: function(e, key, val) {
        var shadow = function(val, key) {
          try {
            e[key] = val;
          } catch (err) {};
          
          if (e[key] !== val) {
            // try to change property if configurable
            // in Chrome should change getter instead of value
            try {
              Object.defineProperty(e, key, {
                get: function() {
                  return val;
                }
              });
            } catch (err) {
              var protoEvent = e;

              e = Object.create(e/*, {
                [key]: {
                  value: val
                }
              }*/);

              Object.defineProperty(e, key, {
                value: val
              });

              [
                'preventDefault',
                'stopPropagation',
                'stopImmediatePropagation'
              ].forEach(function(key) {
                e[key] = function() {
                  protoEvent[key]()
                };
              });
            }
          }
        };

        if (Sync.isObject(key)) {
          Sync.each(key, shadow);
        } else {
          shadow(val, key);
        }

        return e;
      },
      NAMESPACE_INTERNAL: 'internal',
      NAMESPACE_NATIVE: 'native'
    },
    natives = events.natives,
    commonDOMET = !hasOwn.call(HTMLDivElement.prototype, 'addEventListener'),
    ETOwnBuggy = false,
    ETList = ['EventTarget', 'Node', 'Element', 'HTMLElement'],
    hasTouch = 'ontouchstart' in document;
 
  var EVENTS_CALLBACKS_INDEX = 'events_callbacks_index',
    EVENTS_HANDLERS_STORE = 'events_handlers_store',
    EVENT_TARGET_COMPUTED_STYLE = 'event_computed_style',
    HANDLE_ONCE_STORE_KEY = 'handle_once_store';

  var getCache = function(params) {
    var data = Sync.cache(params.node, params.key),
      event = params.event,
      namespace = params.namespace || events.NAMESPACE_INTERNAL;

    if (typeof namespace !== 'string') {
      return null;
    }

    data = data.hasOwnProperty(namespace) ? data[namespace]  : (data[namespace] = {});

    data = data.hasOwnProperty(event) ? data[event] : (data[event] = {
      capture: [],
      bubbling: []
    });

    return params.capture ? data.capture : data.bubbling;
  },
  getDOMET = function(method) {
    var result;
  
    ETList.some(function(inter) {
      var desc;

      inter = window[inter];
  
      if (inter && (desc = Object.getOwnPropertyDescriptor(inter.prototype, method))) {
        result = {
          inter: inter,
          desc: desc
        };
  
        return true;
      }
    });
  
    return result;
  },
  setDOMET = function(method, value, desc) {
    if (!commonDOMET) {
      return setSeparateDOMET(method, value, desc);
    }

    ETList.forEach(function(inter) {
      inter = window[inter];
      inter && (inter = inter.prototype);
    
      if (inter) {
        var localDesc = desc || Object.getOwnPropertyDescriptor(inter, method);

        // console.log(inter, method, value);

        Object.defineProperty(inter, method, {
          value: value,
          writable: localDesc.writable,
          configurable: localDesc.configurable,
          enumerable: localDesc.enumerable
        });
      }
    });
  },
  setSeparateDOMET = function(method, value, desc) {
    var tags = ["Link","Html","Body","Div","Form","Input","Image","Script","Head","Anchor","Style","Time","Option","Object","Output","Canvas","Select","UList","Meta","Base","DataList","Directory","Meter","Source","Button","Label","TableCol","Title","Media","Audio","Applet","TableCell","MenuItem","Legend","OList","TextArea","Quote","Menu","Unknown","BR","Progress","LI","FieldSet","Heading","Table","TableCaption","Span","FrameSet","Font","Frame","TableSection","OptGroup","Pre","Video","Mod","TableRow","Area","Data","Param","Template","IFrame","Map","DList","Paragraph","Embed","HR"];

    tags.forEach(function(tag) {
      tag = window['HTML' + tag + 'Element'];
      tag && (tag = tag.prototype);

      if (!tag) return;

      var localDesc = desc || Object.getOwnPropertyDescriptor(tag, method);

      Object.defineProperty(tag, method, {
        value: value,
        writable: localDesc.writable,
        configurable: localDesc.configurable,
        enumerable: localDesc.enumerable
      });
    });
  },
  getETCustom = function(_interface, method) {
    var desc;

    _interface = window[_interface];
    
    desc = _interface &&
      (desc = Object.getOwnPropertyDescriptor(_interface.prototype, method));

    return {
      inter: _interface,
      desc: desc
    };
  },
  setETCustom = function(_interface, method, value, desc) {
    _interface = window[_interface];
    _interface && (_interface = _interface.prototype);
    
    if (!_interface) return;

    desc || (desc = Object.getOwnPropertyDescriptor(_interface, method));

    Object.defineProperty(_interface, method, {
      value: value,
      writable: desc.writable,
      configurable: desc.configurable,
      enumerable: desc.enumerable
    });
  },
  setET = function(_interface, prop, value, desc) {
    if (_interface.toUpperCase() === 'DOM') {
      setDOMET(prop, value, desc);
    } else {
      setETCustom(_interface, prop, value, desc);
    }
  },
  getET = function(_interface, prop) {
    if (_interface.toUpperCase() === 'DOM') {
      return getDOMET(prop);
    } else {
      return getETCustom(_interface, prop);
    }
  };

  events.setET = setET;
  events.getET = getET;
  events.setETCustom = setETCustom;
  events.getETCustom = getETCustom;
  events.setDOMET = setDOMET;
  events.getDOMET = getDOMET;
  events.setSeparateDOMET = setSeparateDOMET;

  window.EventTarget && (function() {
    var add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener,
      handler = function() {};

    try {
      add.call(document, 'ettest', handler, false);
      remove.call(document, 'ettest', handler, false);
    } catch (e) {
      ETOwnBuggy = true;
      ETList.push(ETList.shift());
    }
  }());


  // fix disabled elements
  (function() {
    var disabled = (function() {
      var button = document.createElement('button'),
        fieldset,
        handlesEvents,
        handlesEventsWrapped,
        html = document.documentElement,
        e;
  
      var TEST_EVENT_NAME = 'test';
  
      var eventHandler = function() {
        handlesEvents = true;
      },
      wrappedEventHandler = function() {
        handlesEventsWrapped = true;
      };
  
      button.disabled = true;
      html.appendChild(button);
  
      button.addEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      e = document.createEvent('CustomEvent');
      e.initEvent(TEST_EVENT_NAME, false, false);
      button.dispatchEvent(e);
      button.removeEventListener(TEST_EVENT_NAME, eventHandler, false);
  
      if (!handlesEvents) {
        fieldset = document.createElement('fieldset');
        fieldset.disabled = true;
        fieldset.appendChild(button);
        html.appendChild(fieldset);
  
        button.disabled = false;
        button.addEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        e = document.createEvent('CustomEvent');
        e.initCustomEvent(TEST_EVENT_NAME, false, false, 1);
        button.dispatchEvent(e);
        button.removeEventListener(TEST_EVENT_NAME, wrappedEventHandler, false);
  
        html.removeChild(fieldset);
      } else {
        html.removeChild(button);
        handlesEventsWrapped = true;
      }
  
      return {
        handlesEvents: handlesEvents,
        handlesEventsWrapped: handlesEventsWrapped
      };
    }());

    if (disabled.handlesEvents) return;
  
    var native = getDOMET('dispatchEvent'),
      nativeDispatch = native.desc,
      blockedEvents = {
        click: 1
      };
  
    var dispatchEvent = function(event) {
      var node = this,
        disabledDesc,
        disabledChanged,
        disabledChangedVal = true,
        disabledFix,
        result;
  
      if (!node.disabled ||
        (event && event.type && blockedEvents.hasOwnProperty(event.type))) {
        return nativeDispatch.value.call(this, event);
      }
  
      try {
        disabledDesc = Object.getOwnPropertyDescriptor(
            // Firefox
            Object.getPrototypeOf(node),
            'disabled'
            // IE
          ) || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'disabled');
      } catch (e) {
        // old firefox with XPC problems
        if (e.code === 0x8057000C ||
            e.result === 0x8057000C) {
          disabledDesc = {
            enumerable: false,
            configurable: true
          };
        }
      }
  
      if (disabledDesc && /*disabledDesc.set && disabledDesc.get &&*/
          !Object.getOwnPropertyDescriptor(node, 'disabled')) {
        disabledFix = true;
        node.disabled = false;
        console.log('used fix');
        // force update disabled property, wtf
        node.offsetWidth;

        Object.defineProperty(node, 'disabled', {
          enumerable: disabledDesc.enumerable,
          configurable: disabledDesc.configurable,
          set: function(val) {
            disabledChanged = true;
            disabledChangedVal = !!val;
          },
          get: function() {
            return disabledChangedVal;
          }
        });
      }
     
      result = nativeDispatch.value.apply(this, arguments);
     
      if (disabledFix) {
        delete node.disabled;
        node.disabled = disabledChanged ? disabledChangedVal : true;
      }
  
      return result;
    };

    setDOMET('dispatchEvent', dispatchEvent, nativeDispatch);
  
    /*Object.defineProperty(native.inter.prototype, 'dispatchEvent', {
      value: dispatchEvent,
      writable: nativeDispatch.writable,
      configurable: nativeDispatch.configurable,
      enumerable: nativeDispatch.enumerable
    });*/
  
    if (disabled.handlesEventsWrapped) return;
  
    // Here should be fix for elements wrapped with some others disabled elements
    // <fieldset disabled>
    //   <button disabled></button>
    // </fieldset>
  }());
  
  // fix stopImmediatePropagation
  if (window.Event &&
    !('stopImmediatePropagation' in Event.prototype)) (function() {
    var stopDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'stopPropagation');

    var SIP_FIX_KEY = 'events_sip_fix_key',
      SIP_FIX_KEY_INDEX = 'events_sip_fix_key_index';

    define(Event.prototype, 'stopImmediatePropagation', {
      value: function() {
        if (this._ignoreListeners) return;

        define(this, '_ignoreListeners', {
          value: true,
          writable: false,
          enumerable: false,
          configurable: false
        });
      },
      writable: stopDesc.writable,
      enumerable: stopDesc.enumerable,
      configurable: stopDesc.configurable
    });

    ['DOM', 'XMLHttpRequest'].forEach(function(_interface) {
      var addDesc = getET(_interface, 'addEventListener').desc,
        rmDesc = getET(_interface, 'removeEventListener').desc;

      setET('addEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            return addDesc.value.call(this, event, listener, capture);
          }
        } else {
          stored = {};
          indexed = index.push(listener) - 1;
          store.push(stored);
        }

        var wrap = function(e) {
          if (e._ignoreListeners) return;
          listener.call(this, e);
        };

        stored[capture] = wrap;
        return addDesc.value.call(this, event, wrap, capture);
      }, addDesc);

      setET('removeEventListener', function(event, listener, capture) {
        var cached = cache(this),
          store = cached[SIP_FIX_KEY] || (cached[SIP_FIX_KEY] = {}),
          index = cached[SIP_FIX_KEY_INDEX] || (cached[SIP_FIX_KEY_INDEX] = {}),
          indexed,
          stored;

        capture = !!capture;

        store = store[event] || (store[event] = []);
        index = index[event] || (index[event] = []);

        if ((indexed = index.indexOf(listener)) !== -1) {
          stored = store[indexed];

          if (hasOwn.call(stored, capture)) {
            if (!hasOwn.call(stored, !capture)) {
              index.splice(indexed, 1);
              store.splice(indexed, 1);
            }

            listener = stored[capture];
            delete stored[capture];
          }
        }

        return rmDesc.value.call(this, event, listener, capture);
      }, rmDesc);
    });
  }());

  (function() {
    try {
      document.createEvent('CustomEvent');
    } catch (e) {
      var _createEvent = document.createEvent;
      document.createEvent = function(event) {
        if (event === 'CustomEvent') {
          var e = _createEvent.call(this, 'Event');
          e.initCustomEvent = function(type, bubbles, cancelable, detail) {
            e.initEvent(type, bubbles, cancelable);
            e.detail = detail;
          };

          return e;
        }

        return _createEvent.call(this, event);
      };
    }
  }());

  Sync.each({
    'Event': [
      'bubbles',
      'cancelable'
    ],
    'CustomEvent': [
      'bubbles',
      'cancelable',
      'detail'
    ],
    'UIEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail'
    ],
    'MouseEvent': [
      'bubbles',
      'cancelable',
      'view',
      'detail',
      'screenX',
      'screenY',
      'clientX',
      'clientY',
      'ctrlKey',
      'altKey',
      'shiftKey',
      'metaKey',
      'button',
      'relatedTarget'
    ]
  }, function(params, event) {
    try {
      new window[event]('test', {});
    } catch (e) {
      window[event] && (window['_' + event] = window[event]);
      window[event] = function(type, dict) {
        var init,
        e = document.createEvent(event);

        init = params.map(function(prop) {
          return dict ? dict[prop] : null;
        });

        init.unshift(type);
        e['init' + event].apply(e, init);

        return e;
      };
    }
  });

  (function() {
    var _mouseClick = new MouseEvent('click');

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('layerX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'layer' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['offset' + axis] +
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['offset' + axis];
            }
          }
        });
      });
    }

    if ([
      MouseEvent.prototype,
      _mouseClick
    ].every(function(target) {
      if (!('offsetX' in target)) return true;
    })) {
      ['X', 'Y'].forEach(function(axis) {
        define(MouseEvent.prototype, 'offset' + axis, {
          get: function() {
            var computed = Sync.cache(this);

            computed = computed[EVENT_TARGET_COMPUTED_STYLE] ||
              (computed[EVENT_TARGET_COMPUTED_STYLE] =
                window.getComputedStyle(this.target));

            if (computed.position === 'static') {
              return this['layer' + axis] -
                this.target['offset' + (axis === 'X' ? 'Left' : 'Top')];
            } else {
              return this['layer' + axis];
            }
          }
        });
      });
    }
  }());

  [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ].forEach(function(method) {
    var native = getDOMET(method);

    if (!native || !native.desc) return;

    natives[method] = native.desc.value;

    setDOMET(method, function(arg1, arg2, arg3) {
      var hook,
        type;

      if (typeof arg1 === 'object') {
        type =  arg1.type;
      } else {
        type = arg1;
      }

      if (type && events.synced.hasOwnProperty(type) &&
          (hook = events.synced[type]) && (hook = hook[method])) {
        if (typeof hook === 'string') {
          arg1 = hook;
        } else {
          return hook.call(this, arg1, arg2, arg3);
        }
      }

      return natives[method].call(this, arg1, arg2, arg3);
    }, native.desc);
  });

  // fix mouseenter/leave if they are not exist
  // or shadow them on devices with touch because
  // native enter/leave are broken in Chrome ...
  // ... and we cannot detect that
  bindEnterLeave: if (!('onmouseenter' in document.createElement('div'))/* || hasTouch*/) {
    // hasTouch should be changed to isChromeAndroid
    break bindEnterLeave;

    Sync.each({
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    }, function(event, hook) {
      var hookKey = 'hook_' + event + '_' + hook,
        originalEventKeyHook = 'hook_' + event,
        originalHookKeyHook = 'hook_' + hook,
        eventSynched,
        hookEvents = {
          add: function(event) {
            events.handleOnce(document, hookKey, function() {
              // console.log('handleOnce', hookKey, document);

              events.addEvent(document, event, {
                handler: function(e) {
                  var target = e.target,
                    relatedTarget = e.relatedTarget;

                  events.dispatchEvent(target, originalEventKeyHook, {
                    type: 'MouseEvent',
                    options: e
                  });

                  // console.log(originalEventKeyHook, originalHookKeyHook);

                  if (!relatedTarget || (target !== relatedTarget &&
                       !target.contains(relatedTarget))) {
                    events.dispatchEvent(target, originalHookKeyHook, {
                      type: 'MouseEvent',
                      options: Sync.extend({}, e, {
                        bubbles: false,
                        cancelable: false
                      })
                    });
                  }
                },
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.addEventListener
              });
            });
          },
          remove: function(event) {
            events.handleIfLast(document, hookKey, function() {
              events.removeEvent(document, event, {
                // index
                callback: hookEvents,
                capture: true,
                method: eventSynched.removeEventListener
              });
            });
          }
        };

      // mouseover / mouseout
      events.syncEvent(event, function(synced) {
        eventSynched = synced;

        return {
          addEventListener: function(event, callback, capture) {
            // console.log('add mouseout/over', event);
            events.addEvent(this, originalEventKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', event);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(event, callback, capture) {
            events.removeEvent(this, originalEventKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        };
      });

      // mouseenter / mouseleave
      events.syncEvent(hook, function(synced) {
        return {
          addEventListener: function(hook, callback, capture) {
            // console.log('add mouseleave/enter', hook);
            events.addEvent(this, originalHookKeyHook, {
              handler: function(e) {
                e = events.shadowEventProp(e, 'type', hook);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });

            hookEvents.add(event);
          },
          removeEventListener: function(hook, callback, capture) {
            events.removeEvent(this, originalHookKeyHook, {
              callback: callback,
              capture: capture
            });

            hookEvents.remove(event);
          }
        }
      });
    });
  }

  events.syncEvent('input', function(synced) {
    var bindKeyPress = function(hook, callback, capture) {
      var self = this,
        handler = function(e) {
          events.dispatchEvent(this, hook, {
            type: 'Event',
            options: {
              bubbles: false,
              cancelable: false
            }
          });
        };

      events.addEvent(self, 'contextmenu', {
        handler: function() {
          var handleMove = function() {
            self.removeEventListener('mousemove', handleMove, true);
            document.removeEventListener('mousemove', handleMove, true);

            handler();
          };

          self.addEventListener('mousemove', handleMove, true);
          document.addEventListener('mousemove', handleMove, true);
        },
        callback: callback,
        capture: true
      });

      keypressBindings.forEach(function(event) {
        events.addEvent(self, event, {
          handler: handler,
          callback: callback,
          capture: capture
        });
      });
    },
    unbindKeyPress = function(hook, callback, capture){
      var self = this;

      events.removeEvent(self, 'contextmenu', {
        callback: callback,
        capture: true
      });

      keypressBindings.forEach(function(event) {
        events.removeEvent(self, event, {
          callback: callback,
          capture: capture
        });
      });
    },
    keypressBindings = [
      'keydown',
      'cut',
      'paste',
      'copy'
    ],
    bindKey = 'hook_oninput',
    bindIndex = function() {};

    return {
      addEventListener: function(type, callback, capture) {
        var self = this;

        if (window.TextEvent && ((this.attachEvent && this.addEventListener) ||
            (this.nodeName.toLowerCase() === 'textarea' && !('oninput' in this))) ||
            (!'oninput' in this || !this.addEventListener)) {
          events.handleOnce(this, bindKey, function() {
            bindKeyPress.call(this, type, bindIndex, capture);
          });
        }

        synced.addEventListener.call(this, type, callback, capture);
      },
      removeEventListener: function(type, callback, capture) {
        events.handleIfLast(this, bindKey, function() {
          unbindKeyPress.call(this, type, bindIndex, capture);
        });

        synced.removeEventListener.call(this, type, callback, capture);
      }
    }
  });

  Sync.events = events;
}(this, this.document, Sync));;(function(Sync) {
  var navigator = window.navigator,
    pointers = {
      flags: {
        IMMEDIATE_POINTER_LEAVE: true,
        DETECT_CHROME_VERSION: true,
        DETECT_CHROME_BEHAVIOR: true,
        MOUSE_EVENTS: true,
        TOUCH_EVENTS: true,
        FIX_FLING_STOP: true,
        // Two main issues for this:
        // * firefox prevents contextmenu on stopPropagation()
        //   on 'contextmenu' event (https://bugzilla.mozilla.org/show_bug.cgi?id=998940)
        // * Android Stock Browser (prior to 4.4) fires compatibilty
        //   mouse-events before touchstart
        HANDLE_MOUSE_EVENTS_ANDROID: false,
        TOUCHMOVE_SLOP_SIZE: 10,
        // one of: auto, pointers-first, touch-first
        TOUCH_COMPATIBILITY_MODE: 'touch-first',
        PINCH_ZOOM_BEHAVIOR_PROPAGATION: false
      },
      devices: {}
    };
  
  Sync.pointers = pointers;

  if (window.PointerEvent) return;

  var events = Sync.events,
    natives = events.natives,
    hasOwn = Object.prototype.hasOwnProperty,
    slice = Array.prototype.slice,
    pow = Math.pow,
    abs = Math.abs,
    uidInc = 0,
    hasTouch = true || 'ontouchstart' in document,
    logger = new Sync.Logger('pointers');

  {
    var ua = navigator.userAgent.toLowerCase(),
      vendorStr = (navigator.vendor || '').toLowerCase(),
      vendor = ['google', 'yandex', 'opera', 'mozilla', {
        search: 'research in motion',
        key: 'rim'
      }].reduce(function(result, key) {
        if (typeof key !== 'string') {
          var found = vendorStr.indexOf(key.search) !== -1;
          result[key.key] = found;
        } else {
          found = vendorStr.indexOf(key) !== -1;
          result[key] = found;
        }

        return result;
      }, {}),
      isV8 = !!(window.v8Intl || (window.Intl && Intl.v8BreakIterator)),
      isAndroidStockium = false,
      isAndroidStock = 'isApplicationInstalled' in navigator ||
        (isAndroidStockium = isV8 && !window.chrome && vendor.google),
      isChrome = !!window.chrome && !isAndroidStock,
      isFx = !!navigator.mozApps,
      isAndroidFx = isFx && (navigator.appVersion || '')
        .toLowerCase().indexOf('android') !== -1,
      // need to check chrome not by UserAgent
      // chrome for android has not plugins and extensions
      // but on desktop plugins also might be disabled
      // so we need to check by the ability to install extensions
      isChromeAndroid = isChrome &&
        ('startActivity' in navigator || !chrome.webstore),
      isAndroid = isAndroidStock || isChromeAndroid || isAndroidFx ||
        (!isAndroidStock && !isChromeAndroid && !isAndroidFx) && 
          ua.indexOf('android') !== -1,
      isIOS = !isAndroid &&
        hasOwn.call(navigator, 'standalone') && 'ongesturestart' in window/* !!window.getSearchEngine*/ /*,
      isBadTargetIOS = isIOS && /OS ([6-9]|\d{2})_\d/.test(navigator.userAgent)*/,

      // chrome 32+
      isChromeBelow31 = isChrome && 'vibrate' in navigator &&
        'getContextAttributes' in document.createElement('canvas').getContext('2d'),
      isBB10 = navigator.platform.toLowerCase() === 'blackberry' && vendor.rim;
  }

  console.log(JSON.stringify({
    isV8: isV8,
    isAndroid: isAndroid,
    isChrome: isChrome,
    isChromeAndroid: isChromeAndroid,
    isAndroidStock: isAndroidStock,
    isFx: isFx,
    isAndroidFx: isAndroidFx,
    isIOS: isIOS
  }));

  // chrome 18 window.Intent
  // chrome 18 navigator.startActivity
  // chrome 18 chrome.appNotifications
  // chrome 18 chrome.setSuggestResult
  // chrome 18 chrome.searchBox
  // chrome 18 chrome.webstore
  // chrome 18 chrome.app

  // android stock chrome.searchBox
  // android stock navigator.isApplicationInstalled
  // android stock navigator.connection

  // chrome android latest inc isV8

  // chrome desktop chrome.app
  // chrome desktop chrome.webstore
  // inc isV8

  var FAKE_PREFIX = 'fake_',
    MOUSE_PREFIX = 'mouse',
    POINTER_PREFIX = 'pointer',
    TOUCH_PREFIX = 'touch',
    NS_MOUSE_POINTER = 'mouse_pointer',
    NS_TOUCH_POINTER = 'touch_pointer',
    DEVICE_LISTENERS_KEY = 'device_listeners_key',
    POINTER_DEFAULTS = {
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      pointerType: '',
      isPrimary: false
    },
    MOUSE_EVENT_INIT = {
      bubbles: false,
      cancelable: false,
      view: null,
      detail: 0,
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      button: 0,
      buttons: 0,
      relatedTarget: null
    },
    POINTER_FIELDS = Object.keys(POINTER_DEFAULTS);


  // MSPointer type

  if (window.MSPointerEvent) return (function() {
    var msBindings = {
      down: function() {},
      up: function() {},
      move: function() {},
      over: function() {},
      out: function() {},
      enter: function() {},
      leave: function() {},
      cancel: function() {}
    }, msDevices = {};

    window.PointerEvent = function(type, options) {
      var event = document.createEvent('MSPointerEvent');

      event.initPointerEvent(
        type,
        options.bubbles,
        options.cancelable,
        options.view,
        options.detail,
        options.screenX,
        options.screenY,
        options.clientX,
        options.clientY,
        options.ctrlKey,
        options.altKey,
        options.shiftKey,
        options.metaKey,
        options.button,
        options.relatedTarget,
        options.offsetX,
        options.offsetY,
        options.width,
        options.height,
        options.pressure,
        options.rotation,
        options.tiltX,
        options.tiltY,
        options.pointerId,
        options.pointerType,
        options.hwTimestamp,
        options.isPrimary
      );

      return event;
    };

    triggerDeviceListeners = function(node, event) {

    };

    muteDeviceListeners = function(node, event) {

    };
  }());

  var devices = pointers.devices,
    flags = pointers.flags,
    pointersMap = {},
    idCounter = 0,
    hasTouchListeners,
    hasMouseListeners,
    hasPointerListeners;
  
  var triggerDeviceListeners = function(node, event,/* capture,*/ deviceType) {
    // if (!devices.length) return;

    Object.keys(devices).forEach(function(device) {
      if (deviceType && deviceType !== device) return;

      var type = DEVICE_LISTENERS_KEY + device + event;

      device = devices[device];

      Sync.events.handleOnce(node, type, function() {
        device.bindListener(node, event/*, capture*/);
      });

      /*var cached = Sync.cache(node, DEVICE_LISTENERS_KEY),
        type = device.type + event,
        listeners = cached[type] | 0;

      if (!listeners) {
        device.bindListener(node, event, capture);
      }

      cached[type] = ++listeners;*/
    });
  },
  muteDeviceListeners = function(node, event,/* capture,*/ deviceType) {
    // if (!devices.length) return;

    Object.keys(devices).forEach(function(device) {
      if (deviceType && deviceType !== device) return;

      var type = DEVICE_LISTENERS_KEY + device + event;

      device = devices[device];

      Sync.events.handleIfLast(node, type, function() {
        device.unbindListener(node, event/*, capture*/);
      });

      /*var cached = Sync.cache(node, DEVICE_LISTENERS_KEY),
        type = device.type + event,
        listeners = cached[type] | 0;

      if (listeners) {
        cached[type] = --listeners;

        if (!listeners) {
          device.unbindListener(node, event, capture);
        }
      }*/
    });
  },
  shadowEventType = function(e, type) {
    try {
      e.type = type;
    } catch (err) {};
    
    if (e.type !== type) {
      // try to change property if configurable
      // in Chrome should change getter instead of value
      try {
        Object.defineProperty(e, 'type', {
          get: function() {
            return type;
          }
        });
      } catch (err) {
        var protoEvent = e;

        e = Object.create(e, {
          type: {
            value: type
          }
        });

        [
          'preventDefault',
          'stopPropagation',
          'stopImmediatePropagation'
        ].forEach(function(key) {
          e[key] = function() {
            protoEvent[key]()
          };
        });
      }
    }

    return e;
  },
  extendDOMObject = function(dist, source) {
    for (var key in source) {
      dist[key] = source[key];
    }

    return dist;
  },
  syncEvent = function(deviceNatives, full, event, device) {
    events.syncEvent(full, function(synced) {
      deviceNatives[full] = synced;

      return {
        addEventListener: function(type, callback, capture) {
          if (event && device) {
            triggerDeviceListeners(this, event,/* capture,*/ device);
          }

          events.addEvent(this, FAKE_PREFIX + full, {
            handler: function(e) {
              // e = Sync.extend({}, e);
              e = shadowEventType(e, type);

              // console.log('type: ' + e.type);
              callback.call(this, e);
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          if (event && device) {
            muteDeviceListeners(this, event,/* capture,*/ device);
          }

          events.addEvent(this, FAKE_PREFIX + full, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      }
    });
  },
  debunce = function(fn, time, callFirst) {
    var lastCall;

    return function(arg) {
      var needCall;

      if (!lastCall && callFirst !== false) {
        needCall = true;
      }

      if (lastCall) {
        var now = Date.now();

        if (now - lastCall > time) {
          needCall = true;
        }
      }

      lastCall = Date.now();

      if (needCall) {
        var len = arguments.length;

        if (len <= 1) {
          return fn.call(this, arg);
        } else {
          return fn.apply(this, arguments);
        }
      }
    };
  };

  events.setETCustom('Element', 'setPointerCapture', function(pointerId, options) {
    var pointer = pointersMap[pointerId],
      element = this;

    if (!pointer) {
      throw new (window.DOMException || window.Error)('InvalidPointerId');
    }

    if (!this.parentNode) {
      throw new (window.DOMException || window.Error)('');
    }

    if (!pointer.buttons) return;

    if (pointer.captured) {
      implicitReleaseCapture(pointer);
    }

    var device = pointers.getDevice(pointer.type),
      trackBoundaries = (options ? options.trackBoundaries : true) !== false;

    device.capturePointer(element, pointer);

    pointer.captured = true;
    pointer.captureElement = element;
    pointer.captureTrackBoundaries = trackBoundaries;

    pointer.dispatchEvent(element, 'gotpointercapture', {
      // mouse dict
      relatedTarget: null,
      cancelable: false,
      bubbles: true
    }, {
      // pointer dict
    }, false);
  }, {
    writable: true,
    configurable: true,
    enumerable: false
  });

  events.setETCustom('Element', 'releasePointerCapture', function(pointerId) {
    var pointer = pointersMap[pointerId],
      element = this;

    if (!pointer) {
      throw new (window.DOMException || window.Error)('InvalidPointerId');
    }

    if (!pointer.captured) return;

    var device = pointers.getDevice(pointer.type);

    device.releasePointer(element, pointer);

    pointer.captured = false;
    pointer.captureElement = null;
    pointer.captureTrackBoundaries = void 0;

    pointer.dispatchEvent(element, 'lostpointercapture', {
      // mouse dict
      relatedTarget: null,
      cancelable: false,
      bubbles: true
    }, {
      // pointer dict
    }, false);
  }, {
    writable: true,
    configurable: true,
    enumerable: false
  });

  [
    'down',
    'up',
    'move',
    'over',
    'out',
    'enter',
    'leave',
    'cancel'
  ].forEach(function(event) {
    var full = POINTER_PREFIX + event;

    events.syncEvent(full, function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          triggerDeviceListeners(this, event);
          !hasPointerListeners && (hasPointerListeners = true);

          events.addEvent(this, full, {
            handler: callback,
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          muteDeviceListeners(this, event);

          events.addEvent(this, full, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      }
    });
  });

  window.PointerEvent = function(type, options) {
    var event = new window.MouseEvent(type, options);

    POINTER_FIELDS.forEach(function(field) {
      if (!hasOwn.call(event, field)) {
        event[field] = hasOwn.call(options, field) ?
          options[field] : POINTER_DEFAULTS[field];
      }
    });

    event = events.shadowEventProp(event, {
      'button': options.button,
      'buttons': options.buttons
    });

    return event;
  };

  pointers.getDevice = function(type) {
    return devices[type] || null;
  };

  pointers.getNextId =  function() {
    if (idCounter >= Number.MAX_VALUE) {
      return (idCounter = 0);
    }

    return idCounter++;
  };

  pointers.Device = function(type) {
    this.type = type;
    this.pointers = [];

    // spec is not clear about canceling all device or pointer
    // it says:
    // cancel all events of type;
    // so that is a device
    this.mouseEventsPrevented = false;

    if (hasOwn.call(devices, type)) {
      logger.log('Duplicate of device:', type);
      throw new Error();
    }

    logger.log('New device:', type);
    devices[type] = this;
  };

  pointers.Device.prototype = {
    createPointer: function() {
      var pointer = new pointers.Pointer(this);

      return pointer;
    },
    isPrimaryPointer: function(pointer) {
      return this.pointers[0] === pointer;
    },
    addPointer: function(pointer) {
      var isPrimary = !this.pointers.length;

      this.pointers.push(pointer);

      if (isPrimary) {
        this.primaryPointer = pointer;
      }
    },
    removePointer: function(pointer) {
      var devicePointers = this.pointers,
        index = devicePointers.indexOf(pointer);

      if (index !== -1) {
        devicePointers.splice(index, 1);

        if (pointer === this.primaryPointer) {
          this.primaryPointer = null;
        }
      }
    },
    primaryPointer: null
  };

  pointers.Pointer = function(device) {
    this.device = device;
    this.id = pointers.getNextId();
    this.type = device.type;
    this.buttons = 0;

    pointersMap[this.id] = this;
    device.addPointer(this);
  };

  pointers.Pointer.prototype = {
    get isPrimary() {
      return this.device.primaryPointer === this;
    },
    get button() {
      var buttons = this.buttons,
        lastButtons = this._lastButtons,
        lastButton = this._lastButton,
        button;

      if (lastButtons === buttons) {
        return lastButton;
      }

      if (!buttons) {
        button = -1;
      } else if (buttons === 4) {
        button = 1;
      } else if (buttons === 2) {
        button = 2;
      } else {
        button = Math.log(buttons) / Math.log(2);
      }

      this._lastButton = button;
      this._lastButtons = buttons;

      return button;
    },
    destroy: function() {
      pointersMap[this.id] = null;
      this.device.removePointer(this);
    },
    initEventDict: function(options) {
      var dict,
        buttons = this.buttons,
        button = this.button;

      options || (options = {});

      dict = {
        pointerId: this.id,
        pointerType: this.type,
        isPrimary: this.isPrimary,
        buttons: buttons,
        button: button
      };

      // options
      [
        'width',
        'height',
        'pressure',
        'tiltX',
        'tiltY',
        'cancelable',
        'bubbles'
      ].forEach(function(key) {
        if (key in options) {
          dict[key] = options[key]
        } else if (hasOwn.call(POINTER_DEFAULTS, key)) {
          dict[key] = POINTER_DEFAULTS[key]
        }
      });

      return dict;
    },
    dispatchEvent: function(node, event, mouseEventDict, options, prefixed) {
      // Object.keys is not the keys there
      // properties of event are stored in the prototype
      // Sync.extend is backed by the Object.keys
      // so we use the for in loop instead
      // var dict = Sync.extend({}, mouseEventDict, this.initEventDict());
      // delete dict.type;

      var dict = {};

      Object.keys(MOUSE_EVENT_INIT).forEach(function(prop) {
        if (hasOwn.call(mouseEventDict, prop)) {
          dict[prop] = mouseEventDict[prop];
        }
      });

      if (!dict.view) {
        dict.view = node.defaultView;
      }

      // console.log(Sync.extend({}, options));
      options = this.initEventDict(options);

      Sync.extend(dict, options);

      return events.dispatchEvent(node, 
        (prefixed === false ? '' : POINTER_PREFIX) + event, {
        type: 'PointerEvent',
        options: dict
      });
    },
    captured: false,
    captureElement: null
  };

  // ###################

  var viewport = (function() {
    var metaViewport = document.querySelector('meta[name="viewport"]'),
      metaContent = metaViewport && metaViewport.content.toLowerCase(),
      hasScale = !metaContent;

    if (metaContent) {
      var userScalable = metaContent.indexOf('user-scalable=no') === -1,
        maximumScale = (metaContent.match(/maximum-scale=([\d\.]+?)/) || [])[1],
        minimumScale = (metaContent.match(/minimum-scale=([\d\.]+?)/) || [])[1];

      hasScale = userScalable ||
        // Android stock does not support minimum scale
        (maximumScale === minimumScale && !isAndroidStock);
    }

    return {
      meta: metaViewport,
      scaleAllowed: hasScale
    };
  }()),
  mayNeedFastClick = (function() {
    if (viewport.meta) {
      // Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
      // https://github.com/ftlabs/fastclick/issues/89

      // under question is false for Fx with his strange behavior when touch hold
      // also trigger click (some thing about 600ms after touchstart)
      if ((isChromeAndroid || isBB10 || isAndroidFx) && !viewport.scaleAllowed) {
        return false;
      }

      // Chrome 32 and above with width=device-width or less don't need FastClick
      if (flags.DETECT_CHROME_VERSION && isChromeAndroid && isChromeBelow31 &&
        // https://github.com/jakearchibald/fastclick/commit/4aedb2129c6e7daf146f0b8d2f933b8779a9f486
        // some fix from FastClick, need more research about those properties
        // and page zooming
          window.innerWidth <= window.screen.width) {
        return false;
      }
    }

    // scaled viewport
    if (viewport.scaleAllowed) {
      return false;
    }

    return true;
  }()),
  findScrollAncestors = function(parent, computed, iterator) {
    var parents = [{
        computed: computed,
        element: parent
      }],
      isScrollable,
      iterate = typeof iterator === 'function',
      isLast,
      parentData;

    while (parent) {
      // if (parent === document.documentElement) break;

      computed = null;

      if ((parent.scrollHeight > parent.clientHeight &&
        (computed = getComputedStyle(parent)).overflowY !== 'hidden' &&
        computed.overflowY !== 'visible') ||

        (parent.scrollWidth > parent.clientWidth &&
        (computed || (computed = getComputedStyle(parent)))
        .overflowX !== 'hidden' && computed.overflowX !== 'visible') ||

        (computed || (computed = getComputedStyle(parent))).position === 'fixed'
      ) {
        isScrollable = true;
      }

      parents.push(parentData = {
        element: parent,
        computed: computed,
        scrollable: isScrollable
      });

      if (!(parent = parent.parentElement)) {
        isLast = true;
      }

      if (iterate) {
        iterator(parentData, isLast);
      }

      isScrollable = false;
    }

    parentData = parent = computed = null;

    return parents;
  },
  implicitReleaseCapture = function(pointer) { console.log('implicit release', pointer);
    var captured = pointer.captured;

    if (captured) {
      pointer.captureElement.releasePointerCapture(pointer.id);
    }
  },
  setOverflowHiddenY = false && (isChromeAndroid || isAndroidStock) ? function(node) {
    var createShadowRoot = (node.createShadowRoot || node.webkitCreateShadowRoot);

    if (!createShadowRoot) {
      node.style.overflowY = 'hidden';
      return;
    }

    var overflowMarkup = '<div class="yyy" style="width: 100%; overflow: visible; position: relative;height: 100%;">' +
      '<div class="xxx" style="/*height: 293px;*/ overflow: hidden; position: absolute;"><div class="zzz" style="/*height: 283px;*/ overflow: visible;">' +
      '<content></content><div style="float: right; width: 0; height:0"></div></div></div></div>';

    root.innerHTML = overflowMarkup;

    var computed = window.getComputedStyle(node),
      paddingTop = parseFloat(computed.paddingTop),
      paddingBottom = parseFloat(computed.paddingBottom),
      borderTop = parseFloat(computed.borderTop),
      borderBottom = parseFloat(computed.borderBottom),
      clientHeight = node.clientHeight,
      innerHeight = clientHeight - (paddingTop + paddingBottom),
      innerWidth = node.clientWidth -
        (parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight)),
      scrollerHeight = node.offsetHeight -
        clientHeight - (borderTop + borderBottom);

    var xxx = root.querySelector('xxx'),
      zzz = root.querySelector('zzz');

    xxx.style.height = innerHeight + paddingTop + 'px';
    zzz.style.position = 'absolute';
    zzz.style.height = innerHeight + 'px';
    zzz.style.width = innerWidth + 'px';
  } : function(node) {
    node.style.overflowY = 'hidden';
  },
  setOverflowHiddenX = function(node) {
    node.style.overflowX = 'hidden';
  };

  console.log('mayNeedFastClick:', mayNeedFastClick);

  // touch type

  hasTouch && (function() {
    var touchDevice = new pointers.Device('touch'),
      touchNatives = {},
      touchesMap = {},
      touchBindings = {
        move: function(e, type) {
          var targetTouches = e.targetTouches,
            touchCanceled,
            touchDispatched;

          preHandleTouchMove(e, type);

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            // prevent click firing on scroll stop by touch surface
            // .. for iOS
            if (isIOS) {
              fixIOSScroll(touchData);
            }

            if (touchData.ignoreTouch) return;

            var fireTouchEvents = hasTouchListeners && flags.TOUCH_EVENTS,
              touchStartCanceled = touchData.touchStartCanceled;

            if (fireTouchEvents && !touchDispatched) {
              touchDispatched = true;
              touchCanceled = !dispatchTouchEvent('move', touchData.startTarget, e);
            }

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              captured = pointer.captured,
              needHitTest = !captured || pointer.captureTrackBoundaries,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              touchAction = touchData.touchAction,
              // getting new target for event not more than once per 10ms
              getTarget = touchData.getTarget ||
                (touchData.getTarget = debunce(doHitTest, 10, false)),
              target = needHitTest ?
                getTarget(touch) || prevTarget : prevTarget,
              movedOut = touchData.movedOut,
              isFirstMove,
              fireMouseEvents;

            if (touchData.touchMoveCanceled = touchCanceled) {
              touchData.fireMouseEvents = false;
              console.log('prevent mouse events: touchmove');
            }

            fireMouseEvents = touchData.fireMouseEvents;

            if (!touchData.moved) {
              touchData.moved = isFirstMove = true;
            }

            if (needHitTest && target !== prevTarget) {
              handleTouchMove(
                touch,
                touchData,
                pointer,
                isPrimary,
                target,
                prevTarget
              );
            }

            // override potentially hit tested target to capture target, if exist
            captured && (target = pointer.captureElement);

            var moveDict = getMouseDict(touch, {
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: 1,
              relatedTarget: null
            });

            // fire pointer move
            // here is question:
            // always fire one pointermove even is next 'll be pointercancel
            // or do something special
            pointer.dispatchEvent(target, 'move', moveDict);

            if (!isPrimary) return;

            if (touchData.stream.isZoomPrevented) {
              touchData.needFastClick = false;
              return;
            }

            if (fireMouseEvents && !touchDevice.mouseEventsPrevented) {
              dispatchMouseEvent('move', target, moveDict);
            }

            // prevent scroll if touch canceled
            // or if none touchAction for this element
            if (touchCanceled || (!touchAction === touchActionBits['none'] &&
              // for touchStartCanceled this work already did
              movedOut && !touchStartCanceled)
            ) {
              // console.log('cancel fast click by moved out');
              touchData.needFastClick = false;
              // console.log('prevent touchmove by !touchAction');
              e.preventDefault();

              // remove touchmove listeners here
              return;
            }

            // handle not consumed touch behavior
            if (touchAction !== touchActionBits['none'] &&
              !touchStartCanceled && !touchCanceled) {
              // cannot detect opera via isChrome but Ya and Cr is
              var needIgnore = isAndroid &&
                (flags.DETECT_CHROME_BEHAVIOR ? !isChrome : true);

              if (!isAndroid && movedOut) {
                needIgnore = true;
              }

              var startTarget = touchData.startTarget;

              if (touchData.startTargetNodeName === 'input' &&
                  startTarget.type === 'range') {
                needIgnore = false;
              }

              if (needIgnore) {
                touchData.ignoreTouch = true;
                touchData.needFastClick = false;
                console.log('canceled fast click be ignore');

                handleTouchCancel(
                  touch,
                  touchData,
                  pointer,
                  isPrimary,
                  target,
                  prevTarget,
                  e
                );
              }

              if (mayNeedFastClick) {
                unbindScrollFix(touchDevice.prevPrimaryTouch);
                bindScrollFix(touchData);
              }
            }
          };

          if (targetTouches.length) {
            slice.call(targetTouches).forEach(handleTouch);
          } else {
            handleTouch(targetTouches[0]);
          }
        },
        end: function(e, type) {
          var touches = e.changedTouches;

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              captured = pointer.captured,
              needHitTest = !captured || pointer.captureTrackBoundaries,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              target = needHitTest ?
                getTarget && getTarget(touch) || prevTarget : prevTarget;

            if (isPrimary) {
              touchData.timedOut =
                e.timeStamp - touchData.startTime >= TOUCH_CLICK_TIMEOUT;
              touchData.ended = true;
            }

            if (needHitTest && !touchData.ignoreTouch && prevTarget !== target) {
              handleTouchMove(
                touch,
                touchData,
                pointer,
                isPrimary,
                target, 
                prevTarget
              );
            }

            // override potentially hit tested target to capture target, if exist
            captured && (target = pointer.captureElement);

            var touchCanceled = !dispatchTouchEvent('end', touchData.startTarget,
                e, document.createTouchList(touch)),
              fireTouchEvents;

            if (touchData.touchEndCanceled = touchCanceled) {
              touchData.fireMouseEvents = false;
              console.log('prevent mouse events: touchend');
            }

            console.log('ignore end:', touchData.ignoreTouch);

            if (!touchData.ignoreTouch) {
              handleTouchEnd(touch, touchData, pointer,
                isPrimary, target, prevTarget, e);
            }

            cleanUpTouch(touchData);

            if (!e.targetTouches.length) {
              removeTouchBindings(touchData.startTarget, type);
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        },
        cancel: function(e, type) {
          var touches = e.changedTouches;

          var handleTouch = function(touch) {
            var id = touch.identifier,
              touchData = touchesMap[id];

            if (!touchData) return;

            var lastEnterTarget = touchDevice.lastEnterTarget,
              pointer = touchData.pointer,
              captured = pointer.captured,
              isPrimary = pointer.isPrimary,
              prevTarget = touchData.prevTarget,
              getTarget = touchData.getTarget,
              // remove hit test from pointercancel event
              // target = getTarget && getTarget(touch) || touch.target;
              target = captured ? pointer.captureElement :
                prevTarget || touch.target;

            if (isPrimary) {
              touchData.ended = true;
              touchData.canceled = true;
            }

            if (!touchData.ignoreTouch) {
              handleTouchCancel(touch, touchData, pointer,
                isPrimary, target, prevTarget, e);
            }

            cleanUpTouch(touchData);

            if (!e.targetTouches.length) {
              removeTouchBindings(touchData.startTarget, type);
            }
          };

          if (touches.length) {
            slice.call(touches).forEach(handleTouch);
          } else {
            handleTouch(touches[0]);
          }
        }
      },
      touchHelper = {
        stream: null,
        Stream: function() {
          this.touches = [];
        },
        getStream: function() {
          return this.stream;
        },
        useStream: function(touchData) {
          var stream = this.stream ||
            (this.stream = new this.Stream());

          stream.addTouchData(touchData);

          return stream;
        },
        leaveStream: function(touchData) {
          var stream = this.stream;

          if (!stream) {
            throw new Error('Cannot leave touch-stream without stream');
          }

          stream.removeTouchData(touchData);

          if (!stream.isActual) {
            this.stream = stream = null;
          }
        }
      };

    touchHelper.Stream.prototype = {
      state: '',
      addTouchData: function(touchData) {
        var touches = this.touches;

        if (!touches.length) {
          this.isActual = true;
        }

        touches.push(touchData);
      },
      removeTouchData: function(touchData) {
        var touches = this.touches,
          index = touches.indexOf(touchData);

        if (index !== -1) {
          touches.splice(index, 1);

          if (!touches.length) {
            this.isActual = false;
          }
        }
      },
      isActual: null
    };

    var touchActionBits = {
      'none'        : 1 << 0,
      'pan-x'       : 1 << 1,
      'pan-y'       : 1 << 2,
      'manipulation': 1 << 3,
      'auto'        : 1 << 4
    };

    touchActionBits['scroll'] =
      touchActionBits['pan-x'] | touchActionBits['pan-y'];

    var TOUCH_SCROLL_CACHE = 'touch_scroll_cache',
      TOUCH_LISTENERS_CACHE = 'touch_listeners_cache',
      SCROLL_FIX_DELAY = 500,
      TOUCH_CLICK_TIMEOUT = 800,
      ELEMENT_DISABLED_FOR_SCROLL = '_element_disabled_for_scroll_';

    var initTouchStart = function(e, type) {
      var touches = e.changedTouches,
        self = this;

      var handleTouch = function(touch) {
        var id = touch.identifier,
          lastEnterTarget = touchDevice.lastEnterTarget;

        // cannot handle more than one touch with same id
        if (touchesMap[id]) {
          return;
        }

        var target = touch.target,
          startTouch = {},
          pointer = touchDevice.createPointer(),
          // use this for differing event sequence
          nodeTouchListeners = Sync.cache(self)[TOUCH_LISTENERS_CACHE],
          fireTouchEvents = hasTouchListeners && flags.TOUCH_EVENTS,
          touchCanceled = fireTouchEvents &&
            !dispatchTouchEvent('start', target, e, document.createTouchList(touch));

        // firefox properties are from prototype
        // and cannot be moved by Object.keys
        extendDOMObject(startTouch, touch);
        pointer.buttons = 1;

        var overDict = getMouseDict(touch, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 0,
          relatedTarget: null // prev target goes here
        }),
        downDict = getMouseDict(touch, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 1,
          relatedTarget: null
        }),
        isPrimary = pointer.isPrimary,
        needFastClick = isPrimary && mayNeedFastClick,
        needEnter = (!lastEnterTarget || lastEnterTarget !== target),
        computed = isPrimary && getComputedStyle(target),
        fireMouseEvents;

        var touchData = touchesMap[id] = {
          pointer: pointer,
          startTime: e.timeStamp,
          startTouch: startTouch,
          startTarget: target,
          prevTarget: target,
          multitouch: !isPrimary,
          computed: isPrimary && computed,
          touchId: id,
          touchStartCanceled: touchCanceled,
          _fireMouseEvents: !touchCanceled && isPrimary && flags.MOUSE_EVENTS,
          get fireMouseEvents() {
            return hasMouseListeners && this._fireMouseEvents;
          },
          set fireMouseEvents(val) {
            this._fireMouseEvents = val;
          },
          get startTargetNodeName() {
            var nodeName = this._startTargetNodeName;

            if (!nodeName) {
              nodeName = this._startTargetNodeName =
                this.startTarget.nodeName.toLowerCase();
            }

            return nodeName;
          }
        };

        touchData.stream = touchHelper.useStream(touchData);
        fireMouseEvents = touchData.fireMouseEvents;

        /*if (!isPrimary) {
          touchDevice.primary.multitouch = true;
        }*/

        if (touchCanceled) {
          e.preventDefault();
          // if touchstart is canceled:
          // no more touch-action
          // no more click
          // no more scroll
          // no more compatibility mouse events

          console.log('canceled fast click by touchstart cancellation');
          needFastClick = false;
        } else if (isPrimary) {
          updateDevicePrimary(touchData);
        }

        if (!touchCanceled) {
          var touchAction = touchActionBits['auto'],
            mergeIterator = mergeTouchActionIterator(),
            propagateUpToRoot,
            determinedAction,
            scrollables = [];

          var ancestors = findScrollAncestors(target, computed, function(parent, isLast) {
            var element = parent.element;

            if (parent.scrollable) {
              scrollables.push(parent);
            }

            if (!determinedAction) {
              var computed = parent.computed || getComputedStyle(element),
                action = getTouchAction(handleContentTouchAction(computed.content));

              action = mergeIterator(action);

              if (action === touchActionBits['none'] || isLast) {
                determinedAction = true;
              }

              if (!propagateUpToRoot && !determinedAction && parent.scrollable) {
                if (!flags.PINCH_ZOOM_BEHAVIOR_PROPAGATION ||
                  action <= touchActionBits['scroll']) {
                  determinedAction = true;
                } else {
                  propagateUpToRoot = true;
                }
              }

              if (determinedAction) {
                if (!action) {
                  debugger;
                }

                touchAction = action;
              }
            }

            // after first parent touchAction must be determined already
            if (parent.scrollable && determinedAction) {
              parent.scrollLeft = parent.element.scrollLeft;
              parent.scrollTop = parent.element.scrollTop;
            }
          });

          touchData.ancestors = ancestors;
          console.log('touchAction:', touchAction);

          if (touchAction > touchActionBits['none']) {
            scrollables.push({
              isWin: true,
              scrollLeft: window.pageXOffset,
              scrollTop: window.pageYOffset,
              element: window
            });

            touchData.scrollables = scrollables;
          }

          // should touch action be none when touch is canceler
          // or touchAction assignment should be moved out of 'if statement'
          // -> touchData.touchAction = touchAction || touchActionBits['auto'];
          touchData.touchAction = touchAction;
        }

        if (isPrimary && !touchCanceled) {
          var panX = touchAction === touchActionBits['pan-x'],
            panY = touchAction === touchActionBits['pan-y'];

          if (panX || panY) {
            var len = scrollables.length,
              scrollable;

            for (; --len;) {
              scrollable = scrollables[len];

              if (!scrollable.isWin) {
                (panX ? setOverflowHiddenY :
                  setOverflowHiddenX)(scrollable.element);
              }
            }
          }
        }

        if (!flags.IMMEDIATE_POINTER_LEAVE &&
            lastEnterTarget && !lastEnterTarget.contains(target)) {
          // this block should execute if leave event should be fired
          // not from pointerup/pointercancel event, but from pointerdown

          pointer.dispatchEvent(lastEnterTarget, 'leave', getMouseDict(touch, {
            bubbles: false,
            cancelable: false,
            button: 0,
            buttons: 0,
            relatedTarget: target
          }));
        }

        fireMouseEvents && dispatchMouseEvent(
          'move',
          target,
          getMouseDict(touch, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: 0,
            relatedTarget: null
          })
        );

        // pointerover
        pointer.dispatchEvent(target, 'over', overDict);

        // compact mouseover
        fireMouseEvents && dispatchMouseEvent('over', target, overDict);

        if (needEnter) {
          var enterDict = getMouseDict(touch, {
            bubbles: false,
            cancelable: false,
            button: 0,
            buttons: 0,
            relatedTarget: lastEnterTarget
          });

          pointer.dispatchEvent(target, 'enter', enterDict);

          // compact mouseenter
          fireMouseEvents && dispatchMouseEvent('enter', target, enterDict);
          touchDevice.lastEnterTarget = target;
        }

        // pointerdown
        var pointerDownCanceled = !pointer.dispatchEvent(target, 'down', downDict);

        if (pointerDownCanceled) {
          // canceled pointerdown should prevent default actions
          // e.g. selection or focus
          // canceled pointerdown should _not_ prevent click or scroll
          // on e.preventDefault() we can simulate click, but cannot simulate scroll
          // so that method cannot be used, at least right now

          // needFastClick = true;
          // e.preventDefault();
          // logger.log('Prevented pointerdown');

          // prevent compatibility mouse events
          touchDevice.mouseEventsPrevented = true;
        }

        // compact mousedown
        if (fireMouseEvents && !pointerDownCanceled) {
          dispatchMouseEvent('down', target, downDict);
        }

        // this is case from fastclick.js library
        // in iOS only trusted events can deselect range
        // ...
        // in future we can simulate that action and remove this block
        if (!touchCanceled && isIOS) {
          var selection = window.getSelection();

          if (selection.rangeCount && !selection.isCollapsed) {
            needFastClick = false;
            logger.log('needFastClick = false; By range deselect iOS');
            console.log('needFastClick = false; By range deselect iOS');
          }
        }

        touchData.needFastClick = needFastClick;
        addTouchBindings(target, type);
      };

      if (touches.length) {
        slice.call(touches).forEach(handleTouch);
      } else {
        handleTouch(touches[0]);
      }
    },
    addTouchBindings = function(node, event) {
      Sync.each(touchBindings, function(fn, key) {
        var full = TOUCH_PREFIX + key;

        events.addEvent(node, full, {
          handler: function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();

            // console.log('called touch binding:', key);

            fn.call(this, e, event);
          },
          callback: fn,
          capture: /*capture*/ true,
          method: touchNatives[full].addEventListener,
          namespace: NS_TOUCH_POINTER
        });
      });
    },
    removeTouchBindings = function(node, event) {
      Sync.each(touchBindings, function(fn, key) {
        var full = TOUCH_PREFIX + key;

        events.removeEvent(node, full, {
          callback: fn,
          capture: /*capture*/ true,
          method: touchNatives[full].removeEventListener,
          namespace: NS_TOUCH_POINTER
        });
      });
    };

    var dispatchMouseEvent = function(event, target, dict) {
      if (!dict.view) {
        dict.view = target.defaultView;
      }

      if (event === 'over') {
        // debugger;
      }

      return events.dispatchEvent(target, FAKE_PREFIX + MOUSE_PREFIX + event, {
        type: 'MouseEvent',
        options: dict
      });
    },
    dispatchTouchEvent = function(type, target, originalEvent, changedTouches) { return true;
      var newEvent = new UIEvent(FAKE_PREFIX + TOUCH_PREFIX + type, {
        bubbles: originalEvent.bubbles,
        cancelable: originalEvent.cancelable,
        view: originalEvent.view,
        detail: originalEvent.detail
      });

      newEvent.touches = originalEvent.touches;
      newEvent.targetTouches = originalEvent.targetTouches;
      newEvent.changedTouches = changedTouches || originalEvent.changedTouches;

      /*(originalEvent.ctrlKey, originalEvent.altKey,
        originalEvent.shiftKey, originalEvent.metaKey, originalEvent.touches,
        originalEvent.targetTouches, changedTouches || originalEvent.changedTouches,
        originalEvent.scale, originalEvent.rotation);*/

      console.log(newEvent);

      return target.dispatchEvent(newEvent);
    },
    cleanUpTouch = function(touchData) {
      var pointer = touchData.pointer,
        isPrimary = touchData.pointer.isPrimary;

      touchesMap[touchData.touchId] = null;
      touchDevice.lastEnterTarget = null;
      
      if (isPrimary) {
        touchDevice.mouseEventsPrevented = false;
      }

      pointer.destroy();

      if (isPrimary && touchData.clicked) {
        updateDevicePrimary();
      }

      touchHelper.leaveStream(touchData);
      // touchData.stream = null;

      pointer = touchData = null;
    },
    doHitTest = function(touch) {
      // and handle of pointer-events: none;
      var target = document.elementFromPoint(
        touch.clientX, touch.clientY);

      return target;
    },
    mergeTouchActionIterator = function() {
      var result = 0,
        scrollVal = touchActionBits['scroll'],
        isFirst = true,
        ended;

      return function(action) {
        if (ended || !action) return result;

        if (isFirst) {
          result = action;
          isFirst = false;
        } else if (action & scrollVal) {
          if (result & scrollVal) {
            result |= action;
          }

          if (result > scrollVal) {
            result = action;
          }
        } else if (result > action) {
          result = action;
        }

        if (result /* & */ === touchActionBits['none']) {
          ended = true;
        }

        return result;

        /*return {
          value: result,
          ended: ended
        };*/
      };
    },
    mergeTouchActionOld /*= window.mergeTouchAction*/ = function(array) {
      var result = array[0],
        scrollVal = (touchActionBits['pan-x'] | touchActionBits['pan-y']);

      for (var i = 1, len = array.length, action; i < len; i++) {
        action = array[i];

        if (action & scrollVal) {
          if (result & scrollVal) {
            result |= action;
          }

          if (result > scrollVal) {
            result = action;
          }
        } else if (result > action) {
          result = action;
        }

        if (result /* & */ === touchActionBits['none']) {
          break;
        }
      }

      return result;
    },
    mergeTouchAction = function(array) {
      var action = 0,
        iterator = mergeTouchActionIterator();

      for (var i = 0, len = array.length; i < len; i++) {
        action = iterator(array[i]);
      }

      return action;
    },
    handleContentTouchAction = function(content) {
      var action = content.replace(/^('|")([\s\S]*)(\1)$/, '$2').split(/\s*;\s*/).reduce(function(result, rule) {
        if (result) {
          return result;
        }

        rule = rule.split(/\s*:\s*/);

        if (rule[0] === 'touch-action') {
          return rule[1];
        }

        return result;
      }, '');

      return action;
    },
    getTouchAction /*= window.getTouchAction*/ = function(action) {
      var propError;

      action = action.split(/\s+/).reduce(function(res, key) {
        if (propError) return res;

        if (!hasOwn.call(touchActionBits, key)) {
          propError = true;
          return res;
        }

        var bit = touchActionBits[key];

        // console.log('res & bit:', res, bit, res & bit)

        if (res & bit) {
          propError = true;
          return res;
        }

        if (res && (bit & (touchActionBits.none |
          touchActionBits.auto |
          touchActionBits.manipulation))) {
          propError = true;
          return res;
        }

        return res | bit;
      }, 0);

      if (propError) {
        return touchActionBits['auto'];
      }

      return action;
    },
    getMouseDict = function(touch, options, show) {
      options || (options = {});

      [
        'screenX', 'screenY',
        'clientX', 'clientY',
        'pageX', 'pageY',
        'ctrlKey', 'altKey',
        'shiftKey', 'metaKey'
      ].forEach(function(prop) {
        var z = touch[prop];

        if (z === 'pageX') {
          z += pageXOffset;
        }

        if (z === 'pageY') {
          z += pageYOffset;
        }

        options[prop] = z;

        if (show) {
          // console.log(prop + ':', z);
        }
      });

      return options;
    },
    checkForMovedOut = function(touchData, touch, isFirstMove) {
      var startTouch = touchData.startTouch,
        slopSize = flags.TOUCHMOVE_SLOP_SIZE,
        movedOut = touchData.movedOut;

      if (movedOut) {
        return movedOut;
      }

      var dirX = startTouch.clientX - touch.clientX,
        dirY = startTouch.clientY - touch.clientY,
        absX = abs(dirX),
        absY = abs(dirY);

      if (!movedOut && ((isAndroid && isFirstMove) ||
          absX >= slopSize || absY >= slopSize)
      ) {
        movedOut = touchData.movedOut = true;
        touchData.needFastClick = false;
        touchData.panAxis = absX > absY ? 'x' : 'y';
        touchData.panDir = (absX > absY ? dirX : dirY) > 0 ? 1 : -1;

        console.log('canceld fast click by check for move');
        logger.log('Pointer moved out of slop');
      }

      return movedOut;
    },
    preHandleTouchMove = function(e, type) {
      var isFirstMove,
        eTouches = e.touches,
        touches = [],
        touchActions = [],
        touchAction,
        movedOutData;

      var i = 0,
        len = eTouches.length,
        touch,
        touchData;

      for (; i < len; i++) {
        touch = eTouches[i];
        touchData = touchesMap[touch.identifier];
        
        if (touchData) {
          touches.push(touchData);
          touchActions.push(touchData.touchAction);

          if (checkForMovedOut(touchData, touch, !touchData.moved)) {
            movedOutData = touchData;
          }

          if (isFirstMove !== false) {
            isFirstMove = !touchData.moved;
          }
        }
      }

      // stream must always be when where is touches
      // especially on first touch move
      var stream = touchHelper.getStream();

      if (isFirstMove) {
        touchAction = mergeTouchAction(touchActions);
        console.log('touchActions:', touchActions, 'touchAction:', touchAction);

        var isZoom = stream.isZoom = (touches.length > 1 && viewport.scaleAllowed);

        if (isZoom) {
          stream.isGeastureDetermined = true;
        }

        if (isZoom && touchAction < touchActionBits['manipulation']) {
          stream.isZoomPrevented = true;
          e.preventDefault();
        }
      }

      if (!stream.isZoom && movedOutData) {

      }
    },
    handleTouchMove = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var fireMouseEvents = touchData.fireMouseEvents,
        captured = pointer.captured,
        needOver = !captured ||
          target === pointer.captureElement,
        needOut = !captured ||
          prevTarget === pointer.captureElement;

      touchData.prevTarget = target;

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : target // prev target goes here
      }),
      overDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : prevTarget // prev target goes here
      }),
      enterDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 1,
        relatedTarget: captured ? null : prevTarget // prev target goes here
      });

      if (needOut) {
        pointer.dispatchEvent(prevTarget, 'out', outDict);
        fireMouseEvents && dispatchMouseEvent('out', prevTarget, outDict);
      }

      if (needOut && !prevTarget.contains(target)) {
        var leaveDict = getMouseDict(touch, {
          bubbles: false,
          cancelable: false,
          button: 0,
          buttons: 1,
          relatedTarget: captured ? null : target // prev target goes here
        });

        pointer.dispatchEvent(prevTarget, 'leave', leaveDict);
        fireMouseEvents && dispatchMouseEvent('leave', prevTarget, leaveDict);
      }

      if (needOver) {
        pointer.dispatchEvent(target, 'over', overDict);
        fireMouseEvents && dispatchMouseEvent('over', target, overDict);

        pointer.dispatchEvent(target, 'enter', enterDict);
        fireMouseEvents && dispatchMouseEvent('enter', target, enterDict);
      }
    },
    handleTouchCancel = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      dispatchTouchEvent('cancel', touchData.startTarget,
        e, document.createTouchList(touch));

      var cancelDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      upDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'cancel', cancelDict);
      fireMouseEvents && dispatchMouseEvent('up', window, upDict)

      pointer.dispatchEvent(target, 'out', outDict);
      fireMouseEvents && dispatchMouseEvent('out', target, outDict);

      // this pointer call is under question
      
      if (flags.IMMEDIATE_POINTER_LEAVE) {
        pointer.dispatchEvent(target, 'leave', leaveDict);
      }

      fireMouseEvents && dispatchMouseEvent('leave', target, leaveDict);

      implicitReleaseCapture(pointer);
    },
    handlePreEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      var upDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'up', upDict);
      fireMouseEvents && dispatchMouseEvent('up', target, upDict);
    },
    handlePastEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      var fireMouseEvents = touchData.fireMouseEvents;

      var outDict = getMouseDict(touch, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        relatedTarget: null
      }),
      leaveDict = getMouseDict(touch, {
        bubbles: false,
        cancelable: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });

      pointer.dispatchEvent(target, 'out', outDict);
      fireMouseEvents && dispatchMouseEvent('out', target, outDict);

      // this pointer call is under question
      // because of specification undefined position of that
      if (flags.IMMEDIATE_POINTER_LEAVE) {
        pointer.dispatchEvent(target, 'leave', leaveDict);
      }

      fireMouseEvents && dispatchMouseEvent('leave', target, leaveDict);

      implicitReleaseCapture(pointer);
    },
    handleTouchEnd = function(touch, touchData, pointer, isPrimary, target, prevTarget, e) {
      console.log('touchEnd:', target, prevTarget);

      // there is possible case then click is fired before touchend
      // in that situations for best synced events sequence probably need to defer click
      // (i.e. prevent real and sent synthetic in touchend) or
      // handle touchend in click event
      if (touchData.clicked) return;

      var movedOut = touchData.moved ? touchData.movedOut :
        checkForMovedOut(touchData, touch),
        // get needFastClick after
        // possibly call of checkForMovedOut
        needFastClick = touchData.needFastClick,
        timedOut = touchData.timedOut;

      // 'intent to click' should be determined on touchend base on current flags
      // if timed-out no intent to click, try to prevent real click and do not fire fast-click
      // if ignoreTouch then no intent to click
      // if current target !== start target also not intent to click
      // keep 'clicked' as separate flag e.g. intentToClick && !clicked
      // also cancelation of touch events going to prevent click
      // but 100% only consumed touchstart prevent click
      // therefore need to check for canceled only touchend
      // because touchmove is tracked by 'ignoreTouch' flag

      var intentToClick = !touchData.touchEndCanceled &&
        // need to properly deliver multitouch property
        (!e.touches.length && !touchData.multitouch) &&
        !touchData.isContextmenuShown && !timedOut && !touchData.ignoreTouch &&
        target === touchData.startTarget && !touchData.movedOut;

      console.log(
        !touchData.touchEndCanceled,
        !touchData.multitouch,
        !touchData.isContextmenuShown,
        !timedOut,
        !touchData.ignoreTouch,
        target === touchData.startTarget,
        !touchData.movedOut
      );

      touchData.intentToClick = intentToClick;

      var isNeedFastClick = intentToClick && !touchData.clicked &&
        needFastClick && !noElementFastClick(target);

      // intentToClick && isNeedFastClick does not match all cases
      // so there exists real clicks, not prevented and not emulated via fast-click
      // therefore prevent touchend only then intentToClick || isNeedFastClick

      handlePreEnd(touch, touchData, pointer,
        isPrimary, target, prevTarget, e);

      if (isNeedFastClick) {
        // try to prevent trusted click via canceling touchend
        // this does not work in Android Stock < 4.4

        console.log('prevent touchend by isNeedFastClick');
        e.preventDefault();

        handleFastClick(touch, touchData, pointer,
          isPrimary, target, prevTarget);

        handlePastEnd(touch, touchData, pointer,
          isPrimary, target, prevTarget, e);
      } else if (intentToClick) {
        touchData.needPastClick = true;
      } else {
        console.log('prevent touchend by !intentToClick');
        e.preventDefault();
        handlePastEnd(touch, touchData, pointer,
          isPrimary, target, prevTarget, e);
      }

      if (isNeedFastClick || !intentToClick) {
        console.log('unified cancelation goes here');
      }

      console.log('touches:', e.changedTouches.length, e.targetTouches.length, e.touches.length,
        'isNeedFastClick:', isNeedFastClick, 'intentToClick:', intentToClick,
        'multitouch:', touchData.multitouch);
    },
    handleFastClick = function(touch, touchData, pointer, isPrimary, target, prevTarget) {
      var computed = touchData.computed;

      var clickEventDict = getMouseDict(touch, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 1,
          relatedTarget: null,
          view: window,
          detail: 1
        }),
        clickEvent = new MouseEvent('click', clickEventDict),
        activeElement = document.activeElement;

      if (isChromeAndroid && activeElement !== target &&
        isFocusable(activeElement)
      ) {
        console.log('call blur');
        activeElement.blur();
      }

      if (isChromeAndroid/* || isBB10*/ /* && target.nodeName.toLowerCase() === 'select'*/) {
        var mouseDown = new MouseEvent('mousedown', clickEventDict);

        mouseDown.isFastClick = true;
        target.dispatchEvent(mouseDown);
      }

      if (/*target !== activeElement &&*/ needFocus(target)) {
        // also can tweak with placeCaret chrome android with scaled viewport
        if (!isIOS || !placeCaret(target, computed, clickEvent.clientX, clickEvent.clientY)) {
          target.focus();
        }
      }

      if (isChromeAndroid/* || isBB10*/ /* && target.nodeName.toLowerCase() === 'select'*/) {
        var mouseUp = new MouseEvent('mouseup', clickEventDict);

        mouseUp.isFastClick = true;
        target.dispatchEvent(mouseUp);
      }

      clickEvent.isFastClick = true;
      target.dispatchEvent(clickEvent);

      touchData.fastClicked = true;
      // console.log('click dispatched');
    },
    // need fix iOS from touchData.scrollClickFixed to
    // stream.scrollClickFixed
    fixIOSScroll = function(touchData) {
      var scrolledParent,
        movedOut = touchData.movedOut;

      if (!movedOut || touchData.scrollClickFixed) return;

      if (touchData.scrollables.some(function(parent) {
        var element = parent.element;

        if (parent.isWin) {
          var scrollLeft = window.pageXOffset,
            scrollTop = window.pageYOffset;
        } else {
          scrollLeft = element.scrollLeft;
          scrollTop = element.scrollTop;
        }

        if (parent.scrollLeft !== scrollLeft ||
            parent.scrollTop !== scrollTop) {
          scrolledParent = parent;
          return true;
        }
      })) {
        touchData.scrollClickFixed = true;

        var scrolledForStyle = scrolledParent.isWin ?
          document.documentElement : scrolledParent.element,
          scrolledForEvent = scrolledParent.element,
          prevCSSPointerEvents = scrolledForStyle.style.pointerEvents;

        if (scrolledParent.isWin) {
          Sync.cache(scrolledForStyle, ELEMENT_DISABLED_FOR_SCROLL, 1);
        }

        scrolledForStyle.style.pointerEvents = 'none !important';

        scrolledForEvent.addEventListener('scroll', function scrollHandler() {
          scrolledForEvent.removeEventListener('scroll', scrollHandler);
          scrolledForStyle.style.pointerEvents = prevCSSPointerEvents;

          if (scrolledParent.isWin) {
            Sync.cache(scrolledForStyle, ELEMENT_DISABLED_FOR_SCROLL, 0);
          }
        });

        // prevent pointer events until scrolled
      }
    },
    bindScrollFix = function(touchData) {
      var stream = touchData && touchData.stream,
        scrollables;

      if (isIOS || !stream || stream.scrollClickFixed) return;

      scrollables = touchData.scrollables;
      stream.scrollClickFixed = true;

      scrollables.forEach(function(parent) {
        var element = parent.element,
          scrollCache = Sync.cache(element, TOUCH_SCROLL_CACHE),
          scrollTimer,
          firstScroll = true,
          scrollStyleElem,
          prevCSSPointerEvents;

        if (scrollCache.scrollHandler) return;

        var scrollHandler = function() {
          if (firstScroll) {
            firstScroll = false;

            console.log('bind scroll', element);

            if (parent.isWin) {
              scrollStyleElem = document.documentElement;
              Sync.cache(scrollStyleElem, ELEMENT_DISABLED_FOR_SCROLL, 1);
            } else {
              scrollStyleElem = parent.element;
            }

            prevCSSPointerEvents = scrollStyleElem.style.pointerEvents;

            if (prevCSSPointerEvents === 'none') {
              console.log('wtf 123');
              debugger;
            }

            scrollStyleElem.style.pointerEvents = 'none';
            scrollCache.styleElem = scrollStyleElem;
            scrollCache.prevCSSPointerEvents = prevCSSPointerEvents;
            // console.log('bind:');
          }

          if (scrollTimer) clearTimeout(scrollTimer);

          scrollTimer = setTimeout(function() {
            scrollTimer = null;
            
            if (!stream.isActual) {
              unbindScrollFix(touchData);
            } else {
              scrollHandler();
            }
          }, SCROLL_FIX_DELAY);
        };

        scrollCache.scrollHandler = scrollHandler;
        element.addEventListener('scroll', scrollHandler);
      });
    },
    unbindScrollFix = function(touchData) {
      var stream = touchData && touchData.stream,
        scrollables;

      if (isIOS || !stream || !stream.scrollClickFixed) return;
      console.log('unbind scroll:', stream);

      scrollables = touchData.scrollables;
      stream.scrollClickFixed = false;

      scrollables.forEach(function(parent) {
        var element = parent.element,
          scrollCache = Sync.cache(element, TOUCH_SCROLL_CACHE);

        if (scrollCache.styleElem) {
          scrollCache.styleElem.style.pointerEvents = scrollCache.prevCSSPointerEvents;
          // console.log('set prev events:', scrollCache.styleElem.style.pointerEvents);

          if (parent.isWin) {
            Sync.cache(scrollCache.styleElem, ELEMENT_DISABLED_FOR_SCROLL, 0);
          }

          scrollCache.styleElem = null;
          scrollCache.prevCSSPointerEvents = '';
        }

        if (scrollCache.scrollHandler) {
          element.removeEventListener('scroll', scrollCache.scrollHandler);
          scrollCache.scrollHandler = null;
        }
      });
    },
    noElementFastClick = function(target) {
      var nodeName = target.nodeName.toLowerCase();

      if (isBB10 && nodeName === 'input' && target.type === 'file') {
        return true;
      }

      if (isAndroidStock) {
        if (nodeName === 'input' && target.type === 'range') {
          return true;
        }
      }

      if (isChromeAndroid) {
        if (nodeName === 'textarea') return true;
        if (nodeName === 'input') {
          switch (target.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'tel':
            case 'url':
            case 'search':
              return true;
          }
        }
      }
    },
    needFocus = function(target) {
      var disabled = target.disabled || target.readOnly;

      switch (target.nodeName.toLowerCase()) {
        case 'textarea':
          return isIOS; // !disabled && (!isAndroidFx && !isChromeAndroid && !isBB10);
        case 'select':
          return !disabled && isAndroidFx || isIOS;
        case 'input': {
          if (disabled) return false;

          switch (target.type) {
            case 'button':
            case 'checkbox':
            case 'file':
            case 'image':
            case 'radio':
            case 'submit': {
              return isAndroidFx;
            }

            case 'range': {
              return !isChromeAndroid && !isBB10;
            }
          }

          return !isAndroidStock && !isAndroidFx;
        }
      }
    },
    isFocusable = function(target) {
      var disabled = target.disabled || target.readOnly;

      if (disabled) return false;

      switch (target.nodeName.toLowerCase()) {
        case 'textarea':
        case 'select':
        case 'button':
          return true;
        case 'input': {
          return target.type !== 'hidden';
        }
      }

      if (target.tabIndex >= 0) return true;

      return target.contentEditable === 'true';
    },
    placeCaret = function(target, computed, x, y) {
      var nodeName = target.nodeName.toLowerCase();

      if (!document.caretRangeFromPoint ||
         nodeName !== 'textarea' && nodeName !== 'input') return;

      pickInput: if (nodeName === 'input') {
        switch (target.type) {
          case 'text':
          case 'email':
          case 'number':
          case 'tel':
          case 'url':
          case 'search':
            break pickInput;
        }

        return;
      }

      var mirror = document.createElement('div'),
        mirrorStyle = mirror.style,
        rect = target.getBoundingClientRect();

      mirrorStyle.cssText = computed.cssText;

      mirrorStyle.margin = 0;
      mirrorStyle.position = 'absolute';
      mirrorStyle.opacity = 0;
      mirrorStyle.zIndex = 999999;
      mirrorStyle.left = rect.left + pageXOffset + 'px';
      mirrorStyle.top = rect.top + pageYOffset + 'px';

      mirror.textContent = target.value;

      document.body.append(mirror);

      var range = document.caretRangeFromPoint(x, y);
      
      target.setSelectionRange(range.startOffset, range.endOffset);
      mirror.remove();

      mirror = mirrorStyle = range = null;
      return true;
    },
    updateDevicePrimary = function(touchData) {
      if (touchDevice.currentPrimaryTouch) {
        touchDevice.prevPrimaryTouch = touchDevice.currentPrimaryTouch;
      }
      
      touchDevice.currentPrimaryTouch = touchData || null;;
    },
    BBContextMenuFix = function(e) {
      var touches = e.changedTouches;

      console.log('FIRED ONCE!!!');

      var handleTouch = function(touch) {
        var id = touch.identifier,
          outdatedTouch = touchesMap[id];

        if (!outdatedTouch) return;

        outdatedTouch.revoked = true;

        console.log('revoke outdated touch');

        handleTouchCancel(touch, outdatedTouch, outdatedTouch.pointer,
          outdatedTouch.pointer.isPrimary, outdatedTouch.startTarget,
          outdatedTouch.prevTarget, {
            bubbles: true,
            cancelable: false,
            detail: 0,
            view: e.view,
            targetTouches: document.createTouchList(),
            toucehs: document.createTouchList()
          });

        cleanUpTouch(outdatedTouch);
      };

      if (touches.length) {
        slice.call(touches).forEach(handleTouch);
      } else {
        handleTouch(touches[0]);
      }

      events.removeEvent(document, e.type, {
        callback: BBContextMenuFix,
        capture: true,
        method: touchNatives[e.type].removeEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

    events.syncEvent('click', function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          triggerDeviceListeners(this, type,/* capture,*/ 'touch');

          events.addEvent(this, type, {
            handler: function(e) {
              var touchData = touchDevice.currentPrimaryTouch,
                sameTouch = touchData &&
                  (e.timeStamp - touchData.startTime) < TOUCH_CLICK_TIMEOUT;

              if (!e.isFastClick && touchData) {
                if (sameTouch && !touchData.ended) {
                  touchData.clicked = true;
                } else {
                  updateDevicePrimary();
                }
              }

              if (sameTouch && touchData.ended &&
                (!touchData.intentToClick || touchData.fastClicked)) {
                console.log('prevent click by not need click');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
              } else {
                if (sameTouch && !touchData.ended) {
                  handlePreEnd(e, touchData, touchData.pointer,
                    touchData.isPrimary, e.target, touchData.prevTarget, e);

                  console.log('pre end in click');
                }

                callback.call(this, e);

                if (sameTouch && (!touchData.ended || touchData.needPastClick)) {
                  console.log('past end in click, ended:', touchData.ended);
                  handlePastEnd(e, touchData, touchData.pointer,
                    touchData.isPrimary, e.target, touchData.prevTarget, e);
                }
              }
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          muteDeviceListeners(this, type/*, capture*/, 'touch');

          events.removeEvent(this, type, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      };
    });

    events.syncEvent('contextmenu', function(synced) {
      return {
        addEventListener: function(type, callback, capture) {
          events.addEvent(this, type, {
            handler: function(e) {
              var touchData = touchDevice.currentPrimaryTouch;

              console.log('touch contextmenu');

              if (!touchData) return;

              /*if (touchData) {
                console.log(
                  touchData,
                  type === 'contextmenu',
                  e.timeStamp - touchData.startTime >= 450,
                  !touchData.ended,
                  !touchData.clicked
                );
              }*/

              if (e.timeStamp - touchData.startTime >= 450 &&
                !touchData.ended && !touchData.clicked) {
                var isTouchEvent = true;
              }

              e.isTouchEvent = true;
              touchData.isContextmenuShown = true;

              if (isBB10) {
                var touchStart = TOUCH_PREFIX + 'start';

                events.addEvent(document, touchStart, {
                  handler: BBContextMenuFix,
                  capture: true,
                  method: touchNatives[touchStart].addEventListener,
                  namespace: NS_TOUCH_POINTER
                });
              }

              callback.call(this, e);
            },
            callback: callback,
            capture: capture,
            method: synced.addEventListener
          });
        },
        removeEventListener: function(type, callback, capture) {
          events.removeEvent(this, type, {
            callback: callback,
            capture: capture,
            method: synced.removeEventListener
          });
        }
      };
    });

    touchDevice.capturePointer = function() {};
    touchDevice.releasePointer = function() {};

    touchDevice.bindListener = function(node, event) {
      var full = TOUCH_PREFIX + 'start';

      events.addEvent(node, full, {
        handler: function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();

          initTouchStart.call(this, e, event);
        },
        callback: initTouchStart,
        capture: /*capture*/ true,
        method: touchNatives[full].addEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

    touchDevice.unbindListener = function(node, event) {
      var full = TOUCH_PREFIX + 'start';

      events.removeEvent(node, full, {
        callback: initTouchStart,
        capture: /*capture*/ true,
        method: touchNatives[full].removeEventListener,
        namespace: NS_TOUCH_POINTER
      });
    };

    [
      'start',
      'end',
      'move',
      'enter',
      'leave',
      'cancel'
    ].forEach(function(event) {
      var full = TOUCH_PREFIX + event;

      events.syncEvent(full, function(synced) {
        touchNatives[full] = synced;

        return {
          addEventListener: function(type, callback, capture) {
            triggerDeviceListeners(this, event, 'touch');

            !hasTouchListeners && (hasTouchListeners = true);

            events.handleOnce(this, TOUCH_LISTENERS_CACHE, function() {
              Sync.cache(this, TOUCH_LISTENERS_CACHE, 1);
            });

            events.addEvent(this, FAKE_PREFIX + full, {
              handler: function(e) {
                e = shadowEventType(e, type);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture,
              method: synced.addEventListener
            });
          },
          removeEventListener: function(type, callback, capture) {
            muteDeviceListeners(this, event, 'touch');

            events.handleIfLast(this, TOUCH_LISTENERS_CACHE, function() {
              Sync.cache(this, TOUCH_LISTENERS_CACHE, 0);
            });

            events.addEvent(this, FAKE_PREFIX + full, {
              callback: callback,
              capture: capture,
              method: synced.removeEventListener
            });
          }
        };
      });
    });
  }());

  // mouse type
  (function() {
    var mouseDevice = new pointers.Device('mouse'),
      mousePointer = mouseDevice.createPointer(),
      mouseNatives = {},
      mouseBindings = {
        down: function(e, type, event, captured) {
          var pointerFire = !mousePointer.buttons;

          // pointer cannot be captured before pointer down
          // so no capture here

          if ('buttons' in e) {
            mousePointer.buttons = e.buttons;
          } else {
            // hook MouseEvent buttons to pointer buttons here
            mousePointer.buttons += pow(2, e.button);
          }

          if (pointerFire) {
            // fire pointer down here
            
            var canceled = !mousePointer.dispatchEvent(
              e.target, type, e, {
                bubbles: true,
                cancelable: true
              });

            if (canceled) {
              mouseDevice.mouseEventsPrevented = true;
              e.preventDefault();
              return;
            }
          }

          var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
            type: 'MouseEvent',
            options: e
          });

          if (canceled) {
            e.preventDefault();
          }
        },
        up: function(e, type, event, captured) {
          if (!mousePointer.buttons) return;

          if ('buttons' in e) {
            mousePointer.buttons = e.buttons;
          } else {
            // hook MouseEvent buttons to pointer buttons here
            // console.log(mousePointer.buttons, Math.pow(2, e.button))
            mousePointer.buttons -= Math.pow(2, e.button);
          }

          var target = captured ? mousePointer.captureElement : e.target;

          if (!mousePointer.buttons) {
            // fire pointer up here
            var canceled = !mousePointer.dispatchEvent(target, type, e, {
              bubbles: true,
              cancelable: true
            });
          }

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
              type: 'MouseEvent',
              options: e
            });
          }

          if (canceled) {
            e.preventDefault();
          }

          implicitReleaseCapture(mousePointer);
          mouseDevice.mouseEventsPrevented = false;
        },
        cancel: function(e, type, event, captured) {
          var target = captured ? mousePointer.captureElement : e.target;

          mousePointer.dispatchEvent(target, type, e, {
            bubbles: true,
            cancelable: false
          });

          implicitReleaseCapture(mousePointer);
          mousePointer.buttons = 0;
          mouseDevice.mouseEventsPrevented = false;

          console.log('handle mouse contextmenu');
        },
        move: function(e, type, event, captured) {
          var target = captured ? mousePointer.captureElement : e.target,
            canceled = !mousePointer.dispatchEvent(target, type, e, {
              bubbles: true,
              cancelable: true
            });

          if (!mouseDevice.mouseEventsPrevented) {
            var canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
              type: 'MouseEvent',
              options: e
            });
          }

          if (canceled) {
            e.preventDefault();
          }
        }
      };

    ['over', 'out', 'enter', 'leave'].forEach(function(type) {
      mouseBindings[type] = function(e, type, event, captured) {
        // is over or out event
        var option = type === 'over' || type === 'out';

        var target = captured ? mousePointer.captureElement : e.target;

        // ### override relatedTarget here
        if (captured) {
          events.shadowEventProp(e, 'relatedTarget', null);
        }

        var canceled = !mousePointer.dispatchEvent(target, type, e, {
          bubbles: option,
          cancelable: option
        });

        canceled = !events.dispatchEvent(target, FAKE_PREFIX + event, {
          type: 'MouseEvent',
          options: e
        }) && canceled;

        if (canceled) {
          e.preventDefault();
        }
      }
    });

    mouseDevice.capturePointer = function(element, pointer) {
      [
        'down', 'up', 'move', 'cancel', 'over', 'out'
      ].forEach(function(event) {
        triggerDeviceListeners(document, event, 'mouse');
      });

      triggerDeviceListeners(element, 'enter', 'mouse');
      triggerDeviceListeners(element, 'leave', 'mouse');
    };

    mouseDevice.releasePointer = function(element, pointer) {
      [
        'down', 'up', 'move', 'cancel', 'over', 'out'
      ].forEach(function(event) {
        muteDeviceListeners(document, event, 'mouse');
      });

      muteDeviceListeners(element, 'enter', 'mouse');
      muteDeviceListeners(element, 'leave', 'mouse');
    };

    mouseDevice.bindListener = function(node, event/*, capture*/) {
      if (hasTouch && (isIOS ||
        (isAndroid && !flags.HANDLE_MOUSE_EVENTS_ANDROID))) return;

      var type = MOUSE_PREFIX + event,
        callback = mouseBindings[event];

      if (event === 'cancel') {
        type = 'contextmenu';
      }

      events.addEvent(node, type, {
        handler: function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (event === 'cancel') {
            console.log('contextmenu from mouse');
          }

          var isCompatibility = checkForCompatibility(this, e, event, type),
            captured = mousePointer.captured,
            captureElement = mousePointer.captureElement;

          if (captured && ((event === 'enter' || event === 'leave' ||
              event === 'out' || event === 'over') && e.target !== captureElement)) {
            return;
          }

          if (event === 'cancel') {
            var contextMenuShown =
              handleContextMenu.call(this, e, event, type, captured);
          }

          if (!isCompatibility && !e.isFastClick &&
            !e.isTouchEvent && !contextMenuShown) {
            callback.call(this,
              e, event, type, captured, isCompatibility);
          }
        },
        callback: callback,
        capture: /*capture*/ true,
        method: mouseNatives[type].addEventListener,
        namespace: NS_MOUSE_POINTER
      });
    };

    mouseDevice.unbindListener = function(node, event/*, capture*/) {
      if (isIOS && hasTouch) return;

      var type = MOUSE_PREFIX + event,
        callback = mouseBindings[event];

      if (event === 'cancel') {
        type = 'contextmenu';
      }

      events.removeEvent(node, type, {
        callback: callback,
        capture: /*capture*/ true,
        method: mouseNatives[type].removeEventListener,
        namespace: NS_MOUSE_POINTER
      });
    };

    var checkForCompatibility = function(node, e, event, type) {
      if (!(touchDevice = pointers.getDevice('touch'))) return;

      var touchData = touchDevice.currentPrimaryTouch,
        prevTouchData = touchDevice.prevPrimaryTouch,
        touchDevice;

      // console.log(e, 'compatibility check');
      if (touchData && touchData.moved && isAndroid) return;

      // console.log('prev:', e.target, prevTouchData && prevTouchData.startTouch.target);

      if ((event === 'out' || event === 'leave') && (prevTouchData &&
        prevTouchData.startTouch.target === e.target)) {
        return true;
      }

      if (touchData) {
        var touch = touchData.startTouch,
          xMin = touch.clientX - 10,
          xMax = touch.clientX + 10,
          yMin = touch.clientY - 10,
          yMax = touch.clientY + 10;

        // console.log('checked:', [e.clientX, e.clientY], [touch.clientX, touch.clientY],
        //   (xMin < e.clientX && xMax > e.clientX &&
        //   yMin < e.clientY && yMax > e.clientY));

        if (touch.target === e.target &&
          xMin < e.clientX && xMax > e.clientX &&
          yMin < e.clientY && yMax > e.clientY) {
          return true;
        }
      }
    },
    handleContextMenu = function(e, event, type, captured) {
      var canceled = !events.dispatchEvent(e.target, FAKE_PREFIX + event, {
        type: 'MouseEvent',
        options: e
      });

      if (canceled) {
        e.preventDefault();
      }

      return !canceled;
    };

    var syncMouseEvents = function(deviceNatives, full, event) {
      events.syncEvent(full, function(synced) {
        deviceNatives[full] = synced;

        return {
          addEventListener: function(type, callback, capture) {
            if (event) {
              triggerDeviceListeners(this, event, 'mouse');

              if (hasTouch) {
                triggerDeviceListeners(this, event, 'touch');
              }
            }

            !hasMouseListeners && (hasMouseListeners = true);

            // console.log('sync add:', FAKE_PREFIX + full);

            events.addEvent(this, FAKE_PREFIX + full, {
              handler: function(e) {
                e = shadowEventType(e, type);
                callback.call(this, e);
              },
              callback: callback,
              capture: capture
            });
          },
          removeEventListener: function(type, callback, capture) {
            if (event) {
              muteDeviceListeners(this, event, 'mouse');

              if (hasTouch) {
                muteDeviceListeners(this, event, 'touch');
              }
            }

            events.addEvent(this, FAKE_PREFIX + full, {
              callback: callback,
              capture: capture
            });
          }
        }
      });
    };

    syncMouseEvents(mouseNatives, 'contextmenu', 'cancel');

    // create fake mouse event
    [
      'down',
      'up',
      'move',
      'over',
      'out',
      'enter',
      'leave'
    ].forEach(function(event) {
      var full = MOUSE_PREFIX + event;

      syncMouseEvents(mouseNatives, full, event);
    });
  }());
}(Sync));;(function(window, document, Sync, undefined) {
  "use strict";

  var xhr = new XMLHttpRequest(),
    globalXhr = xhr,
    hasResponseType = 'responseType' in xhr,
    hasResponse = 'response' in xhr,
    hasError,
    hasAbort,
    hasLoad,
    hasTimeout,
    hasLoadEnd,
    hasLoadStart,
    hasWraps,
    getDescNude = Object.getOwnPropertyDescriptor,
    getDesc = function(object, key) {
      try {
        return getDescNude(object, key);
      } catch (e) {};
    },
    define = Object.defineProperty,
    originalDesc = getDesc(window, 'XMLHttpRequest'),
    OriginalXHR = originalDesc.value,
    hasOwn = Object.prototype.hasOwnProperty,
    fixes = [],
    wraps = {},
    sendFixes = [],
    responseTypes = {
      text: function(text) {
        return text;
      },
      json: function(text) {
        return text ? JSON.parse(text) : null;
      },
      document: function() {
        // add document support via DOMParser/implementation.createDocument
        // mb for IE with htmlfile/iframe
      },
      arraybuffer: null,
      blob: null
    },
    needGlobalWrap,
    canDefineAccessors,
    customErrorCodesMap = {
      12002: {
        code: 504,
        text: 'Gateway Timeout'
      },
      120029: {
        code: 500,
        text: 'Internal Server Error'
      },
      120030: {
        code: 500,
        text: 'Internal Server Error'
      },
      120031: {
        code: 500,
        text: 'Internal Server Error'
      },
      12152: {
        code: 502,
        text: 'Bad Gateway'
      },
      1223: {
        code: 204,
        text: 'No Content'
      }
    };

  var fixResponse = function(type, text, xhr) {
    if (text && hasOwn.call(responseTypes, type) &&
        (type = responseTypes[type])) {
      return type(text, xhr);
    }

    return text;
  },
  getAcessorsDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !desc.set && !desc.get) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !desc.set && !desc.get) {
      return null;
    }

    return desc;
  },
  getValueDesc = function(xhr, prop) {
    var desc = getDesc(OriginalXHR.prototype, prop);

    if (!desc || !('value' in desc)) {
      desc = getDesc(xhr, prop);
    }

    if (!desc || !('value' in desc)) {
      return null;
    }

    return desc;
  },
  makeWrap = function(prop, handler) {
    hasWraps = true;

    wraps[prop] = {
      handler: handler
    };
  },
  addEvent = function(event, callback) {
    makeWrap('on' + event, function(_super) {
      var handler = null;

      typeof callback === 'function' && callback(_super);

      return {
        get: function() {
          return handler;
        },
        set: function(val) {
          if (handler) {
            this.removeEventListener(event, handler, false);
          }

          this.addEventListener(event, handler = val, false);
        }
      }
    });
  };

  // old Opera needs to open XHR before tweak him
  // need to do it only by demand
  // xhr.open('GET', '/', true);

  (function() {
    var a = {};

    try {
      define(a, 'test', {
        get: function() {
          return 123;
        }
      });

      if (a.test === 123) {
        canDefineAccessors = true;
        return
      }
    } catch (e) {};
  }());

  if (!hasResponse) {
    makeWrap('response', function(_super) {
      return {
        get: function() {
          try {
            var type = this.responseType,
              text = this.responseText;
          } catch(e) {
            debugger;
          }

          return fixResponse(type, text, this);
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  }

  if (!hasResponseType) {
    makeWrap('responseType', function(_super) {
      var type = '';

      return {
        set: function(val) {
          if (hasOwn.call(responseTypes, val) && responseTypes[val]) {
            type = val;
          }
        },
        get: function() {
          return type;
        }/*,
        enumerable: true,
        configurable: true*/
      };
    });
  } else {
    var unsupportResponseType,
      opened = false;

    try {
      xhr.responseType = 'text';
    } catch (e) {
      xhr.open('GET', '/', true);
      opened = true;
    }

    ['json', 'document', 'arraybuffer', 'blob'].some(function(type) {
      try {
        xhr.responseType = type;
      } catch (e) {
        unsupportResponseType = true;
        // needGlobalWrap = true;
        return true;
      }

      if (xhr.responseType !== type) {
        unsupportResponseType = true;
        return true;
      }
    });

    if (unsupportResponseType) {
      var resTypeDesc = getAcessorsDesc(xhr, 'responseType');

      if (!resTypeDesc) {
        needGlobalWrap = true;
      }

      console.log('ggggg');

      makeWrap('responseType', function(_super) {
        var value = _super.get();

        return {
          get: function() {
            return value;
          },
          set: function(val) {
            if (!hasOwn.call(responseTypes, val)) return;

            _super.set(value = val);

            if (_super.get() !== val) {
              // path response property here
              
              if (responseTypes[val]) {
                this.type2fix = val;
                _super.set('text');
              }
            }
          }
        }
      });

      if (hasResponse) {
        makeWrap('response', function(_super) {
          return {
            get: function() {
              var type2fix = this.type2fix,
                response = _super.get();

              return fixResponse(type2fix, response, this);
            }
          }
        });
      }
    }
  }

  try {
    hasError = 'onerror' in xhr;
  } catch (e) {};

  try {
    hasAbort = 'onabort' in xhr;
  } catch (e) {};

  hasLoad = 'onload' in xhr;
  hasTimeout = 'ontimeout' in xhr;
  hasLoadEnd = 'onloadend' in xhr;
  hasLoadStart = 'onloadstart' in xhr;

  var needStatusWrap;

  // firefox before 16 fix
  try {
    getDescNude(OriginalXHR.prototype, 'status');
  } catch (e) {
    needGlobalWrap = true;
  }

  try {
    xhr.status;
    xhr.statusText;
  } catch (e) {
    needStatusWrap = true;
  }

  needStatusWrap && (function() {
    makeWrap('status', function(_super) {
      define(_super.self, '_realStatus', _super);

      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return 0;
          }

          var status = _super.get()

          if (status === 13030 || !status) {
            return 0;
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].code;
          }

          return status;
        }
      }
    });

    makeWrap('statusText', function(_super) {
      return {
        get: function() {
          var self = _super.self;

          if (self.readyState === self.UNSENT) {
            return '';
          }

          var status = self._realStatus;

          if (status === 13030 || !status) {
            return '';
          }

          if (hasOwn.call(customErrorCodesMap, status)) {
            return customErrorCodesMap[status].text;
          }

          return _super.get();;
        }
      }
    });
  }());

  if (!hasAbort) {
    addEvent('abort')
    
    makeWrap('abort', function(_super) {
      var realAbort = _super.get();

      return {
        value: function() {
          this._aborted = true;
          realAbort.call(this);
          var e = new CustomEvent('abort');
          this.dispatchEvent(e);
        }
      };
    });
  }

  if (!('timeout' in xhr) || !hasTimeout) (function() {
    var timer,
      abotedByTimeout,
      sent;

    var tryTimeout = function(self) {
      var timeout = self.timeout;

      if (timeout) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function() {
          timer = null;

          if (self.readyState >= self.DONE) return;

          abotedByTimeout = true;
          self.abort();

          var e = new CustomEvent('timeout');
          self.dispatchEvent(e);
        }, timeout);
      }
    };

    sendFixes.push(function(xhr) {
      tryTimeout(xhr);
      sent = true;
    });

    makeWrap('timeout', function(_super) {
      var timeout = 0,
        self = _super.self;

      var abortHandler = function(e) {
        if (abotedByTimeout) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
        }

        setTimeout(cleanUp, 1);
      },
      stateHandler = function() {
        if (self.readyState >= self.DONE) {
          clearTimeout(timer);
          timer = null;
          setTimeout(cleanUp, 1);
        }
      },
      cleanUp = function() {
        self.removeEventListener('timeout', cleanUp, true);
        self.removeEventListener('abort', abortHandler, true);
        self.removeEventListener('readystatechange', stateHandler, true);
      };

      self.addEventListener('timeout', cleanUp, true);
      self.addEventListener('abort', abortHandler, true);
      self.addEventListener('readystatechange', stateHandler, true);

      return {
        get: function() {
          return timeout;
        },
        set: function(val) {
          if (this.readyState >= this.DONE) return;

          timeout = val;

          if (sent) {
            tryTimeout(this);
          }
        }
      };
    });

    addEvent('timeout');
  }());

  if (!hasLoad || !hasLoadEnd || !hasLoadStart || !hasError) (function() {
    fixes.push(function(xhr) {
      var ended;

      var handleEnd = function(e) {
        if (ended) return;

        ended = true;

        if (!hasLoadEnd) {
          var e = new CustomEvent('loadend');
          xhr.dispatchEvent(e);
        }

        xhr.removeEventListener('readystatechange', stateHandler, true);
        xhr.removeEventListener('load', handleEnd, true);
        xhr.removeEventListener('abort', handleEnd, true);
        xhr.removeEventListener('error', handleEnd, true);
        xhr.removeEventListener('timeout', handleEnd, true);
      },
      stateHandler = function() {
        if (xhr.readyState < xhr.DONE || ended) return;
        if (!hasAbort && xhr._aborted) return;

        console.log('readyState: ', xhr.readyState);

        var status = xhr.status;

        if (xhr.getAllResponseHeaders() && status &&
          !isNaN(status) && xhr.statusText && xhr.statusText !== 'Unknown') {
          
          if (!hasLoad) {
            var e = new CustomEvent('load');
            xhr.dispatchEvent(e);
          }

          handleEnd();
          return;
        }

        var fireError = function() {
          var e = new CustomEvent('error');
          xhr.dispatchEvent(e);
          handleEnd();
        };

        if (!hasError) {
          fireError();
        } else {
          setTimeout(function() {
            if (!ended) {
              fireError();
            }
          }, 1);
        }
      };

      
      if (!hasLoad || !hasError) {
        xhr.addEventListener('readystatechange', stateHandler, true);
      }

      if (hasLoad) {
        xhr.addEventListener('load', handleEnd, true);
      }

      xhr.addEventListener('abort', handleEnd, true);
      xhr.addEventListener('error', handleEnd, true);
      xhr.addEventListener('timeout', handleEnd, true);
    });

    !hasLoadStart && sendFixes.push(function(xhr) {
      var e = new CustomEvent('loadstart');
      xhr.dispatchEvent(e);
    });

    !hasLoad && addEvent('load');
    !hasError && addEvent('error');
    !hasLoadEnd && addEvent('loadend');
    !hasLoadStart && addEvent('loadstart');
  }());

  if (sendFixes.length) {
    makeWrap('send', function(_super) {
      var realSend = _super.get(),
        send = function(data) {
          sendFixes.forEach(function(fix) {
            fix(this);
          }, this);

          return realSend.call(this, data);
        };

      return {
        get: function() {
          return send;
        }
      };
    });
  }

  if (!('addEventListener' in xhr)) (function() {
    needGlobalWrap = true;

    var supportedEvents = {
        error: hasError,
        abort: hasAbort,
        timeout: hasTimeout,
        load: hasLoad
      },
      realAccessors = {};

    // need events prefix because IE buggy with readystatechange
    // at DOM nodes
    var EVENT_PREFIX = 'xhr.';

    var addSupported = function(event, xhr) {
      var desc = getAcessorsDesc(xhr, 'on' + event);

      if (desc) {
        realAccessors[event] = desc;
        addEvent(event);
        return;
      }
    },
    getXHRET = function(xhr) {
      var et = this._eventTarget;

      if (!et) {
        et = this._eventTarget = document.createElement('xhr');
        try {
          document.documentElement.appendChild(et);
          document.documentElement.removeChild(et);
        } catch (e) {};
      }

      return et;
    },
    getEventsMap = function(xhrCache, event, capture) {
      var eventsMap = xhrCache['events_map'];

      eventsMap || (eventsMap = xhrCache['eventsMap'] = {});
      eventsMap = eventsMap[event] || (eventsMap[event] = {});
      eventsMap = eventsMap[capture] || (eventsMap[capture] = {
        index: [],
        store: []
      });

      return eventsMap;
    };

    define(XMLHttpRequest.prototype, 'dispatchEvent', {
      value: function(e) {
        var et = getXHRET(this),
          type = e.type;
        
        try {
          e.type = EVENT_PREFIX + e.type;
        } catch (e) {};

        if (e.type !== EVENT_PREFIX + type) {
          e = new CustomEvent(EVENT_PREFIX + type);
        }

        return et.dispatchEvent(e);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'addEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          bindedAccessors = cached['binded_accessors'],
          eventsMap = getEventsMap(cached, event, capture);

        if (eventsMap.index.indexOf(handler) !== -1) return;

        if (!bindedAccessors) {
          bindedAccessors = cached['binded_accessors'] = {};
        }

        if (hasOwn.call(realAccessors, event) &&
          !hasOwn.call(bindedAccessors, event)) {
          bindedAccessors[event] = true;
          realAccessors[event].set.call(this, function() {
            var e = new CustomEvent(EVENT_PREFIX + event);
            xhrET.dispatchEvent(e);
          });
        }

        eventsMap.index.push(handler);
        eventsMap.store.push(handler = handler.bind(this));

        xhrET.addEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    define(XMLHttpRequest.prototype, 'removeEventListener', {
      value: function(event, handler, capture) {
        var xhrET = getXHRET(this),
          cached = Sync.cache(this, 'xhr_events_fix'),
          eventsMap = getEventsMap(cached, event, capture),
          indexed;

        if ((indexed = eventsMap.index.indexOf(handler)) === -1) return;

        handler = eventsMap.store[indexed];
        eventsMap.index.splice(indexed, 1);
        eventsMap.store.splice(indexed, 1);

        xhrET.removeEventListener(EVENT_PREFIX + event, handler, capture);
      },
      writable: false,
      configurable: true,
      enumerable: false
    });

    // readystatechange should be handled first
    // because IE buggy otherwise
    var events = ['readystatechange'].concat(Object.keys(supportedEvents));
    supportedEvents.readystatechange = true;

    events.forEach(function(event) {
      if (supportedEvents[event]) {
        addSupported(event, xhr);
      }
    });
  }());

  [
    'UNSENT',
    'OPENED',
    'HEADERS_RECEIVED',
    'LOADING',
    'DONE'
  ].forEach(function(key, index) {
    if (!(key in xhr)) {
      define(XMLHttpRequest.prototype, key, {
        value: index,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  });

  if (needGlobalWrap && canDefineAccessors) {
    var XHRWrap = function() {
      var self = this,
        original = this._original = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key];

        define(self, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            var val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            return original[key] = val;
          },
          self: original
        })));
      });

      fixes.forEach(function(fix) {
        fix(self);
      });
    };

    (function() {
      var handler = function(key) {
        if (key in proto || hasOwn.call(wraps, key) || !(key in this)) return;

        /*try {
          var desc = getDesc(this, key);
        } catch (e) {*/
          var desc = {
            enumerable: false,
            configurable: true
          };
        // };

        define(proto, key, {
          get: function() {
            var original = this._original,
              val = original[key];

            if (typeof val === 'function') {
              return val.bind(original);
            }

            return val;
          },
          set: function(val) {
            this._original[key] = val;
          },
          enumerable: desc.enumerable,
          configurable: desc.configurable
        });
      };

      define(window, 'XMLHttpRequest', {
        value: XHRWrap,
        writable: originalDesc.writable,
        enumerable: originalDesc.enumerable,
        configurable: originalDesc.configurable
      });

      var proto = XMLHttpRequest.prototype,
        originalProto = OriginalXHR.prototype;

      Object.keys(originalProto).forEach(handler, originalProto);
      Object.keys(xhr).forEach(handler, xhr);

      ["statusText", "status", "response", "responseType",
       "responseXML", "responseText", "upload", "withCredentials",
       "readyState", "onreadystatechange", "onprogress", "onloadstart",
       "onloadend", "onload", "onerror", "onabort",
       "addEventListener", "removeEventListener", "dispatchEvent"].forEach(handler, xhr);
    }());
  } else if (fixes.length || hasWraps) {
    var XHRWrap = function() {
      var xhr = new OriginalXHR();

      Object.keys(wraps).forEach(function(key) {
        var wrap = wraps[key],
          desc = getAcessorsDesc(xhr, key),
          value;

        if (!desc) {
          desc = getValueDesc(xhr, key);

          if (!desc || typeof desc.value === 'function' ||
              typeof desc.value === 'undefined') {
            define(xhr, key, Sync.extend({
              enumerable: false,
              configurable: true
            }, wrap.handler({
              get: function() {
                return desc ? desc.value : void 0;
              },
              set: function(val) {},
              self: xhr
            })));

            return;
          } else {
            desc = null;
          }
        }

        desc && define(xhr, key, Sync.extend({
          enumerable: false,
          configurable: true
        }, wrap.handler({
          get: function() {
            return desc.get.call(xhr);
          },
          set: function(val) {
            desc.set.call(xhr, val);
          },
          self: xhr
        })));
      });

      fixes.forEach(function(fix) {
        fix(xhr);
      });

      return xhr;
    };

    define(window, 'XMLHttpRequest', {
      value: XHRWrap,
      writable: originalDesc.writable,
      enumerable: originalDesc.enumerable,
      configurable: originalDesc.configurable
    });
  } else {
    var XHRWrap = null;
  }

  // in IE we cannot redefine XHR via defineProperty
  // but can do it with regular assignment
  if (XHRWrap && XMLHttpRequest === OriginalXHR) {
    try {
      XMLHttpRequest = XHRWrap;
    } catch (e) {
      window.XMLHttpRequest = XHRWrap;
    }
  }

  xhr = globalXhr = null;
}(this, document, Sync));;(function(window) {
  'use strict';

  var vendors = 'webkit|moz|ms|o'.split('|'),
    events = {
      transition: 'transitionend'
    },
    eventsMap = {
      'webkit': ['webkitTransitionEnd'],
      'moz': ['transitionend'],
      'o': ['OTransitionEnd', 'otransitionend'],
      '': ['transitionend']
    },
    eventName,
    transitionProperty = 'Transition',
    transitionVendor = '',
    transformProperty = 'Transform',
    perspectiveProperty = 'Perspective',
    backfaceProperty = 'BackfaceVisibility',
    backfaceKey = 'backfaceVisibility',
    perspectiveOrigin,
    transformOrigin,
    transformStyle,
    style = document.createElement('div').style,
    arrayJoin = Array.prototype.join;

  var R_VENDORS = /(webkit|moz|ms|o)-/i,
    R_CSS_FN = /^\s*([\w\-]+?)\(([\s\S]*?)\)\s*?$/;

  var camelToCss = function(str, w) {
    return '-' + w.toLowerCase();
  },
  hasOwn = Object.prototype.hasOwnProperty,
  isArray = Array.isArray,
  slice = Array.prototype.slice,
  getTime = window.performance ? (function() {
    var now = performance.now || performance.webkitNow || performance.msNow;

    if (!now) {
      return Date.now;
    }

    return function() {
      return now.call(performance);
    };
  }()) : Date.now;

  // match vendor section
  {
    if (transitionProperty.toLowerCase() in style) {
      transitionProperty = transitionProperty.toLowerCase();
    } else if (!vendors.some(function(vendor) {
      if (vendor + transitionProperty in style) {
        transitionProperty = vendor + transitionProperty;
        transitionVendor = vendor.toLowerCase();
        return true;
      }

      return false;
    })) {
      transitionProperty = null;
    } else if (transitionVendor in eventsMap) {
      eventName = eventsMap[transitionVendor];
    }

    if (!eventName) {
      eventName = eventsMap[''];
    }

    if (transformProperty.toLowerCase() in style) {
      transformProperty = transformProperty.toLowerCase();
      transformOrigin = transformProperty + 'Origin';
      transformStyle = transformProperty + 'Style';
    } else if (!vendors.some(function(vendor) {
      if (vendor + transformProperty in style) {
        transformProperty = vendor + transformProperty;
        transformOrigin = transformProperty + 'Origin';
        transformStyle = transformProperty + 'Style';
        return true;
      }

      return false;
    })) {
      transformProperty = null;
    }

    if (perspectiveProperty.toLowerCase() in style) {
      perspectiveProperty = perspectiveProperty.toLowerCase();
      perspectiveOrigin = perspectiveProperty + 'Origin';
    } else if (!vendors.some(function(vendor) {
      if (vendor + perspectiveProperty in style) {
        perspectiveProperty = vendor + perspectiveProperty;
        perspectiveOrigin = perspectiveProperty + 'Origin';
        return true;
      }

      return false;
    })) {
      perspectiveProperty = null;
    }

    if (backfaceKey in style) {
      backfaceProperty = backfaceKey;
    } else if (!vendors.some(function(vendor) {
      if (vendor + backfaceProperty in style) {
        backfaceProperty = vendor + backfaceProperty;
        return true;
      }

      return false;
    })) {
      backfaceProperty = null;
    }
  }

  var TRANSFORM_MAP = {
      translate: 'px',
      translatex: 'px',
      translatey: 'px',
      scale: '',
      scalex: '',
      sclaey: '',
      rotate: 'deg',
      skew: 'deg',
      skewx: 'deg',
      skewy: 'deg',
      matrix: ''
    },
    TRANSFORM_3D_MAP = {
      translatez: 'px',
      rotatex: 'deg',
      rotatey: 'deg',
      rotatez: 'deg',
      scalez: '',
      translate3d: 'px',
      scale3d: '',
      rotate3d: 'deg'
    },
    R_CAMEL_TO_CSS = /([A-Z])(?=[a-z])/g,
    DEFAULT_TRANSITION_DURATION = 300,
    DEFAULT_TRANSITION_FUNCTION = 'ease',
    DEFAULT_TRANSITION_DELAY = 0,
    STYLE_MAP = {
      transition: transitionProperty,
      transitionTimingFunction: transitionProperty + 'TimingFunction',
      transform: transformProperty,
      transformOrigin: transformOrigin,
      transformOriginX: transformOrigin + 'X',
      transformOriginY: transformOrigin + 'Y',
      transformOriginZ: transformOrigin + 'Z',
      transformStyle: transformStyle
    },
    REQUEST_ANIMATION_FRAME = 'RequestAnimationFrame',
    CANCEL_REQUEST_ANIMATION_FRAME = 'CancelAnimationFrame',
    TRANSITION_DATA_KEY = 'transition_data',
    TRANSFORM_CACHE_KEY = 'sync_transform_cache';

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ['webkit', 'moz', 'o']
      .map(function(vendor) {
        return window[vendor + REQUEST_ANIMATION_FRAME]
      }).filter(function(a) {
        return !!a;
      })[0] || function(fn, element) {
        return setTimeout(function() {
          document.body && document.body.offsetHeight;
          fn.call(element, getTime());
        }, 15);
      };

    window.cancelAnimationFrame = ['webkit', 'moz', 'o']
      .map(function(vendor) {
        return window[vendor + CANCEL_REQUEST_ANIMATION_FRAME]
      }).filter(function(a) {
        return !!a;
      })[0] || function(id) {
        clearTimeout(id);
      };
  }

  var Animation = function(params) {
    var self = this;

    params || (params = {});
    this.events = {};

    ['frame', 'end', 'play', 'pause'].forEach(function(event) {
      self.events[event] = typeof params[event] === 'function' ?
        params[event] : function() {};
    });

    if (params.duration) {
      this.duration = params.duration;
    }

    if (params.autoplay) {
      this.play();
    }
  };

  Animation.stack = [];
  Animation.frameHandler = function(time) {
    var stack = Animation.stack;

    stack.forEach(function(animation) {
      animation.frame(time);
    });

    if (stack.length) {
      Animation.request = requestAnimationFrame(Animation.frameHandler);
    }
  };

  Animation.prototype = {
    play: function(duration) {
      if (this.plaing) return false;

      var now = getTime();

      if (this.stopped) {
        if (duration != null && isFinite(duration)) {
          this.duration = duration;
        }

        this.lastTime = this.startTime = now;
        this.stopped = false;
        this.plaing = true;
      } else {
        //resume code
        this.startTime = (this.lastTime = now) -
          (this.pauseTime - (this.lastTime = this.startTime));
        this.plaing = true;
        this.pauseTime = null;
      }

      if (Animation.stack.push(this) === 1) {
        Animation.request = requestAnimationFrame(Animation.frameHandler);
      }
    },
    pause: function() {
      if (!this.plaing || this.stopped) return false;

      this.plaing = false;
      this.pauseTime = getTime();

      this.eject() || this.stop();
    },
    frame: function(time) {
      if (this.stopped || !this.plaing) return;

      var progress = (time - this.startTime) / this.duration;

      progress = progress > 1 ? 1 : progress;

      this.lastTime = time;
      this.events.frame(progress);

      if (progress >= 1) {
        this.end();
      }
    },
    end: function(){
      this.eject();
      this.stop();
      this.events.end();
    },
    stop: function() {
      this.stopped = true;
      this.plaing = false;
      this.lastTime =
        this.progress =
        this.startTime = 
        this.pauseTime = null;
      // do reset on stop
    },
    eject: function() {
      var stack = Animation.stack,
        index = stack.indexOf(this);

      if (index !== -1) {
        index = stack.splice(index, 1)[0];
      }

      if (!stack.length) {
        cancelAnimationFrame(Animation.request);
      }

      return index === this;
    },
    stopped: true,
    autoplay: false,
    plaing: false,
    duration: 0
  };

  // Transitions section
  var Transition = function(params) {
    if (params) {
      this.params = params;

      Sync.each(params, function(val, key) {
        if (typeof val === 'number') {
          params[key] = [val];
        }

        if (!isArray(val)) {
          params[key] = [];
        }
      });
    } else {
      this.params = params = {};
    }

    /*this.stack = params.map(function(param) {
      if (typeof param === 'string') {
        param = [param];
      }

      if (!Array.isArray(param)) return '';

      var key = param[0];

      if (STYLE_MAP.hasOwnProperty(key)) {
        key = STYLE_MAP[key];
      }

      key = key.replace(R_CAMEL_TO_CSS, camelToCss);

      if (!key.search(R_VENDORS)) {
        key = '-' + key;
      }

      param[0] = key;

      return param.join(' ');
    });*/
  };

  Transition.stop = function(element, jumpToEnd) {
    Transition.clean(element);

    element.style[transitionProperty] = 'null';
    element.style[transitionProperty] = '';

    if (jumpToEnd) return;
  };

  Transition.clean = function(element, listeners) {
    if (!listeners) {
      listeners = Sync.cache(element, TRANSITION_DATA_KEY).listeners || [];
    }

    eventName.forEach(function(event) {
      listeners.forEach(function(listener) {
        element.removeEventListener(event, listener, true);
      })
    });
  };

  Transition.run = function(elem, props, globalCallback) {
    var style = elem.style,
      keys = Object.keys(props),
      count = keys.length,
      cssProps = {},
      data = Sync.cache(elem, TRANSITION_DATA_KEY),
      listeners = data.listeners || (data.listeners = []),
      hasAnimation = data.hasAnimation,
      transition = new Transition(),
      params = transition.params;

    if (hasAnimation) {
      Transition.clean(elem, listeners);
      Transition.stop(elem);
    }

    Sync.each(props, function(val, key) {
      if (typeof val === 'number') {
        val = [val];
      }

      if (!isArray(val) || !val.length) return;

      var len = val.length,
        domKey = key,
        cssKey,
        callback = typeof (len > 1 && val[len - 1]) === 'function',
        handle = function(trans, next, index) {
          var value = trans.shift(),
            transLength = trans.length,
            transCallback = typeof trans[transLength - 1] === 'function';

          if (transCallback) {
            transCallback = trans.pop();
          }

          params[domKey] = trans;

          if (index) {
            style.transition = transition;
          }

          if (key === 'transform' && value &&
            typeof value === 'object' && !(value instanceof Transform)
          ) {
            value = new Transform(elem, value);
          }

          if (value != null) {
            style[domKey] = value;
          }

          // key
          // trans [value, duration, timing-function, delay, callback];

          // style[domKey] = props[key];

          if (transitionProperty) {
            var transitionListener = function(e) {
              if (e.eventPhase !== e.AT_TARGET) return;

              var property = e.propertyName;

              if (property !== cssKey) {
                return;
              }

              var index = listeners.indexOf(transitionListener);

              if (index !== -1) {
                listeners.splice(index, 1);
              }

              eventName.forEach(function(event) {
                elem.removeEventListener(event, transitionListener, true);
              });

              if (transCallback) {
                transCallback();
              }

              if (next) {
                next();
              }
            };

            listeners.push(transitionListener);

            eventName.forEach(function(event) {
              elem.addEventListener(event, transitionListener, true);
            });
          } else {
            if (transCallback) {
              transCallback();
            }

            if (next) {
              next();
            }
          }
        },
        end = function() {
          if (callback) {
            callback();
          }

          delete cssProps[cssKey];

          if (!--count) {
            data.hasAnimation = false;
            Transition.clean(elem, listeners);
            globalCallback && globalCallback();
            style[transitionProperty] = '';
          }
        };

      {
        if (STYLE_MAP.hasOwnProperty(key)) {
          domKey = STYLE_MAP[key];
        }

        cssKey = domKey.replace(R_CAMEL_TO_CSS, camelToCss);

        if (!cssKey.search(R_VENDORS)) {
          cssKey = '-' + cssKey;
        }

        cssProps[cssKey] = 1;
      }

      if (callback) {
        callback = val.pop();
      }

      if (!isArray(val[0])) {
        handle(val, end, 0);
        return;
      }

      val.reduceRight(function(next, trans, index) {
        return function() {
          handle(trans, next, index);
        };
      }, end)();
    });

    // console.log(transition + '');

    data.hasAnimation = true;
    style.transition = transition;
  };

  Transition.prototype = {
    toString: function() {
      var params = this.params;

      return Object.keys(params).map(function(key) {
        var param = params[key],
          duration = param[0],
          fn = param[1],
          delay = param[2];

        if (STYLE_MAP.hasOwnProperty(key)) {
          key = STYLE_MAP[key];
        }

        key = key.replace(R_CAMEL_TO_CSS, camelToCss);

        if (!key.search(R_VENDORS)) {
          key = '-' + key;
        }

        return [
          key,
          duration ? duration + 'ms' : '',
          fn || '',
          delay ? delay + 'ms' : ''
        ].join(' ');
      }).join(', ');
    }
  };

  // Transform section
  if (transformProperty) {
    var Transform = function(element, map) {
      var stack = [],
        store,
        self;

      var applyMap = function() {
        Sync.each(map, function(val, key) {
          if (hasOwn.call(Transform, key)) {
            val = isArray(val) ? val : [val];

            self[key].apply(self, val);
          }
        });
      };

      if (element && element.nodeType === Node.ELEMENT_NODE) {
        // need to real parse values
        // stack = this.stack = element.style.transform

        var hasTrasform = Sync.cache(element)[TRANSFORM_CACHE_KEY];

        if (hasTrasform) {
          self = hasTrasform;
          applyMap();
          return hasTrasform;
        } else if (!(this instanceof Transform)) {
          self = Object.create(Transform.prototype);
        } else {
          self = this;
        }

        self.element = element;

        element.style.transform.split(/\s+/).forEach(function(str) {
          var match = R_CSS_FN.exec(str);

          if (match) {
            var key = match[1],
              val = match[2].split(/\s*,\s*/);

            self[key].apply(self, val);
          }
        });
      } else {
        // stack = this.stack = [];
        map = element;
        element = null;

        if (!(this instanceof Transform)) {
          self = Object.create(Transform.prototype);
        } else {
          self = this;
        }
      }

      store = self.store = {};
      self.stack = stack;

      applyMap();

      if (element) {
        Sync.cache(element)[TRANSFORM_CACHE_KEY] = self;
      }

      return self;
    };

    var transforms2d = [{
      key: 'translate',
      len: 2,
      primitives: ['translateX', 'translateY']
    }, {
      key: 'translateX',
      len: 1
    }, {
      key: 'translateY',
      len: 1
    }, {
      key: 'rotate',
      len: 1
    }, {
      key: 'scale',
      len: 2,
      primitives: ['scaleX', 'scaleY']
    }, {
      key: 'scaleX',
      len: 1
    }, {
      key: 'scaleY',
      len: 1
    }, {
      key: 'skew',
      len: 2,
      // primitives: ['skewX', 'skewY']
    }, {
      key: 'skewX',
      len: 1
    }, {
      key: 'skewY',
      len: 1
    }, {
      key: 'matrix',
      len: perspectiveProperty ? 9 : 6
    }];

    if (perspectiveProperty) {
      Sync.extend(TRANSFORM_MAP, TRANSFORM_3D_MAP);

      transforms2d.push({
        key: 'translateZ',
        len: 1
      }, {
        key: 'scaleZ',
        len: 1
      }, {
        key: 'rotateX',
        len: 1
      }, {
        key: 'rotateY',
        len: 1
      }, {
        key: 'rotateZ',
        len: 1
      }, {
        key: 'rotate3d',
        len: 3,
        // primitives: ['rotateX', 'rotateY', 'rotateZ']
      }, {
        key: 'scale3d',
        len: 3,
        primitives: ['scaleX', 'scaleY', 'scaleZ']
      }, {
        key: 'translate3d',
        len: 3,
        primitives: ['translateX', 'translateY', 'translateZ']
      });
    }

    var transforms2dMap = {};

    // 2d transforms

    transforms2d.forEach(function(prop) {
      var key = prop.key,
        len = prop.len,
        primitives = prop.primitives,
        hasPrimitives = Array.isArray(primitives);

      transforms2dMap[key] = prop;

      var transform = function() {
        var args = slice.call(arguments, 0, len).map(function(arg) {
          return arg !== void 0 ?
            (isFinite(arg) ?
              (parseFloat(arg) + TRANSFORM_MAP[key.toLowerCase()]) : arg) : 0;
        }),
        self = this instanceof Transform ? this : null;

        if (hasPrimitives) {
          return args.reduce(function(result, arg, i) {
            var key = primitives[i];

            if (!key) return result;

            var full = key + '(' + arg + ')';
            self && self.addProperty(key, full, [arg]);

            return result += (' ' + full);
          }, '');
        }

        var full = key + '(' + args.join(',') + ')';
        self && self.addProperty(key, full, args);

        return full;
      };

      Transform[key] = function() {
        return transform.apply(null, arguments);
      };

      Transform.prototype[key] = function() {
        transform.apply(this, arguments);

        return this;
      };
    });

    Transform.prototype.getValue = function(key, index) {
      return parseFloat(this.store[key].val[index | 0]);
    };

    Transform.getMatrix = function(element) {
      var R_MATRIX_FN = /matrix(?:3d)?\(([\s\S]+?)\)/gi;

      var transformMatrix = window.getComputedStyle(element).transform,
        is3D = transformMatrix.indexOf('matrix3d') === 0,
        matrixArgs = R_MATRIX_FN.exec(transformMatrix)[1]
          .split(', ').map(function(val) { return +val });

      return {
        matrix: matrixArgs,
        is3D: is3D
      };
    };

    Transform.fromMatrix = function(element) {
      var data = Transform.getMatrix(element),
        matrix;

      if (data.is3D) {
        matrix = decomposeMatrix(data.matrix);

        return new Transform({
          rotate3d: matrix.rotate.map(function(axis) {
            return rad2deg(axis);
          }),
          translate3d: matrix.translate,
          scale3d: matrix.scale,
          skew: matrix.skew.slice(0, 2).map(function(axis) {
            return rad2deg(axis);
          })
        });
      }

      matrix = decomposeMatrix2d(data.matrix);

      var transform = matrix.reduce(function(result, transform) {
        result[transform[0]] = transform[1];
        return result;
      }, {});

      return new Transform(transform);
    };

    Transform.prototype.addProperty = function(key, full, val) {
      var store = this.store,
        stored = typeof store[key] !== 'undefined';

      if (stored) {
        stored = store[key];

        stored.val = val;
        this.stack[stored.index] = full;
      } else {
        var index = this.stack.push(full) - 1;

        store[key] = {
          index: index,
          val: val
        };
      }
    };

    Transform.prototype.toString = function() {
      return this.stack.join(' ');
    };

    Transform.prototype.apply = function(element) {
      if (!(element = element || this.element)) return;

      this.element = element;
      element.style[transformProperty] = this;
      Sync.cache(element)[TRANSFORM_CACHE_KEY] = this;

      return this;
    };
  }

  Sync.effects = {
    Transform: Transform,
    Transition: Transition,
    Animation: Animation,
    transformProperty: transformProperty,
    transitionProperty: transitionProperty,
    perspectiveProperty: perspectiveProperty,
    backfaceProperty: backfaceProperty,
    translate: Transform ? function(element, x, y) {
      element.style.transform = Transform.translate(x, y);
    } : function(element, x, y) {
      var style = element.style;

      style.marginTop = y + 'px';
      style.marginLeft = x + 'px';
    },
    getTime: getTime
  };

  Sync.each(STYLE_MAP, function(used, normal) {
    if (used === normal) return;

    var usedDict = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, used) ||
      Object.getOwnPropertyDescriptor(style, used);

    Object.defineProperty(CSSStyleDeclaration.prototype, normal, {
      get: function() {
        return this[used];
      },
      set: function(val) {
        this[used] = val;
      },
      configurable: usedDict ? usedDict.configurable : true
    });
  });

  style = null;

  // self, but from third-party example

  var rad2deg = function(rad) {
    return rad * (180 / Math.PI);
  },
  m2tom3 = function(matrix) {
    var newMatrix = [
      matrix[0], matrix[1], 0, matrix[2],
      matrix[3], matrix[4], 0, matrix[5],
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    return newMatrix;
  };


  // modified algorithm from
  // http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
  var decomposeMatrix2d = function(matrix) {
    var a = matrix[0];
    var b = matrix[1];
    var c = matrix[2];
    var d = matrix[3];
    var e = matrix[4];
    var f = matrix[5];

    console.log(matrix);

    var determinant = a * d - b * c;

    if (determinant === 0) {
      console.log('return zz');
      return;
    }

    var translate = [e, f];

    var applyTransform = function(arr, transform, type) {
      if (/*type === 'rotate' && */!transform ||
          type === 'translate' && transform[0] === 0 && transform[1] === 0 ||
          type === 'scale' && transform[0] === 1 && transform[1] === 1 ||
          type === 'skew' && transform[0] === 0 && transform[1] === 0) {
        return;
      }

      arr.push([type, transform]);
    };

    var QRLike = function() {
      var rotate,
        skew,
        scale,
        transforms = [];

      if (a !== 0 || b !== 0) {
        var r = Math.sqrt(a * a + b * b);

        rotate = rad2deg(b > 0 ? Math.acos(a / r) : -Math.acos(a / r));
        scale = [r, determinant / r];
        skew = [rad2deg(Math.atan((a * c + b * d) / (r * r))), 0];
      } else if (c !== 0 || d !== 0) {
        var s = Math.sqrt(c * c + d * d);

        rotate = rad2deg(Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s)));
        scale = [determinant / s, s];
        skew = [0, rad2deg(Math.atan((a * c + b * d) / (s * s)))];
      } else { // a = b = c = d = 0
        scale = [0, 0];
      }

      applyTransform(transforms, rotate, 'rotate');
      applyTransform(transforms, scale, 'scale');
      applyTransform(transforms, skew, 'skew');

      return transforms;
    };

    var LULike = function() {
      var transforms = [];

      if (a !== 0) {
        applyTransform(transforms, rad2deg(Math.atan(b / a)), 'skewY');
        applyTransform(transforms, [a, determinant / a], 'scale');
        applyTransform(transforms, rad2deg(Math.atan(c / a)), 'skewX');
      } else if (b != 0) {
        applyTransform(transforms, rad2deg(Math.PI / 2), 'rotate');
        applyTransform(transforms, [b, determinant / b], 'scale');
        applyTransform(transforms, rad2deg(Math.atan(d / b)), 'skewX');
      } else { // a = b = 0
        return QRLike();
      }

      return transforms;
    };

    var lu = LULike(),
      qr = QRLike(),
      use = lu.length < qr.length ? lu : qr;
      // use = lu;

    applyTransform(use, translate, 'translate');

    return use;
  };

  // Third-party
  var decomposeMatrix = (function() {
    // this is only ever used on the perspective matrix, which has 0, 0, 0, 1 as
    // last column
    function determinant(m) {
      return m[0][0] * m[1][1] * m[2][2] +
             m[1][0] * m[2][1] * m[0][2] +
             m[2][0] * m[0][1] * m[1][2] -
             m[0][2] * m[1][1] * m[2][0] -
             m[1][2] * m[2][1] * m[0][0] -
             m[2][2] * m[0][1] * m[1][0];
    }

    // from Wikipedia:
    //
    // [A B]^-1 = [A^-1 + A^-1B(D - CA^-1B)^-1CA^-1     -A^-1B(D - CA^-1B)^-1]
    // [C D]      [-(D - CA^-1B)^-1CA^-1                (D - CA^-1B)^-1      ]
    //
    // Therefore
    //
    // [A [0]]^-1 = [A^-1       [0]]
    // [C  1 ]      [ -CA^-1     1 ]
    function inverse(m) {
      var iDet = 1 / determinant(m);
      var a = m[0][0], b = m[0][1], c = m[0][2];
      var d = m[1][0], e = m[1][1], f = m[1][2];
      var g = m[2][0], h = m[2][1], k = m[2][2];
      var Ainv = [
        [(e * k - f * h) * iDet, (c * h - b * k) * iDet,
         (b * f - c * e) * iDet, 0],
        [(f * g - d * k) * iDet, (a * k - c * g) * iDet,
         (c * d - a * f) * iDet, 0],
        [(d * h - e * g) * iDet, (g * b - a * h) * iDet,
         (a * e - b * d) * iDet, 0]
      ];
      var lastRow = [];
      for (var i = 0; i < 3; i++) {
        var val = 0;
        for (var j = 0; j < 3; j++) {
          val += m[3][j] * Ainv[j][i];
        }
        lastRow.push(val);
      }
      lastRow.push(1);
      Ainv.push(lastRow);
      return Ainv;
    }

    function transposeMatrix4(m) {
      return [[m[0][0], m[1][0], m[2][0], m[3][0]],
              [m[0][1], m[1][1], m[2][1], m[3][1]],
              [m[0][2], m[1][2], m[2][2], m[3][2]],
              [m[0][3], m[1][3], m[2][3], m[3][3]]];
    }

    function multVecMatrix(v, m) {
      var result = [];
      for (var i = 0; i < 4; i++) {
        var val = 0;
        for (var j = 0; j < 4; j++) {
          val += v[j] * m[j][i];
        }
        result.push(val);
      }
      return result;
    }

    function normalize(v) {
      var len = length(v);
      return [v[0] / len, v[1] / len, v[2] / len];
    }

    function length(v) {
      return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }

    function combine(v1, v2, v1s, v2s) {
      return [v1s * v1[0] + v2s * v2[0], v1s * v1[1] + v2s * v2[1],
              v1s * v1[2] + v2s * v2[2]];
    }

    function cross(v1, v2) {
      return [v1[1] * v2[2] - v1[2] * v2[1],
              v1[2] * v2[0] - v1[0] * v2[2],
              v1[0] * v2[1] - v1[1] * v2[0]];
    }

    // TODO: Implement 2D matrix decomposition.
    // http://dev.w3.org/csswg/css-transforms/#decomposing-a-2d-matrix
    function decomposeMatrix(matrix) {
      var m3d = [
        matrix.slice(0, 4),
        matrix.slice(4, 8),
        matrix.slice(8, 12),
        matrix.slice(12, 16)
      ];

      // skip normalization step as m3d[3][3] should always be 1
      if (m3d[3][3] !== 1) {
        throw 'attempt to decompose non-normalized matrix';
      }

      var perspectiveMatrix = m3d.concat(); // copy m3d
      for (var i = 0; i < 3; i++) {
        perspectiveMatrix[i][3] = 0;
      }

      if (determinant(perspectiveMatrix) === 0) {
        return false;
      }

      var rhs = [];

      var perspective;
      if (m3d[0][3] !== 0 || m3d[1][3] !== 0 || m3d[2][3] !== 0) {
        rhs.push(m3d[0][3]);
        rhs.push(m3d[1][3]);
        rhs.push(m3d[2][3]);
        rhs.push(m3d[3][3]);

        var inversePerspectiveMatrix = inverse(perspectiveMatrix);
        var transposedInversePerspectiveMatrix =
            transposeMatrix4(inversePerspectiveMatrix);
        perspective = multVecMatrix(rhs, transposedInversePerspectiveMatrix);
      } else {
        perspective = [0, 0, 0, 1];
      }

      var translate = m3d[3].slice(0, 3);

      var row = [];
      row.push(m3d[0].slice(0, 3));
      var scale = [];
      scale.push(length(row[0]));
      row[0] = normalize(row[0]);

      var skew = [];
      row.push(m3d[1].slice(0, 3));
      skew.push(dot(row[0], row[1]));
      row[1] = combine(row[1], row[0], 1.0, -skew[0]);

      scale.push(length(row[1]));
      row[1] = normalize(row[1]);
      skew[0] /= scale[1];

      row.push(m3d[2].slice(0, 3));
      skew.push(dot(row[0], row[2]));
      row[2] = combine(row[2], row[0], 1.0, -skew[1]);
      skew.push(dot(row[1], row[2]));
      row[2] = combine(row[2], row[1], 1.0, -skew[2]);

      scale.push(length(row[2]));
      row[2] = normalize(row[2]);
      skew[1] /= scale[2];
      skew[2] /= scale[2];

      var pdum3 = cross(row[1], row[2]);
      if (dot(row[0], pdum3) < 0) {
        for (var i = 0; i < 3; i++) {
          scale[i] *= -1;
          row[i][0] *= -1;
          row[i][1] *= -1;
          row[i][2] *= -1;
        }
      }

      var t = row[0][0] + row[1][1] + row[2][2] + 1;
      var s;
      var quaternion;

      if (t > 1e-4) {
        s = 0.5 / Math.sqrt(t);
        quaternion = [
          (row[2][1] - row[1][2]) * s,
          (row[0][2] - row[2][0]) * s,
          (row[1][0] - row[0][1]) * s,
          0.25 / s
        ];
      } else if (row[0][0] > row[1][1] && row[0][0] > row[2][2]) {
        s = Math.sqrt(1 + row[0][0] - row[1][1] - row[2][2]) * 2.0;
        quaternion = [
          0.25 * s,
          (row[0][1] + row[1][0]) / s,
          (row[0][2] + row[2][0]) / s,
          (row[2][1] - row[1][2]) / s
        ];
      } else if (row[1][1] > row[2][2]) {
        s = Math.sqrt(1.0 + row[1][1] - row[0][0] - row[2][2]) * 2.0;
        quaternion = [
          (row[0][1] + row[1][0]) / s,
          0.25 * s,
          (row[1][2] + row[2][1]) / s,
          (row[0][2] - row[2][0]) / s
        ];
      } else {
        s = Math.sqrt(1.0 + row[2][2] - row[0][0] - row[1][1]) * 2.0;
        quaternion = [
          (row[0][2] + row[2][0]) / s,
          (row[1][2] + row[2][1]) / s,
          0.25 * s,
          (row[1][0] - row[0][1]) / s
        ];
      }

      var rotateY = Math.asin(-row[0][2]),
        rotateX,
        rotateZ;

      if (Math.cos(rotateY) != 0) {
          rotateX = Math.atan2(row[1][2], row[2][2]);
          rotateZ = Math.atan2(row[0][1], row[0][0]);
      } else {
          rotateX = Math.atan2(-row[2][0], row[1][1]);
          rotateZ = 0;
      }

      return {
        rotate: [rotateX, rotateY, rotateZ],
        translate: translate,
        scale: scale,
        skew: skew,
        quaternion: quaternion,
        perspective: perspective
      };
    }

    function dot(v1, v2) {
      var result = 0;
      for (var i = 0; i < v1.length; i++) {
        result += v1[i] * v2[i];
      }
      return result;
    }
    return decomposeMatrix;
  })();
}(this));;(function(window, document, Sync, undefined) {
  "use strict";

  if (!window.devicePixelRatio) {
    window.devicePixelRatio =
      window.webkitDevicePixelRatio ||
      window.mozDevicePixelRatio ||
      window.msDevicePixelRatio ||
      window.oDevicePixelRatio || 1;
  }
}(this, document, Sync));