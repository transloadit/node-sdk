require "./gently-preamble"
expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"
request           = require "request"
stream            = require "stream"
localtunnel       = require "localtunnel"
http              = require "http"
url               = require "url"
querystring       = require "querystring"
_                 = require "underscore"

authKey    = process.env.TRANSLOADIT_KEY
authSecret = process.env.TRANSLOADIT_SECRET
unless authKey? && authSecret?
  msg  = "specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET"
  msg += " to enable integration tests."
  console.warn msg
  return # Terminates module execution without exiting the test process

startServer = (handler, cb) ->
  server = http.createServer handler

  # Find a port to use
  port = 8000
  server.on "error", (err) ->
    if err.code == "EADDRINUSE"
      if ++port >= 65535
        server.close()
        cb new Error "Failed to bind to port"
      server.listen port, "127.0.0.1"
    else
      cb err

  server.listen port, "127.0.0.1"

  # Once a port has been found and the server is ready, setup the
  # localtunnel
  server.on "listening", ->
    localtunnel port, (err, tunnel) ->
      if err?
        server.close()
        return cb err
      cb null,
        url: tunnel.url
        close: ->
          tunnel.close()
          server.close()

# https://transloadit.com/demos/importing-files/import-a-file-over-http
genericImg    = "https://transloadit.com/img/robots/170x170/audio-encode.jpg"
genericParams =
  params:
    steps:
      import:
        robot: "/http/import"
        url:   genericImg
      resize:
        robot:  "/image/resize"
        use:    "import"
        result: true
        width:  130
        height: 130

