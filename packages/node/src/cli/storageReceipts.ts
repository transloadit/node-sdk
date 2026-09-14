import type { FileHandle } from 'node:fs/promises'

import { randomUUID } from 'node:crypto'
import { chmod, lstat, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { z } from 'zod'

import { normalizeStoragePublicPrefix } from '../storagePublicPrefixes.ts'
import { ensureError, isErrnoException } from './types.ts'

// Keep every JSON key verbatim: a Storage filename may be "__proto__", which z.record strips.
const receiptsSchema = z.custom<Record<string, unknown>>(
  (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
)

/** Nonsecret project identity and rendering metadata, committed together. */
export const storageCatalogSchema = z.object({
  workspace: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),
  public: z.array(
    z.string().refine((prefix) => {
      try {
        return normalizeStoragePublicPrefix(prefix) === prefix
      } catch {
        return false
      }
    }, 'Expected a normalized public directory'),
  ),
  images: receiptsSchema,
})
export type StorageProjectCatalog = z.infer<typeof storageCatalogSchema>

/** Default project catalog; --receipts can select a separate project explicitly. */
export const defaultStorageCatalog = 'transloadit.images.json'

async function readReceipts(
  file: string,
): Promise<{ catalog?: StorageProjectCatalog; mode?: number }> {
  try {
    const info = await lstat(file)
    if (!info.isFile()) throw new Error('Expected a regular JSON file, not a symlink or directory')
    return {
      catalog: storageCatalogSchema.parse(JSON.parse(await readFile(file, 'utf8'))),
      mode: info.mode & 0o777,
    }
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') return {}
    const reason =
      error instanceof SyntaxError
        ? 'invalid JSON'
        : error instanceof z.ZodError
          ? 'expected a project catalog with workspace, public and images'
          : ensureError(error).message
    throw new Error(`Cannot read receipts ${JSON.stringify(file)}: ${reason}`, { cause: error })
  }
}

/** Read a project binding without creating a catalog or making a network request. */
export async function readStorageCatalog(file: string): Promise<StorageProjectCatalog | undefined> {
  return (await readReceipts(file)).catalog
}

/** A workspace override selects another workspace, never another key or implicit project rebinding. */
export function assertStorageWorkspace(actual: string, project?: string, requested?: string): void {
  if (requested !== undefined && requested !== actual)
    throw new Error(`Selected credentials belong to ${actual}, not ${requested}. Nothing uploaded.`)
  if (project !== undefined && project !== actual && requested === undefined)
    throw new Error(
      `Project uses ${project}; the selected credentials belong to ${actual}. Nothing uploaded.`,
    )
}

/**
 * Serializes CLI receipt writers and replaces a catalog only after the complete update succeeds.
 * onCheckpoint observes a completed rename even if interruption or cleanup subsequently fails.
 */
export async function updateStorageReceipts(
  file: string,
  update: (
    catalog: StorageProjectCatalog | undefined,
    signal: AbortSignal,
  ) => Promise<StorageProjectCatalog | undefined>,
  onCheckpoint?: () => void,
): Promise<void> {
  const lockPath = `${file}.lock`
  const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`)
  const cancellation = new AbortController()
  const cancel = (): void =>
    cancellation.abort(
      new Error('Storage command canceled. Check Storage before retrying a write.'),
    )
  // The first interrupt is cooperative; a forced exit/crash still leaves a lock for inspection.
  process.once('SIGINT', cancel)
  process.once('SIGTERM', cancel)
  let lock: FileHandle | undefined
  let retainTemporary = false
  try {
    lock = await open(lockPath, 'wx', 0o600).catch((error: unknown) => {
      if (isErrnoException(error) && error.code === 'EEXIST') {
        throw new Error(
          `The receipts file is locked by another storage store or receipts sync. Remove ${lockPath} only after confirming no writer is running.`,
          { cause: error },
        )
      }
      throw error
    })
    cancellation.signal.throwIfAborted()
    const { catalog, mode } = await readReceipts(file)
    const updated = await update(catalog, cancellation.signal)
    // An explicit one-off workspace override must not mix two workspaces in one catalog.
    if (updated === undefined) {
      cancellation.signal.throwIfAborted()
      return
    }
    // Once a remote write returned a receipt, finish its atomic checkpoint even if interrupted.
    // New catalogs are ordinary source files: let the kernel apply umask, without reading it.
    await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`, {
      flag: 'wx',
      mode: mode === undefined ? 0o666 : 0o600,
    })
    retainTemporary = true
    if (mode !== undefined) await chmod(temporary, mode)
    await rename(temporary, file)
    retainTemporary = false
    onCheckpoint?.()
    cancellation.signal.throwIfAborted()
  } catch (error) {
    if (retainTemporary)
      throw new Error(
        `${ensureError(error).message}\nComplete catalog retained at ${JSON.stringify(temporary)}.`,
        { cause: error },
      )
    throw error
  } finally {
    try {
      if (lock !== undefined) {
        await lock.close()
        await rm(lockPath, { force: true })
        if (!retainTemporary) await rm(temporary, { force: true })
      }
    } finally {
      process.off('SIGINT', cancel)
      process.off('SIGTERM', cancel)
    }
  }
}
