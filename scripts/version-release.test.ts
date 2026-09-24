import { afterEach, assert, expect, test, vi } from 'vitest'

const { run, dirs, append } = vi.hoisted(() => ({
  run: vi.fn(),
  dirs: vi.fn(),
  append: vi.fn(),
}))
vi.mock('execa', () => ({ execa: run }))
vi.mock('node:fs/promises', async (original) => ({
  ...(await original<typeof import('node:fs/promises')>()),
  readdir: dirs,
  appendFile: append,
}))

const main = 'a'.repeat(40)
const previous = 'b'.repeat(40)
const tree = 'c'.repeat(40)
const merged = 'e'.repeat(40)
const base = '1'.repeat(40)
const restored = '2'.repeat(40)
const paths = 'packages/node/package.json\0yarn.lock\0.changeset/release.md\0'
const manifest = JSON.stringify({ name: '@transloadit/node', version: '4.14.0' })

afterEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

function prepare(existing: string | null = previous): object[] {
  vi.stubEnv('GITHUB_REPOSITORY', 'transloadit/node-sdk')
  vi.stubEnv('GITHUB_REF', 'refs/heads/main')
  vi.stubEnv('GITHUB_SHA', main)
  vi.stubEnv('GITHUB_OUTPUT', '/tmp/release-output')
  const payloads: object[] = []
  dirs.mockResolvedValue(['README.md', 'config.json', 'release.md'])
  run.mockImplementation(
    (
      command: string,
      args: string[],
      options?: { input?: string; stripFinalNewline?: boolean },
    ) => {
      const line = `${command} ${args.join(' ')}`
      if (command === 'corepack') return { stdout: '' }
      if (line === 'git status --porcelain') return { stdout: '' }
      if (line === 'git rev-parse HEAD') return { stdout: main }
      if (line === 'git write-tree') return { stdout: tree }
      if (line.startsWith('git merge-base')) return { stdout: base }
      if (line.startsWith('git diff --name-only --no-renames -z')) return { stdout: paths }
      if (line.startsWith('git ls-tree -z'))
        return {
          stdout:
            args.at(-1) === '.changeset/release.md' ? '' : `100644 blob ${main}\t${args.at(-1)}\0`,
        }
      if (line.startsWith('git cat-file blob')) {
        const content = args.at(-1)?.endsWith('package.json') ? manifest : 'new lockfile\n'
        return {
          stdout: Buffer.from(
            options?.stripFinalNewline === false ? content : content.replace(/\n$/, ''),
          ),
        }
      }
      if (line.startsWith('git ')) return { stdout: '' }
      if (command === 'gh' && args[0] === 'api' && args.includes('graphql')) {
        const payload = JSON.parse(options?.input ?? '{}')
        payloads.push(payload)
        if (payload.query.includes('createCommitOnBranch')) return { stdout: restored }
        return { stdout: `${main}:${existing ?? ''}` }
      }
      if (line.startsWith('gh api repos/transloadit/node-sdk/merges'))
        return { stdout: `${merged}:${restored}:${main}:true` }
      if (line.startsWith('gh pr list')) return { stdout: existing ? '509' : '' }
      if (line.startsWith('gh pr ') || line.startsWith('gh api ')) return { stdout: '' }
      throw new Error(`Unexpected command ${line}`)
    },
  )
  return payloads
}

test('release updates append to the existing branch with an exact-head signed API commit', async () => {
  const payloads = prepare()
  await import('./version-release.ts')
  expect(payloads).toContainEqual(
    expect.objectContaining({
      variables: {
        input: expect.objectContaining({
          expectedHeadOid: merged,
          branch: {
            repositoryNameWithOwner: 'transloadit/node-sdk',
            branchName: 'changeset-release/main',
          },
        }),
      },
    }),
  )
  expect(
    run.mock.calls.some(([, args]) => args.includes('--force') || args.includes('DELETE')),
  ).toBe(false)
  expect(
    run.mock.calls.some(
      ([command, args]) =>
        command === 'gh' && args[0] === 'pr' && args[1] === 'edit' && args[2] === '509',
    ),
  ).toBe(true)
  expect(append).toHaveBeenCalledWith('/tmp/release-output', 'has_changesets=true\n')
})

