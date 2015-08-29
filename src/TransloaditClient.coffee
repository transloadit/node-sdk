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
    @_protocol   = if opts.useSsl then "https://" else "http://"
    @_streams    = {}

    @_lastUsedAssemblyUrl = ""

  addStream: (name, stream) ->
    stream.pause()
    @_streams[name] = stream

  addFile: (name, path) ->
    stream = fs.createReadStream path
    @addStream name, stream

  getLastUsedAssemblyUrl: ->
    return @_lastUsedAssemblyUrl

  createAssembly: (opts, cb) ->
    @_getBoredInstance null, true, (err, url) =>
      if err || !url?
        return cb err

      @_lastUsedAssemblyUrl = "#{@_protocol}api2-#{url}/assemblies"

      requestOpts =
        url     : @_lastUsedAssemblyUrl
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
    assemblyId  = opts.assembly_id
    requestOpts =
      url     : @_serviceUrl() + "/assemblies/#{assemblyId}/replay"
      method  : "post"

    if opts.notify_url?
      requestOpts.params =
        notify_url: opts.notify_url

    @_remoteJson requestOpts, cb

  replayAssemblyNotification: (opts, cb) ->
    assemblyId  = opts.assembly_id
    requestOpts =
      url     : @_serviceUrl() + "/assembly_notifications/#{assemblyId}/replay"
      method  : "post"

    if opts.notify_url?
      requestOpts.params =
        notify_url: opts.notify_url

    @_remoteJson requestOpts, cb

  listAssemblyNotifications: (params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/assembly_notifications"
      method  : "get"
      params  : params || {}

    @_remoteJson requestOpts, cb

  listAssemblies: (params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/assemblies"
      method  : "get"
      params  : params || {}

    @_remoteJson requestOpts, cb

  getAssembly: (assemblyId, cb) ->
    opts =
      url: @_serviceUrl() + "/assemblies/#{assemblyId}"

    @_remoteJson opts, (err, result) =>
      if err
        return cb err

      status = result
      opts   =
        url     : result.assembly_url

      @_remoteJson opts, (err, result) ->
        if err
          return cb null, status

        cb null, result

  createTemplate: (params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/templates"
      method  : "post"
      params  : params || {}

    @_remoteJson requestOpts, (err, result) ->
      if err
        return cb err

      if result && result.ok
        return cb null, result

      err = new Error(result.error || "NOT OK")
      cb err

  editTemplate: (templateId, params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/templates/" + templateId
      method  : "put"
      params  : params || {}

    @_remoteJson requestOpts, (err, result) ->
      if err
        return cb err

      if result && result.ok
        return cb null, result

      err = new Error(result.error || "NOT OK")
      cb err

  deleteTemplate: (templateId, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/templates/" + templateId
      method  : "del"
      params  : {}

    @_remoteJson requestOpts, cb

  getTemplate: (templateId, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/templates/" + templateId
      method  : "get"
      params  : {}

    @_remoteJson requestOpts, cb

  listTemplates: (params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/templates"
      method  : "get"
      params  : params || {}

    @_remoteJson requestOpts, cb

  calcSignature: (params) ->
    jsonParams = @_prepareParams params
    signature  = @_calcSignature jsonParams

    return {signature: signature, params: jsonParams}

  _calcSignature: (toSign) ->
    return crypto
      .createHmac("sha1", @_authSecret)
      .update(new Buffer(toSign, "utf-8"))
      .digest "hex"

  _appendForm: (req, params, fields) ->
    sigData    = @calcSignature params
    jsonParams = sigData.params
    signature  = sigData.signature
    form       = req.form()

    form.append "params", jsonParams

    fields ?= []

    for key of fields
      val = fields[key]
      if _.isObject(fields[key]) || _.isArray(fields[key])
        val = JSON.stringify(fields[key])

      form.append key, val

    form.append "signature", signature

    _.each @_streams, (value, key) ->
      form.append key, value

  _appendParamsToUrl: (url, params) ->
    sigData    = @calcSignature params
    signature  = sigData.signature
    jsonParams = sigData.params

    if url.indexOf("?") == -1
      url += "?signature=#{signature}"
    else
      url += "&signature=#{signature}"

    jsonParams = encodeURIComponent jsonParams
    url += "&params=#{jsonParams}"

    return url

  _getBoredInstance: (url, customBoredLogic, cb) ->
    url ?= @_serviceUrl() + "/instances/bored"
    opts =
      url: url

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

          url = "#{@_protocol}api2-#{theUrl}/instances/bored"
          @_getBoredInstance url, false, cb

        return

      err =
        error   : "CONNECTION_ERROR"
        message : "There was a problem connecting to the upload server"
        reason  : err.message
        url     : url

      cb err

  _findBoredInstanceUrl: (cb) ->
    url  = "http://infra-#{@_region}.transloadit.com.s3.amazonaws.com/"
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

    url  = instances[index]
    opts =
      url     : @_protocol + url
      timeout : 3000

    @_remoteJson opts, (err, result) =>
      if err
        return @_findResponsiveInstance instances, index + 1, cb

      cb null, url

  _prepareParams: (params) ->
    params              ?= {}
    params.auth         ?= {}
    params.auth.key     ?= @_authKey
    params.auth.expires ?= @_getExpiresDate()

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

    if method == "get" && opts.params?
      url = @_appendParamsToUrl url, opts.params

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
        abbr  = "#{res.body}".substr(0, 255)
        msg   = "Unable to parse JSON from '#{requestOpts.uri}'. "
        msg  += "Code: #{res.statusCode}. Body: #{abbr}. "
        return cb new Error msg
      cb null, result

    if method == "post" || method == "put" || method == "del"
      @_appendForm req, opts.params, opts.fields


module.exports = TransloaditClient
