import { expect, it } from 'vitest'

import { extractFieldNamesFromTemplate } from '../../src/Transloadit.ts'

it('discovers fields when Assembly overrides supply the OCR provider', () => {
  const template = JSON.stringify({
    steps: {
      imported: { robot: '/http/import', url: '${fields.document_url}' },
      extracted: { robot: '/document/extract', use: 'imported', text_method: 'ocr' },
    },
  })

  expect(extractFieldNamesFromTemplate(template)).toEqual([
    {
      fieldName: 'document_url',
      mostCommonExampleValue: 'inputs/prinsengracht.jpg',
      occurrences: [
        {
          stepName: 'imported',
          rName: '/http/import',
          paramName: 'url',
          path: ['imported', 'url'],
          leader: '',
          trailer: '',
          exampleValues: ['inputs/prinsengracht.jpg'],
          requiresDenoEval: false,
          errors: [],
        },
      ],
    },
  ])
})

it.each([
  '{',
  'null',
  '[]',
  '{}',
  '{"steps":null}',
  '{"steps":[]}',
])('returns no fields for malformed Template input: %s', (template) => {
  expect(extractFieldNamesFromTemplate(template)).toEqual([])
})

it('ignores malformed Steps while finding nested fields in partial Steps', () => {
  const template = JSON.stringify({
    steps: {
      missing: null,
      invalid: { robot: 42 },
      imported: { robot: '/http/import', url: ['https://example.com/${fields.path}'] },
      stored: { robot: '/s3/store', credentials: '${fields.credentials}' },
    },
  })

  expect(extractFieldNamesFromTemplate(template).map((field) => field.fieldName)).toEqual([
    'path',
    'credentials',
  ])
})
