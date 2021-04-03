const got = require('got')
const FormData = require('form-data')
const crypto = require('crypto')
const fromPairs = require('lodash/fromPairs')
const sumBy = require('lodash/sumBy')
const fs = require('fs')
const { basename } = require('path')
const tus = require('tus-js-client')
const { access, stat: fsStat } = require('fs').promises
const log = require('debug')('transloadit')
const logWarn = require('debug')('transloadit:warn')
const intoStream = require('into-stream')
const isStream = require('is-stream')
const assert = require('assert')
const pMap = require('p-map')
const uuid = require('uuid')

const PaginationStream = require('./PaginationStream')
const { version } = require('../package.json')

function decorateError (err, body) {
  if (!body) return err
  let { message } = err

  // Provide a more useful message if there is one
  if (body.message && body.error) message = `${body.error}: ${body.message}`
  else if (body.error) message = body.error

  if (body.assembly_ssl_url) message += ` - ${body.assembly_ssl_url}`

  /* eslint-disable no-param-reassign */
  err.message = message
  if (body.assembly_id) err.assemblyId = body.assembly_id
  if (body.error) err.transloaditErrorCode = body.error
  /* eslint-enable no-param-reassign */

  return err
}

class InconsistentResponseError extends Error {
  constructor (message) {
    super(message)
    this.name = 'InconsistentResponseError'
  }
}

// Not sure if this is still a problem with the API, but throw a special error type so the user can retry if needed
function checkAssemblyUrls (result) {
  if (result.assembly_url == null || result.assembly_ssl_url == null) {
    throw new InconsistentResponseError('Server returned an incomplete assembly response (no URL)')
  }
}

const isFileBasedStream = (stream) => !!stream.path

function getHrTimeMs () {
  return Number(process.hrtime.bigint() / 1000000n)
}

function checkResult (result) {
  // In case server returned a successful HTTP status code, but an `error` in the JSON object
  // This happens sometimes when createAssembly with an invalid file (IMPORT_FILE_ERROR)
  if (typeof result === 'object' && result !== null && typeof result.error === 'string') {
    const err = new Error('Error in response')
    // Mimic got HTTPError structure
    err.response = {
      body: result,
    }
    throw decorateError(err, result)
  }
}

