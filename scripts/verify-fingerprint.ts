import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

interface FingerprintEntry {
  path: string
  sizeBytes: number
  sha256: string
}

interface Fingerprint {
  packageDir?: string
  packageJson?: {
    name?: string
    version?: string
  }
  files: FingerprintEntry[]
}

interface ParsedArgs {
  baseline: string
  current: string
  allow: Set<string>
  baselinePackageJson: string | null
  currentPackageJson: string | null
  logLevel: number
  maxDrifts: number
  diff: boolean
  diffIncludeMap: boolean
  diffFrom: string | null
  diffTo: string | null
  diffLimit: number
}

const usage = (): void => {
  console.log(`Usage: node scripts/verify-fingerprint.ts [options]

Options:
  --baseline <file>             Baseline fingerprint JSON (default: docs/fingerprint/transloadit-baseline.json)
  --current <file>              Current fingerprint JSON (required)
  --allow <path>                Allow drift for this file path (repeatable, default: package.json)
  --baseline-package-json <file> Baseline package.json (default: <baseline>.package.json if present)
  --current-package-json <file>  Current package.json (default: <packageDir>/package.json if present)
  --log-level <n>               Verbosity level (7 = full details, default: 6)
  --max-drifts <n>              Max drift lines when log-level < 7 (default: 25)
  --diff                        Show colored diffs for drifted files
  --diff-from <dir>             Baseline directory for diffs
  --diff-to <dir>               Current directory for diffs (defaults to current packageDir)
  --diff-include-map            Include *.map files in diff output
  --diff-limit <n>              Max files to diff (default: 25)
  -h, --help                    Show help
`)
}

const parseCliArgs = (): ParsedArgs => {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--')
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      baseline: { type: 'string', default: 'docs/fingerprint/transloadit-baseline.json' },
      current: { type: 'string' },
      allow: { type: 'string', multiple: true },
      'baseline-package-json': { type: 'string' },
      'current-package-json': { type: 'string' },
      'log-level': { type: 'string', default: '6' },
      'max-drifts': { type: 'string', default: '25' },
      diff: { type: 'boolean', default: false },
      'diff-from': { type: 'string' },
      'diff-to': { type: 'string' },
      'diff-include-map': { type: 'boolean', default: false },
      'diff-limit': { type: 'string', default: '25' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
    strict: true,
  })

  if (values.help) {
    usage()
    process.exit(0)
  }

  if (positionals.length > 0) {
    throw new Error(`Unexpected argument(s): ${positionals.join(' ')}`)
  }

  const baseline =
    typeof values.baseline === 'string'
      ? values.baseline
      : 'docs/fingerprint/transloadit-baseline.json'

  if (typeof values.current !== 'string' || !values.current) {
    usage()
    throw new Error('Missing required --current')
  }

  const logLevel = Number(values['log-level'])
  if (!Number.isFinite(logLevel)) {
    throw new Error(`Invalid --log-level value: ${values['log-level']}`)
  }

  const maxDrifts = Number(values['max-drifts'])
  if (!Number.isFinite(maxDrifts) || maxDrifts < 0) {
    throw new Error(`Invalid --max-drifts value: ${values['max-drifts']}`)
  }

  const diffLimit = Number(values['diff-limit'])
  if (!Number.isFinite(diffLimit) || diffLimit < 0) {
    throw new Error(`Invalid --diff-limit value: ${values['diff-limit']}`)
  }

  const allowValues = Array.isArray(values.allow)
    ? values.allow
    : values.allow
      ? [values.allow]
      : []
  const allow = new Set<string>(['package.json', ...allowValues])

  const diff =
    values.diff ||
    Boolean(values['diff-from']) ||
    Boolean(values['diff-to']) ||
    Boolean(values['diff-include-map'])

  return {
    baseline,
    current: values.current,
    allow,
    baselinePackageJson:
      typeof values['baseline-package-json'] === 'string' ? values['baseline-package-json'] : null,
    currentPackageJson:
      typeof values['current-package-json'] === 'string' ? values['current-package-json'] : null,
    logLevel,
    maxDrifts,
    diff,
    diffIncludeMap: Boolean(values['diff-include-map']),
    diffFrom: typeof values['diff-from'] === 'string' ? values['diff-from'] : null,
    diffTo: typeof values['diff-to'] === 'string' ? values['diff-to'] : null,
    diffLimit,
  }
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

