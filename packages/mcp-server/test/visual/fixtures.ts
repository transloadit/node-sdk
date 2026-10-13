import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { WidgetContext } from '../../src/ui/assembly-result-widget.ts'

import { widgetContextMetaKey } from '../../src/ui/assembly-result-widget.ts'

/**
 * Result and upload file entries as API2 reports them (the subset of `assemblyStatusResultSchema`
 * that the widget reads, plus the fields that make a fixture recognizable).
 */
interface FixtureFile {
  id: string
  name: string
  basename: string
  ext: string
  mime: string
  type: 'image' | 'video' | 'audio' | 'document' | null
  field?: string
  size: number
  size_human: string
  width?: number
  height?: number
  duration?: number
  url: string
  ssl_url: string
}

/** How the fake MCP Apps host answers the widget's `ui/initialize`. */
type HostInitialize = 'accept' | 'reject'

/** One state of the result widget, with everything the fake hosts need to put it on screen. */
export interface WidgetStateFixture {
  /** Used in screenshot names, so keep it short and kebab-cased. */
  name: string
  initialize: HostInitialize
  /** Send `ui/notifications/tool-input` before anything else (MCP Apps only). */
  toolInput: boolean
  /** Send `ui/notifications/tool-cancelled` after the tool input (MCP Apps only). */
  cancelled: boolean
  /** The `CallToolResult` delivered as `ui/notifications/tool-result` or `window.openai`. */
  result?: CallToolResult
  /**
   * Whether ChatGPT can show this state through `window.openai`: it has no tool-input,
   * cancellation or handshake failure, and only hands over `structuredContent`.
   */
  openai: boolean
  /** Text that is on screen once the state has rendered. */
  waitForText: string
}

/** Origins the fake hosts serve media from; both are in `defaultResultDomains`. */
export const resultOrigin = 'https://pub-4f1c2a9e.r2.dev'
export const uploadOrigin = 'https://tmp-us-east-1.transloadit.net'

/** Path segment of result URLs that the fake host answers with 404, forever. */
export const missingMediaSegment = '/missing/'

const assemblyId = '9f2c1e6a8b4d4c3fa1e07b5d2c6e8f10'
const accountSlug = 'acme'
const assemblySslUrl = `https://api2-sjc.transloadit.com/assemblies/${assemblyId}`

// What buildWidgetContext() returns for a signed-in caller with the default Console URL.
const signedInContext: WidgetContext = {
  authenticated: true,
  assembly_console_url: `https://transloadit.com/c/${accountSlug}/assemblies/${assemblyId}`,
  new_template_url: `https://transloadit.com/c/${accountSlug}/templates/new?fromAssembly=${assemblyId}`,
}

const signedOutContext: WidgetContext = { authenticated: false }

let nextFileId = 1

const file = (
  input: Omit<FixtureFile, 'id' | 'basename' | 'ext' | 'url' | 'ssl_url' | 'size_human'> & {
    origin?: string
    path?: string
  },
): FixtureFile => {
  const id = `${(nextFileId++).toString(16).padStart(8, '0')}c0ffee${assemblyId.slice(0, 18)}`
  const dot = input.name.lastIndexOf('.')
  const origin = input.origin ?? resultOrigin
  const path = input.path ?? `/${assemblyId.slice(0, 2)}/${assemblyId.slice(2)}/${input.name}`
  const sizeHuman =
    input.size >= 1024 * 1024
      ? `${(input.size / 1024 / 1024).toFixed(2)} MB`
      : `${(input.size / 1024).toFixed(2)} KB`
  return {
    id,
    name: input.name,
    basename: dot === -1 ? input.name : input.name.slice(0, dot),
    ext: dot === -1 ? '' : input.name.slice(dot + 1),
    mime: input.mime,
    type: input.type,
    field: input.field,
    size: input.size,
    size_human: sizeHuman,
    width: input.width,
    height: input.height,
    duration: input.duration,
    url: `${origin.replace('https:', 'http:')}${path}`,
    ssl_url: `${origin}${path}`,
  }
}

const image = (
  name: string,
  extra: Partial<FixtureFile> & { origin?: string; path?: string } = {},
) =>
  file({ name, mime: 'image/png', type: 'image', size: 14_108, width: 640, height: 400, ...extra })

