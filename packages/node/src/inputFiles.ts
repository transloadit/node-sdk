import { createWriteStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import got from 'got'
import type { Input as IntoStreamInput } from 'into-stream'
import type { CreateAssemblyParams } from './apiTypes.ts'

export type InputFile =
  | {
      kind: 'path'
      field: string
      path: string
    }
  | {
      kind: 'base64'
      field: string
      base64: string
      filename: string
      contentType?: string
    }
  | {
      kind: 'url'
      field: string
      url: string
      filename?: string
      contentType?: string
    }

export type UploadInput = Readable | IntoStreamInput

export type Base64Strategy = 'buffer' | 'tempfile'
export type UrlStrategy = 'import' | 'download' | 'import-if-present'

export type PrepareInputFilesOptions = {
  inputFiles?: InputFile[]
  params?: CreateAssemblyParams
  fields?: Record<string, unknown>
  base64Strategy?: Base64Strategy
  urlStrategy?: UrlStrategy
  maxBase64Bytes?: number
  tempDir?: string
}

export type PrepareInputFilesResult = {
  params: CreateAssemblyParams
  files: Record<string, string>
  uploads: Record<string, UploadInput>
  cleanup: Array<() => Promise<void>>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const ensureUnique = (field: string, used: Set<string>): void => {
  if (used.has(field)) {
    throw new Error(`Duplicate file field: ${field}`)
  }
  used.add(field)
}

const ensureUniqueStepName = (baseName: string, used: Set<string>): string => {
  let name = baseName
  let counter = 1
  while (used.has(name)) {
    name = `${baseName}_${counter}`
    counter += 1
  }
  used.add(name)
  return name
}

const decodeBase64 = (value: string): Buffer => Buffer.from(value, 'base64')

const getFilenameFromUrl = (value: string): string | null => {
  try {
    const pathname = new URL(value).pathname
    const base = basename(pathname)
    if (base && base !== '/' && base !== '.') return base
  } catch {
    return null
  }
  return null
}

const isHttpImportStep = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && value.robot === '/http/import'

const findImportStepName = (field: string, steps: Record<string, unknown>): string | null => {
  if (isHttpImportStep(steps[field])) return field
  const matches = Object.entries(steps).filter(([, step]) => isHttpImportStep(step))
  if (matches.length === 1) return matches[0]?.[0] ?? null
  return null
}

const downloadUrlToFile = async (url: string, filePath: string): Promise<void> => {
  await pipeline(got.stream(url), createWriteStream(filePath))
}

export const prepareInputFiles = async (
  options: PrepareInputFilesOptions = {},
): Promise<PrepareInputFilesResult> => {
  const {
    inputFiles = [],
    params = {},
    fields,
    base64Strategy = 'buffer',
    urlStrategy = 'import',
    maxBase64Bytes,
    tempDir,
  } = options

  let nextParams: CreateAssemblyParams = { ...params }
  const files: Record<string, string> = {}
  const uploads: Record<string, UploadInput> = {}
  const cleanup: Array<() => Promise<void>> = []

  if (fields && Object.keys(fields).length > 0) {
    nextParams = {
      ...nextParams,
      fields: {
        ...(isRecord(nextParams.fields) ? nextParams.fields : {}),
        ...fields,
      },
    }
  }

  const steps = isRecord(nextParams.steps) ? { ...nextParams.steps } : {}
  const usedSteps = new Set(Object.keys(steps))
  const usedFields = new Set<string>()
  const usedImportSteps = new Set<string>()

  let tempRoot: string | null = null
  const ensureTempRoot = async (): Promise<string> => {
    if (!tempRoot) {
      const root = await mkdtemp(join(tempDir ?? tmpdir(), 'transloadit-input-'))
      tempRoot = root
      cleanup.push(() => rm(root, { recursive: true, force: true }))
    }
    return tempRoot
  }

  try {
    for (const file of inputFiles) {
      ensureUnique(file.field, usedFields)
      if (file.kind === 'path') {
        files[file.field] = file.path
        continue
      }
      if (file.kind === 'base64') {
        const buffer = decodeBase64(file.base64)
        if (maxBase64Bytes && buffer.length > maxBase64Bytes) {
          throw new Error(`Base64 payload exceeds ${maxBase64Bytes} bytes.`)
        }
        if (base64Strategy === 'tempfile') {
          const root = await ensureTempRoot()
          const filename = file.filename || `${file.field}.bin`
          const filePath = join(root, filename)
          await writeFile(filePath, buffer)
          files[file.field] = filePath
        } else {
          uploads[file.field] = buffer
        }
        continue
      }
      if (file.kind === 'url') {
        const matchedStep = findImportStepName(file.field, steps)
        const availableStep = matchedStep && !usedImportSteps.has(matchedStep) ? matchedStep : null
        const shouldImport =
          urlStrategy === 'import' || (urlStrategy === 'import-if-present' && availableStep)

        if (shouldImport) {
          const stepName = availableStep ?? ensureUniqueStepName(file.field, usedSteps)
          const existing = isRecord(steps[stepName]) ? steps[stepName] : {}
          steps[stepName] = {
            ...existing,
            robot: '/http/import',
            url: file.url,
          }
          usedImportSteps.add(stepName)
          continue
        }

        const root = await ensureTempRoot()
        const filename =
          (file.filename ? basename(file.filename) : null) ??
          getFilenameFromUrl(file.url) ??
          `${file.field}.bin`
        const filePath = join(root, filename)
        await downloadUrlToFile(file.url, filePath)
        files[file.field] = filePath
      }
    }
  } catch (error) {
    await Promise.all(cleanup.map((fn) => fn()))
    throw error
  }

  if (Object.keys(steps).length > 0) {
    nextParams = {
      ...nextParams,
      steps,
    }
  }

  return {
    params: nextParams,
    files,
    uploads,
    cleanup,
  }
}
