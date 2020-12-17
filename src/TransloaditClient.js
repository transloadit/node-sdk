const reqr = global.GENTLY ? GENTLY.hijack(require) : require
const got = reqr('got')
const FormData = require('form-data')
const crypto = reqr('crypto')
const _ = reqr('underscore')
const fs = reqr('fs')
const path = reqr('path')
const retry = reqr('retry')
const PaginationStream = reqr('./PaginationStream')
const Readable = reqr('stream').Readable
const tus = reqr('tus-js-client')
const { access } = reqr('fs').promises

const version = reqr('../package.json').version

function unknownErrMsg (str) {
  let buff = 'Unknown error'
  if (str) {
    buff += ` ${str}`
  }
  buff += '. Please report this at '
  buff += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error'
  return buff
}

// @todo support size retrieval for other streams
function canGetStreamSizes (streams) {
  for (const stream of streams) {
    // the request module has path attribute that is different from file path
    // but it also has the attribute httpModule
    if (!(stream.path && !stream.httpModule)) {
      return false
    }
  }

  return true
}

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
   * @callback progressCb
   * @param {progressObject} progress
   *
   * @param {object} opts assembly options
   * @param {progressCb} progressCb callback function to be triggered as on each progress update of the assembly
   * @returns {Promise}
   */
  async createAssemblyAsync (opts, progressCb) {
    const defaultOpts = {
      params           : {},
      fields           : {},
      waitForCompletion: false,
      isResumable      : true,
    }
    opts = { ...defaultOpts, ...opts }

    this._lastUsedAssemblyUrl = `${this._serviceUrl()}/assemblies`

    const requestOpts = {
      url    : this._lastUsedAssemblyUrl,
      method : 'post',
      timeout: 24 * 60 * 60 * 1000, // 1 day
      params : opts.params,
      fields : opts.fields,
    }

    let streamsMap = this._streams
    let streams = Object.values(streamsMap)

    // reset streams so they do not get used again in subsequent requests
    this._streams = {}

    // TODO imrpvoe all this
    const useTus = opts.isResumable && canGetStreamSizes(streams)
    const tusStreamsMap = useTus ? streamsMap : {}
    if (useTus) {
      requestOpts.tus_num_expected_upload_files = streams.length
      // make sure they don't get uploaded as multipart (will use tus instead)
      streamsMap = {}
      streams = []
    } else if (opts.isResumable) {
      opts.isResumable = false
      console.warn('disabling resumability because the size of one or more streams cannot be determined')
    }

    // If any stream emits error, we exit with error
    const streamErrorPromise = new Promise((resolve, reject) => {
      streams.forEach((stream) => stream.on('error', reject))
    })

    const mainPromise = (async () => {
      for (const stream of streams) {
        // because an http response stream could also have a "path"
        // attribute but not referring to the local file system
        // see https://github.com/transloadit/node-sdk/pull/50#issue-261982855
        if (!stream.path == null && stream instanceof Readable) {
          await access(stream.path, fs.F_OK | fs.R_OK)
        }
      }

      const result = await this._remoteJson(requestOpts, streamsMap)

      if (result.error != null) throw new Error(result.error)

      if (useTus && Object.keys(tusStreamsMap).length > 0) {
        await this._sendTusRequest(tusStreamsMap, { waitForCompletion: opts.waitForCompletion, assembly: result }, progressCb)
      }

      if (!opts.waitForCompletion) return result
      return this.awaitAssemblyCompletion(result.assembly_id, progressCb)
    })()

    return Promise.race([mainPromise, streamErrorPromise])
  }

  async awaitAssemblyCompletion (assemblyId, progressCb) {
    const result = await this.getAssemblyAsync(assemblyId)
    if (result.error != null) throw new Error(result.error)

    if (result.ok === 'ASSEMBLY_COMPLETED') return result

    if (result.ok === 'ASSEMBLY_UPLOADING' || result.ok === 'ASSEMBLY_EXECUTING') {
      if (progressCb) progressCb({ assemblyProgress: result })

      await new Promise((resolve) => setTimeout(resolve, 1 * 1000))
      // Recurse
      return this.awaitAssemblyCompletion(assemblyId, progressCb)
    }

    throw new Error(unknownErrMsg(`while processing Assembly ID ${assemblyId}`))
  }

  /**
   * Delete the assembly
   *
   * @param {string} assemblyId assembly ID
   * @returns {Promise} after the assembly is deleted
   */
  async deleteAssemblyAsync (assemblyId) {
    // eslint-disable-next-line camelcase
    const { assembly_url } = this.getAssembly(assemblyId) || {}

    const opts = {
      url    : assembly_url,
      timeout: 5000,
      method : 'delete',
    }

    return this._remoteJson(opts)
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
  async replayAssemblyAsync (opts) {
    const { assembly_id: assemblyId, notify_url: notifyUrl } = opts
    const requestOpts = {
      url   : this._serviceUrl() + `/assemblies/${assemblyId}/replay`,
      method: 'post',
    }

    if (notifyUrl != null) {
      requestOpts.params = { notifyUrl }
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Replay an Assembly notification
   *
   * @param {replayOptions} opts options defining the Assembly to replay
   * @returns {Promise} after the replay is started
   */
  async replayAssemblyNotificationAsync ({ assembly_id: assemblyId, notify_url: notifyUrl }) {
    const requestOpts = {
      url   : this._serviceUrl() + `/assembly_notifications/${assemblyId}/replay`,
      method: 'post',
    }

    if (notifyUrl != null) {
      requestOpts.params = { notifyUrl }
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * List all assembly notifications
   *
   * @param {object} params optional request options
   * @returns {Promise} the list of Assembly notifications
   */
  async listAssemblyNotificationsAsync (params) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/assembly_notifications`,
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblyNotifications (params) {
    return new PaginationStream((page, cb) => {
      this.listAssemblyNotifications({ ...params, page }, cb)
    })
  }

  /**
   * List all assemblies
   *
   * @param {object} params optional request options
   * @returns {Promise} list of Assemblies
   */
  async listAssembliesAsync (params) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/assemblies`,
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblies (params) {
    return new PaginationStream((page, cb) => {
      this.listAssemblies({ ...params, page }, cb)
    })
  }

  /**
   * Get an Assembly
   *
   * @param {string} assemblyId the Assembly Id
   * @returns {Promise} the retrieved Assembly
   */
  async getAssemblyAsync (assemblyId) {
    const opts = { url: this._serviceUrl() + `/assemblies/${assemblyId}` }

    const retryOpts = {
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    }

    return new Promise((resolve, reject) => {
      const operation = retry.operation(retryOpts)
      operation.attempt(async (attempt) => {
        try {
          const result = await this._remoteJson(opts)

          if (result.assembly_url == null || result.assembly_ssl_url == null) {
            if (operation.retry(new Error('got incomplete assembly status response'))) {
              return
            }

            return reject(operation.mainError())
          }

          return resolve(result)
        } catch (err) {
          if (operation.retry(err)) {
            return
          }

          return reject(operation.mainError())
        }
      })
    })
  }

  /**
   * Create an Assembly Template
   *
   * @param {object} params optional request options
   * @returns {Promise} when the template is created
   */
  async createTemplateAsync (params) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates`,
      method: 'post',
      params: params || {},
    }

    const result = await this._remoteJson(requestOpts)
    if (result && result.ok) {
      return result
    }

    let left
    throw new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg('while creating Template'))
  }

  /**
   * Edit an Assembly Template
   *
   * @param {string} templateId the template ID
   * @param {object} params optional request options
   * @returns {Promise} when the template is edited
   */
  async editTemplateAsync (templateId, params) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates/${templateId}`,
      method: 'put',
      params: params || {},
    }

    const result = await this._remoteJson(requestOpts)
    if (result && result.ok) {
      return result
    }

    let left
    throw new Error((left = result.error != null ? result.error : result.message) != null ? left : unknownErrMsg)
  }

  /**
   * Delete an Assembly Template
   *
   * @param {string} templateId the template ID
   * @returns {Promise} when the template is deleted
   */
  async deleteTemplateAsync (templateId) {
    const requestOpts = {
      url   : this._serviceUrl() + `/templates/${templateId}`,
      method: 'delete',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Get an Assembly Template
   *
   * @param {string} templateId the template ID
   * @returns {Promise} when the template is retrieved
   */
  async getTemplateAsync (templateId) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates/${templateId}`,
      method: 'get',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * List all Assembly Templates
   *
   * @param {object} params optional request options
   * @returns {Promise} the list of templates
   */
  async listTemplatesAsync (params) {
    const requestOpts = {
      url   : `${this._serviceUrl()}/templates`,
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamTemplates (params) {
    return new PaginationStream((page, cb) => {
      this.listTemplates({ ...params, page }, cb)
    })
  }

  /**
   * Get account Billing details for a specific month
   *
   * @param {string} month the date for the required billing in the format yyyy-mm
   * @returns {Promise} with billing data
   */
  async getBillAsync (month) {
    const requestOpts = {
      url   : this._serviceUrl() + `/bill/${month}`,
      method: 'get',
    }

    return this._remoteJson(requestOpts)
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
  _appendForm (form, params, streamsMap, fields) {
    const sigData = this.calcSignature(params)
    const jsonParams = sigData.params
    const { signature } = sigData

    form.append('params', jsonParams)

    if (fields != null) {
      for (let [key, val] of Object.entries(fields)) {
        if (_.isObject(val) || _.isArray(val)) {
          val = JSON.stringify(val)
        }
        form.append(key, val)
      }
    }

    form.append('signature', signature)

    if (streamsMap) Object.entries(streamsMap).forEach(([key, value]) => form.append(key, value))
  }

  // Implements HTTP GET query params, handling the case where the url already
  // has params.
  _appendParamsToUrl (url, params) {
    const sigData = this.calcSignature(params)
    const { signature } = sigData
    let jsonParams = sigData.params

    // TODO could be improved (potentially buggy)
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
  async _remoteJson (opts, streamsMap) {
    const operation = retry.operation({
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    })

    return new Promise((resolve, reject) => {
      operation.attempt(async () => {
        try {
          resolve(await this.__remoteJson(opts, streamsMap))
        } catch (err) {
          if (err.error === 'RATE_LIMIT_REACHED') {
            console.warn(`Rate limit reached, retrying request in ${err.info.retryIn} seconds.`)
            // FIXME uses private internals of node-retry
            operation._timeouts.unshift(1000 * err.info.retryIn)
            return operation.retry(err)
          }

          if (err.code === 'ENOTFOUND') {
            console.warn('The network connection is down, retrying request in 3 seconds.')
            // FIXME uses private internals of node-retry
            operation._timeouts.unshift(3 * 1000)
            return operation.retry(err)
          }

          if (err.error === 'GET_ACCOUNT_UNKNOWN_AUTH_KEY') {
            console.warn('Invalid auth key provided.')
            return reject(err)
          }

          if (err.error !== undefined) {
            const msg = []
            if (err.error) { msg.push(err.error) }
            if (opts.url) { msg.push(opts.url) }
            if (err.message) { msg.push(err.message) }

            console.warn(msg.join(' - '))
            return reject(err)
          }

          if (operation.retry(err)) {
            return
          }

          reject(operation.mainError())
        }
      })
    })
  }

  // Responsible for making API calls. Automatically sends streams with any POST,
  // PUT or DELETE requests. Automatically adds signature parameters to all
  // requests. Also automatically parses the JSON response.
  async __remoteJson (opts, streamsMap) {
    const timeout = opts.timeout || 5000
    let url = opts.url || null
    const method = opts.method || 'get'

    if (!url) {
      throw new Error('No url provided!')
    }

    if (method === 'get' && opts.params != null) {
      url = this._appendParamsToUrl(url, opts.params)
    }

    let form

    if (method === 'post' || method === 'put' || method === 'delete') {
      const extraData = { ...opts.fields }
      if (opts.tus_num_expected_upload_files) {
        extraData.tus_num_expected_upload_files = opts.tus_num_expected_upload_files
      }
      form = new FormData()
      this._appendForm(form, opts.params, streamsMap, extraData)
    }

    const requestOpts = {
      body   : form,
      timeout,
      headers: {
        'Transloadit-Client': `node-sdk:${version}`,
        ...opts.headers,
      },
      responseType: 'json',
    }

    const { body: result, statusCode } = await got[method](url, requestOpts)

    if (statusCode !== 200 && statusCode !== 404 && statusCode >= 400 && statusCode <= 599) {
        const extendedMessage = {}
      if (result.message && result.error) {
        extendedMessage.message = `${result.error}: ${result.message}`
        }
      throw _.extend(new Error(), result, extendedMessage)
      }

    return result
  }

  async _sendTusRequest (streamsMap, opts, onProgress) {
    const streamLabels = Object.keys(streamsMap)

    // TODO less cb nesting
    return new Promise((resolve, reject) => {
      let uploadsDone = 0
      let totalBytes = 0
      let lastEmittedProgress = 0
      const uploadProgresses = {}
      onProgress = onProgress || (() => {})
      for (const label of streamLabels) {
        const file = streamsMap[label]
        fs.stat(file.path, (err, { size }) => {
          if (err) return reject(err)

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
            resume  : true,
            metadata: {
              assembly_url: opts.assembly.assembly_ssl_url,
              fieldname   : label,
              filename,
            },
            uploadSize,
            onError   : reject,
            onProgress: onTusProgress,
            onSuccess () {
              uploadsDone++
              if (uploadsDone === streamLabels.length) {
                resolve()
              }
            },
          })

          tusUpload.start()
        })
      }
    })
  }

  // Legacy callback endpoints: TODO remove?

  createAssembly (opts, cb, progressCb) {
    this.createAssemblyAsync(opts, progressCb).then(val => cb(null, val)).catch(cb)
  }

  deleteAssembly (assembyId, cb) {
    this.deleteAssemblyAsync(assembyId).then(val => cb(null, val)).catch(cb)
  }

  replayAssembly (opts, cb) {
    this.replayAssemblyAsync(opts).then(val => cb(null, val)).catch(cb)
  }

  replayAssemblyNotification (opts, cb) {
    this.replayAssemblyNotificationAsync(opts).then(val => cb(null, val)).catch(cb)
  }

  listAssemblyNotifications (params, cb) {
    this.listAssemblyNotificationsAsync(params).then(val => cb(null, val)).catch(cb)
  }

  listAssemblies (params, cb) {
    this.listAssembliesAsync(params).then(val => cb(null, val)).catch(cb)
  }

  getAssembly (assembyId, cb) {
    this.getAssemblyAsync(assembyId).then(val => cb(null, val)).catch(cb)
  }

  createTemplate (params, cb) {
    this.createTemplateAsync(params).then(val => cb(null, val)).catch(cb)
  }

  editTemplate (templateId, params, cb) {
    this.editTemplateAsync(templateId, params).then(val => cb(null, val)).catch(cb)
  }

  deleteTemplate (templateId, cb) {
    this.deleteTemplateAsync(templateId).then(val => cb(null, val)).catch(cb)
  }

  getTemplate (templateId, cb) {
    this.getTemplateAsync(templateId).then(val => cb(null, val)).catch(cb)
  }

  listTemplates (params, cb) {
    this.listTemplatesAsync(params).then(val => cb(null, val)).catch(cb)
  }

  getBill (month, cb) {
    this.getBillAsync(month).then(val => cb(null, val)).catch(cb)
  }
}

module.exports = TransloaditClient
