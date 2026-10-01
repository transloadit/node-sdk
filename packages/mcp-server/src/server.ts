import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import type {
  AssemblyInstructionsInput,
  AssemblyStatus,
  CreateAssemblyParams,
  InputFile,
  LintAssemblyInstructionsResult,
} from '@transloadit/node'
import type { ZodObject } from 'zod'

import type { ListedTool } from './tool-list.ts'
import type { ToolName } from './tool-metadata.ts'
import type { WidgetContext } from './ui/assembly-result-widget.ts'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  ApiError,
  extractFieldNamesFromTemplate,
  getRobotHelp,
  isKnownRobot,
  listRobots,
  mergeTemplateContent,
  prepareInputFiles,
  Transloadit,
} from '@transloadit/node'
import { z } from 'zod'

import packageJson from '../package.json' with { type: 'json' }
import { buildBearerChallenge, extractBearerToken } from './http-helpers.ts'
import { installToolListHandler } from './tool-list.ts'
import { buildToolMeta, toolMetadata } from './tool-metadata.ts'
import { registerAssemblyResultWidget, widgetContextMetaKey } from './ui/assembly-result-widget.ts'

export type TransloaditMcpServerOptions = {
  authKey?: string
  authSecret?: string
  mcpToken?: string
  /**
   * Protected-resource metadata URL of the hosted deployment. When set, auth failures carry an
   * RFC 6750 challenge that points OAuth clients at API2 (`TRANSLOADIT_MCP_RESOURCE_METADATA_URL`).
   */
  resourceMetadataUrl?: string
  /**
   * Shared secret that identifies the Transloadit-hosted MCP service to API2, which only accepts
   * relayed `aud=mcp` bearer tokens from that service (`TRANSLOADIT_MCP_UPSTREAM_SECRET`). It is
   * sent as `Transloadit-Mcp-Upstream` next to a forwarded bearer token and never with key/secret.
   */
  upstreamSecret?: string
  /**
   * HMAC algorithm for key/secret signatures (`TRANSLOADIT_SIGNATURE_ALGORITHM`). Must match the
   * Auth Key's `signature_algo`; Console keys that may sign Smart CDN URLs require `sha256`.
   * Defaults to the SDK's `sha384`, which ordinary API keys use.
   */
  signatureAlgorithm?: McpSignatureAlgorithm
  /** Origins the result widget may load previews from (`TRANSLOADIT_MCP_RESULT_DOMAINS`). */
  resultDomains?: string[]
  /** Console origin used for widget deep links; defaults to the public website. */
  consoleUrl?: string
  endpoint?: string
  serverName?: string
  serverVersion?: string
  clientName?: string
  clientSuffix?: string
}

const defaultConsoleUrl = 'https://transloadit.com'

/** Signature algorithms API2 accepts for Auth Key signatures. */
export const signatureAlgorithmSchema = z.enum(['sha1', 'sha256', 'sha384'])

export type McpSignatureAlgorithm = z.infer<typeof signatureAlgorithmSchema>

/** Header that carries `upstreamSecret` on API2 calls made with a forwarded bearer token. */
export const upstreamSecretHeader = 'Transloadit-Mcp-Upstream'

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
  robot_name: z.string().optional(),
  robot_names: z.array(z.string()).optional(),
  // Backward compatible input; ignored on purpose (we always return full docs).
  detail_level: z.enum(['summary', 'params', 'examples']).optional(),
})

const robotHelpOutputSchema = z.object({
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
})

const getRobotHelpOutputSchema = z
  .object({
    status: z.enum(['ok', 'error']),
    // For backward compatibility, we still return `robot` for single-robot requests via `robot_name`.
    robot: robotHelpOutputSchema.optional(),
    robots: z.array(robotHelpOutputSchema).optional(),
    not_found: z.array(z.string()).optional(),
  })
  .refine((value) => value.status !== 'ok' || value.robot || value.robots, {
    message: 'Expected robot or robots for ok status.',
  })

