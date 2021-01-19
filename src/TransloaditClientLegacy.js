const isObject = require('lodash/isObject')
const { callbackify } = require('util')

const TransloaditClient = require('./TransloaditClient')

/** Legacy compatibility layer (DO NOT USE!) */
class TransloaditClientLegacy {
  constructor (opts) {
    this._client = new TransloaditClient(opts)

    this._streams = {}
    this._files = {}

    this.deleteAssembly = callbackify(this._client.cancelAssembly.bind(this._client))
    this.listAssemblyNotifications = callbackify(this._client.listAssemblyNotifications.bind(this._client))
    this.listAssemblies = callbackify(this._client.listAssemblies.bind(this._client))
    this.getAssembly = callbackify(this._client.getAssembly.bind(this._client))
    this.createTemplate = callbackify(this._client.createTemplate.bind(this._client))
    this.editTemplate = callbackify(this._client.editTemplate.bind(this._client))
    this.deleteTemplate = callbackify(this._client.deleteTemplate.bind(this._client))
    this.getTemplate = callbackify(this._client.getTemplate.bind(this._client))
    this.listTemplates = callbackify(this._client.listTemplates.bind(this._client))
    this.getBill = callbackify(this._client.getBill.bind(this._client))
  }

  addStream (name, value) {
    this._streams[name] = value
  }

  addFile (name, path) {
    this._files[name] = path
  }

  getLastUsedAssemblyUrl () {
    return this._client.getLastUsedAssemblyUrl()
  }

  createAssembly (opts = {}, cb, progressCb = () => {}) {
    // Reset streams/files so they do not get used again in subsequent requests
    // NOTE: This needs to be done in the same tick (preferrably on top of the function)
    // See https://github.com/transloadit/node-sdk/pull/87#issuecomment-762858386
    const uploads = this._streams
    const files = this._files
    this._streams = {}
    this._files = {}

    const { fields: optsFields = {}, params = {}, waitForCompletion = false, isResumable = true } = opts

    const { fields: paramsFields = {}, ...restParams } = params

    // Combine fields (in new API they are combined)
    const fields = Object.fromEntries(Object.entries({ ...paramsFields, ...optsFields }).map(([key, val]) => {
      if (isObject(fields[key])) {
        val = JSON.stringify(fields[key])
      }
      return [key, val]
    }))

    const onUploadProgress = ({ uploadedBytes, totalBytes }) => progressCb({ uploadProgress: { uploadedBytes, totalBytes } })
    const onAssemblyProgress = (assemblyProgress) => progressCb({ assemblyProgress })

    this._client.createAssembly({
      params: {
        ...restParams,
        fields,
      },
      uploads,
      files,
      onUploadProgress,
      onAssemblyProgress,
      waitForCompletion,
      isResumable,
    }).then((result) => cb(null, result))
      .catch((err) => cb(err))
  }

  replayAssembly ({ assembly_id: assemblyId, ...params }, cb) {
    this._client.replayAssembly(assemblyId, params).then((val) => cb(null, val)).catch((err) => cb(err))
  }

  replayAssemblyNotification ({ assembly_id: assemblyId, ...params }, cb) {
    this._client.replayAssemblyNotification(assemblyId, params).then((val) => cb(null, val)).catch((err) => cb(err))
  }

  streamAssemblyNotifications (params) {
    return this._client.streamAssemblyNotifications(params)
  }

  streamAssemblies (params) {
    return this._client.streamAssemblies(params)
  }

  streamTemplates (params) {
    return this._client.streamTemplates(params)
  }

  calcSignature (params) {
    return this._client.calcSignature(params)
  }
}

module.exports = TransloaditClientLegacy
