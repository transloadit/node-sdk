'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var reqr = global.GENTLY ? GENTLY.hijack(require) : require;
var request = reqr('request');
var crypto = reqr('crypto');
var _ = reqr('underscore');
var fs = reqr('fs');
var retry = reqr('retry');
var PaginationStream = reqr('./PaginationStream');

var unknownErrMsg = 'Unknown error. Please report this at ';
unknownErrMsg += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error';

var TransloaditClient = function () {
  function TransloaditClient() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, TransloaditClient);

    if (opts.useSsl == null) {
      opts.useSsl = true;
    }

    if (opts.authKey == null) {
      throw new Error('Please provide an authKey');
    }

    if (opts.authSecret == null) {
      throw new Error('Please provide an authSecret');
    }

    this._authKey = opts.authKey;
    this._authSecret = opts.authSecret;
    this._service = opts.service || 'api2.transloadit.com';
    this._region = opts.region || 'us-east-1';
    this._protocol = opts.useSsl ? 'https://' : 'http://';
    this._streams = {};

    this._lastUsedAssemblyUrl = '';
  }

  _createClass(TransloaditClient, [{
    key: 'addStream',
    value: function addStream(name, stream) {
      stream.pause();
      this._streams[name] = stream;
    }
  }, {
    key: 'addFile',
    value: function addFile(name, path) {
      var stream = fs.createReadStream(path);
      stream.on('error', function (err) {
        // handle the error event to avoid the error being thrown
        console.error(err);
      });
      this.addStream(name, stream);
    }
  }, {
    key: 'getLastUsedAssemblyUrl',
    value: function getLastUsedAssemblyUrl() {
      return this._lastUsedAssemblyUrl;
    }
  }, {
    key: 'createAssembly',
    value: function createAssembly(opts, cb) {
      var _this = this;

      var defaultOpts = {
        params: {},
        fields: {},
        waitForCompletion: false
      };
      opts = _.extend(defaultOpts, opts);

      var stream = void 0;
      var callback = cb;
      var called = false;
      cb = function cb(err, result) {
        if (!called) {
          called = true;
          callback(err, result);
        }
      };

      this._lastUsedAssemblyUrl = this._serviceUrl() + '/assemblies';

      var requestOpts = {
        url: this._lastUsedAssemblyUrl,
        method: 'post',
        timeout: 24 * 60 * 60 * 1000, // 1 day
        params: opts.params,
        fields: opts.fields
      };

      var streams = function () {
        var result = [];
        for (var label in _this._streams) {
          stream = _this._streams[label];
          result.push(stream);
        }
        return result;
      }();

      var sendRequest = function sendRequest() {
        _this._remoteJson(requestOpts, function (err) {
          var result = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          // reset streams so they do not get used again in subsequent requests
          _this._streams = {};

          if (!err && result.error != null) {
            err = new Error(result.error);
          }

          if (err) {
            return cb(err);
          }

          if (!opts.waitForCompletion) {
            return cb(null, result);
          }

          _this.awaitAssemblyCompletion(result.assembly_id, cb);
        });
      };

      var ncompleted = 0;
      var streamErrCb = function streamErrCb(err) {
        if (err != null) {
          cb(err);
        }

        if (++ncompleted === streams.length) {
          sendRequest();
        }
      };

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Array.from(streams)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          stream = _step.value;

          stream.on('error', cb);

          if (stream.path == null) {
            streamErrCb(null);
            continue;
          }

          fs.access(stream.path, fs.F_OK | fs.R_OK, function (err) {
            if (err != null) {
              return streamErrCb(err);
            }

            streamErrCb(null);
          });
        }

        // make sure sendRequest gets called when there are no @_streams
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (streams.length === 0) {
        sendRequest();
      }
    }
  }, {
    key: 'awaitAssemblyCompletion',
    value: function awaitAssemblyCompletion(assemblyId, cb) {
      var _this2 = this;

      this.getAssembly(assemblyId, function (err, result) {
        if (!err && result.error != null) {
          err = new Error(result.error);
        }

        if (err) {
          return cb(err);
        }

        if (result.ok === 'ASSEMBLY_COMPLETED') {
          return cb(null, result);
        }

        if (result.ok === 'ASSEMBLY_UPLOADING' || result.ok === 'ASSEMBLY_EXECUTING') {
          return setTimeout(function () {
            _this2.awaitAssemblyCompletion(assemblyId, cb);
          }, 1 * 1000);
        }

        return cb(new Error(unknownErrMsg));
      });
    }
  }, {
    key: 'deleteAssembly',
    value: function deleteAssembly(assemblyId, cb) {
      var _this3 = this;

      this.getAssembly(assemblyId, function (err) {
        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            assembly_url = _ref.assembly_url;

        if (err != null) {
          return cb(err);
        }

        var opts = {
          url: assembly_url,
          timeout: 5000,
          method: 'del',
          params: {}
        };

        _this3._remoteJson(opts, cb);
      });
    }
  }, {
    key: 'replayAssembly',
    value: function replayAssembly(_ref2, cb) {
      var assemblyId = _ref2.assembly_id,
          notifyUrl = _ref2.notify_url;

      var requestOpts = {
        url: this._serviceUrl() + ('/assemblies/' + assemblyId + '/replay'),
        method: 'post'
      };

      if (notifyUrl != null) {
        requestOpts.params = { notifyUrl: notifyUrl };
      }

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'replayAssemblyNotification',
    value: function replayAssemblyNotification(_ref3, cb) {
      var assemblyId = _ref3.assembly_id,
          notifyUrl = _ref3.notify_url;

      var requestOpts = {
        url: this._serviceUrl() + ('/assembly_notifications/' + assemblyId + '/replay'),
        method: 'post'
      };

      if (notifyUrl != null) {
        requestOpts.params = { notifyUrl: notifyUrl };
      }

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'listAssemblyNotifications',
    value: function listAssemblyNotifications(params, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/assembly_notifications',
        method: 'get',
        params: params || {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'streamAssemblyNotifications',
    value: function streamAssemblyNotifications(params) {
      var _this4 = this;

      return new PaginationStream(function (pageno, cb) {
        _this4.listAssemblyNotifications(_.extend({}, params, { page: pageno }), cb);
      });
    }
  }, {
    key: 'listAssemblies',
    value: function listAssemblies(params, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/assemblies',
        method: 'get',
        params: params || {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'streamAssemblies',
    value: function streamAssemblies(params) {
      var _this5 = this;

      return new PaginationStream(function (pageno, cb) {
        _this5.listAssemblies(_.extend({}, params, { page: pageno }), cb);
      });
    }
  }, {
    key: 'getAssembly',
    value: function getAssembly(assemblyId, cb) {
      var _this6 = this;

      var opts = { url: this._serviceUrl() + ('/assemblies/' + assemblyId) };

      var retryOpts = {
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      };

      var operation = retry.operation(retryOpts);
      operation.attempt(function (attempt) {
        _this6._remoteJson(opts, function (err, result) {
          if (err != null) {
            if (operation.retry(err)) {
              return;
            }

            return cb(operation.mainError());
          }

          if (result.assembly_url == null || result.assembly_ssl_url == null) {
            if (operation.retry(new Error('got incomplete assembly status response'))) {
              return;
            }

            return cb(operation.mainError());
          }

          cb(null, result);
        });
      });
    }
  }, {
    key: 'createTemplate',
    value: function createTemplate(params, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/templates',
        method: 'post',
        params: params || {}
      };

      this._remoteJson(requestOpts, function (err, result) {
        var left = void 0;
        if (err) {
          return cb(err);
        }

        if (result && result.ok) {
          return cb(null, result);
        }

        err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg);
        cb(err);
      });
    }
  }, {
    key: 'editTemplate',
    value: function editTemplate(templateId, params, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/templates/' + templateId,
        method: 'put',
        params: params || {}
      };

      this._remoteJson(requestOpts, function (err, result) {
        var left = void 0;
        if (err) {
          return cb(err);
        }

        if (result && result.ok) {
          return cb(null, result);
        }

        err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg);
        cb(err);
      });
    }
  }, {
    key: 'deleteTemplate',
    value: function deleteTemplate(templateId, cb) {
      var requestOpts = {
        url: this._serviceUrl() + ('/templates/' + templateId),
        method: 'del',
        params: {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'getTemplate',
    value: function getTemplate(templateId, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/templates/' + templateId,
        method: 'get',
        params: {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'listTemplates',
    value: function listTemplates(params, cb) {
      var requestOpts = {
        url: this._serviceUrl() + '/templates',
        method: 'get',
        params: params || {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'streamTemplates',
    value: function streamTemplates(params) {
      var _this7 = this;

      return new PaginationStream(function (pageno, cb) {
        _this7.listTemplates(_.extend({}, params, { page: pageno }), cb);
      });
    }
  }, {
    key: 'getBill',
    value: function getBill(month, cb) {
      var requestOpts = {
        url: this._serviceUrl() + ('/bill/' + month),
        method: 'get',
        params: {}
      };

      this._remoteJson(requestOpts, cb);
    }
  }, {
    key: 'calcSignature',
    value: function calcSignature(params) {
      var jsonParams = this._prepareParams(params);
      var signature = this._calcSignature(jsonParams);

      return { signature: signature, params: jsonParams };
    }
  }, {
    key: '_calcSignature',
    value: function _calcSignature(toSign) {
      return crypto.createHmac('sha1', this._authSecret).update(Buffer.from(toSign, 'utf-8')).digest('hex');
    }

    // Sets the multipart/form-data for POST, PUT and DELETE requests, including
    // the streams, the signed params, and any additional fields.

  }, {
    key: '_appendForm',
    value: function _appendForm(req, params, fields) {
      var sigData = this.calcSignature(params);
      var jsonParams = sigData.params;
      var signature = sigData.signature;

      var form = req.form();

      form.append('params', jsonParams);

      if (fields == null) {
        fields = [];
      }

      for (var key in fields) {
        var val = fields[key];
        if (_.isObject(fields[key]) || _.isArray(fields[key])) {
          val = JSON.stringify(fields[key]);
        }

        form.append(key, val);
      }

      form.append('signature', signature);

      _.each(this._streams, function (value, key) {
        return form.append(key, value);
      });
    }

    // Implements HTTP GET query params, handling the case where the url already
    // has params.

  }, {
    key: '_appendParamsToUrl',
    value: function _appendParamsToUrl(url, params) {
      var sigData = this.calcSignature(params);
      var signature = sigData.signature;

      var jsonParams = sigData.params;

      if (url.indexOf('?') === -1) {
        url += '?signature=' + signature;
      } else {
        url += '&signature=' + signature;
      }

      jsonParams = encodeURIComponent(jsonParams);
      url += '&params=' + jsonParams;

      return url;
    }

    // Responsible for including auth parameters in all requests

  }, {
    key: '_prepareParams',
    value: function _prepareParams(params) {
      if (params == null) {
        params = {};
      }
      if (params.auth == null) {
        params.auth = {};
      }
      if (params.auth.key == null) {
        params.auth.key = this._authKey;
      }
      if (params.auth.expires == null) {
        params.auth.expires = this._getExpiresDate();
      }

      return JSON.stringify(params);
    }
  }, {
    key: '_getExpiresDate',
    value: function _getExpiresDate() {
      var expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 1);
      return expiresDate.toISOString();
    }
  }, {
    key: '_serviceUrl',
    value: function _serviceUrl() {
      return this._protocol + this._service;
    }

    // Wrapper around __remoteJson which will retry in case of error

  }, {
    key: '_remoteJson',
    value: function _remoteJson(opts, cb) {
      var _this8 = this;

      var operation = retry.operation({
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      });

      operation.attempt(function () {
        _this8.__remoteJson(opts, function (err, result) {
          if (err != null) {
            if (err.error === 'RATE_LIMIT_REACHED') {
              console.warn('Rate limit reached, retrying request in ' + err.info.retryIn + ' seconds.');
              // FIXME uses private internals of node-retry
              operation._timeouts.unshift(1000 * err.info.retryIn);
              return operation.retry(err);
            }

            if (err.code === 'ENOTFOUND') {
              console.warn('The network connection is down, retrying request in 3 seconds.');
              // FIXME uses private internals of node-retry
              operation._timeouts.unshift(3 * 1000);
              return operation.retry(err);
            }

            if (err.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY') {
              console.warn('Invalid auth key provided.');
              return cb(err);
            }

            if (err.error !== undefined) {
              console.warn(err.error + ' - ' + err.message);
              return cb(err);
            }
          }

          if (operation.retry(err)) {
            return;
          }

          var mainError = null;
          if (err) {
            mainError = operation.mainError();
          }

          cb(mainError, result);
        });
      });
    }

    // Responsible for making API calls. Automatically sends streams with any POST,
    // PUT or DELETE requests. Automatically adds signature parameters to all
    // requests. Also automatically parses the JSON response.

  }, {
    key: '__remoteJson',
    value: function __remoteJson(opts, cb) {
      var timeout = opts.timeout || 5000;
      var url = opts.url || null;
      var method = opts.method || 'get';

      if (!url) {
        var err = new Error('No url provided!');
        return cb(err);
      }

      if (method === 'get' && opts.params != null) {
        url = this._appendParamsToUrl(url, opts.params);
      }

      var requestOpts = {
        uri: url,
        timeout: timeout
      };

      if (opts.headers != null) {
        requestOpts.headers = opts.headers;
      }

      var req = request[method](requestOpts, function (err) {
        var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            body = _ref4.body,
            statusCode = _ref4.statusCode;

        if (err) {
          return cb(err);
        }

        // parse body
        var result = null;
        try {
          result = JSON.parse(body);
        } catch (e) {
          var abbr = ('' + body).substr(0, 255);
          var msg = 'Unable to parse JSON from \'' + requestOpts.uri + '\'. ';
          msg += 'Code: ' + statusCode + '. Body: ' + abbr + '. ';
          return cb(new Error(msg));
        }
        if (statusCode !== 200 && statusCode !== 404 && statusCode >= 400 && statusCode <= 599) {
          return cb(_.extend(new Error(), result));
        }

        return cb(null, result);
      });

      if (method === 'post' || method === 'put' || method === 'del') {
        this._appendForm(req, opts.params, opts.fields);
      }
    }
  }]);

  return TransloaditClient;
}();

module.exports = TransloaditClient;
//# sourceMappingURL=TransloaditClient.js.map