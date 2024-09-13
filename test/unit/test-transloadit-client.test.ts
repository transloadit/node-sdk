import { Readable } from 'stream'
import FormData from 'form-data'
import got, { CancelableRequest } from 'got'

import * as tus from '../../src/tus'
import { TransloaditClient } from '../../src/Transloadit'
import { version } from 'transloadit/package.json'

const mockedExpiresDate = '2021-01-06T21:11:07.883Z'
const mockGetExpiresDate = (client: TransloaditClient) =>
  // @ts-expect-error This mocks private internals
  vi.spyOn(client, '_getExpiresDate').mockReturnValue(mockedExpiresDate)
const mockGot = (method: 'get') =>
  vi.spyOn(got, method).mockImplementation(() => {
    const mockPromise = Promise.resolve({
      body: '',
    }) as CancelableRequest
    ;(mockPromise as any).on = vi.fn(() => {})
    return mockPromise
  })
const mockRemoteJson = (client: TransloaditClient) =>
  // @ts-expect-error This mocks private internals
  vi.spyOn(client, '_remoteJson').mockImplementation(() => ({ body: {} }))

describe('Transloadit', () => {
  it('should throw a proper error for request stream', async () => {
    const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

    // mimic Stream object returned from `request` (which is not a stream v3)
    const req = { pipe: () => {} } as Partial<Readable> as Readable

    const promise = client.createAssembly({ uploads: { file: req } })
    await expect(promise).rejects.toThrow(
      expect.objectContaining({ message: 'Upload named "file" is not a Readable stream' })
    )
  })

  describe('constructor', () => {
    it('should set some default properties', () => {
      const opts = {
        authKey: 'foo_key',
        authSecret: 'foo_secret',
        maxRetries: 0,
      }
      const client = new TransloaditClient(opts)
      expect(
        // @ts-expect-error This tests private internals
        client._authKey
      ).toBe('foo_key')
      expect(
        // @ts-expect-error This tests private internals
        client._authSecret
      ).toBe('foo_secret')
      expect(
        // @ts-expect-error This tests private internals
        client._endpoint
      ).toBe('https://api2.transloadit.com')
      expect(
        // @ts-expect-error This tests private internals
        client._maxRetries
      ).toBe(0)
      expect(
        // @ts-expect-error This tests private internals
        client._defaultTimeout
      ).toBe(60000)

      client.setDefaultTimeout(10000)
      expect(
        // @ts-expect-error This tests private internals
        client._defaultTimeout
      ).toBe(10000)
    })

    it('should throw when sending a trailing slash in endpoint', () => {
      const opts = {
        authKey: 'foo_key',
        authSecret: 'foo_secret',
        endpoint: 'https://api2.transloadit.com/',
      }
      expect(() => new TransloaditClient(opts)).toThrow('Trailing slash in endpoint is not allowed')
    })

    it('should give error when no authSecret', () => {
      expect(
        () =>
          new TransloaditClient(
            // @ts-expect-error This tests invalid types
            { authSecret: '' }
          )
      ).toThrow()
    })

    it('should give error when no authKey', () => {
      expect(
        () =>
          new TransloaditClient(
            // @ts-expect-error This tests invalid types
            { authKey: '' }
          )
      ).toThrow()
    })

    it('should allow overwriting some properties', () => {
      const opts = {
        authKey: 'foo_key',
        authSecret: 'foo_secret',
        endpoint: 'http://foo',
      }

      const client = new TransloaditClient(opts)
      expect(
        // @ts-expect-error This tests private internals
        client._authKey
      ).toBe('foo_key')
      expect(
        // @ts-expect-error This tests private internals
        client._authSecret
      ).toBe('foo_secret')
      expect(
        // @ts-expect-error This tests private internals
        client._endpoint
      ).toBe('http://foo')
    })
  })

  describe('add stream', () => {
    it('should pause streams', async () => {
      vi.spyOn(tus, 'sendTusRequest').mockImplementation(() => Promise.resolve())
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const name = 'foo_name'
      const pause = vi.fn(() => mockStream)
      const mockStream = {
        pause,
        pipe: () => undefined,
        _read: () => undefined,
        _readableState: {},
        on: () => mockStream,
        readable: true,
      } as Partial<Readable> as Readable

      mockRemoteJson(client)

      await client.createAssembly({ uploads: { [name]: mockStream } })

      expect(pause).toHaveBeenCalled()
    })
  })

  describe('_appendForm', () => {
    it('should append all required fields to the request form', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const stream1 = new Readable()
      const stream2 = new Readable()

      const streamsMap = {
        stream1: { stream: stream1 },
        stream2: { stream: stream2 },
      }

      const form = new FormData()
      const params = {}
      const fields = {
        tus_num_expected_upload_files: 1,
      }

      mockGetExpiresDate(client)
      const calcSignatureSpy = vi.spyOn(client, 'calcSignature')
      const formAppendSpy = vi.spyOn(form, 'append')

      // @ts-expect-error This tests private internals
      client._appendForm(form, params, streamsMap, fields)

      expect(calcSignatureSpy).toHaveBeenCalledWith(params)

      expect(formAppendSpy.mock.calls).toEqual([
        ['params', '{"auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}'],
        ['tus_num_expected_upload_files', 1],
        [
          'signature',
          'sha384:f146533532844d4f4e34221288be08e14a2779eeb802a35afa6a193762f58da95d2423a825aa4cb4c7420e25f75a5c90',
        ],
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
      const jsonParams =
        '{"foo":"bar","auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}'
      const signature =
        'sha384:d3eed795abcac19191c9d06b4adf8a7cbd427846a842121e087e60059365bee5fc16f11ed580cb246cda694b3da10e88'

      mockGetExpiresDate(client)

      // @ts-expect-error This tests private internals
      const fullUrl = client._appendParamsToUrl(url, params)

      const expected = `${url}&signature=${signature}&params=${encodeURIComponent(jsonParams)}`
      return expect(fullUrl).toBe(expected)
    })
  })

  describe('_prepareParams', () => {
    it('should add the auth key, secret and expires parameters', () => {
      let client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      // @ts-expect-error This tests private internals
      let r = JSON.parse(client._prepareParams())
      expect(r.auth.key).toBe('foo_key')
      expect(r.auth.expires).not.toBeNull()

      const opts = {
        authKey: 'foo',
        authSecret: 'foo_secret',
      }
      client = new TransloaditClient(opts)

      // @ts-expect-error This tests private internals
      r = JSON.parse(client._prepareParams())
      expect(r.auth.key).toBe('foo')
      return expect(r.auth.expires).not.toBeNull()
    })

    it('should not add anything if the params are already present', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const PARAMS = {
        auth: {
          key: 'foo_key',
          expires: 'foo_expires',
        },
      }

      // @ts-expect-error This tests private internals
      const r = JSON.parse(client._prepareParams(PARAMS))
      expect(r.auth.key).toBe('foo_key')
      return expect(r.auth.expires).toBe('foo_expires')
    })
  })

  describe('calcSignature', () => {
    it('should calc _prepareParams and _calcSignature', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      // @ts-expect-error This tests private internals
      client._authSecret = '13123123123'

      const params = { foo: 'bar' }

      mockGetExpiresDate(client)

      // @ts-expect-error This tests private internals
      const prepareParamsSpy = vi.spyOn(client, '_prepareParams')

      const r = client.calcSignature(params)

      expect(r.params).toBe(
        '{"foo":"bar","auth":{"key":"foo_key","expires":"2021-01-06T21:11:07.883Z"}}'
      )
      expect(r.signature).toBe(
        'sha384:431542b924ecc9e7f062e37d1c83554f5bc19664ed7e6e1ef954c0b021b9be19c9412c2074f226784c5419b630e8b70a'
      )
      expect(prepareParamsSpy).toBeCalledWith(params)
    })
  })

  it('should set 1 day timeout by default for createAssembly', async () => {
    const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

    const spy = mockRemoteJson(client)

    await client.createAssembly()

    expect(spy).toBeCalledWith(
      expect.objectContaining({ timeout: 24 * 60 * 60 * 1000 }),
      {},
      expect.any(Function)
    )
  })

  it('should crash if attempt to use callback', async () => {
    const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })
    const cb = () => {}
    expect(() =>
      client.createAssembly(
        {},
        // @ts-expect-error This tests bad input
        cb
      )
    ).toThrow(TypeError)
  })

  describe('_calcSignature', () => {
    it('should calculate the signature properly', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      // @ts-expect-error This tests private internals
      client._authSecret = '13123123123'

      let expected =
        'sha384:8b90663d4b7d14ac7d647c74cb53c529198dee4689d0f8faae44f0df1c2a157acce5cb8c55a375218bc331897cf92e9d'
      expect(
        // @ts-expect-error This tests private internals
        client._calcSignature('foo')
      ).toBe(expected)

      expected =
        'sha384:3595c177fc09c9cc46672cef90685257838a0a4295056dcfd45b5d5c255e8f987e1c1ca8800b9c21ee03e4ada7485e9d'
      expect(
        // @ts-expect-error This tests private internals
        client._calcSignature('akjdkadskjads')
      ).toBe(expected)

      // @ts-expect-error This tests private internals
      client._authSecret = '90191902390123'

      expected =
        'sha384:b6f967f8bd659652c6c2093bc52045becbd6e8fbd96d8ef419e07bbc9fb411c56316e75f03dfc2a6613dbe896bbad20f'
      expect(
        // @ts-expect-error This tests private internals
        client._calcSignature('foo')
      ).toBe(expected)

      expected =
        'sha384:fc75f6a4bbb06340653c0f7efff013e94eb8e402e0e45cf40ad4bc95f45a3ae3263032000727359c595a433364a84f96'
      return expect(
        // @ts-expect-error This tests private internals
        client._calcSignature('akjdkadskjads')
      ).toBe(expected)
    })
  })

  describe('_remoteJson', () => {
    it('should add "Transloadit-Client" header to requests', async () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const get = mockGot('get')

      const url = '/some-url'
      // @ts-expect-error This tests private internals
      await client._remoteJson({ url, method: 'get' })

      expect(get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { 'Transloadit-Client': `node-sdk:${version}` } })
      )
    })
  })
})
