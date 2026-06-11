// Run the API2 contract TUS resume scenario against a devdock API2 server.
//
// This example is intentionally checked into the SDK repository: it reads the
// API/TUS facts from API2's injected scenario JSON, interrupts an upload like
// an unlucky user would, and resumes it through the public SDK method.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Transloadit } from '../../src/Transloadit.ts'

type JsonRecord = Record<string, unknown>

interface MetadataField {
  name: string
  value: unknown
}

interface ResumePlan {
  fingerprint: string
  removeFingerprintOnSuccess: boolean
  stopAfterAcceptedBytes: number
}

interface ResumeUploadScenario {
  createResponse: JsonRecord
  scenario: JsonRecord
  scenarioId: string
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

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    fail(`${label} must be a boolean`)
  }

  return value
}

async function loadScenario(): Promise<ResumeUploadScenario> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const scenario = requireRecord(JSON.parse(await readFile(scenarioPath, 'utf8')), 'scenario')
  const exampleInput = requireRecord(scenario.exampleInput, 'scenario.exampleInput')
  const prepared = requireRecord(scenario.prepared, 'scenario.prepared')

  return {
    createResponse: requireRecord(prepared.createResponse, 'scenario.prepared.createResponse'),
    scenario,
    scenarioId: requireString(exampleInput.scenarioId, 'scenario.exampleInput.scenarioId'),
  }
}

function resolveValue(valueSpec: unknown, context: JsonRecord, label: string): unknown {
  const spec = requireRecord(valueSpec, `${label} value spec`)
  if ('value' in spec) {
    return spec.value
  }

  const source = requireRecord(spec.source, `${label} value source`)
  const root = requireString(source.root, `${label} value source root`)
  let current: unknown = context[root] ?? fail(`${label} value source root is unavailable`)
  if (!Array.isArray(source.path)) {
    fail(`${label} value source path must be an array`)
  }
  for (const part of source.path) {
    const record = requireRecord(current, `${label} value source step`)
    current = record[String(part)]
  }

  return current
}

function scenarioBytes(upload: JsonRecord): Buffer {
  const source = requireRecord(upload.source, 'upload.source')
  if (source.kind !== 'bytes') {
    fail('upload.source.kind must be bytes')
  }
  if (source.encoding !== 'utf8') {
    fail('upload.source.encoding must be utf8')
  }

  return Buffer.from(requireString(source.value, 'upload.source.value'), 'utf8')
}

function resumePlan(upload: JsonRecord): ResumePlan {
  const resume = requireRecord(upload.resume, 'upload.resume')

  return {
    fingerprint: requireString(resume.fingerprint, 'upload.resume.fingerprint'),
    removeFingerprintOnSuccess: requireBoolean(
      resume.removeFingerprintOnSuccess,
      'upload.resume.removeFingerprintOnSuccess',
    ),
    stopAfterAcceptedBytes: requireNumber(
      resume.stopAfterAcceptedBytes,
      'upload.resume.stopAfterAcceptedBytes',
    ),
  }
}

function uploadMetadata(upload: JsonRecord, context: JsonRecord): Map<string, string> {
  const metadata = new Map<string, string>()
  if (!Array.isArray(upload.metadata)) {
    fail('upload.metadata must be an array')
  }
  for (const fieldValue of upload.metadata) {
    const fieldRecord = requireRecord(fieldValue, 'upload.metadata field')
    const field: MetadataField = {
      name: requireString(fieldRecord.name, 'upload.metadata field.name'),
      value: fieldRecord.value,
    }
    metadata.set(field.name, String(resolveValue(field.value, context, field.name)))
  }

  return metadata
}

// Create a TUS upload and only send the first chunk, leaving the upload
// interrupted the way a dropped connection would.
async function createInterruptedUpload({
  content,
  metadata,
  stopAfterAcceptedBytes,
  tusUrl,
}: {
  content: Buffer
  metadata: Map<string, string>
  stopAfterAcceptedBytes: number
  tusUrl: string
}): Promise<string> {
  const metadataParts: string[] = []
  for (const [name, value] of metadata) {
    metadataParts.push(`${name} ${Buffer.from(value, 'utf8').toString('base64')}`)
  }
  const createResponse = await fetch(tusUrl, {
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(content.length),
      'Upload-Metadata': metadataParts.join(','),
    },
    method: 'POST',
  })
  if (createResponse.status !== 201) {
    fail(`TUS create returned HTTP ${createResponse.status}, expected 201`)
  }
  const location = createResponse.headers.get('location')
  if (!location) {
    fail('TUS create did not return a Location header')
  }
  const uploadUrl = new URL(location, tusUrl).toString()

  const patchResponse = await fetch(uploadUrl, {
    body: new Uint8Array(content.subarray(0, stopAfterAcceptedBytes)),
    headers: {
      'Content-Type': 'application/offset+octet-stream',
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
    },
    method: 'PATCH',
  })
  if (patchResponse.status !== 204) {
    fail(`TUS first chunk returned HTTP ${patchResponse.status}, expected 204`)
  }
  const acceptedBytes = Number(patchResponse.headers.get('upload-offset'))
  if (acceptedBytes !== stopAfterAcceptedBytes) {
    fail(`TUS first chunk accepted ${acceptedBytes} bytes, expected ${stopAfterAcceptedBytes}`)
  }

  return uploadUrl
}

async function writeResult(result: JsonRecord): Promise<void> {
  const resultPath = process.env.API2_SDK_EXAMPLE_RESULT
  if (!resultPath) {
    return
  }

  await writeFile(resultPath, `${JSON.stringify(result, undefined, 2)}\n`)
}

async function main(): Promise<void> {
  const { createResponse, scenario, scenarioId } = await loadScenario()
  const upload = requireRecord(scenario.upload, 'scenario.upload')
  const resume = resumePlan(upload)
  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const context: JsonRecord = { createResponse, scenario }
  const content = scenarioBytes(upload)
  const tusUrl = requireString(resolveValue(upload.tusUrl, context, 'upload.tusUrl'), 'tusUrl')
  const metadata = uploadMetadata(upload, context)

  const firstUploadUrl = await createInterruptedUpload({
    content,
    metadata,
    stopAfterAcceptedBytes: resume.stopAfterAcceptedBytes,
    tusUrl,
  })

  // Remember the interrupted upload by fingerprint, like a TUS client URL storage would.
  const storedUploads = new Map<string, string>([[resume.fingerprint, firstUploadUrl]])
  const previousUploadCount = storedUploads.size

  const storedUploadUrl =
    storedUploads.get(resume.fingerprint) ?? fail('stored upload URL is unavailable')
  const assemblySslUrl = requireString(
    createResponse.assembly_ssl_url,
    'createResponse.assembly_ssl_url',
  )
  const completedAssembly = await client.resumeTusUpload(storedUploadUrl, content, assemblySslUrl)
  if (completedAssembly.error) {
    fail(`resumeTusUpload returned ${completedAssembly.error}: ${completedAssembly.message ?? ''}`)
  }

  if (resume.removeFingerprintOnSuccess) {
    storedUploads.delete(resume.fingerprint)
  }
  const remainingPreviousUploadCount = storedUploads.size

  await writeResult({
    firstUploadUrl,
    previousUploadCount,
    remainingPreviousUploadCount,
    uploadUrl: firstUploadUrl,
  })

  console.log(`Node SDK devdock scenario ${scenarioId} resumed ${firstUploadUrl}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
