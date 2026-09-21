import type { Options } from 'execa'

import { execa } from 'execa'

import viewer from '../packages/img/package.json' with { type: 'json' }

async function main(): Promise<void> {
  const cwd = new URL('..', import.meta.url)
  const options = { cwd, stdio: 'inherit' } satisfies Options
  const published = await execa(
    'npm',
    ['view', `${viewer.name}@${viewer.version}`, 'version', '--json'],
    { cwd, reject: false },
  )

  if (published.exitCode === 0) {
    if (JSON.parse(published.stdout) !== viewer.version) {
      throw new Error('Unexpected Viewer registry lookup response; refusing to publish')
    }
  } else if (/^npm (error|ERR!) code E404$/m.test(published.stderr)) {
    // Changesets hardcodes --tag latest, overriding publishConfig.tag. Publish this one alpha
    // first; Changesets then discovers it as already published and handles the stable packages.
    await execa(
      'npm',
      ['publish', './packages/img', '--access', 'public', '--tag', 'alpha'],
      options,
    )
  } else {
    throw new Error('Viewer registry lookup failed; refusing to treat a network/auth error as E404')
  }

  await execa('corepack', ['yarn', 'changeset', 'publish'], options)
  // Include the alpha in Changesets' normal tag output so its action creates the release too.
  await execa('corepack', ['yarn', 'changeset', 'tag'], options)
}

await main()
