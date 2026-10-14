import { execFile } from 'node:child_process'
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { syncRobotIndex } from './sync-robot-index.ts'

const execFileAsync = promisify(execFile)

it('regenerates when the formatter installation has only a Windows command shim', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'robot-index-shim-'))
  try {
    const scripts = join(directory, 'scripts')
    const modules = join(directory, 'node_modules')
    const robots = join(directory, 'packages/node/src/alphalib/types/robots')
    await mkdir(scripts, { recursive: true })
    await mkdir(join(modules, '.bin'), { recursive: true })
    await cp(new URL('../packages/node/src/alphalib/types/robots/', import.meta.url), robots, {
      recursive: true,
    })
    await copyFile(
      new URL('./sync-robot-index.ts', import.meta.url),
      join(scripts, 'sync-robot-index.ts'),
    )
    await symlink(
      new URL('../node_modules/typescript', import.meta.url),
      join(modules, 'typescript'),
      'junction',
    )
    await symlink(
      new URL('../node_modules/@biomejs', import.meta.url),
      join(modules, '@biomejs'),
      'junction',
    )
    await writeFile(join(modules, '.bin/biome.cmd'), '@echo off\r\nexit /b 1\r\n')
    const index = await readFile(join(robots, '_index.ts'), 'utf8')
    await writeFile(
      join(robots, '_index.ts'),
      index.replaceAll('documentExtractMeta', 'obsoleteDocumentExtractMeta'),
    )

    await execFileAsync(process.execPath, [await realpath(join(scripts, 'sync-robot-index.ts'))])
    expect(await readFile(join(robots, '_index.ts'), 'utf8')).toContain('  documentExtractMeta,')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

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
