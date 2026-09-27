import { readFile } from 'node:fs/promises'

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import viewer from '../packages/img/package.json' with { type: 'json' }

const { run, pause } = vi.hoisted(() => ({ run: vi.fn(), pause: vi.fn() }))
vi.mock('execa', () => ({ execa: run }))
vi.mock('node:timers/promises', () => ({ setTimeout: pause }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  pause.mockImplementation((milliseconds: number) => {
    vi.setSystemTime(Date.now() + milliseconds)
    return Promise.resolve()
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
  vi.resetAllMocks()
})

test('the release publishes Viewer to alpha and leaves stable packages to Changesets', async () => {
  run.mockResolvedValue({ exitCode: 0, stdout: JSON.stringify(viewer.version) })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  await import('./publish-release.ts')
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
    ['npm', ['view', `${viewer.name}@${viewer.version}`, 'version', '--json']],
    ['npm', ['publish', './packages/img', '--access', 'public', '--tag', 'alpha']],
    ['npm', ['view', `${viewer.name}@${viewer.version}`, 'version', '--json']],
    // Only the following tag command may announce tags to changesets/action; duplicate
    // announcements make it try to create each stable GitHub release twice.
    ['corepack', ['yarn', 'changeset', 'publish', '--no-git-tag']],
    ['corepack', ['yarn', 'changeset', 'tag']],
  ])
})

test('accepted publication waits for registry visibility before Changesets can publish', async () => {
  run.mockResolvedValue({ exitCode: 0, stdout: JSON.stringify(viewer.version) })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockResolvedValueOnce({ exitCode: 0 })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })

  await import('./publish-release.ts')

  expect(run.mock.calls.map(([, args]) => args[0])).toEqual([
    'view',
    'publish',
    'view',
    'view',
    'view',
    'yarn',
    'yarn',
  ])
  expect(pause.mock.calls).toEqual([[5_000], [5_000]])
  expect(run).toHaveBeenNthCalledWith(
    3,
    'npm',
    ['view', `${viewer.name}@${viewer.version}`, 'version', '--json'],
    expect.objectContaining({
      timeout: 30_000,
      env: { NPM_CONFIG_PREFER_ONLINE: 'true' },
    }),
  )
})

test('persistent registry invisibility stops after ten minutes without a second publish', async () => {
  run.mockResolvedValue({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockResolvedValueOnce({ exitCode: 0 })

  await expect(import('./publish-release.ts')).rejects.toThrow('not visible')

  expect(Date.now()).toBe(10 * 60_000)
  expect(run.mock.calls.filter(([, args]) => args[0] === 'publish')).toHaveLength(1)
  expect(run.mock.calls.some(([command]) => command === 'corepack')).toBe(false)
})

test('a registry failure after publication is not retried as a metadata delay', async () => {
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E404' })
  run.mockResolvedValueOnce({ exitCode: 0 })
  run.mockResolvedValueOnce({ exitCode: 1, stderr: 'npm error code E503' })

  await expect(import('./publish-release.ts')).rejects.toThrow('lookup')

  expect(run).toHaveBeenCalledTimes(3)
  expect(pause).not.toHaveBeenCalled()
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
  expect(workflow).toContain('version: corepack yarn changeset:version:release')
  expect(workflow).toContain('commitMode: github-api')
  expect(workflow).toContain('run: node scripts/release-run.ts')
  expect(workflow).toContain("if: steps.release_state.outputs.proceed == 'true'")
  expect(workflow).not.toContain('node scripts/version-release.ts')
  expect(workflow).not.toContain('steps.version.outputs.has_changesets')
  expect(workflow).toContain('queue: max')
})

test('release guidance no longer describes the retired append-only updater', async () => {
  const guide = await readFile(new URL('../CONTRIBUTING.md', import.meta.url), 'utf8')
  expect(guide).not.toContain('The version PR updater restores old generated files')
  expect(guide).not.toContain('blocks\nnon-fast-forward updates')
  expect(guide).toContain('superseded run with changesets skips versioning')
})
