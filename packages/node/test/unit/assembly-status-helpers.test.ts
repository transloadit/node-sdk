import { describe, expect, it } from 'vitest'

import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'
import {
  isAssemblySysError,
  isAssemblyTerminal,
  isAssemblyTerminalError,
} from '../../src/alphalib/types/assemblyStatus.ts'

describe('assembly status helpers', () => {
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
