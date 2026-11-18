/**
 * Prove that a change leaves the generated Zod trees and every published package that derives from
 * the alphalib schemas unchanged, compared with a base git ref.
 *
 * Both sides are materialized into fresh temporary directories (`git archive`, or the working
 * tree's tracked and unignored files), installed with `yarn install --immutable
 * --mode=skip-build`, generated and built with their own scripts, then compared:
 *
 * - sha256 manifests of `packages/zod/src/{v3,v4}`, `packages/zod/dist`,
 *   `packages/types/src/generated`, `packages/types/dist` and `packages/node/dist`;
 * - `npm pack` fingerprints of `packages/node` and the generated `packages/transloadit`;
 * - the runtime probe (`prove-zod-exports-probe.ts`): schema fingerprints, a parse corpus and
 *   `z.toJSONSchema` digests of every export.
 *
 * Differences pass only when an entry in `prove-zod-exports.allowlist.ts` explains them. The tool
 * exits 1 otherwise.
 */

import type { ProofAllowlistEntry } from './prove-zod-exports.allowlist.ts'

import { createHash } from 'node:crypto'
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

import { execa } from 'execa'

import { proofAllowlist } from './prove-zod-exports.allowlist.ts'

const repoRoot = resolve(import.meta.dirname, '..')

const fileAreas = [
  'packages/zod/src/v3',
  'packages/zod/src/v4',
  'packages/zod/dist',
  'packages/types/src/generated',
  'packages/types/dist',
  'packages/node/dist',
] as const

const packedPackages = ['packages/node', 'packages/transloadit'] as const

interface Side {
  label: 'base' | 'head'
  ref: string | undefined
  root: string
  log: string
}

interface FileDifference {
  path: string
  status: 'differs' | 'only-base' | 'only-head'
  allowlistedBy?: string
}

interface AreaResult {
  area: string
  compared: number
  identical: number
  differences: FileDifference[]
}

interface RuntimeDifference {
  path: string
  detail: string
  allowlistedBy?: string
}

interface PackFingerprint {
  tarball?: { sha256?: string }
  files: { path: string; sha256: string }[]
}

