import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import type {
  CreateAssemblyParams,
  LintAssemblyInstructionsResult,
  TemplateContent,
} from '@transloadit/node'
import {
  getRobotHelp,
  goldenTemplates,
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
  serverName?: string
  serverVersion?: string
}

type LintIssueOutput = {
  path: string
  message: string
  severity: 'error' | 'warning'
  hint?: string
}

type ToolMessage = {
  code: string
  message: string
  hint?: string
  path?: string
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
type GoldenTemplate = {
  slug: string
  version: string
  description: string
  steps: Record<string, unknown>
}

type LintAssemblyInstructionsInput = Parameters<Transloadit['lintAssemblyInstructions']>[0]

const goldenTemplatesMap = goldenTemplates as Record<string, GoldenTemplate>

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
  golden_template: z
    .object({
      slug: z.string(),
      version: z.string().optional(),
      overrides: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  files: z.array(inputFileSchema).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  wait_for_completion: z.boolean().optional(),
  wait_timeout_ms: z.number().int().positive().optional(),
  upload_concurrency: z.number().int().positive().optional(),
  upload_chunk_size: z.number().int().positive().optional(),
  upload_behavior: z.enum(['await', 'background', 'none']).optional(),
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

const listGoldenTemplatesInputSchema = z.object({})

const listGoldenTemplatesOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  templates: z.array(
    z.object({
      slug: z.string(),
      version: z.string(),
      description: z.string(),
      steps: z.record(z.string(), z.unknown()),
    }),
  ),
})

const validateAssemblyInputSchema = z.object({
  instructions: z.unknown(),
  strict: z.boolean().optional(),
  return_fixed: z.boolean().optional(),
})

const validateAssemblyOutputSchema = z.object({
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

const signatureAuthWarning: ToolMessage = {
  code: 'mcp_signature_auth_required',
  message:
    'Bearer tokens still require signature auth if your account enforces it. Configure TRANSLOADIT_KEY/TRANSLOADIT_SECRET so MCP can sign requests.',
  hint: 'If you see NO_SIGNATURE_FIELD or NO_AUTH_EXPIRES_PARAMETER, provide key+secret or disable signature auth for the account.',
}

const createLintClient = (options: TransloaditMcpServerOptions): Transloadit =>
  new Transloadit({
    authKey: options.authKey ?? 'mcp',
    authSecret: options.authSecret ?? 'mcp',
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

const getSignatureAuthWarnings = (
  options: TransloaditMcpServerOptions,
  extra: ToolExtra,
): ToolMessage[] => {
  const token = getBearerToken(extra.requestInfo?.headers)
  if (!token) return []
  if (token === options.mcpToken) return []
  if (options.authKey && options.authSecret) return []
  return [signatureAuthWarning]
}

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
    }),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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
      warnings: ToolMessage[]
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
    warnings: getSignatureAuthWarnings(options, extra),
    assemblyId,
    assemblyUrl: args.assembly_url,
  }
}

const resolveGoldenTemplate = (slug: string, version?: string): GoldenTemplate | undefined => {
  if (slug.includes('@')) {
    return goldenTemplatesMap[slug]
  }

  if (version) {
    return goldenTemplatesMap[`${slug}@${version}`]
  }

  const matches = Object.keys(goldenTemplatesMap).filter((key) => key.startsWith(`${slug}@`))
  if (matches.length === 0) return undefined
  const latest = matches.sort().at(-1)
  return latest ? goldenTemplatesMap[latest] : undefined
}

const parseInstructions = (input: unknown): CreateAssemblyParams | undefined => {
  if (input == null) return undefined
  if (typeof input === 'string') {
    const parsed = safeJsonParse(input)
    return isRecord(parsed) ? (parsed as CreateAssemblyParams) : undefined
  }
  if (isRecord(input)) {
    if ('steps' in input) {
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

  server.registerTool(
    'transloadit_validate_assembly',
    {
      title: 'Validate Assembly Instructions',
      description:
        'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
      inputSchema: validateAssemblyInputSchema,
      outputSchema: validateAssemblyOutputSchema,
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
        golden_template,
        files,
        fields,
        wait_for_completion,
        wait_timeout_ms,
        upload_concurrency,
        upload_chunk_size,
        upload_behavior,
        assembly_url,
      },
      extra,
    ) => {
      if (instructions && golden_template) {
        return buildToolError(
          'mcp_invalid_args',
          'Provide either instructions or golden_template, not both.',
          { path: 'instructions' },
        )
      }

      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) return liveClient.error
      const { client } = liveClient
      const warnings = getSignatureAuthWarnings(options, extra)

      const tempCleanups: Array<() => Promise<void>> = []

      try {
        const fileInputs = files ?? []
        let params = parseInstructions(instructions) ?? ({} as CreateAssemblyParams)

        if (golden_template) {
          const template = resolveGoldenTemplate(golden_template.slug, golden_template.version)

          if (!template) {
            return buildToolError(
              'mcp_unknown_template',
              `Unknown golden template: ${golden_template.slug}`,
              { path: 'golden_template.slug' },
            )
          }

          const overrides = golden_template.overrides
          const templateContent = {
            steps: template.steps,
          } as TemplateContent
          params = mergeTemplateContent(
            templateContent,
            overrides && isRecord(overrides) ? (overrides as Record<string, unknown>) : undefined,
          ) as Record<string, unknown>
        }
        const prep = await prepareInputFiles({
          inputFiles: fileInputs,
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

        const assembly = assembly_url
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
            })

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
          ...(warnings.length > 0 ? { warnings } : {}),
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
        ...(access.warnings.length > 0 ? { warnings: access.warnings } : {}),
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
        ...(access.warnings.length > 0 ? { warnings: access.warnings } : {}),
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
    'transloadit_list_golden_templates',
    {
      title: 'List golden templates',
      description: 'Returns curated starter templates with ready-to-run steps.',
      inputSchema: listGoldenTemplatesInputSchema,
      outputSchema: listGoldenTemplatesOutputSchema,
    },
    () => {
      return buildToolResponse({
        status: 'ok',
        templates: Object.values(goldenTemplatesMap),
      })
    },
  )

  return server
}
