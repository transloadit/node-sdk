import { expect, test } from 'vitest'

import { validateStoragePath, validateStoragePathPrefix } from '../src/index.ts'

test.each([
  '',
  'website/',
  'nested/Café/',
  'literal/%2e/',
])('accepts the explicit directory policy %j', (prefix) => {
  expect(() => validateStoragePathPrefix(prefix, 0)).not.toThrow()
})

test.each([
  ' website/',
  'website/ ',
  '/website/',
  'website',
  'a//',
  'a/../',
  'cafe\u0301/',
])('rejects ambiguous directory policy %j at every integration boundary', (prefix) => {
  expect(() => validateStoragePathPrefix(prefix, 2, 'prefix')).toThrow('prefix[2]')
})

test('keeps an explicit root prefix distinct from an empty object path', () => {
  expect(() => validateStoragePathPrefix('', 0)).not.toThrow()
  expect(() => validateStoragePath('')).toThrow('non-empty relative strings')
  expect(() => validateStoragePath('hero.jpg')).not.toThrow()
})
