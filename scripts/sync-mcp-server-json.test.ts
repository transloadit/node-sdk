import { execFile } from 'node:child_process'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const script = new URL('./sync-mcp-server-json.ts', import.meta.url)
const packageDir = new URL('../packages/mcp-server/', import.meta.url)

it('carries the package version into server.json without reformatting it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-server-json-'))
  try {
    await copyFile(new URL('server.json', packageDir), join(directory, 'server.json'))
    const packageJson = await readFile(new URL('package.json', packageDir), 'utf8')
    const { version } = JSON.parse(packageJson)
    await writeFile(
      join(directory, 'package.json'),
      packageJson.replace(`"version": "${version}"`, '"version": "9.8.7"'),
    )
    const before = await readFile(join(directory, 'server.json'), 'utf8')

    await execFileAsync(process.execPath, [script.pathname, directory])

    expect(await readFile(join(directory, 'server.json'), 'utf8')).toBe(
      before.replaceAll(`"version": "${version}"`, '"version": "9.8.7"'),
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
