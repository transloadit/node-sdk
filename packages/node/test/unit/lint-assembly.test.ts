import { describe, expect, it } from 'vitest'
import { lintAssemblyInstructions } from '../../src/lintAssemblyInstructions.ts'

describe('lintAssemblyInstructions', () => {
  it('wraps steps-only input and respects fatal level', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {},
    })

    const codes = result.issues.map((issue) => issue.code)
    expect(codes).toContain('empty-steps')
    expect(codes).not.toContain('missing-steps')
    expect(result.success).toBe(true)

    const fatalResult = await lintAssemblyInstructions({
      assemblyInstructions: {},
      fatal: 'warning',
    })
    expect(fatalResult.success).toBe(false)
  })

  it('throws when template forbids steps override', async () => {
    await expect(
      lintAssemblyInstructions({
        assemblyInstructions: {
          resize: {
            robot: '/image/resize',
            use: ':original',
          },
        },
        template: {
          allow_steps_override: false,
          steps: {
            store: {
              robot: '/s3/store',
              use: ':original',
            },
          },
        },
      }),
    ).rejects.toThrow('TEMPLATE_DENIES_STEPS_OVERRIDE')
  })
})
