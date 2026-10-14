import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { syncRobotIndex } from './sync-robot-index.ts'

it('registers a newly synced Robot and regenerates the same index twice', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'robot-index-'))
  try {
    await cp(new URL('../packages/node/src/alphalib/types/robots/', import.meta.url), directory, {
      recursive: true,
    })
    const documentExtract = await readFile(join(directory, 'document-extract.ts'), 'utf8')
    await writeFile(
      join(directory, 'test-transcode.ts'),
      documentExtract
        .replaceAll('DocumentExtract', 'TestTranscode')
        .replaceAll('/document/extract', '/test/transcode'),
    )

    await syncRobotIndex(directory)
    const first = await readFile(join(directory, '_index.ts'), 'utf8')
    expect(first).toContain('meta as testTranscodeMeta')
    expect(first).toContain('  interpolatableRobotTestTranscodeInstructionsSchema,')
    expect(first).toContain('  interpolatableRobotTestTranscodeInstructionsWithHiddenFieldsSchema,')
    expect(first).toContain('  testTranscodeMeta,')
    expect(first).toContain('  InterpolatableRobotTestTranscodeInstructionsInput,')

    await syncRobotIndex(directory)
    expect(await readFile(join(directory, '_index.ts'), 'utf8')).toBe(first)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