const formatPath = (path: string): string => {
  const rel = relative(process.cwd(), path)
  if (!rel || rel.startsWith('..') || rel.startsWith('/')) {
    return path
  }
  return rel.startsWith('.') ? rel : `./${rel}`
}

type JestDiffModule = {
  diff?: (a: string, b: string, options?: Record<string, unknown>) => string | null
}

const loadJestDiff = async (): Promise<((a: string, b: string) => string) | null> => {
  try {
    const mod = (await import('jest-diff')) as JestDiffModule
    const diffFn = mod.diff
    if (!diffFn) return null
    return (a, b) =>
      diffFn(a, b, {
        expand: false,
        contextLines: 3,
      }) ?? ''
  } catch {
    return null
  }
}

const runCommand = (cmd: string, args: string[], cwd: string, label: string): boolean => {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  if (result.status === 0) {
    return true
  }
  console.error(`  ${label} failed (${cmd} ${args.join(' ')})`)
  if (result.stdout?.trim()) {
    console.error(result.stdout.trimEnd())
  }
  if (result.stderr?.trim()) {
    console.error(result.stderr.trimEnd())
  }
  return false
}

const runCommandCapture = (
  cmd: string,
  args: string[],
  cwd: string,
  label: string,
): { ok: boolean; stdout: string } => {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  if (result.status === 0) {
    return { ok: true, stdout: result.stdout ?? '' }
  }
  console.error(`  ${label} failed (${cmd} ${args.join(' ')})`)
  if (result.stdout?.trim()) {
    console.error(result.stdout.trimEnd())
  }
  if (result.stderr?.trim()) {
    console.error(result.stderr.trimEnd())
  }
  return { ok: false, stdout: '' }
}

const ensureBaselineFromRegistry = async (
  version: string,
): Promise<{ dir: string; cleanup: () => Promise<void>; source: string } | null> => {
  const tmpDir = await mkdtemp(resolve(tmpdir(), `transloadit-pack-${version}-`))
  const packed = runCommandCapture(
    'npm',
    ['pack', `transloadit@${version}`, '--json'],
    tmpDir,
    'npm pack',
  )
  if (!packed.ok) {
    await rm(tmpDir, { recursive: true, force: true })
    return null
  }
  let info: { filename?: string } | null = null
  try {
    const parsed = JSON.parse(packed.stdout.trim())
    info = Array.isArray(parsed) ? parsed[0] : parsed
  } catch {
    info = null
  }
  if (!info?.filename) {
    console.error('  npm pack did not return a filename')
    await rm(tmpDir, { recursive: true, force: true })
    return null
  }
  if (!runCommand('tar', ['-xf', info.filename, '-C', tmpDir], tmpDir, 'tar extract')) {
    await rm(tmpDir, { recursive: true, force: true })
    return null
  }
  const packageDir = resolve(tmpDir, 'package')
  if (!existsSync(packageDir)) {
    console.error('  unpacked tarball missing package/ directory')
    await rm(tmpDir, { recursive: true, force: true })
    return null
  }
  return {
    dir: packageDir,
    source: `npm pack transloadit@${version}`,
    cleanup: async () => {
      await rm(tmpDir, { recursive: true, force: true })
    },
  }
}

