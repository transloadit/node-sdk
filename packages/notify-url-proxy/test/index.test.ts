import { describe, expect, it } from 'vitest'

import { extractAssemblyUrl, getAssemblyState, getSignature } from '../src/index.ts'

describe('getSignature', () => {
  it('creates a sha384 prefixed hmac signature', () => {
    const signature = getSignature('foo_secret', '{"ok":"ASSEMBLY_COMPLETED"}')
    expect(signature).toBe(
      'sha384:bf26800c5256b38bbf9375c76894d5b649751903973f99d0f036c8e52f6cda287bed711b73c21dbde4d4df6c8fc540a1',
    )
  })
})

describe('extractAssemblyUrl', () => {
  it('extracts assembly_url from proxy payload', () => {
    expect(extractAssemblyUrl('{"assembly_url":"https://example.test/a/123"}')).toBe(
      'https://example.test/a/123',
    )
  })

  it('extracts assembly_ssl_url when present', () => {
    expect(extractAssemblyUrl('{"assembly_ssl_url":"https://secure.example.test/a/123"}')).toBe(
      'https://secure.example.test/a/123',
    )
  })

  it('returns null for invalid payloads', () => {
    expect(extractAssemblyUrl('nope')).toBeNull()
    expect(extractAssemblyUrl('{"foo":"bar"}')).toBeNull()
  })
})

describe('getAssemblyState', () => {
  it('accepts known states', () => {
    expect(getAssemblyState({ ok: 'ASSEMBLY_COMPLETED' })).toBe('ASSEMBLY_COMPLETED')
    expect(getAssemblyState({ ok: 'ASSEMBLY_CANCELED' })).toBe('ASSEMBLY_CANCELED')
    expect(getAssemblyState({ ok: 'REQUEST_ABORTED' })).toBe('REQUEST_ABORTED')
    expect(getAssemblyState({ ok: 'ASSEMBLY_UPLOADING' })).toBe('ASSEMBLY_UPLOADING')
    expect(getAssemblyState({ ok: 'ASSEMBLY_EXECUTING' })).toBe('ASSEMBLY_EXECUTING')
    expect(getAssemblyState({ ok: 'ASSEMBLY_REPLAYING' })).toBe('ASSEMBLY_REPLAYING')
  })

  it('rejects unknown states', () => {
    expect(() => getAssemblyState({ ok: 'UNKNOWN' })).toThrow('Unknown Assembly state found')
  })

  it('rejects malformed payloads', () => {
    expect(() => getAssemblyState(null)).toThrow('No ok field found')
  })
})
