import { describe, expect, it } from 'vitest'

import { collectResultUrlRows, formatResultUrlRows } from '../../../src/cli/resultUrls.ts'

describe('result url helpers', () => {
  it('prefers ssl_url and falls back to basename/name fields', () => {
    const rows = collectResultUrlRows({
      assemblyId: 'assembly-1',
      results: {
        generated: [
          {
            basename: 'fallback-name.png',
            name: null,
            ssl_url: 'https://secure.example.com/file.png',
            url: 'http://insecure.example.com/file.png',
          },
        ],
      },
    })

    expect(rows).toEqual([
      {
        assemblyId: 'assembly-1',
        step: 'generated',
        name: 'fallback-name.png',
        url: 'https://secure.example.com/file.png',
      },
    ])
  })

  it('formats aligned human-readable tables', () => {
    const table = formatResultUrlRows([
      {
        assemblyId: 'assembly-1',
        step: 'describe',
        name: 'hero.json',
        url: 'https://example.com/hero.json',
      },
    ])

    expect(table).toContain('STEP')
    expect(table).toContain('NAME')
    expect(table).toContain('URL')
    expect(table).toContain('describe')
    expect(table).toContain('hero.json')
  })
})
