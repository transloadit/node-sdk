// const gently           = require('./gently-preamble')
const { expect } = require('chai')
const PaginationStream = require('../src/PaginationStream')
const { Writable } = require('stream')
const _ = require('underscore')

const toArray = callback => {
  const stream = new Writable({ objectMode: true })
  const list = []
  stream.write = chunk => list.push(chunk)

  stream.end = () => callback(list)

  return stream
}

describe('PaginationStream', () => {
  it('should preserve order with synchronous data sources', done => {
    const count = 9
    const pages = [{ count, items: [1, 2, 3] }, { count, items: [4, 5, 6] }, { count, items: [7, 8, 9] }]

    const stream = new PaginationStream((pageno, cb) => cb(null, pages[pageno - 1]))

    stream.pipe(
      toArray(array => {
        const expected = _.flatten(Array.from(pages).map(({ items }) => items), true)

        expect(array).to.deep.equal(expected)
        done()
      })
    )

    stream.resume()
  })

  it('should preserve order with asynchronous data sources', done => {
    const count = 9
    const pages = [{ count, items: [1, 2, 3] }, { count, items: [4, 5, 6] }, { count, items: [7, 8, 9] }]

    const stream = new PaginationStream((pageno, cb) => process.nextTick(() => cb(null, pages[pageno - 1])))

    stream.pipe(
      toArray(array => {
        const expected = _.flatten(Array.from(pages).map(({ items }) => items), true)

        expect(array).to.deep.equal(expected)
        done()
      })
    )

    stream.resume()
  })
})
