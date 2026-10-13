import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AssemblyStatus } from '@transloadit/node'

import packageJson from '../../package.json' with { type: 'json' }

/** MCP Apps resource that renders `transloadit_create_assembly` and `transloadit_wait_for_assembly` results. */
export const assemblyResultWidgetUri = 'ui://transloadit/assembly-result'

/** Mime type the MCP Apps spec requires for UI resources. */
export const assemblyResultWidgetMimeType = 'text/html;profile=mcp-app'

/**
 * Origins that serve Assembly result and upload files: Transloadit result buckets and Cloudflare
 * R2 public buckets (API2's `CLOUDFLARE_R2_PUB_URL_HOST_*`). Override with `resultDomains`, which
 * also takes exact origins such as `https://tmp-us-east-1.transloadit.net`.
 */
export const defaultResultDomains = [
  'https://*.transloadit.com',
  'https://*.transloadit.net',
  'https://*.r2.dev',
]

/**
 * Origin ChatGPT serves the widget from in a public listing; OpenAI requires one per plugin. Claude
 * only accepts its own `ui.domain` (a hash of the server URL on `claudemcpcontent.com`), so this is
 * sent under the ChatGPT alias `openai/widgetDomain` and never as `ui.domain`.
 */
const defaultWidgetDomain = 'https://transloadit.com'

/**
 * Reduces a configured origin to what hosts compare CSP and link entries against, so
 * `https://tmp-us-east-1.transloadit.net/` arrives as `https://tmp-us-east-1.transloadit.net`.
 * Wildcard hosts such as `https://*.transloadit.net` parse as URLs and pass through unchanged.
 */
export const parseWidgetOrigin = (value: string, name: string): string => {
  const trimmed = value.trim()
  if (URL.canParse(trimmed)) {
    const url = new URL(trimmed)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin
  }
  throw new Error(
    `${name} must contain http(s) origins such as https://cdn.example.com: "${value}"`,
  )
}

/** MCP Apps protocol revision the widget speaks (ext-apps `LATEST_PROTOCOL_VERSION`). */
export const widgetProtocolVersion = '2026-01-26'

/** `appInfo` the widget announces in `ui/initialize`. */
export const widgetAppInfo = { name: 'transloadit-assembly-result', version: packageJson.version }

/** Result `_meta` key that carries widget-only context (never read by the model). */
export const widgetContextMetaKey = 'transloadit/widget'

/** A Step of the Assembly's instructions, so the widget can say what produced each result. */
export type WidgetStep = {
  /** The Robot, e.g. `/image/resize`, shown as the Step's label. */
  robot: string
}

