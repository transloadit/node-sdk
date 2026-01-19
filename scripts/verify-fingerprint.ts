import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

interface FingerprintEntry {
  path: string
  sizeBytes: number
  sha256: string
}

interface Fingerprint {
  files: FingerprintEntry[]
}

interface ParsedArgs {
  baseline: string
  current: string
  allow: Set<string>
  baselinePackageJson: string | null
  currentPackageJson: string | null
}

const usage = (): void => {
  console.log(`Usage: node scripts/verify-fingerprint.ts [options]

Options:
  --baseline <file>             Baseline fingerprint JSON (default: docs/fingerprint/transloadit-baseline.json)
  --current <file>              Current fingerprint JSON (required)
  --allow <path>                Allow drift for this file path (repeatable)
  --baseline-package-json <file> Baseline package.json (for diff output)
  --current-package-json <file>  Current package.json (for diff output)
  -h, --help                    Show help
`)
}

const parseArgs = (): ParsedArgs => {
  const args = process.argv.slice(2)
  let baseline = 'docs/fingerprint/transloadit-baseline.json'
  let current = ''
  const allow = new Set<string>()
  let baselinePackageJson: string | null = null
  let currentPackageJson: string | null = null

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-h' || arg === '--help') {
      usage()
      process.exit(0)
    }
    if (arg === '--baseline') {
      baseline = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--current') {
      current = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--allow') {
      allow.add(args[i + 1])
      i += 1
      continue
    }
    if (arg === '--baseline-package-json') {
      baselinePackageJson = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--current-package-json') {
      currentPackageJson = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }
    throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!current) {
    usage()
    throw new Error('Missing required --current')
  }

  return { baseline, current, allow, baselinePackageJson, currentPackageJson }
}

const readFingerprint = async (filePath: string): Promise<Fingerprint> => {
  const raw = await readFile(resolve(filePath), 'utf8')
  return JSON.parse(raw) as Fingerprint
}

const indexByPath = (entries: FingerprintEntry[]): Map<string, FingerprintEntry> => {
  const map = new Map<string, FingerprintEntry>()
  for (const entry of entries) {
    map.set(entry.path, entry)
  }
  return map
}

const countBy = <T>(items: T[], mapper: (item: T) => string): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = mapper(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

const formatCounts = (counts: Map<string, number>, limit = 6): string => {
  const entries = Array.from(counts.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1]
    return a[0] < b[0] ? -1 : 1
  })
  return entries
    .slice(0, limit)
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ')
}

const summarizePaths = (paths: string[]): string[] => {
  const total = paths.length
  const roots = countBy(paths, (path) => path.split('/')[0] ?? path)
  const extensions = countBy(paths, (path) => extname(path) || '(no ext)')
  const hasSrc = paths.some((path) => path.startsWith('src/'))
  const hasDist = paths.some((path) => path.startsWith('dist/'))

  const lines = [
    `Summary: ${total} changed file(s)`,
    `  Top-level: ${formatCounts(roots)}`,
    `  Extensions: ${formatCounts(extensions)}`,
  ]

  if (hasSrc && hasDist) {
    lines.push('  Hint: both src/ and dist/ changed; baseline may be out of date.')
  } else if (hasDist) {
    lines.push('  Hint: only dist/ changed; toolchain drift is likely.')
  } else if (hasSrc) {
    lines.push('  Hint: only src/ changed; ensure build/prepack outputs are fresh.')
  }

  return lines
}

const printDiff = (baselinePath: string, currentPath: string): void => {
  const result = spawnSync('diff', ['-u', baselinePath, currentPath], { encoding: 'utf8' })
  if (result.error) {
    console.log(`  (diff unavailable: ${result.error.message})`)
    return
  }
  if (result.status === 0) {
    console.log('  (no content diff)')
    return
  }
  if (result.status !== 1) {
    console.log(`  (diff failed with status ${result.status ?? 'unknown'})`)
    return
  }
  const output = result.stdout.trimEnd()
  if (!output) {
    console.log('  (no diff output)')
    return
  }
  const lines = output.split('\n')
  const limit = 200
  const truncated = lines.length > limit
  const slice = truncated ? lines.slice(0, limit) : lines
  for (const line of slice) {
    console.log(`  ${line}`)
  }
  if (truncated) {
    console.log(`  ...diff truncated (${lines.length - limit} more lines)`)
  }
}

const main = async (): Promise<void> => {
  const { baseline, current, allow, baselinePackageJson, currentPackageJson } = parseArgs()
  const baselineData = await readFingerprint(baseline)
  const currentData = await readFingerprint(current)
  const baselineMap = indexByPath(baselineData.files)
  const currentMap = indexByPath(currentData.files)

  const missing = Array.from(baselineMap.keys()).filter((key) => !currentMap.has(key))
  const extra = Array.from(currentMap.keys()).filter((key) => !baselineMap.has(key))

  const changed: string[] = []
  const changedErrors: string[] = []
  for (const [path, entry] of baselineMap.entries()) {
    const currentEntry = currentMap.get(path)
    if (!currentEntry) {
      continue
    }
    if (entry.sha256 !== currentEntry.sha256 || entry.sizeBytes !== currentEntry.sizeBytes) {
      changed.push(path)
    }
  }

  const errors: string[] = []
  const notices: string[] = []

  if (missing.length > 0) {
    errors.push(`Missing files (${missing.length}): ${missing.join(', ')}`)
  }
  if (extra.length > 0) {
    errors.push(`Extra files (${extra.length}): ${extra.join(', ')}`)
  }

  for (const path of changed) {
    const baselineEntry = baselineMap.get(path)
    const currentEntry = currentMap.get(path)
    if (!baselineEntry || !currentEntry) {
      continue
    }
    const details = `${path} (${baselineEntry.sha256.slice(0, 12)}:${baselineEntry.sizeBytes} -> ${currentEntry.sha256.slice(0, 12)}:${currentEntry.sizeBytes})`
    if (allow.has(path)) {
      notices.push(details)
      continue
    }
    errors.push(`Unexpected drift: ${details}`)
    changedErrors.push(path)
  }

  if (notices.length > 0) {
    console.log(`NOTICE: allowed drift in ${notices.length} file(s)`)
    for (const item of notices) {
      console.log(`- ${item}`)
      if (
        item.startsWith('package.json') &&
        baselinePackageJson &&
        currentPackageJson &&
        allow.has('package.json')
      ) {
        printDiff(resolve(baselinePackageJson), resolve(currentPackageJson))
      }
    }
  }

  if (errors.length > 0) {
    console.error(`ERROR: parity check failed with ${errors.length} issue(s)`)
    if (changedErrors.length > 0) {
      for (const line of summarizePaths(changedErrors)) {
        console.error(line)
      }
    }
    for (const item of errors) {
      console.error(`- ${item}`)
    }
    process.exit(1)
  }

  console.log('OK: parity check passed')
}

await main()
