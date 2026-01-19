import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const usage = (): void => {
  console.log(`Usage: node scripts/fingerprint-pack.ts [path] [options]

Options:
  -o, --out <file>   Write JSON output to a file
  --ignore-scripts   Pass --ignore-scripts to npm pack
  --keep             Keep the generated tarball
  -q, --quiet        Suppress JSON output to stdout
  -h, --help         Show help
`)
}

interface ParsedArgs {
  target: string
  out: string | null
  keep: boolean
  ignoreScripts: boolean
  quiet: boolean
}

const parseArgs = (): ParsedArgs => {
  const args = process.argv.slice(2)
  let target = '.'
  let out = null
  let keep = false
  let ignoreScripts = false
  let quiet = false

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-h' || arg === '--help') {
      usage()
      process.exit(0)
    }
    if (arg === '-o' || arg === '--out') {
      out = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--keep') {
      keep = true
      continue
    }
    if (arg === '--ignore-scripts') {
      ignoreScripts = true
      continue
    }
    if (arg === '--quiet' || arg === '-q') {
      quiet = true
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }
    target = arg
  }

  return { target, out, keep, ignoreScripts, quiet }
}

const hashFile = async (filePath: string): Promise<string> =>
  new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolvePromise(hash.digest('hex')))
  })

const hashFileWithSize = async (filePath: string): Promise<{ sha256: string; sizeBytes: number }> =>
  new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256')
    let sizeBytes = 0
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk) => {
      sizeBytes += chunk.length
      hash.update(chunk)
    })
    stream.on('end', () => resolvePromise({ sha256: hash.digest('hex'), sizeBytes }))
  })

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = index
      index += 1
      if (current >= items.length) {
        break
      }
      results[current] = await worker(items[current])
    }
  })
  await Promise.all(workers)
  return results
}

const main = async (): Promise<void> => {
  const { target, out, keep, ignoreScripts, quiet } = parseArgs()
  const cwd = resolve(process.cwd(), target)

  const packArgs = ['pack', '--json']
  if (ignoreScripts) {
    packArgs.push('--ignore-scripts')
  }
  const { stdout } = await execFileAsync('npm', packArgs, { cwd, encoding: 'utf8' })
  const packed = JSON.parse(stdout.trim())
  const info = Array.isArray(packed) ? packed[0] : packed
  if (!info?.filename) {
    throw new Error('npm pack did not return a tarball filename')
  }

  const tarballPath = resolve(cwd, info.filename)
  const tarballStat = await stat(tarballPath)
  const tarballSha = await hashFile(tarballPath)

  const { stdout: listStdout } = await execFileAsync('tar', ['-tf', tarballPath])
  const entries = listStdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.endsWith('/'))

  const extractDir = await mkdtemp(resolve(tmpdir(), 'transloadit-pack-'))
  let files: { path: string; sizeBytes: number; sha256: string }[] = []
  try {
    await execFileAsync('tar', ['-xf', tarballPath, '-C', extractDir])
    const concurrency = 8
    files = await runWithConcurrency(entries, concurrency, async (entry) => {
      const { sha256, sizeBytes } = await hashFileWithSize(resolve(extractDir, entry))
      const normalized = entry.startsWith('package/') ? entry.slice('package/'.length) : entry
      return { path: normalized, sizeBytes, sha256 }
    })
    const packageJsonPath = resolve(extractDir, 'package', 'package.json')
    const packageJsonRaw = await readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageJsonRaw)

    const summary = {
      packageDir: cwd,
      tarball: {
        filename: info.filename,
        sizeBytes: tarballStat.size,
        sha256: tarballSha,
      },
      packageJson: {
        name: packageJson.name,
        version: packageJson.version,
        main: packageJson.main,
        types: packageJson.types,
        exports: packageJson.exports,
        files: packageJson.files,
      },
      files,
    }

    const json = `${JSON.stringify(summary, null, 2)}\n`
    if (out) {
      const outPath = resolve(process.cwd(), out)
      await mkdir(resolve(outPath, '..'), { recursive: true })
      await writeFile(outPath, json)
    }

    if (!quiet) {
      process.stdout.write(json)
    }
  } finally {
    await rm(extractDir, { recursive: true, force: true })
  }

  if (!keep) {
    await rm(tarballPath, { force: true })
  }
}

await main()
