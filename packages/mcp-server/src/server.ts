import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Transloadit } from '@transloadit/node'
import type { LintAssemblyInstructionsResult } from '@transloadit/node'
import { robotsMeta, robotsSchema } from '@transloadit/zod/v4'
import { z } from 'zod'
import packageJson from '../package.json' with { type: 'json' }
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

export type TransloaditMcpServerOptions = {
  authKey?: string
  authSecret?: string
  serverName?: string
  serverVersion?: string
}

type LintIssueOutput = {
  path: string
  message: string
  severity: 'error' | 'warning'
  hint?: string
}

type RobotListItem = {
  name: string
  title?: string
  summary: string
  category?: string
}

type RobotParamHelp = {
  name: string
  type: string
  description?: string
}

type RobotHelp = {
  name: string
  summary: string
  required_params: RobotParamHelp[]
  optional_params: RobotParamHelp[]
  examples?: Array<{ description: string; snippet: Record<string, unknown> }>
}

type InputFile =
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

type UploadSummary = {
  status: 'none' | 'uploading' | 'complete'
  total_files: number
  resumed?: boolean
  upload_urls?: Record<string, string>
}

const maxBase64Bytes = 512_000

const lintIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  hint: z.string().optional(),
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
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        hint: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .optional(),
})

const getAssemblyStatusInputSchema = z.object({
  assembly_url: z.string().optional(),
  assembly_id: z.string().optional(),
})

const getAssemblyStatusOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  assembly: z.unknown().optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        hint: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .optional(),
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
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        hint: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .optional(),
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

const toLintIssues = (
  issues: LintAssemblyInstructionsResult['issues'],
): LintIssueOutput[] =>
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

const buildToolResponse = (payload: Record<string, unknown>) => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(payload),
    },
  ],
  structuredContent: payload,
})

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
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const robotNameToPath = (name: string): string => {
  const base = name.replace(/Robot$/, '')
  const spaced = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, '$1 $2')
  const parts = spaced.split(/\s+/).filter(Boolean)
  return `/${parts.map((part) => part.toLowerCase()).join('/')}`
}

type RobotsMetaMap = typeof robotsMeta
type RobotMeta = RobotsMetaMap[keyof RobotsMetaMap]

const getRobotsMetaIndex = (): {
  byName: Map<string, RobotMeta>
  byPath: Map<string, RobotMeta>
} => {
  const byName = new Map<string, RobotMeta>()
  const byPath = new Map<string, RobotMeta>()

  for (const meta of Object.values(robotsMeta)) {
    byName.set(meta.name, meta)
    byPath.set(robotNameToPath(meta.name), meta)
  }

  return { byName, byPath }
}

const getRobotSchemaIndex = (): Map<string, z.ZodTypeAny> => {
  const index = new Map<string, z.ZodTypeAny>()
  for (const option of robotsSchema.options) {
    const shape = option.def.shape
    const robotSchema = shape?.robot
    const robotLiteral = robotSchema?.def?.values?.[0]
    if (typeof robotLiteral === 'string') {
      index.set(robotLiteral, option)
    }
  }
  return index
}

const unwrapSchema = (
  schema: z.ZodTypeAny,
): { base: z.ZodTypeAny; optional: boolean } => {
  let base = schema
  let optional = typeof base.isOptional === 'function' ? base.isOptional() : false

  while (true) {
    const def = base.def
    if (
      def.type === 'optional' ||
      def.type === 'default' ||
      def.type === 'nullable' ||
      def.type === 'catch'
    ) {
      if ('innerType' in def && def.innerType) {
        base = def.innerType
        if (def.type !== 'nullable') {
          optional = true
        }
        continue
      }
    }
    break
  }

  return { base, optional }
}

