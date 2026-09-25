import { appendFile, readdir } from 'node:fs/promises'

import { execa } from 'execa'

async function main(): Promise<void> {
  const output = process.env.GITHUB_OUTPUT
  if (!output) throw new Error('Run this script in the release workflow')
  const notes = (await readdir('.changeset')).filter(
    (name) => name.endsWith('.md') && name !== 'README.md',
  )
  // A merged version PR must still publish its versions even if a feature merge is queued next.
  if (notes.length === 0) {
    await appendFile(output, 'proceed=true\n')
    return
  }
  const sha = process.env.GITHUB_SHA
  const shaPattern = /^[a-f0-9]{40}$/
  if (
    process.env.GITHUB_REPOSITORY !== 'transloadit/node-sdk' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    !sha ||
    !shaPattern.test(sha)
  ) {
    throw new Error('Only the main release workflow may update the version branch')
  }
  const { stdout: head } = await execa('git', ['rev-parse', 'HEAD'])
  if (head !== sha) throw new Error('Expected a checkout of the main run SHA')
  const { stdout: latest } = await execa(
    'gh',
    ['api', 'repos/transloadit/node-sdk/git/ref/heads/main', '--jq', '.object.sha'],
    { timeout: 30_000 },
  )
  if (!shaPattern.test(latest)) throw new Error('Invalid remote main SHA')
  // FIFO ordering does not make an explicitly rerun old workflow current again.
  await appendFile(output, `proceed=${latest === sha}\n`)
}

await main()
