const { join } = require('path')
const intoStream = require('into-stream')

const TransloaditClientLegacy = require('../../../src/TransloaditClientLegacy')

const mockRemoteJson = (client) => jest.spyOn(client, '_remoteJson').mockImplementation(() => ({ body: {} }))

describe('TransloaditClientLegacy', () => {
  describe('add stream', () => {
    it('should properly add a stream', () => {
      const client = new TransloaditClientLegacy({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const name = 'foo_name'
      const pause = jest.fn(() => {})
      const mockStream = { pause, pipe: () => {}, _read: () => {}, _readableState: {}, readable: true }

      expect(client._streams[name]).toBeUndefined()
      client.addStream(name, mockStream)
      expect(client._streams[name]).toBe(mockStream)
    })
  })

  describe('addFile', () => {
    it('should properly add a file', async () => {
      const client = new TransloaditClientLegacy({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const name = 'foo_name'
      const path = 'foo_path'

      expect(client._streams[name]).toBeUndefined()
      expect(client._files[name]).toBeUndefined()
      client.addFile(name, path)
      expect(client._streams[name]).toBeUndefined()
      expect(client._files[name]).toBe(path)
    })
  })

  const createAssemblyAsync = async (client, opts) => new Promise((resolve, reject) => client.createAssembly(opts, (err, ret) => {
    if (err) reject(err)
    else resolve(ret)
  }))

  it('should handle concurrent createAssembly correctly', async () => {
    const client = new TransloaditClientLegacy({ authKey: 'foo_key', authSecret: 'foo_secret' })
    mockRemoteJson(client._client)

    client.addStream('file1', intoStream('file1'))
    client.addFile('file2', join(__dirname, '../../integration/__tests__/fixtures/zerobytes.jpg'))

    const promise = createAssemblyAsync(client)
    // Needs to be ready for a new request (in the same tick!)
    // See https://github.com/transloadit/node-sdk/pull/87#issuecomment-762858386

    await Promise.all([
      (async () => {
        expect(client._streams).toStrictEqual({})
        expect(client._files).toStrictEqual({})
      })(),
      promise,
    ])
  })
})
