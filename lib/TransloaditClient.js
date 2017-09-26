const _createClass = (() => {
  function defineProperties (target, props) {
    for (let i = 0; i < props.length; i++) {
      const descriptor = props[i]
      descriptor.enumerable = descriptor.enumerable || false
      descriptor.configurable = true
      if ('value' in descriptor) descriptor.writable = true
      Object.defineProperty(target, descriptor.key, descriptor)
    }
  }
  return (Constructor, protoProps, staticProps) => {
    if (protoProps) defineProperties(Constructor.prototype, protoProps)
    if (staticProps) defineProperties(Constructor, staticProps)
    return Constructor
  }
})()

function _classCallCheck (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}

const reqr = global.GENTLY ? GENTLY.hijack(require) : require
const request = reqr('request')
const crypto = reqr('crypto')
const _ = reqr('underscore')
const fs = reqr('fs')
const retry = reqr('retry')
const PaginationStream = reqr('./PaginationStream')

let unknownErrMsg = 'Unknown error. Please report this at '
unknownErrMsg += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error'

const TransloaditClient = (() => {
  function TransloaditClient (...args) {
    const opts = args.length > 0 && args[0] !== undefined ? args[0] : {}

    _classCallCheck(this, TransloaditClient)

    if (opts.useSsl == null) {
      opts.useSsl = true
    }

    if (opts.authKey == null) {
      throw new Error('Please provide an authKey')
    }

    if (opts.authSecret == null) {
      throw new Error('Please provide an authSecret')
    }

    this._authKey = opts.authKey
    this._authSecret = opts.authSecret
    this._service = opts.service || 'api2.transloadit.com'
    this._region = opts.region || 'us-east-1'
    this._protocol = opts.useSsl ? 'https://' : 'http://'
    this._streams = {}

    this._lastUsedAssemblyUrl = ''
  }

  _createClass(TransloaditClient, [
    {
      key  : 'addStream',
      value: function addStream (name, stream) {
        stream.pause()
        this._streams[name] = stream
      },
    },
    {
      key  : 'addFile',
      value: function addFile (name, path) {
        const stream = fs.createReadStream(path)
        stream.on('error', err => {
          // handle the error event to avoid the error being thrown
          console.error(err)
        })
        this.addStream(name, stream)
      },
    },
    {
      key  : 'getLastUsedAssemblyUrl',
      value: function getLastUsedAssemblyUrl () {
        return this._lastUsedAssemblyUrl
      },
    },
    {
      key  : 'createAssembly',
      value: function createAssembly (_ref, cb) {
        const _this = this

        const params = _ref.params
        const fields = _ref.fields

        let stream = void 0
        const callback = cb
        let called = false
        cb = function cb (err, result) {
          if (!called) {
            called = true
            callback(err, result)
          }
        }

        this._lastUsedAssemblyUrl = `${this._serviceUrl()}/assemblies`

        const requestOpts = {
          url    : this._lastUsedAssemblyUrl,
          method : 'post',
          timeout: 24 * 60 * 60 * 1000, // 1 day
          params : params || {},
          fields : fields || {},
        }

        const streams = (() => {
          const result = []
          for (const label in _this._streams) {
            stream = _this._streams[label]
            result.push(stream)
          }
          return result
        })()

        const sendRequest = function sendRequest () {
          _this._remoteJson(requestOpts, (err, result) => {
            // reset streams so they do not get used again in subsequent requests
            let left = void 0
            _this._streams = {}

            if (err) {
              return cb(err)
            }

            if (result && result.ok) {
              return cb(null, result)
            }

            err = new Error(
              (left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg
            )
            cb(err)
          })
        }

        let ncompleted = 0
        const streamErrCb = function streamErrCb (err) {
          if (err != null) {
            cb(err)
          }

          if (++ncompleted === streams.length) {
            sendRequest()
          }
        }

        let _iteratorNormalCompletion = true
        let _didIteratorError = false
        let _iteratorError

        try {
          for (
            var _iterator = Array.from(streams)[Symbol.iterator](), _step;
            !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
            _iteratorNormalCompletion = true
          ) {
            stream = _step.value

            stream.on('error', cb)

            if (stream.path == null) {
              streamErrCb(null)
              continue
            }

            fs.access(stream.path, fs.F_OK | fs.R_OK, err => {
              if (err != null) {
                return streamErrCb(err)
              }

              streamErrCb(null)
            })
          }

          // make sure sendRequest gets called when there are no @_streams
        } catch (err) {
          _didIteratorError = true
          _iteratorError = err
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return()
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError
            }
          }
        }

        if (streams.length === 0) {
          sendRequest()
        }
      },
    },
    {
      key  : 'deleteAssembly',
      value: function deleteAssembly (assemblyId, cb) {
        const _this2 = this

        this.getAssembly(assemblyId, (err, _ref2) => {
          const assembly_url = _ref2.assembly_url

          if (err != null) {
            return cb(err)
          }

          const opts = {
            url    : assembly_url,
            timeout: 5000,
            method : 'del',
            params : {},
          }

          _this2._remoteJson(opts, cb)
        })
      },
    },
    {
      key  : 'replayAssembly',
      value: function replayAssembly (_ref3, cb) {
        const assemblyId = _ref3.assembly_id
        const notifyUrl = _ref3.notify_url

        const requestOpts = {
          url   : `${this._serviceUrl()}/assemblies/${assemblyId}/replay`,
          method: 'post',
        }

        if (notifyUrl != null) {
          requestOpts.params = { notifyUrl }
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'replayAssemblyNotification',
      value: function replayAssemblyNotification (_ref4, cb) {
        const assemblyId = _ref4.assembly_id
        const notifyUrl = _ref4.notify_url

        const requestOpts = {
          url   : `${this._serviceUrl()}/assembly_notifications/${assemblyId}/replay`,
          method: 'post',
        }

        if (notifyUrl != null) {
          requestOpts.params = { notifyUrl }
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'listAssemblyNotifications',
      value: function listAssemblyNotifications (params, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/assembly_notifications`,
          method: 'get',
          params: params || {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'streamAssemblyNotifications',
      value: function streamAssemblyNotifications (params) {
        const _this3 = this

        return new PaginationStream((pageno, cb) => {
          _this3.listAssemblyNotifications(_.extend({}, params, { page: pageno }), cb)
        })
      },
    },
    {
      key  : 'listAssemblies',
      value: function listAssemblies (params, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/assemblies`,
          method: 'get',
          params: params || {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'streamAssemblies',
      value: function streamAssemblies (params) {
        const _this4 = this

        return new PaginationStream((pageno, cb) => {
          _this4.listAssemblies(_.extend({}, params, { page: pageno }), cb)
        })
      },
    },
    {
      key  : 'getAssembly',
      value: function getAssembly (assemblyId, cb) {
        const _this5 = this

        const opts = { url: `${this._serviceUrl()}/assemblies/${assemblyId}` }

        const retryOpts = {
          retries   : 5,
          factor    : 3.28,
          minTimeout: 1 * 1000,
          maxTimeout: 8 * 1000,
        }

        const operation = retry.operation(retryOpts)
        operation.attempt(attempt => {
          _this5._remoteJson(opts, (err, result) => {
            if (err != null) {
              if (operation.retry(err)) {
                return
              }

              return cb(operation.mainError())
            }

            if (result.assembly_url == null || result.assembly_ssl_url == null) {
              if (operation.retry(new Error('got incomplete assembly status response'))) {
                return
              }

              return cb(operation.mainError())
            }

            cb(null, result)
          })
        })
      },
    },
    {
      key  : 'createTemplate',
      value: function createTemplate (params, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/templates`,
          method: 'post',
          params: params || {},
        }

        this._remoteJson(requestOpts, (err, result) => {
          let left = void 0
          if (err) {
            return cb(err)
          }

          if (result && result.ok) {
            return cb(null, result)
          }

          err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg)
          cb(err)
        })
      },
    },
    {
      key  : 'editTemplate',
      value: function editTemplate (templateId, params, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/templates/${templateId}`,
          method: 'put',
          params: params || {},
        }

        this._remoteJson(requestOpts, (err, result) => {
          let left = void 0
          if (err) {
            return cb(err)
          }

          if (result && result.ok) {
            return cb(null, result)
          }

          err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg)
          cb(err)
        })
      },
    },
    {
      key  : 'deleteTemplate',
      value: function deleteTemplate (templateId, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/templates/${templateId}`,
          method: 'del',
          params: {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'getTemplate',
      value: function getTemplate (templateId, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/templates/${templateId}`,
          method: 'get',
          params: {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'listTemplates',
      value: function listTemplates (params, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/templates`,
          method: 'get',
          params: params || {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'streamTemplates',
      value: function streamTemplates (params) {
        const _this6 = this

        return new PaginationStream((pageno, cb) => {
          _this6.listTemplates(_.extend({}, params, { page: pageno }), cb)
        })
      },
    },
    {
      key  : 'getBill',
      value: function getBill (month, cb) {
        const requestOpts = {
          url   : `${this._serviceUrl()}/bill/${month}`,
          method: 'get',
          params: {},
        }

        this._remoteJson(requestOpts, cb)
      },
    },
    {
      key  : 'calcSignature',
      value: function calcSignature (params) {
        const jsonParams = this._prepareParams(params)
        const signature = this._calcSignature(jsonParams)

        return { signature, params: jsonParams }
      },
    },
    {
      key  : '_calcSignature',
      value: function _calcSignature (toSign) {
        return crypto
          .createHmac('sha1', this._authSecret)
          .update(new Buffer(toSign, 'utf-8'))
          .digest('hex')
      },

      // Sets the multipart/form-data for POST, PUT and DELETE requests, including
      // the streams, the signed params, and any additional fields.
    },
    {
      key  : '_appendForm',
      value: function _appendForm (req, params, fields) {
        const sigData = this.calcSignature(params)
        const jsonParams = sigData.params
        const signature = sigData.signature

        const form = req.form()

        form.append('params', jsonParams)

        if (fields == null) {
          fields = []
        }

        for (const key in fields) {
          let val = fields[key]
          if (_.isObject(fields[key]) || _.isArray(fields[key])) {
            val = JSON.stringify(fields[key])
          }

          form.append(key, val)
        }

        form.append('signature', signature)

        _.each(this._streams, (value, key) => form.append(key, value))
      },

      // Implements HTTP GET query params, handling the case where the url already
      // has params.
    },
    {
      key  : '_appendParamsToUrl',
      value: function _appendParamsToUrl (url, params) {
        const sigData = this.calcSignature(params)
        const signature = sigData.signature

        let jsonParams = sigData.params

        if (url.indexOf('?') === -1) {
          url += `?signature=${signature}`
        } else {
          url += `&signature=${signature}`
        }

        jsonParams = encodeURIComponent(jsonParams)
        url += `&params=${jsonParams}`

        return url
      },

      // Responsible for including auth parameters in all requests
    },
    {
      key  : '_prepareParams',
      value: function _prepareParams (params) {
        if (params == null) {
          params = {}
        }
        if (params.auth == null) {
          params.auth = {}
        }
        if (params.auth.key == null) {
          params.auth.key = this._authKey
        }
        if (params.auth.expires == null) {
          params.auth.expires = this._getExpiresDate()
        }

        return JSON.stringify(params)
      },
    },
    {
      key  : '_getExpiresDate',
      value: function _getExpiresDate () {
        const expiresDate = new Date()
        expiresDate.setDate(expiresDate.getDate() + 1)
        return expiresDate.toISOString()
      },
    },
    {
      key  : '_serviceUrl',
      value: function _serviceUrl () {
        return this._protocol + this._service
      },

      // Wrapper around __remoteJson which will retry in case of error
    },
    {
      key  : '_remoteJson',
      value: function _remoteJson (opts, cb) {
        const _this7 = this

        const operation = retry.operation({
          retries   : 5,
          factor    : 3.28,
          minTimeout: 1 * 1000,
          maxTimeout: 8 * 1000,
        })

        operation.attempt(() => {
          _this7.__remoteJson(opts, (err, result) => {
            if (err != null) {
              if (err.error === 'RATE_LIMIT_REACHED') {
                console.warn(`Rate limit reached, retrying request in ${err.info.retryIn} seconds.`)
                // FIXME uses private internals of node-retry
                operation._timeouts.unshift(1000 * err.info.retryIn)
                return operation.retry(err)
              }

              if (err.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY') {
                console.warn('Invalid auth key provided.')
                return cb(err)
              }
            }

            if (operation.retry(err)) {
              return
            }

            let mainError = null
            if (err) {
              mainError = operation.mainError()
            }

            cb(mainError, result)
          })
        })
      },

      // Responsible for making API calls. Automatically sends streams with any POST,
      // PUT or DELETE requests. Automatically adds signature parameters to all
      // requests. Also automatically parses the JSON response.
    },
    {
      key  : '__remoteJson',
      value: function __remoteJson (opts, cb) {
        const timeout = opts.timeout || 5000
        let url = opts.url || null
        const method = opts.method || 'get'

        if (!url) {
          const err = new Error('No url provided!')
          return cb(err)
        }

        if (method === 'get' && opts.params != null) {
          url = this._appendParamsToUrl(url, opts.params)
        }

        const requestOpts = {
          uri: url,
          timeout,
        }

        if (opts.headers != null) {
          requestOpts.headers = opts.headers
        }

        const req = request[method](requestOpts, (err, _ref5) => {
          const body = _ref5.body
          const statusCode = _ref5.statusCode

          if (err) {
            return cb(err)
          }

          // parse body
          let result = null
          try {
            result = JSON.parse(body)
          } catch (e) {
            const abbr = `${body}`.substr(0, 255)
            let msg = `Unable to parse JSON from '${requestOpts.uri}'. `
            msg += `Code: ${statusCode}. Body: ${abbr}. `
            return cb(new Error(msg))
          }
          if (statusCode !== 200 && statusCode != 404 && statusCode >= 400 && statusCode <= 599) {
            return cb(_.extend(new Error(), result))
          }

          return cb(null, result)
        })

        if (method === 'post' || method === 'put' || method === 'del') {
          this._appendForm(req, opts.params, opts.fields)
        }
      },
    },
  ])

  return TransloaditClient
})()

module.exports = TransloaditClient
// # sourceMappingURL=TransloaditClient.js.map
