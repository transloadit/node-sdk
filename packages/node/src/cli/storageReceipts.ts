import { randomUUID } from 'node:crypto'
import { chmod, lstat, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { z } from 'zod'

import { ensureError, isErrnoException } from './types.ts'

// Keep every JSON key verbatim: a Storage filename may be "__proto__", which z.record strips.
const receiptsSchema = z.custom<Record<string, unknown>>(
  (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
)

async function readReceipts(
  file: string,
): Promise<{ receipts: Record<string, unknown>; mode: number }> {
  try {
    const info = await lstat(file)
    if (!info.isFile()) throw new Error('Expected a regular JSON file, not a symlink or directory')
    return {
      receipts: receiptsSchema.parse(JSON.parse(await readFile(file, 'utf8'))),
      mode: info.mode & 0o777,
    }
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') return { receipts: {}, mode: 0o600 }
    const reason =
      error instanceof SyntaxError
        ? 'invalid JSON'
        : error instanceof z.ZodError
          ? 'expected a JSON object keyed by Storage path'
          : ensureError(error).message
    throw new Error(`Cannot read receipts ${JSON.stringify(file)}: ${reason}`, { cause: error })
  }
}

/** Serializes CLI receipt writers and replaces a catalog only after the complete update succeeds. */
export async function updateStorageReceipts(
  file: string,
  update: (receipts: Record<string, unknown>) => Promise<Record<string, unknown>>,
): Promise<void> {
  const lockPath = `${file}.lock`
  const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`)
  // A crashed writer's lock is not stolen: the operator must first confirm it has stopped.
  const lock = await open(lockPath, 'wx', 0o600).catch((error: unknown) => {
    if (isErrnoException(error) && error.code === 'EEXIST') {
      throw new Error(
        `The receipts file is locked by another storage store or receipts sync. Remove ${lockPath} only after confirming no writer is running.`,
        { cause: error },
      )
    }
    throw error
  })
  let retainTemporary = false
  try {
    const { receipts, mode } = await readReceipts(file)
    const updated = await update(receipts)
    await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    retainTemporary = true
    await chmod(temporary, mode)
    await rename(temporary, file)
    retainTemporary = false
  } catch (error) {
    if (retainTemporary)
      throw new Error(
        `${ensureError(error).message}\nComplete catalog retained at ${JSON.stringify(temporary)}.`,
        { cause: error },
      )
    throw error
  } finally {
    await lock.close()
    await rm(lockPath, { force: true })
    if (!retainTemporary) await rm(temporary, { force: true })
  }
}
