const { Readable: ReadableStream } = require('stream')
const FormData = require('form-data')
const got = require('got')

const TransloaditClient = require('../../../src/TransloaditClient')
const packageVersion = require('../../../package.json').version

jest.mock('got')

const mockedExpiresDate = '2021-01-06T21:11:07.883Z'
const mockGetExpiresDate = (client) => jest.spyOn(client, '_getExpiresDate').mockReturnValue(mockedExpiresDate)
const mockGot = (method) => got[method].mockImplementation(() => {
  const mockPromise = Promise.resolve({ body: '' })
  mockPromise.on = jest.fn(() => {})
  return mockPromise
})

describe('TransloaditClient', () => {
  describe('constructor', () => {
    it('should set some default properties', () => {
      const opts = {
        authKey   : 'foo_key',
        authSecret: 'foo_secret',
        maxRetries: 0,
      }
      const client = new TransloaditClient(opts)
      expect(client._authKey).toBe('foo_key')
      expect(client._authSecret).toBe('foo_secret')
      expect(client._service).toBe('api2.transloadit.com')
      expect(client._protocol).toBe('https://')
      expect(client._maxRetries).toBe(0)
    })

    it('should give error when no authSecret', () => {
      expect(() => new TransloaditClient({ authSecret: '' })).toThrow()
    })

    it('should give error when no authKey', () => {
      expect(() => new TransloaditClient({ authKey: '' })).toThrow()
    })

    it('should allow overwriting some properties', () => {
      const opts = {
        authKey   : 'foo_key',
        authSecret: 'foo_secret',
        service   : 'foo_service',
      }

      const client = new TransloaditClient(opts)
      expect(client._authKey).toBe('foo_key')
      expect(client._authSecret).toBe('foo_secret')
      expect(client._service).toBe('foo_service')
    })
  })

  describe('addStream', () => {
    it('should properly add a stream', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const name = 'foo_name'
      const pause = jest.fn(() => {})
      const mockStream = { pause }

      expect(client._streams[name]).toBeUndefined()
      client.addStream(name, mockStream)

      expect(pause).toHaveBeenCalled()

      expect(client._streams[name]).toBe(mockStream)
    })
  })

  describe('addFile', () => {
    it('should properly add a file', async () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const name = 'foo_name'
      const path = 'foo_path'

      expect(client._streams[name]).toBeUndefined()
      expect(client._files[name]).toBeUndefined()
      client.addFile(name, path)
      expect(client._streams[name]).toBeUndefined()
      expect(client._files[name]).toBe(path)
    })
  })

  describe('_appendForm', () => {
    it('should append all required fields to the request form', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const stream1 = new ReadableStream()
      const stream2 = new ReadableStream()

      const streamsMap = {
        stream1: { stream: stream1 },
        stream2: { stream: stream2 },
      }

      const form = new FormData()
      const params = {}
      const fields = {
        foo : 'shizzle',
        foo2: {
          bar: 'baz',
        },
      }

      mockGetExpiresDate(client)
      const calcSignatureSpy = jest.spyOn(client, 'calcSignature')
      const formAppendSpy = jest.spyOn(form, 'append')

      client._appendForm(form, params, streamsMap, fields)

      expect(calcSignatureSpy).toHaveBeenCalledWith(params)

      expect(formAppendSpy.mock.calls).toEqual([
        ['params', '{"auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}'],
        ['foo', 'shizzle'],
        ['foo2', JSON.stringify({ bar: 'baz' })],
        ['signature', '8aa4444c9688bb5f03fcf77b24336b7a3a14f627'],
        ['stream1', stream1, { filename: 'stream1' }],
        ['stream2', stream2, { filename: 'stream2' }],
      ])
    })
  })

  describe('_appendParamsToUrl', () => {
    it('should append params and signature to the given url', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      // URL can have question mark also inside parameter
      const url = 'https://example.com/foo_url?param=12?3'
      const params = { foo: 'bar' }
      const jsonParams = '{"foo":"bar","auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}'
      const signature = 'c84113bd21fe7b5eb5683ac8513995993240662b'

      mockGetExpiresDate(client)

      const fullUrl = client._appendParamsToUrl(url, params)

      const expected = `${url}&signature=${signature}&params=${encodeURIComponent(jsonParams)}`
      return expect(fullUrl).toBe(expected)
    })
  })

  describe('_prepareParams', () => {
    it('should add the auth key, secret and expires parameters', () => {
      let client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      let r = JSON.parse(client._prepareParams())
      expect(r.auth.key).toBe('foo_key')
      expect(r.auth.expires).not.toBeNull()

      const opts = {
        authKey   : 'foo',
        authSecret: 'foo_secret',
      }
      client = new TransloaditClient(opts)

      r = JSON.parse(client._prepareParams())
      expect(r.auth.key).toBe('foo')
      return expect(r.auth.expires).not.toBeNull()
    })

    it('should not add anything if the params are already present', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const PARAMS = {
        auth: {
          key    : 'foo_key',
          expires: 'foo_expires',
        },
      }

      const r = JSON.parse(client._prepareParams(PARAMS))
      expect(r.auth.key).toBe('foo_key')
      return expect(r.auth.expires).toBe('foo_expires')
    })
  })

  describe('calcSignature', () => {
    it('should calc _prepareParams and _calcSignature', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._authSecret = '13123123123'

      const params = { foo: 'bar' }

      mockGetExpiresDate(client)

      const prepareParamsSpy = jest.spyOn(client, '_prepareParams')

      const r = client.calcSignature(params)

      expect(r.params).toBe('{"foo":"bar","auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}')
      expect(r.signature).toBe('be7aec095815931e6cd6dc322ed886ca9746e5bf')
      expect(prepareParamsSpy).toBeCalledWith(params)
    })
  })

  it('should set 1 day timeout by default for createAssembly', async () => {
    const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

    const spy = jest.spyOn(client, '_remoteJson').mockImplementation(() => ({ body: {} }))

    await client.createAssembly()

    expect(spy).toBeCalledWith(expect.objectContaining({ timeout: 24 * 60 * 60 * 1000 }), {}, expect.any(Function))
  })

  it('should crash if attempt to use callback', async () => {
    const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })
    const cb = () => {}
    await expect(client.createAssembly({}, cb)).rejects.toThrow(TypeError)
  })

  describe('_calcSignature', () => {
    it('should calculate the signature properly', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._authSecret = '13123123123'

      let expected = '57ddad5dbba538590e60f0938f364c7179316eba'
      expect(client._calcSignature('foo')).toBe(expected)

      expected = 'b8110452b4ba46a9ecf438271bbd79f25d2a5400'
      expect(client._calcSignature('akjdkadskjads')).toBe(expected)

      client._authSecret = '90191902390123'

      expected = 'd393c38de2cbc993bea52f8ecdf56c7ede8b920d'
      expect(client._calcSignature('foo')).toBe(expected)

      expected = '8fd625190e1955eb47a9984d3e8308e3afc9049e'
      return expect(client._calcSignature('akjdkadskjads')).toBe(expected)
    })
  })

  describe('_serviceUrl', () => {
    it('should return the service url', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._protocol = 'foo_protocol'
      client._service = 'foo_service'

      return expect(client._serviceUrl()).toBe(client._protocol + client._service)
    })
  })

  describe('_remoteJson', () => {
    it('should add "Transloadit-Client" header to requests', async () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const get = mockGot('get')

      const url = '/some-url'
      await client._remoteJson({ url, method: 'get' })

      expect(get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: { 'Transloadit-Client': 'node-sdk:' + packageVersion } }))
    })
  })
})
