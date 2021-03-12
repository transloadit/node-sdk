const { Writable } = require('stream')
const _ = require('lodash')

const PaginationStream = require('../../../src/PaginationStream')

const toArray = (callback) => {
  const stream = new Writable({ objectMode: true })
  const list = []
  stream.write = (chunk) => list.push(chunk)

  stream.end = () => callback(list)

  return stream
}

describe('PaginationStream', () => {
  it('should preserve order with synchronous data sources', (done) => {
    const count = 9
    const pages = [{ count, items: [1, 2, 3] }, { count, items: [4, 5, 6] }, { count, items: [7, 8, 9] }]

    const stream = new PaginationStream(async (pageno) => pages[pageno - 1])

    stream.pipe(
      toArray((array) => {
        const expected = _.flatten(Array.from(pages).map(({ items }) => items), true)

        expect(array).toEqual(expected)
        done()
      })
    )

    stream.resume()
  })

  it('should preserve order with asynchronous data sources', (done) => {
    const count = 9
    const pages = [{ count, items: [1, 2, 3] }, { count, items: [4, 5, 6] }, { count, items: [7, 8, 9] }]

    const stream = new PaginationStream(async (pageno) => new Promise((resolve) => process.nextTick(() => resolve(pages[pageno - 1]))))

    stream.pipe(
      toArray((array) => {
        const expected = _.flatten(Array.from(pages).map(({ items }) => items), true)

        expect(array).toEqual(expected)
        done()
      })
    )

    stream.resume()
  })
})
