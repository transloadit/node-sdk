import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { execa } from 'execa'

const usage = `Usage: node scripts/test-mcp-widget-visual.ts [--update] [--states-dir <dir>] [-- <playwright args>]

Runs the MCP result widget's visual and stability specs in the official Playwright image, the
same one CI uses, so screenshots match the committed baselines regardless of local fonts.

  --update            Rewrite every baseline screenshot.
  --states-dir <dir>  Also write each state as a flat PNG, e.g. /tmp/widget-states.
`

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', default: false },
      update: { type: 'boolean', default: false },
      'states-dir': { type: 'string' },
    },
  })
  if (values.help) {
    process.stdout.write(usage)
    return
  }

  const root = resolve(import.meta.dirname, '..')
  const playwrightPackage: unknown = JSON.parse(
    await readFile(resolve(root, 'node_modules/@playwright/test/package.json'), 'utf8'),
  )
  if (
    typeof playwrightPackage !== 'object' ||
    playwrightPackage === null ||
    !('version' in playwrightPackage) ||
    typeof playwrightPackage.version !== 'string'
  ) {
    throw new Error('Could not read the installed @playwright/test version')
  }
  // Keep in sync with the visual job's container in .github/workflows/ci.yml.
  const image = `mcr.microsoft.com/playwright:v${playwrightPackage.version}-noble`

  const statesDir = values['states-dir'] ? resolve(values['states-dir']) : undefined
  if (statesDir) await mkdir(statesDir, { recursive: true })
  const uid = process.getuid?.()
  const gid = process.getgid?.()

  await execa(
    'docker',
    [
      'run',
      '--rm',
      '--ipc=host',
      ...(uid === undefined || gid === undefined ? [] : ['--user', `${uid}:${gid}`]),
      '--env',
      'HOME=/tmp',
      ...(statesDir
        ? ['--env', 'WIDGET_STATES_DIR=/states', '--volume', `${statesDir}:/states`]
        : []),
      '--volume',
      `${root}:/work`,
      '--workdir',
      '/work/packages/mcp-server',
      image,
      '../../node_modules/.bin/playwright',
      'test',
      ...(values.update ? ['--update-snapshots=all'] : []),
      ...positionals,
    ],
    { stdio: 'inherit' },
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
