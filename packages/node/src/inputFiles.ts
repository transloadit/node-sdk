import * as dnsPromises from 'node:dns/promises'
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, join, parse } from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type CacheableLookup from 'cacheable-lookup'
import type { EntryObject, IPFamily } from 'cacheable-lookup'
import got from 'got'
import type { Input as IntoStreamInput } from 'into-stream'
import type { CreateAssemblyParams } from './apiTypes.ts'
import { ensureUniqueCounterValue } from './ensureUniqueCounter.ts'

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

const ensureUniqueStepName = async (baseName: string, used: Set<string>): Promise<string> =>
  await ensureUniqueCounterValue({
    initialValue: baseName,
    isTaken: (candidate) => used.has(candidate),
    reserve: (candidate) => used.add(candidate),
    nextValue: (counter) => `${baseName}_${counter}`,
    scope: used,
  })

const ensureUniqueTempFilePath = async (
  root: string,
  filename: string,
  used: Set<string>,
): Promise<string> => {
  const parsedFilename = parse(basename(filename))
  return await ensureUniqueCounterValue({
    initialValue: join(root, parsedFilename.base),
    isTaken: (candidate) => used.has(candidate),
    reserve: (candidate) => used.add(candidate),
    nextValue: (counter) => join(root, `${parsedFilename.name}-${counter}${parsedFilename.ext}`),
    scope: used,
  })
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

const MAX_URL_REDIRECTS = 10

const isRedirectStatusCode = (statusCode: number): boolean =>
  statusCode === 301 ||
  statusCode === 302 ||
  statusCode === 303 ||
  statusCode === 307 ||
  statusCode === 308

const ipv4FromMappedIpv6 = (address: string): string | null => {
  const lowerAddress = address.toLowerCase()
  const mappedPrefix = lowerAddress.startsWith('::ffff:')
    ? '::ffff:'
    : lowerAddress.startsWith('0:0:0:0:0:ffff:')
      ? '0:0:0:0:0:ffff:'
      : null

  if (mappedPrefix == null) {
    return null
  }

  const mappedValue = lowerAddress.slice(mappedPrefix.length)
  if (mappedValue.includes('.')) {
    return mappedValue
  }

  const segments = mappedValue.split(':')
  if (segments.length !== 2) {
    return null
  }

  const values = segments.map((segment) => Number.parseInt(segment, 16))
  if (values.some((value) => Number.isNaN(value) || value < 0 || value > 0xffff)) {
    return null
  }

  return values.flatMap((value) => [(value >> 8) & 0xff, value & 0xff]).join('.')
}

const isPrivateIp = (address: string): boolean => {
  const normalizedAddress =
    address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address
  if (normalizedAddress === 'localhost') return true
  const family = isIP(normalizedAddress)
  if (family === 4) {
    const parts = normalizedAddress.split('.').map((chunk) => Number(chunk))
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
    const normalized =
      normalizedAddress.toLowerCase().split('%')[0] ?? normalizedAddress.toLowerCase()
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true
    const mappedAddress = ipv4FromMappedIpv6(normalized)
    if (mappedAddress != null && isPrivateIp(mappedAddress)) {
      return true
    }
    if (normalized.startsWith('fe80:')) return true
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
    return false
  }
  return false
}

const resolvePublicDownloadAddress = async (
  value: string,
): Promise<{ address: string; family: 4 | 6 }> => {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`URL downloads are limited to http/https: ${value}`)
  }
  if (isPrivateIp(parsed.hostname)) {
    throw new Error(`URL downloads are limited to public hosts: ${value}`)
  }

  const resolvedAddresses = await dnsPromises.lookup(parsed.hostname, {
    all: true,
    verbatim: true,
  })
  if (resolvedAddresses.some((address) => isPrivateIp(address.address))) {
    throw new Error(`URL downloads are limited to public hosts: ${value}`)
  }

  const firstAddress = resolvedAddresses[0]
  if (firstAddress == null) {
    throw new Error(`Unable to resolve URL hostname: ${value}`)
  }

  return {
    address: firstAddress.address,
    family: firstAddress.family as 4 | 6,
  }
}

