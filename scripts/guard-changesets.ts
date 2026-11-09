import fs from 'node:fs/promises'
import path from 'node:path'

import parseChangeset from '@changesets/parse'

type ParsedChangeset = ReturnType<typeof parseChangeset> & {
  file: string
}

const CHANGESET_DIR = path.join(process.cwd(), '.changeset')
const NODE_PKG = '@transloadit/node'
const MCP_SERVER_PKG = '@transloadit/mcp-server'
const TRANSLOADIT_PKG = 'transloadit'

async function listChangesetFiles(): Promise<string[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(CHANGESET_DIR)
  } catch {
    return []
  }

  return entries
    .filter((name) => name.endsWith('.md'))
    .filter((name) => name.toLowerCase() !== 'readme.md')
    .map((name) => path.join(CHANGESET_DIR, name))
}

async function parseChangesets(files: string[]): Promise<ParsedChangeset[]> {
  const out: ParsedChangeset[] = []
  for (const file of files) {
    const markdown = await fs.readFile(file, 'utf8')
    out.push({ file, ...parseChangeset(markdown) })
  }
  return out
}

function fail(message: string): never {
  // stderr only, so it plays well with JSON-only tools.
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  const files = await listChangesetFiles()
  if (files.length === 0) return

  const changesets = await parseChangesets(files)
  const touched = new Set<string>()
  for (const cs of changesets) {
    const hasMajor = cs.releases.some((release) => release.type === 'major')
    const namesSdkBreak = cs.summary
      .split('\n')
      .some((line) => /^[\t ]*(?:[-*][\t ]+)?SDK-breaking:[\t ]*\S/.test(line))
    if (hasMajor && !namesSdkBreak) {
      fail(
        `Changeset policy violation: ${path.relative(process.cwd(), cs.file)} contains a major release without a nonempty SDK-breaking: line naming the SDK surface it breaks. See CONTRIBUTING.md#versioning-policy for SDK and contract bump rules.`,
      )
    }
    for (const release of cs.releases) {
      if (release.type !== 'none') touched.add(release.name)
    }
  }

  // Coupling policy:
  // If @transloadit/node is being released, also release @transloadit/mcp-server
  // and the published transloadit clone so all three stay in sync.
  const touchesNode = touched.has(NODE_PKG)
  const touchesMcpServer = touched.has(MCP_SERVER_PKG)
  const touchesTransloadit = touched.has(TRANSLOADIT_PKG)

  if (touchesNode && !touchesMcpServer) {
    fail(
      [
        `Changeset policy violation: ${NODE_PKG} is being released, but ${MCP_SERVER_PKG} is not.`,
        '',
        `Add a patch changeset for ${MCP_SERVER_PKG} (even if no code changed) so the published MCP server`,
        'can be tracked as validated against the latest @transloadit/node.',
        '',
        'Example:',
        '  corepack yarn changeset',
        `  (select ${MCP_SERVER_PKG} -> patch)`,
        `  Summary: "chore: release mcp-server alongside @transloadit/node"`,
      ].join('\n'),
    )
  }

  if (touchesNode && !touchesTransloadit) {
    fail(
      [
        `Changeset policy violation: ${NODE_PKG} is being released, but ${TRANSLOADIT_PKG} is not.`,
        '',
        `Add a patch changeset for ${TRANSLOADIT_PKG} so npx users get the same CLI behavior as`,
        `${NODE_PKG} users, including the generated transloadit package clone.`,
        '',
        'Example:',
        '  corepack yarn changeset',
        `  (select ${TRANSLOADIT_PKG} -> patch)`,
        `  Summary: "chore: release transloadit alongside @transloadit/node"`,
      ].join('\n'),
    )
  }
}

await main()
