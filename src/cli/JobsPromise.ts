import { EventEmitter } from 'node:events'

export default class JobsPromise extends EventEmitter {
  private promises: Set<Promise<unknown>>

  constructor() {
    super()
    this.promises = new Set()
  }

  add(promise: Promise<unknown>): void {
    this.promises.add(promise)
    promise
      .finally(() => this.promises.delete(promise))
      .catch((err: unknown) => {
        this.emit('error', err)
      })
  }

  promise(): Promise<unknown[]> {
    const promises: Promise<unknown>[] = []
    for (const promise of this.promises) {
      promises.push(promise)
    }
    return Promise.all(promises)
  }
}
