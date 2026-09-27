import type { Options } from 'execa'

import { setTimeout } from 'node:timers/promises'

import { execa } from 'execa'

import viewer from '../packages/img/package.json' with { type: 'json' }

const cwd = new URL('..', import.meta.url)

async function viewerIsPublished(timeout: number): Promise<boolean> {
  const published = await execa(
    'npm',
    ['view', `${viewer.name}@${viewer.version}`, 'version', '--json'],
    { cwd, reject: false, timeout, env: { NPM_CONFIG_PREFER_ONLINE: 'true' } },
  )

  if (published.exitCode === 0) {
    if (JSON.parse(published.stdout) !== viewer.version) {
      throw new Error('Unexpected Viewer registry lookup response; refusing to publish')
    }
    return true
  }
  if (/^npm (error|ERR!) code E404$/m.test(published.stderr)) return false
  throw new Error('Viewer registry lookup failed; refusing to treat a network/auth error as E404')
}

async function waitForViewer(): Promise<void> {
  const deadline = Date.now() + 10 * 60_000
  for (;;) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      throw new Error(
        'Viewer publication was accepted but is not visible after ten minutes; check npm before retrying',
      )
    }
    if (await viewerIsPublished(Math.min(30_000, remaining))) return
    await setTimeout(Math.min(5_000, Math.max(0, deadline - Date.now())))
  }
}

async function main(): Promise<void> {
  const options = { cwd, stdio: 'inherit' } satisfies Options
  if (!(await viewerIsPublished(30_000))) {
    // Changesets hardcodes --tag latest, overriding publishConfig.tag. Publish this one alpha
    // first; Changesets then discovers it as already published and handles the stable packages.
    await execa(
      'npm',
      ['publish', './packages/img', '--access', 'public', '--tag', 'alpha'],
      options,
    )
    // npm can accept the tarball before its package metadata is updated. Changesets reads that
    // same metadata; handing over early would make it republish Viewer with its default tag.
    await waitForViewer()
  }

  // Emit each tag only once: changesets/action turns every announcement into a GitHub release.
  // The separate tag pass also includes Viewer, which was already published with its alpha tag.
  await execa('corepack', ['yarn', 'changeset', 'publish', '--no-git-tag'], options)
  await execa('corepack', ['yarn', 'changeset', 'tag'], options)
}

await main()
