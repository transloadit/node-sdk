const nock = require('nock')

const TransloaditClient = require('../../../src/TransloaditClient')

jest.setTimeout(1000)

describe('Mocked API tests', () => {
  afterEach(() => nock.cleanAll())

  it('should time out requests', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '' })

    nock('http://localhost')
      .get('/test')
      .query(() => true)
      .delay(100)
      .reply(200)

    await expect(client._remoteJson({ url: 'http://localhost/test', method: 'get', timeout: 10 })).rejects.toThrow(TransloaditClient.TimeoutError)
  })

  it('should fail on error with error code', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    nock('http://localhost')
      .post('/assemblies')
      .reply(400, { error: 'INVALID_FILE_META_DATA' })

    await expect(client.createAssemblyAsync()).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'INVALID_FILE_META_DATA', message: 'INVALID_FILE_META_DATA' }))
  })

  it('should return assemblyId and response.body in Error', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    nock('http://localhost')
      .post('/assemblies')
      .reply(400, { error: 'INVALID_FILE_META_DATA', assembly_id: '123', assembly_url: 'foo' })

    await expect(client.createAssemblyAsync()).rejects.toThrow(expect.objectContaining({
      assemblyId: '123',
      message   : 'INVALID_FILE_META_DATA (assembly_id 123)',
      response  : expect.objectContaining({ body: expect.objectContaining({ assembly_id: '123', assembly_url: 'foo' }) }),
    }))
  })

  it('should retry correctly on RATE_LIMIT_REACHED', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })
    client._maxRetries = 1

    // https://transloadit.com/blog/2012/04/introducing-rate-limiting/

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })
      .post('/assemblies')
      .reply(200, { ok: 'ASSEMBLY_EXECUTING' })

    await client.createAssemblyAsync()
    scope.done()
  })

  it('should retry max 2 times on RATE_LIMIT_REACHED', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })
    client._maxRetries = 1

    // https://transloadit.com/blog/2012/04/introducing-rate-limiting/

    const scope = nock('http://localhost')
      .post('/assemblies')
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })
      .post('/assemblies')
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 }, message: 'Request limit reached' })

    await expect(client.createAssemblyAsync()).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'RATE_LIMIT_REACHED', message: 'RATE_LIMIT_REACHED: Request limit reached' }))
    scope.done()
  })

  it('should not retry on other error', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(500)

    const promise = client.getAssemblyAsync(1)
    await expect(promise).rejects.toThrow(expect.not.objectContaining({ code: 'ERR_NOCK_NO_MATCH' })) // Make sure that it was called only once
    await expect(promise).rejects.toThrow(expect.objectContaining({ message: 'Response code 500 (Internal Server Error)' }))
    scope.done() // Make sure that it was called
  }, 5000)

  it('should throw error on missing assembly_url/assembly_ssl_url', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, { assembly_url: 'https://transloadit.com/', assembly_ssl_url: 'https://transloadit.com/' })
      .get('/assemblies/1')
      .query(() => true)
      .reply(200, {})

    // Success
    await client.getAssemblyAsync(1)

    // Failure
    const promise = client.getAssemblyAsync(1)
    await expect(promise).rejects.toThrow(TransloaditClient.InconsistentResponseError)
    await expect(promise).rejects.toThrow(expect.objectContaining({ message: 'Server returned an incomplete Assembly response' }))
    scope.done()
  }, 5000)

})
