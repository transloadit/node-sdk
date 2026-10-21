import type { RegisteredTool, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import type {
  AssemblyInstructionsInput,
  AssemblyStatus,
  CreateAssemblyParams,
  InputFile,
  LintAssemblyInstructionsResult,
} from '@transloadit/node'
import type { SevLogger } from '@transloadit/sev-logger'
import type { ZodObject } from 'zod'

import type { BuiltinCatalog } from './builtin-shortcuts.ts'
import type { ToolName } from './tool-metadata.ts'
import type { WidgetContext } from './ui/assembly-result-widget.ts'

import { basename } from 'node:path'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  ApiError,
  addImportRobot,
  extractFieldNamesFromTemplate,
  getRobotHelp,
  isKnownRobot,
  listRobots,
  mergeTemplateContent,
  prepareInputFiles,
  Transloadit,
} from '@transloadit/node'
import { builtinTemplateFieldsSchema } from '@transloadit/zod/v4/builtinTemplates'
import { z } from 'zod'

import packageJson from '../package.json' with { type: 'json' }
import {
  applyBuiltinCatalog,
  BuiltinFieldValidationError,
  builtinShortcuts,
  loadBuiltinShortcuts,
  validateBuiltinFields,
} from './builtin-shortcuts.ts'
import { buildBearerChallenge, extractBearerToken } from './http-helpers.ts'
import { buildRedactor, getDiagnosticsLogger } from './logger.ts'
import { assertServerOptions } from './options.ts'
import { mirrorSecuritySchemes } from './tool-list.ts'
import {
  buildToolMeta,
  resolveSecuritySchemes,
  resolveToolAuthMode,
  toolMetadata,
} from './tool-metadata.ts'
import {
  describeAssemblySteps,
  registerAssemblyResultWidget,
  widgetContextMetaKey,
} from './ui/assembly-result-widget.ts'
import { buildUploadInstructions, uploadInstructionSchema } from './upload-instructions.ts'

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
  /**
   * Origins the result widget may load previews from and link to
   * (`TRANSLOADIT_MCP_RESULT_DOMAINS`). Takes exact origins or wildcard hosts; defaults to
   * Transloadit's result buckets as wildcards.
   */
  resultDomains?: string[]
  /**
   * Dedicated origin ChatGPT serves the result widget from (`openai/widgetDomain`,
   * `TRANSLOADIT_MCP_WIDGET_DOMAIN`); defaults to `https://transloadit.com`. Claude computes its
   * own `ui.domain`, so this setting does not affect it.
   */
  widgetDomain?: string
  /** Most bytes the URL inputs of one call may download together; defaults to 1 GiB. */
  maxUrlDownloadBytes?: number
  /** Longest one URL input download may take, redirects included; defaults to 10 minutes. */
  urlDownloadTimeoutMs?: number
  /**
   * Longest a call that creates, resumes or waits for an Assembly blocks before it returns the
   * Assembly's current state; defaults to 45 seconds, below the tool-call limits of MCP hosts.
   */
  maxWaitMs?: number
  /** Receives diagnostics from tool calls; defaults to a logger that writes to stderr. */
  logger?: SevLogger
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

/** URL inputs beyond these limits are not downloaded to this server's disk (per call). */
const defaultMaxUrlDownloadBytes = 1024 * 1024 * 1024
const defaultUrlDownloadTimeoutMs = 10 * 60 * 1000

/**
 * Hosts abandon tool calls that run too long (ChatGPT after about a minute) and may retry them,
 * creating a second Assembly. Calls that create or follow an Assembly therefore return its
 * current state once this budget is spent; transloadit_wait_for_assembly follows it from there.
 */
const defaultMaxWaitMs = 45_000
/** Lowest request timeout handed to the SDK, so a nearly spent budget cannot fail a request. */
const minimumSdkTimeoutMs = 10_000
/** Longest a status read after an early return may take. */
const statusReadTimeoutMs = 5_000

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

// Directory scanners require a typed schema; the server also accepts the instructions as a JSON string.
const assemblyInstructionsInputSchema = z.union([z.record(z.string(), z.unknown()), z.string()])

const createAssemblyInputSchema = z.object({
  instructions: assemblyInstructionsInputSchema.optional(),
  files: z.array(inputFileSchema).optional(),
  attachments: z.array(hostFileSchema).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  wait_for_completion: z.boolean().optional(),
  wait_timeout_ms: z.number().int().positive().optional(),
  upload_concurrency: z.number().int().positive().optional(),
  upload_chunk_size: z.number().int().positive().optional(),
  upload_behavior: z.enum(['await', 'background', 'none']).optional(),
  // Each expected upload becomes an instruction in the response; keep that response bounded.
  expected_uploads: z.number().int().positive().max(100).optional(),
  assembly_url: z.string().optional(),
})

const createAssemblyOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  assembly: z.unknown().optional(),
  running: z.boolean().optional(),
  upload: z
    .object({
      status: z.enum(['none', 'uploading', 'complete']),
      total_files: z.number().int().nonnegative(),
      resumed: z.boolean().optional(),
      upload_urls: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  upload_instructions: z.array(uploadInstructionSchema).optional(),
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
  running: z.boolean().optional(),
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
      fields_schema: builtinTemplateFieldsSchema.optional(),
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
  instructions: assemblyInstructionsInputSchema,
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

/**
 * The SDK client validates `structuredContent` against a tool's output schema even on `isError`
 * results, so tools whose schema cannot describe an error (Template lists, the strict profile)
 * return errors as text only. The text still carries the code and hint as JSON.
 */
const withoutStructuredContent = (result: CallToolResult): CallToolResult => {
  const { structuredContent: _structuredContent, ...rest } = result
  return rest
}

type AuthErrorInput = {
  code: 'mcp_missing_auth' | 'mcp_auth_rejected' | 'mcp_insufficient_scope'
  oauthError: 'invalid_token' | 'insufficient_scope'
  message: string
  hint?: string
  /** Scopes to request again; only meaningful for `insufficient_scope`. */
  scopes?: string[]
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
            scopes: input.scopes,
          }),
        ],
      },
    },
  )

