const reqr = global.GENTLY ? GENTLY.hijack(require) : require
// const TransloaditClient = reqr('./TransloaditClient')
const stream = reqr('stream')

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
      return process.nextTick(() => this.push(this._items.pop()))
    }

    if (this._nitems != null && this._itemsRead >= this._nitems) {
      return process.nextTick(() => this.push(null))
    }

    try {
      const { count, items } = await this._fetchPage(++this._pageno)
      this._nitems = count

      this._items = Array.from(items)
      this._items.reverse()

      return this._read()
    } catch (err) {
      this.emit('error', err)
    }
  }
}

module.exports = PaginationStream