test('the generated tree replaces stale version files and removes consumed changesets', async () => {
  const payloads = prepare()
  await import('./version-release.ts')
  expect(payloads).toContainEqual(
    expect.objectContaining({
      variables: {
        input: expect.objectContaining({
          fileChanges: {
            additions: [
              {
                path: 'packages/node/package.json',
                contents: Buffer.from(manifest).toString('base64'),
              },
              { path: 'yarn.lock', contents: Buffer.from('new lockfile\n').toString('base64') },
            ],
            deletions: [{ path: '.changeset/release.md' }],
          },
        }),
      },
    }),
  )
})

test('a missing release branch is created from main without deleting another branch', async () => {
  const payloads = prepare(null)
  await import('./version-release.ts')
  expect(
    run.mock.calls.some(([, args]) => args.includes('repos/transloadit/node-sdk/git/refs')),
  ).toBe(true)
  expect(payloads).toContainEqual(
    expect.objectContaining({
      variables: { input: expect.objectContaining({ expectedHeadOid: main }) },
    }),
  )
  expect(run.mock.calls.some(([, args]) => args[0] === 'pr' && args[1] === 'create')).toBe(true)
})

test('no pending changesets leaves publication to the existing publisher', async () => {
  prepare()
  dirs.mockResolvedValue(['README.md', 'config.json'])
  await import('./version-release.ts')
  expect(append).toHaveBeenCalledWith('/tmp/release-output', 'has_changesets=false\n')
  expect(run).not.toHaveBeenCalled()
})

test('an outdated checkout cannot update the version branch', async () => {
  prepare()
  vi.stubEnv('GITHUB_SHA', 'd'.repeat(40))
  await expect(import('./version-release.ts')).rejects.toThrow('main')
  expect(run.mock.calls.some(([command]) => command === 'corepack')).toBe(false)
})

test('a refused commit never falls back to a force push or branch recreation', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[2]?.input?.includes('createCommitOnBranch')) throw new Error('head changed')
    return original(...args)
  })
  await expect(import('./version-release.ts')).rejects.toThrow('head changed')
  expect(run.mock.calls.some(([, args]) => args[0] === 'pr')).toBe(false)
  expect(
    run.mock.calls.some(([, args]) => args.includes('--force') || args.includes('DELETE')),
  ).toBe(false)
})

test('a rerun preserves an identical release tree and repairs the PR if needed', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'git' && args[1][0] === 'merge-base') return { stdout: main }
    if (args[0] === 'gh' && args[1].includes('repos/transloadit/node-sdk/merges'))
      return { stdout: '' }
    if (args[0] === 'git' && args[1][0] === 'diff' && args[1].includes(previous))
      return { stdout: '' }
    return original(...args)
  })
  await import('./version-release.ts')
  expect(
    run.mock.calls.some(([, , options]) => options?.input?.includes('createCommitOnBranch')),
  ).toBe(false)
  expect(run.mock.calls.some(([, args]) => args[0] === 'pr' && args[1] === 'edit')).toBe(true)
})

test('main history and its file modes are merged before generated changesets are removed', async () => {
  prepare()
  await import('./version-release.ts')
  const mergeIndex = run.mock.calls.findIndex(([, args]) =>
    args.includes('repos/transloadit/node-sdk/merges'),
  )
  const commitIndex = run.mock.calls.findIndex(([, , options]) =>
    options?.input?.includes('"headline":"Version Packages"'),
  )
  expect(mergeIndex).toBeGreaterThan(-1)
  expect(mergeIndex).toBeLessThan(commitIndex)
  expect(run.mock.calls).toContainEqual([
    'git',
    ['diff', '--name-only', '--no-renames', '-z', merged, tree],
  ])
})

test('unexpected generated source changes stop before any remote write', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'git' && args[1][0] === 'diff' && args[1].includes(main))
      return { stdout: `${paths}src/mistake.ts\0` }
    return original(...args)
  })
  await expect(import('./version-release.ts')).rejects.toThrow('outside package versions')
  expect(
    run.mock.calls.some(([, , options]) => options?.input?.includes('createCommitOnBranch')),
  ).toBe(false)
})