const video = (name: string) =>
  file({
    name,
    mime: 'video/webm',
    type: 'video',
    size: 1_284_310,
    width: 320,
    height: 180,
    duration: 1,
  })

const audio = (name: string) =>
  file({ name, mime: 'audio/mpeg', type: 'audio', size: 4406, duration: 1 })

const document = (name: string, mime = 'application/pdf') =>
  file({ name, mime, type: 'document', size: 48_211 })

const upload = (name: string) => image(name, { origin: uploadOrigin, field: 'file' })

interface AssemblyInput {
  ok?: string
  error?: string
  message?: string
  uploads?: FixtureFile[]
  results?: Record<string, FixtureFile[]>
}

const assembly = ({ ok, error, message, uploads = [], results = {} }: AssemblyInput) => ({
  ok,
  error,
  message:
    message ??
    (ok === 'ASSEMBLY_COMPLETED' ? 'The Assembly was successfully completed.' : undefined),
  assembly_id: assemblyId,
  account_slug: accountSlug,
  assembly_url: assemblySslUrl.replace('https:', 'http:'),
  assembly_ssl_url: assemblySslUrl,
  template_id: null,
  bytes_received: uploads.reduce((sum, item) => sum + item.size, 0),
  bytes_expected: uploads.reduce((sum, item) => sum + item.size, 0),
  execution_duration: 4.812,
  uploads,
  results,
})

/**
 * Mirrors server.ts `buildToolResponse()`. Create/wait results that reached API2 carry the widget
 * context; tool errors carry none.
 */
const toolResponse = (
  payload: Record<string, unknown>,
  extras: { context?: WidgetContext; isError?: boolean } = { context: signedInContext },
): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(payload) }],
  structuredContent: payload,
  ...(extras.isError ? { isError: true } : {}),
  ...(extras.context ? { _meta: { [widgetContextMetaKey]: extras.context } } : {}),
})

const completed = (input: Omit<AssemblyInput, 'ok'>, extra: Record<string, unknown> = {}) => ({
  status: 'ok',
  assembly: assembly({ ok: 'ASSEMBLY_COMPLETED', ...input }),
  upload: { status: 'complete', total_files: input.uploads?.length ?? 0 },
  next_steps: [],
  ...extra,
})

const longName = 'quarterly-campaign-hero-banner-final-final-v3-approved-by-legal-team-2026-q4.png'

const manySteps = (): { uploads: FixtureFile[]; results: Record<string, FixtureFile[]> } => {
  const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1)
  return {
    uploads: range(4).map((index) => upload(`photo-${index}.png`)),
    results: {
      resized: range(12).map((index) => image(`photo-${index}-1200w.png`)),
      thumbnailed: range(12).map((index) =>
        image(`photo-${index}-thumb.png`, { width: 160, height: 100 }),
      ),
      encoded: range(6).map((index) => video(`clip-${index}.webm`)),
      described: range(6).map((index) =>
        document(`photo-${index}-labels.json`, 'application/json'),
      ),
    },
  }
}

