import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

const upstreamHeader = 'Transloadit-Mcp-Upstream'

const completedAssembly = {
  ok: 'ASSEMBLY_COMPLETED',
  assembly_id: 'abc',
  assembly_url: 'https://api2.transloadit.com/assemblies/abc',
  assembly_ssl_url: 'https://api2.transloadit.com/assemblies/abc',
}

describe('extraHeaders on redirects', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  it('drops extraHeaders when a redirect leaves the API origin', async () => {
    const client = new Transloadit({
      authToken: 'forwarded-token-0123456789',
      extraHeaders: { [upstreamHeader]: 'shared-secret' },
    })
    nock('https://api2.transloadit.com')
      .get('/assemblies/abc')
      .query(true)
      .reply(302, '', { Location: 'https://elsewhere.example/assemblies/abc' })
    const elsewhere = nock('https://elsewhere.example', {
      badheaders: [upstreamHeader.toLowerCase(), 'authorization'],
    })
      .get('/assemblies/abc')
      .reply(200, completedAssembly)

    await client.getAssembly('abc')
    expect(elsewhere.isDone()).toBe(true)
  })

  it('keeps extraHeaders on a same-origin redirect', async () => {
    const client = new Transloadit({
      authToken: 'forwarded-token-0123456789',
      extraHeaders: { [upstreamHeader]: 'shared-secret' },
    })
    nock('https://api2.transloadit.com')
      .get('/assemblies/abc')
      .query(true)
      .reply(302, '', { Location: 'https://api2.transloadit.com/assemblies/abc2' })
    const sameOrigin = nock('https://api2.transloadit.com', {
      reqheaders: { [upstreamHeader.toLowerCase()]: 'shared-secret' },
    })
      .get('/assemblies/abc2')
      .reply(200, completedAssembly)

    await client.getAssembly('abc')
    expect(sameOrigin.isDone()).toBe(true)
  })
})
