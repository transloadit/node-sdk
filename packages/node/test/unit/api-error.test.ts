import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { ApiError } from '../../src/Transloadit.ts'

describe('ApiError public compatibility', () => {
  it('compiles longstanding string reason consumers through the public SDK entry point', () => {
    const program = ts.createProgram(
      [
        fileURLToPath(new URL('../type-consumers/api-error.ts', import.meta.url)),
        fileURLToPath(new URL('../../src/alphalib/typings/json-to-ast.d.ts', import.meta.url)),
      ],
      {
        allowImportingTsExtensions: true,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
        types: ['node'],
      },
    )
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      }),
    ).toBe('')
  })

  it('preserves string reasons and their existing string methods', () => {
    const error = new ApiError({ body: { reason: 'upstream timeout' } })
    expect(error.reason?.includes('timeout')).toBe(true)
    expect(error.rawReason).toBe('upstream timeout')
  })

  it.each([
    undefined,
    null,
    12,
    false,
    ['detail', { code: 12 }],
    { message: 'opaque detail' },
  ])('keeps non-string reason %j accessible without stringifying it', (reason) => {
    const error = new ApiError({ body: { reason } })
    expect(error.reason).toBeUndefined()
    expect(error.reason?.includes('timeout')).toBeUndefined()
    expect(error.rawReason).toBe(reason)
    expect(error.message).toBe('API error')
  })
})
