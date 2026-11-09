import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

const execute = promisify(execFile)

it.each([
  [{ filename: 'fixture.tgz' }],
  { filename: 'fixture.tgz' },
  { fixture: { filename: 'fixture.tgz' } },
])('fingerprints the tarball returned by npm pack: %j', async (response) => {
  const root = await mkdtemp(join(tmpdir(), 'sdk-pack-json-'))
  const bin = join(root, 'bin')
  const fixture = join(root, 'fixture')
  const target = join(root, 'target')
  const output = join(root, 'fingerprint.json')
  try {
    await mkdir(bin)
    await mkdir(join(fixture, 'package'), { recursive: true })
    await mkdir(target)
    await writeFile(
      join(fixture, 'package', 'package.json'),
      '{"name":"fixture","version":"1.0.0"}\n',
    )
    await writeFile(join(fixture, 'package', 'README.md'), 'Fixture\n')
    await writeFile(join(target, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n')
    await execute('tar', [
      '-czf',
      join(target, 'fixture.tgz'),
      '-C',
      fixture,
      'package/package.json',
      'package/README.md',
    ])
    // Exercise the public CLI against a deterministic npm response without packing the workspace.
    await writeFile(
      join(bin, 'npm'),
      '#!/usr/bin/env node\nprocess.stdout.write(process.env.PACK_TEST_RESPONSE)\n',
      { mode: 0o755 },
    )
    await execute(
      process.execPath,
      [
        join(import.meta.dirname, 'fingerprint-pack.ts'),
        target,
        '--ignore-scripts',
        '--quiet',
        '--out',
        output,
      ],
      {
        env: {
          ...process.env,
          PATH: `${bin}${delimiter}${process.env.PATH}`,
          PACK_TEST_RESPONSE: JSON.stringify(response),
        },
      },
    )

    const fingerprint: unknown = JSON.parse(await readFile(output, 'utf8'))
    expect(fingerprint).toMatchObject({
      packageJson: { name: 'fixture', version: '1.0.0' },
      files: expect.arrayContaining([
        expect.objectContaining({ path: 'README.md' }),
        expect.objectContaining({ path: 'package.json' }),
      ]),
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
