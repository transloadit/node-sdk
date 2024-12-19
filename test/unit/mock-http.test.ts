import nock from 'nock'
import { inspect } from 'node:util'

import {
  ApiError,
  HTTPError,
  InconsistentResponseError,
  TimeoutError,
  Transloadit,
} from '../../src/Transloadit'

const getLocalClient = (opts?: Omit<Transloadit.Options, 'authKey' | 'authSecret' | 'endpoint'>) =>
  new Transloadit({ authKey: '', authSecret: '', endpoint: 'http://localhost', ...opts })

const createAssemblyRegex = /\/assemblies\/[0-9a-f]{32}/

describe('Mocked API tests', () => {
  afterEach(() => {
    nock.cleanAll()
    nock.abortPendingRequests() // Abort delayed requests preventing them from ruining the next test
  })

  it('should time out createAssembly with a custom timeout', async () => {
    const client = new Transloadit({
      authKey: '',
      authSecret: '',
      endpoint: 'http://localhost',
    })

    nock('http://localhost').post(createAssemblyRegex).delay(100).reply(200)

    await expect(client.createAssembly({ timeout: 10 })).rejects.toThrow(TimeoutError)
  })

  it('should time out other requests with a custom timeout', async () => {
    const client = getLocalClient({ timeout: 10 })

    nock('http://localhost').post('/templates').delay(100).reply(200)

    await expect(client.createTemplate()).rejects.toThrow(TimeoutError)
  })

  it('should time out awaitAssemblyCompletion polling', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .delay(100)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING', assembly_url: '', assembly_ssl_url: '' })

    await expect(client.awaitAssemblyCompletion('1', { timeout: 1, interval: 1 })).rejects.toThrow(
      expect.objectContaining({ code: 'POLLING_TIMED_OUT', message: 'Polling timed out' })
    )
    scope.done()
  })

  it('should handle aborted correctly', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(200, { ok: 'ASSEMBLY_UPLOADING' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { ok: 'REQUEST_ABORTED', assembly_url: '', assembly_ssl_url: '' })

    await client.createAssembly()

    const result = await client.awaitAssemblyCompletion('1')
    expect(result.ok).toBe('REQUEST_ABORTED')
    scope.done()
  })

  it('should not time out awaitAssemblyCompletion polling', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING', assembly_url: '', assembly_ssl_url: '' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { ok: 'ASSEMBLY_COMPLETED', assembly_url: '', assembly_ssl_url: '' })

    await expect(
      client.awaitAssemblyCompletion('1', { timeout: 100, interval: 1 })
    ).resolves.toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
    scope.done()
  })

  it('should fail on error with error code', async () => {
    const client = getLocalClient()

    nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(400, { error: 'INVALID_FILE_META_DATA', message: 'Invalid file metadata' })

    await expect(client.createAssembly()).rejects.toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE_META_DATA',
        rawMessage: 'Invalid file metadata',
        message: 'API error (HTTP 400) INVALID_FILE_META_DATA: Invalid file metadata',
      })
    )
  })

  it('should return informative errors', async () => {
    const client = getLocalClient()

    nock('http://localhost').post(createAssemblyRegex).reply(400, {
      error: 'INVALID_FILE_META_DATA',
      message: 'Invalid file metadata',
      assembly_id: '123',
      assembly_ssl_url: 'https://api2-oltu.transloadit.com/assemblies/foo',
    })

    const promise = client.createAssembly()
    await expect(promise).rejects.toThrow(
      expect.objectContaining({
        message:
          'API error (HTTP 400) INVALID_FILE_META_DATA: Invalid file metadata https://api2-oltu.transloadit.com/assemblies/foo',
        assemblyId: '123',
      })
    )

    try {
      await promise
    } catch (err) {
      expect(inspect(err).split('\n')).toEqual([
        expect.stringMatching(
          `API error \\(HTTP 400\\) INVALID_FILE_META_DATA: Invalid file metadata https://api2-oltu.transloadit.com/assemblies/foo`
        ),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(
          `    at createAssemblyAndUpload \\(.+\\/src\\/Transloadit\\.ts:\\d+:\\d+\\)`
        ),
        expect.stringMatching(`    at .+\\/test\\/unit\\/mock-http\\.test\\.ts:\\d+:\\d+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`    at .+`),
        expect.stringMatching(`  rawMessage: 'Invalid file metadata',`),
        expect.stringMatching(`  assemblyId: '123',`),
        expect.stringMatching(
          `  assemblySslUrl: 'https:\\/\\/api2-oltu\\.transloadit\\.com\\/assemblies\\/foo'`
        ),
        expect.stringMatching(`  code: 'INVALID_FILE_META_DATA',`),
        expect.stringMatching(`  cause: HTTPError: Response code 400 \\(Bad Request\\)`),
        expect.stringMatching(`      at .+`),
        expect.stringMatching(`      at .+`),
        expect.stringMatching(`    code: 'ERR_NON_2XX_3XX_RESPONSE',`),
        // don't care about the rest:
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.stringMatching('    }'),
        expect.stringMatching('  }'),
        expect.stringMatching('}'),
      ])
    }
  })

  it('should retry correctly on RATE_LIMIT_REACHED', async () => {
    const client = getLocalClient({ maxRetries: 1 })

    // https://transloadit.com/blog/2012/04/introducing-rate-limiting/

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })
      .post(createAssemblyRegex)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING' })

    await client.createAssembly()
    scope.done()
  })

  it('should not retry on RATE_LIMIT_REACHED if maxRetries is 0', async () => {
    const client = getLocalClient({ maxRetries: 0 })

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(413, {
        error: 'RATE_LIMIT_REACHED',
        message: 'Request limit reached',
        info: { retryIn: 0.01 },
      })

    await expect(client.createAssembly()).rejects.toThrow(
      expect.objectContaining({
        message: 'API error (HTTP 413) RATE_LIMIT_REACHED: Request limit reached',
        code: 'RATE_LIMIT_REACHED',
      })
    )
    scope.done()
  })

  it('should not retry on other error', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(500)

    const promise = client.getAssembly('1')
    await expect(promise).rejects.toThrow(
      expect.not.objectContaining({ code: 'ERR_NOCK_NO_MATCH' })
    ) // Make sure that it was called only once
    await expect(promise).rejects.toThrow('API error (HTTP 500)')
    scope.done() // Make sure that it was called
  })

  it('should throw error on missing assembly_url/assembly_ssl_url', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, {
        assembly_url: 'https://transloadit.com/',
        assembly_ssl_url: 'https://transloadit.com/',
      })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, {})

    // Success
    await client.getAssembly('1')

    // Failure
    const promise = client.getAssembly('1')
    await expect(promise).rejects.toThrow(InconsistentResponseError)
    await expect(promise).rejects.toThrow(
      expect.objectContaining({
        message: 'Server returned an incomplete assembly response (no URL)',
      })
    )
    scope.done()
  })

  it('should not throw error from getAssembly or awaitAssemblyCompletion when server returns 200 with error in response', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { error: 'IMPORT_FILE_ERROR', assembly_url: '', assembly_ssl_url: '' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { error: 'IMPORT_FILE_ERROR', assembly_url: '', assembly_ssl_url: '' })

    const assembly = await client.getAssembly('1')
    expect(assembly).toMatchObject({ error: 'IMPORT_FILE_ERROR' })

    const assembly2 = await client.awaitAssemblyCompletion('1')
    expect(assembly2).toMatchObject({ error: 'IMPORT_FILE_ERROR' })

    scope.done()
  })

  it('should throw error with response.body createAssembly when server returns 200 with error in response', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(200, { error: 'IMPORT_FILE_ERROR', assembly_id: '1' })

    await expect(client.createAssembly()).rejects.toThrow(
      expect.objectContaining({
        code: 'IMPORT_FILE_ERROR',
        assemblyId: '1',
      })
    )
    scope.done()
  })

  it('should throw error replayAssembly when 200 and error in response', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post('/assemblies/1/replay')
      .reply(200, { error: 'IMPORT_FILE_ERROR' })

    await expect(client.replayAssembly('1')).rejects.toThrow(
      expect.objectContaining({
        code: 'IMPORT_FILE_ERROR',
      })
    )
    scope.done()
  })

  it('should getBill', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/bill/2020-01')
      .query(() => true)
      .reply(200, { ok: 'BILL_FOUND' })

    const result = await client.getBill('2020-01')
    expect(result).toMatchObject({ ok: 'BILL_FOUND' })
    scope.done()
  })

  // The old client did not do this
  it('should throw on 404', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/invalid')
      .query(() => true)
      .reply(404, { error: 'SERVER_404', message: 'unknown method / url' })

    const promise = client.getAssembly('invalid')
    await expect(promise).rejects.toThrow(ApiError)
    scope.done()
  })
})