test('changing an executable to a regular file cannot silently retain the executable bit', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'git' && args[1][0] === 'ls-tree' && args[1].includes(merged))
      return { stdout: `100755 blob ${main}\t${args[1].at(-1)}\0` }
    return original(...args)
  })
  await expect(import('./version-release.ts')).rejects.toThrow('file mode')
  expect(
    run.mock.calls.some(([, , options]) =>
      options?.input?.includes('"headline":"Version Packages"'),
    ),
  ).toBe(false)
})

test('a concurrent release edit included by the merge stops before replacing generated files', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'gh' && args[1].includes('repos/transloadit/node-sdk/merges'))
      return { stdout: `${merged}:${'f'.repeat(40)}:${main}:true` }
    return original(...args)
  })
  await expect(import('./version-release.ts')).rejects.toThrow('concurrent')
  expect(
    run.mock.calls.some(([, , options]) =>
      options?.input?.includes('"headline":"Version Packages"'),
    ),
  ).toBe(false)
})

test('a superseded main run exits successfully without versioning or publishing', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[2]?.input?.includes('query {')) return { stdout: `${'d'.repeat(40)}:${previous}` }
    return original(...args)
  })
  await import('./version-release.ts')
  expect(append).toHaveBeenCalledWith('/tmp/release-output', 'has_changesets=true\n')
  expect(run.mock.calls.some(([command]) => command === 'corepack')).toBe(false)
  expect(run.mock.calls.some(([, args]) => args[0] === 'pr')).toBe(false)
})

test('generated conflicts are prevented by restoring the old generated files before merging main', async () => {
  const payloads = prepare()
  const original = run.getMockImplementation()
  assert(original)
  let restoredOldVersions = false
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[2]?.input?.includes('Restore generated files before merging main'))
      restoredOldVersions = true
    if (
      args[0] === 'gh' &&
      args[1].includes('repos/transloadit/node-sdk/merges') &&
      !restoredOldVersions
    )
      throw new Error('Merge conflict (HTTP 409)')
    return original(...args)
  })
  await import('./version-release.ts')
  expect(payloads).toContainEqual(
    expect.objectContaining({
      variables: {
        input: expect.objectContaining({
          expectedHeadOid: previous,
          message: { headline: 'Restore generated files before merging main' },
        }),
      },
    }),
  )
  expect(run.mock.calls).toContainEqual([
    'git',
    ['diff', '--name-only', '--no-renames', '-z', previous, base],
  ])
})

test('release-only source edits stop before restoring generated files or merging main', async () => {
  prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'git' && args[1][0] === 'diff' && args[1].includes(base))
      return { stdout: `${paths}src/handwritten.ts\0` }
    return original(...args)
  })
  await expect(import('./version-release.ts')).rejects.toThrow(
    'release-only edit: src/handwritten.ts',
  )
  expect(
    run.mock.calls.some(([, , options]) => options?.input?.includes('createCommitOnBranch')),
  ).toBe(false)
  expect(
    run.mock.calls.some(([, args]) => args.includes('repos/transloadit/node-sdk/merges')),
  ).toBe(false)
})

test('an already merged main needs only the final signed version commit', async () => {
  const payloads = prepare()
  const original = run.getMockImplementation()
  assert(original)
  run.mockImplementation((...args: Parameters<typeof original>) => {
    if (args[0] === 'git' && args[1][0] === 'merge-base') return { stdout: main }
    if (args[0] === 'gh' && args[1].includes('repos/transloadit/node-sdk/merges'))
      return { stdout: '' }
    return original(...args)
  })
  await import('./version-release.ts')
  expect(payloads).toContainEqual(
    expect.objectContaining({
      variables: {
        input: expect.objectContaining({
          expectedHeadOid: previous,
          message: { headline: 'Version Packages' },
        }),
      },
    }),
  )
  expect(
    run.mock.calls.some(([, , options]) => options?.input?.includes('Restore generated files')),
  ).toBe(false)
})

test('the workflow versions safely and only invokes Changesets publication without pending notes', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  const workflow = await actual.readFile(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8',
  )
  expect(workflow).toContain('node scripts/version-release.ts')
  expect(workflow).toContain("if: steps.version.outputs.has_changesets == 'false'")
  expect(workflow).toContain('cancel-in-progress: false')
  expect(workflow).toContain('queue: max')
})