const describeSchemaType = (schema: z.ZodTypeAny): string => {
  const { base } = unwrapSchema(schema)
  const def = base.def

  switch (def.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
      return def.type
    case 'literal': {
      const value = def.values?.[0]
      return value === undefined ? 'literal' : JSON.stringify(value)
    }
    case 'enum': {
      const values = Array.isArray(def.values) ? def.values : []
      return values.length ? `enum(${values.join(' | ')})` : 'enum'
    }
    case 'array': {
      const element = def.element
      const inner = element ? describeSchemaType(element) : 'unknown'
      return `array<${inner}>`
    }
    case 'object':
      return 'object'
    case 'record':
      return 'record'
    case 'union': {
      const options = Array.isArray(def.options) ? def.options : []
      const rendered = options.map((option) => describeSchemaType(option)).join(' | ')
      return rendered ? `union<${rendered}>` : 'union'
    }
    default:
      return def.type ?? 'unknown'
  }
}

const getParamDescription = (schema: z.ZodTypeAny): string | undefined => {
  if (schema.description && schema.description.trim()) {
    return schema.description.trim()
  }
  const inner = unwrapSchema(schema).base
  return inner.description?.trim()
}

const getRobotParams = (
  schema: z.ZodTypeAny,
): { required: RobotParamHelp[]; optional: RobotParamHelp[] } => {
  const shape = schema.def.shape
  const required: RobotParamHelp[] = []
  const optional: RobotParamHelp[] = []

  for (const [key, value] of Object.entries(shape)) {
    if (key === 'robot') continue
    const { optional: isOptional } = unwrapSchema(value)
    const param: RobotParamHelp = {
      name: key,
      type: describeSchemaType(value),
      description: getParamDescription(value),
    }

    if (isOptional) {
      optional.push(param)
    } else {
      required.push(param)
    }
  }

  return { required, optional }
}

const selectSummary = (meta: RobotMeta): string =>
  meta.purpose_sentence ??
  meta.purpose_words ??
  meta.purpose_word ??
  meta.title ??
  meta.name

const resolveRobotPath = (robotName: string): string =>
  robotName.startsWith('/') ? robotName : robotNameToPath(robotName)

