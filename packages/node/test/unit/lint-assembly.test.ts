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

  it('keeps top-level fields when fixing invalid steps type', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {
        steps: [],
        fields: {
          user_id: '123',
        },
      },
      fix: true,
    })

    const fixed = JSON.parse(result.fixedInstructions ?? '{}') as {
      fields?: { user_id?: string }
      steps?: unknown
    }

    expect(fixed.fields?.user_id).toBe('123')
    expect(fixed.steps).toEqual({})
  })

  it('warns when no storage robot is used', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {
        ':original': { robot: '/upload/handle' },
        resize: { robot: '/image/resize', use: ':original', width: 100, height: 100 },
      },
    })

    const codes = result.issues.map((issue) => issue.code)
    expect(codes).toContain('no-storage')
  })

  it('hydrates smart-cdn robot errors with the robot name', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {
        steps: {
          ':original': { robot: '/upload/handle' },
          serve: { robot: '/file/serve', use: ':original' },
          hash: { robot: '/file/hash', use: ':original' },
        },
      },
    })

    const issues = result.issues.filter((item) => item.code === 'smart-cdn-robot-not-allowed')
    expect(issues.length).toBeGreaterThan(0)
    for (const issue of issues) {
      if (issue.robot) {
        expect(issue.desc).toContain(issue.robot)
      }
    }
  })
})
