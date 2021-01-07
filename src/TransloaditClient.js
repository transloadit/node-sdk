const got = require('got')
const FormData = require('form-data')
const crypto = require('crypto')
const fromPairs = require('lodash/fromPairs')
const sumBy = require('lodash/sumBy')
const extend = require('lodash/extend')
const isObject = require('lodash/isObject')
const fs = require('fs')
const { basename } = require('path')
const retry = require('retry')
const PaginationStream = require('./PaginationStream')
const tus = require('tus-js-client')
const { access, stat: fsStat } = require('fs').promises

const version = require('../package.json').version

function unknownErrMsg (str) {
  let buff = 'Unknown error'
  if (str) {
    buff += ` ${str}`
  }
  buff += '. Please report this at '
  buff += 'https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error'
  return buff
}

// eslint-disable-next-line handle-callback-err
function decorateError (err, body) {
  const extendedMessage = {}
  if (body.message && body.error) {
    extendedMessage.message = `${body.error}: ${body.message}`
  }
  return extend(err, body, extendedMessage)
}

function createUnknownError (result, str) {
  const left = result.error != null ? result.error : result.message
  return new Error(left != null ? left : unknownErrMsg(str))
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
    this._files = {}

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
    this._files[name] = path
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
   * @function onProgress
   * @param {progressObject} progress
   *
   * @param {object} opts assembly options
   * @param {onProgress} function to be triggered on each progress update of the assembly
   * @returns {Promise}
   */
  async createAssemblyAsync (opts, onProgress = () => {}) {
    const defaultOpts = {
      params           : {},
      fields           : {},
      waitForCompletion: false,
      isResumable      : true,
    }
    const { params, fields, waitForCompletion, isResumable } = { ...defaultOpts, ...opts }

    this._lastUsedAssemblyUrl = `${this._serviceUrl()}/assemblies`

    for (const [, path] of Object.entries(this._files)) {
      await access(path, fs.F_OK | fs.R_OK)
    }

    // Fileless streams
    const streamsMap = fromPairs(Object.entries(this._streams).map(([label, stream]) => [label, { stream }]))

    // Create streams from files
    for (const [label, path] of Object.entries(this._files)) {
      const stream = fs.createReadStream(path)
      stream.pause()
      streamsMap[label] = { stream, path }
    }

    // reset streams/files so they do not get used again in subsequent requests
    this._streams = {}
    this._files = {}

    const streams = Object.values(streamsMap)

    // If any stream emits error, we want to handle this and exit with error
    const streamErrorPromise = new Promise((resolve, reject) => {
      streams.forEach(({ stream }) => stream.on('error', reject))
    })

    const createAssemblyAndUpload = async () => {
      const useTus = isResumable && streams.every(({ path }) => path)

      const requestOpts = {
        urlSuffix: '/assemblies',
        method   : 'post',
        timeout  : 24 * 60 * 60 * 1000, // 1 day
        params,
        fields,
      }

      if (useTus) {
        requestOpts.fields.tus_num_expected_upload_files = streams.length
      } else if (isResumable) {
        console.warn('disabling resumability because the size of one or more streams cannot be determined')
      }

      // upload as form multipart or tus?
      const formUploadStreamsMap = useTus ? {} : streamsMap
      const tusStreamsMap = useTus ? streamsMap : {}

      const result = await this._remoteJson(requestOpts, formUploadStreamsMap, onProgress)

      // TODO should do this for all requests?
      if (result.error) {
        const err = new Error()
        throw decorateError(err, result)
      }

      if (useTus && Object.keys(tusStreamsMap).length > 0) {
        await this._sendTusRequest({
          streamsMap: tusStreamsMap,
          assembly  : result,
          onProgress,
        })
      }

      if (!waitForCompletion) return result
      return this.awaitAssemblyCompletion(result.assembly_id, onProgress)
    }

    return Promise.race([createAssemblyAndUpload(), streamErrorPromise])
  }

  async awaitAssemblyCompletion (assemblyId, onProgress) {
    const result = await this.getAssemblyAsync(assemblyId)
    if (result.error) {
      const err = new Error()
      throw decorateError(err, result)
    }

    if (result.ok === 'ASSEMBLY_COMPLETED') return result

    if (result.ok === 'ASSEMBLY_UPLOADING' || result.ok === 'ASSEMBLY_EXECUTING') {
      onProgress({ assemblyProgress: result })

      await new Promise((resolve) => setTimeout(resolve, 1 * 1000))
      // Recurse
      return this.awaitAssemblyCompletion(assemblyId, onProgress)
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
    // You may wonder why do we need to call getAssembly first:
    // If we use the default base URL (instead of the one returned in assembly_url_ssl), the delete call will hang in certain cases
    // See test "should stop the assembly from reaching completion"
    const { assembly_ssl_url: url } = await this.getAssemblyAsync(assemblyId)
    const opts = {
      url,
      // urlSuffix: `/assemblies/${assemblyId}`, // Cannot simply do this, see above
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
      urlSuffix: `/assemblies/${assemblyId}/replay`,
      method   : 'post',
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
      urlSuffix: `/assembly_notifications/${assemblyId}/replay`,
      method   : 'post',
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
      urlSuffix: '/assembly_notifications',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblyNotifications (params) {
    return new PaginationStream(async (page) => this.listAssemblyNotificationsAsync({ ...params, page }))
  }

  /**
   * List all assemblies
   *
   * @param {object} params optional request options
   * @returns {Promise} list of Assemblies
   */
  async listAssembliesAsync (params) {
    const requestOpts = {
      urlSuffix: '/assemblies',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblies (params) {
    return new PaginationStream(async (page) => this.listAssembliesAsync({ ...params, page }))
  }

  /**
   * Get an Assembly
   *
   * @param {string} assemblyId the Assembly Id
   * @returns {Promise} the retrieved Assembly
   */
  async getAssemblyAsync (assemblyId) {
    const retryOpts = {
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    }

    return new Promise((resolve, reject) => {
      const operation = retry.operation(retryOpts)
      operation.attempt(async () => {
        try {
          const result = await this._remoteJson({ urlSuffix: `/assemblies/${assemblyId}` })

          if (result.assembly_url == null || result.assembly_ssl_url == null) {
            if (operation.retry(new Error('got incomplete assembly status response'))) {
              return
            }

            return reject(operation.mainError())
          }

          return resolve(result)
        } catch (err) {
          reject(err)
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
      urlSuffix: '/templates',
      method   : 'post',
      params   : params || {},
    }

    const result = await this._remoteJson(requestOpts)
    if (result && result.ok) {
      return result
    }

    throw createUnknownError(result, 'while creating Template')
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
      urlSuffix: `/templates/${templateId}`,
      method   : 'put',
      params   : params || {},
    }

    const result = await this._remoteJson(requestOpts)
    if (result && result.ok) {
      return result
    }

    throw createUnknownError(result, 'while editing Template')
  }

  /**
   * Delete an Assembly Template
   *
   * @param {string} templateId the template ID
   * @returns {Promise} when the template is deleted
   */
  async deleteTemplateAsync (templateId) {
    const requestOpts = {
      urlSuffix: `/templates/${templateId}`,
      method   : 'delete',
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
      urlSuffix: `/templates/${templateId}`,
      method   : 'get',
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
      urlSuffix: '/templates',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamTemplates (params) {
    return new PaginationStream(async (page) => this.listTemplatesAsync({ ...params, page }))
  }

  /**
   * Get account Billing details for a specific month
   *
   * @param {string} month the date for the required billing in the format yyyy-mm
   * @returns {Promise} with billing data
   */
  async getBillAsync (month) {
    const requestOpts = {
      urlSuffix: `/bill/${month}`,
      method   : 'get',
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
      for (const [key, val] of Object.entries(fields)) {
        form.append(key, isObject(val) ? JSON.stringify(val) : val)
      }
    }

    form.append('signature', signature)

    if (streamsMap) {
      Object.entries(streamsMap).forEach(([label, { stream, path }]) => {
        const options = path ? undefined : { filename: label } // https://github.com/transloadit/node-sdk/issues/86
        form.append(label, stream, options)
      })
    }
  }

  // Implements HTTP GET query params, handling the case where the url already
  // has params.
  _appendParamsToUrl (url, params) {
    const { signature, params: jsonParams } = this.calcSignature(params)

    const prefix = url.indexOf('?') === -1 ? '?' : '&'

    return `${url}${prefix}signature=${signature}&params=${encodeURIComponent(jsonParams)}`
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
  async _remoteJson (opts, streamsMap, onProgress) {
    const operation = retry.operation({
      retries   : 5,
      factor    : 3.28,
      minTimeout: 1 * 1000,
      maxTimeout: 8 * 1000,
    })

    // Allow providing either a `urlSuffix` or a full `url`
    const { urlSuffix, url: urlInput, ...rest } = opts
    if (!urlSuffix && !urlInput) throw new Error('No URL provided')
    const url = urlInput || `${this._serviceUrl()}${urlSuffix}`

    const newOpts = { ...rest, url }

    return new Promise((resolve, reject) => {
      operation.attempt(async () => {
        try {
          // console.log('__remoteJson', url)
          resolve(await this.__remoteJson(newOpts, streamsMap, onProgress))
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
            msg.push(opts.method)
            msg.push(url)
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
  async __remoteJson (opts, streamsMap, onProgress) {
    const timeout = opts.timeout || 5000
    let url = opts.url || null
    const method = opts.method || 'get'
    const params = opts.params || {}

    if (method === 'get') {
      url = this._appendParamsToUrl(url, params)
    }

    let form

    if (method === 'post' || method === 'put' || method === 'delete') {
      form = new FormData()
      this._appendForm(form, params, streamsMap, opts.fields)
    }

    const isUploadingStreams = streamsMap && Object.keys(streamsMap).length > 0

    const retry = 0

    const requestOpts = {
      retry,
      body   : form,
      timeout,
      headers: {
        'Transloadit-Client': `node-sdk:${version}`,
        'User-Agent'        : undefined, // Remove got's user-agent
        ...opts.headers,
      },
      responseType: 'json',
    }

    // For non-file streams transfer encoding does not get set, and the uploaded files will not get accepted
    // https://github.com/transloadit/node-sdk/issues/86
    // https://github.com/form-data/form-data/issues/394#issuecomment-573595015
    if (isUploadingStreams) requestOpts.headers['transfer-encoding'] = 'chunked'

    try {
      const request = got[method](url, requestOpts)
      if (isUploadingStreams) {
        request.on('uploadProgress', ({ percent, transferred, total }) => onProgress({ uploadProgress: { uploadedBytes: transferred, totalBytes: total } }))
      }
      const { body } = await request
      return body
    } catch (err) {
      if (err instanceof got.HTTPError) {
        const { statusCode, body } = err.response
        // console.log(statusCode, body)

        if (statusCode === 404 || statusCode > 599) { // TODO why is this needed?
          return body
        }

        // TODO use HTTPError instead? or provide statuscode etc
        const err2 = new Error()
        throw decorateError(err2, body)
      }

      throw err
    }
  }

  async _sendTusRequest ({ streamsMap, assembly, onProgress }) {
    const streamLabels = Object.keys(streamsMap)

    let totalBytes = 0
    let lastEmittedProgress = 0

    const sizes = {}

    // Initialize data
    for (const label of streamLabels) {
      const { path } = streamsMap[label]

      if (path) {
        const { size } = await fsStat(path)
        sizes[label] = size
        totalBytes += size
      }
    }

    const uploadProgresses = {}

    async function uploadSingleStream (label) {
      uploadProgresses[label] = 0

      const { stream, path } = streamsMap[label]
      const size = sizes[label]

      const onTusProgress = (bytesUploaded) => {
        uploadProgresses[label] = bytesUploaded

        // get all uploaded bytes for all files
        const uploadedBytes = sumBy(streamLabels, (label) => uploadProgresses[label])

        // don't send redundant progress
        if (lastEmittedProgress < uploadedBytes) {
          lastEmittedProgress = uploadedBytes
          onProgress({ uploadProgress: { uploadedBytes, totalBytes } })
        }
      }

      const filename = path ? basename(path) : label

      await new Promise((resolve, reject) => {
        const tusUpload = new tus.Upload(stream, {
          endpoint: assembly.tus_url,
          metadata: {
            assembly_url: assembly.assembly_ssl_url,
            fieldname   : label,
            filename,
          },
          uploadSize: size,
          onError   : reject,
          onProgress: onTusProgress,
          onSuccess : resolve,
        })

        tusUpload.start()
      })

      // console.log(label, 'upload done')
    }

    // TODO throttle concurrency? Can use p-map
    const promises = streamLabels.map((label) => uploadSingleStream(label))
    await Promise.all(promises)
  }

  // Legacy callback endpoints: TODO remove?

  createAssembly (opts, cb, onProgress) {
    this.createAssemblyAsync(opts, onProgress).then(val => cb(null, val)).catch(cb)
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