describe "API integration", ->
  @timeout 100000
  describe "assembly creation", ->
    it "should create a retrievable assembly on the server", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      client.createAssembly genericParams, (err, result) ->
        expect(err).to.not.exist
        expect(result).to.not.have.property "error"
        expect(result).to.have.property "ok"
        expect(result).to.have.property "assembly_id" # Since we're using it
        
        id = result.assembly_id

        client.getAssembly id, (err, result) ->
          expect(err).to.not.exist
          expect(result).to.not.have.property "error"
          expect(result).to.have.property "ok"
          expect(result.assembly_id).to.equal id
          done()

    it "should get a full assembly status reliably", (done) ->
      @timeout 0

      client = new TransloaditClient { authKey, authSecret }

      nbranches = 5
      ndone = 0
      branchDone = =>
        if ++ndone == nbranches
          done()

      reproduce = (nattempts) ->
        if nattempts == 0
          return branchDone()

        client.createAssembly genericParams, (err, result) ->
          if err? || result.error?
            return reproduce nattempts - 1

          client.getAssembly result.assembly_id, (err, result) ->
            if err? || result.error?
              return reproduce nattempts - 1

            expect(result).to.have.property("assembly_url").that.exist
            reproduce nattempts - 1

      # attempt to reproduce the incomplete status response 100 times
      for _ in [1..nbranches]
        reproduce 100 / nbranches

  describe "assembly cancelation", ->
    it "should stop the assembly from reaching completion", (done) ->
      client = new TransloaditClient { authKey, authSecret }
      opts =
        params:
          steps:
            resize:
              robot:  "/image/resize"
              use:    ":original"
              result: true
              width:  130
              height: 130

      # We need to ensure that the assembly doesn't complete before it can be
      # canceled, so we start an http server for the assembly to import from,
      # and delay transmission of data until we've already sent the cancel
      # request

      # Async book-keeping for delaying the response
      # This would be much nicer with promises.
      readyToServe = false
      callback = -> undefined # No-op function

      handler = (req, res) ->
        handleRequest = ->
          expect(url.parse(req.url).pathname).to.equal "/"

          res.setHeader "Content-type", "image/jpeg"
          res.writeHead 200
          request.get(genericImg).pipe(res)

        # delay serving the response until triggered
        if readyToServe
          handleRequest()
        else
          callback = handleRequest

      startServer handler, (err, server) ->
        expect(err).to.not.exist
        # TODO the server won't close if the test fails

        params =
          params:
            steps:
              import:
                robot: "/http/import"
                url:   server.url
              resize:
                robot:  "/image/resize"
                use:    "import"
                result: true
                width:  130
                height: 130

        # Finally send the createAssembly request
        client.createAssembly params, (err, result) ->
          expect(err).to.not.exist

          id = result.assembly_id
          
          # Now delete it
          client.deleteAssembly id, (err, result) ->
            # Allow the upload to finish
            readyToServe = true
            callback()

            expect(err).to.not.exist
            expect(result.ok).to.equal "ASSEMBLY_CANCELED"

            # Successful cancel requests get ASSEMBLY_CANCELED even when it
            # completed, so we now request the assembly status to check the
            # *actual* status.
            client.getAssembly id, (err, result) ->
              expect(err).to.not.exist
              expect(result.ok).to.equal "ASSEMBLY_CANCELED"
              server.close()
              done()

  describe "replaying assemblies", ->
    it "should replay an assembly after it has completed", (done) ->
      client = new TransloaditClient { authKey, authSecret }
      
      client.createAssembly genericParams, (err, result) ->
        expect(err).to.not.exist

        originalId = result.assembly_id
        
        # ensure that the assembly has completed
        ensureCompletion = (cb) ->
          client.getAssembly originalId, (err, result) ->
            expect(err).to.not.exist

            if result.ok == "ASSEMBLY_UPLOADING" || result.ok == "ASSEMBLY_EXECUTING"
              setTimeout (-> ensureCompletion cb), 1000
            else
              cb()
        
        # Start an asynchonous loop
        ensureCompletion ->
          client.replayAssembly { assembly_id: originalId }, (err, result) ->
            expect(err).to.not.exist
            expect(result.ok).to.equal "ASSEMBLY_REPLAYING"
            done()

  describe "assembly list retrieval", ->
    it "should retrieve a list of assemblies", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      client.listAssemblies {}, (err, result) ->
        expect(err).to.not.exist
        expect(result).to.have.property "count"
        expect(result).to.have.property("items").that.is.instanceof Array
        done()

  describe "assembly notification", ->
    # helper function
    streamToString = (stream, cb) ->
      chunks = []
      stream.on "data", (chunk) -> chunks.push chunk
      stream.on "error", (err) -> cb err
      stream.on "end", -> cb null, chunks.join ""

    testCase = (desc, endBehavior) ->
      it desc, (done) ->
        client = new TransloaditClient { authKey, authSecret }

        # listens for notifications
        handler = (req, res) ->
          expect(url.parse(req.url).pathname).to.equal "/"

          expect(req.method).to.equal "POST"
          streamToString req, (err, body) ->
            result = JSON.parse querystring.parse(body).transloadit
            expect(result).to.have.property("ok").that.equals "ASSEMBLY_COMPLETED"
            res.writeHead 200
            res.end()
            endBehavior client, result.assembly_id, done

        startServer handler, (err, server) ->
          expect(err).to.not.exist
          
          params =
            params: _.extend genericParams.params,
              notify_url: server.url

          client.createAssembly params, (err, result) ->
            expect(err).to.not.exist
            
    testCase "should send a notification upon assembly completion", (client, id, done) ->
      done()

    notificationsRecvd = 0
    testCase "should replay the notification when requested", (client, id, done) ->
      if notificationsRecvd++ == 0
        client.replayAssemblyNotification { assembly_id: id }, (err) ->
          expect(err).to.not.exist
      else
        done()

  describe "template methods", ->
    templName = "node-sdk-test-#{(new Date()).toISOString()}"
    templId = null
    client = new TransloaditClient { authKey, authSecret }

    it "should allow creating a template", (done) ->
      client.createTemplate { name: templName, template: genericParams.params }, (err, result) ->
        expect(err).to.not.exist
        templId = result.template_id
        done()


    it "should be able to fetch a template's definition", (done) ->
      expect(templId).to.exist

      client.getTemplate templId, (err, result) ->
        expect(err).to.not.exist
        expect(result.template_name).to.equal templName
        expect(result.template_content).to.deep.equal genericParams.params
        done()

    it "should delete the template successfully", (done) ->
      expect(templId).to.exist

      client.deleteTemplate templId, (err, result) ->
        expect(err).to.not.exist
        expect(result.ok).to.equal "TEMPLATE_DELETED"
        client.getTemplate templId, (err, result) ->
          expect(result).to.not.exist
          expect(err).to.exist
          expect(err.message).to.match /TEMPLATE_NOT_FOUND/
          done()