export type WidgetContext = {
  authenticated: boolean
  assembly_console_url?: string
  new_template_url?: string
  steps?: Record<string, WidgetStep>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The Robot of each Step, read from the instructions API2 echoes in `merged_params` (Template
 * Steps included) or `params`. Missing or unreadable instructions just leave the labels out.
 */
export const describeAssemblySteps = (
  assembly: Pick<AssemblyStatus, 'merged_params' | 'params'>,
): Record<string, WidgetStep> | undefined => {
  const source = assembly.merged_params || assembly.params
  if (!source) return undefined
  let params: unknown
  try {
    params = JSON.parse(source)
  } catch {
    return undefined
  }
  if (!isRecord(params) || !isRecord(params.steps)) return undefined
  const steps: Record<string, WidgetStep> = {}
  for (const [name, step] of Object.entries(params.steps)) {
    if (!isRecord(step) || typeof step.robot !== 'string') continue
    steps[name] = { robot: step.robot }
  }
  return Object.keys(steps).length > 0 ? steps : undefined
}

const widgetDescription =
  'Shows each Assembly Step with image, video and audio previews, download links for every result file, and a Save as Template shortcut when the caller is signed in.'

type AssemblyResultWidgetMetaInput = {
  resultDomains: string[]
  redirectDomains: string[]
  widgetDomain: string
}

/** Resource `_meta` in both the MCP Apps form and the legacy ChatGPT aliases. */
const buildAssemblyResultWidgetMeta = ({
  resultDomains,
  redirectDomains,
  widgetDomain,
}: AssemblyResultWidgetMetaInput): Record<string, unknown> => ({
  ui: {
    csp: {
      connectDomains: resultDomains,
      resourceDomains: resultDomains,
    },
    prefersBorder: true,
  },
  'openai/widgetDescription': widgetDescription,
  'openai/widgetDomain': widgetDomain,
  // `ui.csp` has no counterpart for `redirect_domains`, which ChatGPT still reads from here to
  // trust `window.openai.openExternal` targets.
  'openai/widgetCSP': {
    connect_domains: resultDomains,
    resource_domains: resultDomains,
    redirect_domains: redirectDomains,
  },
  'openai/widgetPrefersBorder': true,
})

/** Status labels for API2's `ok` codes (alphalib `assemblyStatusOkCodeSchema`). */
const statusLabels: Record<string, { label: string; tone: 'ok' | 'busy' | 'neutral' }> = {
  ASSEMBLY_CANCELED: { label: 'Canceled', tone: 'neutral' },
  ASSEMBLY_COMPLETED: { label: 'Completed', tone: 'ok' },
  ASSEMBLY_EXECUTING: { label: 'Processing', tone: 'busy' },
  ASSEMBLY_REPLAYING: { label: 'Replaying', tone: 'busy' },
  ASSEMBLY_UPLOADING: { label: 'Waiting for uploads', tone: 'busy' },
  REQUEST_ABORTED: { label: 'Aborted', tone: 'neutral' },
}

// Static, trusted markup (24px grid, stroked with currentColor) inserted by the widget script.
const icons = {
  alert:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>',
  audio:
    '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  caret: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  download:
    '<svg viewBox="0 0 24 24"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  image:
    '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path class="solid" d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg>',
}

/** Cards shown per step and in total before the rest folds into "Show N more files". */
const visibleFilesPerStep = 8
const visibleFilesTotal = 12
/** Steps with at most this many files share one grid instead of a row each. */
const sparseStepFiles = 2

// The usual native UI stack, without a bare system-ui first: Linux resolves that through
// fontconfig to whatever font matched, which can be a CJK face with a mid-line "…".
const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", system-ui, sans-serif'
const monoStack = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

const lightTokens =
  '--bg: #ffffff; --surface: #fafafa; --surface-2: #f5f5f5; --border: #e5e5e5; --border-strong: #d4d4d4; --fg: #171717; --muted: #737373; --subtle: #a3a3a3; --accent: #2563eb; --ok: #16a34a; --err: #dc2626; --err-soft: #fef2f2; --err-border: #fecaca; --warn: #ca8a04; --button-bg: #171717; --button-fg: #fafafa; --skeleton: #f0f0f0; --skeleton-hi: #e5e5e5; --overlay: rgb(23 23 23 / 0.6);'
const darkTokens =
  '--bg: #171717; --surface: #1f1f1f; --surface-2: #262626; --border: #2e2e2e; --border-strong: #404040; --fg: #f5f5f5; --muted: #a3a3a3; --subtle: #737373; --accent: #60a5fa; --ok: #4ade80; --err: #f87171; --err-soft: #2a1818; --err-border: #4c2323; --warn: #facc15; --button-bg: #f5f5f5; --button-fg: #171717; --skeleton: #262626; --skeleton-hi: #303030; --overlay: rgb(0 0 0 / 0.6);'

/**
 * The widget document. Everything is inline (no external scripts) so it runs under the
 * restrictive default MCP Apps sandbox CSP; the host only needs to allow result origins.
 */
export const assemblyResultWidgetHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transloadit Assembly result</title>
<style>
  :root { color-scheme: light; ${lightTokens} --font: ${fontStack}; --mono: ${monoStack}; }
  :root[data-theme="dark"] { color-scheme: dark; ${darkTokens} }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { color-scheme: dark; ${darkTokens} }
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body { margin: 0; padding: 16px; font: 14px/1.5 var(--font); color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
  #app { display: flex; flex-direction: column; gap: 16px; }
  :root[data-capped] #app { max-height: var(--max-height); overflow-y: auto; }
  a { color: var(--accent); }
  p { margin: 0; }
  code { font: 12px/1.4 var(--mono); background: var(--surface-2); border-radius: 4px; padding: 1px 4px; }
  .url { overflow-wrap: anywhere; }
  .icon { display: inline-flex; flex: none; }
  .icon svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .icon svg .solid { fill: currentColor; stroke: none; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  header { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .title-row { display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 28px; }
  h1 { flex: 1 1 auto; margin: 0; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .id { font: 500 12px/1 var(--mono); color: var(--muted); }
  a.id { text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 3px; }
  a.id:hover { color: var(--fg); text-decoration-color: currentColor; }
  .sub-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-size: 12px; }
  .status { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 1px 8px; border-radius: 999px; background: var(--surface-2); font-size: 12px; font-weight: 500; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--subtle); flex: none; }
  .tone-ok .dot { background: var(--ok); }
  .tone-err { color: var(--err); background: var(--err-soft); }
  .tone-err .dot { background: var(--err); }
  .tone-busy .dot { background: var(--accent); animation: pulse 1.4s ease-in-out infinite; }
  .button { flex: none; display: inline-flex; align-items: center; justify-content: center; height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--button-bg); background: var(--button-bg); color: var(--button-fg); font-size: 12px; font-weight: 500; text-decoration: none; white-space: nowrap; cursor: pointer; }
  .button:hover { opacity: 0.88; }

  .step { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .step-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-size: 12px; color: var(--muted); }
  .step-head h2, .fold h2 { margin: 0; flex: none; color: var(--fg); font: 600 12px/1.5 var(--mono); }
  .robot { min-width: 0; font: 11px/1.5 var(--mono); color: var(--subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step-head .count { margin-left: auto; flex: none; }
  .group { display: flex; flex-direction: column; gap: 8px; }
  .files { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
  .file { position: relative; margin: 0; min-width: 0; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); overflow: hidden; }
  .preview { position: relative; height: 120px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: var(--surface-2); color: var(--subtle); }
  .preview img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; }
  .preview video { display: block; width: 100%; height: 100%; object-fit: contain; }
  .preview > .icon svg { width: 28px; height: 28px; stroke-width: 1.5; }
  .preview .ext { font: 600 11px/1 var(--mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
  .play { position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; display: flex; align-items: center; justify-content: center; padding: 0 0 0 2px; border: 0; border-radius: 50%; background: var(--overlay); color: #ffffff; cursor: pointer; }
  .play .icon svg { width: 18px; height: 18px; }
  .play:hover, .play:focus-visible { transform: scale(1.06); }
  .note { font-size: 12px; color: var(--muted); }
  .caption { display: flex; align-items: center; gap: 4px; padding: 6px 4px 6px 10px; min-width: 0; flex: 1; }
  .caption-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .name { display: flex; min-width: 0; font-size: 13px; font-weight: 500; }
  .name .base { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name .ext { flex: none; }
  .meta { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag { font: 11px/1.5 var(--mono); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step .tag, .fold .tag { display: none; }
  .download { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: var(--muted); }
  .download:hover { background: var(--surface-2); color: var(--fg); }
  .audio-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "icon text dl" "player player player"; align-items: center; gap: 6px 10px; padding: 8px 4px 8px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
  .audio-row > .icon { grid-area: icon; color: var(--muted); }
  .audio-row > .caption-text { grid-area: text; }
  .audio-row > .download { grid-area: dl; }
  .audio-row > .player { grid-area: player; width: 100%; height: 36px; }
  .audio-row > .note.player { height: auto; }
  @media (min-width: 560px) {
    .audio-row { grid-template-columns: auto minmax(0, 1fr) minmax(240px, 320px) auto; grid-template-areas: "icon text player dl"; }
  }
  @media (max-width: 400px) {
    .files { grid-template-columns: minmax(0, 1fr); }
    .file { flex-direction: row; align-items: stretch; }
    .preview { width: 96px; height: 72px; }
    .preview > .icon svg { width: 22px; height: 22px; }
    .preview .note { font-size: 11px; text-align: center; }
    .play { width: 32px; height: 32px; margin: -16px 0 0 -16px; }
    .caption { padding-left: 12px; }
  }
  details.more > summary, details.fold > summary { display: flex; align-items: center; gap: 6px; padding: 2px 0; color: var(--muted); font-size: 12px; cursor: pointer; list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
  details > summary:hover { color: var(--fg); }
  details .caret svg { width: 14px; height: 14px; transition: transform 0.15s ease; }
  details[open] > summary .caret svg { transform: rotate(90deg); }
  details[open] > .group { margin-top: 8px; }

  .callout { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-size: 13px; overflow-wrap: break-word; }
  .callout > .icon { margin-top: 2px; color: var(--muted); }
  .callout-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .callout .hint { color: var(--muted); }
  .callout.err { background: var(--err-soft); border-color: var(--err-border); }
  .callout.err > .icon { color: var(--err); }
  .callout.warn > .icon { color: var(--warn); }
  p.note { font-size: 13px; }

  .more-below { display: none; }
  :root[data-capped] .more-below { position: sticky; bottom: 0; flex: none; display: flex; align-items: flex-end; justify-content: center; gap: 4px; height: 48px; margin-top: -64px; padding-bottom: 4px; background: linear-gradient(to bottom, transparent, var(--bg) 75%); color: var(--muted); font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.15s ease; }
  :root[data-capped] .more-below.show { opacity: 1; }
  .more-below .icon svg { width: 14px; height: 14px; }

  .pending { display: flex; flex-direction: column; gap: 16px; }
  .pending-label { display: flex; align-items: center; gap: 8px; height: 28px; color: var(--muted); font-size: 13px; }
  .pending-label .dot { width: 8px; height: 8px; }
  .running .pending-label .dot { background: var(--accent); animation: pulse 1.4s ease-in-out infinite; }
  .sk { display: block; border-radius: 6px; background: var(--skeleton); }
  .running .sk { background: linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%); background-size: 200% 100%; animation: shimmer 1.6s linear infinite; }
  .sk-step { width: 35%; height: 12px; }
  .sk-preview { height: 120px; border-radius: 0; }
  .sk-lines { display: flex; flex-direction: column; gap: 6px; padding: 9px 10px 10px; flex: 1; }
  .sk-line { height: 10px; width: 70%; }
  .sk-line.short { width: 45%; }
  @media (max-width: 400px) {
    .sk-preview { width: 96px; height: 72px; flex: none; }
    .pending .file:nth-child(2) { display: none; }
  }
  @keyframes pulse { 50% { opacity: 0.35; } }
  @keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
<main id="app"></main>
<script>
(() => {
  const app = document.getElementById('app')
  const root = document.documentElement
  const appInfo = ${JSON.stringify(widgetAppInfo)}
  const protocolVersion = ${JSON.stringify(widgetProtocolVersion)}
  const contextKey = ${JSON.stringify(widgetContextMetaKey)}
  const statusLabels = ${JSON.stringify(statusLabels)}
  const icons = ${JSON.stringify(icons)}
  const visibleFilesPerStep = ${visibleFilesPerStep}
  const visibleFilesTotal = ${visibleFilesTotal}
  const sparseStepFiles = ${sparseStepFiles}
  const backtick = String.fromCharCode(96)
  const hostCapabilities = { openLinks: false }
  let hasResult = false
  let lastSignature = null
  // Rendered nodes by step and by file, reused while their data is unchanged so previews are
  // never re-created (and re-downloaded) when a host repeats or updates the result.
  const sectionCache = new Map()
  const itemCache = new Map()

  const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
  const text = (value) => (typeof value === 'string' ? value : '')
  const positive = (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0)
  const plural = (count, noun) => count + ' ' + noun + (count === 1 ? '' : 's')

  const safeUrl = (value) => {
    if (typeof value !== 'string') return null
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
    } catch {
      return null
    }
  }

  const el = (tag, props, children) => {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null || value === false) continue
      if (key === 'className') node.className = value
      else if (key === 'text') node.textContent = value
      else node.setAttribute(key, value)
    }
    for (const child of children || []) {
      if (child) node.append(child)
    }
    return node
  }

  const icon = (name) => {
    const span = el('span', { className: 'icon', 'aria-hidden': 'true' })
    span.innerHTML = icons[name]
    return span
  }

  // URLs may break after "/", "?", "&" or "=", never inside the words around them.
  const urlText = (url) => {
    const node = el('span', { className: 'url' })
    for (const part of url.split(/(?<=[/?&=])/)) {
      node.append(part, document.createElement('wbr'))
    }
    return node
  }

  const plainText = (value) => {
    const nodes = []
    let last = 0
    for (const match of value.matchAll(/https?:\\/\\/[^\\s<>]+[^\\s<>.,;:!?)]/g)) {
      nodes.push(value.slice(last, match.index), urlText(match[0]))
      last = match.index + match[0].length
    }
    nodes.push(value.slice(last))
    return nodes.filter((node) => node !== '')
  }

  // Tool hints quote commands and parameters in backticks; show those as code.
  const richText = (value) => {
    const parts = value.split(backtick)
    if (parts.length % 2 === 0) return plainText(value)
    return parts.flatMap((part, index) => (index % 2 === 1 ? [el('code', { text: part })] : plainText(part)))
  }

  const pending = (kind, message) => {
    const skeletonCard = () =>
      el('div', { className: 'file' }, [
        el('span', { className: 'sk sk-preview' }),
        el('div', { className: 'sk-lines' }, [el('span', { className: 'sk sk-line' }), el('span', { className: 'sk sk-line short' })]),
      ])
    app.replaceChildren(
      el('div', { className: 'pending ' + kind, role: 'status' }, [
        el('p', { className: 'pending-label' }, [el('span', { className: 'dot' }), message]),
        el('span', { className: 'sk sk-step' }),
        el('div', { className: 'files' }, [skeletonCard(), skeletonCard()]),
      ]),
    )
  }

  const callout = (kind, lines, role) =>
    el('div', { className: 'callout ' + kind, role }, [
      icon(kind === 'err' ? 'alert' : 'info'),
      el('div', { className: 'callout-body' }, lines.filter(Boolean)),
    ])

  const showStatus = (message, kind) => {
    app.replaceChildren(callout(kind || 'neutral', [el('p', { text: message })], 'status'))
  }

  // MCP Apps transport: JSON-RPC 2.0 over postMessage with the host (or its sandbox proxy).
  const post = (message) => {
    if (window.parent === window) return
    window.parent.postMessage(message, '*')
  }

  const pendingRequests = new Map()
  let nextId = 1
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pendingRequests.set(id, { resolve, reject })
      post({ jsonrpc: '2.0', id, method, params })
    })
  const notify = (method, params) =>
    post(params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params })
  const respond = (id, result) => post({ jsonrpc: '2.0', id, result })
  const respondError = (id, code, message) => post({ jsonrpc: '2.0', id, error: { code, message } })

  // A capped card scrolls; the fade and count at its bottom say there is more below.
  const moreBelowLabel = el('span')
  const moreBelow = el('div', { className: 'more-below', 'aria-hidden': 'true' }, [moreBelowLabel, icon('down')])
  let fileCount = 0
  const updateMoreBelow = () => {
    if (!('capped' in root.dataset) || app.scrollHeight - app.scrollTop - app.clientHeight <= 4) {
      moreBelow.classList.remove('show')
      return
    }
    // Everything not in view counts, including files inside folded steps.
    const bottom = app.getBoundingClientRect().bottom
    const inView = [...app.querySelectorAll('.file, .audio-row')].filter((node) => node.getBoundingClientRect().top <= bottom - 32).length
    const below = fileCount - inView
    moreBelowLabel.textContent = below > 0 ? plural(below, 'more file') + ' below' : 'More below'
    moreBelow.classList.add('show')
  }
  app.addEventListener('scroll', () => requestAnimationFrame(updateMoreBelow), { passive: true })

  // ChatGPT passes maxHeight directly, MCP Apps hosts inside containerDimensions.
  const applyHostContext = (context) => {
    if (!isRecord(context)) return
    if (context.theme === 'dark' || context.theme === 'light') {
      root.dataset.theme = context.theme
    }
    const dimensions = isRecord(context.containerDimensions) ? context.containerDimensions : context
    const maxHeight = positive(dimensions.maxHeight)
    if (maxHeight > 0) {
      root.style.setProperty('--max-height', Math.max(maxHeight - 32, 160) + 'px')
      root.dataset.capped = ''
      updateMoreBelow()
    }
  }

  // Decided synchronously: preventDefault() after an await would be too late to stop navigation.
  const openWithHost = (url) => {
    const openai = window.openai
    if (openai && typeof openai.openExternal === 'function') {
      // ChatGPT appends ?redirectUrl= to redirect_domains targets unless told not to; nothing we
      // link to returns users to the chat, so the link opens exactly as shown in the card.
      Promise.resolve(openai.openExternal({ href: url, redirectUrl: false })).catch(() => {})
      return true
    }
    if (hostCapabilities.openLinks) {
      request('ui/open-link', { url }).catch(() => {})
      return true
    }
    return false
  }

  // Sandboxed frames often block popups and downloads, so every outgoing link goes through the
  // host when it offers ui/open-link (or ChatGPT's openExternal).
  const hostLink = (props, url, children) => {
    const anchor = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', ...props }, children)
    anchor.addEventListener('click', (event) => {
      if (openWithHost(url)) event.preventDefault()
    })
    return anchor
  }

  // Result files can land on the public bucket a moment after the Assembly reports completion,
  // and a failed <img>/<video> never retries by itself.
  const previewRetryDelays = [1000, 3000, 6000]
  const retryPreview = (media, url, fallback) => {
    let attempt = 0
    media.addEventListener('error', () => {
      if (attempt >= previewRetryDelays.length) {
        media.replaceWith(...fallback())
        return
      }
      setTimeout(() => {
        media.removeAttribute('src')
        media.setAttribute('src', url)
        if (typeof media.load === 'function') media.load()
      }, previewRetryDelays[attempt])
      attempt += 1
    })
    return media
  }
  const unavailable = (iconName) => () => [icon(iconName), el('span', { className: 'note', role: 'status', text: 'Preview unavailable' })]

  const fileName = (file) => text(file.name) || text(file.basename) || 'file'
  const fileUrl = (file) => safeUrl(file.ssl_url) || safeUrl(file.url)
  const isAudio = (file) => Boolean(fileUrl(file)) && text(file.mime).startsWith('audio/')

  // A still frame with one play button; the native controls only appear once someone plays it,
  // so they never cover the frame.
  const videoPreview = (file, url, size) => {
    const name = fileName(file)
    // The fragment makes browsers that skip preload (Safari) still paint the first frame.
    const src = url + '#t=0.1'
    const video = retryPreview(el('video', { src, preload: 'metadata', playsinline: '', 'aria-label': name, ...size }), src, unavailable('file'))
    const play = el('button', { className: 'play', type: 'button', 'aria-label': 'Play ' + name }, [icon('play')])
    play.addEventListener('click', () => {
      video.controls = true
      play.remove()
      Promise.resolve(video.play()).catch(() => {})
    })
    return el('div', { className: 'preview' }, [video, play])
  }

  // The box has a fixed height and media declare their aspect ratio, so nothing moves while
  // previews load; images are never scaled beyond their own size.
  const preview = (file) => {
    const url = fileUrl(file)
    const mime = text(file.mime)
    const width = positive(file.width)
    const height = positive(file.height)
    const size = width && height
      ? { width: String(width), height: String(height), style: 'aspect-ratio: ' + width + ' / ' + height }
      : {}
    if (url && mime.startsWith('image/')) {
      return el('div', { className: 'preview' }, [
        retryPreview(el('img', { src: url, alt: fileName(file), loading: 'lazy', decoding: 'async', ...size }), url, unavailable('image')),
      ])
    }
    if (url && mime.startsWith('video/')) return videoPreview(file, url, size)
    const ext = text(file.ext) || (mime.includes('/') ? mime.split('/')[1] : '')
    return el('div', { className: 'preview' }, [icon('file'), ext ? el('span', { className: 'ext', text: ext.slice(0, 8) }) : null])
  }

  // Ellipsize the base name but keep the extension visible; the full name is in the tooltip.
  const nameLabel = (name) => {
    const dot = name.lastIndexOf('.')
    const base = dot > 0 && name.length - dot <= 8 ? name.slice(0, dot) : name
    const ext = base === name ? '' : name.slice(base.length)
    return el('span', { className: 'name', title: name }, [el('span', { className: 'base', text: base }), ext ? el('span', { className: 'ext', text: ext }) : null])
  }

  // Every caption names its step; the tag only shows in the shared grid (see .step .tag), so a
  // card can move between the two layouts without being rebuilt.
  const captionText = (file, tag) => {
    const details = []
    const width = positive(file.width)
    const height = positive(file.height)
    if (width && height) details.push(width + '×' + height)
    if (text(file.size_human)) details.push(text(file.size_human))
    const meta = details.join(' · ') || text(file.mime)
    return el('span', { className: 'caption-text' }, [
      nameLabel(fileName(file)),
      el('span', { className: 'tag', text: tag }),
      el('span', { className: 'meta', text: meta }),
    ])
  }

  const downloadLink = (file) => {
    const url = fileUrl(file)
    if (!url) return null
    return hostLink({ className: 'download', download: '', title: 'Download' }, url, [icon('download'), el('span', { className: 'sr', text: 'Download ' + fileName(file) })])
  }

  const buildItem = (file, tag) => {
    if (isAudio(file)) {
      const url = fileUrl(file)
      return el('div', { className: 'audio-row' }, [
        icon('audio'),
        captionText(file, tag),
        retryPreview(el('audio', { className: 'player', src: url, controls: '', preload: 'metadata', 'aria-label': fileName(file) }), url, () => [el('span', { className: 'note player', role: 'status', text: 'Preview unavailable' })]),
        downloadLink(file),
      ])
    }
    return el('figure', { className: 'file' }, [
      preview(file),
      el('figcaption', { className: 'caption' }, [captionText(file, tag), downloadLink(file)]),
    ])
  }

  const item = (stepName, file, index) => {
    const key = stepName + '\\n' + (text(file.id) || fileUrl(file) || String(index))
    const signature = JSON.stringify(file)
    const cached = itemCache.get(key)
    if (cached && cached.signature === signature) return cached.node
    const node = buildItem(file, stepName)
    itemCache.set(key, { signature, node })
    return node
  }

  // Cards in a grid, audio as full-width rows below them.
  const group = (entries) => {
    const cards = entries.filter((entry) => !isAudio(entry.file)).map((entry) => entry.node())
    const rows = entries.filter((entry) => isAudio(entry.file)).map((entry) => entry.node())
    return el('div', { className: 'group' }, [
      cards.length > 0 ? el('div', { className: 'files' }, cards) : null,
      ...rows,
    ])
  }

  const stepEntries = (stepName, files, offset) =>
    files.map((file, index) => ({ file, node: () => item(stepName, file, offset + index) }))

  const stepLabel = (stepName, stepsMeta) => {
    if (stepName === ':original') return ''
    const step = isRecord(stepsMeta) && isRecord(stepsMeta[stepName]) ? stepsMeta[stepName] : {}
    return text(step.robot)
  }

  // Folded previews are only created (and downloaded) once someone opens them.
  const foldable = (summary, className, build) => {
    const details = el('details', { className }, [el('summary', {}, summary)])
    details.addEventListener('toggle', () => {
      if (!details.open || details.childElementCount > 1) return
      details.append(build())
    })
    return details
  }

  const buildSection = (stepName, files, visible, label) => {
    const hidden = files.slice(visible)
    if (visible === 0) {
      return foldable(
        [icon('caret'), el('h2', { text: stepName }), el('span', { text: '· ' + plural(files.length, 'file') }), label ? el('span', { className: 'robot', text: label }) : null],
        'fold step',
        () => group(stepEntries(stepName, files, 0)),
      )
    }
    const section = el('section', { className: 'step' }, [
      el('div', { className: 'step-head' }, [
        el('h2', { text: stepName }),
        label ? el('span', { className: 'robot', title: label, text: label }) : null,
        el('span', { className: 'count', text: plural(files.length, 'file') }),
      ]),
      group(stepEntries(stepName, files.slice(0, visible), 0)),
    ])
    if (hidden.length > 0) {
      section.append(
        foldable([icon('caret'), 'Show ' + hidden.length + ' more'], 'more', () => group(stepEntries(stepName, hidden, visible))),
      )
    }
    return section
  }

  const buildSteps = (steps, stepsMeta) => {
    // Few files per step: one shared grid where each card names its step.
    const total = steps.reduce((sum, [, files]) => sum + files.length, 0)
    if (steps.length > 1 && total <= visibleFilesTotal && steps.every(([, files]) => files.length <= sparseStepFiles)) {
      return [group(steps.flatMap(([stepName, files]) => stepEntries(stepName, files, 0)))]
    }
    let budget = visibleFilesTotal
    return steps.map(([stepName, files]) => {
      const visible = Math.min(files.length, visibleFilesPerStep, Math.max(budget, 0))
      budget -= visible
      const label = stepLabel(stepName, stepsMeta)
      const signature = JSON.stringify([files, visible, label])
      const cached = sectionCache.get(stepName)
      if (cached && cached.signature === signature) return cached.node
      const node = buildSection(stepName, files, visible, label)
      sectionCache.set(stepName, { signature, node })
      return node
    })
  }

  // Each tool error as its message and its recovery hint.
  const payloadErrors = (payload) =>
    (Array.isArray(payload.errors) ? payload.errors : []).filter((error) => isRecord(error) && (text(error.message) || text(error.hint)))

  const errorCallout = (error) =>
    callout('err', [
      text(error.message) ? el('p', {}, richText(text(error.message))) : null,
      text(error.hint) ? el('p', { className: 'hint' }, richText(text(error.hint))) : null,
    ], 'alert')

  const contentText = (result) =>
    (Array.isArray(result.content) ? result.content : [])
      .map((block) => (isRecord(block) && block.type === 'text' ? text(block.text) : ''))
      .filter(Boolean)
      .join(' ')

  // An Assembly without ok or error (created, but its status unreadable) has no known status.
  const statusOf = (assembly) => {
    const error = text(assembly.error)
    if (error) return { label: 'Failed', tone: 'err', code: error }
    const ok = text(assembly.ok)
    const known = statusLabels[ok]
    if (known) return { label: known.label, tone: known.tone, code: ok }
    return { label: 'Status unknown', tone: 'neutral', code: ok }
  }

  const buildHeader = (assembly, meta, status) => {
    const id = text(assembly.assembly_id)
    const consoleUrl = safeUrl(meta.assembly_console_url)
    // The Console is the only human-readable view of an Assembly; its API status URL is raw JSON.
    const idNode = !id ? null : consoleUrl
      ? hostLink({ className: 'id', title: 'Open in Console' }, consoleUrl, [id])
      : el('span', { className: 'id', text: id })
    const templateUrl = safeUrl(meta.new_template_url)
    // Failed, unread and still-uploading Assemblies have no instructions worth saving yet.
    const savable = status.tone !== 'err' && status.code !== '' && status.code !== 'ASSEMBLY_UPLOADING'
    return el('header', {}, [
      el('div', { className: 'title-row' }, [
        el('h1', {}, ['Assembly ', idNode]),
        meta.authenticated === true && templateUrl && savable
          ? hostLink({ className: 'button', text: 'Save as Template' }, templateUrl)
          : null,
      ]),
      el('div', { className: 'sub-row' }, [
        el('span', { className: 'status tone-' + status.tone, title: status.code || null }, [el('span', { className: 'dot' }), status.label]),
      ]),
    ])
  }

  const buildResult = (result, payload, meta) => {
    const assembly = isRecord(payload.assembly) ? payload.assembly : null
    const toolErrors = payloadErrors(payload)
    if (!assembly) {
      if (toolErrors.length > 0) return toolErrors.map(errorCallout)
      return [callout('err', [el('p', { text: contentText(result) || 'No Assembly result was returned.' })], 'alert')]
    }

    const status = statusOf(assembly)
    const nodes = [buildHeader(assembly, meta, status)]
    if (status.tone === 'err') {
      nodes.push(callout('err', [
        el('p', {}, richText(text(assembly.message) || 'The Assembly failed.')),
        el('p', { className: 'hint' }, [el('code', { text: status.code })]),
      ], 'alert'))
    }
    for (const error of toolErrors) nodes.push(errorCallout(error))

    const results = isRecord(assembly.results) ? assembly.results : {}
    const uploads = Array.isArray(assembly.uploads) ? assembly.uploads.filter(isRecord) : []
    const steps = Object.entries(results)
      .map(([stepName, files]) => [stepName, Array.isArray(files) ? files.filter(isRecord) : []])
      .filter(([, files]) => files.length > 0)
    if (uploads.length > 0) steps.unshift([':original', uploads])
    fileCount = steps.reduce((sum, [, files]) => sum + files.length, 0)
    nodes.push(...buildSteps(steps, meta.steps))

    // The busy note and any warnings read as one message.
    const notes = []
    if (status.tone === 'busy') notes.push('Result files appear when the Assembly completes.')
    else if (steps.length === 0 && toolErrors.length === 0 && status.tone !== 'err') notes.push('No result files.')
    const warnings = (Array.isArray(payload.warnings) ? payload.warnings : []).filter((warning) => isRecord(warning) && text(warning.message))
    if (warnings.length > 0) {
      nodes.push(callout('warn', [...notes.map((note) => el('p', { text: note })), ...warnings.map((warning) => el('p', {}, richText(text(warning.message))))]))
    } else {
      for (const note of notes) nodes.push(el('p', { className: 'note', text: note }))
    }
    nodes.push(moreBelow)
    return nodes
  }

  const render = (result) => {
    if (!isRecord(result)) return
    const payload = isRecord(result.structuredContent) ? result.structuredContent : {}
    const meta = isRecord(result._meta) && isRecord(result._meta[contextKey]) ? result._meta[contextKey] : {}
    // Hosts repeat results (re-mounts, reconnects, ChatGPT's toolOutput next to the MCP Apps
    // notification); an identical one must not touch the DOM.
    const signature = JSON.stringify([payload, meta, Object.keys(payload).length === 0 ? contentText(result) : ''])
    if (signature === lastSignature) return
    lastSignature = signature
    hasResult = true
    app.replaceChildren(...buildResult(result, payload, meta))
    updateMoreBelow()
  }

  const handleHostRequest = (message) => {
    if (message.method === 'ping' || message.method === 'ui/resource-teardown') {
      respond(message.id, {})
      return
    }
    respondError(message.id, -32601, 'Method not found: ' + text(message.method))
  }

  const handleHostNotification = (message) => {
    if (message.method === 'ui/notifications/tool-input') {
      if (!hasResult) pending('running', 'Running the Assembly…')
    } else if (message.method === 'ui/notifications/tool-result') {
      render(message.params)
    } else if (message.method === 'ui/notifications/tool-cancelled') {
      if (!hasResult) showStatus('The tool call was cancelled.')
    } else if (message.method === 'ui/notifications/host-context-changed') {
      applyHostContext(message.params)
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const message = event.data
    if (!isRecord(message) || message.jsonrpc !== '2.0') return
    if (typeof message.method === 'string') {
      if ('id' in message) handleHostRequest(message)
      else handleHostNotification(message)
      return
    }
    const entry = pendingRequests.get(message.id)
    if (!entry) return
    pendingRequests.delete(message.id)
    if (message.error) entry.reject(message.error)
    else entry.resolve(message.result)
  })

  pending('waiting', 'Waiting for the Assembly result…')

  // ChatGPT also exposes the result through window.openai and fires openai:set_globals for any
  // change (theme, maxHeight, …); render() ignores the ones that leave the result as it was.
  const renderFromOpenAi = () => {
    const openai = window.openai
    if (!openai) return
    applyHostContext({ theme: openai.theme, maxHeight: openai.maxHeight })
    if (isRecord(openai.toolOutput)) {
      render({ structuredContent: openai.toolOutput, _meta: openai.toolResponseMetadata })
    }
  }
  window.addEventListener('openai:set_globals', renderFromOpenAi)
  renderFromOpenAi()

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => updateMoreBelow()).observe(app)
  }

  if (window.parent !== window) {
    request('ui/initialize', {
      appCapabilities: {},
      appInfo,
      protocolVersion,
    })
      .then((result) => {
        if (isRecord(result) && isRecord(result.hostCapabilities)) {
          hostCapabilities.openLinks = Boolean(result.hostCapabilities.openLinks)
        }
        if (isRecord(result)) applyHostContext(result.hostContext)
        notify('ui/notifications/initialized')
      })
      .catch(() => {
        if (!hasResult) showStatus('This host could not start the Assembly result view.', 'err')
      })

    // Report the body's own height, not documentElement.scrollHeight: the latter never drops
    // below the frame's current height, so the frame could grow but never shrink.
    let lastSize = ''
    const reportSize = () => {
      const width = root.scrollWidth
      const height = Math.ceil(document.body.getBoundingClientRect().height)
      const size = width + 'x' + height
      if (size === lastSize) return
      lastSize = size
      notify('ui/notifications/size-changed', { width, height })
    }
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(reportSize).observe(document.body)
    }
  }
})()
</script>
</body>
</html>
`

export type AssemblyResultWidgetOptions = {
  /** Origins allowed for previews and downloads; defaults to `defaultResultDomains`. */
  resultDomains?: string[]
  /** ChatGPT's `openai/widgetDomain`; defaults to `https://transloadit.com`. */
  widgetDomain?: string
  /** Console URL the widget links to; its origin is a trusted `openExternal` target. */
  consoleUrl?: string
}

