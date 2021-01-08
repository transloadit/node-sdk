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

    await expect(client.createAssemblyAsync()).rejects.toThrow(expect.objectContaining({ error: 'INVALID_FILE_META_DATA' }))
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
      .reply(413, { error: 'RATE_LIMIT_REACHED', info: { retryIn: 0.01 } })

    await expect(client.createAssemblyAsync()).rejects.toThrow(expect.objectContaining({ error: 'RATE_LIMIT_REACHED' }))
    scope.done()
  })

  it('should not retry on other error', async () => {
    const client = new TransloaditClient({ authKey: '', authSecret: '', useSsl: false, service: 'localhost' })

    const scope = nock('http://localhost')
      .get('/assemblies/1')
      .query(() => true)
      .reply(500)

    await expect(client.getAssemblyAsync(1)).rejects.toThrow(expect.not.objectContaining({ code: 'ERR_NOCK_NO_MATCH' })) // Make sure that it was called only once
    scope.done() // Make sure that it was called
  }, 5000)
})
