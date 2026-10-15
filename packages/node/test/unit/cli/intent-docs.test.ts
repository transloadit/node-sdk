import { describe, expect, it } from 'vitest'

import { renderIntentDocsBody } from '../../../src/cli/generateIntentDocs.ts'
import { resolveIntentCommandDefinitions } from '../../../src/cli/intentCommands.ts'

describe('intent docs generation', () => {
  it('keeps speech language hints and the non-translation caveat visible', () => {
    const markdown = renderIntentDocsBody({
      definitions: resolveIntentCommandDefinitions().filter(
        (definition) => definition.paths.join(' ') === 'speech transcribe',
      ),
      headingLevel: 2,
    })

    expect(markdown).toContain('Despite its name, this parameter does not translate speech.')
    expect(markdown).toContain('full lowercase English language name')
    expect(markdown).toContain(
      'For the `"aws"` and `"gcp"` providers, use `source_language` instead.',
    )
  })

  it('renders image generate usage without implying required input files', () => {
    const markdown = renderIntentDocsBody({
      definitions: resolveIntentCommandDefinitions(),
      headingLevel: 2,
    })

    expect(markdown).toContain(
      'npx transloadit image generate [--input <path|dir|url|->] [options]',
    )
    expect(markdown).not.toContain(
      'npx transloadit image generate --input <path|dir|url|-> [options]',
    )
  })

  it('includes the multi-input image generate example', () => {
    const markdown = renderIntentDocsBody({
      definitions: resolveIntentCommandDefinitions(),
      headingLevel: 2,
    })

    expect(markdown).toContain(
      'transloadit image generate --input person1.jpg --input person2.jpg --input background.jpg --prompt "Place person1.jpg feeding person2.jpg in front of background.jpg" --output output.png',
    )
  })
})