const ensureBaselineWorktree = async (
  version: string | null,
): Promise<{ dir: string; cleanup: () => Promise<void>; source: string } | null> => {
  if (!version) {
    console.error('Diffs skipped: could not determine baseline version.')
    return null
  }
  const tag = `v${version}`
  const worktreeDir = await mkdtemp(resolve(tmpdir(), `transloadit-baseline-${version}-`))
  const added = runCommand(
    'git',
    ['worktree', 'add', '--detach', worktreeDir, tag],
    process.cwd(),
    'git worktree add',
  )
  if (!added) {
    await rm(worktreeDir, { recursive: true, force: true })
    return null
  }

  const baselineDist = resolve(worktreeDir, 'packages', 'transloadit', 'dist')
  if (!existsSync(baselineDist)) {
    console.error('Preparing baseline build (one-time)…')
    const installed = existsSync(resolve(worktreeDir, 'node_modules'))
    if (!installed) {
      if (!runCommand('corepack', ['yarn', 'install'], worktreeDir, 'yarn install')) {
        runCommand(
          'git',
          ['worktree', 'remove', '--force', worktreeDir],
          process.cwd(),
          'git worktree remove',
        )
        await rm(worktreeDir, { recursive: true, force: true })
        return null
      }
    }
    const preparePath = resolve(worktreeDir, 'scripts', 'prepare-transloadit.ts')
    let prepared = false
    if (existsSync(preparePath)) {
      prepared = runCommand(
        'node',
        ['scripts/prepare-transloadit.ts'],
        worktreeDir,
        'prepare-transloadit',
      )
    }
    if (!prepared) {
      const buildSteps: Array<[string, string[], string]> = [
        ['corepack', ['yarn', 'tsc:node'], 'tsc:node'],
        ['corepack', ['yarn', '--cwd', 'packages/node', 'prepack'], 'packages/node prepack'],
        [
          'node',
          ['node_modules/typescript/bin/tsc', '-b', 'packages/node/tsconfig.build.json'],
          'tsc',
        ],
      ]
      for (const [cmd, args, label] of buildSteps) {
        if (runCommand(cmd, args, worktreeDir, label)) {
          if (existsSync(preparePath)) {
            prepared = runCommand(
              'node',
              ['scripts/prepare-transloadit.ts'],
              worktreeDir,
              'prepare-transloadit',
            )
          }
          if (prepared) break
        }
      }
    }
    if (!existsSync(baselineDist)) {
      runCommand(
        'git',
        ['worktree', 'remove', '--force', worktreeDir],
        process.cwd(),
        'git worktree remove',
      )
      await rm(worktreeDir, { recursive: true, force: true })
      return null
    }
  }

  return {
    dir: worktreeDir,
    source: `git tag v${version}`,
    cleanup: async () => {
      runCommand(
        'git',
        ['worktree', 'remove', '--force', worktreeDir],
        process.cwd(),
        'git worktree remove',
      )
      await rm(worktreeDir, { recursive: true, force: true })
    },
  }
}

const printFilePathDiff = async (
  fromPath: string,
  toPath: string,
  jestDiff: ((a: string, b: string) => string) | null,
): Promise<void> => {
  if (!jestDiff) {
    console.error('  (diff skipped: jest-diff not available)')
    return
  }
  const [fromText, toText] = await Promise.all([
    readFile(fromPath, 'utf8'),
    readFile(toPath, 'utf8'),
  ])
  const output = jestDiff(fromText, toText)
  if (!output.trim()) {
    console.error('  (no diff output)')
    return
  }
  console.error(output.trimEnd())
}

const printFileDiff = async (
  fromDir: string,
  toDir: string,
  relativePath: string,
  jestDiff: ((a: string, b: string) => string) | null,
): Promise<void> => {
  await printFilePathDiff(resolve(fromDir, relativePath), resolve(toDir, relativePath), jestDiff)
}

