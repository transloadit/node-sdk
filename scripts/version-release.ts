import { appendFile, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { execa } from 'execa'

const repository = 'transloadit/node-sdk'
const branch = 'changeset-release/main'
const shaPattern = /^[a-f0-9]{40}$/

function isVersionFile(path: string): boolean {
  return path === 'yarn.lock' || /^packages\/[^/]+\/(package\.json|CHANGELOG\.md)$/.test(path)
}

async function appendTree(
  parent: string,
  tree: string,
  headline: string,
  isAllowed: (path: string) => boolean,
): Promise<string> {
  const { stdout: changed } = await execa('git', [
    'diff',
    '--name-only',
    '--no-renames',
    '-z',
    parent,
    tree,
  ])
  const additions: { path: string; contents: string }[] = []
  const deletions: { path: string }[] = []
  for (const path of changed.split('\0').filter(Boolean)) {
    if (!isAllowed(path)) throw new Error(`Refusing to overwrite a release-only edit: ${path}`)
    const { stdout: entry } = await execa('git', ['ls-tree', '-z', tree, '--', path])
    if (!entry) {
      deletions.push({ path })
      continue
    }
    // GraphQL writes regular files. Refuse executable/symlink changes instead of losing modes.
    const { stdout: oldEntry } = await execa('git', ['ls-tree', '-z', parent, '--', path])
    if (!entry.startsWith('100644 blob ') || (oldEntry && !oldEntry.startsWith('100644 blob ')))
      throw new Error(`Unsupported release file mode: ${path}`)
    const { stdout: content } = await execa('git', ['cat-file', 'blob', `${tree}:${path}`], {
      encoding: 'buffer',
      stripFinalNewline: false,
    })
    additions.push({ path, contents: Buffer.from(content).toString('base64') })
  }
  if (additions.length + deletions.length === 0) return parent
  const input = JSON.stringify({
    query: `mutation($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) { commit { oid } }
    }`,
    variables: {
      input: {
        branch: { repositoryNameWithOwner: repository, branchName: branch },
        expectedHeadOid: parent,
        message: { headline },
        fileChanges: { additions, deletions },
      },
    },
  })
  if (Buffer.byteLength(input) > 30 * 1024 * 1024)
    throw new Error('Release update exceeds the bounded GitHub API payload size')
  // GitHub signs this append-only commit. Never recover by force-pushing or weakening rules.
  const { stdout: sha } = await execa(
    'gh',
    ['api', 'graphql', '--input', '-', '--jq', '.data.createCommitOnBranch.commit.oid'],
    { input },
  )
  if (!shaPattern.test(sha)) throw new Error('Invalid signed release commit SHA')
  return sha
}

async function main(): Promise<void> {
  const output = process.env.GITHUB_OUTPUT
  if (!output) throw new Error('Run this script in the release workflow')
  const notes = (await readdir('.changeset')).filter(
    (name) => name.endsWith('.md') && name !== 'README.md',
  )
  if (notes.length === 0) {
    await appendFile(output, 'has_changesets=false\n')
    return
  }
  const mainSha = process.env.GITHUB_SHA
  if (
    process.env.GITHUB_REPOSITORY !== repository ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    !mainSha ||
    !shaPattern.test(mainSha)
  ) {
    throw new Error('Only the main release workflow may update the version branch')
  }
  const { stdout: head } = await execa('git', ['rev-parse', 'HEAD'])
  const { stdout: dirty } = await execa('git', ['status', '--porcelain'])
  if (head !== mainSha || dirty) throw new Error('Expected a clean checkout of the main run SHA')

  const { stdout: refs } = await execa(
    'gh',
    [
      'api',
      'graphql',
      '--input',
      '-',
      '--jq',
      '.data.repository | .main.target.oid + ":" + (.release.target.oid // "")',
    ],
    {
      input: JSON.stringify({
        query: `query {
      repository(owner: "transloadit", name: "node-sdk") {
        main: ref(qualifiedName: "refs/heads/main") { target { oid } }
        release: ref(qualifiedName: "refs/heads/${branch}") { target { oid } }
      }
    }`,
      }),
    },
  )
  const [remoteMain, releaseSha] = refs.split(':')
  if (remoteMain !== mainSha) {
    // The newer queued run owns versioning. Do not let this run fall through to publication.
    console.log('Skipping superseded release run; main has advanced')
    await appendFile(output, 'has_changesets=true\n')
    return
  }
  if (releaseSha && !shaPattern.test(releaseSha)) throw new Error('Invalid release branch SHA')
  if (releaseSha) await execa('git', ['fetch', 'origin', `refs/heads/${branch}`])

  await execa('corepack', ['yarn', 'changeset:version:release'], { stdio: 'inherit' })
  const scratch = await mkdtemp(join(tmpdir(), 'transloadit-version-index-'))
  try {
    // Snapshot main + freshly generated versions without changing the checkout's index.
    // Compute versions from main, not from the previous generated version bump.
    const env = { GIT_INDEX_FILE: join(scratch, 'index') }
    await execa('git', ['read-tree', mainSha], { env })
    await execa('git', ['add', '--all'], { env })
    const { stdout: tree } = await execa('git', ['write-tree'], { env })
    const { stdout: generated } = await execa('git', [
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      mainSha,
      tree,
    ])
    const generatedPaths = generated.split('\0').filter(Boolean)
    const isGeneratedPath = (path: string): boolean =>
      isVersionFile(path) || notes.some((note) => path === `.changeset/${note}`)
    if (generatedPaths.some((path) => !isGeneratedPath(path)))
      throw new Error(
        'Versioning changed files outside package versions, changelogs and changesets',
      )
    if (generatedPaths.length === 0)
      throw new Error('Pending changesets produced no release changes')

    let parent = releaseSha || mainSha
    if (releaseSha) {
      const { stdout: base } = await execa('git', ['merge-base', mainSha, releaseSha])
      if (!shaPattern.test(base)) throw new Error('Invalid release merge base')
      if (base !== mainSha) {
        // Only generated deltas may live on this bot branch. Undo them back to their base in
        // a signed append-only commit, so dependency/lockfile/note edits on main cannot conflict.
        // Restoring deleted notes here is safe: the final version commit consumes them again.
        parent = await appendTree(
          releaseSha,
          base,
          'Restore generated files before merging main',
          (path) =>
            isVersionFile(path) ||
            (path !== '.changeset/README.md' && /^\.changeset\/[^/]+\.md$/.test(path)),
        )
      }
      // Main must be an ancestor, not just identical source bytes. Otherwise squash-merging
      // keeps newly added changesets that were absent in the old merge base and versions twice.
      // GitHub's merge also preserves executable/symlink changes from main without copying them
      // through GraphQL's regular-file-only API. Both operations produce verified commits.
      const { stdout: merged } = await execa('gh', [
        'api',
        `repos/${repository}/merges`,
        '--method',
        'POST',
        '-f',
        `base=${branch}`,
        '-f',
        `head=${mainSha}`,
        '-f',
        'commit_message=Merge main before regenerating release versions',
        '--jq',
        '[.sha, .parents[0].sha, .parents[1].sha, .commit.verification.verified] | join(":")',
      ])
      // HTTP 204 means main was already an ancestor. An unexpected first parent means a
      // concurrent edit won the race; retain that edit and let the next run recompute safely.
      if (merged) {
        const [sha, first, second, verified] = merged.split(':')
        if (
          !sha ||
          !shaPattern.test(sha) ||
          verified !== 'true' ||
          (sha !== mainSha && (first !== parent || second !== mainSha))
        ) {
          throw new Error('Refusing an unverified or concurrent release-branch merge')
        }
        parent = sha
        await execa('git', ['fetch', 'origin', parent])
      }
    }
    if (!releaseSha) {
      await execa('gh', [
        'api',
        `repos/${repository}/git/refs`,
        '--method',
        'POST',
        '-f',
        `ref=refs/heads/${branch}`,
        '-f',
        `sha=${mainSha}`,
      ])
    }
    await appendTree(parent, tree, 'Version Packages', isGeneratedPath)
    const { stdout: number } = await execa('gh', [
      'pr',
      'list',
      '--repo',
      repository,
      '--head',
      branch,
      '--base',
      'main',
      '--state',
      'open',
      '--json',
      'number',
      '--jq',
      '.[0].number // empty',
    ])
    const body =
      '## Why\n\nPublish the pending Changesets as reviewed package releases.\n\n' +
      `Generated from main \`${mainSha}\` by \`yarn changeset:version:release\`. ` +
      'See the package manifests and changelogs in Files changed for the release contents.\n\n' +
      'Merging this PR publishes through the existing trusted-publishing workflow. ' +
      'Viewer remains an alpha. Approve any waiting GitHub Actions runs before merging.\n'
    if (number && !/^\d+$/.test(number)) throw new Error('Unexpected release PR number')
    await execa('gh', [
      'pr',
      ...(number ? ['edit', number] : ['create', '--head', branch, '--base', 'main']),
      '--repo',
      repository,
      '--title',
      'Version Packages',
      '--body',
      body,
    ])
    await appendFile(output, 'has_changesets=true\n')
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

await main()
