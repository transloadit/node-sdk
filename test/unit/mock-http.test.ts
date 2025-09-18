import { inspect } from 'node:util'
import nock from 'nock'

import {
  ApiError,
  type AssemblyStatus,
  assemblyInstructionsSchema,
  InconsistentResponseError,
  type Options,
  TimeoutError,
  Transloadit,
} from '../../src/Transloadit.ts'
import { createProxy } from '../util.ts'

const getLocalClient = (opts?: Omit<Options, 'authKey' | 'authSecret' | 'endpoint'>) =>
  createProxy(
    new Transloadit({ authKey: '', authSecret: '', endpoint: 'http://localhost', ...opts }),
  )

const createAssemblyRegex = /\/assemblies\/[0-9a-f]{32}/

describe('Mocked API tests', () => {
  afterEach(() => {
    nock.cleanAll()
    nock.abortPendingRequests() // Abort delayed requests preventing them from ruining the next test
  })

  it('should time out createAssembly with a custom timeout', async () => {
    const client = getLocalClient()

    nock('http://localhost').post(createAssemblyRegex).delay(100).reply(200)

    await expect(client.createAssembly({ timeout: 10 })).rejects.toThrow(TimeoutError)
  })

  it('should time out other requests with a custom timeout', async () => {
    const client = getLocalClient({ timeout: 10 })

    nock('http://localhost').post('/templates').delay(100).reply(200)

    await expect(client.createTemplate({ name: '', template: {} })).rejects.toThrow(TimeoutError)
  })

  it('should time out awaitAssemblyCompletion polling', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .delay(100)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING', assembly_url: '', assembly_ssl_url: '' })

    await expect(client.awaitAssemblyCompletion('1', { timeout: 1, interval: 1 })).rejects.toThrow(
      expect.objectContaining({ code: 'POLLING_TIMED_OUT', message: 'Polling timed out' }),
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
    expect((result as Extract<AssemblyStatus, { ok: unknown }>).ok).toBe('REQUEST_ABORTED')
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
      client.awaitAssemblyCompletion('1', { timeout: 100, interval: 1 }),
    ).resolves.toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
    scope.done()
  })

  it('should return error when GETting a failed assembly', async () => {
    const client = getLocalClient()

    // when an assembly exists but has failed, the GET endpoint returns 200, but the assembly has an `error` property
    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, {
        error: 'INVALID_FILE_META_DATA',
        message: 'Invalid file metadata',
        assembly_url: '',
        assembly_ssl_url: '',
      })

    expect(await client.getAssembly('1')).toMatchObject<AssemblyStatus>({
      error: 'INVALID_FILE_META_DATA',
      message: 'Invalid file metadata',
    })

    scope.done()
  })

  it('should throw error with error code', async () => {
    const client = getLocalClient()

    nock('http://localhost').post(createAssemblyRegex).reply(400, {
      error: 'INVALID_FILE_META_DATA',
      message: 'Invalid file metadata',
      reason: 'Some reason',
    })

    await expect(client.createAssembly()).rejects.toThrow(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        code: 'INVALID_FILE_META_DATA',
        rawMessage: 'Invalid file metadata',
        reason: 'Some reason',
        message: 'API error (HTTP 400) INVALID_FILE_META_DATA: Invalid file metadata',
      }),
    )
  })

  it('should throw informative errors', async () => {
    const client = getLocalClient()

    nock('http://localhost').post(createAssemblyRegex).reply(400, {
      error: 'INVALID_FILE_META_DATA',
      message: 'Invalid file metadata',
      assembly_id: '123',
      assembly_ssl_url: 'https://api2-oltu.transloadit.com/assemblies/foo',
    })

    const promise = client.createAssembly()
    await expect(promise).rejects.toThrow(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        message:
          'API error (HTTP 400) INVALID_FILE_META_DATA: Invalid file metadata https://api2-oltu.transloadit.com/assemblies/foo',
        assemblyId: '123',
      }),
    )

    const errorString = await promise.catch(inspect)
    expect(typeof errorString === 'string').toBeTruthy()
    // console.log(inspect(errorString))
    expect(inspect(errorString).split('\n')).toEqual([
      expect.stringMatching(
        `API error \\(HTTP 400\\) INVALID_FILE_META_DATA: Invalid file metadata https://api2-oltu.transloadit.com/assemblies/foo`,
      ),
      expect.stringMatching(`    at .+`),
      expect.stringMatching(`    at .+`),
      expect.stringMatching(
        `    at createAssemblyAndUpload \\(.+\\/src\\/Transloadit\\.ts:\\d+:\\d+\\)`,
      ),
      expect.stringMatching(`    at .+\\/test\\/unit\\/mock-http\\.test\\.ts:\\d+:\\d+`),
      expect.stringMatching(`    at .+`),
      expect.stringMatching(`  code: 'INVALID_FILE_META_DATA',`),
      expect.stringMatching(`  rawMessage: 'Invalid file metadata',`),
      expect.stringMatching(`  reason: undefined,`),
      expect.stringMatching(
        `  assemblySslUrl: 'https:\\/\\/api2-oltu\\.transloadit\\.com\\/assemblies\\/foo'`,
      ),
      expect.stringMatching(`  assemblyId: '123',`),
      expect.stringMatching(`  cause: HTTPError: Response code 400 \\(Bad Request\\)`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`      at .+`),
      expect.stringMatching(`    input: undefined,`),
      expect.stringMatching(`    code: 'ERR_NON_2XX_3XX_RESPONSE',`),
      expect.stringMatching('    \\[cause\\]: {}'),
      expect.stringMatching('  }'),
      expect.stringMatching('}'),
    ])
  })

  it('should retry correctly on RATE_LIMIT_REACHED', async () => {
    const client = getLocalClient({ maxRetries: 1 })

    // https://transloadit.com/blog/2012/04/introducing-rate-limiting/

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(429, { error: 'ASSEMBLY_STATUS_FETCHING_RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })
      .post(createAssemblyRegex)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING' })

    await client.createAssembly()
    scope.done()
  })

  it('should not retry on RATE_LIMIT_REACHED if maxRetries is 0', async () => {
    const client = getLocalClient({ maxRetries: 0 })

    const scope = nock('http://localhost')
      .post(createAssemblyRegex)
      .reply(429, {
        error: 'RATE_LIMIT_REACHED',
        message: 'Request limit reached',
        info: { retryIn: 0.01 },
      })

    await expect(client.createAssembly()).rejects.toThrow(
      expect.objectContaining({
        message: 'API error (HTTP 429) RATE_LIMIT_REACHED: Request limit reached',
        code: 'RATE_LIMIT_REACHED',
      }),
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
      expect.not.objectContaining({ code: 'ERR_NOCK_NO_MATCH' }),
    ) // Make sure that it was called only once
    await expect(promise).rejects.toThrow('API error (HTTP 500)')
    scope.done() // Make sure that it was called
  })

  it('should throw error on missing assembly_url/assembly_ssl_url', async () => {
    const client = getLocalClient()

    const validOkStatusMissingUrls = {
      ok: 'ASSEMBLY_COMPLETED',
      assembly_id: 'test-id', // assembly_id is optional, but good to have for a realistic "ok" status
      // assembly_url is intentionally missing/null
      // assembly_ssl_url is intentionally missing/null
    }

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, validOkStatusMissingUrls)

    // This call should pass Zod validation but fail at checkAssemblyUrls
    const promise = client.getAssembly('1')

    await expect(promise).rejects.toBeInstanceOf(InconsistentResponseError)
    await expect(promise).rejects.toHaveProperty(
      'message',
      'Server returned an incomplete assembly response (no URL)',
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
      }),
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
      }),
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

  it.skip('should not log monster error stack traces in vitest', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/invalid')
      .query(() => true)
      .reply(404, { error: 'SERVER_404', message: 'not found' })

    try {
      await client.getAssembly('invalid')
      // NOTE: manually check output from vitest
      // Check that it doesn't print a huge blob of JSON
    } finally {
      scope.done()
    }
  })

  it('should export assemblyInstructionsSchema', () => {
    expect(assemblyInstructionsSchema).toBeDefined()
  })
})
