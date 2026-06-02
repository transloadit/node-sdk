import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

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

function stringRecord(value: unknown, label: string): Record<string, string> {
  const record = requireRecord(value, label)
  return Object.fromEntries(
    Object.entries(record).map(([key, entryValue]) => [key, String(entryValue)]),
  )
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

async function loadScenario(): Promise<JsonRecord> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const parsed: unknown = JSON.parse(await readFile(scenarioPath, 'utf8'))

  return requireRecord(parsed, 'scenario')
}

function fileCount(scenario: JsonRecord): number {
  const { label, preparation } = featurePreparation(scenario, 'createTusAssembly')
  const input = requireRecord(preparation.input, `${label}.input`)

  return requireNumber(input.file_count, `${label}.input.file_count`)
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

async function writeResult(result: JsonRecord): Promise<void> {
  const resultPath = process.env.API2_SDK_EXAMPLE_RESULT
  if (!resultPath) {
    return
  }

  await writeFile(resultPath, `${JSON.stringify(result, undefined, 2)}\n`)
}

async function main(): Promise<void> {
  const scenario = await loadScenario()
  const upload = requireRecord(scenario.upload, 'upload')
  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const result = await client.uploadTusAssembly(
    fileCount(scenario),
    scenarioBytes(upload),
    requireString(upload.fieldName, 'upload.fieldName'),
    requireString(upload.fileName, 'upload.fileName'),
    stringRecord(upload.userMeta, 'upload.userMeta'),
  )

  await writeResult({
    createResponse: result.assembly,
    uploadUrl: result.uploadUrl,
    waitOk: result.assembly.ok,
  })

  console.log(
    `Node SDK devdock scenario ${requireString(scenario.scenarioId, 'scenarioId')} uploaded to ${result.uploadUrl}`,
  )
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
