import { createWriteStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
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
  allowPrivateUrls?: boolean
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

const estimateBase64DecodedBytes = (value: string): number => {
  const trimmed = value.trim()
  if (!trimmed) return 0
  let padding = 0
  if (trimmed.endsWith('==')) padding = 2
  else if (trimmed.endsWith('=')) padding = 1
  return Math.floor((trimmed.length * 3) / 4) - padding
}

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

const isPrivateIp = (address: string): boolean => {
  if (address === 'localhost') return true
  const family = isIP(address)
  if (family === 4) {
    const parts = address.split('.').map((chunk) => Number(chunk))
    const [a, b] = parts
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  if (family === 6) {
    const normalized = address.toLowerCase()
    if (normalized === '::1') return true
    if (normalized.startsWith('fe80:')) return true
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
    return false
  }
  return false
}

const assertPublicDownloadUrl = (value: string): void => {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`URL downloads are limited to http/https: ${value}`)
  }
  if (isPrivateIp(parsed.hostname)) {
    throw new Error(`URL downloads are limited to public hosts: ${value}`)
  }
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
    allowPrivateUrls = true,
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
  const importUrlsByStep = new Map<string, string[]>()
  const importStepNames = Object.keys(steps).filter((name) => isHttpImportStep(steps[name]))
  const sharedImportStep = importStepNames.length === 1 ? importStepNames[0] : null

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
        if (maxBase64Bytes) {
          const estimated = estimateBase64DecodedBytes(file.base64)
          if (estimated > maxBase64Bytes) {
            throw new Error(`Base64 payload exceeds ${maxBase64Bytes} bytes.`)
          }
        }
        const buffer = decodeBase64(file.base64)
        if (maxBase64Bytes && buffer.length > maxBase64Bytes) {
          throw new Error(`Base64 payload exceeds ${maxBase64Bytes} bytes.`)
        }
        if (base64Strategy === 'tempfile') {
          const root = await ensureTempRoot()
          const filename = file.filename ? basename(file.filename) : `${file.field}.bin`
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
        const targetStep = matchedStep ?? sharedImportStep
        const shouldImport =
          urlStrategy === 'import' || (urlStrategy === 'import-if-present' && targetStep)

        if (shouldImport) {
          const stepName = targetStep ?? ensureUniqueStepName(file.field, usedSteps)
          const urls = importUrlsByStep.get(stepName) ?? []
          urls.push(file.url)
          importUrlsByStep.set(stepName, urls)
          continue
        }

        const root = await ensureTempRoot()
        const filename =
          (file.filename ? basename(file.filename) : null) ??
          getFilenameFromUrl(file.url) ??
          `${file.field}.bin`
        const filePath = join(root, filename)
        if (!allowPrivateUrls) {
          assertPublicDownloadUrl(file.url)
        }
        await downloadUrlToFile(file.url, filePath)
        files[file.field] = filePath
      }
    }
  } catch (error) {
    await Promise.all(cleanup.map((fn) => fn()))
    throw error
  }

  if (Object.keys(steps).length > 0 || importUrlsByStep.size > 0) {
    if (importUrlsByStep.size > 0) {
      for (const [stepName, urls] of importUrlsByStep.entries()) {
        const existing = isRecord(steps[stepName]) ? steps[stepName] : {}
        steps[stepName] = {
          ...existing,
          robot: '/http/import',
          url: urls.length === 1 ? urls[0] : urls,
        }
      }
    }

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
