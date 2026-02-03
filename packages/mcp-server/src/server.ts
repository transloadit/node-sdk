import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { CreateAssemblyParams, LintAssemblyInstructionsResult } from '@transloadit/node'
import {
  extractFieldNamesFromTemplate,
  getRobotHelp,
  listRobots,
  mergeTemplateContent,
  prepareInputFiles,
  Transloadit,
} from '@transloadit/node'
import { z } from 'zod'
import packageJson from '../package.json' with { type: 'json' }
import { extractBearerToken } from './http-helpers.ts'

export type TransloaditMcpServerOptions = {
  authKey?: string
  authSecret?: string
  mcpToken?: string
  endpoint?: string
  serverName?: string
  serverVersion?: string
}

type LintIssueOutput = {
  path: string
  message: string
  severity: 'error' | 'warning'
  hint?: string
}

type UploadSummary = {
  status: 'none' | 'uploading' | 'complete'
  total_files: number
  resumed?: boolean
  upload_urls?: Record<string, string>
}

type HeaderMap = Record<string, string | string[] | undefined>

type ToolExtra = {
  requestInfo?: {
    headers?: HeaderMap
  }
}

const maxBase64Bytes = 512_000
type BuiltinTemplate = {
  slug: string
  version: string
  description: string
  steps: Record<string, unknown>
}

type LintAssemblyInstructionsInput = Parameters<Transloadit['lintAssemblyInstructions']>[0]

const lintIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  hint: z.string().optional(),
})

const toolMessageSchema = z.object({
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
  path: z.string().optional(),
})

const listRobotsInputSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().optional(),
  cursor: z.string().optional(),
})

const listRobotsOutputSchema = z.object({
  status: z.literal('ok'),
  robots: z.array(
    z.object({
      name: z.string(),
      title: z.string().optional(),
      summary: z.string(),
      category: z.string().optional(),
    }),
  ),
  next_cursor: z.string().optional(),
})

const robotParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
})

const getRobotHelpInputSchema = z.object({
  robot_name: z.string(),
  detail_level: z.enum(['summary', 'params', 'examples']).optional(),
})

const getRobotHelpOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  robot: z.object({
    name: z.string(),
    summary: z.string(),
    required_params: z.array(robotParamSchema),
    optional_params: z.array(robotParamSchema),
    examples: z
      .array(
        z.object({
          description: z.string(),
          snippet: z.record(z.string(), z.unknown()),
        }),
      )
      .optional(),
  }),
})

const inputFileSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('path'),
    field: z.string(),
    path: z.string(),
  }),
  z.object({
    kind: z.literal('base64'),
    field: z.string(),
    base64: z.string(),
    filename: z.string(),
    contentType: z.string().optional(),
  }),
  z.object({
    kind: z.literal('url'),
    field: z.string(),
    url: z.string(),
    filename: z.string().optional(),
    contentType: z.string().optional(),
  }),
])

const createAssemblyInputSchema = z.object({
  instructions: z.unknown().optional(),
  files: z.array(inputFileSchema).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  wait_for_completion: z.boolean().optional(),
  wait_timeout_ms: z.number().int().positive().optional(),
  upload_concurrency: z.number().int().positive().optional(),
  upload_chunk_size: z.number().int().positive().optional(),
  upload_behavior: z.enum(['await', 'background', 'none']).optional(),
  expected_uploads: z.number().int().positive().optional(),
  assembly_url: z.string().optional(),
})

const createAssemblyOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  assembly: z.unknown().optional(),
  upload: z
    .object({
      status: z.enum(['none', 'uploading', 'complete']),
      total_files: z.number().int().nonnegative(),
      resumed: z.boolean().optional(),
      upload_urls: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  next_steps: z.array(z.string()).optional(),
  errors: z.array(toolMessageSchema).optional(),
  warnings: z.array(toolMessageSchema).optional(),
})

