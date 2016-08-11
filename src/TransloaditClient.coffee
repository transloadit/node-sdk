reqr    = if global.GENTLY then GENTLY.hijack(require) else require
request = reqr "request"
crypto  = reqr "crypto"
_       = reqr "underscore"
fs      = reqr "fs"
retry   = reqr "retry"

class TransloaditClient
  constructor: (opts) ->
    opts = opts || {}

    opts.useSsl ?= true

    if !opts.authKey?
      throw new Error "Please provide an authKey"

    if !opts.authSecret?
      throw new Error "Please provide an authSecret"

    @_authKey    = opts.authKey
    @_authSecret = opts.authSecret
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

  # On success, calls cb with an Assembly Status Response
  createAssembly: (opts, cb) ->
    @_lastUsedAssemblyUrl = "#{@_serviceUrl()}/assemblies"

    requestOpts =
      url     : @_lastUsedAssemblyUrl
      method  : "post"
      timeout : 24 * 60 * 60 * 1000 # 1 day
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

  # Check if the specified assembly exists, canceling it if it does.
  # TODO this adds an unnecessary extra request, the endpoint should properly
  # handle when the specified assembly doesn't exist.
  deleteAssembly: (assemblyId, cb) ->
    opts =
      url     : @_serviceUrl() + "/assemblies/#{assemblyId}"
      timeout : 16000

    finallyDelete = (assemblyUrl) =>
      opts =
        url     : assemblyUrl
        timeout : 5000
        method  : "del"
        params  : {}

      # TODO this breaks compatability, the cb used to take the request
      # library's three parameters: error, response, body.
      @_remoteJson opts, cb

    operation = retry.operation()
    operation.attempt (attempt) =>
      @_remoteJson opts, (err, result) ->
        if err?
          return cb err
        
        if !result.assembly_url?
          if operation.retry new Error "failed to retrieve assembly_url"
            return
          
          return cb operation.mainError()

        finallyDelete result.assembly_url

  
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
  
  # This method is fairly low level, as it doesn't manage pagination. Maybe it
  # could be deprecated in favor of a generator method.
  listAssemblyNotifications: (params, cb) ->
    requestOpts =
      url     : @_serviceUrl() + "/assembly_notifications"
      method  : "get"
      params  : params || {}

    @_remoteJson requestOpts, cb
  
  # Doesn't handle pagination, see listAssemblyNotifications
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
        url : result.assembly_url

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
      url     : @_serviceUrl() + "/templates/#{templateId}"
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

  # Does this really need to be its own method? Looks like it doesn't need to be
  # anymore. See:
  # https://github.com/transloadit/node-sdk/commit/d23ecaff92a6bb33cb18810e433fcbcd7d31c562
  _calcSignature: (toSign) ->
    return crypto
      .createHmac("sha1", @_authSecret)
      .update(new Buffer(toSign, "utf-8"))
      .digest "hex"

  # Sets the multipart/form-data for POST, PUT and DELETE requests, including
  # the streams, the signed params, and any additional fields.
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

  # Implements HTTP GET query params, handling the case where the url already
  # has params.
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

  # Responsible for including auth parameters in all requests
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

  # Wrapper around __remoteJson which will retry in case of error
  _remoteJson: (opts, cb) ->
    operation = retry.operation(
      retries    : 5
      factor     : 3.28
      minTimeout : 1 * 1000
      maxTimeout : 8 * 1000
    )

    operation.attempt =>
      @__remoteJson opts, (err, result) ->
        if operation.retry(err)
          return

        mainError = null
        if err
          mainError = operation.mainError()

        cb mainError, result

  # Responsible for making API calls. Automatically sends streams with any POST,
  # PUT or DELETE requests. Automatically adds signature parameters to all
  # requests. Also automatically parses the JSON response.
  # opts fields:
  # timeout default 5000
  # url required
  # method default "get"
  # params optional
  # fields optional
  __remoteJson: (opts, cb) ->
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

    if opts.headers?
      requestOpts.headers = opts.headers

    req = request[method] requestOpts, (err, res) ->
      if err
        return cb err

      # parse body
      result = null
      try
        result = JSON.parse res.body
      catch e
        abbr  = "#{res.body}".substr(0, 255)
        msg   = "Unable to parse JSON from '#{requestOpts.uri}'. "
        msg  += "Code: #{res.statusCode}. Body: #{abbr}. "
        return cb new Error msg
      if result.error?
        return cb new Error "API returned error. Code: #{result.error}. Message: #{result.message}"
      cb null, result

    if method == "post" || method == "put" || method == "del"
      @_appendForm req, opts.params, opts.fields


module.exports = TransloaditClient
