/**
 * RestedAPI - Rest API microframework
 * @author  John Cui <johnrcui@gmail.com>
 * @exports RestedAPI
 */
!(function (window, undefined) {
  'use strict';

  ///////////////////////////////
  //  G L O B A L   T Y P E S  //
  ///////////////////////////////
  var TYPE_MATH       = 'Math';
  var TYPE_STRING     = 'String';
  var TYPE_NUMBER     = 'Number';
  var TYPE_ARRAY      = 'Array';
  var TYPE_OBJECT     = 'Object';
  var TYPE_PROMISE    = 'Promise';
  var TYPE_FUNCTION   = 'Function';
  var TYPE_UNDEFINED  = 'undefined';
  var TYPE_XMLHTTPREQ = 'XMLHttpRequest';

  /////////////////////////////////////////
  //  G L O B A L   R E F E R E N C E S  //
  /////////////////////////////////////////
  var document        = window.document;
  var Math            = window[TYPE_MATH];
  var Object          = window[TYPE_OBJECT];
  var String          = window[TYPE_STRING];
  var Array           = window[TYPE_ARRAY];
  var Promise         = window[TYPE_PROMISE];
  var XMLHttpRequest  = window[TYPE_XMLHTTPREQ];
  var noop            = function(){};

  /////////////////////////
  //  C O N S T A N T S  //
  /////////////////////////
  var METHOD_GET      = 'GET',
    METHOD_POST     = 'POST',
    METHOD_PUT      = 'PUT',
    METHOD_DELETE   = 'DELETE';

  /////////////////////////////////////////
  //  P R I V A T E   V A R I A B L E S  //
  /////////////////////////////////////////
  var _routes = {};
  var _factories = {};
  var _request = [];
  var _csrf;
  var _token;
  var _options = {
    baseUrl: '',
    baseQuery: [],
    baseHeaders: [],
    parseResponse: true,
    autoload: true,
  };

  ///////////////////////////////////////
  //  H E L P E R   F U N C T I O N S  //
  ///////////////////////////////////////

  /**
   * Make the first character on a string uppercase
   */
  window[TYPE_STRING].prototype.upperCaseFirst = function () {
    return this.substring(0, 1).toUpperCase() + this.substring(1);
  };

  /**
   * String prototype function for generating hash values
   * This is used primarily for generating hashed ids from
   * string values
   */
  window[TYPE_STRING].prototype.hashCode = function(base) {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    hash = hash >>> 0;

    return !window.isNaN(window.parseInt(base)) && (base > 1 && base <= 36 && hash.toString(base)) || hash;
  };

  /**
   * Turn strings to slugs
   */
  window[TYPE_STRING].prototype.slugify = function (delimiter) {
    delimiter = delimiter ? delimiter : '-';

    return this.replace('\'', '').replace(/[^a-z0-9]+/gmi, delimiter);
  };

  /**
   * Test if a variable is undefined
   * @param  mixed    x
   * @param  boolean  [andNotNull == true]
   * @return boolean
   */
  function isUndefined(x, andNull) {
    return typeof x === TYPE_UNDEFINED || (!!andNull && x === null);
  }

  /**
   * Test if a variable is defined
   * @param  mixed    x
   * @return boolean
   */
  function isDefined(x, andNotNull) {
    return !isUndefined(x, andNotNull);
  }

  /**
   * Test if a variable of a specific type
   * type values are defined at the top of module definition
   * @param  mixed    x
   * @param  string   type
   * @return boolean
   */
  function isType(x, type) {
    var name = isDefined(x, 1) && isDefined(x.constructor.name) ? x.constructor.name : Object.prototype.toString.call(x).slice(8, -1);
    return type === name;
  }

  /**
   * Test if a variable is a string or if string is stringable
   * @param  mixed    s
   * @param  boolean  [orStringable = false]
   * @return boolean
   */
  function isString(s, orStringable) {
    return orStringable && s.toString || typeof s === TYPE_STRING.toLowerCase();
  }

  /**
   * Test if a variable is not-a-number
   * @param  mixed    n
   * @return boolean
   */
  function isNaN(n) {
    return Number.isNaN(Number(n));
  }

  /**
   * Test if a variable is a number
   * @param  mixed    n
   * @return boolean
   */
  function isNumber(n) {
    return !isNaN(n) && (typeof n === TYPE_NUMBER.toLowerCase() || isType(Number(n), TYPE_NUMBER));
  }

  /**
   * Test if a variable is a valid index value
   * @param  mixed    n
   * @param  array    [arr = null]    array to test uppper limit
   * @return boolean
   */
  function isValidIndex(n, arr) {
    var valid = isNumber(n);

    if (valid && arr && isArray(arr)) {
      valid = n < arr.length;
    }

    return valid && n >= 0;
  }

  /**
   * Test if a variable is an array
   * @param  mixed    a
   * @return boolean
   */
  function isArray(a) {
    return isDefined(a) && typeof a === TYPE_OBJECT.toLowerCase() && isType(a, TYPE_ARRAY);
  }

  /**
   * Test if a variable is an object
   * @param  mixed    o
   * @return boolean
   */
  function isObject(o) {
    return isDefined(o) && typeof o === TYPE_OBJECT.toLowerCase() && isType(o, TYPE_OBJECT);
  }

  /**
   * Test if a variable is a function (ex. callback)
   * @param  mixed    f
   * @return boolean
   */
  function isFunction(f) {
    return isDefined(f) && typeof f === TYPE_FUNCTION.toLowerCase();
  }

  /**
   * Test if a variable is a valid path string
   * @param  mixed    p
   * @return boolean
   */
  function isValidPath(p) {
    return isString(p) && /^\/?[^\/?#]*(\/[^\/?#]+)*\/?(\?[^#]*)?(#.*)?$/.test(p);
  }

  /**
   * Test if a variable represents an empty value
   * ie. null, undefiend, 0, [], or {}
   * @param  mixed    v
   * @return boolean
   */
  function isEmpty(v) {
    return !isUndefined(v, 1)
      || (v === 0)
      || (isArray(v) && !v.length)
      || (isString(v) && !v.length)
      || (isObject(v) && !Object.keys(v).length);
  }

  /**
   * Object.keys polyfill for older browsers
   * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
   */
  if (!Object.keys) {
    Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
      hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
      dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
      ],
      dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
      throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
      if (hasOwnProperty.call(obj, prop)) {
        result.push(prop);
      }
      }

      if (hasDontEnumBug) {
      for (i = 0; i < dontEnumsLength; i++) {
        if (hasOwnProperty.call(obj, dontEnums[i])) {
        result.push(dontEnums[i]);
        }
      }
      }
      return result;
    };
    }());
  }

  /**
   * Simple iterator function similar to jQuery.each
   * @param  object|array   subject
   * @param  function       callback
   * @return void
   */
  function each(subject, callback) {
    if (callback && !isFunction(callback)) {
      throw new Error('Iterator requires the second argument to be a callback.');
    }

    if (isArray(subject)) {
      for (var i = 0, l = subject.length; i < l; i++) {
        if (callback.apply(subject[i], [i, subject[i]]) === false) {
          break;
        }
      }
    }
    else if (isObject(subject)) {
      for (var keys = Object.keys(subject), i = 0, l = keys.length; i < l; i++) {
        if (callback.apply(subject[keys[i]], [keys[i], subject[keys[i]]]) === false) {
          break;
        }
      }
    }
    else {
      throw new Error('Iterator requires the first argument to be an array or object');
    }
  }

  /**
   * Simple mapping function similary to jQuery.map
   * @param  object|array   subject
   * @param  function       callback
   * @return object|array
   */
  function map(subject, callback) {
    var result;

    if (callback && !isFunction(callback)) {
      throw new Error('Iterator requires the second argument to be a callback.');
    }

    if (isArray(subject)) {
      result = [];
      for (var current, i = 0, l = subject.length; i < l; i++) {
        current = callback.apply(subject[i], [i, subject[i]]);
        if (current !== null || typeof current !== TYPE_UNDEFINED) {
          result.push(current);
        }
      }
    }
    else if (isObject(subject)) {
      result = {};
      for (var current, keys = Object.keys(subject), i = 0, l = keys.length; i < l; i++) {
        current = callback.apply(subject[keys[i]], [keys[i], subject[keys[i]]]);
        if (current !== null || typeof current !== TYPE_UNDEFINED) {
          result[keys[i]] = current;
        }
      }
    }
    else {
      throw new Error('Iterator requires the first argument to be an array or object');
    }

    return result;
  }

  /**
   * Simple object merge function similar to jQuery.extend
   * Assumes arguments passed in are simple objects
   * @param  boolean      [deep=false]
   * @param  object       target
   * @param  object       obj1
   * @param  object       [objN]
   * @return object
   */
  function merge(/* [deep=false], target, obj1, [objN] */) {
    var args = Array.prototype.slice.call(arguments),
      index = -1,
      deep = (args.length > 1) && (typeof args[0] === 'boolean') && args.shit(),
      target = args.length && args.shift() || {},
      argLength = args.length;

    if (deep) {
      while (++index < argLength) {
        for (var current, key, keys = isObject(args[index]) && Object.keys(args[index]) || [], i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          current = args[index][key];
          if (isObject(current)) {
            target[key] = merge(deep, {}, current);
          } else {
            target[key] = current;
          }
        }
      }
    } else {
      while (++index < argLength) {
        for (var current, key, keys = isObject(args[index]) && Object.keys(args[index]) || [], i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          current = args[index][key];
          target[key] = current;
        }
      }
    }


    return target;
  }

  /**
   * Simple object clone function
   * Assumes arguments passed in are simple object
   * @param  object       original
   * @return object
   */
  function clone(original) {
    return merge(true, {}, original);
  }

  /**
   * Simple object diff function
   * Assumes arguments passed in are simple ojects
   */
  function diff(strict /* dst, src1, [scrN] */) {
    var args = Array.prototype.slice.call(arguments),
      index = -1,
      target, argLength;

    strict = (strict === 'strict');
    if (strict) {
      args.shift();
    }

    target = args.length && args.shift() || {};
    argLength = args.length;

    while (++index < argLength) {
      for (var src = args[index], keys = src && Object.keys(src) || [], i = 0, l = keys.length; i < l; i++) {
        if (isDefined(target[keys[i]]) && (!strict || target[keys[i]] === src[keys[i]])) {
          delete target[keys[i]];
        }
      }
    }

    return target;
  }

  /**
   * Generic XHR request
   *
   * @param  string   method      (GET, POST, PUT, PATCH, DELETE)
   * @param  string   route       Absolute route or relative to base url
   * @param  object   query       Query parameters
   * @param  mixed    [payload]   Optional payload
   * @return Promise
   */
  function request(method, route, query, headers, payload) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var queries = [];
      // transform payload to json string
      payload = payload && JSON.stringify(payload) || null;
      // Decompose querystring
      for (var keys = query && Object.keys(query) || [], i = 0, l = keys.length; i < l; i++) {
        queries.push(keys[i] + '=' + query[keys[i]]);
      }
      // add querystring to route uri
      route += (queries.length && ('?' + queries.join('&')) || '');
      // console.log('Request [' + method + '] ' + route);
      // Use credentials for CORS requests
      xhr.withCredentials = true;
      //
      xhr.open(
        method,
        route
      );
      // Decompose headers
      for (var keys = headers && Object.keys(headers) || [], i = 0, l = keys.length; i < l; i++) {
        xhr.setRequestHeader(keys[i], headers[keys[i]]);
      }
      //
      xhr.onload = function () { resolve(xhr) };
      xhr.onerror = function () { reject(xhr) };
      xhr.ontimeout = function () { reject(xhr) };

      xhr.send(payload);
    });
  }

  /**
   * Test if json web-token is expired
   * Always returns true if atob is not available on the global object
   * @return bollean
   */
  function tokenExpired() {
    if (_token && _token !== '' && window.atob) {
      var toks = _token.split('.');
      var payload = (toks.length === 3) && JSON.parse(window.atob(toks[1].replace('_', '/')));
      return payload.exp ? ((payload.exp * 1000) - new Date().getTime()) < 5000 : true;
    }

    return true;
  }

  /**
   * Request a valid auth token
   * Uses last requested token if it hasn't yet expired
   * @return Promise
   */
  function requestToken() {
    return !tokenExpired()
    ? Promise.resolve(_token)
    : request(METHOD_GET, '/auth/token', null, { 'X-CSRF-TOKEN': _csrf })
    .then(function (xhr) {
      var json = JSON.parse(xhr.response);
      _token = json.data;

      return _token;
    });
  }

  /**
   * Normalized request for an API endpoint
   * @param  string   method      (GET, POST, PUT, DELETE)
   * @param  string   route       path to enpoint route
   * @param  object   [query = {}]    query key-value pair
   * @param  object   [headers = {}]  headers key-value pair
   * @param  object   [payload = {}]  payload to send (not used on get method)
   * @return Promise
   */
  function requestApi(method, route, query, headers, payload) {
    // Add base url to route
    route = _options.baseUrl.replace(/(.*)\/?$/, '$1') + route.replace(/^\/?(.*)/, '/$1');

    return requestToken()
    .then(function(token) {
      query = merge({}, _options.baseQuery, query);
      headers = merge({}, _options.baseHeaders, headers);
      payload = payload || null;
      headers['Authorization'] = 'Bearer ' + token;

      return request(method, route, query, headers, payload)
      .then(function (xhr) {
        if (xhr.status >= 400) {
          return _options.parseResponse && xhr.response && Promise.reject(JSON.parse(xhr.response)) || Promise.reject(xhr);
        } else {
          return _options.parseResponse && xhr.response && JSON.parse(xhr.response) || xhr;
        }
      });
    });
  }

  /**
   * Autoload function to retreive API base url and initial public token
   * @return void
   */
  function autoload() {
    var elm;
    _options.baseUrl = (elm = document.querySelector('meta[name="api-base"]')) && elm.getAttribute('content');
    _token = (elm = document.querySelector('meta[name="api-token"]')) && elm.getAttribute('content') || '';
    _csrf = (elm = document.querySelector('meta[name="csrf-token"]')) && elm.getAttribute('content') || '';
  }

  /**
   * Route Object Definition
   */
  function Route(requestOptions) {
    // localize route request options
    var route       = requestOptions && requestOptions.url.replace(/(.*)\/?$/, '$1') || '',
      baseQuery   = requestOptions && requestOptions.query || {},
      headers     = requestOptions && requestOptions.headers || {},
      methods     = requestOptions && requestOptions.methods || [METHOD_GET];

    /**
     * Normalize get request for current route definition
     * @param  string   [path = '']     additional route subpath
     * @param  object   [query = {}]    additional query params
     * @return Promise
     */
    function getRequest(path, query) {
      if (isObject(path)) {
        query = path;
        path = '';
      } else {
        path = path && String(path).replace(/^\/?(.*)/, '/$1') || '';
      }

      query = merge({}, baseQuery, query);
      return requestApi(METHOD_GET, route + path, query, headers);
    }

    /**
     * Normalize post request for current route definition
     * @param  string   [path = '']     additional route subpath
     * @param  object   [payload = {}]  payload to send
     * @param  object   [query = {}]    additional query params
     * @return Promise
     */
    function postRequest(path, payload, query) {
      if (isObject(path)) {
        query = payload && merge({}, payload);
        payload = path && merge({}, path);
        path = '';
      } else {
        path = path && String(path).replace(/^\/?(.*)/, '/$1') || '';
      }
      query = merge({}, baseQuery, query);
      return requestApi(METHOD_POST, route + path, query, headers, payload);
    }

    /**
     * Normalize put request for current route definition
     * @param  string   [path = '']     additional route subpath
     * @param  object   [payload = {}]  payload to send
     * @param  object   [query = {}]    additional query params
     * @return Promise
     */
    function putRequest(path, payload, query) {
      if (isObject(path)) {
        query = payload && merge({}, payload);
        payload = path && merge({}, path);
        path = '';
      } else {
        path = path && String(path).replace(/^\/?(.*)/, '/$1') || '';
      }
      query = merge({}, baseQuery, query);
      return requestApi(METHOD_PUT, route + path, query, headers, payload);
    }

    /**
     * Normalize delete request for current route definition
     * @param  string   [path = '']     additional route subpath
     * @param  object   [payload = {}]  payload to send
     * @param  object   [query = {}]    additional query params
     * @return Promise
     */
    function deleteRequest(path, payload, query) {
      if (isObject(path)) {
        query = payload && merge({}, payload);
        payload = path && merge({}, path);
        path = '';
      } else {
        path = path && String(path).replace(/^\/?(.*)/, '/$1') || '';
      }
      query = merge({}, baseQuery, query);
      return requestApi(METHOD_DELETE, route + path, query, headers, payload);
    }

    /**
     * Default handler for disallowed requests
     * @return Promise  rejected promise
     */
    function methodNotAllowed() {
      return Promise.reject(new Error('Method not allowed'));
    }

    // Normalize method list to uppercase
    for (var i = 0, l = methods.length; i < l; i++) {
      methods[i] = methods[i] && methods[i].toUpperCase();
    }

    // Publish methods with the correct handlers
    //
    this.get = (methods.indexOf(METHOD_GET)+1) ? getRequest : methodNotAllowed;
    this.post = (methods.indexOf(METHOD_POST)+1) ? postRequest : methodNotAllowed;
    this.put = (methods.indexOf(METHOD_PUT)+1) ? putRequest : methodNotAllowed;
    this.delete = (methods.indexOf(METHOD_DELETE)+1) ? deleteRequest : methodNotAllowed;
  }

  /**
   * Factory Object
   * @link http://stackoverflow.com/questions/10564245/passing-all-arguments-to-a-constructor
   */
  function Factory(Model) {

    // Object.create shim
    function createObject(proto) {
      if (!Object.create) {
        var f = noop;
        f.prototype = proto;
        return new f;
      } else {
        return Object.create(proto);
      }
    }

    /**
     * Calls an object constructor and creates a new instance
     * @return object   factory object
     */
    function make() {

      // Return Model (singleton) if not a function
      if (!isFunction(Model)) {
        // throw new Error('Factory registered must be a function.');
        return Model;
      } else {
        var args = Array.prototype.slice.call(arguments);
        var obj = createObject(Model.prototype);
        Model.apply(obj, args);
        return obj;
      }
    }

    // Publish public methods
    this.make = make;
  }

  /**
   * Shredz API Module Definition
   */
  function RestedAPI(options) {
    var $instance = this;
    var $static = $instance && $instance.constructor || RestedAPI;

    $static.options(options);

    return $static.routes();
  }

  // Expose Constants
  RestedAPI.METHOD_GET = METHOD_GET;
  RestedAPI.METHOD_POST = METHOD_POST;
  RestedAPI.METHOD_PUT = METHOD_PUT;
  RestedAPI.METHOD_DELETE = METHOD_DELETE;

  // Publish Public properties and methods
  RestedAPI.request = requestApi;
  RestedAPI.routes = function getRoutes(name) {
    return name ? _routes[name] : _routes;
  }

  RestedAPI.route = function registerRoute(name, requestOptions) {
    if (!/^[a-z]+([A-Z][a-z]*?)*$/.test(name)) {
      throw new Error('Route name must be in camel case.');
    }

    var route = _routes[name] = new Route(requestOptions);

    RestedAPI[METHOD_GET.toLowerCase() + name.upperCaseFirst()] = route[METHOD_GET.toLowerCase()];
    RestedAPI[METHOD_POST.toLowerCase() + name.upperCaseFirst()] = route[METHOD_POST.toLowerCase()];
    RestedAPI[METHOD_PUT.toLowerCase() + name.upperCaseFirst()] = route[METHOD_PUT.toLowerCase()];
    RestedAPI[METHOD_DELETE.toLowerCase() + name.upperCaseFirst()] = route[METHOD_DELETE.toLowerCase()];

    return RestedAPI;
  };

  RestedAPI.options = function getSetOptions(options) {
    if (options) {
      _options = merge(_options, options);
      return RestedAPI;
    } else {
      return _options;
    }
  };

  RestedAPI.factories = function getFactory(name) {
    return name ? _factories[name] : _factories;
  };

  RestedAPI.factory = function registerFactory(name, Model) {
    if (!/^([A-Z][a-z]*)+$/.test(name)) {
      throw new Error('Factory name must begin with an uppercase');
    }

    RestedAPI[name + 'Factory'] = _factories[name] = new Factory(Model);

    return RestedAPI;
  };

  RestedAPI.helpers = {
    merge: merge,
    clone: clone,
    diff: diff,
    each: each,
    map: map,
    isType: isType,
    isArray: isArray,
    isValidIndex: isValidIndex,
    isObject: isObject,
    isString: isString,
    isNumber: isNumber,
    isNaN: isNaN,
    isFunction: isFunction,
    isUndefined: isUndefined,
    isDefined: isDefined,
    isEmpty: isEmpty
  };

  RestedAPI.constants = {};

  // Autoload default values
  _options.autoload && autoload();

  // Export module
  window.RestedAPI = RestedAPI;
  // Allow for AMD loader
  window.define && window.define([], RestedAPI);
})(window);