const getAssemblyIdFromUrl = (assemblyUrl: string): string => {
  const match = assemblyUrl.match(/\/assemblies\/([^/?#]+)/)
  if (!match) {
    throw new Error(`Invalid assembly URL: ${assemblyUrl}`)
  }
  return match[1] ?? ''
}

const parseInstructions = (input: unknown): Record<string, unknown> | undefined => {
  if (input == null) return undefined
  if (typeof input === 'string') {
    const parsed = safeJsonParse(input)
    return isRecord(parsed) ? parsed : undefined
  }
  if (isRecord(input)) {
    if ('steps' in input) {
      return input as Record<string, unknown>
    }
    return { steps: input }
  }
  return undefined
}

const ensureUniqueField = (field: string, used: Set<string>): string | null => {
  if (used.has(field)) return null
  used.add(field)
  return field
}

const ensureUniqueStepName = (baseName: string, used: Set<string>): string => {
  let name = baseName
  let counter = 1
  while (used.has(name)) {
    name = `${baseName}_${counter}`
    counter += 1
  }
  used.add(name)
  return name
}

const decodeBase64 = (value: string): Buffer => Buffer.from(value, 'base64')

const withTempFile = async (
  filename: string,
  content: Buffer,
): Promise<{ path: string; cleanup: () => Promise<void> }> => {
  const safeName = basename(filename)
  const folder = await mkdtemp(join(tmpdir(), 'transloadit-mcp-'))
  const filePath = join(folder, safeName)
  await writeFile(filePath, content)
  return {
    path: filePath,
    cleanup: async () => {
      await rm(filePath, { force: true, recursive: true })
      await rm(folder, { force: true, recursive: true })
    },
  }
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
      const result = await client.lintAssemblyInstructions({
        assemblyInstructions: instructions,
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
    async ({
      instructions,
      golden_template,
      files,
      fields,
      wait_for_completion,
      wait_timeout_ms,
      upload_concurrency,
      upload_chunk_size,
      assembly_url,
    }) => {
      if (instructions && golden_template) {
        return buildToolError(
          'mcp_invalid_args',
          'Provide either instructions or golden_template, not both.',
          { path: 'instructions' },
        )
      }

      if (!options.authKey || !options.authSecret) {
        return buildToolError(
          'mcp_missing_auth',
          'Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET for live API calls.',
        )
      }

      if (golden_template) {
        return buildToolError(
          'mcp_unavailable',
          'Golden templates are not available yet.',
          { path: 'golden_template' },
        )
      }

      const client = new Transloadit({
        authKey: options.authKey,
        authSecret: options.authSecret,
      })

      const tempCleanups: Array<() => Promise<void>> = []

      try {
        const fileInputs = files ?? []
        const usedFields = new Set<string>()
        const filesMap: Record<string, string> = {}
        const urlFiles: InputFile[] = []

        for (const file of fileInputs) {
          const field = ensureUniqueField(file.field, usedFields)
          if (!field) {
            return buildToolError('mcp_duplicate_field', `Duplicate file field: ${file.field}`, {
              path: 'files',
            })
          }

          if (file.kind === 'path') {
            filesMap[field] = file.path
          } else if (file.kind === 'base64') {
            const buffer = decodeBase64(file.base64)
            if (buffer.length > maxBase64Bytes) {
              return buildToolError(
                'mcp_base64_too_large',
                `Base64 payload exceeds ${maxBase64Bytes} bytes.`,
                { hint: 'Use a URL import or path upload instead.' },
              )
            }
            const tempFile = await withTempFile(file.filename, buffer)
            filesMap[field] = tempFile.path
            tempCleanups.push(tempFile.cleanup)
          } else if (file.kind === 'url') {
            urlFiles.push(file)
          }
        }

        let params = parseInstructions(instructions) ?? {}

        if (fields && Object.keys(fields).length > 0) {
          params = {
            ...params,
            fields: {
              ...(isRecord(params.fields) ? params.fields : {}),
              ...fields,
            },
          }
        }

        if (urlFiles.length > 0) {
          const steps = isRecord(params.steps) ? { ...params.steps } : {}
          const usedSteps = new Set(Object.keys(steps))

          for (const file of urlFiles) {
            const stepName = ensureUniqueStepName(file.field, usedSteps)
            steps[stepName] = {
              robot: '/http/import',
              url: file.url,
            }
          }

          params = {
            ...params,
            steps,
          }
        }

        const totalFiles = fileInputs.filter((file) => file.kind !== 'url').length
        const uploadSummary: UploadSummary = {
          status: totalFiles > 0 ? 'complete' : 'none',
          total_files: totalFiles,
        }

        const timeout = wait_timeout_ms
        const waitForCompletion = wait_for_completion ?? false
        const uploadConcurrency = upload_concurrency
        const chunkSize = upload_chunk_size

        const assembly = assembly_url
          ? await client.resumeAssemblyUploads({
              assemblyUrl: assembly_url,
              files: filesMap,
              waitForCompletion,
              timeout,
              uploadConcurrency,
              chunkSize,
            })
          : await client.createAssembly({
              params,
              files: filesMap,
              waitForCompletion,
              timeout,
              uploadConcurrency,
              chunkSize,
            })

        if (assembly_url) {
          uploadSummary.resumed = true
        }

        const nextSteps = waitForCompletion
          ? []
          : ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status']

        return buildToolResponse({
          status: 'ok',
          assembly,
          upload: uploadSummary,
          next_steps: nextSteps,
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
    async ({ assembly_url, assembly_id }) => {
      if (!options.authKey || !options.authSecret) {
        return buildToolError(
          'mcp_missing_auth',
          'Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET for live API calls.',
        )
      }

      if (!assembly_url && !assembly_id) {
        return buildToolError(
          'mcp_missing_args',
          'Provide assembly_url or assembly_id.',
        )
      }

      const client = new Transloadit({
        authKey: options.authKey,
        authSecret: options.authSecret,
      })

      const id = assembly_url ? getAssemblyIdFromUrl(assembly_url) : (assembly_id as string)
      const assembly = await client.getAssembly(id)

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
    async ({ assembly_url, assembly_id, timeout_ms, poll_interval_ms }) => {
      if (!options.authKey || !options.authSecret) {
        return buildToolError(
          'mcp_missing_auth',
          'Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET for live API calls.',
        )
      }

      if (!assembly_url && !assembly_id) {
        return buildToolError(
          'mcp_missing_args',
          'Provide assembly_url or assembly_id.',
        )
      }

      const client = new Transloadit({
        authKey: options.authKey,
        authSecret: options.authSecret,
      })

      const id = assembly_url ? getAssemblyIdFromUrl(assembly_url) : (assembly_id as string)
      const start = Date.now()
      const assembly = await client.awaitAssemblyCompletion(id, {
        timeout: timeout_ms,
        interval: poll_interval_ms,
        assemblyUrl: assembly_url,
      })
      const waited_ms = Date.now() - start

      return buildToolResponse({
        status: 'ok',
        assembly,
        waited_ms,
      })
    },
  )

  const robotMetaIndex = getRobotsMetaIndex()
  const robotSchemaIndex = getRobotSchemaIndex()

  server.registerTool(
    'transloadit_list_robots',
    {
      title: 'List Transloadit robots',
      description: 'Returns a filtered list of robots with short summaries.',
      inputSchema: listRobotsInputSchema,
      outputSchema: listRobotsOutputSchema,
    },
    async ({ category, search, limit, cursor }) => {
      const normalizedSearch = search?.toLowerCase()
      const normalizedCategory = category?.toLowerCase()

      const allRobots: RobotListItem[] = Array.from(robotMetaIndex.byPath.entries()).map(
        ([path, meta]) => ({
          name: path,
          title: meta.title,
          summary: selectSummary(meta),
          category: meta.service_slug,
        }),
      )

      const filtered = allRobots
        .filter((robot) => {
          if (normalizedCategory && robot.category?.toLowerCase() !== normalizedCategory) {
            return false
          }
          if (!normalizedSearch) return true
          const haystack = `${robot.name} ${robot.title ?? ''} ${robot.summary}`.toLowerCase()
          return haystack.includes(normalizedSearch)
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      const start = cursor ? Number.parseInt(cursor, 10) : 0
      const safeStart = Number.isFinite(start) && start > 0 ? start : 0
      const safeLimit = limit && limit > 0 ? limit : 20
      const page = filtered.slice(safeStart, safeStart + safeLimit)
      const nextCursor =
        safeStart + safeLimit < filtered.length ? String(safeStart + safeLimit) : undefined

      return buildToolResponse({
        status: 'ok',
        robots: page,
        next_cursor: nextCursor,
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
    async ({ robot_name, detail_level }) => {
      const path = resolveRobotPath(robot_name)
      const meta =
        robotMetaIndex.byPath.get(path) ?? robotMetaIndex.byName.get(robot_name) ?? null
      const summary = meta ? selectSummary(meta) : `Robot ${path}`
      const schema = robotSchemaIndex.get(path)
      const params = schema ? getRobotParams(schema) : { required: [], optional: [] }

      const robot: RobotHelp = {
        name: path,
        summary,
        required_params: detail_level === 'params' ? params.required : [],
        optional_params: detail_level === 'params' ? params.optional : [],
      }

      if (detail_level === 'examples' && meta?.example_code) {
        const snippet = isRecord(meta.example_code) ? meta.example_code : {}
        robot.examples = [
          {
            description: meta.example_code_description ?? 'Example',
            snippet,
          },
        ]
      }

      return buildToolResponse({
        status: 'ok',
        robot,
      })
    },
  )

  return server
}
