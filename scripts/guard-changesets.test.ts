import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { execa } from 'execa'
import { afterEach, expect, test } from 'vitest'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function runGuard(files: Record<string, string>) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'changeset-policy-'))
  directories.push(cwd)
  await mkdir(path.join(cwd, '.changeset'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(cwd, '.changeset', name), content)
  }
  return execa(process.execPath, [path.join(import.meta.dirname, 'guard-changesets.ts')], {
    cwd,
    reject: false,
    timeout: 10_000,
  })
}

function changeset(frontmatter: string, summary: string): string {
  return `---\n${frontmatter}\n---\n\n${summary}\n`
}

test.each([
  "'@transloadit/types': major",
  '"@transloadit/types": major',
  'transloadit: major',
  '"@transloadit/types": "major"',
  "{ '@transloadit/types': major }",
])('rejects a major without its SDK surface annotation: %s', async (frontmatter) => {
  const result = await runGuard({ 'breaking.md': changeset(frontmatter, 'Contract: sync types.') })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('breaking.md')
  expect(result.stderr).toContain('SDK-breaking:')
})

test.each([
  'SDK-breaking:',
  '- SDK-breaking:   ',
  'SDK-breaking:\n\nMigration follows.',
])('rejects an empty SDK-breaking annotation: %s', async (summary) => {
  const result = await runGuard({
    'empty.md': changeset("'@transloadit/types': major", summary),
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('SDK-breaking:')
})

test('requires an SDK-breaking annotation in each major changeset', async () => {
  const result = await runGuard({
    'breaking.md': changeset("'@transloadit/types': major", 'Contract: sync types.'),
    'unrelated.md': changeset("'@transloadit/utils': major", 'SDK-breaking: remove an export.'),
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('breaking.md')
})

test.each([
  'SDK-breaking: remove an export.',
  '- SDK-breaking: require Node 24.',
])('accepts a major naming the SDK surface: %s', async (summary) => {
  const result = await runGuard({
    'sdk.md': changeset("'@transloadit/utils': major", summary),
  })
  expect(result.exitCode).toBe(0)
})

test('accepts contract minors with the required Node release companions', async () => {
  const result = await runGuard({
    'contract.md': changeset(
      "'@transloadit/node': minor\ntransloadit: minor\n'@transloadit/types': minor\n'@transloadit/zod': minor\n'@transloadit/mcp-server': patch",
      'Contract: sync API2.\n\n- Type-breaking: parsed fields may be null; narrow them before use.',
    ),
  })
  expect(result.exitCode).toBe(0)
})

test.each([
  ["'@transloadit/node': patch\ntransloadit: patch", '@transloadit/mcp-server'],
  ["'@transloadit/node': patch\n'@transloadit/mcp-server': patch", 'transloadit'],
])('retains release coupling for %s', async (frontmatter, missingPackage) => {
  const result = await runGuard({ 'coupling.md': changeset(frontmatter, 'Fix the SDK.') })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain(`${missingPackage} is not`)
})

test('ignores README examples and entries that do not release a package', async () => {
  const result = await runGuard({
    'README.md': changeset("'@transloadit/node': major", 'An example, not a release.'),
    'none.md': changeset("'@transloadit/node': none", 'No version bump.'),
  })
  expect(result.exitCode).toBe(0)
})

test('rejects malformed Changesets frontmatter', async () => {
  const result = await runGuard({
    'invalid.md': changeset("'@transloadit/types': breaking", 'Invalid bump.'),
  })
  expect(result.exitCode).toBe(1)
})