const getAssemblyStatusInputSchema = z.object({
  assembly_url: z.string().optional(),
  assembly_id: z.string().optional(),
})

const getAssemblyStatusOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  assembly: z.unknown().optional(),
  errors: z.array(toolMessageSchema).optional(),
  warnings: z.array(toolMessageSchema).optional(),
})

const waitForAssemblyInputSchema = z.object({
  assembly_url: z.string().optional(),
  assembly_id: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
  poll_interval_ms: z.number().int().positive().optional(),
})

const waitForAssemblyOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  assembly: z.unknown().optional(),
  waited_ms: z.number().int().nonnegative().optional(),
  errors: z.array(toolMessageSchema).optional(),
  warnings: z.array(toolMessageSchema).optional(),
})

const listBuiltinTemplatesInputSchema = z.object({})

const listBuiltinTemplatesOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  templates: z.array(
    z.object({
      slug: z.string(),
      version: z.string(),
      description: z.string(),
      steps: z.record(z.string(), z.unknown()),
    }),
  ),
  errors: z.array(toolMessageSchema).optional(),
  warnings: z.array(toolMessageSchema).optional(),
})

const lintAssemblyInputSchema = z.object({
  instructions: z.unknown(),
  strict: z.boolean().optional(),
  return_fixed: z.boolean().optional(),
})

const lintAssemblyOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  linting_issues: z.array(lintIssueSchema),
  normalized_instructions: z.unknown().optional(),
})

const toLintIssues = (issues: LintAssemblyInstructionsResult['issues']): LintIssueOutput[] =>
  issues.map((issue) => ({
    path: issue.stepName ? `steps.${issue.stepName}` : 'instructions',
    message: issue.summary,
    severity: issue.type,
    hint: issue.desc && issue.desc !== issue.summary ? issue.desc : undefined,
  }))

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const buildToolResponse = (payload: Record<string, unknown>): CallToolResult => {
  const content: TextContent = {
    type: 'text',
    text: JSON.stringify(payload),
  }

  return {
    content: [content],
    structuredContent: payload,
  }
}

const buildToolError = (
  code: string,
  message: string,
  options: { hint?: string; path?: string } = {},
) =>
  buildToolResponse({
    status: 'error',
    errors: [
      {
        code,
        message,
        hint: options.hint,
        path: options.path,
      },
    ],
  })

const createLintClient = (options: TransloaditMcpServerOptions): Transloadit =>
  new Transloadit({
    authKey: options.authKey ?? 'mcp',
    authSecret: options.authSecret ?? 'mcp',
    endpoint: options.endpoint,
  })

const getHeaderValue = (headers: HeaderMap | undefined, name: string): string | undefined => {
  if (!headers) return undefined
  const normalized = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== normalized) continue
    if (Array.isArray(value)) return value[0]
    return value
  }
  return undefined
}

const getBearerToken = (headers: HeaderMap | undefined): string | undefined =>
  extractBearerToken(getHeaderValue(headers, 'authorization'))

type LiveClientResult = { client: Transloadit } | { error: ReturnType<typeof buildToolError> }

