import { Readable } from 'node:stream'
import type { PaginationList, PaginationListWithCount } from './apiTypes.ts'

type FetchPage<T> = (
  pageno: number,
) =>
  | PaginationList<T>
  | PromiseLike<PaginationList<T>>
  | PaginationListWithCount<T>
  | PromiseLike<PaginationListWithCount<T>>

export default class PaginationStream<T> extends Readable {
  private _fetchPage: FetchPage<T>

  private _nitems?: number

  private _pageno = 0

  private _items: T[] = []

  private _itemsRead = 0

  constructor(fetchPage: FetchPage<T>) {
    super({ objectMode: true })
    this._fetchPage = fetchPage
  }

  override async _read() {
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
      const { items, ...rest } = await this._fetchPage(++this._pageno)
      if ('count' in rest) {
        this._nitems = rest.count
      }

      this._items = Array.from(items)
      this._items.reverse()

      this._read()
    } catch (err) {
      this.emit('error', err)
    }
  }
}
