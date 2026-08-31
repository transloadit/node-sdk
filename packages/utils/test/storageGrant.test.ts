import { describe, expect, test } from 'vitest'

import { signStorageGrant, verifyStorageGrant } from '../src/node.ts'
import {
  decodeStorageGrant,
  normalizeStorageGrantPrefix,
  parseStorageGrantClaims,
} from '../src/storageGrant.ts'

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef'

describe('storage grants', () => {
  test('mints the exact api2 StorageGrantManager token for fixed inputs', () => {
    // Golden vector: header {"alg":"HS256","typ":"JWT"}, claim order
    // v/bucket/prefix/scopes/sub/iat/exp, base64url without padding.
    const { grant, claims } = signStorageGrant(
      {
        bucket: 'toystory',
        prefix: 'photos/',
        scopes: ['read', 'write'],
        sub: 'user-1',
        expiresInSeconds: 900,
        nowMs: 1_750_000_000_000,
      },
      SECRET,
    )
    expect(claims).toEqual({
      v: 1,
      bucket: 'toystory',
      prefix: 'photos/',
      scopes: ['read', 'write'],
      sub: 'user-1',
      iat: 1_750_000_000,
      exp: 1_750_000_900,
    })
    const [headerPart, payloadPart] = grant.split('.')
    expect(Buffer.from(headerPart ?? '', 'base64url').toString('utf8')).toBe(
      '{"alg":"HS256","typ":"JWT"}',
    )
    expect(Buffer.from(payloadPart ?? '', 'base64url').toString('utf8')).toBe(
      '{"v":1,"bucket":"toystory","prefix":"photos/","scopes":["read","write"],"sub":"user-1","iat":1750000000,"exp":1750000900}',
    )
    expect(grant).not.toContain('=')
  })

  test('mint → verify roundtrip, unicode prefix included', () => {
    const { grant } = signStorageGrant(
      { bucket: 'b', prefix: 'café/ぱんだ/', nowMs: 1_750_000_000_000 },
      SECRET,
    )
    const claims = verifyStorageGrant(grant, SECRET, { nowMs: 1_750_000_100_000 })
    expect(claims.prefix).toBe('café/ぱんだ/')
    expect(claims.scopes).toEqual(['read'])
    expect(decodeStorageGrant(grant)?.prefix).toBe('café/ぱんだ/')
  })

  test('rejects tampering, wrong secrets, expiry, and malformed tokens', () => {
    const { grant } = signStorageGrant({ bucket: 'b', nowMs: 1_750_000_000_000 }, SECRET)
    expect(() => verifyStorageGrant(grant, 'other-secret')).toThrow(/signature/)
    const [h, p, s] = grant.split('.')
    const forged = `${h}.${Buffer.from('{"v":1,"bucket":"evil","prefix":"","scopes":["write"],"exp":9999999999}').toString('base64url')}.${s}`
    expect(() => verifyStorageGrant(forged, SECRET)).toThrow(/signature/)
    expect(() => verifyStorageGrant(grant, SECRET, { nowMs: 1_750_000_901_000 })).toThrow(/expired/)
    expect(() => verifyStorageGrant('not-a-jwt', SECRET)).toThrow(/Invalid/)
    expect(() => verifyStorageGrant(`${grant}.extra`, SECRET)).toThrow(/Invalid/)
  })

  test('claim parsing is strict, dedupes scopes, and decode is lenient about padding', () => {
    expect(parseStorageGrantClaims(null)).toBeNull()
    expect(
      parseStorageGrantClaims({ v: 2, bucket: 'b', prefix: '', scopes: [], exp: 1 }),
    ).toBeNull()
    expect(parseStorageGrantClaims({ v: 1, bucket: '', prefix: '', scopes: [], exp: 1 })).toBeNull()
    expect(
      parseStorageGrantClaims({ v: 1, bucket: 'b', prefix: '', scopes: ['read', 'admin'], exp: 1 }),
    ).toBeNull()
    expect(
      parseStorageGrantClaims({
        v: 1,
        bucket: 'b',
        prefix: '',
        scopes: ['read', 'read', 'write'],
        exp: 1,
      })?.scopes,
    ).toEqual(['read', 'write'])
    expect(decodeStorageGrant('only-one-part')).toBeNull()
    expect(decodeStorageGrant('a..c')).toBeNull()
  })

  test('normalizeStorageGrantPrefix mirrors Companion', () => {
    expect(normalizeStorageGrantPrefix('')).toBe('')
    expect(normalizeStorageGrantPrefix('/photos')).toBe('photos/')
    expect(normalizeStorageGrantPrefix('photos/')).toBe('photos/')
    expect(normalizeStorageGrantPrefix('//a/b')).toBe('a/b/')
  })
})
