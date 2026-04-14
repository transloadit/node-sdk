import fs from 'node:fs/promises'
import path from 'node:path'

type BumpType = 'major' | 'minor' | 'patch'

type ParsedChangeset = {
  file: string
  packages: Set<string>
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

function parseFrontmatterPackages(markdown: string): Set<string> {
  // Changesets frontmatter is YAML-ish and looks like:
  // ---
  // "@transloadit/node": patch
  // "@transloadit/mcp-server": patch
  // ---
  const first = markdown.indexOf('---')
  if (first === -1) return new Set()
  const second = markdown.indexOf('---', first + 3)
  if (second === -1) return new Set()

  const frontmatter = markdown.slice(first + 3, second)
  const pkgs = new Set<string>()
  const re = /["']([^"']+)["']\s*:\s*(major|minor|patch)\b/g

  for (const match of frontmatter.matchAll(re)) {
    const pkg = match[1]
    const bump = match[2] as BumpType
    if (pkg && bump) pkgs.add(pkg)
  }
  return pkgs
}

async function parseChangesets(files: string[]): Promise<ParsedChangeset[]> {
  const out: ParsedChangeset[] = []
  for (const file of files) {
    const markdown = await fs.readFile(file, 'utf8')
    out.push({ file, packages: parseFrontmatterPackages(markdown) })
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
    for (const pkg of cs.packages) touched.add(pkg)
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