const inputFileSchema = z.discriminatedUnion('kind', [
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

// Exactly the file object ChatGPT hydrates for `_meta["openai/fileParams"]`: the two ids are
// required, the descriptive fields optional, and nothing else is allowed.
const hostFileSchema = z
  .object({
    download_url: z.string(),
    file_id: z.string(),
    mime_type: z.string().optional(),
    file_name: z.string().optional(),
  })
  .strict()

type HostFile = z.infer<typeof hostFileSchema>

const createAssemblyInputSchema = z.object({
  instructions: z.unknown().optional(),
  files: z.array(inputFileSchema).optional(),
  attachments: z.array(hostFileSchema).optional(),
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

const listTemplatesInputSchema = z.object({
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
  sort: z.enum(['id', 'name', 'created', 'modified']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  keywords: z.array(z.string()).optional(),
  include_builtin: z.enum(['all', 'latest', 'exclusively-all', 'exclusively-latest']).optional(),
  include_content: z.boolean().optional(),
})

const listTemplatesOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  templates: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      builtin_version: z.string().optional(),
      steps: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
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

const getProfileInputSchema = z.object({}).strict()

// Shape ChatGPT expects from a profile tool: an opaque stable id plus optional display fields.
const getProfileOutputSchema = z
  .object({
    id: z.string().min(1).regex(/\S/),
    name: z.string().optional(),
    nickname: z.string().optional(),
  })
  .strict()

type WorkspaceProfile = z.infer<typeof getProfileOutputSchema>

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

type ToolResponseExtras = {
  /** Result `_meta`, delivered to widgets and hosts but hidden from the model. */
  meta?: Record<string, unknown>
  isError?: boolean
}

const buildToolResponse = (
  payload: Record<string, unknown>,
  extras: ToolResponseExtras = {},
): CallToolResult => {
  const content: TextContent = {
    type: 'text',
    text: JSON.stringify(payload),
  }

  return {
    content: [content],
    structuredContent: payload,
    ...(extras.isError ? { isError: true } : {}),
    ...(extras.meta ? { _meta: extras.meta } : {}),
  }
}

type AuthErrorInput = {
  code: 'mcp_missing_auth' | 'mcp_auth_rejected' | 'mcp_insufficient_scope'
  oauthError: 'invalid_token' | 'insufficient_scope'
  message: string
  hint?: string
}

/**
 * Tool-level auth failure. `_meta["mcp/www_authenticate"]` mirrors the HTTP challenge so ChatGPT
 * and Claude open their account-linking UI; the text content keeps the reason readable.
 */
const buildAuthError = (
  options: TransloaditMcpServerOptions,
  input: AuthErrorInput,
): CallToolResult =>
  buildToolResponse(
    {
      status: 'error',
      errors: [{ code: input.code, message: input.message, hint: input.hint }],
    },
    {
      isError: true,
      meta: {
        'mcp/www_authenticate': [
          buildBearerChallenge({
            resourceMetadataUrl: options.resourceMetadataUrl,
            error: { code: input.oauthError, description: input.message },
          }),
        ],
      },
    },
  )

const buildMissingAuthError = (options: TransloaditMcpServerOptions): CallToolResult =>
  buildAuthError(options, {
    code: 'mcp_missing_auth',
    oauthError: 'insufficient_scope',
    message: 'Sign in to Transloadit to use this tool.',
    hint: options.resourceMetadataUrl
      ? 'Connect your Transloadit account through OAuth, then retry.'
      : 'Set TRANSLOADIT_KEY/TRANSLOADIT_SECRET or send an Authorization: Bearer token.',
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

const getClientName = (options: TransloaditMcpServerOptions): string => {
  const base = options.clientName ?? `mcp-server:${packageJson.version}`
  const suffix = options.clientSuffix
  if (suffix && suffix.trim() !== '') {
    return `${base}${suffix}`
  }
  return base
}

const createLintClient = (options: TransloaditMcpServerOptions): Transloadit =>
  new Transloadit({
    authKey: options.authKey ?? 'mcp',
    authSecret: options.authSecret ?? 'mcp',
    endpoint: options.endpoint,
    clientName: getClientName(options),
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
        clientName: getClientName(options),
        signatureAlgorithm: options.signatureAlgorithm,
        followRedirects: false,
        extraHeaders: options.upstreamSecret
          ? { [upstreamSecretHeader]: options.upstreamSecret }
          : undefined,
      }),
    }
  }

  if (!options.authKey || !options.authSecret) {
    return { error: buildMissingAuthError(options) }
  }

  return {
    client: new Transloadit({
      authKey: options.authKey,
      authSecret: options.authSecret,
      endpoint: options.endpoint,
      clientName: getClientName(options),
      signatureAlgorithm: options.signatureAlgorithm,
      followRedirects: false,
    }),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const builtinTemplatePrefix = 'builtin/'

const isBuiltinTemplateId = (value: string): boolean => value.startsWith(builtinTemplatePrefix)

const getHttpStatusCode = (error: unknown): number | undefined => {
  if (error instanceof ApiError) {
    const status = (error.cause as unknown as { response?: { statusCode?: unknown } } | undefined)
      ?.response?.statusCode
    if (typeof status === 'number') return status
  }

  if (isRecord(error)) {
    const directStatus = (error as { response?: { statusCode?: unknown } }).response?.statusCode
    if (typeof directStatus === 'number') return directStatus

    const cause = (error as { cause?: unknown }).cause
    if (isRecord(cause)) {
      const status = (cause as { response?: { statusCode?: unknown } }).response?.statusCode
      if (typeof status === 'number') return status
    }
  }

  return undefined
}

const isErrnoException = (value: unknown): value is NodeJS.ErrnoException =>
  isRecord(value) && typeof value.code === 'string'

/**
 * Maps API2 rejections of the forwarded credentials to a tool auth error. Other failures are
 * left to the caller so they keep surfacing as ordinary tool errors.
 */
const toAuthRejection = (
  options: TransloaditMcpServerOptions,
  error: unknown,
): CallToolResult | undefined => {
  const status = getHttpStatusCode(error)
  if (status === 401) {
    return buildAuthError(options, {
      code: 'mcp_auth_rejected',
      oauthError: 'invalid_token',
      message: 'Transloadit rejected the credentials; the token may have expired.',
      hint: 'Reconnect your Transloadit account and retry.',
    })
  }
  const scopeRejected =
    status === 403 && error instanceof ApiError && /SCOPE|BEARER_TOKEN/.test(error.code ?? '')
  if (scopeRejected) {
    return buildAuthError(options, {
      code: 'mcp_insufficient_scope',
      oauthError: 'insufficient_scope',
      message: 'The connected credentials lack the scope this tool needs.',
      hint: 'Reconnect your Transloadit account and grant the requested access.',
    })
  }
  if (error instanceof ApiError && error.code === 'INVALID_SIGNATURE') {
    return buildSignatureError(error)
  }
  return undefined
}

/**
 * Key/secret signatures fail when the configured algorithm differs from the Auth Key's
 * `signature_algo`; API2 names the required one, so the hint can say exactly what to set.
 */
const buildSignatureError = (error: ApiError): CallToolResult => {
  const required = signatureAlgorithmSchema.safeParse(
    /requires (sha\d+)/.exec(error.rawMessage ?? '')?.[1],
  )
  // An error result, so tools with stricter output schemas (list_templates) can still return it.
  return buildToolResponse(
    {
      status: 'error',
      errors: [
        {
          code: 'mcp_invalid_signature',
          message: 'Transloadit rejected the request signature for this Auth Key.',
          hint: required.success
            ? `This Auth Key signs with ${required.data}: set TRANSLOADIT_SIGNATURE_ALGORITHM=${required.data} (or the signatureAlgorithm option) and restart the MCP server.`
            : 'Check that TRANSLOADIT_SECRET and TRANSLOADIT_SIGNATURE_ALGORITHM match the Auth Key.',
        },
      ],
    },
    { isError: true },
  )
}

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '')

/** Widget-only context: whether the caller is signed in and where the Console deep links go. */
const buildWidgetContext = (
  options: TransloaditMcpServerOptions,
  assembly: AssemblyStatus,
): WidgetContext => {
  const consoleUrl = trimTrailingSlash(options.consoleUrl || defaultConsoleUrl)
  const slug = isNonEmptyString(assembly.account_slug) ? assembly.account_slug : undefined
  const assemblyId = isNonEmptyString(assembly.assembly_id) ? assembly.assembly_id : undefined
  const templateId = isNonEmptyString(assembly.template_id) ? assembly.template_id : undefined
  if (!slug) return { authenticated: true }

  const workspaceUrl = `${consoleUrl}/c/${encodeURIComponent(slug)}`
  const newTemplateUrl = new URL(`${workspaceUrl}/templates/new`)
  if (templateId && !isBuiltinTemplateId(templateId)) {
    newTemplateUrl.searchParams.set('duplicateFrom', templateId)
  }
  return {
    authenticated: true,
    assembly_console_url: assemblyId
      ? `${workspaceUrl}/assemblies/${encodeURIComponent(assemblyId)}`
      : undefined,
    new_template_url: newTemplateUrl.toString(),
  }
}

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

const assemblyIdSchema = z.string().regex(/^[a-f\d]{32}$/i)
const assemblyUrlSchema = z.url()

type AssemblyReference = { assemblyId: string; assemblyUrl: string }

const resolveAssemblyReference = (
  options: TransloaditMcpServerOptions,
  args: { assembly_url?: string; assembly_id?: string },
): AssemblyReference | { error: ReturnType<typeof buildToolError> } => {
  if (args.assembly_url === undefined && args.assembly_id === undefined) {
    return { error: buildToolError('mcp_missing_args', 'Provide assembly_url or assembly_id.') }
  }

  const path = args.assembly_url === undefined ? 'assembly_id' : 'assembly_url'
  const invalidReference = {
    error: buildToolError('mcp_invalid_args', 'Provide a valid Transloadit Assembly URL or ID.', {
      path,
    }),
  }
  // Match the SDK's default when an environment variable supplies an empty endpoint.
  const endpoint = options.endpoint || 'https://api2.transloadit.com'
  let assemblyId = args.assembly_id

  if (args.assembly_url !== undefined) {
    const parsed = assemblyUrlSchema.safeParse(args.assembly_url)
    if (!parsed.success) return invalidReference
    const url = new URL(parsed.data)
    const apiEndpoint = new URL(endpoint)
    const usesConfiguredOrigin = url.origin === apiEndpoint.origin
    const usesTransloaditOrigin = url.hostname.endsWith('.transloadit.com') && url.port === ''
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (!usesConfiguredOrigin && !usesTransloaditOrigin)
    ) {
      return invalidReference
    }

    const prefix = usesConfiguredOrigin ? apiEndpoint.pathname.replace(/\/$/, '') : ''
    const assemblyPath = `${prefix}/assemblies/`
    if (!url.pathname.startsWith(assemblyPath)) return invalidReference
    assemblyId = url.pathname.slice(assemblyPath.length).replace(/\/$/, '')
  }

  const parsedId = assemblyIdSchema.safeParse(assemblyId)
  if (!parsedId.success) return invalidReference

  // Caller URLs only identify an Assembly. Resolve its status and upload endpoints through
  // the configured API so caller-controlled hosts, redirects, and DNS never receive credentials.
  return {
    assemblyId: parsedId.data,
    assemblyUrl: `${endpoint}/assemblies/${parsedId.data}`,
  }
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

  const reference = resolveAssemblyReference(options, args)
  if ('error' in reference) return reference

  return {
    client: liveClient.client,
    ...reference,
  }
}

const apiTemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    builtin_version: z.string().optional(),
    content: z.unknown().optional(),
    account_id: z.string().nullable().optional(),
  })
  .passthrough()

const listTemplatesResponseSchema = z
  .object({
    items: z.array(apiTemplateSchema).optional(),
    count: z.number().optional(),
  })
  .passthrough()

type ApiTemplateRecord = z.infer<typeof apiTemplateSchema>

const extractTemplateSteps = (content: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(content)) return undefined
  const steps = content.steps
  return isRecord(steps) ? (steps as Record<string, unknown>) : undefined
}

const resolveTemplateId = (template: ApiTemplateRecord): string | undefined => {
  if (isNonEmptyString(template.id)) return template.id
  if (isNonEmptyString(template.name)) return template.name
  return undefined
}

const mapTemplateListItem = (template: ApiTemplateRecord) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  builtin_version: template.builtin_version,
})

