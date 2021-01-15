const nock = require('nock')

const TransloaditClient = require('../../../src/TransloaditClient')

jest.setTimeout(1000)

const getLocalClient = (opts) => new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost', ...opts })

describe('Mocked API tests', () => {
  afterEach(() => {
    nock.cleanAll()
    nock.abortPendingRequests() // Abort delayed requests preventing them from ruining the next test
  })

  it('should time out createAssembly with a custom timeout', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    nock('http://localhost')
      .post('/assemblies')
      .delay(100)
      .reply(200)

    await expect(client.createAssembly({ timeout: 10 })).rejects.toThrow(TransloaditClient.TimeoutError)
  })

  it('should time out other requests with a custom timeout', async () => {
    const client = getLocalClient({ timeout: 10 })

    nock('http://localhost')
      .post('/templates')
      .delay(100)
      .reply(200)

    await expect(client.createTemplate()).rejects.toThrow(TransloaditClient.TimeoutError)
  })

  it('should time out awaitAssemblyCompletion polling', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .delay(100)
      .reply(200, { ok: 'ASSEMBLY_EXECUTING', assembly_url: '', assembly_ssl_url: '' })

    await expect(client.awaitAssemblyCompletion(1, { timeout: 1, interval: 1 })).rejects.toThrow(expect.objectContaining({ code: 'POLLING_TIMED_OUT', message: 'Polling timed out' }))
    scope.done()
  })

  it('should handle aborted correctly', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(200, { ok: 'ASSEMBLY_UPLOADING' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { ok: 'REQUEST_ABORTED', assembly_url: '', assembly_ssl_url: '' })

    await client.createAssembly()

    const result = await client.awaitAssemblyCompletion(1)
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

    await expect(client.awaitAssemblyCompletion(1, { timeout: 100, interval: 1 })).resolves.toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
    scope.done()
  })

  it('should fail on error with error code', async () => {
    const client = getLocalClient()

    nock('http://localhost')
      .post('/assemblies')
      .reply(400, { error: 'INVALID_FILE_META_DATA' })

    await expect(client.createAssembly()).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'INVALID_FILE_META_DATA', message: 'INVALID_FILE_META_DATA' }))
  })

  it('should return assemblyId and response.body in Error', async () => {
    const client = getLocalClient()

    nock('http://localhost')
      .post('/assemblies')
      .reply(400, { error: 'INVALID_FILE_META_DATA', assembly_id: '123', assembly_ssl_url: 'https://api2-oltu.transloadit.com/assemblies/foo' })

    await expect(client.createAssembly()).rejects.toThrow(expect.objectContaining({
      assemblyId: '123',
      message   : 'INVALID_FILE_META_DATA - https://api2-oltu.transloadit.com/assemblies/foo',
      response  : expect.objectContaining({ body: expect.objectContaining({ assembly_id: '123' }) }),
    }))
  })

  it('should retry correctly on RATE_LIMIT_REACHED', async () => {
    const client = getLocalClient()
    client._maxRetries = 1

    // https://transloadit.com/blog/2012/04/introducing-rate-limiting/

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })
      .post('/assemblies')
      .reply(200, { ok: 'ASSEMBLY_EXECUTING' })

    await client.createAssembly()
    scope.done()
  })

  it('should not retry on RATE_LIMIT_REACHED if maxRetries is 0', async () => {
    const client = getLocalClient({ maxRetries: 0 })

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(413, { error: 'RATE_LIMIT_REACHED', message: 'Request limit reached', info: { retryIn: 0.01 } })

    await expect(client.createAssembly()).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'RATE_LIMIT_REACHED', message: 'RATE_LIMIT_REACHED: Request limit reached' }))
    scope.done()
  })

  it('should not retry on other error', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(500)

    const promise = client.getAssembly(1)
    await expect(promise).rejects.toThrow(expect.not.objectContaining({ code: 'ERR_NOCK_NO_MATCH' })) // Make sure that it was called only once
    await expect(promise).rejects.toThrow(expect.objectContaining({ message: 'Response code 500 (Internal Server Error)' }))
    scope.done() // Make sure that it was called
  })

  it('should throw error on missing assembly_url/assembly_ssl_url', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { assembly_url: 'https://transloadit.com/', assembly_ssl_url: 'https://transloadit.com/' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, {})

    // Success
    await client.getAssembly(1)

    // Failure
    const promise = client.getAssembly(1)
    await expect(promise).rejects.toThrow(TransloaditClient.InconsistentResponseError)
    await expect(promise).rejects.toThrow(expect.objectContaining({ message: 'Server returned an incomplete assembly response (no URL)' }))
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

    const assembly = await client.getAssembly(1)
    expect(assembly).toMatchObject({ error: 'IMPORT_FILE_ERROR' })

    const assembly2 = await client.awaitAssemblyCompletion(1)
    expect(assembly2).toMatchObject({ error: 'IMPORT_FILE_ERROR' })

    scope.done()
  })

  it('should throw error with response.body createAssembly when server returns 200 with error in response', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(200, { error: 'IMPORT_FILE_ERROR', assembly_id: '1' })

    await expect(client.createAssembly()).rejects.toThrow(expect.objectContaining({
      transloaditErrorCode: 'IMPORT_FILE_ERROR',
      response            : expect.objectContaining({ body: expect.objectContaining({ assembly_id: '1' }) }),
    }))
    scope.done()
  })

  it('should throw error replayAssembly when 200 and error in response', async () => {
    const client = getLocalClient()

    const scope = nock('http://localhost')
      .post('/assemblies/1/replay')
      .reply(200, { error: 'IMPORT_FILE_ERROR' })

    await expect(client.replayAssembly(1)).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'IMPORT_FILE_ERROR' }))
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
})
