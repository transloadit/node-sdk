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

function optionalStringRecord(value: unknown, label: string): Record<string, string> {
  if (value == null) {
    return {}
  }

  return stringRecord(value, label)
}

function sdkFeatureCall(
  scenario: JsonRecord,
  featureId: string,
): { featureCall: JsonRecord; label: string } {
  const featureCalls = requireArray(scenario.sdkFeatureCalls, 'sdkFeatureCalls')
  for (const [index, rawFeatureCall] of featureCalls.entries()) {
    const label = `sdkFeatureCalls[${index}]`
    const featureCall = requireRecord(rawFeatureCall, label)
    if (requireString(featureCall.featureId, `${label}.featureId`) !== featureId) {
      continue
    }

    if (requireString(featureCall.kind, `${label}.kind`) !== 'sdk-feature-call') {
      fail(`${label} must be an sdk-feature-call`)
    }

    return { featureCall, label }
  }

  fail(`scenario has no SDK feature call for feature ${JSON.stringify(featureId)}`)
}

async function loadScenario(): Promise<JsonRecord> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const parsed: unknown = JSON.parse(await readFile(scenarioPath, 'utf8'))

  return requireRecord(parsed, 'scenario')
}

function uploadTusAssemblyInput(scenario: JsonRecord): JsonRecord {
  const { featureCall, label } = sdkFeatureCall(scenario, 'uploadTusAssembly')

  return requireRecord(featureCall.input, `${label}.input`)
}

function scenarioBytes(uploadConfig: JsonRecord): Buffer {
  return Buffer.from(
    requireString(uploadConfig.content, 'sdkFeatureCalls.uploadTusAssembly.input.upload.content'),
    'utf8',
  )
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
  const input = uploadTusAssemblyInput(scenario)
  const upload = requireRecord(input.upload, 'sdkFeatureCalls.uploadTusAssembly.input.upload')
  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const result = await client.uploadTusAssembly(
    requireNumber(input.file_count, 'sdkFeatureCalls.uploadTusAssembly.input.file_count'),
    scenarioBytes(upload),
    requireString(upload.fieldname, 'sdkFeatureCalls.uploadTusAssembly.input.upload.fieldname'),
    requireString(upload.filename, 'sdkFeatureCalls.uploadTusAssembly.input.upload.filename'),
    optionalStringRecord(
      upload.user_meta,
      'sdkFeatureCalls.uploadTusAssembly.input.upload.user_meta',
    ),
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