const createLiveClient = (
  options: TransloaditMcpServerOptions,
  extra: ToolExtra,
): LiveClientResult => {
  const token = getBearerToken(extra.requestInfo?.headers)
  const authToken = token && token !== options.mcpToken ? token : undefined

  if (authToken) {
    return {
      client: new Transloadit({
        authToken,
        authKey: options.authKey,
        authSecret: options.authSecret,
        endpoint: options.endpoint,
      }),
    }
  }

  if (!options.authKey || !options.authSecret) {
    return {
      error: buildToolError(
        'mcp_missing_auth',
        'Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET or Authorization: Bearer token for live API calls.',
      ),
    }
  }

  return {
    client: new Transloadit({
      authKey: options.authKey,
      authSecret: options.authSecret,
      endpoint: options.endpoint,
    }),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isErrnoException = (value: unknown): value is NodeJS.ErrnoException =>
  isRecord(value) && typeof value.code === 'string'

const isHttpImportStep = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && value.robot === '/http/import'

const listHttpImportStepNames = (steps: Record<string, unknown>): string[] =>
  Object.entries(steps)
    .filter(([, step]) => isHttpImportStep(step))
    .map(([name]) => name)

const usesOriginalReference = (value: unknown): boolean => {
  if (value === ':original') return true
  if (Array.isArray(value)) {
    return value.some((item) => usesOriginalReference(item))
  }
  if (isRecord(value)) {
    return Object.values(value).some((item) => usesOriginalReference(item))
  }
  return false
}

type StepAnalysis = {
  importStepNames: string[]
  hasHttpImport: boolean
  requiresUpload: boolean
}

const analyzeSteps = (steps: Record<string, unknown>): StepAnalysis => {
  let hasUploadHandle = false
  let hasOriginalStep = false
  let usesOriginal = false
  const importStepNames = listHttpImportStepNames(steps)

  for (const [name, step] of Object.entries(steps)) {
    if (name === ':original') {
      hasOriginalStep = true
    }
    if (!isRecord(step)) continue
    if (step.robot === '/upload/handle') {
      hasUploadHandle = true
    }
    if (!usesOriginal && 'use' in step) {
      usesOriginal = usesOriginalReference(step.use)
    }
  }

  return {
    importStepNames,
    hasHttpImport: importStepNames.length > 0,
    requiresUpload: hasUploadHandle || hasOriginalStep || usesOriginal,
  }
}

const mergeImportOverrides = (
  templateSteps: Record<string, unknown>,
  existingOverrides: Record<string, unknown> | undefined,
  importStepNames: string[],
): Record<string, unknown> => {
  const nextOverrides = isRecord(existingOverrides) ? { ...existingOverrides } : {}
  for (const stepName of importStepNames) {
    const templateStep = isRecord(templateSteps[stepName]) ? templateSteps[stepName] : {}
    const overrideStep = isRecord(nextOverrides[stepName]) ? nextOverrides[stepName] : {}
    nextOverrides[stepName] = {
      ...templateStep,
      ...overrideStep,
      robot: '/http/import',
    }
  }
  return nextOverrides
}

const collectFieldNames = (templateContent: string): string[] => {
  const names = extractFieldNamesFromTemplate(templateContent).map((field) => field.fieldName)
  return Array.from(new Set(names))
}

const mergeFieldValues = (
  templateFields: Record<string, unknown> | undefined,
  argFields: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  return {
    ...(templateFields ?? {}),
    ...(argFields ?? {}),
  }
}

const getAssemblyIdFromUrl = (assemblyUrl: string): string => {
  const match = assemblyUrl.match(/\/assemblies\/([^/?#]+)/)
  if (!match) {
    throw new Error(`Invalid assembly URL: ${assemblyUrl}`)
  }
  return match[1] ?? ''
}

type AssemblyAccessResult =
  | {
      client: Transloadit
      assemblyId: string
      assemblyUrl?: string
    }
  | { error: ReturnType<typeof buildToolError> }

const resolveAssemblyAccess = (
  options: TransloaditMcpServerOptions,
  extra: ToolExtra,
  args: { assembly_url?: string; assembly_id?: string },
): AssemblyAccessResult => {
  const liveClient = createLiveClient(options, extra)
  if ('error' in liveClient) return liveClient

  if (!args.assembly_url && !args.assembly_id) {
    return { error: buildToolError('mcp_missing_args', 'Provide assembly_url or assembly_id.') }
  }

  const assemblyId = args.assembly_url
    ? getAssemblyIdFromUrl(args.assembly_url)
    : (args.assembly_id as string)

  return {
    client: liveClient.client,
    assemblyId,
    assemblyUrl: args.assembly_url,
  }
}

const apiTemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    builtin_version: z.string().optional(),
    content: z.unknown().optional(),
  })
  .passthrough()

const listTemplatesResponseSchema = z
  .object({
    items: z.array(apiTemplateSchema).optional(),
  })
  .passthrough()

type ApiTemplateRecord = z.infer<typeof apiTemplateSchema>

const extractTemplateSteps = (content: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(content)) return undefined
  const steps = content.steps
  return isRecord(steps) ? (steps as Record<string, unknown>) : undefined
}

const mapBuiltinTemplate = (template: ApiTemplateRecord): BuiltinTemplate | undefined => {
  const name = isNonEmptyString(template.name) ? template.name : undefined
  const id = isNonEmptyString(template.id) ? template.id : undefined
  const slug = name?.startsWith('builtin/') ? name : id?.startsWith('builtin/') ? id : undefined

  if (!slug) return undefined

  const steps = extractTemplateSteps(template.content)
  if (!steps) return undefined

  const version = isNonEmptyString(template.builtin_version)
    ? template.builtin_version
    : slug.includes('@')
      ? (slug.split('@')[1] ?? '')
      : ''

  return {
    slug,
    version,
    description: isNonEmptyString(template.description) ? template.description : '',
    steps,
  }
}

const fetchBuiltinTemplates = async (client: Transloadit): Promise<BuiltinTemplate[]> => {
  // NOTE: Builtin templates are curated; we intentionally fetch the first page only for now.
  const response = await client.listTemplates({
    include_builtin: 'exclusively-latest',
    page: 1,
    pagesize: 100,
  })

  const parsed = listTemplatesResponseSchema.safeParse(response)
  if (!parsed.success) {
    throw new Error('Unexpected listTemplates response shape.')
  }

  const items = parsed.data.items ?? []
  return items
    .map((template) => mapBuiltinTemplate(template))
    .filter((template): template is BuiltinTemplate => Boolean(template))
}

const looksLikeAssemblyParams = (input: Record<string, unknown>): boolean => {
  return (
    'steps' in input ||
    'template_id' in input ||
    'auth' in input ||
    'fields' in input ||
    'notify_url' in input ||
    'redirect_url' in input
  )
}

const parseInstructions = (input: unknown): CreateAssemblyParams | undefined => {
  if (input == null) return undefined
  if (typeof input === 'string') {
    const parsed = safeJsonParse(input)
    return isRecord(parsed) ? (parsed as CreateAssemblyParams) : undefined
  }
  if (isRecord(input)) {
    if (looksLikeAssemblyParams(input)) {
      return input as CreateAssemblyParams
    }
    return { steps: input } as CreateAssemblyParams
  }
  return undefined
}

export const createTransloaditMcpServer = (
  options: TransloaditMcpServerOptions = {},
): McpServer => {
  const server = new McpServer({
    name: options.serverName ?? 'Transloadit MCP',
    version: options.serverVersion ?? packageJson.version,
  })

  // Builtin templates supersede the old golden template tool; no legacy alias by design.
  server.registerTool(
    'transloadit_lint_assembly_instructions',
    {
      title: 'Lint Assembly Instructions',
      description:
        'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
      inputSchema: lintAssemblyInputSchema,
      outputSchema: lintAssemblyOutputSchema,
    },
    async ({ instructions, strict, return_fixed }) => {
      const client = createLintClient(options)
      const assemblyInstructions =
        instructions as LintAssemblyInstructionsInput['assemblyInstructions']
      const result = await client.lintAssemblyInstructions({
        assemblyInstructions,
        fix: return_fixed ?? false,
        fatal: strict ? 'warning' : 'error',
      })

      const payload: Record<string, unknown> = {
        status: result.success ? 'ok' : 'error',
        linting_issues: toLintIssues(result.issues),
      }

      if (return_fixed && result.fixedInstructions) {
        payload.normalized_instructions = safeJsonParse(result.fixedInstructions)
      }

      return buildToolResponse(payload)
    },
  )

  server.registerTool(
    'transloadit_create_assembly',
    {
      title: 'Create or resume an Assembly',
      description:
        'Create or resume an Assembly, optionally uploading files and waiting for completion.',
      inputSchema: createAssemblyInputSchema,
      outputSchema: createAssemblyOutputSchema,
    },
    async (
      {
        instructions,
        files,
        fields,
        wait_for_completion,
        wait_timeout_ms,
        upload_concurrency,
        upload_chunk_size,
        upload_behavior,
        expected_uploads,
        assembly_url,
      },
      extra,
    ) => {
      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) return liveClient.error
      const { client } = liveClient
      const tempCleanups: Array<() => Promise<void>> = []
      const warnings: Array<{ code: string; message: string; hint?: string; path?: string }> = []
      let templatePathHint: string | undefined

      try {
        const fileInputs = files ?? []
        const urlInputs = fileInputs.filter((file) => file.kind === 'url')
        const hasUrlInputs = urlInputs.length > 0
        let inputFilesForPrep = fileInputs
        let params = parseInstructions(instructions) ?? ({} as CreateAssemblyParams)
        let allowStepsOverride = true
        let mergedInstructions: CreateAssemblyParams | undefined
        let mergedSteps: Record<string, unknown> | undefined
        let mergedFields: Record<string, unknown> | undefined

        let analysis = analyzeSteps(isRecord(params.steps) ? params.steps : {})

        if (params.template_id) {
          templatePathHint = templatePathHint ?? 'instructions.template_id'
          const template = await client.getTemplate(params.template_id)
          allowStepsOverride = template.content.allow_steps_override !== false
          try {
            const merged = mergeTemplateContent(template.content, params)
            mergedInstructions = merged as CreateAssemblyParams
            mergedSteps = isRecord(merged.steps) ? (merged.steps as Record<string, unknown>) : {}
            mergedFields = isRecord(merged.fields) ? (merged.fields as Record<string, unknown>) : {}
            analysis = analyzeSteps(mergedSteps)
          } catch (error) {
            if (error instanceof Error && error.message === 'TEMPLATE_DENIES_STEPS_OVERRIDE') {
              return buildToolError(
                'mcp_template_override_denied',
                'Template forbids step overrides; remove steps overrides or choose a different template.',
                { path: templatePathHint },
              )
            }
            throw error
          }
        } else {
          mergedInstructions = params
          mergedSteps = isRecord(params.steps) ? (params.steps as Record<string, unknown>) : {}
          mergedFields = isRecord(params.fields) ? (params.fields as Record<string, unknown>) : {}
        }

        if (hasUrlInputs) {
          if (!analysis.hasHttpImport && !analysis.requiresUpload) {
            inputFilesForPrep = fileInputs.filter((file) => file.kind !== 'url')
            warnings.push({
              code: 'mcp_url_inputs_ignored',
              message: 'URL inputs were ignored because the template does not require input files.',
              path: templatePathHint ?? 'instructions',
            })
          } else if (analysis.hasHttpImport) {
            if (!allowStepsOverride) {
              if (analysis.requiresUpload) {
                warnings.push({
                  code: 'mcp_template_import_override_denied',
                  message:
                    'Template forbids step overrides; URL inputs will be downloaded and uploaded via tus instead of /http/import.',
                  path: templatePathHint ?? 'instructions.template_id',
                })
              } else {
                return buildToolError(
                  'mcp_template_override_denied',
                  'Template forbids step overrides; URL inputs cannot be mapped to /http/import.',
                  { path: templatePathHint ?? 'instructions.template_id' },
                )
              }
            } else if (mergedSteps) {
              params.steps = mergeImportOverrides(
                mergedSteps,
                isRecord(params.steps) ? params.steps : undefined,
                analysis.importStepNames,
              )
            }
          }
        }

        if (mergedInstructions) {
          const fieldTemplateContent = JSON.stringify(mergedInstructions)
          const requiredFields = collectFieldNames(fieldTemplateContent)
          const providedFields = mergeFieldValues(
            mergedFields,
            isRecord(fields) ? (fields as Record<string, unknown>) : undefined,
          )
          const missingFields = requiredFields.filter((fieldName) => !(fieldName in providedFields))
          const effectiveMissing =
            hasUrlInputs && analysis.hasHttpImport
              ? missingFields.filter((fieldName) => fieldName !== 'input')
              : missingFields

          if (effectiveMissing.length > 0) {
            return buildToolError(
              'mcp_missing_fields',
              `Missing required fields: ${effectiveMissing.join(', ')}`,
              {
                path: 'fields',
                hint: 'Provide these field names under the fields argument.',
              },
            )
          }
        }
        const prep = await prepareInputFiles({
          inputFiles: inputFilesForPrep,
          params,
          fields,
          base64Strategy: 'tempfile',
          urlStrategy: 'import-if-present',
          maxBase64Bytes,
        }).catch((error) => {
          const message = error instanceof Error ? error.message : 'Invalid file input.'
          if (message.startsWith('Duplicate file field')) {
            return buildToolError('mcp_duplicate_field', message, { path: 'files' })
          }
          if (message.startsWith('Base64 payload exceeds')) {
            return buildToolError('mcp_base64_too_large', message, {
              hint: 'Use a URL import or path upload instead.',
            })
          }
          return buildToolError('mcp_invalid_args', message)
        })
        if ('content' in prep) {
          return prep
        }
        params = prep.params
        const filesMap = prep.files
        const uploadsMap = prep.uploads
        tempCleanups.push(...prep.cleanup)

        const totalFiles = Object.keys(filesMap).length + Object.keys(uploadsMap).length
        const uploadSummary: UploadSummary = {
          status: totalFiles > 0 ? 'complete' : 'none',
          total_files: totalFiles,
        }

        const timeout = wait_timeout_ms
        const waitForCompletion = wait_for_completion ?? false
        const uploadBehavior = upload_behavior ?? (waitForCompletion ? 'await' : 'background')
        const uploadConcurrency = upload_concurrency
        const chunkSize = upload_chunk_size

        let assembly: Awaited<ReturnType<typeof client.createAssembly>>
        try {
          assembly = assembly_url
            ? await client.resumeAssemblyUploads({
                assemblyUrl: assembly_url,
                files: filesMap,
                uploads: uploadsMap,
                waitForCompletion,
                timeout,
                uploadConcurrency,
                chunkSize,
                uploadBehavior,
              })
            : await client.createAssembly({
                params,
                files: filesMap,
                uploads: uploadsMap,
                waitForCompletion,
                timeout,
                uploadConcurrency,
                chunkSize,
                uploadBehavior,
                expectedUploads: expected_uploads,
              })
        } catch (error) {
          if (isErrnoException(error) && error.code === 'ENOENT') {
            return buildToolError('mcp_file_not_found', error.message, {
              hint: 'Path inputs only work when the MCP server can read local files. For hosted MCP, use url/base64 or upload via `npx -y @transloadit/node upload`.',
            })
          }
          throw error
        }

        if (assembly_url) {
          uploadSummary.resumed = true
        }

        if (totalFiles === 0) {
          uploadSummary.status = 'none'
        } else if (uploadBehavior === 'none') {
          uploadSummary.status = 'none'
        } else if (uploadBehavior === 'background') {
          uploadSummary.status = 'uploading'
        }

        if (isRecord(assembly.upload_urls)) {
          uploadSummary.upload_urls = assembly.upload_urls as Record<string, string>
        }

        const nextSteps = waitForCompletion
          ? []
          : ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status']

        return buildToolResponse({
          status: 'ok',
          assembly,
          upload: uploadSummary,
          next_steps: nextSteps,
          warnings: warnings.length > 0 ? warnings : undefined,
        })
      } finally {
        await Promise.all(tempCleanups.map((cleanup) => cleanup()))
      }
    },
  )

  server.registerTool(
    'transloadit_get_assembly_status',
    {
      title: 'Get Assembly status',
      description: 'Fetch the latest Assembly status by URL or ID.',
      inputSchema: getAssemblyStatusInputSchema,
      outputSchema: getAssemblyStatusOutputSchema,
    },
    async ({ assembly_url, assembly_id }, extra) => {
      const access = resolveAssemblyAccess(options, extra, { assembly_url, assembly_id })
      if ('error' in access) return access.error

      const assembly = await access.client.getAssembly(access.assemblyId)

      return buildToolResponse({
        status: 'ok',
        assembly,
      })
    },
  )

  server.registerTool(
    'transloadit_wait_for_assembly',
    {
      title: 'Wait for Assembly completion',
      description: 'Polls until the Assembly completes or timeout is reached.',
      inputSchema: waitForAssemblyInputSchema,
      outputSchema: waitForAssemblyOutputSchema,
    },
    async ({ assembly_url, assembly_id, timeout_ms, poll_interval_ms }, extra) => {
      const access = resolveAssemblyAccess(options, extra, { assembly_url, assembly_id })
      if ('error' in access) return access.error

      const start = Date.now()
      const assembly = await access.client.awaitAssemblyCompletion(access.assemblyId, {
        timeout: timeout_ms,
        interval: poll_interval_ms,
        assemblyUrl: access.assemblyUrl,
      })
      const waited_ms = Date.now() - start

      return buildToolResponse({
        status: 'ok',
        assembly,
        waited_ms,
      })
    },
  )

  server.registerTool(
    'transloadit_list_robots',
    {
      title: 'List Transloadit robots',
      description: 'Returns a filtered list of robots with short summaries.',
      inputSchema: listRobotsInputSchema,
      outputSchema: listRobotsOutputSchema,
    },
    ({ category, search, limit, cursor }) => {
      const result = listRobots({ category, search, limit, cursor })

      return buildToolResponse({
        status: 'ok',
        robots: result.robots,
        next_cursor: result.nextCursor,
      })
    },
  )

  server.registerTool(
    'transloadit_get_robot_help',
    {
      title: 'Get robot parameter help',
      description: 'Returns a robot summary and parameter details.',
      inputSchema: getRobotHelpInputSchema,
      outputSchema: getRobotHelpOutputSchema,
    },
    ({ robot_name, detail_level }) => {
      const help = getRobotHelp({
        robotName: robot_name,
        detailLevel: detail_level ?? 'summary',
      })

      return buildToolResponse({
        status: 'ok',
        robot: {
          name: help.name,
          summary: help.summary,
          required_params: help.requiredParams,
          optional_params: help.optionalParams,
          examples: help.examples,
        },
      })
    },
  )

  server.registerTool(
    'transloadit_list_builtin_templates',
    {
      title: 'List builtin templates',
      description: 'Returns curated starter templates with ready-to-run steps.',
      inputSchema: listBuiltinTemplatesInputSchema,
      outputSchema: listBuiltinTemplatesOutputSchema,
    },
    async (_args, extra) => {
      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) {
        return buildToolResponse({
          status: 'error',
          templates: [],
          errors: [
            {
              code: 'mcp_missing_auth',
              message:
                'Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET or Authorization: Bearer token for live API calls.',
            },
          ],
        })
      }

      try {
        const templates = await fetchBuiltinTemplates(liveClient.client)
        return buildToolResponse({
          status: 'ok',
          templates,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch builtin templates.'
        return buildToolResponse({
          status: 'error',
          templates: [],
          errors: [
            {
              code: 'mcp_builtin_templates_failed',
              message,
            },
          ],
        })
      }
    },
  )

  return server
}

// Expose tiny internals for unit tests only.
export const __test__ = {
  mapBuiltinTemplate,
}