interface ProbeDocument {
  zodVersion: string
  fingerprints: Record<string, { roots: Record<string, unknown>; nodes: unknown[] }>
  corpus: Record<string, { label: string; v3: string; v4: string }[]>
  crossVersion: {
    export: string
    probe: string
    v3: { success: boolean }
    v4: { success: boolean }
  }[]
  outcomes: Record<string, unknown>
  jsonSchemas: Record<string, { input: string; output: string }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex')

const step = async (side: Side, title: string, run: () => Promise<unknown>): Promise<void> => {
  const started = performance.now()
  process.stdout.write(`[${side.label}] ${title}… `)
  await run()
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  process.stdout.write(`${seconds}s\n`)
  await writeFile(side.log, `${title}: ${seconds}s\n`, { flag: 'a' })
}

const runIn = async (
  side: Side,
  command: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<void> => {
  const result = await execa(command, args, {
    cwd: side.root,
    env: { ...env, FORCE_COLOR: '0' },
    all: true,
    reject: false,
  })
  await writeFile(side.log, `$ ${command} ${args.join(' ')}\n${result.all ?? ''}\n`, { flag: 'a' })
  if (result.exitCode !== 0) {
    throw new Error(`[${side.label}] ${command} ${args.join(' ')} failed; see ${side.log}`)
  }
}

const materialize = async (side: Side): Promise<void> => {
  await mkdir(side.root, { recursive: true })
  if (side.ref) {
    await execa('git', ['archive', '--format=tar', side.ref], { cwd: repoRoot }).pipe('tar', [
      '-x',
      '-C',
      side.root,
    ])
    return
  }
  // The working tree: tracked and untracked files that git does not ignore, as a PR would see them.
  const { stdout } = await execa('git', ['ls-files', '-z', '-co', '--exclude-standard'], {
    cwd: repoRoot,
  })
  const files: string[] = []
  for (const file of stdout.split('\0')) {
    if (file === '') continue
    const exists = await stat(resolve(repoRoot, file)).then(
      (info) => info.isFile(),
      () => false,
    )
    if (exists) files.push(file)
  }
  await execa('tar', ['-c', '--null', '-T', '-'], {
    cwd: repoRoot,
    input: `${files.join('\0')}\0`,
  }).pipe('tar', ['-x', '-C', side.root])
  // Match git archive's modes, which npm pack records in the tarball.
  for (const file of files) {
    const target = resolve(side.root, file)
    const { mode } = await stat(target)
    await chmod(target, mode & 0o111 ? 0o755 : 0o644)
  }
}

const build = async (side: Side): Promise<void> => {
  await step(side, 'yarn install --immutable --mode=skip-build', () =>
    runIn(side, 'yarn', ['install', '--immutable', '--mode=skip-build']),
  )
  await step(side, 'yarn tsc:zod', () => runIn(side, 'yarn', ['tsc:zod']))
  await step(side, 'yarn tsc:types', () => runIn(side, 'yarn', ['tsc:types']))
  await step(side, 'yarn tsc:node', () => runIn(side, 'yarn', ['tsc:node']))
  await step(side, 'prepare-transloadit', () =>
    runIn(side, 'node', ['scripts/prepare-transloadit.ts'], {
      TRANSLOADIT_PUBLISH_PREBUILT_NODE: 'true',
    }),
  )
}

const fingerprintPacks = async (side: Side, outDir: string): Promise<void> => {
  for (const packageDir of packedPackages) {
    const out = resolve(outDir, `${side.label}-${packageDir.replaceAll('/', '-')}.pack.json`)
    await step(side, `fingerprint ${packageDir}`, () =>
      runIn(side, 'node', [
        resolve(repoRoot, 'scripts/fingerprint-pack.ts'),
        resolve(side.root, packageDir),
        '--ignore-scripts',
        '--quiet',
        '--out',
        out,
      ]),
    )
  }
}

const probe = async (side: Side, outDir: string): Promise<void> => {
  const probePath = resolve(side.root, 'packages/zod/.prove-zod-exports-probe.ts')
  await cp(resolve(repoRoot, 'scripts/prove-zod-exports-probe.ts'), probePath)
  await step(side, 'runtime probe', () =>
    runIn(side, 'node', [
      probePath,
      '--out',
      resolve(outDir, `${side.label}-probe.json`),
      '--json-schema-dir',
      resolve(side.root, '.prove-json-schema'),
      // The base synthesizes the corpus inputs; the head parses exactly the same ones.
      side.label === 'base' ? '--inputs-out' : '--inputs-in',
      resolve(outDir, 'corpus-inputs.json'),
    ]),
  )
}

const manifest = async (root: string): Promise<Map<string, string>> => {
  const result = new Map<string, string>()
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const file = resolve(entry.parentPath, entry.name)
    result.set(relative(root, file).split(sep).join('/'), sha256(await readFile(file)))
  }
  return new Map([...result].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

const normalize = (text: string, entry: ProofAllowlistEntry): string => {
  let next = text
  for (const { from, to } of entry.normalize) next = next.replaceAll(from, to)
  return next
}

const explainFile = async (
  key: string,
  base: string | undefined,
  head: string | undefined,
): Promise<string | undefined> => {
  for (const entry of proofAllowlist) {
    if (!new RegExp(entry.pattern).test(key)) continue
    if (base === undefined || head === undefined) {
      if (entry.normalize.length === 0) return entry.pattern
      continue
    }
    if (
      normalize(await readFile(base, 'utf8'), entry) ===
      normalize(await readFile(head, 'utf8'), entry)
    ) {
      return entry.pattern
    }
  }
  return undefined
}

const explainRuntime = (key: string): string | undefined =>
  proofAllowlist.find(
    (entry) => entry.normalize.length === 0 && new RegExp(entry.pattern).test(key),
  )?.pattern

const writeDiff = async (
  outDir: string,
  key: string,
  base: string,
  head: string,
): Promise<void> => {
  const { stdout } = await execa('diff', ['-u', base, head], { reject: false })
  const target = resolve(outDir, 'diffs', `${key.replaceAll('/', '__')}.diff`)
  await mkdir(resolve(outDir, 'diffs'), { recursive: true })
  await writeFile(target, `${stdout}\n`)
}

const compareArea = async (
  area: string,
  base: Side,
  head: Side,
  outDir: string,
): Promise<AreaResult> => {
  const baseManifest = await manifest(resolve(base.root, area))
  const headManifest = await manifest(resolve(head.root, area))
  const result: AreaResult = { area, compared: 0, identical: 0, differences: [] }
  for (const path of new Set([...baseManifest.keys(), ...headManifest.keys()])) {
    result.compared += 1
    const baseHash = baseManifest.get(path)
    const headHash = headManifest.get(path)
    if (baseHash === headHash) {
      result.identical += 1
      continue
    }
    const key = `${area}/${path}`
    const basePath = baseHash === undefined ? undefined : resolve(base.root, area, path)
    const headPath = headHash === undefined ? undefined : resolve(head.root, area, path)
    const status =
      basePath === undefined ? 'only-head' : headPath === undefined ? 'only-base' : 'differs'
    const allowlistedBy = await explainFile(key, basePath, headPath)
    if (basePath && headPath) await writeDiff(outDir, key, basePath, headPath)
    result.differences.push({ path: key, status, ...(allowlistedBy ? { allowlistedBy } : {}) })
  }
  return result
}

const comparePacks = async (outDir: string): Promise<AreaResult[]> => {
  const results: AreaResult[] = []
  for (const packageDir of packedPackages) {
    const name = packageDir.replaceAll('/', '-')
    const read = async (label: string): Promise<PackFingerprint> =>
      JSON.parse(await readFile(resolve(outDir, `${label}-${name}.pack.json`), 'utf8'))
    const base = await read('base')
    const head = await read('head')
    const area = `pack:${packageDir}`
    const result: AreaResult = { area, compared: 0, identical: 0, differences: [] }
    const baseFiles = new Map(base.files.map((file) => [file.path, file.sha256]))
    const headFiles = new Map(head.files.map((file) => [file.path, file.sha256]))
    for (const path of new Set([...baseFiles.keys(), ...headFiles.keys()])) {
      result.compared += 1
      if (baseFiles.get(path) === headFiles.get(path)) {
        result.identical += 1
        continue
      }
      const key = `${area}/${path}`
      const status = !baseFiles.has(path)
        ? 'only-head'
        : !headFiles.has(path)
          ? 'only-base'
          : 'differs'
      const allowlistedBy = explainRuntime(key)
      result.differences.push({ path: key, status, ...(allowlistedBy ? { allowlistedBy } : {}) })
    }
    const tarballKey = `${area}#tarball`
    result.compared += 1
    if (base.tarball?.sha256 === head.tarball?.sha256) result.identical += 1
    else {
      const allowlistedBy = explainRuntime(tarballKey)
      result.differences.push({
        path: tarballKey,
        status: 'differs',
        ...(allowlistedBy ? { allowlistedBy } : {}),
      })
    }
    results.push(result)
  }
  return results
}

/** Hash the schema graph reachable from one root, independent of global node numbering. */
const canonicalRoot = (root: unknown, nodes: unknown[]): string => {
  const order = new Map<number, number>()
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit)
    if (!isRecord(value)) return value
    const ref = value.$ref
    if (typeof ref === 'number' && Object.keys(value).length === 1) {
      const known = order.get(ref)
      if (known !== undefined) return { $ref: known }
      order.set(ref, order.size)
      return { $node: order.size - 1, value: visit(nodes[ref]) }
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
  }
  return sha256(JSON.stringify(visit(root)))
}

const compareProbes = async (
  outDir: string,
  base: Side,
  head: Side,
): Promise<{
  compared: Record<string, number>
  differences: RuntimeDifference[]
  crossVersion: unknown
}> => {
  const read = async (label: string): Promise<ProbeDocument> =>
    JSON.parse(await readFile(resolve(outDir, `${label}-probe.json`), 'utf8'))
  const baseProbe = await read('base')
  const headProbe = await read('head')
  const differences: RuntimeDifference[] = []
  const compared: Record<string, number> = {}
  const add = (path: string, detail: string): void => {
    const allowlistedBy = explainRuntime(path)
    differences.push({ path, detail, ...(allowlistedBy ? { allowlistedBy } : {}) })
  }

  compared.zodVersion = 1
  if (baseProbe.zodVersion !== headProbe.zodVersion) {
    add('runtime/zod-version', `${baseProbe.zodVersion} -> ${headProbe.zodVersion}`)
  }

  for (const version of ['v3', 'v4']) {
    const baseFingerprint = baseProbe.fingerprints[version]
    const headFingerprint = headProbe.fingerprints[version]
    if (!baseFingerprint || !headFingerprint) throw new Error(`missing ${version} fingerprints`)
    const keys = new Set([
      ...Object.keys(baseFingerprint.roots),
      ...Object.keys(headFingerprint.roots),
    ])
    compared[`fingerprint-${version}`] = keys.size
    const sameGraph = JSON.stringify(baseFingerprint) === JSON.stringify(headFingerprint)
    if (sameGraph) continue
    for (const key of keys) {
      const baseRoot = baseFingerprint.roots[key]
      const headRoot = headFingerprint.roots[key]
      if (baseRoot === undefined || headRoot === undefined) {
        add(
          `runtime/fingerprint/${version}/${key}`,
          baseRoot === undefined ? 'only head' : 'only base',
        )
        continue
      }
      if (
        canonicalRoot(baseRoot, baseFingerprint.nodes) !==
        canonicalRoot(headRoot, headFingerprint.nodes)
      ) {
        add(`runtime/fingerprint/${version}/${key}`, 'schema structure differs')
      }
    }
  }

  const corpusKeys = new Set([...Object.keys(baseProbe.corpus), ...Object.keys(headProbe.corpus)])
  compared.corpusExports = corpusKeys.size
  compared.corpusProbes = 0
  for (const key of corpusKeys) {
    const baseResults = baseProbe.corpus[key] ?? []
    const headResults = headProbe.corpus[key] ?? []
    compared.corpusProbes += Math.max(baseResults.length, headResults.length)
    const baseByLabel = new Map(baseResults.map((result) => [result.label, result]))
    const headByLabel = new Map(headResults.map((result) => [result.label, result]))
    for (const label of new Set([...baseByLabel.keys(), ...headByLabel.keys()])) {
      const before = baseByLabel.get(label)
      const after = headByLabel.get(label)
      for (const version of ['v3', 'v4'] as const) {
        if (before?.[version] === after?.[version]) continue
        add(
          `runtime/corpus/${version}/${key}#${label}`,
          JSON.stringify({
            base: before ? baseProbe.outcomes[before[version]] : null,
            head: after ? headProbe.outcomes[after[version]] : null,
          }).slice(0, 2000),
        )
      }
    }
  }

  const crossKey = (entry: ProbeDocument['crossVersion'][number]): string =>
    `${entry.export}#${entry.probe} v3:${entry.v3.success} v4:${entry.v4.success}`
  const baseCross = new Set(baseProbe.crossVersion.map(crossKey))
  const headCross = new Set(headProbe.crossVersion.map(crossKey))
  compared.crossVersionBase = baseCross.size
  compared.crossVersionHead = headCross.size
  for (const entry of baseCross) {
    if (!headCross.has(entry)) add(`runtime/cross-version/${entry}`, 'v3/v4 difference disappeared')
  }
  for (const entry of headCross) {
    if (!baseCross.has(entry)) add(`runtime/cross-version/${entry}`, 'new v3/v4 difference')
  }

  const schemaKeys = new Set([
    ...Object.keys(baseProbe.jsonSchemas),
    ...Object.keys(headProbe.jsonSchemas),
  ])
  compared.jsonSchemas = schemaKeys.size * 2
  for (const key of schemaKeys) {
    for (const io of ['input', 'output'] as const) {
      const before = baseProbe.jsonSchemas[key]?.[io]
      const after = headProbe.jsonSchemas[key]?.[io]
      if (before === after) continue
      add(`runtime/json-schema/${io}/${key}`, 'z.toJSONSchema output differs')
      const file = `${key.replaceAll('/', '__')}.${io}.json`
      const baseFile = join(base.root, '.prove-json-schema', file)
      const headFile = join(head.root, '.prove-json-schema', file)
      await writeDiff(outDir, `json-schema/${io}/${key}`, baseFile, headFile)
    }
  }

  return {
    compared,
    differences,
    crossVersion: { base: [...baseCross].sort(), head: [...headCross].sort() },
  }
}

const formatSummary = (
  areas: AreaResult[],
  runtime: Awaited<ReturnType<typeof compareProbes>>,
  sides: Side[],
): string => {
  const lines = ['# Zod export proof', '']
  for (const side of sides) lines.push(`- ${side.label}: ${side.ref ?? 'working tree'}`)
  lines.push(
    '',
    '| Area | Compared | Identical | Allowlisted | Unexplained |',
    '| --- | --- | --- | --- | --- |',
  )
  for (const area of areas) {
    const allowlisted = area.differences.filter((difference) => difference.allowlistedBy).length
    lines.push(
      `| ${area.area} | ${area.compared} | ${area.identical} | ${allowlisted} | ${area.differences.length - allowlisted} |`,
    )
  }
  const runtimeAllowlisted = runtime.differences.filter((difference) => difference.allowlistedBy)
  lines.push(
    '',
    `Runtime: ${Object.entries(runtime.compared)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`,
    `Runtime differences: ${runtime.differences.length} (${runtimeAllowlisted.length} allowlisted)`,
  )
  const unexplained = [...areas.flatMap((area) => area.differences), ...runtime.differences].filter(
    (difference) => !difference.allowlistedBy,
  )
  const allowlisted = [...areas.flatMap((area) => area.differences), ...runtime.differences].filter(
    (difference) => difference.allowlistedBy,
  )
  if (allowlisted.length > 0) {
    lines.push('', '## Allowlisted', '')
    for (const difference of allowlisted.slice(0, 200)) {
      lines.push(`- ${difference.path} (${difference.allowlistedBy})`)
    }
  }
  if (unexplained.length > 0) {
    lines.push('', '## Unexplained', '')
    for (const difference of unexplained.slice(0, 200)) {
      const detail = 'detail' in difference ? `: ${difference.detail.slice(0, 300)}` : ''
      lines.push(`- ${difference.path}${detail}`)
    }
    if (unexplained.length > 200) lines.push(`- … and ${unexplained.length - 200} more`)
  }
  return `${lines.join('\n')}\n`
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      base: { type: 'string' },
      head: { type: 'string' },
      out: { type: 'string' },
      'work-dir': { type: 'string', default: tmpdir() },
      keep: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  })
  if (values.help || !values.base) {
    console.log(
      'Usage: node scripts/prove-zod-exports.ts --base <ref> [--head <ref>] [--out <dir>] [--work-dir <dir>] [--keep]',
    )
    process.exitCode = values.help ? 0 : 1
    return
  }

