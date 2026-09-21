import { readFile } from 'node:fs/promises'

import { afterEach, expect, test, vi } from 'vitest'

import viewer from '../packages/img/package.json' with { type: 'json' }

const { run } = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('execa', () => ({ execa: run }))

afterEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
})

test('the release publishes Viewer to alpha and leaves stable packages to Changesets', async () => {
  run.mockResolvedValue({ exitCode: 0 })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  await import('./publish-release.ts')
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
    ['npm', ['view', `${viewer.name}@${viewer.version}`, 'version', '--json']],
    ['npm', ['publish', './packages/img', '--access', 'public', '--tag', 'alpha']],
    // Only the following tag command may announce tags to changesets/action; duplicate
    // announcements make it try to create each stable GitHub release twice.
    ['corepack', ['yarn', 'changeset', 'publish', '--no-git-tag']],
    ['corepack', ['yarn', 'changeset', 'tag']],
  ])
})

test('an already published Viewer is not republished on a release retry', async () => {
  run.mockResolvedValue({ exitCode: 0 })
  run.mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify(viewer.version) })
  await import('./publish-release.ts')
  expect(run.mock.calls.map(([, args]) => args[0])).toEqual(['view', 'yarn', 'yarn'])
})

test('a failed registry lookup is not mistaken for an unpublished package', async () => {
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E503' })
  await expect(import('./publish-release.ts')).rejects.toThrow('lookup')
  expect(run).toHaveBeenCalledTimes(1)
})

test('an unexpected registry response stops publication', async () => {
  run.mockResolvedValueOnce({ exitCode: 0, stdout: '"another-version"' })
  await expect(import('./publish-release.ts')).rejects.toThrow('lookup')
  expect(run).toHaveBeenCalledTimes(1)
})

test('a failed Viewer publish stops before the stable release and tags', async () => {
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockRejectedValueOnce(new Error('publish refused'))
  await expect(import('./publish-release.ts')).rejects.toThrow('publish refused')
  expect(run).toHaveBeenCalledTimes(2)
})

test('a failed stable release does not announce tags for unpublished packages', async () => {
  run.mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify(viewer.version) })
  run.mockRejectedValueOnce(new Error('stable publish refused'))
  await expect(import('./publish-release.ts')).rejects.toThrow('stable publish refused')
  expect(run).toHaveBeenCalledTimes(2)
})

test('Viewer prepack never recursively deletes artifacts used by another publisher', () => {
  expect(viewer.scripts.build).not.toContain('--clean')
})

test('the release workflow uses the package-aware Changesets publisher', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8',
  )
  expect(workflow).toContain('publish: corepack yarn release:publish')
})
