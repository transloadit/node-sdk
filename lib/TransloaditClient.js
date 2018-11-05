'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var reqr = global.GENTLY ? GENTLY.hijack(require) : require;
var request = reqr('request');
var crypto = reqr('crypto');
var _ = reqr('underscore');
var fs = reqr('fs');
var path = reqr('path');
var retry = reqr('retry');
var PaginationStream = reqr('./PaginationStream');
var Readable = reqr('stream').Readable;
var tus = reqr('tus-js-client');
var version = reqr('../package.json').version;

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
    this._protocol = opts.useSsl ? 'https://' : 'http://';
    this._streams = {};
    this._tus_streams = {};

    this._lastUsedAssemblyUrl = '';
  }

  /**
   * Adds an Assembly file stream
   *
   * @param {string} name fieldname of the file
   * @param {ReadableStream} stream stream to be uploaded
   */


  _createClass(TransloaditClient, [{
    key: 'addStream',
    value: function addStream(name, stream) {
      stream.pause();
      this._streams[name] = stream;
    }

    /**
     * Adds an Assembly file
     *
     * @param {string} name field name of the file
     * @param {string} path path to the file
     */

  }, {
    key: 'addFile',
    value: function addFile(name, path) {
      var _this = this;

      var stream = fs.createReadStream(path);
      stream.on('error', function (err) {
        // handle the error event to avoid the error being thrown
        console.error(err);

        if (_this._streams[name]) {
          delete _this._streams[name];
        }
      });
      this.addStream(name, stream);
    }
  }, {
    key: 'getLastUsedAssemblyUrl',
    value: function getLastUsedAssemblyUrl() {
      return this._lastUsedAssemblyUrl;
    }

    /**
     * Create an Assembly
     *
     * @typedef {object} progressObject
     * @property {object} assemblyProgress
     * @property {{totalBytes: number, uploadedBytes: number}} uploadProgress
     *
     * @callback onProgress
     * @param {progressObject} progress
     *
     * @param {object} opts assembly options
     * @param {function} cb callback function for when assembly is submitted/done
     * @param {onProgress} progressCb callback function to be triggered as on each progress update of the assembly
     */

  }, {
    key: 'createAssembly',
    value: function createAssembly(opts, cb, progressCb) {
      var _this2 = this;

      var defaultOpts = {
        params: {},
        fields: {},
        waitForCompletion: false,
        isResumable: true
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

      var streams = function () {
        var result = [];
        for (var label in _this2._streams) {
          stream = _this2._streams[label];
          result.push(stream);
        }
        return result;
      }();

      var requestOpts = {
        url: this._lastUsedAssemblyUrl,
        method: 'post',
        timeout: 24 * 60 * 60 * 1000, // 1 day
        params: opts.params,
        fields: opts.fields
      };

      if (opts.isResumable && this._canGetStreamSizes()) {
        requestOpts.tus_num_expected_upload_files = streams.length;
        // transfer streams to tus streams so they don't get uploaded as multipart
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = Object.keys(this._streams)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var label = _step.value;

            this._tus_streams[label] = this._streams[label];
            delete this._streams[label];
          }
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
      } else if (opts.isResumable) {
        opts.isResumable = false;
        console.warn('disabling resumability because the size of one or more streams cannot be determined');
      }

      var sendRequest = function sendRequest() {
        _this2._remoteJson(requestOpts, function (err) {
          var result = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          // reset streams so they do not get used again in subsequent requests
          _this2._streams = {};

          if (!err && result.error != null) {
            err = new Error(result.error);
          }

          if (err) {
            return cb(err);
          }

          if (!opts.isResumable || !Object.keys(_this2._tus_streams).length) {
            if (!opts.waitForCompletion) {
              return cb(null, result);
            }

            return _this2.awaitAssemblyCompletion(result.assembly_id, cb, progressCb);
          }

          var tusOpts = { waitForCompletion: opts.waitForCompletion, assembly: result };
          _this2._sendTusRequest(tusOpts, cb, progressCb);
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

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Array.from(streams)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          stream = _step2.value;

          stream.on('error', cb);

          // because an http response stream could also have a "path"
          // attribute but not referring to the local file system
          // see https://github.com/transloadit/node-sdk/pull/50#issue-261982855
          if (stream.path == null || !(stream instanceof Readable)) {
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
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (streams.length === 0) {
        sendRequest();
      }
    }
  }, {
    key: 'awaitAssemblyCompletion',
    value: function awaitAssemblyCompletion(assemblyId, cb, progressCb) {
      var _this3 = this;

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
          setTimeout(function () {
            _this3.awaitAssemblyCompletion(assemblyId, cb);
          }, 1 * 1000);

          if (progressCb) {
            progressCb({ assemblyProgress: result });
          }

          return;
        }

        return cb(new Error(unknownErrMsg));
      });
    }

    /**
     * Delete the assembly
     *
     * @param {string} assemblyId assembly ID
     * @param {function} cb callback function after the assembly is deleted
     */

  }, {
    key: 'deleteAssembly',
    value: function deleteAssembly(assemblyId, cb) {
      var _this4 = this;

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

        _this4._remoteJson(opts, cb);
      });
    }

    /**
     * Replay an Assembly
     *
     * @typedef {object} replayOptions
     * @property {string} assembly_id
     * @property {string} notify_url
     *
     * @param {replayOptions} opts options defining the Assembly to replay
     * @param {function} cb callback function after the replay is started
     */

  }, {
    key: 'replayAssembly',
    value: function replayAssembly(opts, cb) {
      var assemblyId = opts.assembly_id,
          notifyUrl = opts.notify_url;

      var requestOpts = {
        url: this._serviceUrl() + ('/assemblies/' + assemblyId + '/replay'),
        method: 'post'
      };

      if (notifyUrl != null) {
        requestOpts.params = { notifyUrl: notifyUrl };
      }

      this._remoteJson(requestOpts, cb);
    }

    /**
     * Replay an Assembly notification
     *
     * @param {replayOptions} opts options defining the Assembly to replay
     * @param {function} cb callback function after the replay is started
     */

  }, {
    key: 'replayAssemblyNotification',
    value: function replayAssemblyNotification(_ref2, cb) {
      var assemblyId = _ref2.assembly_id,
          notifyUrl = _ref2.notify_url;

      var requestOpts = {
        url: this._serviceUrl() + ('/assembly_notifications/' + assemblyId + '/replay'),
        method: 'post'
      };

      if (notifyUrl != null) {
        requestOpts.params = { notifyUrl: notifyUrl };
      }

      this._remoteJson(requestOpts, cb);
    }

    /**
     * List all assembly notifications
     *
     * @param {object} params optional request options
     * @param {function} cb callback function triggered with the list of Assembly notifications
     */

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
      var _this5 = this;

      return new PaginationStream(function (pageno, cb) {
        _this5.listAssemblyNotifications(_.extend({}, params, { page: pageno }), cb);
      });
    }

    /**
     * List all assemblies
     *
     * @param {object} params optional request options
     * @param {function} cb callback function triggered with the list of Assemblies
     */

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
      var _this6 = this;

      return new PaginationStream(function (pageno, cb) {
        _this6.listAssemblies(_.extend({}, params, { page: pageno }), cb);
      });
    }

    /**
     * Get an Assembly
     *
     * @param {string} assemblyId the Assembly Id
     * @param {function} cb callback function triggered with the retrieved Assembly
     */

  }, {
    key: 'getAssembly',
    value: function getAssembly(assemblyId, cb) {
      var _this7 = this;

      var opts = { url: this._serviceUrl() + ('/assemblies/' + assemblyId) };

      var retryOpts = {
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      };

      var operation = retry.operation(retryOpts);
      operation.attempt(function (attempt) {
        _this7._remoteJson(opts, function (err, result) {
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

    /**
     * Create an Assembly Template
     *
     * @param {object} params optional request options
     * @param {function} cb callback function triggered when the template is created
     */

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

    /**
     * Edit an Assembly Template
     *
     * @param {string} templateId the template ID
     * @param {object} params optional request options
     * @param {function} cb callback function triggered when the template is edited
     */

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

    /**
     * Delete an Assembly Template
     *
     * @param {string} templateId the template ID
     * @param {function} cb callback function triggered when the template is deleted
     */

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

    /**
     * Get an Assembly Template
     *
     * @param {string} templateId the template ID
     * @param {function} cb callback function triggered when the template is retrieved
     */

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

    /**
     * List all Assembly Templates
     *
     * @param {object} params optional request options
     * @param {function} cb callback function triggered when the templates are retrieved
     */

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
      var _this8 = this;

      return new PaginationStream(function (pageno, cb) {
        _this8.listTemplates(_.extend({}, params, { page: pageno }), cb);
      });
    }

    /**
     * Get account Billing details for a specific month
     *
     * @param {string} month the date for the required billing in the format yyyy-mm
     * @param {function} cb callback function triggered when the billing is retrieved
     */

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
        fields = {};
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
      var _this9 = this;

      var operation = retry.operation({
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      });

      operation.attempt(function () {
        _this9.__remoteJson(opts, function (err, result) {
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
              var msg = [];
              if (err.error) {
                msg.push(err.error);
              }
              if (opts.url) {
                msg.push(opts.url);
              }
              if (err.message) {
                msg.push(err.message);
              }

              console.warn(msg.join(' - '));
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
        timeout: timeout,
        headers: {
          'Transloadit-Client': 'node-sdk:' + version
        }
      };

      if (opts.headers != null) {
        _.extend(requestOpts.headers, opts.headers);
      }

      var req = request[method](requestOpts, function (err) {
        var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            body = _ref3.body,
            statusCode = _ref3.statusCode;

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
        var extraData = _extends({}, opts.fields);
        if (opts.tus_num_expected_upload_files) {
          extraData.tus_num_expected_upload_files = opts.tus_num_expected_upload_files;
        }
        this._appendForm(req, opts.params, extraData);
      }
    }

    // @todo support size retrieval for other streams

  }, {
    key: '_canGetStreamSizes',
    value: function _canGetStreamSizes() {
      for (var label in this._streams) {
        var stream = this._streams[label];
        // the request module has path attribute that is different from file path
        // but it also has the attribute httpModule
        if (!(stream.path && !stream.httpModule)) {
          return false;
        }
      }

      return true;
    }
  }, {
    key: '_sendTusRequest',
    value: function _sendTusRequest(opts, cb, onProgress) {
      var _this10 = this;

      var uploadsDone = 0;
      var streamLabels = Object.keys(this._tus_streams);
      var tlClient = this;
      var totalBytes = 0;
      var lastEmittedProgress = 0;
      var uploadProgresses = {};
      onProgress = onProgress || function () {};
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        var _loop = function _loop() {
          var label = _step3.value;

          var file = _this10._tus_streams[label];
          fs.stat(file.path, function (err, _ref4) {
            var size = _ref4.size;

            if (err) {
              return cb(err);
            }

            var uploadSize = size;
            totalBytes += uploadSize;
            uploadProgresses[label] = 0;
            var onTusProgress = function onTusProgress(bytesUploaded) {
              uploadProgresses[label] = bytesUploaded;
              // get all uploaded bytes for all files
              var uploadedBytes = streamLabels.reduce(function (label1, label2) {
                return uploadProgresses[label1] + uploadProgresses[label2];
              });
              // don't send redundant progress
              if (lastEmittedProgress < uploadedBytes) {
                lastEmittedProgress = uploadedBytes;
                onProgress({ uploadProgress: { uploadedBytes: uploadedBytes, totalBytes: totalBytes } });
              }
            };

            var filename = file.path ? path.basename(file.path) : label;
            var tusUpload = new tus.Upload(file, {
              endpoint: opts.assembly.tus_url,
              resume: true,
              metadata: {
                assembly_url: opts.assembly.assembly_ssl_url,
                fieldname: label,
                filename: filename
              },
              uploadSize: uploadSize,
              onError: cb,
              onProgress: onTusProgress,
              onSuccess: function onSuccess() {
                uploadsDone++;
                if (uploadsDone === streamLabels.length) {
                  tlClient._tus_streams = {};
                  if (opts.waitForCompletion) {
                    tlClient.awaitAssemblyCompletion(opts.assembly.assembly_id, cb, onProgress);
                  } else {
                    cb(null, opts.assembly);
                  }
                }
              }
            });

            tusUpload.start();
          });
        };

        for (var _iterator3 = streamLabels[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          _loop();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }]);

  return TransloaditClient;
}();

module.exports = TransloaditClient;
//# sourceMappingURL=TransloaditClient.js.map