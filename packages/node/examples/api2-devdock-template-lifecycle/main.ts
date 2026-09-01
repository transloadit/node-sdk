import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { ApiError, Transloadit } from '../../src/Transloadit.ts'

type JsonRecord = Record<string, unknown>

interface ScenarioContent {
  additionalProperties: JsonRecord
  steps: JsonRecord
}

interface TemplateConfig {
  content: ScenarioContent
  namePrefix: string
  requireSignatureAuth: boolean
}

interface UpdateConfig {
  content: ScenarioContent
  nameSuffix: string
  requireSignatureAuth: boolean
}

interface TemplateLifecycleScenario {
  delete: {
    errorCodeIncludes: string
  }
  list: {
    minimumCount: number
    pageSize: number
  }
  scenarioId: string
  template: TemplateConfig
  update: UpdateConfig
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

function scenarioContent(value: unknown, label: string): ScenarioContent {
  const content = requireRecord(value, label)

  return {
    additionalProperties: requireRecord(
      content.additionalProperties,
      `${label}.additionalProperties`,
    ),
    steps: requireRecord(content.steps, `${label}.steps`),
  }
}

function templateConfig(value: unknown, label: string): TemplateConfig {
  const config = requireRecord(value, label)

  return {
    content: scenarioContent(config.content, `${label}.content`),
    namePrefix: requireString(config.namePrefix, `${label}.namePrefix`),
    requireSignatureAuth: requireBoolean(
      config.requireSignatureAuth,
      `${label}.requireSignatureAuth`,
    ),
  }
}

function updateConfig(value: unknown, label: string): UpdateConfig {
  const config = requireRecord(value, label)

  return {
    content: scenarioContent(config.content, `${label}.content`),
    nameSuffix: requireString(config.nameSuffix, `${label}.nameSuffix`),
    requireSignatureAuth: requireBoolean(
      config.requireSignatureAuth,
      `${label}.requireSignatureAuth`,
    ),
  }
}

async function loadScenario(): Promise<TemplateLifecycleScenario> {
  const scenarioPath =
    process.env.API2_SDK_EXAMPLE_SCENARIO ?? path.join(import.meta.dirname, 'api2-scenario.json')
  const scenario = requireRecord(JSON.parse(await readFile(scenarioPath, 'utf8')), 'scenario')
  const list = requireRecord(scenario.list, 'scenario.list')
  const deleteConfig = requireRecord(scenario.delete, 'scenario.delete')

  return {
    delete: {
      errorCodeIncludes: requireString(
        deleteConfig.errorCodeIncludes,
        'scenario.delete.errorCodeIncludes',
      ),
    },
    list: {
      minimumCount: requireNumber(list.minimumCount, 'scenario.list.minimumCount'),
      pageSize: requireNumber(list.pageSize, 'scenario.list.pageSize'),
    },
    scenarioId: requireString(scenario.scenarioId, 'scenario.scenarioId'),
    template: templateConfig(scenario.template, 'scenario.template'),
    update: updateConfig(scenario.update, 'scenario.update'),
  }
}

function templatePayload(name: string, config: TemplateConfig | UpdateConfig): JsonRecord {
  return {
    name,
    require_signature_auth: config.requireSignatureAuth ? 1 : 0,
    template: {
      ...config.content.additionalProperties,
      steps: config.content.steps,
    },
  }
}

function requireTemplateId(value: unknown, label: string): string {
  const template = requireRecord(value, label)

  return requireString(template.id, `${label}.id`)
}

function templateResult(value: unknown): JsonRecord {
  const template = requireRecord(value, 'template response')
  const content = requireRecord(template.content, 'template response.content')
  const requireSignatureAuth = requireNumber(
    template.require_signature_auth,
    'template response.require_signature_auth',
  )

  return {
    content,
    id: requireString(template.id, 'template response.id'),
    name: requireString(template.name, 'template response.name'),
    requireSignatureAuth: requireSignatureAuth !== 0,
  }
}

async function deletedGetResult(client: Transloadit, templateId: string): Promise<JsonRecord> {
  try {
    await client.getTemplate(templateId)
    return {
      deletedErrorCode: '',
      deletedGetSucceeded: true,
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err
    }

    return {
      deletedErrorCode: err.code ?? '',
      deletedGetSucceeded: false,
    }
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

  const templateName = `${scenario.template.namePrefix}-${Date.now()}`
  const created = await client.createTemplate(templatePayload(templateName, scenario.template))
  const templateId = requireTemplateId(created, 'createTemplate response')
  let deleteTemplate = true

  try {
    const fetched = await client.getTemplate(templateId)
    const listed = await client.listTemplates({ pagesize: scenario.list.pageSize })
    const updatedTemplateName = `${templateName}${scenario.update.nameSuffix}`

    await client.editTemplate(templateId, templatePayload(updatedTemplateName, scenario.update))
    const updated = await client.getTemplate(templateId)

    await client.deleteTemplate(templateId)
    deleteTemplate = false

    await writeResult({
      ...(await deletedGetResult(client, templateId)),
      fetched: templateResult(fetched),
      listCount: listed.count,
      templateId,
      templateName,
      updated: templateResult(updated),
      updatedTemplateName,
    })
  } finally {
    if (deleteTemplate) {
      await client.deleteTemplate(templateId)
    }
  }

  console.log(`Node SDK devdock scenario ${scenario.scenarioId} passed for ${templateId}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
