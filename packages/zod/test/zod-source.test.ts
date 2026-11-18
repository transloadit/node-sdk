import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

import {
  diffTrees,
  exportV4File,
  forwardFile,
  forwardTree,
  optionalAdapterPath,
  readTree,
  reverseFile,
  reverseTree,
} from '../scripts/zodSource.ts'

const zodRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(zodRoot, 'alphalib')

test('the Zod 3 export converts back into the Zod 4 source byte for byte', async () => {
  const source = await readTree(sourceRoot)
  const adapter = source.get(optionalAdapterPath)
  assert.ok(adapter, `${optionalAdapterPath} must be part of the Zod 4 source`)
  const roundTrip = forwardTree(reverseTree(source), adapter)
  assert.deepEqual(diffTrees(source, roundTrip), [])
})

const roundTrip = (path: string, v3: string): string => {
  const v4 = forwardFile(path, v3)
  assert.equal(reverseFile(path, v4), v3, `${path} must survive the round trip`)
  assert.equal(forwardFile(path, reverseFile(path, v4)), v4)
  return v4
}

test('optional calls keep their layout through the round trip', () => {
  const v3 = [
    "import { z } from 'zod'",
    '',
    'export const schema = z.object({',
    "  inline: z.string().default('x').optional(),",
    '  chained: sampleRateSchema',
    '    .optional()',
    "    .describe('Sample rate'),",
    '  nested: z.string().optional().nullable().optional(),',
    '  multiline: z',
    '    .union([z.string(), z.number()])',
    '    .optional(),',
    '})',
    '',
  ].join('\n')
  const v4 = roundTrip('types/fixture.ts', v3)
  assert.ok(v4.startsWith("import { optionalWithV3Semantics } from '../lib/sdkZodOptional.ts'\n\n"))
  assert.match(v4, /from 'zod\/v4'/)
  const exported = exportV4File('types/fixture.ts', v4)
  assert.match(exported, /chained: optionalWithV3Semantics\(sampleRateSchema\)\n/)
  assert.match(
    exported,
    /nested: optionalWithV3Semantics\(optionalWithV3Semantics\(z\.string\(\)\)\.nullable\(\)\)/,
  )
  assert.match(
    exported,
    /multiline: optionalWithV3Semantics\(z\n {4}\.union\(\[z\.string\(\), z\.number\(\)\]\)\),/,
  )
})

test('records gain Zod 4 keys and keep their Zod 3 form', () => {
  const v3 = [
    "import { z } from 'zod'",
    '',
    'export const a = z.record(z.unknown())',
    'export const b = z.record(z.string(), z.string())',
    'export const c = z.record(z.enum(["x"]), z.number())',
    'export const d = z',
    '  .record(z.record(z.string()))',
    "  .describe('nested')",
    'export const e = z.object({}).passthrough()',
    '',
  ].join('\n')
  const v4 = roundTrip('types/records.ts', v3)
  assert.match(v4, /a = z\.record\(z\.string\(\), z\.unknown\(\)\)/)
  assert.match(v4, /b = z\.record\(\/\* @zod-v3-explicit-key \*\/ z\.string\(\), z\.string\(\)\)/)
  assert.match(v4, /c = z\.record\(z\.enum\(\["x"\]\), z\.number\(\)\)/)
  assert.match(
    v4,
    /d = z\n {2}\.record\(z\.string\(\), z\.record\(z\.string\(\), z\.string\(\)\)\)/,
  )
  assert.match(v4, /e = z\.object\(\{\}\)\.catchall\(z\.unknown\(\)\)/)
  const exported = exportV4File('types/records.ts', v4)
  assert.match(exported, /b = z\.record\(z\.string\(\), z\.string\(\)\)/)
  assert.match(
    exported,
    /d = z\.record\(z\.string\(\), z\.record\(z\.string\(\), z\.string\(\)\)\)/,
  )
  assert.doesNotMatch(exported, /@zod-v3/)
})

test('pinned zod/v3 imports become paired regions', () => {
  const v3 = "import { z } from 'zod/v3'\n\nexport const a = z.string()\n"
  const v4 = roundTrip('helper.ts', v3)
  assert.equal(
    exportV4File('helper.ts', v4),
    "import { z } from 'zod/v4'\n\nexport const a = z.string()\n",
  )
})

test('region patches fail loudly when their anchors or markers are missing', async () => {
  assert.throws(
    () => forwardFile('types/robots/ai-chat.ts', "import { z } from 'zod'\n"),
    /any-zod-object: expected "z\.AnyZodObject"/,
  )
  assert.throws(
    () => forwardFile('lib/zodInputSemantics.ts', "import { z } from 'zod'\n"),
    /case-insensitive-enum: expected anchors are missing/,
  )
  const v4 = await readFile(resolve(sourceRoot, 'types/robots/youtube-store.ts'), 'utf8')
  const withoutV3Region = v4.replace(
    /\/\/ @zod-v3-only-begin youtube-category-type\n[\s\S]*?\/\/ @zod-v3-only-end youtube-category-type\n/,
    '',
  )
  assert.notEqual(withoutV3Region, v4)
  assert.throws(() => reverseFile('types/robots/youtube-store.ts', withoutV3Region), /Zod 3 region/)
  const withoutRegions = exportV4File('types/robots/youtube-store.ts', v4)
  assert.throws(
    () => reverseFile('types/robots/youtube-store.ts', withoutRegions),
    /missing Zod 3\/4 region youtube-category-type/,
  )
})

test('the codemod refuses input it cannot convert losslessly', () => {
  for (const [contents, reason] of [
    ['import { z } from "zod"\n', /double-quoted/],
    ["import { z } from 'zod/v4'\n", /already imports zod\/v4/],
    ["import { z } from 'zod'\nconst a = z.object({}).catchall(z.unknown())\n", /catchall/],
    ["import { z } from 'zod'\nconst a = z.string() /* why */ .optional()\n", /losslessly/],
  ] as const) {
    assert.throws(() => forwardFile('types/fixture.ts', contents), reason)
  }
})