const loadTemplateSteps = async (
  client: Transloadit,
  template: ApiTemplateRecord,
): Promise<Record<string, unknown> | undefined> => {
  const direct = extractTemplateSteps(template.content)
  if (direct) return direct
  const templateId = resolveTemplateId(template)
  if (!templateId) return undefined
  const full = await client.getTemplate(templateId)
  return extractTemplateSteps(full.content)
}

/**
 * API2 has no userinfo endpoint yet, so the Workspace behind the credentials is read from the
 * caller's own Assemblies (id, name and slug) or, failing that, from an owned Template (id only).
 */
const resolveWorkspaceProfile = async (
  client: Transloadit,
): Promise<WorkspaceProfile | undefined> => {
  const assemblies = await client.listAssemblies({ pagesize: 1 })
  const latest = assemblies.items[0]
  if (latest?.id) {
    const status = await client.getAssembly(latest.id)
    const id = isNonEmptyString(status.account_id) ? status.account_id : latest.account_id
    if (isNonEmptyString(id)) {
      return {
        id,
        name: isNonEmptyString(status.account_name) ? status.account_name : undefined,
        nickname: isNonEmptyString(status.account_slug) ? status.account_slug : undefined,
      }
    }
  }

  const templates = listTemplatesResponseSchema.safeParse(
    await client.listTemplates({ pagesize: 1 }),
  )
  const template = templates.success ? templates.data.items?.[0] : undefined
  if (template && isNonEmptyString(template.account_id)) {
    return { id: template.account_id }
  }
  return undefined
}

