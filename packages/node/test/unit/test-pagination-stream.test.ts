import { Writable } from 'node:stream'

import PaginationStream from '../../src/PaginationStream.ts'

const toArray = (callback: (list: number[]) => void) => {
  const writable = new Writable({ objectMode: true })
  const list: number[] = []
  writable.write = (chunk) => {
    list.push(chunk)
    return true
  }

  writable.end = () => {
    callback(list)
    return writable
  }

  return writable
}

describe('PaginationStream', () => {
  it('should preserve order with synchronous data sources', async () => {
    const count = 9
    const pages = [
      { count, items: [1, 2, 3] },
      { count, items: [4, 5, 6] },
      { count, items: [7, 8, 9] },
    ]

    const stream = new PaginationStream<number>(async (pageno) => pages[pageno - 1])

    await new Promise<void>((resolve) => {
      stream.pipe(
        toArray((array) => {
          const expected = pages.flatMap(({ items }) => items)

          expect(array).toEqual(expected)
          resolve()
        }),
      )

      stream.resume()
    })
  })

  it('should preserve order with asynchronous data sources', async () => {
    const count = 9
    const pages = [
      { count, items: [1, 2, 3] },
      { count, items: [4, 5, 6] },
      { count, items: [7, 8, 9] },
    ]

    const stream = new PaginationStream<number>(
      async (pageno) =>
        new Promise((resolve) => {
          process.nextTick(() => resolve(pages[pageno - 1]))
        }),
    )

    await new Promise<void>((resolve) => {
      stream.pipe(
        toArray((array) => {
          const expected = pages.flatMap(({ items }) => items)

          expect(array).toEqual(expected)
          resolve()
        }),
      )

      stream.resume()
    })
  })

  it('supports responses without count before count becomes available', async () => {
    const pages = [{ items: [1, 2] }, { count: 3, items: [3] }]

    const stream = new PaginationStream<number>(async (pageno) => pages[pageno - 1])

    await new Promise<void>((resolve) => {
      stream.pipe(
        toArray((array) => {
          expect(array).toEqual([1, 2, 3])
          resolve()
        }),
      )

      stream.resume()
    })
  })
})