  await mkdir(values['work-dir'], { recursive: true })
  const workDir = await mkdtemp(join(resolve(values['work-dir']), 'prove-zod-exports-'))
  const outDir = resolve(values.out ?? join(workDir, 'results'))
  await mkdir(outDir, { recursive: true })
  const sides: Side[] = [
    { label: 'base', ref: values.base, root: join(workDir, 'base'), log: join(outDir, 'base.log') },
    { label: 'head', ref: values.head, root: join(workDir, 'head'), log: join(outDir, 'head.log') },
  ]
  try {
    for (const side of sides) {
      await writeFile(side.log, '')
      await step(side, `materialize ${side.ref ?? 'working tree'}`, () => materialize(side))
      await build(side)
      await fingerprintPacks(side, outDir)
      await probe(side, outDir)
    }
    const [base, head] = sides
    if (!base || !head) throw new Error('expected two sides')

    const areas: AreaResult[] = []
    for (const area of fileAreas) areas.push(await compareArea(area, base, head, outDir))
    areas.push(...(await comparePacks(outDir)))
    const runtime = await compareProbes(outDir, base, head)

    const summary = formatSummary(areas, runtime, sides)
    await writeFile(resolve(outDir, 'summary.md'), summary)
    await writeFile(
      resolve(outDir, 'summary.json'),
      `${JSON.stringify({ sides, areas, runtime }, null, 2)}\n`,
    )
    console.log(`\n${summary}\nResults: ${outDir}`)
    const unexplained = [
      ...areas.flatMap((area) => area.differences),
      ...runtime.differences,
    ].filter((difference) => !difference.allowlistedBy)
    if (unexplained.length > 0) {
      throw new Error(`${unexplained.length} differences are not covered by the allowlist`)
    }
  } finally {
    if (!values.keep) await rm(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