/** Host-attached files become URL inputs; `file_id` is opaque, so the field name is positional. */
const toAttachmentInputs = (attachments: HostFile[]): InputFile[] =>
  attachments.map((attachment, index) => ({
    kind: 'url',
    field: `attachment_${index + 1}`,
    url: attachment.download_url,
    filename: attachment.file_name,
    contentType: attachment.mime_type,
  }))

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

const toAssemblyInstructionsInput = (params: CreateAssemblyParams): AssemblyInstructionsInput => {
  if (!params.auth || params.auth.key) {
    return params as AssemblyInstructionsInput
  }
  const { auth: _auth, ...rest } = params
  return rest as AssemblyInstructionsInput
}

export const createTransloaditMcpServer = (
  options: TransloaditMcpServerOptions = {},
): McpServer => {
  const server = new McpServer({
    name: options.serverName ?? 'Transloadit MCP',
    version: options.serverVersion ?? packageJson.version,
  })

  const listedTools: ListedTool[] = []
  const register = <Input extends ZodObject, Output extends ZodObject>(
    name: ToolName,
    inputSchema: Input,
    outputSchema: Output,
    callback: ToolCallback<Input>,
  ): void => {
    const metadata = toolMetadata[name]
    const registered = server.registerTool(
      name,
      {
        title: metadata.title,
        description: metadata.description,
        inputSchema,
        outputSchema,
        annotations: metadata.annotations,
        _meta: buildToolMeta(metadata),
      },
      callback,
    )
    listedTools.push({
      name,
      inputSchema,
      outputSchema,
      securitySchemes: metadata.securitySchemes,
      registered,
    })
  }

  // Builtin templates supersede the old golden template tool; no legacy alias by design.
  register(
    'transloadit_lint_assembly_instructions',
    lintAssemblyInputSchema,
    lintAssemblyOutputSchema,
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

  register(
    'transloadit_create_assembly',
    createAssemblyInputSchema,
    createAssemblyOutputSchema,
    async (
      {
        instructions,
        files,
        attachments,
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
      const reference =
        assembly_url === undefined ? undefined : resolveAssemblyReference(options, { assembly_url })
      if (reference && 'error' in reference) return reference.error
      const tempCleanups: Array<() => Promise<void>> = []
      const warnings: Array<{ code: string; message: string; hint?: string; path?: string }> = []
      let templatePathHint: string | undefined

      try {
        const fileInputs: InputFile[] = [...(files ?? []), ...toAttachmentInputs(attachments ?? [])]
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
          let template: Awaited<ReturnType<typeof client.getTemplate>>
          try {
            template = await client.getTemplate(params.template_id)
          } catch (error) {
            const isTemplateNotFound =
              (error instanceof ApiError && error.code === 'TEMPLATE_NOT_FOUND') ||
              getHttpStatusCode(error) === 404

            if (isTemplateNotFound) {
              const templateId = params.template_id
              const hint = isBuiltinTemplateId(templateId)
                ? 'Builtin template not found. Call transloadit_list_templates with include_builtin: "exclusively-latest" to discover builtins.'
                : 'Template not found. Call transloadit_list_templates to discover available templates.'
              return buildToolError('mcp_template_not_found', `Template not found: ${templateId}`, {
                path: templatePathHint,
                hint,
              })
            }
            throw error
          }
          allowStepsOverride = template.content.allow_steps_override !== false
          try {
            const merged = mergeTemplateContent(
              template.content,
              toAssemblyInstructionsInput(params),
            )
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

        if (hasUrlInputs && !reference) {
          if (!analysis.hasHttpImport && !analysis.requiresUpload) {
            inputFilesForPrep = fileInputs.filter((file) => file.kind !== 'url')
            warnings.push({
              code: 'mcp_url_inputs_ignored',
              message: 'URL inputs were ignored because the template does not require input files.',
              hint: 'If you meant to process a URL, add an /http/import step or choose a workspace template that contains one. Call transloadit_list_templates to discover available templates.',
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
              ) as CreateAssemblyParams['steps']
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
          urlStrategy: reference ? 'download' : 'import-if-present',
          allowPrivateUrls: false,
          maxBase64Bytes,
        }).catch((error) => {
          const message = error instanceof Error ? error.message : 'Invalid file input.'
          if (message.startsWith('Duplicate file field')) {
            return buildToolError('mcp_duplicate_field', message, { path: 'files' })
          }
          if (message.startsWith('Base64 payload exceeds')) {
            return buildToolError('mcp_base64_too_large', message, {
              hint: 'Use a public URL import or upload from your own machine instead.',
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
          assembly = reference
            ? await client.resumeAssemblyUploads({
                assemblyUrl: reference.assemblyUrl,
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
            return buildToolError(
              'mcp_file_not_found',
              'A prepared upload is no longer available.',
              {
                hint: 'Retry with base64 or a public URL, or upload via `npx -y @transloadit/node upload`.',
              },
            )
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

        return buildToolResponse(
          {
            status: 'ok',
            assembly,
            upload: uploadSummary,
            next_steps: nextSteps,
            warnings: warnings.length > 0 ? warnings : undefined,
          },
          { meta: { [widgetContextMetaKey]: buildWidgetContext(options, assembly) } },
        )
      } catch (error) {
        const rejection = toAuthRejection(options, error)
        if (rejection) return rejection
        throw error
      } finally {
        await Promise.all(tempCleanups.map((cleanup) => cleanup()))
      }
    },
  )

  register(
    'transloadit_get_assembly_status',
    getAssemblyStatusInputSchema,
    getAssemblyStatusOutputSchema,
    async ({ assembly_url, assembly_id }, extra) => {
      const access = resolveAssemblyAccess(options, extra, { assembly_url, assembly_id })
      if ('error' in access) return access.error

      let assembly: AssemblyStatus
      try {
        assembly = await access.client.getAssembly(access.assemblyId)
      } catch (error) {
        const rejection = toAuthRejection(options, error)
        if (rejection) return rejection
        throw error
      }

      return buildToolResponse({
        status: 'ok',
        assembly,
      })
    },
  )

  register(
    'transloadit_wait_for_assembly',
    waitForAssemblyInputSchema,
    waitForAssemblyOutputSchema,
    async ({ assembly_url, assembly_id, timeout_ms, poll_interval_ms }, extra) => {
      const access = resolveAssemblyAccess(options, extra, { assembly_url, assembly_id })
      if ('error' in access) return access.error

      const start = Date.now()
      let assembly: AssemblyStatus
      try {
        assembly = await access.client.awaitAssemblyCompletion(access.assemblyId, {
          timeout: timeout_ms,
          interval: poll_interval_ms,
          assemblyUrl: access.assemblyUrl,
        })
      } catch (error) {
        const rejection = toAuthRejection(options, error)
        if (rejection) return rejection
        throw error
      }
      const waited_ms = Date.now() - start

      return buildToolResponse(
        {
          status: 'ok',
          assembly,
          waited_ms,
        },
        { meta: { [widgetContextMetaKey]: buildWidgetContext(options, assembly) } },
      )
    },
  )

  register(
    'transloadit_list_robots',
    listRobotsInputSchema,
    listRobotsOutputSchema,
    ({ category, search, limit, cursor }) => {
      const result = listRobots({ category, search, limit, cursor })

      return buildToolResponse({
        status: 'ok',
        robots: result.robots,
        next_cursor: result.nextCursor,
      })
    },
  )

  register(
    'transloadit_get_robot_help',
    getRobotHelpInputSchema,
    getRobotHelpOutputSchema,
    ({ robot_name, robot_names }) => {
      const splitComma = (value: string): string[] =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)

      const prefersSingle =
        typeof robot_name === 'string' && robot_name.trim() !== '' && !robot_name.includes(',')

      const requested =
        robot_names && robot_names.length > 0
          ? robot_names
          : robot_name
            ? splitComma(robot_name)
            : []

      if (requested.length === 0) {
        return buildToolError('mcp_missing_args', 'Provide robot_name or robot_names.')
      }

      const robots: Array<{
        name: string
        summary: string
        required_params: unknown[]
        optional_params: unknown[]
        examples?: unknown[]
      }> = []
      const notFound: string[] = []

      for (const name of requested) {
        if (!isKnownRobot(name)) {
          notFound.push(name)
          continue
        }
        const help = getRobotHelp({
          robotName: name,
          detailLevel: 'full',
        })

        robots.push({
          name: help.name,
          summary: help.summary,
          required_params: help.requiredParams,
          optional_params: help.optionalParams,
          examples: help.examples,
        })
      }

      if (prefersSingle) {
        return buildToolResponse({
          status: 'ok',
          robot: robots[0],
          not_found: notFound.length > 0 ? notFound : undefined,
        })
      }

      return buildToolResponse({
        status: 'ok',
        robots,
        not_found: notFound.length > 0 ? notFound : undefined,
      })
    },
  )

  register(
    'transloadit_list_templates',
    listTemplatesInputSchema,
    listTemplatesOutputSchema,
    async ({ page, page_size, sort, order, keywords, include_builtin, include_content }, extra) => {
      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) return liveClient.error

      try {
        const response = await liveClient.client.listTemplates({
          page,
          pagesize: page_size,
          sort,
          order,
          keywords,
          include_builtin,
        })

        const parsed = listTemplatesResponseSchema.safeParse(response)
        if (!parsed.success) {
          throw new Error('Unexpected listTemplates response shape.')
        }

        const items = parsed.data.items ?? []
        const includeContent = include_content ?? false
        const templates = await Promise.all(
          items.map(async (item) => {
            const base = mapTemplateListItem(item)
            if (!includeContent) return base
            const steps = await loadTemplateSteps(liveClient.client, item)
            return steps ? { ...base, steps } : base
          }),
        )

        return buildToolResponse({
          status: 'ok',
          templates,
          page,
          page_size: page_size,
          total: parsed.data.count ?? items.length,
        })
      } catch (error) {
        const rejection = toAuthRejection(options, error)
        if (rejection) return rejection
        const message = error instanceof Error ? error.message : 'Failed to list templates.'
        return buildToolResponse({
          status: 'error',
          templates: [],
          errors: [
            {
              code: 'mcp_list_templates_failed',
              message,
            },
          ],
        })
      }
    },
  )

  register(
    'transloadit_get_profile',
    getProfileInputSchema,
    getProfileOutputSchema,
    async (_args, extra) => {
      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) return liveClient.error

      let profile: WorkspaceProfile | undefined
      try {
        profile = await resolveWorkspaceProfile(liveClient.client)
      } catch (error) {
        const rejection = toAuthRejection(options, error)
        if (rejection) return rejection
        throw error
      }

      if (!profile) {
        // The strict profile output schema has no error shape, so this must be an error result.
        return buildToolResponse(
          {
            status: 'error',
            errors: [
              {
                code: 'mcp_profile_unavailable',
                message: 'Could not determine the Workspace behind these credentials yet.',
                hint: 'Create an Assembly or a Template first, then call this tool again.',
              },
            ],
          },
          { isError: true },
        )
      }
      return buildToolResponse(profile)
    },
  )

  registerAssemblyResultWidget(server, { resultDomains: options.resultDomains })
  installToolListHandler(server, listedTools)

  return server
}
