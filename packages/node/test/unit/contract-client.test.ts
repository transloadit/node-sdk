import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ContractClient, ContractResponseError } from '../../src/generated-contract/client.ts'
import { Transloadit } from '../../src/Transloadit.ts'

const key = 'synthetic-contract-key'
const secret = 'synthetic-contract-secret'

describe('contract-generated methods', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rejects non-loopback HTTP before any credential-bearing request', () => {
    expect(
      () =>
        new ContractClient({
          origin: 'http://proxy.example.com',
          authentication: { kind: 'signed', key, secret },
        }),
    ).toThrow('HTTPS')
  })

  it('preserves the configured proxy path prefix', async () => {
    const client = new ContractClient({
      origin: 'https://proxy.example.com/transloadit',
      authentication: { kind: 'signed', key, secret },
      fetch: (url) => {
        expect(new URL(String(url)).pathname).toBe('/transloadit/templates')
        return Promise.resolve(new Response('{"count":0,"items":[]}'))
      },
    })
    expect(await client.listTemplates({ params: {} })).toMatchObject({ count: 0 })
  })

  it('preserves the SDK client identification and configured request deadline', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      expect(new Headers(options?.headers).get('Transloadit-Client')).toBe('contract-test')
      const signal = options?.signal
      if (!(signal instanceof AbortSignal)) throw new Error('Configured timeout was lost')
      return new Promise((_resolve, reject) => {
        if (signal.aborted) reject(signal.reason)
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    })
    const client = new Transloadit({
      authKey: key,
      authSecret: secret,
      timeout: 5,
      clientName: 'contract-test',
    }).contract()
    await expect(client.listTemplates({ params: {} })).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('accepts builtin IDs returned by listTemplates without permitting arbitrary path tails', async () => {
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: (url) => {
        expect(new URL(String(url)).pathname).toBe('/templates/builtin/encode-hls-video@0.0.1')
        return Promise.resolve(new Response('{"error":"TEST_ERROR"}', { status: 400 }))
      },
    })
    await expect(
      client.getTemplate({
        path: { templateIdOrName: 'builtin/encode-hls-video@0.0.1' },
        params: {},
      }),
    ).rejects.toBeInstanceOf(ContractResponseError)
    await expect(
      client.getTemplate({ path: { templateIdOrName: 'builtin/../auth_keys' }, params: {} }),
    ).rejects.toThrow('Invalid path')
  })
  it('preserves the producer-owned cross-language presence vectors', async () => {
    const vectors = z
      .object({
        optionalAuthKeyParams: z.array(
          z.object({
            signature_algo: z.null().optional(),
            is_allowed_for_smartcdn: z.boolean().optional(),
            nonce: z.union([z.string(), z.number()]).optional(),
          }),
        ),
      })
      .parse(
        JSON.parse(
          await readFile(
            new URL('../../src/generated-contract/wire-vectors.json', import.meta.url),
            'utf8',
          ),
        ),
      )
    for (const params of vectors.optionalAuthKeyParams) {
      const client = new ContractClient({
        authentication: { kind: 'bearer', token: 'synthetic-token' },
        fetch: (_target, options) => {
          if (!(options?.body instanceof URLSearchParams)) throw new Error('missing form')
          expect(JSON.parse(options.body.get('params') ?? 'null')).toEqual(params)
          return Promise.resolve(new Response('{"error":"TEST_ERROR"}', { status: 400 }))
        },
      })
      await expect(
        client.updateAuthKey({ path: { authKeyId: 'synthetic-id' }, params }),
      ).rejects.toBeInstanceOf(ContractResponseError)
    }
  })

  it('merges caller-owned upload constraints with managed credentials before signing', async () => {
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: (_url, options) => {
        if (!(options?.body instanceof FormData)) throw new Error('Expected multipart request')
        const source = options.body.get('params')
        if (typeof source !== 'string') throw new Error('Expected serialized params')
        expect(JSON.parse(source).auth).toMatchObject({
          key,
          max_size: 7,
          max_number_of_files: 1,
          referer: 'example.invalid',
        })
        expect(options.body.get('signature')).toBe(
          `sha384:${createHmac('sha384', secret).update(source).digest('hex')}`,
        )
        return Promise.resolve(new Response('{"error":"TEST_ERROR"}', { status: 400 }))
      },
    })
    const params = {
      template_id: 'synthetic',
      auth: { max_size: 7, max_number_of_files: 1, referer: 'example.invalid' },
    }
    await expect(client.createAssembly({ params })).rejects.toBeInstanceOf(ContractResponseError)
    const forbidden = { template_id: 'synthetic', auth: { key: 'override', max_size: 7 } }
    await expect(client.createAssembly({ params: forbidden })).rejects.toThrow('credentials')
  })
  it('uses existing SDK credentials without changing existing entrypoints', () => {
    const sdk = new Transloadit({ authKey: key, authSecret: secret })
    expect(sdk.contract()).toBeInstanceOf(ContractClient)
    expect(typeof sdk.createAssembly).toBe('function')
  })

  it('signs exact query bytes, encoding raw resource values once', async () => {
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: (target, options) => {
        const url = new URL(String(target))
        expect(url.pathname).toBe('/templates/name%20with%20%25%20and%20%2B')
        expect(options?.method).toBe('GET')
        expect(options?.redirect).toBe('error')
        expect(options?.credentials).toBe('omit')
        const params = url.searchParams.get('params')
        expect(params).not.toBeNull()
        if (params === null) throw new Error('missing params')
        expect(JSON.parse(params)).toMatchObject({ auth: { key }, nonce: 0 })
        expect(url.searchParams.get('signature')).toBe(
          `sha384:${createHmac('sha384', secret).update(params).digest('hex')}`,
        )
        return Promise.resolve(new Response('{"error":"NOT_FOUND"}', { status: 404 }))
      },
    })
    await expect(
      client.getTemplate({ path: { templateIdOrName: 'name with % and +' }, params: { nonce: 0 } }),
    ).rejects.toMatchObject({ status: 404, data: { error: 'NOT_FOUND' } })
  })

  it('preserves DELETE form bodies and explicit false/zero/null updates', async () => {
    const captured: { method: string | undefined; params: unknown }[] = []
    const client = new ContractClient({
      authentication: { kind: 'bearer', token: 'synthetic-token' },
      fetch: (_target, options) => {
        expect(new Headers(options?.headers).get('authorization')).toBe('Bearer synthetic-token')
        expect(options?.body).toBeInstanceOf(URLSearchParams)
        if (!(options?.body instanceof URLSearchParams)) throw new Error('missing form')
        captured.push({
          method: options.method,
          params: JSON.parse(options.body.get('params') ?? 'null'),
        })
        expect(options.body.has('signature')).toBe(false)
        return Promise.resolve(new Response('{"error":"TEST_ERROR"}', { status: 400 }))
      },
    })
    await expect(
      client.updateAuthKey({
        path: { authKeyId: '123' },
        params: { is_allowed_for_smartcdn: false, nonce: 0, signature_algo: null },
      }),
    ).rejects.toBeInstanceOf(ContractResponseError)
    await expect(
      client.deleteTemplate({ path: { templateIdOrName: '123' }, params: {} }),
    ).rejects.toBeInstanceOf(ContractResponseError)
    expect(captured).toEqual([
      { method: 'PUT', params: { is_allowed_for_smartcdn: false, nonce: 0, signature_algo: null } },
      { method: 'DELETE', params: {} },
    ])
  })

  it('sends native multipart bytes and rejects reserved fields before transport', async () => {
    let calls = 0
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: async (_target, options) => {
        calls += 1
        if (!(options?.body instanceof FormData)) throw new Error('missing multipart')
        const file = options.body.get('file')
        if (!(file instanceof Blob)) throw new Error('missing file')
        expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([0, 255, 1])
        const params = options.body.get('params')
        if (typeof params !== 'string') throw new Error('missing params')
        expect(options.body.get('signature')).toBe(
          `sha384:${createHmac('sha384', secret).update(params).digest('hex')}`,
        )
        expect(options.body.get('num_expected_upload_files')).toBe('0')
        return new Response('{"error":"TEST_ERROR"}', { status: 400 })
      },
    })
    const params = { template_id: 'synthetic-template' }
    await expect(
      client.createAssembly({
        params,
        fields: { num_expected_upload_files: '0' },
        files: { file: { filename: 'test.bin', data: new Blob([new Uint8Array([0, 255, 1])]) } },
      }),
    ).rejects.toBeInstanceOf(ContractResponseError)
    await expect(client.createAssembly({ params, fields: { params: '{}' } })).rejects.toThrow(
      'Reserved form field',
    )
    expect(calls).toBe(1)
  })

  it('uses Basic only for token issuance and decodes JSON even with a text response MIME', async () => {
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: (target, options) => {
        expect(new URL(String(target)).pathname).toBe('/token')
        expect(new Headers(options?.headers).get('authorization')).toBe(
          `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        )
        expect(String(options?.body)).toBe(
          'grant_type=client_credentials&aud=api2&scope=templates%3Aread',
        )
        return Promise.resolve(
          new Response(
            '{"access_token":"synthetic-token","expires_in":60,"scope":"templates:read","token_type":"Bearer"}',
            { headers: { 'content-type': 'text/plain; charset=utf-8' } },
          ),
        )
      },
    })
    const token = await client.issueBearerToken({
      body: { grant_type: 'client_credentials', aud: 'api2', scope: 'templates:read' },
    })
    expect(token.access_token).toBe('synthetic-token')
  })

  it('rejects dot segments before sending any authenticated request', async () => {
    let calls = 0
    const client = new ContractClient({
      authentication: { kind: 'signed', key, secret },
      fetch: () => {
        calls += 1
        return Promise.resolve(new Response('{}'))
      },
    })
    await expect(
      client.getTemplate({ path: { templateIdOrName: '..' }, params: {} }),
    ).rejects.toThrow('Invalid path parameter')
    expect(calls).toBe(0)
  })
})
