import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'

import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  assemblyStatusResultSchema,
  isAssemblySysError,
  isAssemblyTerminal,
  isAssemblyTerminalError,
} from '../../src/alphalib/types/assemblyStatus.ts'

describe('assembly status helpers', () => {
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