const main = async (): Promise<void> => {
  let {
    baseline,
    current,
    allow,
    baselinePackageJson,
    currentPackageJson,
    logLevel,
    maxDrifts,
    diff,
    diffIncludeMap,
    diffFrom,
    diffTo,
    diffLimit,
  } = parseCliArgs()
  const baselineData = await readFingerprint(baseline)
  const currentData = await readFingerprint(current)
  if (!baselinePackageJson && baseline.endsWith('.json')) {
    const candidate = resolve(baseline.replace(/\.json$/, '.package.json'))
    if (existsSync(candidate)) {
      baselinePackageJson = candidate
    }
  }
  if (!currentPackageJson && currentData.packageDir) {
    const candidate = resolve(currentData.packageDir, 'package.json')
    if (existsSync(candidate)) {
      currentPackageJson = candidate
    }
  }
  const baselineMap = indexByPath(baselineData.files)
  const currentMap = indexByPath(currentData.files)
  const baselineName = baselineData.packageJson?.name ?? 'transloadit'
  const baselineVersion = baselineData.packageJson?.version
  const baselineLabel = baselineVersion
    ? `${baselineName}@${baselineVersion}`
    : formatPath(resolve(baseline))
  const currentName = currentData.packageJson?.name ?? 'transloadit'
  const currentVersion = currentData.packageJson?.version
  const currentLabel = currentData.packageDir
    ? `${currentName}${currentVersion ? `@${currentVersion}` : ''} (${formatPath(currentData.packageDir)})`
    : formatPath(resolve(current))

  console.log(`Parity compare: ${baselineLabel} -> ${currentLabel}`)

  const missing = Array.from(baselineMap.keys()).filter((key) => !currentMap.has(key))
  const extra = Array.from(currentMap.keys()).filter((key) => !baselineMap.has(key))

  const changed: string[] = []
  const driftEntries: { path: string; details: string }[] = []
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
    driftEntries.push({ path, details: `Unexpected drift: ${details}` })
  }

  let jestDiff: ((a: string, b: string) => string) | null = null
  const shouldLoadDiff = diff || logLevel >= 7
  if (shouldLoadDiff) {
    if (!process.env.NO_COLOR && !process.env.FORCE_COLOR) {
      process.env.FORCE_COLOR = '1'
    }
    jestDiff = await loadJestDiff()
    if (!jestDiff) {
      console.error('Diff output unavailable because jest-diff is not available.')
    }
  }

  if (notices.length > 0) {
    console.log(
      `NOTICE: allowed drift in ${notices.length} file(s) (${baselineLabel} -> ${currentLabel})`,
    )
    for (const item of notices) {
      console.log(`- ${item}`)
      if (
        item.startsWith('package.json') &&
        baselinePackageJson &&
        currentPackageJson &&
        allow.has('package.json')
      ) {
        if (logLevel >= 7 || diff) {
          console.log(`  package.json diff (${baselineLabel} -> ${currentLabel}):`)
          await printFilePathDiff(
            resolve(baselinePackageJson),
            resolve(currentPackageJson),
            jestDiff,
          )
        } else {
          console.log('  (package.json diff hidden; re-run with --log-level 7 to show)')
        }
      }
    }
  }

  const issueCount = errors.length + driftEntries.length
  if (issueCount > 0) {
    console.error(`ERROR: parity check failed with ${issueCount} issue(s)`)
    console.error(`Compared: ${baselineLabel} -> ${currentLabel}`)
    if (driftEntries.length > 0) {
      for (const line of summarizePaths(driftEntries.map((entry) => entry.path))) {
        console.error(line)
      }
    }
    for (const item of errors) {
      console.error(`- ${item}`)
    }
    const driftLimit = logLevel >= 7 ? driftEntries.length : maxDrifts
    const driftsToShow = driftEntries.slice(0, driftLimit)
    const remaining = driftEntries.length - driftsToShow.length
    for (const item of driftsToShow) {
      console.error(`- ${item.details}`)
    }
    if (remaining > 0) {
      console.error(`- …and ${remaining} more drift(s). Re-run with --log-level 7 for full list.`)
    }
    if (diff) {
      const resolvedTo = diffTo
        ? resolve(diffTo)
        : currentData.packageDir
          ? resolve(currentData.packageDir)
          : null
      let baselineDir = diffFrom ? resolve(diffFrom) : null
      let cleanup: (() => Promise<void>) | null = null
      let baselineSource = 'baseline snapshot'
      if (!baselineDir) {
        const baselineVersion =
          baselineData.packageJson?.version ||
          (baselinePackageJson &&
            JSON.parse(await readFile(resolve(baselinePackageJson), 'utf8')).version) ||
          null
        if (baselineVersion) {
          const fromRegistry = await ensureBaselineFromRegistry(baselineVersion)
          if (fromRegistry) {
            baselineDir = fromRegistry.dir
            baselineSource = fromRegistry.source
            cleanup = fromRegistry.cleanup
          } else {
            const autoBaseline = await ensureBaselineWorktree(baselineVersion)
            if (autoBaseline) {
              baselineDir = resolve(autoBaseline.dir, 'packages', 'transloadit')
              baselineSource = autoBaseline.source
              cleanup = autoBaseline.cleanup
            }
          }
        }
      }
      if (!baselineDir || !resolvedTo) {
        console.error('- Diffs requested but baseline/current directory missing.')
      } else {
        const diffTargets = driftsToShow
          .filter((entry) => diffIncludeMap || !entry.path.endsWith('.map'))
          .slice(0, diffLimit)
        const mapSkipped = diffIncludeMap
          ? 0
          : driftsToShow.filter((entry) => entry.path.endsWith('.map')).length
        const fromOk = existsSync(baselineDir)
        const toOk = existsSync(resolvedTo)
        if (!fromOk || !toOk) {
          console.error('Diffs skipped: baseline/current directory not found.')
          if (!fromOk) {
            console.error(`  Missing: ${formatPath(baselineDir)}`)
            const maybePackages =
              baselineDir.includes('/package/') && baselineDir.replace('/package/', '/packages/')
            if (maybePackages && existsSync(maybePackages)) {
              console.error(`  Did you mean: ${formatPath(maybePackages)}`)
            }
            console.error('  Tip: create a baseline worktree and build dist/ before diffing.')
          }
          if (!toOk) {
            console.error(`  Missing: ${formatPath(resolvedTo)}`)
          }
        } else if (!jestDiff) {
          console.error('Diffs skipped: jest-diff is not available.')
        } else if (diffTargets.length > 0) {
          const missingBaseline: string[] = []
          const missingCurrent: string[] = []
          let shown = 0
          console.error(`Diffs (${baselineSource} → current build):`)
          for (const entry of diffTargets) {
            const fromPath = resolve(baselineDir, entry.path)
            const toPath = resolve(resolvedTo, entry.path)
            if (!existsSync(fromPath)) {
              missingBaseline.push(entry.path)
              continue
            }
            if (!existsSync(toPath)) {
              missingCurrent.push(entry.path)
              continue
            }
            console.error(`--- ${entry.path}`)
            await printFileDiff(baselineDir, resolvedTo, entry.path, jestDiff)
            shown += 1
          }
          if (missingBaseline.length > 0 || missingCurrent.length > 0) {
            console.error('(Some diffs skipped due to missing files.)')
            if (missingBaseline.length > 0) {
              console.error(`  Missing in baseline: ${missingBaseline.slice(0, 10).join(', ')}`)
            }
            if (missingCurrent.length > 0) {
              console.error(`  Missing in current: ${missingCurrent.slice(0, 10).join(', ')}`)
            }
          }
          const missingCount = missingBaseline.length + missingCurrent.length
          const limitSkipped = Math.max(0, diffTargets.length - shown - missingCount)
          console.error(
            `Diff coverage: shown ${shown} of ${driftEntries.length} drift(s) (limit ${diffLimit}).`,
          )
          if (!diffIncludeMap && mapSkipped > 0) {
            console.error(
              `  Skipped ${mapSkipped} sourcemap file(s). Use --diff-include-map to include.`,
            )
          }
          if (limitSkipped > 0) {
            console.error(
              `  Skipped ${limitSkipped} due to diff limit. Use --diff-limit to show more.`,
            )
          }
        }
      }
      if (cleanup) {
        await cleanup()
      }
    }
    if (currentData.packageDir && baselinePackageJson) {
      console.error('')
      console.error(
        'Accepting this drift updates the parity baseline to match the new package output.',
      )
      console.error(
        'Do this only when changes are expected (e.g. after syncing alphalib/om or bumping versions).',
      )
      console.error('')
      console.error('To accept the drift:')
      console.error(
        `  1) node scripts/fingerprint-pack.ts ${formatPath(currentData.packageDir)} --ignore-scripts --quiet --out ${formatPath(resolve(baseline))}`,
      )
      console.error(
        `  2) cp ${formatPath(resolve(currentData.packageDir, 'package.json'))} ${formatPath(
          resolve(baselinePackageJson),
        )}`,
      )
      console.error('')
      console.error('Then re-run: yarn parity:transloadit')
    }
    process.exit(1)
  }

  console.log('OK: parity check passed')
}

await main()
