/**
 * Marshall Library
 *
 * @author John Cui <johnrcui@gmail.com>
 * @description
 *
 * A convenient way for validating, normalizing,
 * and transforming data
 *
 */

'use strict';

var _     = require('underscore');
var Promise = global.Promise;

/**
 * Default messages to validation errors
 *
 * @var  {object}   _messages
 */
var _messages = {
  required    : 'This is a required field.',
  numeric     : 'This field must a numeric value.',
  integer     : 'This field must be an integer value.',
  decimal     : 'This field must be a decimal value.',
  email       : 'This field must be an email address'
};

/**
 * Marshall Class Object
 *
 * @class  Marshall
 */
function Marshall() {
  var _this_ = this;
  var params = Array.prototype.slice.call(arguments);
  var passing;
  var failing;
  var reformed;
  var errors;

  /**
   * Transform a data object
   * If called immediately after enforce,
   * `suspect` parameter is optional and
   * will perform the transformation rules
   * on the validated data
   *
   * @param  {object}   [suspect]
   * @param  {object}   rules
   * @return {object|this}
   */
  function reform(suspect, rules) {
    var probationary = {};
    var returnResults = true;

    if (arguments.length === 1) {
      rules = suspect;
      suspect = passing;
      probationary = reformed;
      returnResults = false;
    }

    _.each(suspect, (value, oldKey) => {
      var newKey = rules[oldKey];

      if (newKey) {
        console.log(`Renaming '${oldKey}' to '${newKey}'.`);
        probationary[newKey] = value;
      } else {
        probationary[oldKey] = value;
      }
    });

    console.log(`Reformed Object: `, probationary);

    return returnResults ? probationary : _this_;
  }

  /**
   * Apply validation rules and generate a set
   * of objects containing passing, failing, and
   * error fields
   *
   * @param  {object}   suspect
   * @param  {object}   rules
   * @param  {object}   [messages]
   * @return {this}
   */
  function enforce(suspect, rules, messages) {
    suspect   = suspect || {};
    reformed  = {};
    passing   = {};
    failing   = {};
    errors    = {};
    messages  = _.isObject(messages) ? _.extend({}, _messages, messages) : _.extend({}, _messages);

    _.each(rules, (rule, key) => {
      var articles = rule.split('|');
      var passes = true;
      var value = suspect[key];

      _.each(articles, (article) => {
        var terms = article.split(':');
        var clause = terms.shift();
        var valid = false;

        switch (clause) {
          case 'required':
            valid = !(_.isUndefined(value) || _.isNull(value));
            break;
          case 'optional':
            valid = true;
            if (_.isNull(value) || _.isEmpty(value)) {
              value = void 0;
            }
            break;
          case 'numeric':
            valid = /^(?:\-|\+)?[0-9]+(?:\.[0-9]+)?$/.test('' + value);
            break;
          case 'int':
          case 'integer':
            valid = /^(?:\-|\+)?[0-9]+$/.test('' + value);
            value = valid && parseInt(value) || value;
            break;
          case 'float':
          case 'double':
          case 'decimal':
            valid = /^(?:\-|\+)?(?:\.[0-9]+|[0-9]+(?:\.[0-9]+)?)$/.test('' + value);
            value = valid && parseFloat(value) || value;
            break;
          case 'email':
            value = value && value.trim();
            valid = /^[A-Za-z0-9\u0430-\u044F\u0410-\u042F\._-]+@([A-Za-z0-9\u0430-\u044F\u0410-\u042F]{1,2}|[A-Za-z0-9\u0430-\u044F\u0410-\u042F]((?!(\.\.))[A-Za-z0-9\u0430-\u044F\u0410-\u042F.-])+[A-Za-z0-9\u0430-\u044F\u0410-\u042F])\.[A-Za-z\u0430-\u044F\u0410-\u042F]{2,}$/i.test('' + value);
            break;
        }

        if (valid) {
          console.log(`${key} passes ${clause} validation.`);
        } else {
          console.log(`${key} fails ${clause} validation`);
          if (messages[clause]) {
            if (!errors[key]) {
              errors[key] = [];
            }
            errors[key].push(messages[clause]);
          }
        }

        passes = valid && passes;
      });

      if (passes && !_.isUndefined(value)) {
        passing[key] = value;
      } else {
        failing[key] = suspect[key];
      }
    });

    console.log('Passing Object: ', passing);
    console.log('Failing Object: ', failing);
    return _this_;
  }

  /**
   * Determine if enforcement passes
   * @return {boolean}
   */
  function passes() {
    return _.isEmpty(failing);
  }

  /**
   * Determin if enforcement failes
   *
   * @return {boolean}
   */
  function fails() {
    return !_.isEmpty(failing);
  }

  /**
   * Return the passing data object
   *
   * @return {object}
   */
  function getPassing() {
    return passing;
  }

  /**
   * Return the reformed data object
   *
   * @return {object}
   */
  function getReformed() {
    return reformed;
  }

  /**
   * Return the failing data object
   *
   * @return {object}
   */
  function getFailing() {
    return failing;
  }

  /**
   * Return the validation errors generated
   * during enforcement
   *
   * @return {object}
   */
  function getErrors() {
    return errors;
  }

  /**
   * Return a promise object reflecting the
   * state of the enforcement. A successfully
   * validation will resolve the promise, while
   * failure will reject the pomise. This is
   * convenient for chaining validation with
   * other asynchronous methods
   *
   * @return {Promise}
   */
  function getPromise() {
    return new Promise((resolve, reject) => {
      if (passes()) {
        let result = _.isObject(reformed) && Object.keys(reformed).length ? reformed : passing;
        resolve(result);
      } else {
        let err = new Error('Validation failed!');
        err.messages = errors;
        reject(err);
      }
    });
  }

  /**
   * Publish methods as public methods of
   * a class instance
   *
   * @return void
   */
  function publish() {
    _this_.enforce  = enforce;
    _this_.reform   = reform;
    _this_.passes   = passes;
    _this_.fails    = fails;
    _this_.promise  = getPromise;
    _this_.passing  = getPassing;
    _this_.failing  = getFailing;
    _this_.errors   = getErrors;
    _this_.reformed = getReformed;
  }

  /**
   * Initialize the class to allow for static
   * method chaining
   *
   * @return {Marshall}
   */
  function init() {
    var instance;
    if (_this_) {
      instance = _this_;
      publish();
      if (params.length) {
        enforce.apply(_this_, params);
      }
    } else {
      instance = Object.create(Marshall.prototype);
      Marshall.apply(instance, params);
    }

    return instance;
  }

  return init();
}

module.exports = Marshall;
