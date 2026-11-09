import { describe, expect, it, vi } from 'vitest'

import {
  builtinShortcuts,
  deriveShortcutFieldsSchema,
  validateBuiltinFields,
} from '../../src/builtin-shortcuts.ts'

vi.mock('@transloadit/zod/v4/builtinTemplates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transloadit/zod/v4/builtinTemplates')>()),
  mcpBuiltinTemplateManifest: {
    'builtin/renamed-workflow@0.0.2': { mode: ['blocked'] },
    'builtin/new-workflow@0.0.1': {},
  },
}))

describe('synced MCP Builtin manifest', () => {
  it('reflects additions, renames and removals without another approved-ID registry', () => {
    expect(builtinShortcuts).toEqual([
      {
        id: 'builtin/renamed-workflow@0.0.2',
        name: 'transloadit_renamed_workflow',
        title: 'Renamed workflow',
      },
      {
        id: 'builtin/new-workflow@0.0.1',
        name: 'transloadit_new_workflow',
        title: 'New workflow',
      },
    ])
  })

  it('applies synced exclusions to discovery and execution, including defaults', () => {
    const template = {
      id: 'builtin/renamed-workflow@0.0.2',
      fields_schema: {
        type: 'object',
        properties: { mode: { enum: ['allowed', 'blocked'] } },
      },
      content: { fields: { mode: 'blocked' } },
    }
    expect(deriveShortcutFieldsSchema(template)).toMatchObject({
      properties: { mode: { enum: ['allowed'], not: { enum: ['blocked'] } } },
    })
    expect(() => validateBuiltinFields(template)).toThrow('temporarily unavailable')
    expect(() => validateBuiltinFields({ ...template, fields_schema: null })).toThrow(
      'temporarily unavailable',
    )
    expect(validateBuiltinFields(template, { mode: 'allowed' })).toEqual({ mode: 'allowed' })
  })
})
