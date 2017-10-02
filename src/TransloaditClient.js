const reqr = global.GENTLY ? GENTLY.hijack(require) : require
const request = reqr('request')
const crypto = reqr('crypto')
const _ = reqr('underscore')
const fs = reqr('fs')
const retry = reqr('retry')
const PaginationStream = reqr('./PaginationStream')
const Readable = reqr('stream').Readable

let unknownErrMsg = 'Unknown error. Please report this at '
unknownErrMsg += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error'

class TransloaditClient {
  constructor (opts = {}) {
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

  addStream (name, stream) {
    stream.pause()
    this._streams[name] = stream
  }

  addFile (name, path) {
    const stream = fs.createReadStream(path)
    stream.on('error', err => {
      // handle the error event to avoid the error being thrown
      console.error(err)
    })
    this.addStream(name, stream)
  }

  getLastUsedAssemblyUrl () {
    return this._lastUsedAssemblyUrl
  }

  createAssembly (opts, cb) {
    const defaultOpts = {
      params: {},
      fields: {},
      waitForCompletion: false
    }
    opts = _.extend(defaultOpts, opts)

    let stream
    const callback = cb
    let called = false
    cb = (err, result) => {
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
      params : opts.params,
      fields : opts.fields,
    }

    const streams = (() => {
      const result = []
      for (let label in this._streams) {
        stream = this._streams[label]
        result.push(stream)
      }
      return result
    })()

    const sendRequest = () => {
      this._remoteJson(requestOpts, (err, result = {}) => {
        // reset streams so they do not get used again in subsequent requests
        this._streams = {}

        if (!err && result.error != null) {
          err = new Error(result.error)
        }

        if (err) {
          return cb(err)
        }

        if (!opts.waitForCompletion) {
          return cb(null, result)
        }

        this.awaitAssemblyCompletion(result.assembly_id, cb)
      })
    }

    let ncompleted = 0
    const streamErrCb = err => {
      if (err != null) {
        cb(err)
      }

      if (++ncompleted === streams.length) {
        sendRequest()
      }
    }

    for (stream of Array.from(streams)) {
      stream.on('error', cb)

      // because an http response stream could also have a "path"
      // attribute but not referring to the local file system
      // see https://github.com/transloadit/node-sdk/pull/50#issue-261982855
      if (stream.path == null || !(stream instanceof Readable)) {
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
    if (streams.length === 0) {
      sendRequest()
    }
  }

  awaitAssemblyCompletion (assemblyId, cb) {
    this.getAssembly(assemblyId, (err, result) => {
      if (!err && result.error != null) {
        err = new Error(result.error)
      }

      if (err) {
        return cb(err)
      }

      if (result.ok === 'ASSEMBLY_COMPLETED') {
        return cb(null, result)
      }

      if (result.ok === 'ASSEMBLY_UPLOADING' || result.ok === 'ASSEMBLY_EXECUTING') {
        return setTimeout(() => {
          this.awaitAssemblyCompletion(assemblyId, cb)
        }, 1 * 1000)
      }

      return cb(new Error(unknownErrMsg))
    })
  }

  deleteAssembly (assemblyId, cb) {
    this.getAssembly(assemblyId, (err, { assembly_url } = {}) => {
      if (err != null) {
        return cb(err)
      }

      const opts = {
        url    : assembly_url,
        timeout: 5000,
        method : 'del',
        params : {},
      }

      this._remoteJson(opts, cb)
    })
  }

  replayAssembly ({ assembly_id: assemblyId, notify_url: notifyUrl }, cb) {
    const requestOpts = {
      url   : this._serviceUrl() + `/assemblies/${assemblyId}/replay`,
      method: 'post',
    }

    if (notifyUrl != null) {
      requestOpts.params = { notifyUrl }
    }

    this._remoteJson(requestOpts, cb)
  }

  replayAssemblyNotification ({ assembly_id: assemblyId, notify_url: notifyUrl }, cb) {
    const requestOpts = {
      url   : this._serviceUrl() + `/assembly_notifications/${assemblyId}/replay`,
      method: 'post',
    }

    if (notifyUrl != null) {
      requestOpts.params = { notifyUrl }
    }

    this._remoteJson(requestOpts, cb)
  }

  listAssemblyNotifications (params, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/assembly_notifications`,
      method: 'get',
      params: params || {},
    }

    this._remoteJson(requestOpts, cb)
  }

  streamAssemblyNotifications (params) {
    return new PaginationStream((pageno, cb) => {
      this.listAssemblyNotifications(_.extend({}, params, { page: pageno }), cb)
    })
  }

  listAssemblies (params, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/assemblies`,
      method: 'get',
      params: params || {},
    }

    this._remoteJson(requestOpts, cb)
  }

  streamAssemblies (params) {
    return new PaginationStream((pageno, cb) => {
      this.listAssemblies(_.extend({}, params, { page: pageno }), cb)
    })
  }

  getAssembly (assemblyId, cb) {
    const opts = { url: this._serviceUrl() + `/assemblies/${assemblyId}` }

    const retryOpts = {
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    }

    const operation = retry.operation(retryOpts)
    operation.attempt(attempt => {
      this._remoteJson(opts, (err, result) => {
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
  }

  createTemplate (params, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates`,
      method: 'post',
      params: params || {},
    }

    this._remoteJson(requestOpts, (err, result) => {
      let left
      if (err) {
        return cb(err)
      }

      if (result && result.ok) {
        return cb(null, result)
      }

      err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg)
      cb(err)
    })
  }

  editTemplate (templateId, params, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates/${templateId}`,
      method: 'put',
      params: params || {},
    }

    this._remoteJson(requestOpts, (err, result) => {
      let left
      if (err) {
        return cb(err)
      }

      if (result && result.ok) {
        return cb(null, result)
      }

      err = new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg)
      cb(err)
    })
  }

  deleteTemplate (templateId, cb) {
    const requestOpts = {
      url   : this._serviceUrl() + `/templates/${templateId}`,
      method: 'del',
      params: {},
    }

    this._remoteJson(requestOpts, cb)
  }

  getTemplate (templateId, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates/${templateId}`,
      method: 'get',
      params: {},
    }

    this._remoteJson(requestOpts, cb)
  }

  listTemplates (params, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates`,
      method: 'get',
      params: params || {},
    }

    this._remoteJson(requestOpts, cb)
  }

  streamTemplates (params) {
    return new PaginationStream((pageno, cb) => {
      this.listTemplates(_.extend({}, params, { page: pageno }), cb)
    })
  }

  getBill (month, cb) {
    const requestOpts = {
      url   : this._serviceUrl() + `/bill/${month}`,
      method: 'get',
      params: {},
    }

    this._remoteJson(requestOpts, cb)
  }

  calcSignature (params) {
    const jsonParams = this._prepareParams(params)
    const signature = this._calcSignature(jsonParams)

    return { signature, params: jsonParams }
  }

  _calcSignature (toSign) {
    return crypto
      .createHmac('sha1', this._authSecret)
      .update(Buffer.from(toSign, 'utf-8'))
      .digest('hex')
  }

  // Sets the multipart/form-data for POST, PUT and DELETE requests, including
  // the streams, the signed params, and any additional fields.
  _appendForm (req, params, fields) {
    const sigData = this.calcSignature(params)
    const jsonParams = sigData.params
    const { signature } = sigData
    const form = req.form()

    form.append('params', jsonParams)

    if (fields == null) {
      fields = []
    }

    for (let key in fields) {
      let val = fields[key]
      if (_.isObject(fields[key]) || _.isArray(fields[key])) {
        val = JSON.stringify(fields[key])
      }

      form.append(key, val)
    }

    form.append('signature', signature)

    _.each(this._streams, (value, key) => form.append(key, value))
  }

  // Implements HTTP GET query params, handling the case where the url already
  // has params.
  _appendParamsToUrl (url, params) {
    const sigData = this.calcSignature(params)
    const { signature } = sigData
    let jsonParams = sigData.params

    if (url.indexOf('?') === -1) {
      url += `?signature=${signature}`
    } else {
      url += `&signature=${signature}`
    }

    jsonParams = encodeURIComponent(jsonParams)
    url += `&params=${jsonParams}`

    return url
  }

  // Responsible for including auth parameters in all requests
  _prepareParams (params) {
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
  }

  _getExpiresDate () {
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + 1)
    return expiresDate.toISOString()
  }

  _serviceUrl () {
    return this._protocol + this._service
  }

  // Wrapper around __remoteJson which will retry in case of error
  _remoteJson (opts, cb) {
    const operation = retry.operation({
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    })

    operation.attempt(() => {
      this.__remoteJson(opts, (err, result) => {
        if (err != null) {
          if (err.error === 'RATE_LIMIT_REACHED') {
            console.warn(`Rate limit reached, retrying request in ${err.info.retryIn} seconds.`)
            // FIXME uses private internals of node-retry
            operation._timeouts.unshift(1000 * err.info.retryIn)
            return operation.retry(err)
          }

          if (err.code === 'ENOTFOUND') {
            console.warn(`The network connection is down, retrying request in 3 seconds.`)
            // FIXME uses private internals of node-retry
            operation._timeouts.unshift(3 * 1000)
            return operation.retry(err)
          }

          if (err.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY') {
            console.warn(`Invalid auth key provided.`)
            return cb(err)
          }

          if (err.error !== undefined) {
            console.warn(err.error + ' - ' + err.message)
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
  }

  // Responsible for making API calls. Automatically sends streams with any POST,
  // PUT or DELETE requests. Automatically adds signature parameters to all
  // requests. Also automatically parses the JSON response.
  __remoteJson (opts, cb) {
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

    const req = request[method](requestOpts, (err, { body, statusCode } = {}) => {
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
      if (statusCode !== 200 && statusCode !== 404 && statusCode >= 400 && statusCode <= 599) {
        return cb(_.extend(new Error(), result))
      }

      return cb(null, result)
    })

    if (method === 'post' || method === 'put' || method === 'del') {
      this._appendForm(req, opts.params, opts.fields)
    }
  }
}

module.exports = TransloaditClient
