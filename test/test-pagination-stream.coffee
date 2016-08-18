gently           = require "./gently-preamble"
expect           = require("chai").expect
PaginationStream = require "../src/PaginationStream"
Writable = require("stream").Writable
_ = require "underscore"

toArray = (callback) ->
  stream = new Writable objectMode: true
  list = []
  stream.write = (chunk) ->
    list.push chunk

  stream.end = ->
    callback list

  return stream

describe "PaginationStream", ->
  it "should", (done) ->
    count = 9
    pages = [
      { count, items: [1, 2, 3] }
      { count, items: [4, 5, 6] }
      { count, items: [7, 8, 9] }
    ]

    stream = new PaginationStream (pageno, cb) ->
      process.nextTick ->
        cb null, pages[pageno - 1]

    stream.pipe toArray (array) ->
      expected = _.flatten (page.items for page in pages), true

      expect(array).to.deep.equal expected
      done()

    stream.resume()
