import { afterEach, expect, test, vi } from 'vitest'

const { appendFile, readdir, run } = vi.hoisted(() => ({
  appendFile: vi.fn(),
  readdir: vi.fn(),
  run: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({ appendFile, readdir }))
vi.mock('execa', () => ({ execa: run }))

const current = 'a'.repeat(40)
const newer = 'b'.repeat(40)

function workflow(): void {
  vi.stubEnv('GITHUB_OUTPUT', '/workflow-output')
  vi.stubEnv('GITHUB_SHA', current)
  vi.stubEnv('GITHUB_REPOSITORY', 'transloadit/node-sdk')
  vi.stubEnv('GITHUB_REF', 'refs/heads/main')
  readdir.mockResolvedValue(['README.md', 'config.json', 'new-feature.md'])
  run.mockResolvedValueOnce({ stdout: current })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.resetAllMocks()
})

test('an older versioning run cannot overwrite a newer release branch', async () => {
  workflow()
  run.mockResolvedValueOnce({ stdout: newer })
  await import('./release-run.ts')
  expect(appendFile).toHaveBeenCalledWith('/workflow-output', 'proceed=false\n')
})

test('the current main run can update the generated release branch', async () => {
  workflow()
  run.mockResolvedValueOnce({ stdout: current })
  await import('./release-run.ts')
  expect(appendFile).toHaveBeenCalledWith('/workflow-output', 'proceed=true\n')
  expect(run).toHaveBeenLastCalledWith(
    'gh',
    ['api', 'repos/transloadit/node-sdk/git/ref/heads/main', '--jq', '.object.sha'],
    { timeout: 30_000 },
  )
})

test('a publication run proceeds even when main has advanced', async () => {
  workflow()
  readdir.mockResolvedValue(['README.md', 'config.json'])
  await import('./release-run.ts')
  expect(appendFile).toHaveBeenCalledWith('/workflow-output', 'proceed=true\n')
  expect(run).not.toHaveBeenCalled()
})

test('a failed remote-main lookup cannot allow a stale update', async () => {
  workflow()
  run.mockRejectedValueOnce(new Error('GitHub unavailable'))
  await expect(import('./release-run.ts')).rejects.toThrow('GitHub unavailable')
  expect(appendFile).not.toHaveBeenCalled()
})

test('an invalid remote SHA is not treated as a harmless superseded run', async () => {
  workflow()
  run.mockResolvedValueOnce({ stdout: '' })
  await expect(import('./release-run.ts')).rejects.toThrow('main SHA')
  expect(appendFile).not.toHaveBeenCalled()
})

test('a mismatched checkout cannot update the version branch', async () => {
  workflow()
  vi.stubEnv('GITHUB_SHA', newer)
  await expect(import('./release-run.ts')).rejects.toThrow('checkout')
  expect(appendFile).not.toHaveBeenCalled()
})

test('only the main release workflow may update the version branch', async () => {
  workflow()
  vi.stubEnv('GITHUB_REF', 'refs/heads/a-feature')
  await expect(import('./release-run.ts')).rejects.toThrow('main release workflow')
  expect(appendFile).not.toHaveBeenCalled()
})
