reqr    = if global.GENTLY then GENTLY.hijack(require) else require
request = reqr "request"
crypto  = reqr "crypto"
_       = reqr "underscore"
fs      = reqr "fs"

class TransloaditClient
  constructor: (opts) ->
    opts = opts || {}

    @_authKey    = opts.authKey || null
    @_authSecret = opts.authSecret || null
    @_service    = opts.service || "api2.transloadit.com"
    @_region     = opts.region || "us-east-1"
    @_protocol   = "http://"
    @_streams    = {}

  addStream: (name, stream) ->
    stream.pause()
    @_streams[name] = stream

  addFile: (name, path) ->
    stream = fs.createReadStream path
    @addStream name, stream

  createAssembly: (opts, cb) ->
    @_getBoredInstance null, true, (err, url) =>
      if err || !url?
        return cb err

      requestOpts =
        url     : "http://api2.#{url}/assemblies"
        method  : "post"
        timeout : 24 * 60 * 60 * 1000
        params  : opts.params || {}
        fields  : opts.fields || {}

      @_remoteJson requestOpts, (err, result) =>
        # reset streams so they do not get used again in subsequent requests
        @_streams = {}

        if err
          return cb err

        if result && result.ok
          return cb null, result

        err = new Error(result.error || "NOT OK")
        cb err

  deleteAssembly: (assemblyId, cb) ->
    opts =
      url     : @_serviceUrl() + "/assemblies/#{assemblyId}"
      timeout : 16000

    @_remoteJson opts, (err, result) ->
      if err
        return cb err

      opts =
        url     : result.assembly_url
        timeout : 5000
      request.del opts, cb

  replayAssembly: (opts, cb) ->
    assemblyId = opts.assembly_id

    requestOpts =
      url     : @_serviceUrl() + "/assemblies/#{assemblyId}/replay"
      timeout : 5000
      method  : "post"

    if opts.notify_url?
      requestOpts.params =
        notify_url: opts.notify_url

    @_remoteJson requestOpts, cb

  replayAssemblyNotification: (opts, cb) ->
    assemblyId = opts.assembly_id

    requestOpts =
      url     : @_serviceUrl() + "/assembly_notifications/#{assemblyId}/replay"
      timeout : 5000
      method  : "post"

    if opts.notify_url?
      requestOpts.params =
        notify_url: opts.notify_url

    @_remoteJson requestOpts, cb

  assemblyStatus: (assemblyId, cb) ->
    opts =
      url     : @_serviceUrl() + "/assemblies/#{assemblyId}"
      timeout : 5000

    @_remoteJson opts, (err, result) =>
      if err
        return cb err

      status = result

      opts =
        url     : result.assembly_url
        timeout : 5000

      @_remoteJson opts, (err, result) ->
        if err
          return cb null, status

        cb null, result

  calcSignature: (toSign) ->
    return crypto
    .createHmac("sha1", @_authSecret)
    .update(new Buffer(toSign, "utf-8"))
    .digest "hex"

  _appendForm: (req, params, fields) ->
    jsonParams = @_prepareParams params
    signature  = @calcSignature jsonParams
    form       = req.form()

    form.append "params", jsonParams

    if !fields?
      fields = []

    for key of fields
      val = fields[key]
      if _.isObject(fields[key]) || _.isArray(fields[key])
        val = JSON.stringify(fields[key])

      form.append key, val

    form.append "signature", signature

    _.each @_streams, (value, key) ->
      form.append key, value

  _getBoredInstance: (url, customBoredLogic, cb) ->
    if url == null
      url  = @_serviceUrl() + "/instances/bored"

    opts =
      url     : url
      timeout : 5000

    @_remoteJson opts, (err, instance) =>
      if !err
        if instance.error
          return cb instance.error

        return cb null, instance.api2_host

      if customBoredLogic
        @_findBoredInstanceUrl (err, theUrl) =>
          if err
            err =
              error   : "BORED_INSTANCE_ERROR"
              message : "Could not find a bored instance. #{err.message}"

            return cb err

          url = "#{@_protocol}api2.#{theUrl}/instances/bored"
          @_getBoredInstance url, false, cb

        return

      err =
        error   : "CONNECTION_ERROR"
        message : "There was a problem connecting to the upload server"
        reason  : err.message
        url     : url

      cb err

  _findBoredInstanceUrl: (cb) ->
    url = "http://infra-#{@_region}.transloadit.com.s3.amazonaws.com/"
    url += "cached_instances.json"

    opts =
      url     : url
      timeout : 3000

    @_remoteJson opts, (err, result) =>
      if err
        err.message = "Could not query S3 for cached uploaders: #{err.message}"
        return cb err

      instances = _.shuffle result.uploaders
      @_findResponsiveInstance instances, 0, cb

  _findResponsiveInstance: (instances, index, cb) ->
    if !instances[index]
      err = new Error "No responsive uploaders"
      return cb err

    url = @_protocol + instances[index]
    opts =
      url     : url
      timeout : 3000

    @_remoteJson opts, (err, result) =>
      if err
        return @_findResponsiveInstance instances, index + 1, cb

      cb null, url

  _prepareParams: (params) ->
    if !params?
      params = {}

    if !params.auth?
      params.auth = {}

    if !params.auth.key?
      params.auth.key = @_authKey

    params.auth.expires = @_getExpiresDate()
    return JSON.stringify params

  _getExpiresDate: ->
    expiresDate = new Date()
    expiresDate.setDate expiresDate.getDate() + 1
    return expiresDate.toISOString()

  _serviceUrl: ->
    return @_protocol + @_service

  _remoteJson: (opts, cb) ->
    timeout = opts.timeout || 5000
    url     = opts.url || null
    method  = opts.method || "get"

    if !url
      err = new Error "No url provided!"
      return cb err

    requestOpts =
      uri     : url
      timeout : timeout

    req = request[method] requestOpts, (err, res) ->
      if err
        return cb err

      result = null
      try
        result = JSON.parse res.body
      catch e
        return cb e
      cb null, result

    if method == "post"
      @_appendForm req, opts.params, opts.fields


module.exports = TransloaditClient
