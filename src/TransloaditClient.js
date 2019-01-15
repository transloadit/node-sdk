const reqr = global.GENTLY ? GENTLY.hijack(require) : require
const request = reqr('request')
const crypto = reqr('crypto')
const _ = reqr('underscore')
const fs = reqr('fs')
const path = reqr('path')
const retry = reqr('retry')
const PaginationStream = reqr('./PaginationStream')
const Readable = reqr('stream').Readable
const tus = reqr('tus-js-client')
const version = reqr('../package.json').version

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
    this._protocol = opts.useSsl ? 'https://' : 'http://'
    this._streams = {}
    this._tus_streams = {}

    this._lastUsedAssemblyUrl = ''
  }

  /**
   * Adds an Assembly file stream
   *
   * @param {string} name fieldname of the file
   * @param {ReadableStream} stream stream to be uploaded
   */
  addStream (name, stream) {
    stream.pause()
    this._streams[name] = stream
  }

  /**
   * Adds an Assembly file
   *
   * @param {string} name field name of the file
   * @param {string} path path to the file
   */
  addFile (name, path) {
    const stream = fs.createReadStream(path)
    stream.on('error', err => {
      // handle the error event to avoid the error being thrown
      console.error(err)

      if (this._streams[name]) {
        delete this._streams[name]
      }
    })
    this.addStream(name, stream)
  }

  getLastUsedAssemblyUrl () {
    return this._lastUsedAssemblyUrl
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
  createAssembly (opts, cb, progressCb) {
    const defaultOpts = {
      params: {},
      fields: {},
      waitForCompletion: false,
      isResumable: true
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

    const streams = (() => {
      const result = []
      for (let label in this._streams) {
        stream = this._streams[label]
        result.push(stream)
      }
      return result
    })()

    let requestOpts = {
      url: this._lastUsedAssemblyUrl,
      method: 'post',
      timeout: 24 * 60 * 60 * 1000, // 1 day
      params: opts.params,
      fields: opts.fields,
    }

    if (opts.isResumable && this._canGetStreamSizes()) {
      requestOpts.tus_num_expected_upload_files = streams.length
      // transfer streams to tus streams so they don't get uploaded as multipart
      for (const label of Object.keys(this._streams)) {
        this._tus_streams[label] = this._streams[label]
        delete this._streams[label]
      }
    } else if (opts.isResumable) {
      opts.isResumable = false
      console.warn('disabling resumability because the size of one or more streams cannot be determined')
    }

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

        if (!opts.isResumable || !Object.keys(this._tus_streams).length) {
          if (!opts.waitForCompletion) {
            return cb(null, result)
          }

          return this.awaitAssemblyCompletion(result.assembly_id, cb, progressCb)
        }

        const tusOpts = { waitForCompletion: opts.waitForCompletion, assembly: result }
        this._sendTusRequest(tusOpts, cb, progressCb)
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

  awaitAssemblyCompletion (assemblyId, cb, progressCb) {
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
        setTimeout(() => {
          this.awaitAssemblyCompletion(assemblyId, cb, progressCb)
        }, 1 * 1000)

        if (progressCb) {
          progressCb({assemblyProgress: result})
        }

        return
      }

      return cb(new Error(unknownErrMsg))
    })
  }

  /**
   * Delete the assembly
   *
   * @param {string} assemblyId assembly ID
   * @param {function} cb callback function after the assembly is deleted
   */
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
  replayAssembly (opts, cb) {
    const { assembly_id: assemblyId, notify_url: notifyUrl } = opts
    const requestOpts = {
      url   : this._serviceUrl() + `/assemblies/${assemblyId}/replay`,
      method: 'post',
    }

    if (notifyUrl != null) {
      requestOpts.params = { notifyUrl }
    }

    this._remoteJson(requestOpts, cb)
  }

  /**
   * Replay an Assembly notification
   *
   * @param {replayOptions} opts options defining the Assembly to replay
   * @param {function} cb callback function after the replay is started
   */
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

  /**
   * List all assembly notifications
   *
   * @param {object} params optional request options
   * @param {function} cb callback function triggered with the list of Assembly notifications
   */
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

  /**
   * List all assemblies
   *
   * @param {object} params optional request options
   * @param {function} cb callback function triggered with the list of Assemblies
   */
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

  /**
   * Get an Assembly
   *
   * @param {string} assemblyId the Assembly Id
   * @param {function} cb callback function triggered with the retrieved Assembly
   */
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

  /**
   * Create an Assembly Template
   *
   * @param {object} params optional request options
   * @param {function} cb callback function triggered when the template is created
   */
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

  /**
   * Edit an Assembly Template
   *
   * @param {string} templateId the template ID
   * @param {object} params optional request options
   * @param {function} cb callback function triggered when the template is edited
   */
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

  /**
   * Delete an Assembly Template
   *
   * @param {string} templateId the template ID
   * @param {function} cb callback function triggered when the template is deleted
   */
  deleteTemplate (templateId, cb) {
    const requestOpts = {
      url   : this._serviceUrl() + `/templates/${templateId}`,
      method: 'del',
      params: {},
    }

    this._remoteJson(requestOpts, cb)
  }

  /**
   * Get an Assembly Template
   *
   * @param {string} templateId the template ID
   * @param {function} cb callback function triggered when the template is retrieved
   */
  getTemplate (templateId, cb) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates/${templateId}`,
      method: 'get',
      params: {},
    }

    this._remoteJson(requestOpts, cb)
  }

  /**
   * List all Assembly Templates
   *
   * @param {object} params optional request options
   * @param {function} cb callback function triggered when the templates are retrieved
   */
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

  /**
   * Get account Billing details for a specific month
   *
   * @param {string} month the date for the required billing in the format yyyy-mm
   * @param {function} cb callback function triggered when the billing is retrieved
   */
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
      fields = {}
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
            let msg = []
            if (err.error) { msg.push(err.error) }
            if (opts.url) { msg.push(opts.url) }
            if (err.message) { msg.push(err.message) }

            console.warn(msg.join(' - '))
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
      headers: {
        'Transloadit-Client': `node-sdk:${version}`
      }
    }

    if (opts.headers != null) {
      _.extend(requestOpts.headers, opts.headers)
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
      const extraData = Object.assign({}, opts.fields)
      if (opts.tus_num_expected_upload_files) {
        extraData.tus_num_expected_upload_files = opts.tus_num_expected_upload_files
      }
      this._appendForm(req, opts.params, extraData)
    }
  }

  // @todo support size retrieval for other streams
  _canGetStreamSizes () {
    for (const label in this._streams) {
      const stream = this._streams[label]
      // the request module has path attribute that is different from file path
      // but it also has the attribute httpModule
      if (!(stream.path && !stream.httpModule)) {
        return false
      }
    }

    return true
  }

  _sendTusRequest (opts, cb, onProgress) {
    let uploadsDone = 0
    const streamLabels = Object.keys(this._tus_streams)
    const tlClient = this
    let totalBytes = 0
    let lastEmittedProgress = 0
    let uploadProgresses = {}
    onProgress = onProgress || (() => {})
    for (const label of streamLabels) {
      const file = this._tus_streams[label]
      fs.stat(file.path, (err, {size}) => {
        if (err) {
          return cb(err)
        }

        const uploadSize = size
        totalBytes += uploadSize
        uploadProgresses[label] = 0
        const onTusProgress = (bytesUploaded) => {
          uploadProgresses[label] = bytesUploaded
          // get all uploaded bytes for all files
          const uploadedBytes = streamLabels.reduce((label1, label2) => {
            return uploadProgresses[label1] + uploadProgresses[label2]
          })
          // don't send redundant progress
          if (lastEmittedProgress < uploadedBytes) {
            lastEmittedProgress = uploadedBytes
            onProgress({ uploadProgress: { uploadedBytes, totalBytes } })
          }
        }

        const filename = file.path ? path.basename(file.path) : label
        const tusUpload = new tus.Upload(file, {
          endpoint: opts.assembly.tus_url,
          resume: true,
          metadata: {
            assembly_url: opts.assembly.assembly_ssl_url,
            fieldname: label,
            filename
          },
          uploadSize,
          onError: cb,
          onProgress: onTusProgress,
          onSuccess() {
            uploadsDone++
            if (uploadsDone === streamLabels.length) {
              tlClient._tus_streams = {}
              if (opts.waitForCompletion) {
                tlClient.awaitAssemblyCompletion(opts.assembly.assembly_id, cb, onProgress)
              } else {
                cb(null, opts.assembly)
              }
            }
          }
        })

        tusUpload.start()
      })
    }
  }
}

module.exports = TransloaditClient
