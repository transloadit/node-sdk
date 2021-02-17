const stream = require('stream')

class PaginationStream extends stream.Readable {
  constructor (_fetchPage) {
    super({ objectMode: true })
    this._fetchPage = _fetchPage
    this._pageno = 0
    this._items = []
    this._itemsRead = 0
  }

  async _read () {
    if (this._items.length > 0) {
      this._itemsRead++
      process.nextTick(() => this.push(this._items.pop()))
      return
    }

    if (this._nitems != null && this._itemsRead >= this._nitems) {
      process.nextTick(() => this.push(null))
      return
    }

    try {
      const { count, items } = await this._fetchPage(++this._pageno)
      this._nitems = count

      this._items = Array.from(items)
      this._items.reverse()

      this._read()
      return
    } catch (err) {
      this.emit('error', err)
    }
  }
}

module.exports = PaginationStream