const buildMissingAuthError = (options: TransloaditMcpServerOptions): CallToolResult =>
  // Only a hosted server has an authorization server a host could link an account with.
  options.resourceMetadataUrl
    ? buildAuthError(options, {
        code: 'mcp_missing_auth',
        oauthError: 'insufficient_scope',
        message: 'Sign in to Transloadit to use this tool.',
        hint: 'Connect your Transloadit account through OAuth, then retry.',
      })
    : buildCredentialError({
        code: 'mcp_missing_auth',
        message: 'This server has no Transloadit credentials for this tool.',
        hint: 'Set TRANSLOADIT_KEY/TRANSLOADIT_SECRET or send an Authorization: Bearer token.',
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

const buildShortcutError = (...args: Parameters<typeof buildToolError>): CallToolResult => ({
  ...buildToolError(...args),
  isError: true,
})

/** Maps an input preparation failure to a tool error; API rejections are left to the caller. */
const buildInputError = (error: unknown): CallToolResult => {
  // API rejections (the token check) are not input mistakes; the outer handler maps them.
  if (error instanceof ApiError) throw error
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
}

const deadlineReached = Symbol('deadlineReached')

/** Settles like `promise`, or with `deadlineReached` when it is still pending after `ms`. */
const settleWithin = async <T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof deadlineReached> => {
  let timer: NodeJS.Timeout | undefined
  const deadline = new Promise<typeof deadlineReached>((resolve) => {
    timer = setTimeout(resolve, ms, deadlineReached)
  })
  try {
    return await Promise.race([promise, deadline])
  } finally {
    clearTimeout(timer)
  }
}

/** The SDK does not export PollingTimeoutError, so it is recognized by name. */
const isPollingTimeout = (error: unknown): boolean =>
  error instanceof Error && error.name === 'PollingTimeoutError'

/** The same states the SDK's awaitAssemblyCompletion keeps polling on. */
const runningAssemblyStates = new Set([
  'ASSEMBLY_UPLOADING',
  'ASSEMBLY_EXECUTING',
  'ASSEMBLY_REPLAYING',
])

const isAssemblyRunning = (assembly: AssemblyStatus): boolean =>
  !assembly.error && typeof assembly.ok === 'string' && runningAssemblyStates.has(assembly.ok)

/** Tells the model that the call returned early and how to follow the Assembly instead of retrying. */
const buildStillRunningNotice = (
  assembly: { assembly_ssl_url?: unknown; assembly_url?: unknown },
  fallbackUrl?: string,
): { code: string; message: string; hint: string } => {
  const assemblyUrl = isNonEmptyString(assembly.assembly_ssl_url)
    ? assembly.assembly_ssl_url
    : isNonEmptyString(assembly.assembly_url)
      ? assembly.assembly_url
      : fallbackUrl
  const follow = 'Follow it with transloadit_wait_for_assembly or transloadit_get_assembly_status'
  return {
    code: 'mcp_assembly_still_running',
    message:
      'Returned before the Assembly finished, so the host does not abandon this call. The Assembly keeps running.',
    hint: assemblyUrl
      ? `${follow} using assembly_url ${assemblyUrl}; do not create it again.`
      : `${follow}; do not create it again.`,
  }
}

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

/** Which credentials a live client signs with; recovery advice differs per kind. */
type CredentialKind = 'bearer' | 'auth-key'

type LiveClientResult =
  | { client: Transloadit; credentials: CredentialKind }
  | { error: ReturnType<typeof buildToolError> }

const createLiveClient = (
  options: TransloaditMcpServerOptions,
  extra: ToolExtra,
  maxRetries?: number,
): LiveClientResult => {
  const token = getBearerToken(extra.requestInfo?.headers)
  const authToken = token && token !== options.mcpToken ? token : undefined

  if (authToken) {
    return {
      credentials: 'bearer',
      client: new Transloadit({
        authToken,
        authKey: options.authKey,
        authSecret: options.authSecret,
        endpoint: options.endpoint,
        clientName: getClientName(options),
        signatureAlgorithm: options.signatureAlgorithm,
        followRedirects: false,
        maxRetries,
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
    credentials: 'auth-key',
    client: new Transloadit({
      authKey: options.authKey,
      authSecret: options.authSecret,
      endpoint: options.endpoint,
      clientName: getClientName(options),
      signatureAlgorithm: options.signatureAlgorithm,
      followRedirects: false,
      maxRetries,
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
  credentials: CredentialKind,
  scopes: string[],
): CallToolResult | undefined => {
  const status = getHttpStatusCode(error)
  // The token or key is valid but names a different Auth Key than the instructions'
  // `auth.key`; reconnecting cannot fix that, so it is reported like any other bad argument.
  if (error instanceof ApiError && error.code === 'BEARER_TOKEN_AUTH_KEY_MISMATCH') {
    return buildCredentialError({
      code: 'mcp_auth_key_mismatch',
      message: 'The instructions name a different Auth Key than the connected credentials.',
      hint: 'Remove auth.key from the instructions; the connected credentials supply it.',
    })
  }
  // INSUFFICIENT_AUTH_SCOPE is API2's only scope rejection.
  const scopeRejected =
    status === 403 && error instanceof ApiError && error.code === 'INSUFFICIENT_AUTH_SCOPE'
  // Only forwarded tokens can be renewed by the host's account linking; an Auth Key configured
  // on the server needs an operator, so it gets no OAuth challenge.
  if (credentials === 'auth-key') {
    if (status === 401) {
      return buildCredentialError({
        code: 'mcp_credentials_rejected',
        message: 'Transloadit rejected the Auth Key this server is configured with.',
        hint: 'Check that TRANSLOADIT_KEY and TRANSLOADIT_SECRET belong to an active Auth Key.',
      })
    }
    if (scopeRejected) {
      return buildCredentialError({
        code: 'mcp_insufficient_scope',
        message: 'The configured Auth Key lacks the scope this tool needs.',
        hint: 'Grant the Auth Key the scopes this tool declares, or configure another key.',
      })
    }
  } else if (status === 401) {
    return buildAuthError(options, {
      code: 'mcp_auth_rejected',
      oauthError: 'invalid_token',
      message: 'Transloadit rejected the credentials; the token may have expired.',
      hint: 'Reconnect your Transloadit account and retry.',
    })
  } else if (scopeRejected) {
    return buildAuthError(options, {
      code: 'mcp_insufficient_scope',
      oauthError: 'insufficient_scope',
      message: 'The connected credentials lack the scope this tool needs.',
      hint: 'Reconnect your Transloadit account and grant the requested access.',
      scopes,
    })
  }
  if (error instanceof ApiError && error.code === 'INVALID_SIGNATURE') {
    return buildSignatureError(error)
  }
  return undefined
}

/** Matches resolveAssemblyReference: the SDK's default when the endpoint is empty. */
const defaultAssemblyUrl = (options: TransloaditMcpServerOptions, assemblyId: string): string =>
  `${options.endpoint || 'https://api2.transloadit.com'}/assemblies/${assemblyId}`

/** The Assembly exists, but its status could not be read with the caller's credentials. */
const buildCreatedAssemblyUnavailable = (
  options: TransloaditMcpServerOptions,
  assemblyId: string,
  describe: (assemblyUrl: string) => { code: string; message: string; hint: string } = (
    assemblyUrl,
  ) => ({
    code: 'mcp_assembly_status_unavailable',
    message:
      'The Assembly was created, but Transloadit rejected the credentials while reading its status.',
    hint: `Reconnect if needed, then call transloadit_get_assembly_status with assembly_url ${assemblyUrl} instead of creating it again.`,
  }),
): CallToolResult => {
  const assemblyUrl = defaultAssemblyUrl(options, assemblyId)
  return buildToolResponse(
    {
      status: 'error',
      assembly: { assembly_id: assemblyId, assembly_ssl_url: assemblyUrl },
      errors: [describe(assemblyUrl)],
    },
    { isError: true },
  )
}

/** The creation request is still in flight after the budget; its ID is chosen by this server. */
const buildCreationPending = (
  options: TransloaditMcpServerOptions,
  assemblyId: string,
  hasUploads: boolean,
): CallToolResult =>
  buildCreatedAssemblyUnavailable(options, assemblyId, (assemblyUrl) => ({
    code: 'mcp_assembly_creation_pending',
    message:
      'Transloadit did not confirm the Assembly in time, so this server stopped sending the creation request. Transloadit may still have received it.',
    // An Assembly that API2 accepted only after the request was stopped never receives this
    // call's files; it fails once it times out waiting for them, so creating it again is safe.
    // API2 could in theory still be handling a request it received before the abort, so the
    // hint asks for a pause first. Strict idempotency would need an API2 creation key, which
    // does not exist; this path only runs after a request already took longer than the budget.
    hint: `Wait about 30 seconds, then call transloadit_get_assembly_status with assembly_url ${assemblyUrl}. Create it again only if that reports the Assembly does not exist${hasUploads ? ', or that it is still waiting for uploads (ASSEMBLY_UPLOADING): its files were never sent' : ''}.`,
  }))

/** A failed call caused by server-side credentials; an error result so strict outputs still pass. */
const buildCredentialError = (error: {
  code: string
  message: string
  hint: string
}): CallToolResult => buildToolResponse({ status: 'error', errors: [error] }, { isError: true })

/**
 * Key/secret signatures fail when the configured algorithm differs from the Auth Key's
 * `signature_algo`; API2 names the required one, so the hint can say exactly what to set.
 */
const buildSignatureError = (error: ApiError): CallToolResult => {
  const required = signatureAlgorithmSchema.safeParse(
    /requires (sha\d+)/.exec(error.rawMessage ?? '')?.[1],
  )
  return buildCredentialError({
    code: 'mcp_invalid_signature',
    message: 'Transloadit rejected the request signature for this Auth Key.',
    hint: required.success
      ? `This Auth Key signs with ${required.data}: set TRANSLOADIT_SIGNATURE_ALGORITHM=${required.data} (or the signatureAlgorithm option) and restart the MCP server.`
      : 'Check that TRANSLOADIT_SECRET and TRANSLOADIT_SIGNATURE_ALGORITHM match the Auth Key.',
  })
}

/** The Console origin and base path without a trailing slash, or `undefined` when unusable. */
const parseConsoleUrl = (value: string): string | undefined => {
  if (!URL.canParse(value)) return undefined
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  return `${url.origin}${url.pathname}`.replace(/\/$/, '')
}

/** Widget-only context: whether the caller is signed in and where the Console deep links go. */
const buildWidgetContext = (
  options: TransloaditMcpServerOptions,
  assembly: AssemblyStatus,
): WidgetContext => {
  // Links are a convenience: a malformed consoleUrl must not turn an Assembly that was already
  // created into a failed call, which would invite a retry that processes the files twice.
  const consoleUrl = parseConsoleUrl(options.consoleUrl || defaultConsoleUrl)
  const slug = isNonEmptyString(assembly.account_slug) ? assembly.account_slug : undefined
  const assemblyId = isNonEmptyString(assembly.assembly_id) ? assembly.assembly_id : undefined
  const templateId = isNonEmptyString(assembly.template_id) ? assembly.template_id : undefined
  const steps = describeAssemblySteps(assembly)
  if (!slug || !consoleUrl) return { authenticated: true, steps }

  const workspaceUrl = `${consoleUrl}/c/${encodeURIComponent(slug)}`
  const newTemplateUrl = new URL(`${workspaceUrl}/templates/new`)
  // The Console seeds the editor from `fromAssembly` since transloadit/content#6207, which ships
  // together with this release: it loads the Assembly's effective instructions, overrides
  // included. `duplicateFrom` stays as the seed for Consoles that predate it. Hiding or relabeling
  // the action was considered and rejected in review of transloadit/node-sdk#529.
  if (assemblyId) {
    newTemplateUrl.searchParams.set('fromAssembly', assemblyId)
  }
  if (templateId && !isBuiltinTemplateId(templateId)) {
    newTemplateUrl.searchParams.set('duplicateFrom', templateId)
  }
  return {
    authenticated: true,
    assembly_console_url: assemblyId
      ? `${workspaceUrl}/assemblies/${encodeURIComponent(assemblyId)}`
      : undefined,
    new_template_url: newTemplateUrl.toString(),
    steps,
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

/** Whether a `use` value picks files by their upload field, which imported files do not have. */
const selectsByField = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some((item) => selectsByField(item))
  if (!isRecord(value)) return false
  return 'fields' in value || Object.values(value).some((item) => selectsByField(item))
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

/**
 * Turns a workflow's upload Step into an /http/import Step, so Transloadit fetches the URL inputs
 * itself instead of this server downloading and uploading them. It reuses the Console's import fix
 * (alphalib's addImportRobot); API2 rewrites the `:original` Step of a replayed Assembly the same
 * way. Returns undefined unless every consumer then reads exactly the imported files.
 */
const replaceUploadWithImport = (
  steps: Record<string, unknown>,
  urlInputs: Array<{ field: string; url: string; filename?: string }>,
): Record<string, unknown> | undefined => {
  const uploadStepNames = Object.keys(steps).filter((name) => {
    const step = steps[name]
    return isRecord(step) && step.robot === '/upload/handle'
  })
  const [uploadStepName] = uploadStepNames
  if (uploadStepName === undefined || uploadStepNames.length > 1) return undefined
  // An import Step cannot carry upload parameters such as output_meta. A Step without `use`
  // would not receive the imported files, and imports carry no upload field to select or filter
  // by.
  const uploadStep = steps[uploadStepName]
  if (!isRecord(uploadStep) || Object.keys(uploadStep).length > 1) return undefined
  for (const [name, step] of Object.entries(steps)) {
    if (name === uploadStepName) continue
    if (!isRecord(step) || step.use === undefined || selectsByField(step.use)) return undefined
  }
  if (/\bfile\.field\b/.test(JSON.stringify(steps))) return undefined
  // Imports are named after their URL. Keep the names a caller gave, as a download did, because
  // host attachment URLs rarely end in the file's name. API2 applies the whole name map to a URL
  // it does not list, so once one URL is named, every URL gets the name a download would use.
  const named = urlInputs.some(({ filename }) => filename)
  const nameByUrl = new Map<string, string>()
  for (const { field, url, filename } of urlInputs) {
    const name = filename ? basename(filename) : basename(new URL(url).pathname) || `${field}.bin`
    // Names are given per URL, so one URL cannot be imported under two names.
    if ((nameByUrl.get(url) ?? name) !== name) return undefined
    nameByUrl.set(url, name)
  }

  const rewritten = safeJsonParse(addImportRobot(JSON.stringify({ steps })))
  const nextSteps = isRecord(rewritten) && isRecord(rewritten.steps) ? rewritten.steps : {}
  const [importStepName, ...otherImportStepNames] = listHttpImportStepNames(nextSteps)
  const importStep = importStepName === undefined ? undefined : nextSteps[importStepName]
  if (
    importStepName === undefined ||
    !isRecord(importStep) ||
    otherImportStepNames.length > 0 ||
    // Another Step with the import Step's name would have replaced it.
    Object.keys(nextSteps).length !== Object.keys(steps).length ||
    analyzeSteps(nextSteps).requiresUpload
  ) {
    return undefined
  }
  // The fix imports a demo file; the URL inputs take its place.
  const { url: _demoUrl, ...importWithoutUrl } = importStep
  return {
    ...nextSteps,
    [importStepName]: {
      ...importWithoutUrl,
      ...(named ? { force_name: Object.fromEntries(nameByUrl) } : {}),
    },
  }
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

/**
 * Reads an Assembly's current status once, without outlasting the host's patience. The SDK's
 * rate-limit backoff does not observe the abort signal, so the read is also raced against the
 * clock; without a status in time, it returns undefined.
 */
const readAssemblyStatus = async (
  client: Transloadit,
  assemblyId: string,
): Promise<AssemblyStatus | undefined> => {
  const status = await settleWithin(
    // Aborts after the race below gave up, so the abort never becomes the call's error.
    client.getAssembly(assemblyId, { signal: AbortSignal.timeout(statusReadTimeoutMs + 1_000) }),
    statusReadTimeoutMs,
  )
  return status === deadlineReached ? undefined : status
}

/** Answers a call that returned early when not even the Assembly's status arrived in time. */
const buildStatusPendingResponse = (
  reference: AssemblyReference,
  fields: Record<string, unknown> = {},
): CallToolResult =>
  buildToolResponse({
    status: 'ok',
    assembly: { assembly_id: reference.assemblyId, assembly_ssl_url: reference.assemblyUrl },
    running: true,
    ...fields,
    warnings: [buildStillRunningNotice({}, reference.assemblyUrl)],
  })

const isHttpUrl = (value: string): boolean =>
  URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol)

/** Production (`.com`) and development or tunnel (`.dev`) Transloadit hosts. */
const isTransloaditHost = (hostname: string): boolean =>
  ['transloadit.com', 'transloadit.dev'].some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  )

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

  // The message promises "URL or ID", and models pass a bare ID in either field.
  if (args.assembly_url !== undefined && assemblyIdSchema.safeParse(args.assembly_url).success) {
    assemblyId = args.assembly_url
  } else if (args.assembly_url !== undefined) {
    const parsed = assemblyUrlSchema.safeParse(args.assembly_url)
    if (!parsed.success) return invalidReference
    const url = new URL(parsed.data)
    const apiEndpoint = new URL(endpoint)
    const usesConfiguredOrigin = url.origin === apiEndpoint.origin
    // A hosted server may answer on a public origin (a tunnel or proxy) other than its API
    // endpoint; Assembly URLs it hands out carry that origin.
    const usesPublicOrigin =
      options.resourceMetadataUrl !== undefined &&
      URL.canParse(options.resourceMetadataUrl) &&
      url.origin === new URL(options.resourceMetadataUrl).origin
    const usesTransloaditOrigin = isTransloaditHost(url.hostname) && url.port === ''
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (!usesConfiguredOrigin && !usesPublicOrigin && !usesTransloaditOrigin)
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
      credentials: CredentialKind
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
    credentials: liveClient.credentials,
    ...reference,
  }
}

const apiTemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    builtin_version: z.string().optional(),
    fields_schema: builtinTemplateFieldsSchema.optional(),
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
  ...(template.fields_schema !== undefined ? { fields_schema: template.fields_schema } : {}),
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
    // The details only add the Workspace name; an expired or unreadable Assembly must not hide
    // the id the list already returned, nor skip the Template fallback.
    const status: Partial<AssemblyStatus> = await client.getAssembly(latest.id).catch(() => ({}))
    const id = isNonEmptyString(status.account_id) ? status.account_id : latest.account_id
    if (isNonEmptyString(id)) {
      return {
        id,
        name: isNonEmptyString(status.account_name) ? status.account_name : undefined,
        nickname: isNonEmptyString(status.account_slug) ? status.account_slug : undefined,
      }
    }
  }

  // API2's default Template list fields omit account_id, so request it explicitly.
  const templates = listTemplatesResponseSchema.safeParse(
    await client.listTemplates({ pagesize: 1, fields: ['id', 'account_id'] }),
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

const ownToolsByServer = new WeakMap<McpServer, Map<ToolName, RegisteredTool>>()

/**
 * The tools `createTransloaditMcpServer()` registered on `server`, in registration order. The
 * server card reads them so it cannot drift from what `tools/list` serves.
 */
export const listOwnTools = (server: McpServer): ReadonlyMap<ToolName, RegisteredTool> => {
  const tools = ownToolsByServer.get(server)
  if (!tools) throw new Error('The server was not created by createTransloaditMcpServer().')
  return tools
}

export const createTransloaditMcpServer = (
  options: TransloaditMcpServerOptions = {},
): McpServer => {
  assertServerOptions(options)
  const logger = (options.logger ?? getDiagnosticsLogger()).nest('assemblies')
  const redactError = buildRedactor([options.authSecret, options.upstreamSecret, options.mcpToken])
  const server = new McpServer({
    name: options.serverName ?? 'Transloadit MCP',
    version: options.serverVersion ?? packageJson.version,
  })

  const authMode = resolveToolAuthMode(options)
  const ownTools = new Map<ToolName, RegisteredTool>()
  ownToolsByServer.set(server, ownTools)
  const register = <
    Input extends ZodObject,
    Output extends ZodObject,
    Callback extends ToolCallback<Input>,
  >(
    name: ToolName,
    inputSchema: Input,
    outputSchema: Output,
    callback: Callback,
  ): Callback => {
    const metadata = toolMetadata[name]
    const registered = server.registerTool(
      name,
      {
        title: metadata.title,
        description: metadata.description,
        inputSchema,
        outputSchema,
        // Directories read the listing name from `annotations.title`, not the tool's `title`.
        annotations: { title: metadata.title, ...metadata.annotations },
        _meta: buildToolMeta(metadata, resolveSecuritySchemes(metadata, authMode)),
      },
      callback,
    )
    ownTools.set(name, registered)
    return callback
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

  const createAssembly = register(
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
      fieldContractValidated = false,
      // Shortcuts start the clock before loading their catalog, which counts toward the budget.
      startedAt = performance.now(),
    ) => {
      const liveClient = createLiveClient(options, extra)
      if ('error' in liveClient) return liveClient.error
      const { client, credentials } = liveClient
      const reference =
        assembly_url === undefined ? undefined : resolveAssemblyReference(options, { assembly_url })
      if (reference && 'error' in reference) return reference.error
      const tempCleanups: Array<() => Promise<void>> = []
      // Uploads or polling that continue after the call returned early.
      let backgroundWork: Promise<void> | undefined
      const warnings: Array<{ code: string; message: string; hint?: string; path?: string }> = []
      let templatePathHint: string | undefined
      const maxWaitMs = options.maxWaitMs ?? defaultMaxWaitMs
      // Preparation (Template lookup, file inputs) runs before any Assembly exists, so failing
      // once it used up the budget is safe to retry, unlike a host timeout after creation.
      const preparationRemainingMs = (): number =>
        Math.max(startedAt + maxWaitMs - performance.now(), 0)
      const preparationTimeout = (reason?: string): CallToolResult =>
        buildToolError(
          'mcp_preparation_timeout',
          reference
            ? 'Preparing the files took too long, so none were added to the Assembly.'
            : 'Preparing the Assembly took too long, so none was created.',
          {
            hint: reason ? `Retrying this call is safe. ${reason}` : 'Retrying this call is safe.',
          },
        )

      try {
        const fileInputs: InputFile[] = [...(files ?? []), ...toAttachmentInputs(attachments ?? [])]
        const urlInputs = fileInputs.filter(
          (file): file is Extract<InputFile, { kind: 'url' }> => file.kind === 'url',
        )
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
            const lookup = await settleWithin(
              client.getTemplate(params.template_id),
              preparationRemainingMs(),
            )
            if (lookup === deadlineReached) return preparationTimeout()
            template = lookup
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
          } else if (
            // Other schemes are left to the download path, which rejects them before creation.
            fileInputs.every((file) => file.kind === 'url' && isHttpUrl(file.url)) &&
            (expected_uploads ?? 0) === 0 &&
            // Only a shortcut's Builtin, whose fields were checked against the catalog contract,
            // runs without its Template ID; other Templates keep API2's own handling.
            (params.template_id === undefined || fieldContractValidated)
          ) {
            // Uploads would make this server download every URL before the Assembly exists.
            // Transloadit fetches them itself once the upload Step becomes an /http/import Step.
            // Builtins forbid Steps overrides, so their own Steps run without the Template ID.
            const importSteps = mergedSteps && replaceUploadWithImport(mergedSteps, urlInputs)
            if (importSteps && mergedInstructions) {
              const {
                template_id: _templateId,
                allow_steps_override: _allowStepsOverride,
                ...instructions
              } = mergedInstructions
              params = { ...instructions, steps: importSteps as CreateAssemblyParams['steps'] }
            }
          }
        }

        // Placeholder discovery is a compatibility heuristic for generic Templates. Approved
        // shortcuts already validated their complete fields against the catalog contract,
        // which knows that placeholders such as encode-video's width/height are optional.
        if (mergedInstructions && !fieldContractValidated) {
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
        // The hosted gate only checks that a bearer is present. Before a URL input is downloaded
        // to this server's disk (not for /http/import), API2 vouches for the token once
        // (templates:read is declared for this tool).
        let tokenCheck: Promise<unknown> | undefined
        const verifyTokenBeforeDownload = async (): Promise<void> => {
          tokenCheck ??= client.listTemplates({ pagesize: 1 })
          await tokenCheck
        }
        const preparation = prepareInputFiles({
          inputFiles: inputFilesForPrep,
          params,
          fields,
          base64Strategy: 'tempfile',
          urlStrategy: reference ? 'download' : 'import-if-present',
          allowPrivateUrls: false,
          maxBase64Bytes,
          maxUrlDownloadBytes: options.maxUrlDownloadBytes ?? defaultMaxUrlDownloadBytes,
          urlDownloadTimeoutMs: options.urlDownloadTimeoutMs ?? defaultUrlDownloadTimeoutMs,
          beforeUrlDownload: credentials === 'bearer' ? verifyTokenBeforeDownload : undefined,
        })
        const prep = await settleWithin(preparation, preparationRemainingMs()).catch(
          buildInputError,
        )
        if (prep === deadlineReached) {
          // prepareInputFiles takes no abort signal, so a download still running is removed once
          // it ends; urlDownloadTimeoutMs and maxUrlDownloadBytes bound it meanwhile.
          void preparation
            .then(
              (late) => Promise.all(late.cleanup.map((cleanupFile) => cleanupFile())),
              () => undefined,
            )
            .catch((error: unknown) => {
              logger.warn('Removing prepared files failed: %s', redactError(error))
            })
          return preparationTimeout(
            inputFilesForPrep.some((file) => file.kind === 'url')
              ? 'Downloading a URL input took too long. Transloadit fetches a URL itself when it is the only input of a Builtin shortcut, or when the Steps contain an /http/import Step.'
              : undefined,
          )
        }
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

        // Files the caller uploads itself (from a sandbox) can only start once this call returns,
        // so waiting here would just run into the timeout.
        const outOfBandUploads = reference ? 0 : Math.max((expected_uploads ?? 0) - totalFiles, 0)
        const waitForCompletion = (wait_for_completion ?? false) && outOfBandUploads === 0
        if (wait_for_completion && outOfBandUploads > 0) {
          warnings.push({
            code: 'mcp_wait_skipped_for_uploads',
            message:
              'Did not wait for completion because the Assembly waits for the expected uploads. Run upload_instructions, then call transloadit_wait_for_assembly.',
          })
        }
        const uploadBehavior = upload_behavior ?? (waitForCompletion ? 'await' : 'background')
        const uploadConcurrency = upload_concurrency
        const chunkSize = upload_chunk_size

        const deadline =
          startedAt +
          (waitForCompletion ? Math.min(wait_timeout_ms ?? maxWaitMs, maxWaitMs) : maxWaitMs)
        const remainingMs = (): number => Math.max(deadline - performance.now(), 0)
        // The SDK also applies this timeout to the creation request. It outlasts the deadline and
        // the creation grace period after it, so a request timeout never fails a creation that
        // API2 may have accepted; the deadline below bounds the call itself. Polling after an
        // early return is not stopped separately: it ends with this timeout, a few seconds later,
        // and the signal that could stop it would also stop uploads the Assembly still needs.
        const timeout = Math.max(remainingMs() + statusReadTimeoutMs + 1_000, minimumSdkTimeoutMs)

        // Every status the SDK reports, so a call that returns early still has the latest state.
        let latest: AssemblyStatus | undefined
        const trackProgress = (status: AssemblyStatus): void => {
          latest = status
        }

        let assembly: AssemblyStatus
        // Set by the SDK only after API2 accepted the creation request, so a rejected request
        // (including an error body with HTTP 200) is never mistaken for an existing Assembly.
        let createdAssemblyId: string | undefined
        let resolveCreated: (status: AssemblyStatus) => void = () => undefined
        const created = new Promise<AssemblyStatus>((resolve) => {
          resolveCreated = resolve
        })
        let work: Promise<AssemblyStatus>
        // Chosen by the SDK before the creation request is sent.
        let creationAssemblyId: string | undefined
        // Stops a creation request (and its rate-limit retries) that outlasted the call.
        const creationAbort = new AbortController()
        if (reference) {
          work = client.resumeAssemblyUploads({
            assemblyUrl: reference.assemblyUrl,
            files: filesMap,
            uploads: uploadsMap,
            waitForCompletion,
            timeout,
            uploadConcurrency,
            chunkSize,
            uploadBehavior,
            onAssemblyProgress: trackProgress,
          })
        } else {
          const creation = client.createAssembly({
            params,
            files: filesMap,
            uploads: uploadsMap,
            waitForCompletion,
            timeout,
            uploadConcurrency,
            chunkSize,
            uploadBehavior,
            expectedUploads: expected_uploads,
            onAssemblyCreated: (status) => {
              createdAssemblyId = status.assembly_id ?? creation.assemblyId
              latest = status
              resolveCreated(status)
            },
            onAssemblyProgress: trackProgress,
            signal: creationAbort.signal,
          })
          creationAssemblyId = creation.assemblyId
          work = creation
        }

        let workSettled = true
        let returnedEarly = false
        try {
          const outcome = await settleWithin(work, remainingMs())
          if (outcome !== deadlineReached) {
            assembly = outcome
          } else {
            // Hosts abandon calls that outlast their deadline and retry them, which creates a
            // second Assembly. Return what is known instead; the Assembly keeps running.
            workSettled = false
            returnedEarly = true
            backgroundWork = work.then(
              () => undefined,
              (error: unknown) => {
                if (isPollingTimeout(error) || creationAbort.signal.aborted) return
                // Hosted instances keep no per-Assembly state to report this later; follow-up
                // status calls show the Assembly itself.
                logger.warn('Assembly work after an early return failed: %s', redactError(error))
              },
            )
            if (latest) {
              assembly = latest
            } else if (reference) {
              // The uploads keep running, so even a rejected read must not invite a replay.
              const status = await readAssemblyStatus(client, reference.assemblyId).catch(
                () => undefined,
              )
              if (!status) {
                return buildStatusPendingResponse(reference, {
                  upload: { ...uploadSummary, status: 'uploading', resumed: true },
                  next_steps: ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status'],
                })
              }
              assembly = status
            } else {
              // The creation request itself is slow (or retried); give it as long as a status read.
              const known = await settleWithin(Promise.race([created, work]), statusReadTimeoutMs)
              if (known === deadlineReached) {
                // Without the request, nothing can create this Assembly later, so a status check
                // that finds no Assembly makes creating it again safe.
                creationAbort.abort()
                return creationAssemblyId
                  ? buildCreationPending(
                      options,
                      creationAssemblyId,
                      totalFiles + outOfBandUploads > 0,
                    )
                  : buildToolError(
                      'mcp_assembly_creation_pending',
                      'Creating the Assembly is taking too long.',
                    )
              }
              assembly = known
            }
          }
        } catch (error) {
          if (isPollingTimeout(error) && latest) {
            // The SDK's own polling ran out of time; the Assembly is still known and running.
            assembly = latest
            returnedEarly = true
          } else {
            // Once API2 accepted the creation request, an auth failure (a token expiring while
            // uploads or polling run) must not reach the client as a challenge: it would refresh
            // and replay the call, creating and billing a second Assembly.
            if (createdAssemblyId && toAuthRejection(options, error, credentials, [])) {
              return buildCreatedAssemblyUnavailable(options, createdAssemblyId)
            }
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
        }

        if (assembly_url) {
          uploadSummary.resumed = true
        }

        if (totalFiles === 0) {
          uploadSummary.status = 'none'
        } else if (uploadBehavior === 'none') {
          uploadSummary.status = 'none'
        } else if (
          uploadBehavior === 'background' ||
          (!workSettled && assembly.ok === 'ASSEMBLY_UPLOADING')
        ) {
          uploadSummary.status = 'uploading'
        }

        if (isRecord(assembly.upload_urls)) {
          uploadSummary.upload_urls = assembly.upload_urls as Record<string, string>
        }

        const uploadInstructions =
          outOfBandUploads > 0
            ? buildUploadInstructions(
                assembly,
                outOfBandUploads,
                new Set([...Object.keys(filesMap), ...Object.keys(uploadsMap)]),
              )
            : undefined
        if (outOfBandUploads > 0 && !uploadInstructions) {
          warnings.push({
            code: 'mcp_upload_instructions_unavailable',
            message: 'The Assembly status has no tus_url or assembly_ssl_url to upload to.',
          })
        }
        const running = isAssemblyRunning(assembly)
        if (returnedEarly && running) {
          warnings.push(buildStillRunningNotice(assembly, reference?.assemblyUrl))
        }
        const nextSteps = uploadInstructions
          ? ['transloadit_wait_for_assembly']
          : waitForCompletion && !running
            ? []
            : ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status']

        return buildToolResponse(
          {
            status: 'ok',
            assembly,
            running,
            upload: uploadSummary,
            upload_instructions: uploadInstructions,
            next_steps: nextSteps,
            warnings: warnings.length > 0 ? warnings : undefined,
          },
          { meta: { [widgetContextMetaKey]: buildWidgetContext(options, assembly) } },
        )
      } catch (error) {
        const rejection = toAuthRejection(
          options,
          error,
          credentials,
          toolMetadata.transloadit_create_assembly.scopes,
        )
        if (rejection) return rejection
        throw error
      } finally {
        const cleanup = async (): Promise<void> => {
          await Promise.all(tempCleanups.map((cleanupFile) => cleanupFile()))
        }
        // Uploads that continue after an early return still read the prepared files. This
        // promise never rejects.
        if (backgroundWork) {
          void backgroundWork.then(cleanup).catch((error: unknown) => {
            logger.warn('Removing prepared files failed: %s', redactError(error))
          })
        } else {
          await cleanup()
        }
      }
    },
  )

  // Keep the generic execution path responsible for auth, uploads, waiting and widget results.
  // Shortcuts can supply fields and files, but cannot replace the Builtin's reviewed workflow.
  const shortcutInputSchema = createAssemblyInputSchema
    .omit({ instructions: true, assembly_url: true })
    .strict()
  for (const { id, name } of builtinShortcuts) {
    register(name, shortcutInputSchema, createAssemblyOutputSchema, async (args, extra) => {
      const startedAt = performance.now()
      const live = createLiveClient(options, extra, 0)
      if ('error' in live) return live.error
      let catalog: BuiltinCatalog
      try {
        catalog = await loadBuiltinShortcuts(live.client, id)
      } catch (error) {
        const rejection = toAuthRejection(
          options,
          error,
          live.credentials,
          toolMetadata[name].scopes,
        )
        if (rejection) return rejection
        return buildShortcutError(
          'mcp_builtin_unavailable',
          'Could not load the Builtin catalog. Retry discovery with transloadit_list_templates.',
        )
      }
      const template = catalog.get(id)
      if (!template) {
        return buildShortcutError(
          'mcp_builtin_unavailable',
          'This shortcut’s reviewed Builtin field contract is unavailable. Call transloadit_list_templates to discover available templates.',
        )
      }
      let fields: Record<string, unknown>
      try {
        fields = validateBuiltinFields(template, args.fields)
      } catch (error) {
        if (!(error instanceof BuiltinFieldValidationError)) {
          return buildShortcutError(
            'mcp_builtin_unavailable',
            'This shortcut’s catalog field contract could not be validated. Retry discovery.',
          )
        }
        return buildShortcutError('mcp_invalid_builtin_fields', error.message, { path: 'fields' })
      }
      const result = await createAssembly(
        { ...args, fields, instructions: { template_id: template.id } },
        extra,
        true,
        startedAt,
      )
      // Keep the generic tool's historical error shape while making new shortcut failures
      // recognizable to MCP clients that rely on isError instead of structuredContent.status.
      return result.structuredContent?.status === 'error' ? { ...result, isError: true } : result
    })
  }

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
        const rejection = toAuthRejection(
          options,
          error,
          access.credentials,
          toolMetadata.transloadit_get_assembly_status.scopes,
        )
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
      const maxWaitMs = options.maxWaitMs ?? defaultMaxWaitMs
      const budgetMs = Math.min(timeout_ms ?? maxWaitMs, maxWaitMs)
      // Polling only reads status, so it can be stopped as soon as the budget is spent.
      const polling = new AbortController()
      let latest: AssemblyStatus | undefined
      let assembly: AssemblyStatus
      let returnedEarly = false
      try {
        const outcome = await settleWithin(
          access.client.awaitAssemblyCompletion(access.assemblyId, {
            timeout: budgetMs,
            interval: poll_interval_ms,
            assemblyUrl: access.assemblyUrl,
            signal: polling.signal,
            onAssemblyProgress: (status) => {
              latest = status
            },
          }),
          budgetMs,
        )
        if (outcome === deadlineReached) {
          polling.abort()
          returnedEarly = true
          const status = latest ?? (await readAssemblyStatus(access.client, access.assemblyId))
          if (!status) {
            return buildStatusPendingResponse(
              {
                assemblyId: access.assemblyId,
                assemblyUrl: access.assemblyUrl ?? defaultAssemblyUrl(options, access.assemblyId),
              },
              { waited_ms: Date.now() - start },
            )
          }
          assembly = status
        } else {
          assembly = outcome
        }
      } catch (error) {
        if (!(isPollingTimeout(error) && latest)) {
          const rejection = toAuthRejection(
            options,
            error,
            access.credentials,
            toolMetadata.transloadit_wait_for_assembly.scopes,
          )
          if (rejection) return rejection
          throw error
        }
        assembly = latest
        returnedEarly = true
      }
      const waited_ms = Date.now() - start
      const running = isAssemblyRunning(assembly)

      return buildToolResponse(
        {
          status: 'ok',
          assembly,
          running,
          waited_ms,
          warnings:
            returnedEarly && running
              ? [buildStillRunningNotice(assembly, access.assemblyUrl)]
              : undefined,
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
      if ('error' in liveClient) return withoutStructuredContent(liveClient.error)

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
        const rejection = toAuthRejection(
          options,
          error,
          liveClient.credentials,
          toolMetadata.transloadit_list_templates.scopes,
        )
        if (rejection) return withoutStructuredContent(rejection)
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
      if ('error' in liveClient) return withoutStructuredContent(liveClient.error)

      let profile: WorkspaceProfile | undefined
      try {
        profile = await resolveWorkspaceProfile(liveClient.client)
      } catch (error) {
        const rejection = toAuthRejection(
          options,
          error,
          liveClient.credentials,
          toolMetadata.transloadit_get_profile.scopes,
        )
        if (rejection) return withoutStructuredContent(rejection)
        throw error
      }

      if (!profile) {
        // The strict profile output schema has no error shape, so this must be an error result.
        return withoutStructuredContent(
          buildToolResponse(
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
          ),
        )
      }
      return buildToolResponse(profile)
    },
  )

  registerAssemblyResultWidget(server, {
    resultDomains: options.resultDomains,
    widgetDomain: options.widgetDomain,
    consoleUrl: parseConsoleUrl(options.consoleUrl || defaultConsoleUrl),
  })
  mirrorSecuritySchemes(server, async (result, extra) => {
    if (!isRecord(result) || !Array.isArray(result.tools)) return result
    const live = createLiveClient(options, extra, 0)
    // A failed catalog read must not prevent discovery of the existing generic tools. The
    // authenticated list/call tools still return actionable auth errors through their own paths.
    const catalog: BuiltinCatalog | undefined =
      'error' in live ? new Map() : await loadBuiltinShortcuts(live.client).catch(() => undefined)
    return applyBuiltinCatalog(result, catalog)
  })

  return server
}
