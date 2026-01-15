import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const cwd = process.argv[2] ? resolve(process.argv[2]) : process.cwd()

/** @param {Uint8Array} buffer */
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const pack = async () => {
  const { stdout } = await execFileAsync('npm', ['pack', '--json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })

  const parsed = JSON.parse(stdout)
  if (!Array.isArray(parsed) || !parsed[0] || !parsed[0].filename) {
    throw new Error('Unexpected npm pack output')
  }

  return parsed[0]
}

/** @param {string} tarballPath */
const listTarFiles = async (tarballPath) => {
  const { stdout } = await execFileAsync('tar', ['-tf', tarballPath], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })

  return stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !entry.endsWith('/'))
}

/**
 * @param {string} tarballPath
 * @param {string} entry
 * @returns {Promise<Buffer>}
 */
const readTarFile = async (tarballPath, entry) => {
  const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, entry], {
    cwd,
    encoding: 'buffer',
    maxBuffer: 200 * 1024 * 1024,
  })

  return stdout
}

const main = async () => {
  const packInfo = await pack()
  const tarballPath = resolve(cwd, packInfo.filename)
  const tarballBuffer = await readFile(tarballPath)

  const files = await listTarFiles(tarballPath)
  /** @type {Record<string, { sha256: string, size: number }>} */
  const fileFingerprints = {}

  for (const entry of files) {
    const contents = await readTarFile(tarballPath, entry)
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
    fileFingerprints[entry] = {
      sha256: sha256(buffer),
      size: buffer.length,
    }
  }

  const fingerprint = {
    tarball: {
      file: packInfo.filename,
      sha256: sha256(tarballBuffer),
      size: tarballBuffer.length,
    },
    files: fileFingerprints,
  }

  process.stdout.write(`${JSON.stringify(fingerprint, null, 2)}\n`)
}

await main()
