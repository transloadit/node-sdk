import { describe, expect, it } from 'vitest'

import { lintAssemblyInstructions } from '../../src/lintAssemblyInstructions.ts'

describe('lintAssemblyInstructions', () => {
  it.each([
    'resize',
    ['resize'],
    [{ name: 'resize' }],
    { steps: 'resize' },
    { steps: ['resize'] },
    { steps: [{ name: 'resize' }] },
  ])('does not create a cycle when fixing input before a dependent metadata request %j', async (use) => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: JSON.stringify({
        steps: {
          resize: { robot: '/image/resize' },
          request: {
            robot: '/http/request',
            url: 'https://example.com/hook',
            payload: 'metadata',
            use,
          },
          imported: { robot: '/http/import', url: 'https://example.com/image.png' },
          stored: { robot: '/transloadit/store', use: 'request' },
        },
      }),
      fix: true,
    })
    expect(result.fixedInstructions).toBeDefined()
    expect(JSON.parse(result.fixedInstructions ?? '{}')).toMatchObject({
      steps: { resize: { use: 'imported' }, request: { use } },
    })
    expect(result.issues.filter((issue) => issue.type === 'error')).toEqual([])
  })

  describe.each([undefined, 'none', 'metadata'])('/http/request payload %s', (payload) => {
    it.each([undefined, [], { steps: [] }])('accepts an empty input %j', async (use) => {
      const result = await lintAssemblyInstructions({
        assemblyInstructions: {
          steps: {
            request: {
              robot: '/http/request',
              url: 'https://example.com/hook',
              ...(payload === undefined ? {} : { payload }),
              ...(use === undefined ? {} : { use }),
            },
            stored: { robot: '/transloadit/store', use: 'request' },
          },
        },
        fatal: 'warning',
      })
      expect(result.issues).toEqual([])
      expect(result.success).toBe(true)
    })
  })

  describe.each(['file', 'files', '${fields.payload}'])('/http/request payload %s', (payload) => {
    it.each([
      { use: undefined, code: 'missing-use' },
      { use: [], code: 'empty-use-array' },
      { use: { steps: [] }, code: 'empty-use-array' },
    ])('requires input for $code', async ({ use, code }) => {
      const result = await lintAssemblyInstructions({
        assemblyInstructions: {
          steps: {
            request: {
              robot: '/http/request',
              url: 'https://example.com/hook',
              payload,
              ...(use === undefined ? {} : { use }),
            },
            stored: { robot: '/transloadit/store', use: 'request' },
          },
        },
      })
      expect(result.success).toBe(false)
      expect(result.issues.map((issue) => issue.code).sort()).toEqual(
        [code, 'missing-input'].sort(),
      )
    })

    it('accepts referenced files', async () => {
      const result = await lintAssemblyInstructions({
        assemblyInstructions: {
          steps: {
            imported: { robot: '/http/import', url: 'https://example.com/input.jpg' },
            request: {
              robot: '/http/request',
              url: 'https://example.com/hook',
              payload,
              use: 'imported',
            },
            stored: { robot: '/transloadit/store', use: 'request' },
          },
        },
        fatal: 'warning',
      })
      expect(result.issues).toEqual([])
      expect(result.success).toBe(true)
    })
  })

  it('accepts recursive Storage folder imports from the canonical Robot schema', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {
        steps: {
          imported: { robot: '/transloadit/import', path: 'photos/', recursive: true },
          stored: { robot: '/transloadit/store', use: 'imported', path: 'copies/${file.url_name}' },
        },
      },
    })
    expect(result.success, JSON.stringify(result.issues)).toBe(true)
    expect(result.issues.filter((issue) => issue.type === 'error')).toEqual([])
  })

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

  it('flags undefined steps in use object string form', async () => {
    const result = await lintAssemblyInstructions({
      assemblyInstructions: {
        ':original': { robot: '/upload/handle' },
        resize: {
          robot: '/image/resize',
          use: { steps: 'missing' },
          width: 100,
          height: 100,
        },
      },
    })

    const codes = result.issues.map((issue) => issue.code)
    expect(codes).toContain('undefined-step')
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