/** Registers the widget so hosts can `resources/read` it through `_meta.ui.resourceUri`. */
export const registerAssemblyResultWidget = (
  server: McpServer,
  options: AssemblyResultWidgetOptions = {},
): void => {
  const resultDomains = (
    options.resultDomains && options.resultDomains.length > 0
      ? options.resultDomains
      : defaultResultDomains
  ).map((domain) => parseWidgetOrigin(domain, 'resultDomains'))
  const consoleOrigin = options.consoleUrl ? [new URL(options.consoleUrl).origin] : []
  const meta = buildAssemblyResultWidgetMeta({
    resultDomains,
    // The widget only links to the Console and to result files.
    redirectDomains: [...new Set([...consoleOrigin, ...resultDomains])],
    widgetDomain: parseWidgetOrigin(options.widgetDomain || defaultWidgetDomain, 'widgetDomain'),
  })
  server.registerResource(
    'assembly-result',
    assemblyResultWidgetUri,
    {
      title: 'Assembly result',
      description: widgetDescription,
      mimeType: assemblyResultWidgetMimeType,
      _meta: meta,
    },
    () => ({
      contents: [
        {
          uri: assemblyResultWidgetUri,
          mimeType: assemblyResultWidgetMimeType,
          text: assemblyResultWidgetHtml,
          _meta: meta,
        },
      ],
    }),
  )
}
