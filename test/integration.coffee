expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"

authKey    = process.env.TRANSLOADIT_KEY
authSecret = process.env.TRANSLOADIT_SECRET
unless authKey? && authSecret?
  msg  = "specify envrionment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET"
  msg += " to enable integration tests."
  console.warn msg
  return # Terminates module execution without existing the test process

# https://transloadit.com/demos/importing-files/import-a-file-over-http
genericParams =
  params:
    steps:
      import:
        robot: "/http/import"
        url:   "https://transloadit.com/img/robots/170x170/audio-encode.jpg"
      resize:
        robot:  "/image/resize"
        use:    "import"
        result: true
        width:  130
        height: 130

describe "API integration", ->
  describe "assembly creation", ->
    it "should create a retrievable assembly on the server", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      client.createAssembly genericParams, (err, result) =>
        expect(err).to.not.exist
        expect(result).to.not.have.property "error"
        expect(result).to.have.property "ok"
        expect(result).to.have.property "assembly_id" # Since we're using it
        
        id = result.assembly_id

        client.getAssembly result.assembly_id, (err, result) =>
          expect(err).to.not.exist
          expect(result).to.not.have.property "error"
          expect(result).to.have.property "ok"
          expect(result.assembly_id).to.equal id
          done()
