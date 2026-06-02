import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Upload } from 'tus-js-client'

import { Transloadit } from '../../src/Transloadit.ts'

type JsonRecord = Record<string, unknown>

function fail(message: string): never {
  throw new Error(message)
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    fail(`${name} must be set`)
  }

  return value
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    fail(`${label} must be an object`)
  }

  return value
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    fail(`${label} must be a string`)
  }

  return value
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${label} must be a number`)
  }

  return value
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`)
  }

  return value
}

function readPath(value: unknown, pathParts: readonly unknown[], label: string): unknown {
  let current = value
  for (const part of pathParts) {
    if (Array.isArray(current) && Number.isInteger(part)) {
      if (part >= current.length) {
        fail(`${label} path ${JSON.stringify(pathParts)} index ${part} is out of range`)
      }
      current = current[part]
      continue
    }

    if (isRecord(current) && typeof part === 'string') {
      if (!Object.hasOwn(current, part)) {
        fail(`${label} path ${JSON.stringify(pathParts)} is missing key ${JSON.stringify(part)}`)
      }
      current = current[part]
      continue
    }

    fail(`${label} path ${JSON.stringify(pathParts)} cannot read ${JSON.stringify(part)}`)
  }

  return current
}

function resolveValue(valueSpec: unknown, context: JsonRecord, label: string): unknown {
  const spec = requireRecord(valueSpec, label)
  if (Object.hasOwn(spec, 'value')) {
    return spec.value
  }

  const source = requireRecord(spec.source, `${label}.source`)
  const root = requireString(source.root, `${label}.source.root`)
  const pathParts = requireArray(source.path, `${label}.source.path`)
  if (!Object.hasOwn(context, root)) {
    fail(`${label} value source root ${JSON.stringify(root)} is unavailable`)
  }

  return readPath(context[root], pathParts, label)
}

function featurePreparation(
  scenario: JsonRecord,
  featureId: string,
): { label: string; preparation: JsonRecord } {
  const preparations = requireArray(scenario.preparations, 'preparations')
  for (const [index, rawPreparation] of preparations.entries()) {
    const label = `preparations[${index}]`
    const preparation = requireRecord(rawPreparation, label)
    if (requireString(preparation.featureId, `${label}.featureId`) !== featureId) {
      continue
    }

    if (requireString(preparation.kind, `${label}.kind`) !== 'feature-call') {
      fail(`${label} must be a feature-call preparation`)
    }

    return { label, preparation }
  }

  fail(`scenario has no preparation for feature ${JSON.stringify(featureId)}`)
}

function scalarString(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}

async function loadScenario(): Promise<JsonRecord> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const parsed: unknown = JSON.parse(await readFile(scenarioPath, 'utf8'))

  return requireRecord(parsed, 'scenario')
}

function scenarioBytes(uploadConfig: JsonRecord): Buffer {
  const source = requireRecord(uploadConfig.source, 'upload.source')
  const kind = requireString(source.kind, 'upload.source.kind')
  const encoding = requireString(source.encoding, 'upload.source.encoding')
  if (kind !== 'bytes') {
    fail(`unsupported scenario source kind ${JSON.stringify(kind)}`)
  }

  if (encoding !== 'utf8') {
    fail(`unsupported scenario source encoding ${JSON.stringify(encoding)}`)
  }

  return Buffer.from(requireString(source.value, 'upload.source.value'), 'utf8')
}

function uploadMetadata(
  uploadConfig: JsonRecord,
  scenario: JsonRecord,
  createResponse: JsonRecord,
): Record<string, string> {
  const context = { createResponse, scenario }
  const metadata: Record<string, string> = {}
  for (const fieldValue of requireArray(uploadConfig.metadata, 'upload.metadata')) {
    const field = requireRecord(fieldValue, 'upload.metadata[]')
    const name = requireString(field.name, 'upload.metadata[].name')
    metadata[name] = scalarString(resolveValue(field.value, context, `upload.metadata.${name}`))
  }

  return metadata
}

function retryDelays(retries: unknown): number[] {
  const retryCount = requireNumber(retries, 'upload.retries')
  if (!Number.isInteger(retryCount) || retryCount < 0) {
    fail(`unsupported retry count ${JSON.stringify(retryCount)}`)
  }

  return Array.from({ length: retryCount }, () => 0)
}

async function uploadWithTus(scenario: JsonRecord, createResponse: JsonRecord): Promise<string> {
  const uploadConfig = requireRecord(scenario.upload, 'upload')
  const context = { createResponse, scenario }
  const endpoint = scalarString(resolveValue(uploadConfig.tusUrl, context, 'upload.tusUrl'))
  const content = scenarioBytes(uploadConfig)
  if (uploadConfig.chunkSize !== 'full-file') {
    fail(`unsupported chunk size policy ${JSON.stringify(uploadConfig.chunkSize)}`)
  }

  return await new Promise<string>((resolve, reject) => {
    let upload: Upload | null = null
    upload = new Upload(content, {
      endpoint,
      chunkSize: content.length,
      metadata: uploadMetadata(uploadConfig, scenario, createResponse),
      retryDelays: retryDelays(uploadConfig.retries),
      onError: reject,
      onSuccess: () => {
        if (!upload?.url) {
          reject(new Error('TUS upload did not expose an upload URL'))
          return
        }

        resolve(upload.url)
      },
    })

    upload.start()
  })
}

async function writeResult(result: JsonRecord): Promise<void> {
  const resultPath = process.env.API2_SDK_EXAMPLE_RESULT
  if (!resultPath) {
    return
  }

  await writeFile(resultPath, `${JSON.stringify(result, undefined, 2)}\n`)
}

async function main(): Promise<void> {
  const scenario = await loadScenario()
  const { label: createTusAssemblyLabel, preparation: createTusAssembly } = featurePreparation(
    scenario,
    'createTusAssembly',
  )
  const createInput = requireRecord(createTusAssembly.input, `${createTusAssemblyLabel}.input`)

  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const createResponse = requireRecord(
    await client.createTusAssembly(requireNumber(createInput.file_count, 'file_count')),
    'createTusAssembly response',
  )
  const uploadUrl = await uploadWithTus(scenario, createResponse)
  const status = requireRecord(
    await client.waitForAssembly(
      requireString(createResponse.assembly_ssl_url, 'createTusAssembly response.assembly_ssl_url'),
    ),
    'waitForAssembly response',
  )

  await writeResult({
    createResponse,
    uploadUrl,
    waitOk: status.ok,
  })

  console.log(
    `Node SDK devdock scenario ${requireString(scenario.scenarioId, 'scenarioId')} uploaded to ${uploadUrl}`,
  )
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
