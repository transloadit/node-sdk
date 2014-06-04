global.Gently = require "gently"
gently = global.GENTLY = new Gently()

should            = require("chai").should()
expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"

describe "TransloaditClient", ->
  describe "constructor", ->
    it "should set some default properties", ->
      client = new TransloaditClient
      expect(client._authKey).to.equal null
      expect(client._authSecret).to.equal null
      expect(client._service).to.equal "api2.transloadit.com"
      expect(client._region).to.equal "us-east-1"
      expect(client._protocol).to.equal "http://"

    it "should allow overwriting some properties", ->
      opts =
        authKey    : "foo_key"
        authSecret : "foo_secret"
        service    : "foo_service"
        region     : "foo_region"

      client = new TransloaditClient opts
      expect(client._authKey).to.equal "foo_key"
      expect(client._authSecret).to.equal "foo_secret"
      expect(client._service).to.equal "foo_service"
      expect(client._region).to.equal "foo_region"

  describe "addStream", ->
    it "should properly add a stream", ->
      client = new TransloaditClient

      NAME   = "foo_name"
      STREAM = {}

      expect(client._streams[NAME]).to.equal undefined
      gently.expect STREAM, "pause"
      client.addStream NAME, STREAM
      expect(client._streams[NAME]).to.equal STREAM

  describe "addFile", ->
    it "should properly add a stream", ->
      client = new TransloaditClient

      NAME   = "foo_name"
      PATH   = "foo_path"
      STREAM = {}

      gently.expect GENTLY.hijacked.fs, "createReadStream", (thePath) ->
        expect(thePath).to.equal PATH
        return STREAM

      gently.expect client, "addStream", (name, stream) ->
        expect(name).to.equal NAME
        expect(stream).to.equal STREAM

      client.addFile NAME, PATH

  describe "createAssembly", ->
    it "should request a bored instance and then send the request", ->
      client = new TransloaditClient
      client._streams = "foo"

      OPTS =
        params  : "foo_params"
        fields  : "foo_fields"

      REQUEST_OPTS =
        url     : "http://api2.tim.transloadit.com/assemblies"
        method  : "post"
        timeout : 24 * 60 * 60 * 1000
        params  : "foo_params"
        fields  : "foo_fields"

      ERR    = {}
      RESULT =
        ok: "foo_ok"
      URL    = "tim.transloadit.com"

      errCalls = 0
      calls    = 0
      CB = (err, result) ->
        if err
          errCalls++
          expect(err).to.equal ERR
        else
          expect(result).to.equal RESULT

        calls++

      gently.expect client, "_getBoredInstance", (url, customBoredLogic, cb) ->
        expect(url).to.equal null
        expect(customBoredLogic).to.equal true

        cb ERR

        gently.expect client, "_remoteJson", (opts, cb2) ->
          expect(opts).to.eql REQUEST_OPTS

          cb2 ERR
          expect(client._streams).to.eql {}

          cb2 null, RESULT


        cb null, URL


      client.createAssembly OPTS, CB
      expect(errCalls).to.equal 2
      expect(calls).to.equal 3

  describe "deleteAssembly", ->
    it "should find the assembly url, and then call DELETE on it", ->
      client = new TransloaditClient

      OPTS =
        url     : "http://api2.transloadit.com/assemblies/foo_assembly_id"
        timeout : 16000

      ASSEMBLY_ID = "foo_assembly_id"
      ERR    = {}
      RESULT =
        assembly_url: "foo_assembly_url"

      errCalls = 0
      calls    = 0
      CB = (err, result) ->
        if err
          errCalls++
          expect(err).to.equal ERR
        else
          expect(result).to.equal RESULT

        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts).to.eql OPTS

        cb ERR

      client.deleteAssembly ASSEMBLY_ID, CB
      expect(errCalls).to.equal 1
      expect(calls).to.equal 1

  describe "replayAssembly", ->
    it "should send the proper request", ->
      client = new TransloaditClient
      ASSEMBLY_ID = "foo_assembly_id"
      OPTS =
        assembly_id: ASSEMBLY_ID
        notify_url: "foo_notify_url"

      REQUEST_OPTS =
        url        : "http://api2.transloadit.com/assemblies/foo_assembly_id/replay"
        timeout    : 5000
        method     : "post"
        params     :
          notify_url: "foo_notify_url"

      CB = {}
      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts).to.eql REQUEST_OPTS
        expect(cb).to.eql CB

      client.replayAssembly OPTS, CB

  describe "replayAssemblyNotification", ->
    it "should send the proper request", ->
      client = new TransloaditClient

      ASSEMBLY_ID = "foo_assembly_id"
      url = "http://api2.transloadit.com/assembly_notifications/"
      url += ASSEMBLY_ID + "/replay"

      OPTS =
        assembly_id: ASSEMBLY_ID
        notify_url: "foo_notify_url"

      REQUEST_OPTS =
        url     : url
        timeout : 5000
        method  : "post"
        params:
          notify_url: "foo_notify_url"

      CB = {}
      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts).to.eql REQUEST_OPTS
        expect(cb).to.eql CB

      client.replayAssemblyNotification OPTS, CB

  describe "assemblyStatus", ->
    it "should find the assembly's URL and then send the request", ->
      client = new TransloaditClient
      OPTS =
        url     : "http://api2.transloadit.com/assemblies/foo_assembly_id"
        timeout : 5000

      ASSEMBLY_ID = "foo_assembly_id"
      ERR    = {}
      RESULT =
        assembly_url: "foo_assembly_url"

      errCalls = 0
      calls    = 0
      CB = (err, result) ->
        if err
          errCalls++
          expect(err).to.equal ERR
        else
          expect(result).to.equal RESULT

        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts).to.eql OPTS

        cb ERR

        gently.expect client, "_remoteJson", (opts2, cb2) ->
          expect(opts2.url).to.eql RESULT.assembly_url
          expect(opts2.timeout).to.eql 5000

        cb null, RESULT

      client.assemblyStatus ASSEMBLY_ID, CB
      expect(errCalls).to.equal 1
      expect(calls).to.equal 1

  describe "_appendForm", ->
    it "should append all required fields to the request form", ->
      client = new TransloaditClient

      client._streams =
        stream1: "foo_stream"
        stream2: "foo_stream2"

      FORM        = {}
      REQ         = {}
      PARAMS      = {}
      JSON_PARAMS = {}
      FIELDS      = {
        foo: "shizzle"
        foo2:
          bar: "baz"

      }
      SIGNATURE   = {}

      gently.expect client, "_prepareParams", (params) ->
        expect(params).to.equal PARAMS
        return JSON_PARAMS

      gently.expect client, "_calcSignature", (params) ->
        expect(params).to.equal JSON_PARAMS
        return SIGNATURE

      gently.expect REQ, "form", ->
        return FORM

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "params"
        expect(val).to.equal JSON_PARAMS

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "foo"
        expect(val).to.equal "shizzle"

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "foo2"
        expect(val).to.equal JSON.stringify({bar: "baz"})

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "signature"
        expect(val).to.equal SIGNATURE

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "stream1"
        expect(val).to.equal "foo_stream"

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "stream2"
        expect(val).to.equal "foo_stream2"

      client._appendForm REQ, PARAMS, FIELDS

  describe "_getBoredInstance", ->
    it "should figure out a bored instance", ->
      client = new TransloaditClient

      URL          = "foo_url"
      CUSTOM_LOGIC = true
      INSTANCE     =
        api2_host: "some_host"

      calls = 0
      CB = (err, host) ->
        expect(host).to.equal INSTANCE.api2_host
        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts.url).to.equal URL
        expect(opts.timeout).to.equal 5000

        cb null, INSTANCE

      client._getBoredInstance URL, CUSTOM_LOGIC, CB
      expect(calls).to.equal 1

    it "should resolve to the custom bored logic if that fails", ->
      client = new TransloaditClient
      URL          = "foo_url"
      CUSTOM_LOGIC = true
      INSTANCE     =
        api2_host: "some_host"

      ERR = {}
      ERR2 = {}
      NEW_URL = "foo2_url"

      calls    = 0
      errCalls = 0
      CB = (err, host) ->
        if err
          expect(err.error).to.equal "BORED_INSTANCE_ERROR"
          errCalls++

        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts.url).to.equal URL
        expect(opts.timeout).to.equal 5000

        gently.expect client, "_findBoredInstanceUrl", (cb2) ->
          cb2 ERR2

          gently.expect client, "_getBoredInstance", (url, customLogic, cb3) ->
            expect(url).to.equal "http://api2.foo2_url/instances/bored"
            expect(customLogic).to.equal false
            expect(cb3).to.equal CB

          cb2 null, NEW_URL

        cb ERR

      client._getBoredInstance URL, CUSTOM_LOGIC, CB
      expect(calls).to.equal 1
      expect(errCalls).to.equal 1

  describe "_findBoredInstanceUrl", ->
    it "should find all uploaders from the cached S3 instances", ->
      client = new TransloaditClient

      errCalls  = 0
      calls     = 0
      ERR       = new Error "foo"
      INSTANCES = [
        "foo0.transloadit.com"
        "foo1.transloadit.com"
      ]
      RESULT =
        uploaders: ["foo", "foo2"]

      INSTANCES = []

      CB = (err) ->
        if err
          errCalls++
          msg = "Could not query S3 for cached uploaders: foo"
          expect(err.message).to.equal msg

        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts.url).to.equal "http://infra-us-east-1.transloadit.com.s3.amazonaws.com/cached_instances.json"
        expect(opts.timeout).to.equal 3000

        cb ERR

        gently.expect GENTLY.hijacked.underscore, "shuffle", (instances) ->
          expect(instances).to.eql RESULT.uploaders
          return INSTANCES

        gently.expect client, "_findResponsiveInstance", (instances, index, cb) ->
          expect(instances).to.eql INSTANCES
          expect(index).to.equal 0
          expect(cb).to.equal CB

        cb null, RESULT

      client._findBoredInstanceUrl CB
      expect(errCalls).to.equal 1
      expect(calls).to.equal 1

  describe "_findResponsiveInstance", ->
    it "should error out if it cannot find any more instances", ->
      client = new TransloaditClient

      calls = 0
      CB = (err) ->
        expect(err.message).to.equal "No responsive uploaders"
        calls++

      client._findResponsiveInstance [], 1, CB
      expect(calls).to.equal 1

    it "should figure out a responsive instance from the ones given to it", ->
      client = new TransloaditClient

      calls     = 0
      ERR       = {}
      INDEX     = 1
      INSTANCES = [
        "foo0.transloadit.com"
        "foo1.transloadit.com"
      ]

      CB = (err, url) ->
        if !err
          expect(url).to.equal "http://foo1.transloadit.com"

        calls++

      gently.expect client, "_remoteJson", (opts, cb) ->
        expect(opts.url).to.equal "http://foo1.transloadit.com"
        expect(opts.timeout).to.equal 3000

        gently.expect client, "_findResponsiveInstance", (instances, index, cb) ->
          expect(instances).to.eql INSTANCES
          expect(index).to.equal INDEX + 1
          expect(cb).to.equal CB

        cb ERR

        cb()

      client._findResponsiveInstance INSTANCES, INDEX, CB
      expect(calls).to.equal 1

  describe "_prepareParams", ->
    it "should add the auth key, secret and expires parameters", ->
      client = new TransloaditClient

      r = JSON.parse client._prepareParams()
      expect(r.auth.key).to.equal null
      expect(r.auth.expires).not.to.equal null

      opts =
        authKey: "foo"
      client = new TransloaditClient opts

      r = JSON.parse client._prepareParams()
      expect(r.auth.key).to.equal "foo"
      expect(r.auth.expires).not.to.equal null


  describe "_calcSignature", ->
    it "should return an expires date one minute in the future", ->
      client = new TransloaditClient
      client._authSecret = "13123123123"

      expected = "57ddad5dbba538590e60f0938f364c7179316eba"
      expect(client._calcSignature("foo")).to.equal expected

      expected = "b8110452b4ba46a9ecf438271bbd79f25d2a5400"
      expect(client._calcSignature("akjdkadskjads")).to.equal expected


      client._authSecret = "90191902390123"

      expected = "d393c38de2cbc993bea52f8ecdf56c7ede8b920d"
      expect(client._calcSignature("foo")).to.equal expected

      expected = "8fd625190e1955eb47a9984d3e8308e3afc9049e"
      expect(client._calcSignature("akjdkadskjads")).to.equal expected

  describe "_serviceUrl", ->
    it "should return the service url", ->
      client = new TransloaditClient

      client._protocol = "foo_protocol"
      client._service = "foo_service"

      expect(client._serviceUrl()).to.equal client._protocol + client._service

  describe "_remoteJson", ->
    it "should make proper remote GET calls", ->
      client = new TransloaditClient
      #@todo figure out how to test direct calls to request

    it "should append params to the request form for POST requests", ->
      client = new TransloaditClient
      #@todo