const downloadUrlToFile = async ({
  allowPrivateUrls,
  filePath,
  url,
}: {
  allowPrivateUrls: boolean
  filePath: string
  url: string
}): Promise<void> => {
  let currentUrl = url

  for (let redirectCount = 0; redirectCount <= MAX_URL_REDIRECTS; redirectCount += 1) {
    let validatedAddress: { address: string; family: 4 | 6 } | null = null
    if (!allowPrivateUrls) {
      validatedAddress = await resolvePublicDownloadAddress(currentUrl)
    }

    const dnsLookup: CacheableLookup['lookup'] | undefined =
      validatedAddress == null ? undefined : createPinnedDnsLookup(validatedAddress)

    const responseStream = got.stream(currentUrl, {
      dnsLookup,
      followRedirect: false,
      retry: { limit: 0 },
      throwHttpErrors: false,
    })

    const response = await new Promise<
      Readable & { headers: Record<string, string>; statusCode?: number }
    >((resolvePromise, reject) => {
      responseStream.once('response', (incomingResponse) => {
        resolvePromise(
          incomingResponse as Readable & {
            headers: Record<string, string>
            statusCode?: number
          },
        )
      })
      responseStream.once('error', reject)
    })

    const statusCode = response.statusCode ?? 0
    if (isRedirectStatusCode(statusCode)) {
      responseStream.destroy()
      const location = response.headers.location
      if (location == null) {
        throw new Error(`Redirect response missing Location header: ${currentUrl}`)
      }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    if (statusCode >= 400) {
      responseStream.destroy()
      throw new Error(`Failed to download URL: ${currentUrl} (${statusCode})`)
    }

    await pipeline(responseStream, createWriteStream(filePath))
    return
  }

  throw new Error(`Too many redirects while downloading URL input: ${url}`)
}

function createPinnedDnsLookup(validatedAddress: {
  address: string
  family: 4 | 6
}): CacheableLookup['lookup'] {
  function pinnedDnsLookup(
    _hostname: string,
    family: IPFamily,
    callback: (error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void,
  ): void
  function pinnedDnsLookup(
    _hostname: string,
    callback: (error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void,
  ): void
  function pinnedDnsLookup(
    _hostname: string,
    options: { all: true },
    callback: (error: NodeJS.ErrnoException | null, result: ReadonlyArray<EntryObject>) => void,
  ): void
  function pinnedDnsLookup(
    _hostname: string,
    options: object,
    callback: (error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void,
  ): void
  function pinnedDnsLookup(
    _hostname: string,
    familyOrCallback:
      | IPFamily
      | object
      | ((error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void),
    callback?:
      | ((error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void)
      | ((error: NodeJS.ErrnoException | null, result: ReadonlyArray<EntryObject>) => void),
  ): void {
    if (typeof familyOrCallback === 'function') {
      familyOrCallback(null, validatedAddress.address, validatedAddress.family)
      return
    }

    if (
      typeof familyOrCallback === 'object' &&
      familyOrCallback != null &&
      'all' in familyOrCallback
    ) {
      ;(
        callback as (
          error: NodeJS.ErrnoException | null,
          result: ReadonlyArray<EntryObject>,
        ) => void
      )(null, [{ address: validatedAddress.address, family: validatedAddress.family, expires: 0 }])
      return
    }

    ;(callback as (error: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void)(
      null,
      validatedAddress.address,
      validatedAddress.family,
    )
  }

  return pinnedDnsLookup
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
  const usedTempPaths = new Set<string>()
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
          const filePath = await ensureUniqueTempFilePath(root, filename, usedTempPaths)
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
          const stepName = targetStep ?? (await ensureUniqueStepName(file.field, usedSteps))
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
        const filePath = await ensureUniqueTempFilePath(root, filename, usedTempPaths)
        await downloadUrlToFile({
          allowPrivateUrls,
          filePath,
          url: file.url,
        })
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
