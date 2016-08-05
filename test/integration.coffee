expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"
request           = require "request"
stream            = require "stream"
localtunnel       = require "localtunnel"
http              = require "http"
url               = require "url"

authKey    = process.env.TRANSLOADIT_KEY
authSecret = process.env.TRANSLOADIT_SECRET
unless authKey? && authSecret?
  msg  = "specify envrionment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET"
  msg += " to enable integration tests."
  console.warn msg
  return # Terminates module execution without existing the test process

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
  @timeout 10000
  describe "assembly creation", ->
    it "should create a retrievable assembly on the server", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      client.createAssembly genericParams, (err, result) =>
        expect(err).to.not.exist
        expect(result).to.not.have.property "error"
        expect(result).to.have.property "ok"
        expect(result).to.have.property "assembly_id" # Since we're using it
        
        id = result.assembly_id

        client.getAssembly id, (err, result) =>
          expect(err).to.not.exist
          expect(result).to.not.have.property "error"
          expect(result).to.have.property "ok"
          expect(result.assembly_id).to.equal id
          done()

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

      # Serve genericImg on GET /
      server = http.createServer (req, res) =>
        handleRequest = =>
          if url.parse(req.url).pathname != "/"
            res.writeHead 404
            res.end()
            return
          
          res.setHeader "Content-type", "image/jpeg"
          res.writeHead 200
          request.get(genericImg).pipe(res)

        # delay serving the response until triggered
        if readyToServe
          handleRequest()
        else
          callback = handleRequest

      # Find a port to use
      port = 8000
      server.on "error", (err) =>
        if err.code == "EADDRINUSE"
          port++
          server.listen port, "127.0.0.1"
        else
          console.log "WARN failed to start local HTTP server"
          console.log err
          done()

      server.listen port, "127.0.0.1"

      # Once a port has been found and the server is ready, setup the
      # localtunnel
      server.on "listening", =>
        localtunnel port, (err, tunnel) =>
          if err?
            console.log "WARN failed to start localtunnel"
            console.log err
            done()
            return

          params =
            params:
              steps:
                import:
                  robot: "/http/import"
                  url:   tunnel.url
                resize:
                  robot:  "/image/resize"
                  use:    "import"
                  result: true
                  width:  130
                  height: 130

          # Finally send the createAssembly request
          client.createAssembly params, (err, result) =>
            expect(err).to.not.exist

            id = result.assembly_id
            
            # Now delete it
            client.deleteAssembly id, (err, result) =>
              # Allow the upload to finish
              readyToServe = true
              callback()

              expect(err).to.not.exist
              expect(result.ok).to.equal "ASSEMBLY_CANCELED"

              # Successful cancel requests get ASSEMBLY_CANCELED even when it
              # completed, so we now request the assembly status to check the
              # *actual* status.
              client.getAssembly id, (err, result) =>
                expect(err).to.not.exist
                expect(result.ok).to.equal "ASSEMBLY_CANCELED"
                done()
