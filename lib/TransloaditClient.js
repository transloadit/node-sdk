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
var _ = reqr('underscore');
var fs = reqr('fs');
var path = reqr('path');
var retry = reqr('retry');
var PaginationStream = reqr('./PaginationStream');
var Readable = reqr('stream').Readable;
var tus = reqr('tus-js-client');
var access = reqr('fs').promises.access;


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

// @todo support size retrieval for other streams
function canGetStreamSizes(streams) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = streams[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var stream = _step.value;

      // the request module has path attribute that is different from file path
      // but it also has the attribute httpModule
      if (!(stream.path && !stream.httpModule)) {
        return false;
      }
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

  return true;
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
  }, {
    key: 'createAssembly',
    value: function createAssembly(opts, cb, progressCb) {
      return this.createAssemblyAsync(opts, progressCb).then(function (val) {
        return cb(null, val);
      }).catch(cb);
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
        var _this2 = this;

        var defaultOpts, requestOpts, streamsMap, streams, useTus, tusStreamsMap, streamErrorPromise, mainPromise;
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

                requestOpts = {
                  url: this._lastUsedAssemblyUrl,
                  method: 'post',
                  timeout: 24 * 60 * 60 * 1000, // 1 day
                  params: opts.params,
                  fields: opts.fields
                };
                streamsMap = this._streams;
                streams = Object.values(streamsMap);

                // reset streams so they do not get used again in subsequent requests

                this._streams = {};

                // TODO imrpvoe all this
                useTus = opts.isResumable && canGetStreamSizes(streams);
                tusStreamsMap = useTus ? streamsMap : {};

                if (useTus) {
                  requestOpts.tus_num_expected_upload_files = streams.length;
                  // make sure they don't get uploaded as multipart (will use tus instead)
                  streamsMap = {};
                  streams = [];
                } else if (opts.isResumable) {
                  opts.isResumable = false;
                  console.warn('disabling resumability because the size of one or more streams cannot be determined');
                }

                // If any stream emits error, we exit with error
                streamErrorPromise = new _Promise(function (resolve, reject) {
                  streams.forEach(function (stream) {
                    return stream.on('error', reject);
                  });
                });
                mainPromise = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                  var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, stream, result;

                  return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _iteratorNormalCompletion2 = true;
                          _didIteratorError2 = false;
                          _iteratorError2 = undefined;
                          _context.prev = 3;
                          _iterator2 = streams[Symbol.iterator]();

                        case 5:
                          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                            _context.next = 13;
                            break;
                          }

                          stream = _step2.value;

                          if (!(!stream.path == null && stream instanceof Readable)) {
                            _context.next = 10;
                            break;
                          }

                          _context.next = 10;
                          return access(stream.path, fs.F_OK | fs.R_OK);

                        case 10:
                          _iteratorNormalCompletion2 = true;
                          _context.next = 5;
                          break;

                        case 13:
                          _context.next = 19;
                          break;

                        case 15:
                          _context.prev = 15;
                          _context.t0 = _context['catch'](3);
                          _didIteratorError2 = true;
                          _iteratorError2 = _context.t0;

                        case 19:
                          _context.prev = 19;
                          _context.prev = 20;

                          if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                          }

                        case 22:
                          _context.prev = 22;

                          if (!_didIteratorError2) {
                            _context.next = 25;
                            break;
                          }

                          throw _iteratorError2;

                        case 25:
                          return _context.finish(22);

                        case 26:
                          return _context.finish(19);

                        case 27:
                          _context.next = 29;
                          return _this2._remoteJson(requestOpts, streamsMap);

                        case 29:
                          result = _context.sent;

                          if (!(result.error != null)) {
                            _context.next = 32;
                            break;
                          }

                          throw new Error(result.error);

                        case 32:
                          if (!(useTus && Object.keys(tusStreamsMap).length > 0)) {
                            _context.next = 35;
                            break;
                          }

                          _context.next = 35;
                          return _this2._sendTusRequest(tusStreamsMap, { waitForCompletion: opts.waitForCompletion, assembly: result }, progressCb);

                        case 35:
                          if (opts.waitForCompletion) {
                            _context.next = 37;
                            break;
                          }

                          return _context.abrupt('return', result);

                        case 37:
                          return _context.abrupt('return', _this2.awaitAssemblyCompletion(result.assembly_id, progressCb));

                        case 38:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _callee, _this2, [[3, 15, 19, 27], [20,, 22, 26]]);
                }))();
                return _context2.abrupt('return', _Promise.race([mainPromise, streamErrorPromise]));

              case 13:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function createAssemblyAsync(_x2, _x3) {
        return _ref.apply(this, arguments);
      }

      return createAssemblyAsync;
    }()
  }, {
    key: 'awaitAssemblyCompletion',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(assemblyId, progressCb) {
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
        return _ref3.apply(this, arguments);
      }

      return awaitAssemblyCompletion;
    }()
  }, {
    key: 'deleteAssembly',
    value: function deleteAssembly(assembyId, cb) {
      return this.deleteAssemblyAsync(assembyId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * Delete the assembly
     *
     * @param {string} assemblyId assembly ID
     * @returns {Promise} after the assembly is deleted
     */

  }, {
    key: 'deleteAssemblyAsync',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(assemblyId) {
        var _ref5, assembly_url, opts;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                // eslint-disable-next-line camelcase
                _ref5 = this.getAssembly(assemblyId) || {}, assembly_url = _ref5.assembly_url;
                opts = {
                  url: assembly_url,
                  timeout: 5000,
                  method: 'delete'
                };
                return _context4.abrupt('return', this._remoteJson(opts));

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function deleteAssemblyAsync(_x6) {
        return _ref4.apply(this, arguments);
      }

      return deleteAssemblyAsync;
    }()
  }, {
    key: 'replayAssembly',
    value: function replayAssembly(opts, cb) {
      return this.replayAssembly(opts).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

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
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(opts) {
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
        return _ref6.apply(this, arguments);
      }

      return replayAssemblyAsync;
    }()
  }, {
    key: 'replayAssemblyNotification',
    value: function replayAssemblyNotification(opts, cb) {
      return this.replayAssemblyNotificationAsync(opts).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * Replay an Assembly notification
     *
     * @param {replayOptions} opts options defining the Assembly to replay
     * @returns {Promise} after the replay is started
     */

  }, {
    key: 'replayAssemblyNotificationAsync',
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(_ref8) {
        var assemblyId = _ref8.assembly_id,
            notifyUrl = _ref8.notify_url;
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
        return _ref7.apply(this, arguments);
      }

      return replayAssemblyNotificationAsync;
    }()
  }, {
    key: 'listAssemblyNotifications',
    value: function listAssemblyNotifications(params, cb) {
      return this.listAssemblyNotificationsAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * List all assembly notifications
     *
     * @param {object} params optional request options
     * @returns {Promise} the list of Assembly notifications
     */

  }, {
    key: 'listAssemblyNotificationsAsync',
    value: function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(params) {
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
        return _ref9.apply(this, arguments);
      }

      return listAssemblyNotificationsAsync;
    }()
  }, {
    key: 'streamAssemblyNotifications',
    value: function streamAssemblyNotifications(params) {
      var _this3 = this;

      return new PaginationStream(function (page, cb) {
        _this3.listAssemblyNotifications(_extends({}, params, { page: page }), cb);
      });
    }
  }, {
    key: 'listAssemblies',
    value: function listAssemblies(params, cb) {
      return this.listAssembliesAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
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
      var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(params) {
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
        return _ref10.apply(this, arguments);
      }

      return listAssembliesAsync;
    }()
  }, {
    key: 'streamAssemblies',
    value: function streamAssemblies(params) {
      var _this4 = this;

      return new PaginationStream(function (page, cb) {
        _this4.listAssemblies(_extends({}, params, { page: page }), cb);
      });
    }
  }, {
    key: 'getAssembly',
    value: function getAssembly(assembyId, cb) {
      return this.getAssemblyAsync(assembyId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
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
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(assemblyId) {
        var _this5 = this;

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
                    var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(attempt) {
                      var result;
                      return regeneratorRuntime.wrap(function _callee9$(_context9) {
                        while (1) {
                          switch (_context9.prev = _context9.next) {
                            case 0:
                              _context9.prev = 0;
                              _context9.next = 3;
                              return _this5._remoteJson(opts);

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
                      }, _callee9, _this5, [[0, 11]]);
                    }));

                    return function (_x12) {
                      return _ref12.apply(this, arguments);
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
        return _ref11.apply(this, arguments);
      }

      return getAssemblyAsync;
    }()
  }, {
    key: 'createTemplate',
    value: function createTemplate(params, cb) {
      return this.createTemplateAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * Create an Assembly Template
     *
     * @param {object} params optional request options
     * @returns {Promise} when the template is created
     */

  }, {
    key: 'createTemplateAsync',
    value: function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(params) {
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
        return _ref13.apply(this, arguments);
      }

      return createTemplateAsync;
    }()
  }, {
    key: 'editTemplate',
    value: function editTemplate(templateId, params, cb) {
      return this.editTemplateAsync(templateId, params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

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
      var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(templateId, params) {
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
        return _ref14.apply(this, arguments);
      }

      return editTemplateAsync;
    }()
  }, {
    key: 'deleteTemplate',
    value: function deleteTemplate(templateId, cb) {
      return this.deleteTemplateAsync(templateId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * Delete an Assembly Template
     *
     * @param {string} templateId the template ID
     * @returns {Promise} when the template is deleted
     */

  }, {
    key: 'deleteTemplateAsync',
    value: function () {
      var _ref15 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(templateId) {
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
        return _ref15.apply(this, arguments);
      }

      return deleteTemplateAsync;
    }()
  }, {
    key: 'getTemplate',
    value: function getTemplate(templateId, cb) {
      return this.getTemplateAsync(templateId).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * Get an Assembly Template
     *
     * @param {string} templateId the template ID
     * @returns {Promise} when the template is retrieved
     */

  }, {
    key: 'getTemplateAsync',
    value: function () {
      var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(templateId) {
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
        return _ref16.apply(this, arguments);
      }

      return getTemplateAsync;
    }()
  }, {
    key: 'listTemplates',
    value: function listTemplates(params, cb) {
      return this.listTemplatesAsync(params).then(function (val) {
        return cb(null, val);
      }).catch(cb);
    }

    /**
     * List all Assembly Templates
     *
     * @param {object} params optional request options
     * @returns {Promise} the list of templates
     */

  }, {
    key: 'listTemplatesAsync',
    value: function () {
      var _ref17 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15(params) {
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
        return _ref17.apply(this, arguments);
      }

      return listTemplatesAsync;
    }()
  }, {
    key: 'streamTemplates',
    value: function streamTemplates(params) {
      var _this6 = this;

      return new PaginationStream(function (page, cb) {
        _this6.listTemplates(_extends({}, params, { page: page }), cb);
      });
    }
  }, {
    key: 'getBill',
    value: function getBill(month, cb) {
      return this.getBillAsync(month).then(function (val) {
        return cb(null, val);
      }).catch(cb);
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
      var _ref18 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16(month) {
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
        return _ref18.apply(this, arguments);
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

            if (_.isObject(val) || _.isArray(val)) {
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

      if (streamsMap) Object.entries(streamsMap).forEach(function (_ref19) {
        var _ref20 = _slicedToArray(_ref19, 2),
            key = _ref20[0],
            value = _ref20[1];

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
      var _ref21 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee18(opts, streamsMap) {
        var _this7 = this;

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
                    var result, msg;
                    return regeneratorRuntime.wrap(function _callee17$(_context17) {
                      while (1) {
                        switch (_context17.prev = _context17.next) {
                          case 0:
                            _context17.prev = 0;
                            _context17.next = 3;
                            return _this7.__remoteJson(opts, streamsMap);

                          case 3:
                            result = _context17.sent;

                            resolve(result);
                            _context17.next = 30;
                            break;

                          case 7:
                            _context17.prev = 7;
                            _context17.t0 = _context17['catch'](0);

                            if (!(_context17.t0.error === 'RATE_LIMIT_REACHED')) {
                              _context17.next = 13;
                              break;
                            }

                            console.warn('Rate limit reached, retrying request in ' + _context17.t0.info.retryIn + ' seconds.');
                            // FIXME uses private internals of node-retry
                            operation._timeouts.unshift(1000 * _context17.t0.info.retryIn);
                            return _context17.abrupt('return', operation.retry(_context17.t0));

                          case 13:
                            if (!(_context17.t0.code === 'ENOTFOUND')) {
                              _context17.next = 17;
                              break;
                            }

                            console.warn('The network connection is down, retrying request in 3 seconds.');
                            // FIXME uses private internals of node-retry
                            operation._timeouts.unshift(3 * 1000);
                            return _context17.abrupt('return', operation.retry(_context17.t0));

                          case 17:
                            if (!(_context17.t0.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY')) {
                              _context17.next = 20;
                              break;
                            }

                            console.warn('Invalid auth key provided.');
                            return _context17.abrupt('return', reject(_context17.t0));

                          case 20:
                            if (!(_context17.t0.error !== undefined)) {
                              _context17.next = 27;
                              break;
                            }

                            msg = [];

                            if (_context17.t0.error) {
                              msg.push(_context17.t0.error);
                            }
                            if (opts.url) {
                              msg.push(opts.url);
                            }
                            if (_context17.t0.message) {
                              msg.push(_context17.t0.message);
                            }

                            console.warn(msg.join(' - '));
                            return _context17.abrupt('return', reject(_context17.t0));

                          case 27:
                            if (!operation.retry(_context17.t0)) {
                              _context17.next = 29;
                              break;
                            }

                            return _context17.abrupt('return');

                          case 29:

                            reject(operation.mainError());

                          case 30:
                          case 'end':
                            return _context17.stop();
                        }
                      }
                    }, _callee17, _this7, [[0, 7]]);
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
        return _ref21.apply(this, arguments);
      }

      return _remoteJson;
    }()

    // Responsible for making API calls. Automatically sends streams with any POST,
    // PUT or DELETE requests. Automatically adds signature parameters to all
    // requests. Also automatically parses the JSON response.

  }, {
    key: '__remoteJson',
    value: function () {
      var _ref23 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee19(opts, streamsMap) {
        var timeout, url, method, form, extraData, requestOpts, _ref24, result, statusCode, extendedMessage;

        return regeneratorRuntime.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                timeout = opts.timeout || 5000;
                url = opts.url || null;
                method = opts.method || 'get';

                if (url) {
                  _context19.next = 5;
                  break;
                }

                throw new Error('No url provided!');

              case 5:

                if (method === 'get' && opts.params != null) {
                  url = this._appendParamsToUrl(url, opts.params);
                }

                form = void 0;


                if (method === 'post' || method === 'put' || method === 'delete') {
                  extraData = _extends({}, opts.fields);

                  if (opts.tus_num_expected_upload_files) {
                    extraData.tus_num_expected_upload_files = opts.tus_num_expected_upload_files;
                  }
                  form = new FormData();
                  this._appendForm(form, opts.params, streamsMap, extraData);
                }

                requestOpts = {
                  body: form,
                  timeout: timeout,
                  headers: _extends({
                    // 'transfer-encoding': 'chunked',
                    'Transloadit-Client': 'node-sdk:' + version
                  }, opts.headers),
                  responseType: 'json'

                  // form.append('my_file', fs.createReadStream('/foo/bar.jpg'));

                };
                _context19.next = 11;
                return got[method](url, requestOpts);

              case 11:
                _ref24 = _context19.sent;
                result = _ref24.body;
                statusCode = _ref24.statusCode;

                if (!(statusCode !== 200 && statusCode !== 404 && statusCode >= 400 && statusCode <= 599)) {
                  _context19.next = 18;
                  break;
                }

                extendedMessage = {};

                if (result.message && result.error) {
                  extendedMessage.message = result.error + ': ' + result.message;
                }
                throw _.extend(new Error(), result, extendedMessage);

              case 18:
                return _context19.abrupt('return', result);

              case 19:
              case 'end':
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function __remoteJson(_x22, _x23) {
        return _ref23.apply(this, arguments);
      }

      return __remoteJson;
    }()
  }, {
    key: '_sendTusRequest',
    value: function () {
      var _ref25 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee20(streamsMap, opts, onProgress) {
        var streamLabels;
        return regeneratorRuntime.wrap(function _callee20$(_context20) {
          while (1) {
            switch (_context20.prev = _context20.next) {
              case 0:
                streamLabels = Object.keys(streamsMap);

                // TODO less cb nesting

                return _context20.abrupt('return', new _Promise(function (resolve, reject) {
                  var uploadsDone = 0;
                  var totalBytes = 0;
                  var lastEmittedProgress = 0;
                  var uploadProgresses = {};
                  onProgress = onProgress || function () {};
                  var _iteratorNormalCompletion4 = true;
                  var _didIteratorError4 = false;
                  var _iteratorError4 = undefined;

                  try {
                    var _loop = function _loop() {
                      var label = _step4.value;

                      var file = streamsMap[label];
                      fs.stat(file.path, function (err, _ref26) {
                        var size = _ref26.size;

                        if (err) return reject(err);

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
                          onError: reject,
                          onProgress: onTusProgress,
                          onSuccess: function onSuccess() {
                            uploadsDone++;
                            if (uploadsDone === streamLabels.length) {
                              resolve();
                            }
                          }
                        });

                        tusUpload.start();
                      });
                    };

                    for (var _iterator4 = streamLabels[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                      _loop();
                    }
                  } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                      }
                    } finally {
                      if (_didIteratorError4) {
                        throw _iteratorError4;
                      }
                    }
                  }
                }));

              case 2:
              case 'end':
                return _context20.stop();
            }
          }
        }, _callee20, this);
      }));

      function _sendTusRequest(_x24, _x25, _x26) {
        return _ref25.apply(this, arguments);
      }

      return _sendTusRequest;
    }()
  }]);

  return TransloaditClient;
}();

module.exports = TransloaditClient;
//# sourceMappingURL=TransloaditClient.js.map