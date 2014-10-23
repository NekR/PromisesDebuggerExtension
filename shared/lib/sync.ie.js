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
  // no strict in ie :)
  "use strict";

  if (document.addEventListener) return;

  var eventsMap = {
    click: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    mousedown: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true,
      cancel: function(event, nativeEvent) {
        if (document.activeElement) {
          document.activeElement.onbeforedeactivate = function() {
            window.event && (window.event.returnValue = false);
            this.onbeforedeactivate = null;
          };
        }
      }
    },
    mousemove: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false,
      check: (function() {
        var lastPageX,
          lastPageY,
          lastCall = 0;

        return function(event) {
          if ((event.timeStamp - lastCall) > 20 &&
              (lastPageX !== event.pageX || lastPageY !== event.pageY)) {
            lastCall = event.timeStamp;
            lastPageX = event.pageX;
            lastPageY = event.pageY;
            return true;
          }

          return false;
        }
      }())
    },
    mouseup: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    mouseenter: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    mouseleave: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    dblclick: {
      type: 'MouseEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    keydown: {
      type: 'KeyboardEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    keypress: {
      type: 'KeyboardEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: true
    },
    keyup: {
      type: 'KeyboardEvent',
      targets: {
        Element: true,
      },
      bubbles: true,
      cancelable: false
    },
    focus: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    blur: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    focusin: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    focusout: {
      type: 'FocusEvent',
      targets: {
        Element: true
      },
      bubbles: true,
      cancelable: false
    },
    scroll: {
      type: 'UIEvent',
      targets: {
        Element: true,
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    resize: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false,
      check: (function() {
        var width = window.innerWidth,
          height = window.innerHeight;

        return function(event) {
          // Hardcoded for top view
          if (width !== window.innerWidth || height !== window.innerHeight) {
            return true;
          }
        }
      }())
    },
    unload: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    beforeunload: {
      type: 'UIEvent',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: true,
      cancel: function(event, nativeEvent) {
        nativeEvent.returnValue = '';
      }
    },
    submit: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: true
    },
    change: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    error: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    abort: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false
    },
    load: {
      type: 'UIEvent',
      targets: {
        Element: true,
        Document: true,
        Window: true
      },
      bubbles: false,
      cancelable: false
    },
    message: {
      type: /*'MessageEvent'*/ 'Event',
      targets: {
        Window: true
      },
      bubbles: false,
      cancelable: false,
      check: function(event, nativeEvent) {
        var data = nativeEvent.data;

        try {
          data = JSON.parse(data);
        } catch (e) {};

        event.data = data;
        event.origin = nativeEvent.origin;
        event.source = nativeEvent.source;

        return true;
      }
    },
    select: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false,
      checkTarget: function(target) {
        if (target.nodeName.toLowerCase() === 'textarea' ||
            (target.nodeName.toLowerCase() === 'input' &&
            ('text password').split(' ').indexOf(target.type) !== -1)) {
          return true;
        }
      }
    },
    input: {
      type: 'UIEvent',
      targets: {
        Element: true
      },
      bubbles: false,
      cancelable: false,
      checkTarget: function(target) {
        if (target.nodeName.toLowerCase() === 'textarea' ||
            (target.nodeName.toLowerCase() === 'input' &&
            ('text password').split(' ').indexOf(target.type) !== -1)) {
          return true;
        }
      },
      add: function(type, target, config) {
        var handler = function() {
          if (window.event.propertyName !== 'value') return;

          EventTarget.prototype.dispatchEvent.call(target,
            new events.UIEvent(type, {
              bubbles: config.bubbles,
              cancelable: config.cancelable
            })
          );
        };

        target.attachEvent('onpropertychange', handler);

        return handler;
      },
      remove: function(type, target, config, handler) {
        target.detachEvent('onpropertychange', handler);
      }
    },
    DOMContentLoaded: {
      type: 'Event',
      targets: {
        Document: true
      },
      bubbles: false,
      cancelable: false,
      add: function(type, target, config) {
        var handler = function() {
          EventTarget.prototype.dispatchEvent.call(target, new events.Event(type, {
            bubbles: config.bubbles,
            cancelable: config.cancelable
          }));
        };

        target.defaultView.attachEvent('onload', handler);
        return handler;
      },
      remove: function(type, target, config, handler) {
        target.defaultView.detachEvent('onload', handler);
      }
    },
    readystatechange: {
      type: 'Event',
      bubbles: false,
      cancelable: false,
      targets: {
        XMLHttpRequest: true
      }
    },
    timeout: {
      type: 'Event',
      bubbles: false,
      cancelable: false,
      targets: {
        XMLHttpRequest: true
      }
    }
    // wheel
  },
  ie = Sync.ie || (Sync.ie = {}),
  events = {
    normalize: function(event, type) {
      type || event && (type = event.type);

      if (!event || !eventsMap.hasOwnProperty(type)) {
        return null;
      }

      var type,
        config = eventsMap[type],
        _interface = events[config.type],
        instance = Object.create(_interface.prototype);

      _interface.normalize.call(instance, event, config)

      return instance;
    }
  },
  NativeEvent = window.Event,
  globalEventsCounter = 0,
  globalEventsMap = {};

  var IE_DOM_EVENTS_KEY = 'ie_dom_events',
    EVENT_FIRE_PROPERTY = 'ie_dom_event_fire',
    LAST_TARGET_HADNLER_KEY = 'ie_last_target_handler',
    ATTACH_EVENT_HANDLER_KEY = 'ie_attach_event_handler';

  var define = function(obj, name, value) {
    if (obj.setTimeout) {
      eval(name + ' = value');
    } else {
      Object.defineProperty(obj, name, {
        value: value,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  };

  var getEventStore = function(node, type, capture) {
    var events = Sync.cache(node, IE_DOM_EVENTS_KEY);
    events = events[type] || (events[type] = {
      /*bubbling: {
        index: [],
        listeners: []
      },
      capture: {*/
        index: [],
        listeners: []
      /*}*/
    });

    //return capture ? events.capture : events.bubbling;
    return events;
  },
  registerEventTarget = function(params) {
    var identifier = params.identifier,
      target = params.target,
      needProxy = params.needProxy,
      nativeEvent = params.nativeEvent;

    var path = globalEventsMap[identifier] || (globalEventsMap[identifier] = []);

    path.push({
      target: target,
      needProxy: needProxy
    });
  },
  fireListeners = function(item, normalEvent) {
    var target = item.target,
      store = getEventStore(target, normalEvent.type, item.capture),
      listeners = store.listeners.concat(),
      length = listeners.length,
      index = 0,
      result;

    normalEvent.currentTarget = target;
    normalEvent.eventPhase = item.phase;

    for (; index < length; index++) {

      var listener = listeners[index];
      result = listener.handleEvent.call(target, normalEvent);

      if (normalEvent.eventFlags & normalEvent.STOP_IMMEDIATE_PROPAGATION) {
        break;
      }
    }

    return result;
  },
  bindNativeHandler = function(self, type, config) {
    var targets = config.targets;

    checkIs: {
      if (!self.nodeType && self.setTimeout) {
        var isWin = true;
      } else if (self.nodeType === Node.DOCUMENT_NODE) {
        var isDoc = true;
      } else if (self.nodeType === Node.ELEMENT_NODE) {
        var isElem = true;

        if (self.ownerDocument.documentElement === self) {
          var isRoot = true;
        }
      } else if (self.nodeType) {
        var isOtherNode = true;
      } else {}
    }

    if ((isElem && !targets.Element) ||
        (isDoc && !targets.Document && !targets.Element) ||
        (isWin && !targets.Window && !targets.Element)) {
      return;
    }

    if (config.checkTarget && !config.checkTarget(self)) {
      return;
    }

    if (isWin && targets.Element && !targets.Window) {
      self = self.document;
      isDoc = true;
      isWin = false;
    } else if (isWin) {
      self = self.window;
    }

    var isLastTarget,
      doc = isWin ? self.document : self.ownerDocument || document,
      attachHandlerCache = Sync.cache(self, ATTACH_EVENT_HANDLER_KEY),
      needWin = !isWin && !targets.Window &&
        targets.Element && (isElem || isDoc);

    if (attachHandlerCache[type]) return;

    isLastTarget = !config.bubbles || (targets.Window && isWin) ||
       (targets.Element && !targets.Window && (isDoc || isWin));

    var lastTarget = isLastTarget ? self :
        (targets.Window ? doc.defaultView : doc),
      lastTargetCache = Sync.cache(lastTarget, LAST_TARGET_HADNLER_KEY),
      lastTargetCacheEntry = lastTargetCache && lastTargetCache[type];

    if (!isWin && !lastTargetCacheEntry) {
      if (config.addLastTarget) {
        var lastTargetHandler = config.addLastTarget(type, lastTarget, config);
      } else {
        var lastTargetHandler = function() {
          var identifier = window.event.data.trim(),
            normalEvent;

          if (!identifier || !isFinite(identifier)) return;

          if (needWin && (normalEvent = globalEventsMap[identifier])) {
            fireListeners({
              phase: normalEvent.BUBBLING_PHASE,
              target: doc.defaultView,
              capture: false,
              needProxy: true
            }, normalEvent);
          }

          delete globalEventsMap[identifier];
        };

        lastTarget.attachEvent('on' + type, lastTargetHandler);
      }

      lastTargetCacheEntry = lastTargetCache[type] = {
        handler: lastTargetHandler,
        bounds: []
      };
    }

    if (!isWin && lastTargetCacheEntry) {
      lastTargetCache[type].bounds.push(self);
    }

    if (config.add) {
      attachHandlerCache[type] = config.add(type, self, config);
      return;
    }

    self.attachEvent(
      'on' + type,
      attachHandlerCache[type] = function() {
        var nativeEvent = window.event,
          data = nativeEvent.data.trim(),
          identifier,
          event;

        if (!isWin) {
          if (data && isFinite(data)) {
            identifier = data;
            event = globalEventsMap[identifier];
          } else {
            identifier = nativeEvent.data = ++globalEventsCounter;
            event = globalEventsMap[identifier] = events.normalize(nativeEvent);
          }
        } else {
          event = events.normalize(nativeEvent);
        }

        var stopped = event.eventFlags & event.STOP_PROPAGATION,
          config = eventsMap[event.type] || {
            bubbles: event.bubbles,
            cancelable: event.cancelable
          },
          phase = self === event.target ? event.AT_TARGET : event.BUBBLING_PHASE;

        if ((config.check && !config.check(event, nativeEvent)) || stopped ||
            (phase === event.BUBBLING_PHASE && !config.bubbles)) {
          return;
        }

        var result = fireListeners({
          phase: phase,
          target: self,
          capture: false,
          needProxy: isWin || isDoc
        }, event);

        if (event.eventFlags & event.STOP_PROPAGATION) {
          nativeEvent.cancelBubble = true;
        }

        if (event.defaultPrevented) {
          if (config.cancelable) {
            nativeEvent.returnValue = false;
            if (config.cancel) {
              config.cancel(event, nativeEvent, config);
            }
          }
        } else if (result !== false && result !== void 0) {
          nativeEvent.returnValue = result;
        }
      }
    );
  },
  unbindNativeHandler = function(self, type, config) {
    var targets = config.targets;

    checkIs: {
      if (!self.nodeType && self.setTimeout) {
        var isWin = true;
      } else if (self.nodeType === Node.DOCUMENT_NODE) {
        var isDoc = true;
      } else if (self.nodeType === Node.ELEMENT_NODE) {
        var isElem = true;

        if (self.ownerDocument.documentElement === self) {
          var isRoot = true;
        }
      } else if (self.nodeType) {
        var isOtherNode = true;
      } else {}
    }

    if (isElem && !targets.Element ||
        isDoc && !targets.Document && !targets.Element ||
        isWin && !targets.Window && !targets.Element) {
      return;
    }

    if (config.checkTarget && !config.checkTarget(self)) {
      return;
    }

    if (isWin && targets.Element && !targets.Window) {
      self = self.document;
      isDoc = true;
      isWin = false;
    }

    var isLastTarget,
      doc = isWin ? self.document : self.ownerDocument || document,
      attachHandlerCache = Sync.cache(self, ATTACH_EVENT_HANDLER_KEY),
      needWin = !isWin && !targets.Window &&
        targets.Element && (isElem || isDoc);

    if (!attachHandlerCache[type]) return;

    isLastTarget = !config.bubbles || (targets.Window && isWin) ||
       (targets.Element && !targets.Window && (isDoc || isWin));

    var lastTarget = isLastTarget ? self :
        (targets.Window ? doc.defaultView : doc),
      lastTargetCache = Sync.cache(lastTarget, LAST_TARGET_HADNLER_KEY),
      lastTargetCacheEntry = lastTargetCache && lastTargetCache[type],
      boundIndex;

    if (!isWin && lastTargetCacheEntry) {
      boundIndex = lastTargetCacheEntry.bounds.indexOf(self);

      if (boundIndex !== -1) {
        lastTargetCacheEntry.bounds.splice(boundIndex, 1);
      }

      if (!lastTargetCacheEntry.bounds.length) {
        if (config.removeLastTarget) {
          config.removeLastTarget(type, lastTarget, config, lastTargetCacheEntry.handler);
        } else {
          lastTarget.detachEvent('on' + type, lastTargetCacheEntry.handler);
        }

        lastTargetCache[type] = null;
      }
    }

    if (config.remove) {
      config.remove(type, self, config, attachHandlerCache[type]);
      return;
    }

    self.detachEvent('on' + type, attachHandlerCache[type]);
  };

  Sync.each({
    Event: {
      constructor: function(type, params) {
        this.timeStamp = Date.now();
      },
      normalize: function(nativeEvent, config) {
        this.target = nativeEvent.srcElement || window;
        this.isTrusted = true;
        this.bubbles = config.bubbles;
        this.cancelable = config.cancelable;
        this.type = nativeEvent.type;
        this.eventFlags = this.INITIALIZED | this.DISPATCH;

        if (nativeEvent.returnValue === false) {
          this.preventDefault();
        }

        if (nativeEvent.cancelBubble === true) {
          this.stopPropagation();
        }
      },
      proto: {
        type: '',
        target: null,
        currentTarget: null,
        defaultPrevented: false,
        isTrusted: false,
        bubbles: false,
        cancelable: false,
        eventPhase: 0,
        eventFlags: 0,
        timeStamp: 0,
        stopPropagation: function() {
          this.eventFlags |= this.STOP_PROPAGATION;
        },
        stopImmediatePropagation: function() {
          this.eventFlags = this.eventFlags |
                            this.STOP_IMMEDIATE_PROPAGATION |
                            this.STOP_PROPAGATION;
        },
        preventDefault: function() {
          if (this.cancelable) {
            this.eventFlags |= this.CANCELED;
            //getters are not supported, so that passing new value manually
            this.defaultPrevented = true;
          }
        },
        initEvent: function(type, bubbles, cancelable) {
          if (this.eventFlags & this.DISPATCH) return;

          this.type = type + '';
          this.bubbles = !!bubbles;
          this.cancelable = !!cancelable;
          this.isTrusted = false;
          this.eventFlags = this.INITIALIZED;
          this.eventPhase = 0;
          this.target = null;
        },
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3,
        STOP_PROPAGATION: 1,
        STOP_IMMEDIATE_PROPAGATION: 2,
        CANCELED: 4,
        INITIALIZED: 8,
        DISPATCH: 16
      }
    },
    UIEvent: {
      proto: {
        view: null,
        detail: 0
      },
      normalize: function(nativeEvent) {
        this.view = (this.target.ownerDocument || this.target.document || document).defaultView;
      },
      parent: 'Event'
    },
    MouseEvent: {
      parent: 'UIEvent',
      proto: {
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
      constructor: function() {
        this.pageX = this.clientX + window.pageXOffset;
        this.pageY = this.clientY + window.pageYOffset;
      },
      normalize: function(nativeEvent, config) {
        var button;

        if (!nativeEvent.button || nativeEvent.button === 1 ||
            this.type === 'click' || this.type === 'dblclick') {
          button = 0;
        } else if (nativeEvent.button & 4) {
          button = 1;
        } else if (nativeEvent.button & 2) {
          button = 2;
        }

        //this.detail = 0;
        this.metaKey = false;
        this.ctrlKey = nativeEvent.ctrlKey || nativeEvent.ctrlLeft;
        this.altKey = nativeEvent.altKey || nativeEvent.altLeft;
        this.shiftKey = nativeEvent.shiftKey || nativeEvent.shiftLeft;
        this.screenX = nativeEvent.screenX;
        this.screenY = nativeEvent.screenY;
        this.clientX = nativeEvent.clientX;
        this.clientY = nativeEvent.clientY;
        this.buttons = nativeEvent.button;
        this.button = button;
        this.relatedTarget = this.target === nativeEvent.fromElement ?
          nativeEvent.toElement : nativeEvent.fromElement;
      }
    },
    KeyboardEvent: {
      parent: 'UIEvent',
      proto: {
        DOM_KEY_LOCATION_STANDARD: 0x00,
        DOM_KEY_LOCATION_LEFT: 0x01,
        DOM_KEY_LOCATION_RIGHT: 0x02,
        DOM_KEY_LOCATION_NUMPAD: 0x03,
        DOM_KEY_LOCATION_MOBILE: 0x04,
        DOM_KEY_LOCATION_JOYSTICK: 0x05,
        location: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
        locale: '',
        keyCode: 0,
        charCode: 0,
        VK_ESC: 27,
        VK_ENTER: 13,
        VK_SPACE: 32,
        VK_SHIFT: 16,
        VK_CTRL: 17,
        VK_ALT: 18
      },
      normalize: function(nativeEvent, config) {
        setChar: if (this.type === 'keypress') {
          this.charCode = nativeEvent.keyCode;
        }

        this.keyCode = nativeEvent.keyCode;
        this.repeat = nativeEvent.repeat;
        this.metaKey = false;
        this.altKey = nativeEvent.altKey || nativeEvent.altLeft;
        this.ctrlKey = nativeEvent.ctrlKey || nativeEvent.ctrlLeft;
        this.shiftKey = nativeEvent.shiftKey || nativeEvent.shiftLeft;

        if (this.keyCode === this.VK_ALT) {
          this.location = nativeEvent.altLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }

        if (this.keyCode === this.VK_CTRL) {
          this.location = nativeEvent.ctrlLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }

        if (this.keyCode === this.VK_SHIFT) {
          this.location = nativeEvent.shiftLeft ? this.DOM_KEY_LOCATION_LEFT :
                                                this.DOM_KEY_LOCATION_RIGHT;
        }
      }
    },
    FocusEvent: {
      parent: 'UIEvent',
      proto: {
        relatedTarget: null
      },
      normalize: function(nativeEvent, config) {
        this.relatedTarget = nativeEvent.toElement ?
          nativeEvent.toElement : nativeEvent.fromElement;
      }
    },
    CustomEvent: {
      parent: 'Event',
      proto: {
        detail: null
      }
    }
  }, function(config, _interface) {
    var constructor = events[_interface] = function(type, options) {
      var self = this;

      if (!(this instanceof constructor)) {
        self = Object.create(constructor.prototype);
      }

      if (!type) {
        return self;
      }

      options || (options = {});

      var bubbles = options.hasOwnProperty('bubbles') ? options.bubbles : this.bubbles,
        cancelable = options.hasOwnProperty('cancelable') ? options.cancelable : this.cancelable;

      self.initEvent(type, bubbles, cancelable);
      delete options.bubbles;
      delete options.cancelable;

      Sync.each(options, function(value, param) {
        if (constructor.prototype.hasOwnProperty(param)) {
          self[param] = value;
        }
      });

      config.constructor && config.constructor.apply(self, arguments);
      return self;
    },
    parent = config.parent ? events[config.parent] : null;

    constructor.normalize = function(nativeEvent, normalizeConfig) {
      if (parent) {
        parent.normalize.call(this, nativeEvent, normalizeConfig);
      }

      config.normalize.call(this, nativeEvent, normalizeConfig);
      config.constructor && config.constructor.apply(this, arguments);
    };

    constructor.prototype = parent ?
      Sync.extend(Object.create(parent.prototype), config.proto) : config.proto;
  });

  var EventListener = function(options) {
    options || (options = {});

    var type = options.type,
      handler = options.handler,
      capture = options.capture,
      target = options.target;

    if (!type || typeof type !== 'string' || !handler ||
        (typeof handler !== 'object' && typeof handler !== 'function')) {
      console.log('ret with null');
      return null;
    }

    this.type = type;
    this.target = target;
    this.handleEvent = 
      (typeof handler === 'function' ? handler : handler.handleEvent);

    this.capture =
      (typeof capture !== 'boolean' && (capture = false)) || capture;
  };

  var EventTarget = function() {};

  EventTarget.prototype = {
    addEventListener: function(type, handler, capture) {
      if (!(listener = new EventListener({
        type: type,
        handler: handler,
        capture: capture,
        target: this
      }))) return;

      var store = getEventStore(this, type, capture),
        listener,
        self = this,
        config = eventsMap[type];

      if (store.index.indexOf(handler) === -1) {
        store.index.push(handler);
        store.listeners.push(listener);
      }

      if (config && self.attachEvent) {
        bindNativeHandler(self, type, config);
      }
    },
    removeEventListener: function(type, handler, capture) {
      if (typeof handler === 'object' && handler) {
        handler = object.handleEvent;
      }

      if (typeof type !== 'string' || typeof handler !== 'function') {
        return;
      }

      var store = getEventStore(this, type, capture),
        self = this,
        config = eventsMap[type],
        index = store.index.indexOf(handler);

      if (index !== -1) {
        store.index.splice(index, 1);
        store.listeners.splice(index, 1);
      }

      if (!store.listeners.length && config && self.detachEvent) {
        unbindNativeHandler(self, type, config);
      }
    },
    dispatchEvent: function(event) {
      var bubbles = event.bubbles,
        path = [],
        target = event.target = this,
        config = eventsMap[event.type],
        indentifier;

      if (config) {
        identifier = ++globalEventsCounter;

        try {
          this.fireEvent('on' + event.type);
          return !event.defaultPrevented;
        } catch (e) {
          globalEventsMap[identifier] = null;
        }
      }

      propagation: if (bubbles && this.nodeType) {
        do {
          if (target.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            break propagation;
          }

          path.push(target);
          target = target.parentNode;
        } while (target && target.nodeType !== Node.DOCUMENT_NODE);

        if (target.nodeType === Node.DOCUMENT_NODE) {
          path.push(target);
          path.push(target.defaultView);
        }
        
        (function() {
          for (var index = 0, length = path.length; index < length; index++) {
            target = path[index];

            var phase = !index ? event.AT_TARGET : event.BUBBLING_PHASE;

            fireListeners({
              phase: phase,
              target: target,
              capture: false,
              needProxy: !target.nodeType || target.nodeType === Node.DOCUMENT_NODE
            }, event);

            if (event.eventFlags & event.STOP_PROPAGATION) {
              break;
            }
          }
        }());

        return !event.defaultPrevented;
      }

      fireListeners({
        phase: event.AT_TARGET,
        target: target,
        capture: false,
        needProxy: !target.nodeType || target.nodeType === Node.DOCUMENT_NODE
      }, event);

      return !event.defaultPrevented;
    }
  };

  [
    'Event',
    'CustomEvent',
    'UIEvent',
    'MouseEvent',
    'KeyboardEvent',
    'FocusEvent'
  ].forEach(function(key) {
    if (events.hasOwnProperty(key)) {
      define(window, key, events[key]);
    }
  });

  document.createEvent = function(inter) {
    if (events.hasOwnProperty(inter)) {
      return Object.create(events[inter].prototype);
    }
  };

  Sync.each(EventTarget.prototype, function(prop, key) {
    [
      Element.prototype,
      HTMLDocument.prototype,
      // XMLHttpRequest.prototype,
      window
    ].forEach(function(object) {
      define(object, key, prop);
    });
  });
}(this, this.document, Sync));(function(window, document, Sync, undefined) {
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
}(this, this.document, Sync));;(function(window, document, Sync, undefined) {
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