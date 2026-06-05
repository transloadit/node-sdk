import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Transloadit } from '../../src/Transloadit.ts'

type JsonRecord = Record<string, unknown>

interface ExampleInput {
  scenarioId: string
  sdkFeatureInputs: {
    uploadTusAssembly: UploadTusAssemblyInput
  }
}

interface TusAssemblyScenario {
  exampleInput: ExampleInput
}

interface UploadConfig {
  content: string
  fieldname: string
  filename: string
  user_meta: Record<string, string>
}

interface UploadTusAssemblyInput {
  file_count: number
  upload: UploadConfig
}

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

function uploadConfig(value: unknown, label: string): UploadConfig {
  const config = requireRecord(value, label)

  return {
    content: requireString(config.content, `${label}.content`),
    fieldname: requireString(config.fieldname, `${label}.fieldname`),
    filename: requireString(config.filename, `${label}.filename`),
    user_meta: optionalStringRecord(config.user_meta, `${label}.user_meta`),
  }
}

function uploadTusAssemblyInput(value: unknown, label: string): UploadTusAssemblyInput {
  const input = requireRecord(value, label)

  return {
    file_count: requireNumber(input.file_count, `${label}.file_count`),
    upload: uploadConfig(input.upload, `${label}.upload`),
  }
}

function exampleInput(value: unknown, label: string): ExampleInput {
  const input = requireRecord(value, label)
  const sdkFeatureInputs = requireRecord(input.sdkFeatureInputs, `${label}.sdkFeatureInputs`)

  return {
    scenarioId: requireString(input.scenarioId, `${label}.scenarioId`),
    sdkFeatureInputs: {
      uploadTusAssembly: uploadTusAssemblyInput(
        sdkFeatureInputs.uploadTusAssembly,
        `${label}.sdkFeatureInputs.uploadTusAssembly`,
      ),
    },
  }
}

async function loadScenario(): Promise<TusAssemblyScenario> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const parsed: unknown = JSON.parse(await readFile(scenarioPath, 'utf8'))
  const scenario = requireRecord(parsed, 'scenario')

  return {
    exampleInput: exampleInput(scenario.exampleInput, 'scenario.exampleInput'),
  }
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
  const input = scenario.exampleInput.sdkFeatureInputs.uploadTusAssembly
  const upload = input.upload
  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const result = await client.uploadTusAssembly(
    input.file_count,
    Buffer.from(upload.content, 'utf8'),
    upload.fieldname,
    upload.filename,
    upload.user_meta,
  )

  await writeResult({
    createResponse: result.assembly,
    uploadUrl: result.uploadUrl,
    waitOk: result.assembly.ok,
  })

  console.log(
    `Node SDK devdock scenario ${scenario.exampleInput.scenarioId} uploaded to ${result.uploadUrl}`,
  )
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