async function sendTusRequest ({ streamsMap, assembly, onProgress }) {
  const streamLabels = Object.keys(streamsMap)

  let totalBytes = 0
  let lastEmittedProgress = 0

  const sizes = {}

  // Initialize data
  await pMap(streamLabels, async (label) => {
    const { path } = streamsMap[label]

    if (path) {
      const { size } = await fsStat(path)
      sizes[label] = size
      totalBytes += size
    }
  }, { concurrency: 5 })

  const uploadProgresses = {}

  async function uploadSingleStream (label) {
    uploadProgresses[label] = 0

    const { stream, path } = streamsMap[label]
    const size = sizes[label]

    const onTusProgress = (bytesUploaded) => {
      uploadProgresses[label] = bytesUploaded

      // get all uploaded bytes for all files
      const uploadedBytes = sumBy(streamLabels, (l) => uploadProgresses[l])

      // don't send redundant progress
      if (lastEmittedProgress < uploadedBytes) {
        lastEmittedProgress = uploadedBytes
        onProgress({ uploadedBytes, totalBytes })
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

    log(label, 'upload done')
  }

  // TODO throttle concurrency? Can use p-map
  const promises = streamLabels.map((label) => uploadSingleStream(label))
  await Promise.all(promises)
}

class TransloaditClient {
  constructor (opts = {}) {
    if (opts.authKey == null) {
      throw new Error('Please provide an authKey')
    }

    if (opts.authSecret == null) {
      throw new Error('Please provide an authSecret')
    }

    if (opts.endpoint && opts.endpoint.endsWith('/')) {
      throw new Error('Trailing slash in endpoint is not allowed')
    }

    this._authKey = opts.authKey
    this._authSecret = opts.authSecret
    this._endpoint = opts.endpoint || 'https://api2.transloadit.com'
    this._maxRetries = opts.maxRetries != null ? opts.maxRetries : 5
    this._defaultTimeout = opts.timeout != null ? opts.timeout : 60000

    this._lastUsedAssemblyUrl = ''
  }

  getLastUsedAssemblyUrl () {
    return this._lastUsedAssemblyUrl
  }

  setDefaultTimeout (timeout) {
    this._defaultTimeout = timeout
  }

  /**
   * Create an Assembly
   *
   * @param {object} opts assembly options
   * @returns {Promise}
   */
  createAssembly (opts = {}, arg2) {
    // Warn users of old callback API
    if (typeof arg2 === 'function') {
      throw new TypeError('You are trying to send a function as the second argument. This is no longer valid in this version. Please see github README for usage.')
    }

    const {
      params = {},
      waitForCompletion = false,
      isResumable = true,
      timeout = 24 * 60 * 60 * 1000, // 1 day
      onUploadProgress = () => {},
      onAssemblyProgress = () => {},
      files = {},
      uploads = {},
      assemblyId,
    } = opts

    // Keep track of how long the request took
    const startTimeMs = getHrTimeMs()

    // Undocumented feature to allow specifying a custom assembly id from the client
    // Not recommended for general use due to security. E.g if the user doesn't provide a cryptographically
    // secure ID, then anyone could access the assembly.
    let effectiveAssemblyId
    if (assemblyId != null) {
      effectiveAssemblyId = assemblyId
    } else {
      effectiveAssemblyId = uuid.v4().replace(/-/g, '')
    }
    const urlSuffix = `/assemblies/${effectiveAssemblyId}`

    // We want to be able to return the promise immediately with custom data
    const promise = (async () => {
      this._lastUsedAssemblyUrl = `${this._endpoint}${urlSuffix}`

      // eslint-disable-next-line no-bitwise
      await pMap(Object.entries(files), async ([, path]) => access(path, fs.F_OK | fs.R_OK), { concurrency: 5 })

      // Convert uploads to streams
      const streamsMap = fromPairs(Object.entries(uploads).map(([label, value]) => {
        const isReadable = isStream.readable(value)
        if (!isReadable && isStream(value)) {
          // https://github.com/transloadit/node-sdk/issues/92
          throw new Error(`Upload named "${label}" is not a Readable stream`)
        }

        return [
          label,
          isStream.readable(value) ? value : intoStream(value),
        ]
      }))

      // Wrap in object structure (so we can know if it's a pathless stream or not)
      const allStreamsMap = fromPairs(Object.entries(streamsMap).map(([label, stream]) => [label, { stream }]))

      // Create streams from files too
      for (const [label, path] of Object.entries(files)) {
        const stream = fs.createReadStream(path)
        allStreamsMap[label] = { stream, path } // File streams have path
      }

      const allStreams = Object.values(allStreamsMap)

      // Pause all streams
      allStreams.forEach(({ stream }) => stream.pause())

      // If any stream emits error, we want to handle this and exit with error
      const streamErrorPromise = new Promise((resolve, reject) => {
        allStreams.forEach(({ stream }) => stream.on('error', reject))
      })

      const createAssemblyAndUpload = async () => {
        const useTus = isResumable && allStreams.every(isFileBasedStream)

        const requestOpts = {
          urlSuffix,
          method: 'post',
          timeout,
          params,
        }

        if (useTus) {
          requestOpts.fields = {
            tus_num_expected_upload_files: allStreams.length,
          }
        } else if (isResumable) {
          logWarn('Disabling resumability because the size of one or more streams cannot be determined')
        }

        // upload as form multipart or tus?
        const formUploadStreamsMap = useTus ? {} : allStreamsMap
        const tusStreamsMap = useTus ? allStreamsMap : {}

        const result = await this._remoteJson(requestOpts, formUploadStreamsMap, onUploadProgress)
        checkResult(result)

        if (useTus && Object.keys(tusStreamsMap).length > 0) {
          await sendTusRequest({
            streamsMap: tusStreamsMap,
            assembly  : result,
            onProgress: onUploadProgress,
          })
        }

        if (!waitForCompletion) return result
        const awaitResult = await this.awaitAssemblyCompletion(result.assembly_id, {
          timeout, onAssemblyProgress, startTimeMs,
        })
        checkResult(awaitResult)
        return awaitResult
      }

      return Promise.race([createAssemblyAndUpload(), streamErrorPromise])
    })()

    // This allows the user to use or log the assemblyId even before it has been created for easier debugging
    promise.assemblyId = effectiveAssemblyId
    return promise
  }

  async awaitAssemblyCompletion (assemblyId, {
    onAssemblyProgress = () => {},
    timeout,
    startTimeMs = getHrTimeMs(),
    interval = 1000,
  } = {}) {
    assert(assemblyId)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.getAssembly(assemblyId)

      if (!['ASSEMBLY_UPLOADING', 'ASSEMBLY_EXECUTING', 'ASSEMBLY_REPLAYING'].includes(result.ok)) {
        return result // Done!
      }

      try {
        onAssemblyProgress(result)
      } catch (err) {
        log('Caught onAssemblyProgress error', err)
      }

      const nowMs = getHrTimeMs()
      if (timeout != null && nowMs - startTimeMs >= timeout) {
        const err = new Error('Polling timed out')
        err.code = 'POLLING_TIMED_OUT'
        throw err
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   * Cancel the assembly
   *
   * @param {string} assemblyId assembly ID
   * @returns {Promise} after the assembly is deleted
   */
  async cancelAssembly (assemblyId) {
    // You may wonder why do we need to call getAssembly first:
    // If we use the default base URL (instead of the one returned in assembly_url_ssl),
    // the delete call will hang in certain cases
    // See test "should stop the assembly from reaching completion"
    const { assembly_ssl_url: url } = await this.getAssembly(assemblyId)
    const opts = {
      url,
      // urlSuffix: `/assemblies/${assemblyId}`, // Cannot simply do this, see above
      method: 'delete',
    }

    return this._remoteJson(opts)
  }

  /**
   * Replay an Assembly
   *
   * @param {string} assemblyId of the assembly to replay
   * @param {object} optional params
   * @returns {Promise} after the replay is started
   */
  async replayAssembly (assemblyId, params = {}) {
    const requestOpts = {
      urlSuffix: `/assemblies/${assemblyId}/replay`,
      method   : 'post',
    }
    if (Object.keys(params).length > 0) requestOpts.params = params
    const result = await this._remoteJson(requestOpts)
    checkResult(result)
    return result
  }

  /**
   * Replay an Assembly notification
   *
   * @param {string} assemblyId of the assembly whose notification to replay
   * @param {object} optional params
   * @returns {Promise} after the replay is started
   */
  async replayAssemblyNotification (assemblyId, params = {}) {
    const requestOpts = {
      urlSuffix: `/assembly_notifications/${assemblyId}/replay`,
      method   : 'post',
    }
    if (Object.keys(params).length > 0) requestOpts.params = params
    return this._remoteJson(requestOpts)
  }

  /**
   * List all assembly notifications
   *
   * @param {object} params optional request options
   * @returns {Promise} the list of Assembly notifications
   */
  async listAssemblyNotifications (params) {
    const requestOpts = {
      urlSuffix: '/assembly_notifications',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblyNotifications (params) {
    return new PaginationStream(async (page) => this.listAssemblyNotifications({ ...params, page }))
  }

  /**
   * List all assemblies
   *
   * @param {object} params optional request options
   * @returns {Promise} list of Assemblies
   */
  async listAssemblies (params) {
    const requestOpts = {
      urlSuffix: '/assemblies',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblies (params) {
    return new PaginationStream(async (page) => this.listAssemblies({ ...params, page }))
  }

  /**
   * Get an Assembly
   *
   * @param {string} assemblyId the Assembly Id
   * @returns {Promise} the retrieved Assembly
   */
  async getAssembly (assemblyId) {
    const result = await this._remoteJson({ urlSuffix: `/assemblies/${assemblyId}` })
    checkAssemblyUrls(result)
    return result
  }

  /**
   * Create an Assembly Template
   *
   * @param {object} params optional request options
   * @returns {Promise} when the template is created
   */
  async createTemplate (params) {
    const requestOpts = {
      urlSuffix: '/templates',
      method   : 'post',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Edit an Assembly Template
   *
   * @param {string} templateId the template ID
   * @param {object} params optional request options
   * @returns {Promise} when the template is edited
   */
  async editTemplate (templateId, params) {
    const requestOpts = {
      urlSuffix: `/templates/${templateId}`,
      method   : 'put',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Delete an Assembly Template
   *
   * @param {string} templateId the template ID
   * @returns {Promise} when the template is deleted
   */
  async deleteTemplate (templateId) {
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
  async getTemplate (templateId) {
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
  async listTemplates (params) {
    const requestOpts = {
      urlSuffix: '/templates',
      method   : 'get',
      params   : params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamTemplates (params) {
    return new PaginationStream(async (page) => this.listTemplates({ ...params, page }))
  }

  /**
   * Get account Billing details for a specific month
   *
   * @param {string} month the date for the required billing in the format yyyy-mm
   * @returns {Promise} with billing data
   */
  async getBill (month) {
    assert(month, 'month is required')
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
        form.append(key, val)
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
  _prepareParams (paramsIn) {
    let params = paramsIn
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

  // We want to mock this method
  // eslint-disable-next-line class-methods-use-this
  _getExpiresDate () {
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + 1)
    return expiresDate.toISOString()
  }

  // Responsible for making API calls. Automatically sends streams with any POST,
  // PUT or DELETE requests. Automatically adds signature parameters to all
  // requests. Also automatically parses the JSON response.
  async _remoteJson (opts, streamsMap, onProgress = () => {}) {
    const { urlSuffix, url: urlInput, timeout = this._defaultTimeout, method = 'get', params = {}, fields, headers } = opts

    // Allow providing either a `urlSuffix` or a full `url`
    if (!urlSuffix && !urlInput) throw new Error('No URL provided')
    let url = urlInput || `${this._endpoint}${urlSuffix}`

    if (method === 'get') {
      url = this._appendParamsToUrl(url, params)
    }

    log('Sending request', method, url)

    // Cannot use got.retry because we are using FormData which is a stream and can only be used once
    // https://github.com/sindresorhus/got/issues/1282
    for (let retryCount = 0; ; retryCount++) {
      let form

      if (method === 'post' || method === 'put' || method === 'delete') {
        form = new FormData()
        this._appendForm(form, params, streamsMap, fields)
      }

      const isUploadingStreams = streamsMap && Object.keys(streamsMap).length > 0

      const requestOpts = {
        retry  : 0,
        body   : form,
        timeout,
        headers: {
          'Transloadit-Client': `node-sdk:${version}`,
          'User-Agent'        : undefined, // Remove got's user-agent
          ...headers,
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
          request.on('uploadProgress', ({ transferred, total }) => onProgress({ uploadedBytes: transferred, totalBytes: total }))
        }
        // eslint-disable-next-line no-await-in-loop
        const { body } = await request
        return body
      } catch (err) {
        if (!(err instanceof got.HTTPError)) throw err

        const { statusCode, body } = err.response
        logWarn('HTTP error', statusCode, body)

        const shouldRetry = statusCode === 413 && body.error === 'RATE_LIMIT_REACHED' && body.info && body.info.retryIn && retryCount < this._maxRetries

        // https://transloadit.com/blog/2012/04/introducing-rate-limiting/
        if (!shouldRetry) throw decorateError(err, body)

        const { retryIn: retryInSec } = body.info
        logWarn(`Rate limit reached, retrying request in approximately ${retryInSec} seconds.`)
        const retryInMs = 1000 * (retryInSec * (1 + 0.1 * Math.random()))
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, retryInMs))
        // Retry
      }
    }
  }
}

// See https://github.com/sindresorhus/got#errors
// Expose relevant errors
TransloaditClient.RequestError = got.RequestError
TransloaditClient.ReadError = got.ReadError
TransloaditClient.ParseError = got.ParseError
TransloaditClient.UploadError = got.UploadError
TransloaditClient.HTTPError = got.HTTPError
TransloaditClient.MaxRedirectsError = got.MaxRedirectsError
TransloaditClient.TimeoutError = got.TimeoutError

TransloaditClient.InconsistentResponseError = InconsistentResponseError

module.exports = TransloaditClient
