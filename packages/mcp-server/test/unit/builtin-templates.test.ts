import { describe, expect, it } from 'vitest'
import { __test__ } from '../../src/server.ts'

describe('mapBuiltinTemplate', () => {
  it('falls back to id when name is not a builtin slug', () => {
    const result = __test__.mapBuiltinTemplate({
      id: 'builtin/encode-hls-video@0.0.1',
      name: 'Encode HLS',
      description: 'A test template',
      content: {
        steps: {
          ':original': { robot: '/upload/handle' },
        },
      },
    })

    expect(result).toBeDefined()
    expect(result?.slug).toBe('builtin/encode-hls-video@0.0.1')
    expect(result?.version).toBe('0.0.1')
  })
})
