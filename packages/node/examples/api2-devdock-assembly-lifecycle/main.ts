import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Transloadit } from '../../src/Transloadit.ts'

type JsonRecord = Record<string, unknown>

interface AssemblyLifecycleScenario {
  assembly: {
    fileCount: number
  }
  list: {
    minimumCount: number
    pageSize: number
  }
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

async function loadScenario(): Promise<AssemblyLifecycleScenario> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const scenario = requireRecord(JSON.parse(await readFile(scenarioPath, 'utf8')), 'scenario')
  const assembly = requireRecord(scenario.assembly, 'scenario.assembly')
  const list = requireRecord(scenario.list, 'scenario.list')

  return {
    assembly: {
      fileCount: requireNumber(assembly.fileCount, 'scenario.assembly.fileCount'),
    },
    list: {
      minimumCount: requireNumber(list.minimumCount, 'scenario.list.minimumCount'),
      pageSize: requireNumber(list.pageSize, 'scenario.list.pageSize'),
    },
    scenarioId: requireString(scenario.scenarioId, 'scenario.scenarioId'),
  }
}

function assemblyResult(value: JsonRecord): JsonRecord {
  return {
    assemblyId: value.assembly_id,
    assemblySslUrl: value.assembly_ssl_url,
    assemblyUrl: value.assembly_url,
    ok: value.ok,
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
  const client = new Transloadit({
    authKey: requiredEnv('TRANSLOADIT_KEY'),
    authSecret: requiredEnv('TRANSLOADIT_SECRET'),
    endpoint: requiredEnv('TRANSLOADIT_ENDPOINT'),
  })

  const created = await client.createTusAssembly(scenario.assembly.fileCount)
  const assemblyId = requireString(created.assembly_id, 'createTusAssembly response.assembly_id')
  let cancelOnExit = true

  try {
    const fetched = await client.getAssembly(assemblyId)
    const listed = await client.listAssemblies({
      assembly_id: assemblyId,
      pagesize: scenario.list.pageSize,
    })
    const cancelled = await client.cancelAssembly(assemblyId)
    cancelOnExit = false

    await writeResult({
      cancelled: assemblyResult(cancelled),
      created: assemblyResult(created),
      fetched: assemblyResult(fetched),
      listContainsCreated: listed.items.some((assembly) => assembly.id === assemblyId),
      listCount: listed.count,
    })
  } finally {
    if (cancelOnExit) {
      await client.cancelAssembly(assemblyId)
    }
  }

  console.log(`Node SDK devdock scenario ${scenario.scenarioId} canceled Assembly ${assemblyId}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
