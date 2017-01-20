reqr              = if global.GENTLY then GENTLY.hijack(require) else require
TransloaditClient = reqr "./TransloaditClient"
stream            = reqr "stream"

class PaginationStream extends stream.Readable
  constructor: (@_fetchPage) ->
    super objectMode: true
    @_pageno = 0
    @_items = []
    @_itemsRead = 0

  _read: ->
    if @_items.length > 0
      @_itemsRead++
      return process.nextTick => @push @_items.pop()

    if @_nitems? && @_itemsRead >= @_nitems
      return process.nextTick => @push null

    @_fetchPage ++@_pageno, (err, result) =>
      if err?
        return @emit "error", err

      @_nitems = result.count

      @_items = (result.items[i] for i in [result.items.length-1 .. 0])

      return @_read()
    
module.exports = PaginationStream