/** Every state the widget can be in, in the order a reviewer would walk through them. */
export const widgetStateFixtures: WidgetStateFixture[] = [
  {
    name: 'waiting',
    initialize: 'accept',
    toolInput: false,
    cancelled: false,
    openai: true,
    waitForText: 'Waiting for the Assembly result…',
  },
  {
    name: 'running',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: false,
    waitForText: 'Running the Assembly…',
  },
  {
    name: 'cancelled',
    initialize: 'accept',
    toolInput: true,
    cancelled: true,
    openai: false,
    waitForText: 'The tool call was cancelled.',
  },
  {
    name: 'host-init-rejected',
    initialize: 'reject',
    toolInput: false,
    cancelled: false,
    openai: false,
    waitForText: 'This host could not start the Assembly result view.',
  },
  {
    // buildToolError('mcp_file_not_found', …) from transloadit_create_assembly.
    name: 'error-no-assembly',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'A prepared upload is no longer available.',
    result: toolResponse(
      {
        status: 'error',
        errors: [
          {
            code: 'mcp_file_not_found',
            message: 'A prepared upload is no longer available.',
            hint: 'Retry with base64 or a public URL, or upload via `npx -y @transloadit/node upload`.',
          },
        ],
      },
      {},
    ),
  },
  {
    name: 'assembly-error',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'INVALID_FILE_META_DATA',
    result: toolResponse({
      status: 'ok',
      assembly: assembly({
        error: 'INVALID_FILE_META_DATA',
        message:
          'Invalid file metadata: the image could not be decoded. Is "notes.txt" really an image?',
        uploads: [document('notes.txt', 'text/plain')],
      }),
      upload: { status: 'complete', total_files: 1 },
      next_steps: [],
    }),
  },
  {
    // buildCreatedAssemblyUnavailable(): created, but its status could not be read.
    name: 'partial-assembly-tool-error',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'The Assembly was created, but Transloadit rejected the credentials',
    result: toolResponse(
      {
        status: 'error',
        assembly: { assembly_id: assemblyId, assembly_ssl_url: assemblySslUrl },
        errors: [
          {
            code: 'mcp_assembly_status_unavailable',
            message:
              'The Assembly was created, but Transloadit rejected the credentials while reading its status.',
            hint: `Reconnect if needed, then call transloadit_get_assembly_status with assembly_url ${assemblySslUrl} instead of creating it again.`,
          },
        ],
      },
      { isError: true },
    ),
  },
  {
    name: 'executing',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'ASSEMBLY_EXECUTING',
    result: toolResponse({
      status: 'ok',
      assembly: assembly({ ok: 'ASSEMBLY_EXECUTING', uploads: [upload('portrait.png')] }),
      upload: { status: 'complete', total_files: 1 },
      next_steps: ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status'],
    }),
  },
  {
    name: 'completed-image',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'ASSEMBLY_COMPLETED',
    result: toolResponse(completed({ results: { resized: [image('portrait-800w.png')] } })),
  },
  {
    name: 'completed-mixed',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'ASSEMBLY_COMPLETED',
    result: toolResponse(
      completed({
        uploads: [upload('interview.png')],
        results: {
          thumbnailed: [image('interview-thumb.png')],
          encoded: [video('interview-720p.webm')],
          audio_extracted: [audio('interview.mp3')],
          documented: [document('interview-transcript.pdf')],
        },
      }),
    ),
  },
  {
    name: 'completed-40-files',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'ASSEMBLY_COMPLETED',
    result: toolResponse(completed(manySteps())),
  },
  {
    name: 'long-filename',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: longName,
    result: toolResponse(completed({ results: { resized: [image(longName)] } })),
  },
  {
    name: 'preview-never-loads',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'Preview not available yet',
    result: toolResponse(
      completed({
        results: {
          resized: [
            image('not-yet-public.png', { path: `${missingMediaSegment}not-yet-public.png` }),
          ],
        },
      }),
    ),
  },
  {
    name: 'unauthenticated',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'ASSEMBLY_COMPLETED',
    result: toolResponse(completed({ results: { resized: [image('portrait-800w.png')] } }), {
      context: signedOutContext,
    }),
  },
  {
    // transloadit_create_assembly with expected uploads: it does not wait and says so.
    name: 'warnings',
    initialize: 'accept',
    toolInput: true,
    cancelled: false,
    openai: true,
    waitForText: 'Did not wait for completion',
    result: toolResponse({
      status: 'ok',
      assembly: assembly({ ok: 'ASSEMBLY_UPLOADING' }),
      upload: { status: 'none', total_files: 0 },
      next_steps: ['transloadit_wait_for_assembly'],
      warnings: [
        {
          code: 'mcp_wait_skipped_for_uploads',
          message:
            'Did not wait for completion because the Assembly waits for the expected uploads. Run upload_instructions, then call transloadit_wait_for_assembly.',
        },
      ],
    }),
  },
]

/** Looks a state up by name, so specs fail loudly when a fixture is renamed. */
export const widgetStateFixture = (name: string): WidgetStateFixture => {
  const fixture = widgetStateFixtures.find((candidate) => candidate.name === name)
  if (!fixture) throw new Error(`No widget state fixture named "${name}"`)
  return fixture
}
