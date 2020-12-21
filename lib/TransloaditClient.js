'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var reqr = global.GENTLY ? GENTLY.hijack(require) : require;
var got = reqr('got');
var FormData = require('form-data');
var crypto = reqr('crypto');

var _reqr = reqr('lodash'),
    isObject = _reqr.isObject,
    isArray = _reqr.isArray,
    extend = _reqr.extend,
    sumBy = _reqr.sumBy,
    fromPairs = _reqr.fromPairs;

var fs = reqr('fs');

var _reqr2 = reqr('path'),
    basename = _reqr2.basename;

var retry = reqr('retry');
var PaginationStream = reqr('./PaginationStream');
var tus = reqr('tus-js-client');
var _reqr$promises = reqr('fs').promises,
    access = _reqr$promises.access,
    fsStat = _reqr$promises.stat;


var version = reqr('../package.json').version;

function unknownErrMsg(str) {
  var buff = 'Unknown error';
  if (str) {
    buff += ' ' + str;
  }
  buff += '. Please report this at ';
  buff += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error';
  return buff;
}

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
    this._files = {};

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
      this._files[name] = path;
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
     * @callback progressCb
     * @param {progressObject} progress
     *
     * @param {object} opts assembly options
     * @param {progressCb} progressCb callback function to be triggered as on each progress update of the assembly
     * @returns {Promise}
     */

  }, {
    key: 'createAssemblyAsync',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(opts, progressCb) {
        var _this = this;

        var defaultOpts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step$value, path, streamsMap, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _step2$value, label, stream, streams, streamErrorPromise, createAssemblyAndUpload;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                defaultOpts = {
                  params: {},
                  fields: {},
                  waitForCompletion: false,
                  isResumable: true
                };

                opts = _extends({}, defaultOpts, opts);

                this._lastUsedAssemblyUrl = this._serviceUrl() + '/assemblies';

                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context2.prev = 6;
                _iterator = Object.entries(this._files)[Symbol.iterator]();

              case 8:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context2.next = 15;
                  break;
                }

                _step$value = _slicedToArray(_step.value, 2), path = _step$value[1];
                _context2.next = 12;
                return access(path, fs.F_OK | fs.R_OK);

              case 12:
                _iteratorNormalCompletion = true;
                _context2.next = 8;
                break;

              case 15:
                _context2.next = 21;
                break;

              case 17:
                _context2.prev = 17;
                _context2.t0 = _context2['catch'](6);
                _didIteratorError = true;
                _iteratorError = _context2.t0;

              case 21:
                _context2.prev = 21;
                _context2.prev = 22;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 24:
                _context2.prev = 24;

                if (!_didIteratorError) {
                  _context2.next = 27;
                  break;
                }

                throw _iteratorError;

              case 27:
                return _context2.finish(24);

              case 28:
                return _context2.finish(21);

              case 29:

                // Fileless streams
                streamsMap = fromPairs(Object.entries(this._streams).map(function (_ref2) {
                  var _ref3 = _slicedToArray(_ref2, 2),
                      label = _ref3[0],
                      stream = _ref3[1];

                  return [label, { stream: stream }];
                }));

                // Create streams from files

                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context2.prev = 33;
                for (_iterator2 = Object.entries(this._files)[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  _step2$value = _slicedToArray(_step2.value, 2), label = _step2$value[0], path = _step2$value[1];
                  stream = fs.createReadStream(path);

                  stream.pause();
                  streamsMap[label] = { stream: stream, path: path };
                }

                // reset streams/files so they do not get used again in subsequent requests
                _context2.next = 41;
                break;

              case 37:
                _context2.prev = 37;
                _context2.t1 = _context2['catch'](33);
                _didIteratorError2 = true;
                _iteratorError2 = _context2.t1;

              case 41:
                _context2.prev = 41;
                _context2.prev = 42;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 44:
                _context2.prev = 44;

                if (!_didIteratorError2) {
                  _context2.next = 47;
                  break;
                }

                throw _iteratorError2;

              case 47:
                return _context2.finish(44);

              case 48:
                return _context2.finish(41);

              case 49:
                this._streams = {};
                this._files = {};

                streams = Object.values(streamsMap);

                // If any stream emits error, we want to handle this and exit with error

                streamErrorPromise = new _Promise(function (resolve, reject) {
                  streams.forEach(function (_ref4) {
                    var stream = _ref4.stream;
                    return stream.on('error', reject);
                  });
                });

                createAssemblyAndUpload = function () {
                  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                    var requestOpts, useTus, formUploadStreamsMap, tusStreamsMap, result;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            requestOpts = {
                              url: _this._lastUsedAssemblyUrl,
                              method: 'post',
                              timeout: 24 * 60 * 60 * 1000, // 1 day
                              params: opts.params,
                              fields: opts.fields

                              // const useTus = false
                            };
                            useTus = opts.isResumable && streams.every(function (_ref6) {
                              var path = _ref6.path;
                              return path;
                            });


                            if (useTus) {
                              requestOpts.tus_num_expected_upload_files = streams.length;
                            } else if (opts.isResumable) {
                              console.warn('disabling resumability because the size of one or more streams cannot be determined');
                            }

                            // upload as form multipart or tus?
                            formUploadStreamsMap = useTus ? {} : streamsMap;
                            tusStreamsMap = useTus ? streamsMap : {};
                            _context.next = 7;
                            return _this._remoteJson(requestOpts, formUploadStreamsMap);

                          case 7:
                            result = _context.sent;

                            if (!(result.error != null)) {
                              _context.next = 10;
                              break;
                            }

                            throw new Error(result.error);

                          case 10:
                            if (!(useTus && Object.keys(tusStreamsMap).length > 0)) {
                              _context.next = 13;
                              break;
                            }

                            _context.next = 13;
                            return _this._sendTusRequest(tusStreamsMap, { waitForCompletion: opts.waitForCompletion, assembly: result }, progressCb);

                          case 13:
                            if (opts.waitForCompletion) {
                              _context.next = 15;
                              break;
                            }

                            return _context.abrupt('return', result);

                          case 15:
                            return _context.abrupt('return', _this.awaitAssemblyCompletion(result.assembly_id, progressCb));

                          case 16:
                          case 'end':
                            return _context.stop();
                        }
                      }
                    }, _callee, _this);
                  }));

                  return function createAssemblyAndUpload() {
                    return _ref5.apply(this, arguments);
                  };
                }();

                return _context2.abrupt('return', _Promise.race([createAssemblyAndUpload(), streamErrorPromise]));

              case 55:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[6, 17, 21, 29], [22,, 24, 28], [33, 37, 41, 49], [42,, 44, 48]]);
      }));

      function createAssemblyAsync(_x2, _x3) {
        return _ref.apply(this, arguments);
      }

      return createAssemblyAsync;
    }()
  }, {
    key: 'awaitAssemblyCompletion',
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(assemblyId, progressCb) {
        var result;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.getAssemblyAsync(assemblyId);

              case 2:
                result = _context3.sent;

                if (!(result.error != null)) {
                  _context3.next = 5;
                  break;
                }

                throw new Error(result.error);

              case 5:
                if (!(result.ok === 'ASSEMBLY_COMPLETED')) {
                  _context3.next = 7;
                  break;
                }

                return _context3.abrupt('return', result);

              case 7:
                if (!(result.ok === 'ASSEMBLY_UPLOADING' || result.ok === 'ASSEMBLY_EXECUTING')) {
                  _context3.next = 12;
                  break;
                }

                if (progressCb) progressCb({ assemblyProgress: result });

                _context3.next = 11;
                return new _Promise(function (resolve) {
                  return setTimeout(resolve, 1 * 1000);
                });

              case 11:
                return _context3.abrupt('return', this.awaitAssemblyCompletion(assemblyId, progressCb));

              case 12:
                throw new Error(unknownErrMsg('while processing Assembly ID ' + assemblyId));

              case 13:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function awaitAssemblyCompletion(_x4, _x5) {
        return _ref7.apply(this, arguments);
      }

      return awaitAssemblyCompletion;
    }()

    /**
     * Delete the assembly
     *
     * @param {string} assemblyId assembly ID
     * @returns {Promise} after the assembly is deleted
     */

  }, {
    key: 'deleteAssemblyAsync',
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(assemblyId) {
        var _ref9, assembly_url, opts;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.getAssemblyAsync(assemblyId);

              case 2:
                _context4.t0 = _context4.sent;

                if (_context4.t0) {
                  _context4.next = 5;
                  break;
                }

                _context4.t0 = {};

              case 5:
                _ref9 = _context4.t0;
                assembly_url = _ref9.assembly_url;
                opts = {
                  url: assembly_url,
                  timeout: 5000,
                  method: 'delete'
                };
                return _context4.abrupt('return', this._remoteJson(opts));

              case 9:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function deleteAssemblyAsync(_x6) {
        return _ref8.apply(this, arguments);
      }

      return deleteAssemblyAsync;
    }()

    /**
     * Replay an Assembly
     *
     * @typedef {object} replayOptions
     * @property {string} assembly_id
     * @property {string} notify_url
     *
     * @param {replayOptions} opts options defining the Assembly to replay
     * @returns {Promise} after the replay is started
     */

  }, {
    key: 'replayAssemblyAsync',
    value: function () {
      var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(opts) {
        var assemblyId, notifyUrl, requestOpts;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                assemblyId = opts.assembly_id, notifyUrl = opts.notify_url;
                requestOpts = {
                  url: this._serviceUrl() + ('/assemblies/' + assemblyId + '/replay'),
                  method: 'post'
                };


                if (notifyUrl != null) {
                  requestOpts.params = { notifyUrl: notifyUrl };
                }

                return _context5.abrupt('return', this._remoteJson(requestOpts));

              case 4:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function replayAssemblyAsync(_x7) {
        return _ref10.apply(this, arguments);
      }

      return replayAssemblyAsync;
    }()

    /**
     * Replay an Assembly notification
     *
     * @param {replayOptions} opts options defining the Assembly to replay
     * @returns {Promise} after the replay is started
     */

  }, {
    key: 'replayAssemblyNotificationAsync',
    value: function () {
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(_ref12) {
        var assemblyId = _ref12.assembly_id,
            notifyUrl = _ref12.notify_url;
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + ('/assembly_notifications/' + assemblyId + '/replay'),
                  method: 'post'
                };


                if (notifyUrl != null) {
                  requestOpts.params = { notifyUrl: notifyUrl };
                }

                return _context6.abrupt('return', this._remoteJson(requestOpts));

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function replayAssemblyNotificationAsync(_x8) {
        return _ref11.apply(this, arguments);
      }

      return replayAssemblyNotificationAsync;
    }()

    /**
     * List all assembly notifications
     *
     * @param {object} params optional request options
     * @returns {Promise} the list of Assembly notifications
     */

  }, {
    key: 'listAssemblyNotificationsAsync',
    value: function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(params) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/assembly_notifications',
                  method: 'get',
                  params: params || {}
                };
                return _context7.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function listAssemblyNotificationsAsync(_x9) {
        return _ref13.apply(this, arguments);
      }

      return listAssemblyNotificationsAsync;
    }()
  }, {
    key: 'streamAssemblyNotifications',
    value: function streamAssemblyNotifications(params) {
      var _this2 = this;

      return new PaginationStream(function (page, cb) {
        _this2.listAssemblyNotifications(_extends({}, params, { page: page }), cb);
      });
    }

    /**
     * List all assemblies
     *
     * @param {object} params optional request options
     * @returns {Promise} list of Assemblies
     */

  }, {
    key: 'listAssembliesAsync',
    value: function () {
      var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(params) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/assemblies',
                  method: 'get',
                  params: params || {}
                };
                return _context8.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function listAssembliesAsync(_x10) {
        return _ref14.apply(this, arguments);
      }

      return listAssembliesAsync;
    }()
  }, {
    key: 'streamAssemblies',
    value: function streamAssemblies(params) {
      var _this3 = this;

      return new PaginationStream(function (page, cb) {
        _this3.listAssemblies(_extends({}, params, { page: page }), cb);
      });
    }

    /**
     * Get an Assembly
     *
     * @param {string} assemblyId the Assembly Id
     * @returns {Promise} the retrieved Assembly
     */

  }, {
    key: 'getAssemblyAsync',
    value: function () {
      var _ref15 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(assemblyId) {
        var _this4 = this;

        var opts, retryOpts;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                opts = { url: this._serviceUrl() + ('/assemblies/' + assemblyId) };
                retryOpts = {
                  retries: 5,
                  factor: 3.28,
                  minTimeout: 1 * 1000,
                  maxTimeout: 8 * 1000
                };
                return _context10.abrupt('return', new _Promise(function (resolve, reject) {
                  var operation = retry.operation(retryOpts);
                  operation.attempt(function () {
                    var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(attempt) {
                      var result;
                      return regeneratorRuntime.wrap(function _callee9$(_context9) {
                        while (1) {
                          switch (_context9.prev = _context9.next) {
                            case 0:
                              _context9.prev = 0;
                              _context9.next = 3;
                              return _this4._remoteJson(opts);

                            case 3:
                              result = _context9.sent;

                              if (!(result.assembly_url == null || result.assembly_ssl_url == null)) {
                                _context9.next = 8;
                                break;
                              }

                              if (!operation.retry(new Error('got incomplete assembly status response'))) {
                                _context9.next = 7;
                                break;
                              }

                              return _context9.abrupt('return');

                            case 7:
                              return _context9.abrupt('return', reject(operation.mainError()));

                            case 8:
                              return _context9.abrupt('return', resolve(result));

                            case 11:
                              _context9.prev = 11;
                              _context9.t0 = _context9['catch'](0);

                              if (!operation.retry(_context9.t0)) {
                                _context9.next = 15;
                                break;
                              }

                              return _context9.abrupt('return');

                            case 15:
                              return _context9.abrupt('return', reject(operation.mainError()));

                            case 16:
                            case 'end':
                              return _context9.stop();
                          }
                        }
                      }, _callee9, _this4, [[0, 11]]);
                    }));

                    return function (_x12) {
                      return _ref16.apply(this, arguments);
                    };
                  }());
                }));

              case 3:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function getAssemblyAsync(_x11) {
        return _ref15.apply(this, arguments);
      }

      return getAssemblyAsync;
    }()

    /**
     * Create an Assembly Template
     *
     * @param {object} params optional request options
     * @returns {Promise} when the template is created
     */

  }, {
    key: 'createTemplateAsync',
    value: function () {
      var _ref17 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(params) {
        var requestOpts, result, left;
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/templates',
                  method: 'post',
                  params: params || {}
                };
                _context11.next = 3;
                return this._remoteJson(requestOpts);

              case 3:
                result = _context11.sent;

                if (!(result && result.ok)) {
                  _context11.next = 6;
                  break;
                }

                return _context11.abrupt('return', result);

              case 6:
                left = void 0;
                throw new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg('while creating Template'));

              case 8:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function createTemplateAsync(_x13) {
        return _ref17.apply(this, arguments);
      }

      return createTemplateAsync;
    }()

    /**
     * Edit an Assembly Template
     *
     * @param {string} templateId the template ID
     * @param {object} params optional request options
     * @returns {Promise} when the template is edited
     */

  }, {
    key: 'editTemplateAsync',
    value: function () {
      var _ref18 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(templateId, params) {
        var requestOpts, result, left;
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/templates/' + templateId,
                  method: 'put',
                  params: params || {}
                };
                _context12.next = 3;
                return this._remoteJson(requestOpts);

              case 3:
                result = _context12.sent;

                if (!(result && result.ok)) {
                  _context12.next = 6;
                  break;
                }

                return _context12.abrupt('return', result);

              case 6:
                left = void 0;
                throw new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg);

              case 8:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function editTemplateAsync(_x14, _x15) {
        return _ref18.apply(this, arguments);
      }

      return editTemplateAsync;
    }()

    /**
     * Delete an Assembly Template
     *
     * @param {string} templateId the template ID
     * @returns {Promise} when the template is deleted
     */

  }, {
    key: 'deleteTemplateAsync',
    value: function () {
      var _ref19 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(templateId) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + ('/templates/' + templateId),
                  method: 'delete'
                };
                return _context13.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function deleteTemplateAsync(_x16) {
        return _ref19.apply(this, arguments);
      }

      return deleteTemplateAsync;
    }()

    /**
     * Get an Assembly Template
     *
     * @param {string} templateId the template ID
     * @returns {Promise} when the template is retrieved
     */

  }, {
    key: 'getTemplateAsync',
    value: function () {
      var _ref20 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(templateId) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/templates/' + templateId,
                  method: 'get'
                };
                return _context14.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function getTemplateAsync(_x17) {
        return _ref20.apply(this, arguments);
      }

      return getTemplateAsync;
    }()

    /**
     * List all Assembly Templates
     *
     * @param {object} params optional request options
     * @returns {Promise} the list of templates
     */

  }, {
    key: 'listTemplatesAsync',
    value: function () {
      var _ref21 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15(params) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + '/templates',
                  method: 'get',
                  params: params || {}
                };
                return _context15.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function listTemplatesAsync(_x18) {
        return _ref21.apply(this, arguments);
      }

      return listTemplatesAsync;
    }()
  }, {
    key: 'streamTemplates',
    value: function streamTemplates(params) {
      var _this5 = this;

      return new PaginationStream(function (page, cb) {
        _this5.listTemplates(_extends({}, params, { page: page }), cb);
      });
    }

    /**
     * Get account Billing details for a specific month
     *
     * @param {string} month the date for the required billing in the format yyyy-mm
     * @returns {Promise} with billing data
     */

  }, {
    key: 'getBillAsync',
    value: function () {
      var _ref22 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16(month) {
        var requestOpts;
        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                requestOpts = {
                  url: this._serviceUrl() + ('/bill/' + month),
                  method: 'get'
                };
                return _context16.abrupt('return', this._remoteJson(requestOpts));

              case 2:
              case 'end':
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function getBillAsync(_x19) {
        return _ref22.apply(this, arguments);
      }

      return getBillAsync;
    }()
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
    value: function _appendForm(form, params, streamsMap, fields) {
      var sigData = this.calcSignature(params);
      var jsonParams = sigData.params;
      var signature = sigData.signature;


      form.append('params', jsonParams);

      if (fields != null) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = Object.entries(fields)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _step3$value = _slicedToArray(_step3.value, 2),
                key = _step3$value[0],
                val = _step3$value[1];

            // TODO isn't an array already an object?
            if (isObject(val) || isArray(val)) {
              val = JSON.stringify(val);
            }
            form.append(key, val);
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

      form.append('signature', signature);

      if (streamsMap) {
        Object.entries(streamsMap).forEach(function (_ref23) {
          var _ref24 = _slicedToArray(_ref23, 2),
              label = _ref24[0],
              _ref24$ = _ref24[1],
              stream = _ref24$.stream,
              path = _ref24$.path;

          var options = path ? undefined : { filename: label // https://github.com/transloadit/node-sdk/issues/86
          };form.append(label, stream, options);
        });
      }
    }

    // Implements HTTP GET query params, handling the case where the url already
    // has params.

  }, {
    key: '_appendParamsToUrl',
    value: function _appendParamsToUrl(url, params) {
      var sigData = this.calcSignature(params);
      var signature = sigData.signature;

      var jsonParams = sigData.params;

      // TODO could be improved (potentially buggy)
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
    value: function () {
      var _ref25 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee18(opts, streamsMap) {
        var _this6 = this;

        var operation;
        return regeneratorRuntime.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                operation = retry.operation({
                  retries: 5,
                  factor: 3.28,
                  minTimeout: 1 * 1000,
                  maxTimeout: 8 * 1000
                });
                return _context18.abrupt('return', new _Promise(function (resolve, reject) {
                  operation.attempt(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee17() {
                    var msg;
                    return regeneratorRuntime.wrap(function _callee17$(_context17) {
                      while (1) {
                        switch (_context17.prev = _context17.next) {
                          case 0:
                            _context17.prev = 0;
                            _context17.t0 = resolve;
                            _context17.next = 4;
                            return _this6.__remoteJson(opts, streamsMap);

                          case 4:
                            _context17.t1 = _context17.sent;
                            (0, _context17.t0)(_context17.t1);
                            _context17.next = 31;
                            break;

                          case 8:
                            _context17.prev = 8;
                            _context17.t2 = _context17['catch'](0);

                            if (!(_context17.t2.error === 'RATE_LIMIT_REACHED')) {
                              _context17.next = 14;
                              break;
                            }

                            console.warn('Rate limit reached, retrying request in ' + _context17.t2.info.retryIn + ' seconds.');
                            // FIXME uses private internals of node-retry
                            operation._timeouts.unshift(1000 * _context17.t2.info.retryIn);
                            return _context17.abrupt('return', operation.retry(_context17.t2));

                          case 14:
                            if (!(_context17.t2.code === 'ENOTFOUND')) {
                              _context17.next = 18;
                              break;
                            }

                            console.warn('The network connection is down, retrying request in 3 seconds.');
                            // FIXME uses private internals of node-retry
                            operation._timeouts.unshift(3 * 1000);
                            return _context17.abrupt('return', operation.retry(_context17.t2));

                          case 18:
                            if (!(_context17.t2.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY')) {
                              _context17.next = 21;
                              break;
                            }

                            console.warn('Invalid auth key provided.');
                            return _context17.abrupt('return', reject(_context17.t2));

                          case 21:
                            if (!(_context17.t2.error !== undefined)) {
                              _context17.next = 28;
                              break;
                            }

                            msg = [];

                            if (_context17.t2.error) {
                              msg.push(_context17.t2.error);
                            }
                            if (opts.url) {
                              msg.push(opts.url);
                            }
                            if (_context17.t2.message) {
                              msg.push(_context17.t2.message);
                            }

                            console.warn(msg.join(' - '));
                            return _context17.abrupt('return', reject(_context17.t2));

                          case 28:
                            if (!operation.retry(_context17.t2)) {
                              _context17.next = 30;
                              break;
                            }

                            return _context17.abrupt('return');

                          case 30:

                            reject(operation.mainError());

                          case 31:
                          case 'end':
                            return _context17.stop();
                        }
                      }
                    }, _callee17, _this6, [[0, 8]]);
                  })));
                }));

              case 2:
              case 'end':
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function _remoteJson(_x20, _x21) {
        return _ref25.apply(this, arguments);
      }

      return _remoteJson;
    }()

    // Responsible for making API calls. Automatically sends streams with any POST,
    // PUT or DELETE requests. Automatically adds signature parameters to all
    // requests. Also automatically parses the JSON response.

  }, {
    key: '__remoteJson',
    value: function () {
      var _ref27 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee19(opts, streamsMap) {
        var timeout, url, method, params, form, extraData, uploadingStreams, requestOpts, _ref28, body, _err$response, statusCode, _body, extendedMessage;

        return regeneratorRuntime.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                timeout = opts.timeout || 5000;
                url = opts.url || null;
                method = opts.method || 'get';
                params = opts.params || {};

                if (url) {
                  _context19.next = 6;
                  break;
                }

                throw new Error('No url provided!');

              case 6:

                if (method === 'get') {
                  url = this._appendParamsToUrl(url, params);
                }

                form = void 0;


                if (method === 'post' || method === 'put' || method === 'delete') {
                  extraData = _extends({}, opts.fields);

                  if (opts.tus_num_expected_upload_files) {
                    extraData.tus_num_expected_upload_files = opts.tus_num_expected_upload_files;
                  }
                  form = new FormData();
                  this._appendForm(form, params, streamsMap, extraData);
                }

                uploadingStreams = streamsMap && Object.keys(streamsMap).length > 0;
                requestOpts = {
                  body: form,
                  timeout: timeout,
                  headers: _extends({
                    'Transloadit-Client': 'node-sdk:' + version
                  }, opts.headers),
                  responseType: 'json'

                  // https://github.com/form-data/form-data/issues/394#issuecomment-573595015
                };
                if (uploadingStreams) requestOpts.headers['transfer-encoding'] = 'chunked';

                _context19.prev = 12;
                _context19.next = 15;
                return got[method](url, requestOpts);

              case 15:
                _ref28 = _context19.sent;
                body = _ref28.body;
                return _context19.abrupt('return', body);

              case 20:
                _context19.prev = 20;
                _context19.t0 = _context19['catch'](12);

                if (!(_context19.t0 instanceof got.HTTPError)) {
                  _context19.next = 29;
                  break;
                }

                _err$response = _context19.t0.response, statusCode = _err$response.statusCode, _body = _err$response.body;
                // console.log(statusCode, body)

                if (!(statusCode === 404 || statusCode > 599)) {
                  _context19.next = 26;
                  break;
                }

                return _context19.abrupt('return', _body);

              case 26:
                extendedMessage = {};

                if (_body.message && _body.error) {
                  extendedMessage.message = _body.error + ': ' + _body.message;
                }
                throw extend(new Error(), _body, extendedMessage);

              case 29:
                throw _context19.t0;

              case 30:
              case 'end':
                return _context19.stop();
            }
          }
        }, _callee19, this, [[12, 20]]);
      }));

      function __remoteJson(_x22, _x23) {
        return _ref27.apply(this, arguments);
      }

      return __remoteJson;
    }()
  }, {
    key: '_sendTusRequest',
    value: function () {
      var _ref29 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee21(streamsMap, opts, onProgress) {
        var uploadSingleStream = function () {
          var _ref30 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee20(label) {
            var _streamsMap$label, stream, path, size, onTusProgress, filename;

            return regeneratorRuntime.wrap(function _callee20$(_context20) {
              while (1) {
                switch (_context20.prev = _context20.next) {
                  case 0:
                    uploadProgresses[label] = 0;

                    _streamsMap$label = streamsMap[label], stream = _streamsMap$label.stream, path = _streamsMap$label.path;
                    size = sizes[label];

                    onTusProgress = function onTusProgress(bytesUploaded) {
                      uploadProgresses[label] = bytesUploaded;

                      // get all uploaded bytes for all files
                      var uploadedBytes = sumBy(streamLabels, function (label) {
                        return uploadProgresses[label];
                      });

                      // don't send redundant progress
                      if (lastEmittedProgress < uploadedBytes) {
                        lastEmittedProgress = uploadedBytes;
                        onProgress({ uploadProgress: { uploadedBytes: uploadedBytes, totalBytes: totalBytes } });
                      }
                    };

                    filename = path ? basename(path) : label;
                    _context20.next = 7;
                    return new _Promise(function (resolve, reject) {
                      var tusUpload = new tus.Upload(stream, {
                        endpoint: opts.assembly.tus_url,
                        resume: true,
                        metadata: {
                          assembly_url: opts.assembly.assembly_ssl_url,
                          fieldname: label,
                          filename: filename
                        },
                        uploadSize: size,
                        onError: reject,
                        onProgress: onTusProgress,
                        onSuccess: resolve
                      });

                      tusUpload.start();
                    });

                  case 7:
                  case 'end':
                    return _context20.stop();
                }
              }
            }, _callee20, this);
          }));

          return function uploadSingleStream(_x27) {
            return _ref30.apply(this, arguments);
          };
        }();

        // TODO throttle concurrency? Can use p-map


        var streamLabels, totalBytes, lastEmittedProgress, sizes, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, label, path, _ref31, size, uploadProgresses, promises;

        return regeneratorRuntime.wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                streamLabels = Object.keys(streamsMap);
                totalBytes = 0;
                lastEmittedProgress = 0;

                onProgress = onProgress || function () {};

                sizes = {};

                // Initialize data

                _iteratorNormalCompletion4 = true;
                _didIteratorError4 = false;
                _iteratorError4 = undefined;
                _context21.prev = 8;
                _iterator4 = streamLabels[Symbol.iterator]();

              case 10:
                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                  _context21.next = 23;
                  break;
                }

                label = _step4.value;
                path = streamsMap[label].path;

                if (!path) {
                  _context21.next = 20;
                  break;
                }

                _context21.next = 16;
                return fsStat(path);

              case 16:
                _ref31 = _context21.sent;
                size = _ref31.size;

                sizes[label] = size;
                totalBytes += size;

              case 20:
                _iteratorNormalCompletion4 = true;
                _context21.next = 10;
                break;

              case 23:
                _context21.next = 29;
                break;

              case 25:
                _context21.prev = 25;
                _context21.t0 = _context21['catch'](8);
                _didIteratorError4 = true;
                _iteratorError4 = _context21.t0;

              case 29:
                _context21.prev = 29;
                _context21.prev = 30;

                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                  _iterator4.return();
                }

              case 32:
                _context21.prev = 32;

                if (!_didIteratorError4) {
                  _context21.next = 35;
                  break;
                }

                throw _iteratorError4;

              case 35:
                return _context21.finish(32);

              case 36:
                return _context21.finish(29);

              case 37:
                uploadProgresses = {};
                promises = streamLabels.map(function (label) {
                  return uploadSingleStream(label);
                });
                _context21.next = 41;
                return _Promise.all(promises);

              case 41:
              case 'end':
                return _context21.stop();
            }
          }
        }, _callee21, this, [[8, 25, 29, 37], [30,, 32, 36]]);
      }));

      function _sendTusRequest(_x24, _x25, _x26) {
        return _ref29.apply(this, arguments);
      }

      return _sendTusRequest;
    }()

    // Legacy callback endpoints: TODO remove?

  }, {
    key: 'createAssembly',
    value: function createAssembly(opts, cb, progressCb) {
      this.createAssemblyAsync(opts, progressCb).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'deleteAssembly',
    value: function deleteAssembly(assembyId, cb) {
      this.deleteAssemblyAsync(assembyId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'replayAssembly',
    value: function replayAssembly(opts, cb) {
      this.replayAssemblyAsync(opts).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'replayAssemblyNotification',
    value: function replayAssemblyNotification(opts, cb) {
      this.replayAssemblyNotificationAsync(opts).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'listAssemblyNotifications',
    value: function listAssemblyNotifications(params, cb) {
      this.listAssemblyNotificationsAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'listAssemblies',
    value: function listAssemblies(params, cb) {
      this.listAssembliesAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'getAssembly',
    value: function getAssembly(assembyId, cb) {
      this.getAssemblyAsync(assembyId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'createTemplate',
    value: function createTemplate(params, cb) {
      this.createTemplateAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'editTemplate',
    value: function editTemplate(templateId, params, cb) {
      this.editTemplateAsync(templateId, params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'deleteTemplate',
    value: function deleteTemplate(templateId, cb) {
      this.deleteTemplateAsync(templateId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'getTemplate',
    value: function getTemplate(templateId, cb) {
      this.getTemplateAsync(templateId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'listTemplates',
    value: function listTemplates(params, cb) {
      this.listTemplatesAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }, {
    key: 'getBill',
    value: function getBill(month, cb) {
      this.getBillAsync(month).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }
  }]);

  return TransloaditClient;
}();

module.exports = TransloaditClient;
//# sourceMappingURL=TransloaditClient.js.map