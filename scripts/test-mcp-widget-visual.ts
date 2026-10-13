import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { execa } from 'execa'

const usage = `Usage: node scripts/test-mcp-widget-visual.ts [--update] [--states-dir <dir>] [-- <playwright args>]

Runs the MCP result widget's visual and stability specs in the official Playwright image, the
same one CI uses, so screenshots match the committed baselines regardless of local fonts.

  --update            Rewrite every baseline screenshot.
  --states-dir <dir>  Also write each state as a flat PNG, e.g. /tmp/widget-states, plus an
                      index.html that groups them by state.
`

/** A page that shows every screenshot in `dir`, one row per state, for side-by-side review. */
async function writeStatesIndex(dir: string): Promise<void> {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.png')).sort()
  const byState = new Map<string, string[]>()
  for (const file of files) {
    const state = file.split('_')[0] ?? file
    byState.set(state, [...(byState.get(state) ?? []), file])
  }
  const sections = [...byState].map(
    ([state, pngs]) =>
      `<section><h2>${state}</h2><div class=row>\n${pngs
        .map(
          (png) =>
            `<figure><img src="${png}" loading=lazy><figcaption>${png.slice(0, -4)}</figcaption></figure>`,
        )
        .join('\n')}\n</div></section>`,
  )
  const style =
    'body{font:14px system-ui;background:#888;margin:16px}section{margin-bottom:32px}h2{margin:8px 0}.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}figure{margin:0}figcaption{font-size:12px}img{display:block;max-width:100%}'
  await writeFile(
    resolve(dir, 'index.html'),
    `<!doctype html><meta charset=utf-8><title>Widget states</title><style>${style}</style>\n${sections.join('\n')}\n`,
  )
}

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

  // The widget imports @transloadit/node, which the specs load from its built dist.
  await execa('corepack', ['yarn', 'tsc:node'], { cwd: root, stdio: 'inherit' })
  const run = await execa(
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
    { reject: false, stdio: 'inherit' },
  )
  if (statesDir) await writeStatesIndex(statesDir)
  if (run.exitCode !== 0) throw new Error(`Playwright exited with code ${run.exitCode}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
