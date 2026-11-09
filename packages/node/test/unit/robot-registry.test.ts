import { readdir } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { robotsMeta, robotsSchema } from '../../src/alphalib/types/robots/_index.ts'

describe('Robot registry', () => {
  it('registers every public alphalib Robot file in robotsMeta', async () => {
    const files = await readdir(new URL('../../src/alphalib/types/robots/', import.meta.url))
    // These instruction-only or runtime-only Robots are also absent from API2’s public registry.
    const hiddenRobots = [
      'assembly-savejson.ts',
      'file-watermark.ts',
      'meta-read.ts',
      'progress-simulate.ts',
    ]
    const expectedKeys = files
      .filter(
        (file) =>
          file.endsWith('.ts') &&
          !file.startsWith('_') &&
          !file.endsWith('.test.ts') &&
          !hiddenRobots.includes(file),
      )
      .map(
        (file) =>
          `${file.slice(0, -3).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}Meta`,
      )
      .sort()

    expect(Object.keys(robotsMeta).sort()).toEqual(expectedKeys)
  })

  it('accepts document extraction in the public instruction union', () => {
    expect(robotsSchema.parse({ robot: '/document/extract', use: ':original' })).toMatchObject({
      robot: '/document/extract',
      extract: ['text', 'images'],
      text_method: 'native',
    })
  })
})
