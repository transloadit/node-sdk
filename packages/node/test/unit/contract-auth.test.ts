import type { ContractClientOptions } from '../../src/contractTransport.ts'

import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import { expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ContractClient } from '../../src/generated-contract/client.ts'

const configurations = [
  { kind: 'signed', key: 'synthetic-key', secret: 'synthetic-secret' },
  { kind: 'bearer', token: 'synthetic-token' },
  { kind: 'none' },
] satisfies ContractClientOptions['authentication'][]

const success = {
  access_token: 'synthetic-access',
  expires_in: 60,
  refresh_token: 'synthetic-refresh',
  scope: 'templates:read',
  token_type: 'Bearer',
}

it.each(
  configurations,
)('uses the shared grant matrix with $kind configuration', async (authentication) => {
  const { grantAuthentication } = z
    .object({
      grantAuthentication: z
        .array(
          z.object({
            grant: z.enum(['authorization_code', 'refresh_token', 'client_credentials']),
            accountAuth: z.enum(['none', 'basic']),
          }),
        )
        .length(3),
    })
    .parse(
      JSON.parse(
        await readFile(
          new URL('../../src/generated-contract/wire-vectors.json', import.meta.url),
          'utf8',
        ),
      ),
    )
  for (const { grant, accountAuth } of grantAuthentication) {
    const transport = vi.fn<typeof fetch>((_url, init) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('authorization')).toBe(
        accountAuth === 'basic'
          ? `Basic ${Buffer.from('synthetic-key:synthetic-secret').toString('base64')}`
          : null,
      )
      expect(headers.has('cookie')).toBe(false)
      expect(init?.credentials).toBe('omit')
      expect(init?.redirect).toBe('error')
      if (!(init?.body instanceof URLSearchParams)) throw new Error('Expected form body')
      expect(init.body.getAll('grant_type')).toEqual([grant])
      expect(init.body.get('client_assertion')).toBe('opaque+proof&=')
      return Promise.resolve(
        new Response(JSON.stringify(success), { headers: { 'content-type': 'text/plain' } }),
      )
    })
    const client = new ContractClient({ authentication, fetch: transport })
    const request = client.issueBearerToken({
      body: { grant_type: grant, client_assertion: 'opaque+proof&=' },
    })
    if (accountAuth === 'basic' && authentication.kind !== 'signed') {
      await expect(request).rejects.toThrow('requires Auth Key credentials')
      expect(transport).not.toHaveBeenCalled()
    } else {
      await expect(request).resolves.toEqual(success)
      expect(transport).toHaveBeenCalledTimes(1)
    }
  }
})

it.each([
  undefined,
  null,
  '',
  'future_grant',
  'constructor',
  '__proto__',
  [],
  ['refresh_token'],
  1,
  {},
])('rejects an invalid grant before transport: %j', async (grant_type) => {
  const transport = vi.fn<typeof fetch>()
  const client = new ContractClient({
    authentication: { kind: 'signed', key: 'synthetic-key', secret: 'synthetic-secret' },
    fetch: transport,
  })
  // @ts-expect-error Exercise JavaScript callers that bypass the generated input type.
  await expect(client.issueBearerToken({ body: { grant_type } })).rejects.toThrow()
  expect(transport).not.toHaveBeenCalled()
})

it('selects authentication from the exact serialized form snapshot', async () => {
  let reads = 0
  const client = new ContractClient({
    authentication: { kind: 'signed', key: 'synthetic-key', secret: 'synthetic-secret' },
    fetch: (_url, init) => {
      expect(String(init?.body)).toBe('grant_type=refresh_token')
      expect(new Headers(init?.headers).has('authorization')).toBe(false)
      return Promise.resolve(Response.json(success))
    },
  })
  await client.issueBearerToken({
    body: {
      get grant_type() {
        return ++reads === 1 ? 'refresh_token' : 'client_credentials'
      },
    },
  })
  expect(reads).toBe(1)
})

it('rejects protected operations on an explicitly credentialless client', async () => {
  const transport = vi.fn<typeof fetch>()
  const client = new ContractClient({ authentication: { kind: 'none' }, fetch: transport })
  await expect(client.listTemplates()).rejects.toThrow('requires account authentication')
  expect(transport).not.toHaveBeenCalled()
})

it.each([
  undefined,
  {},
  { kind: 'typo' },
  { kind: 'signed', key: '', secret: 'secret' },
  { kind: 'bearer', token: '' },
  { kind: 'none', token: 'secret' },
  { kind: 'none', key: 'secret' },
  { kind: 'none', secret: 'secret' },
  { kind: 'none', algorithm: 'sha256' },
  { kind: 'signed', key: 1, secret: 'secret' },
  { kind: 'bearer', token: 1 },
  { kind: 'signed', key: 'key', secret: 'secret', token: 'secret' },
  { kind: 'bearer', token: 'secret', key: 'secret' },
])('does not silently accept missing or contradictory authentication: %j', (authentication) => {
  expect(() => Reflect.construct(ContractClient, [{ authentication }])).toThrow()
})

it.each([
  { kind: 'signed', key: 'key', secret: 'secret', token: undefined },
  { kind: 'bearer', token: 'token', key: undefined, secret: undefined, algorithm: undefined },
  { kind: 'none', key: undefined, secret: undefined, algorithm: undefined, token: undefined },
])('treats undefined settings as absent for $kind authentication', (authentication) => {
  expect(() => Reflect.construct(ContractClient, [{ authentication }])).not.toThrow()
})

it('preserves OAuth errors as data without retries or unsafe messages', async () => {
  const data = { error: 'invalid_grant', error_description: 'opaque private diagnostic' }
  const transport = vi.fn<typeof fetch>(async () => Response.json(data, { status: 400 }))
  const client = new ContractClient({ authentication: { kind: 'none' }, fetch: transport })
  await expect(
    client.issueBearerToken({ body: { grant_type: 'refresh_token' } }),
  ).rejects.toMatchObject({
    status: 400,
    data,
    message: 'API request failed with HTTP 400',
  })
  expect(transport).toHaveBeenCalledTimes(1)
})

it('retains redirect rejection for credentialless calls', async () => {
  const requests: string[] = []
  const server = createServer((request, response) => {
    requests.push(request.url ?? '')
    expect(request.headers.authorization).toBeUndefined()
    expect(request.headers.cookie).toBeUndefined()
    response.writeHead(307, { location: '/must-not-follow' })
    response.end()
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing loopback address')
    const client = new ContractClient({
      origin: `http://127.0.0.1:${address.port}`,
      authentication: { kind: 'none' },
    })
    await expect(
      client.issueBearerToken({ body: { grant_type: 'refresh_token' } }),
    ).rejects.toThrow()
    expect(requests).toEqual(['/token'])
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
