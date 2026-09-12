import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'

import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  assemblyStatusResultSchema,
  assemblyStatusSchema,
  isAssemblySysError,
  isAssemblyTerminal,
  isAssemblyTerminalError,
} from '../../src/alphalib/types/assemblyStatus.ts'

describe('assembly status helpers', () => {
  it.each([
    'TRANSLOADIT_IMPORT_ACCESS_DENIED',
    'TRANSLOADIT_IMPORT_FAILURE',
    'TRANSLOADIT_IMPORT_NOT_FOUND',
    'TRANSLOADIT_IMPORT_VALIDATION',
    'TRANSLOADIT_STORE_CONFLICT',
    'TRANSLOADIT_STORE_FAILURE',
    'TRANSLOADIT_STORE_UNAVAILABLE',
    'TRANSLOADIT_STORE_VALIDATION',
  ])('validates %s as a terminal Storage error', (error) => {
    const status = assemblyStatusSchema.parse({ error, assembly_id: 'storage-error' })
    expect(status.error).toBe(error)
    expect(isAssemblyTerminalError(status)).toBe(true)
    expect(isAssemblyTerminal(status)).toBe(true)
  })

  it('types and validates Storage asset IDs instead of passing through arbitrary values', () => {
    const result = assemblyStatusResultSchema.parse({ asset_id: 'JN6OawlqFmL419U23jUKcg' })
    expect(result.asset_id).toBe('JN6OawlqFmL419U23jUKcg')
    expectTypeOf(result.asset_id).toEqualTypeOf<string | undefined>()
    expect(assemblyStatusResultSchema.safeParse({ asset_id: 123 }).success).toBe(false)
  })
  it('treats system error shapes as terminal errors', () => {
    const sysError = {
      errno: -2,
      code: 'ENOENT',
      syscall: 'stat',
      path: '/tmp/missing',
    } as AssemblyStatus

    expect(isAssemblySysError(sysError)).toBe(true)
    expect(isAssemblyTerminalError(sysError)).toBe(true)
    expect(isAssemblyTerminal(sysError)).toBe(true)
  })
})
