import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import packageJson from '../../../package.json' with { type: 'json' }
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

const install = vi.hoisted(() => vi.fn())
vi.mock('execa', async (importOriginal) => ({
  ...(await importOriginal<typeof import('execa')>()),
  execa: install,
}))

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'transloadit-init-'))
  process.chdir(directory)
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
  install.mockReset()
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  for (const listener of process.stdout.listeners('error'))
    if (!stdoutListeners.includes(listener)) process.stdout.off('error', listener)
  for (const listener of process.stderr.listeners('error'))
    if (!stderrListeners.includes(listener)) process.stderr.off('error', listener)
  await rm(directory, { recursive: true, force: true })
})

test('creates the shipped source and compatible manifest without credentials or uploads', async () => {
  await main(['init', 'upload-once', 'gallery', '--no-install'])
  expect(process.exitCode).toBeUndefined()
  expect(await readdir('gallery')).toEqual([
    '.gitignore',
    'README.md',
    'demo.ts',
    'package.json',
    'photo.jpg',
  ])
  expect(await readFile('gallery/demo.ts', 'utf8')).toBe(
    await readFile(new URL('../../../examples/upload-once/demo.ts', import.meta.url), 'utf8'),
  )
  expect(await readFile('gallery/photo.jpg')).toEqual(
    await readFile(new URL('../../../examples/fixtures/berkley.jpg', import.meta.url)),
  )
  expect(JSON.parse(await readFile('gallery/package.json', 'utf8'))).toMatchObject({
    private: true,
    type: 'module',
    scripts: { demo: 'node demo.ts' },
    dependencies: {
      '@transloadit/node': packageJson.version,
      execa: packageJson.dependencies.execa,
    },
  })
  expect(await readFile('gallery/.gitignore', 'utf8')).toContain('gallery.html\n')
  expect(install).not.toHaveBeenCalled()
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.stringContaining('npm install'), {
    directory: resolve('gallery'),
    example: 'upload-once',
    installed: false,
  })
})

test('installs without lifecycle scripts and keeps JSON output free of npm progress', async () => {
  install.mockResolvedValue({ failed: false })
  await main(['init', 'upload-once', 'gallery', '--json'])
  expect(process.exitCode).toBeUndefined()
  expect(install).toHaveBeenCalledWith(
    'npm',
    ['install', '--prefix', resolve('gallery'), '--ignore-scripts', '--no-audit', '--no-fund'],
    expect.objectContaining({ cwd: resolve('gallery'), stdout: 'ignore', reject: false }),
  )
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.any(String), {
    directory: resolve('gallery'),
    example: 'upload-once',
    installed: true,
  })
})

test('keeps the scaffold and gives a recovery command when installation fails', async () => {
  install.mockResolvedValue({ failed: true })
  await main(['init', 'upload-once', 'gallery'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('gallery/demo.ts', 'utf8')).toContain('storage')
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('npm install'))
  expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
})

test('installs inside the new example without modifying an ancestor npm workspace', async () => {
  const parent = `${JSON.stringify({ private: true, workspaces: ['gallery'] })}\n`
  await writeFile('package.json', parent)
  const { execa } = await vi.importActual<typeof import('execa')>('execa')
  install.mockImplementation(async (executable, args, options) => {
    // Empty dependencies keep this real npm workspace-selection check offline.
    await writeFile('gallery/package.json', JSON.stringify({ name: 'gallery', private: true }))
    return execa(executable, [...args, '--offline'], options)
  })
  await main(['init', 'upload-once', 'gallery', '--json'])
  expect(process.exitCode).toBeUndefined()
  expect(await readFile('package.json', 'utf8')).toBe(parent)
  await expect(readFile('package-lock.json')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(JSON.parse(await readFile('gallery/package-lock.json', 'utf8')).name).toBe('gallery')
})

test('does not overwrite an existing destination or follow a destination symlink', async () => {
  await writeFile('keep', 'existing work')
  await symlink(directory, 'gallery')
  await main(['init', 'upload-once', 'gallery', '--no-install'])
  expect(process.exitCode).toBe(1)
  expect(await readdir(directory)).toEqual(['gallery', 'keep'])
  expect(await readFile('keep', 'utf8')).toBe('existing work')
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('already exists'))
})

test('rejects unknown recipes before creating any files', async () => {
  await main(['init', '../anything', 'gallery', '--no-install'])
  expect(process.exitCode).toBe(1)
  expect(await readdir(directory)).toEqual([])
})
