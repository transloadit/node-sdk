import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import packageJson from '../../package.json' with { type: 'json' }

/** MCP Apps resource that renders `transloadit_create_assembly` and `transloadit_wait_for_assembly` results. */
export const assemblyResultWidgetUri = 'ui://transloadit/assembly-result'

/** Mime type the MCP Apps spec requires for UI resources. */
export const assemblyResultWidgetMimeType = 'text/html;profile=mcp-app'

/**
 * Origins that serve Assembly result and upload files: Transloadit result buckets and Cloudflare
 * R2 public buckets (API2's `CLOUDFLARE_R2_PUB_URL_HOST_*`). Override with `resultDomains`.
 */
export const defaultResultDomains = [
  'https://*.transloadit.com',
  'https://*.transloadit.net',
  'https://*.r2.dev',
]

/** MCP Apps protocol revision the widget speaks (ext-apps `LATEST_PROTOCOL_VERSION`). */
export const widgetProtocolVersion = '2026-01-26'

/** `appInfo` the widget announces in `ui/initialize`. */
export const widgetAppInfo = { name: 'transloadit-assembly-result', version: packageJson.version }

/** Result `_meta` key that carries widget-only context (never read by the model). */
export const widgetContextMetaKey = 'transloadit/widget'

export type WidgetContext = {
  authenticated: boolean
  assembly_console_url?: string
  new_template_url?: string
}

const widgetDescription =
  'Shows each Assembly Step with image, video and audio previews, download links for every result file, and a Save as Template shortcut when the caller is signed in.'

/** Resource `_meta` in both the MCP Apps form and the legacy ChatGPT aliases. */
export const buildAssemblyResultWidgetMeta = (
  resultDomains: string[] = defaultResultDomains,
): Record<string, unknown> => ({
  ui: {
    csp: {
      connectDomains: resultDomains,
      resourceDomains: resultDomains,
    },
    prefersBorder: true,
  },
  'openai/widgetDescription': widgetDescription,
  'openai/widgetCSP': {
    connect_domains: resultDomains,
    resource_domains: resultDomains,
  },
  'openai/widgetPrefersBorder': true,
})

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
  :root {
    color-scheme: light dark;
    --fg: #1a1d21; --muted: #5f6672; --bg: #ffffff; --card: #f5f7fa; --border: #e1e5eb; --accent: #1b61a7; --ok: #1f8a4c; --err: #c0392b;
  }
  :root[data-theme="dark"] {
    --fg: #f1f3f5; --muted: #a2a8b3; --bg: #121417; --card: #1b1e23; --border: #2c313a; --accent: #7db8f2; --ok: #5ccf8a; --err: #f28b7d;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --fg: #f1f3f5; --muted: #a2a8b3; --bg: #121417; --card: #1b1e23; --border: #2c313a; --accent: #7db8f2; --ok: #5ccf8a; --err: #f28b7d;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 12px; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg); background: var(--bg); }
  a { color: var(--accent); }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }
  header h1 { font-size: 15px; margin: 0; }
  .badge { font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); }
  .badge.ok { color: var(--ok); border-color: var(--ok); }
  .badge.err { color: var(--err); border-color: var(--err); }
  .actions { margin-left: auto; display: flex; gap: 8px; }
  .button { display: inline-block; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--accent); background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; cursor: pointer; }
  .button.secondary { background: transparent; color: var(--accent); }
  section.step { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; background: var(--card); }
  section.step h2 { font-size: 13px; margin: 0 0 8px; font-weight: 600; }
  section.step h2 code { font-weight: 600; }
  .files { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  figure { margin: 0; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); overflow: hidden; }
  figure .preview { display: flex; align-items: center; justify-content: center; min-height: 72px; max-height: 220px; background: #0000000d; }
  figure img, figure video { display: block; max-width: 100%; max-height: 220px; }
  figure audio { width: 100%; }
  figure .file { padding: 12px; font-size: 24px; color: var(--muted); }
  figcaption { padding: 6px 8px; font-size: 12px; }
  figcaption .name { display: block; font-weight: 600; word-break: break-all; }
  .muted { color: var(--muted); }
  .error { color: var(--err); }
  details { margin-top: 10px; font-size: 12px; }
  pre { white-space: pre-wrap; word-break: break-word; font-size: 11px; background: var(--card); padding: 8px; border-radius: 6px; }
</style>
</head>
<body>
<main id="app"><p class="muted">Waiting for the Assembly result…</p></main>
<script>
(() => {
  const app = document.getElementById('app')
  const appInfo = ${JSON.stringify(widgetAppInfo)}
  const protocolVersion = ${JSON.stringify(widgetProtocolVersion)}
  const contextKey = ${JSON.stringify(widgetContextMetaKey)}
  const hostCapabilities = { openLinks: false }
  let hasResult = false

  const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
  const text = (value) => (typeof value === 'string' ? value : '')

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
      if (value === undefined || value === null) continue
      if (key === 'className') node.className = value
      else if (key === 'text') node.textContent = value
      else node.setAttribute(key, value)
    }
    for (const child of children || []) {
      if (child) node.append(child)
    }
    return node
  }

  const showStatus = (message, className) => {
    app.replaceChildren(el('p', { className: className || 'muted', role: 'status', text: message }))
  }

  // MCP Apps transport: JSON-RPC 2.0 over postMessage with the host (or its sandbox proxy).
  const post = (message) => {
    if (window.parent === window) return
    window.parent.postMessage(message, '*')
  }

  const pending = new Map()
  let nextId = 1
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      post({ jsonrpc: '2.0', id, method, params })
    })
  const notify = (method, params) =>
    post(params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params })
  const respond = (id, result) => post({ jsonrpc: '2.0', id, result })
  const respondError = (id, code, message) => post({ jsonrpc: '2.0', id, error: { code, message } })

  const applyHostContext = (context) => {
    if (!isRecord(context)) return
    if (context.theme === 'dark' || context.theme === 'light') {
      document.documentElement.dataset.theme = context.theme
    }
  }

  // Decided synchronously: preventDefault() after an await would be too late to stop navigation.
  const openWithHost = (url) => {
    const openai = window.openai
    if (openai && typeof openai.openExternal === 'function') {
      Promise.resolve(openai.openExternal({ href: url })).catch(() => {})
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
  const hostLink = (props, url) => {
    const anchor = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', ...props })
    anchor.addEventListener('click', (event) => {
      if (openWithHost(url)) event.preventDefault()
    })
    return anchor
  }

  const linkButton = (label, url, secondary) =>
    hostLink({ className: secondary ? 'button secondary' : 'button', text: label }, url)

  // Result files can land on the public bucket a moment after the Assembly reports completion,
  // and a failed <img>/<video> never retries by itself.
  const previewRetryDelays = [1000, 3000, 6000]
  const retryPreview = (media, url) => {
    let attempt = 0
    media.addEventListener('error', () => {
      if (attempt >= previewRetryDelays.length) {
        media.replaceWith(el('span', { className: 'muted', role: 'status', text: 'Preview not available yet' }))
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

  const preview = (file) => {
    const url = safeUrl(file.ssl_url) || safeUrl(file.url)
    const mime = text(file.mime)
    const name = text(file.name) || text(file.basename) || 'file'
    const box = el('div', { className: 'preview' })
    if (url && mime.startsWith('image/')) {
      box.append(retryPreview(el('img', { src: url, alt: name, loading: 'lazy' }), url))
    } else if (url && mime.startsWith('video/')) {
      box.append(retryPreview(el('video', { src: url, controls: '', preload: 'metadata', playsinline: '' }), url))
    } else if (url && mime.startsWith('audio/')) {
      box.append(retryPreview(el('audio', { src: url, controls: '', preload: 'metadata' }), url))
    } else {
      box.append(el('span', { className: 'file', 'aria-hidden': 'true', text: '📄' }))
    }
    return box
  }

  const fileCard = (file) => {
    const url = safeUrl(file.ssl_url) || safeUrl(file.url)
    const name = text(file.name) || text(file.basename) || 'file'
    const details = []
    if (typeof file.width === 'number' && typeof file.height === 'number') {
      details.push(file.width + '×' + file.height)
    }
    if (text(file.size_human)) details.push(text(file.size_human))
    if (text(file.mime)) details.push(text(file.mime))
    const caption = el('figcaption', {}, [
      el('span', { className: 'name', text: name }),
      el('span', { className: 'muted', text: details.join(' · ') }),
      url ? el('div', {}, [hostLink({ download: '', text: 'Download ' + name }, url)]) : null,
    ])
    return el('figure', {}, [preview(isRecord(file) ? file : {}), caption])
  }

  const errorText = (result, payload) => {
    const errors = Array.isArray(payload.errors) ? payload.errors : []
    const fromPayload = errors.map((error) => (isRecord(error) ? text(error.message) : '')).filter(Boolean)
    if (fromPayload.length > 0) return fromPayload.join(' ')
    const content = Array.isArray(result.content) ? result.content : []
    return content
      .map((block) => (isRecord(block) && block.type === 'text' ? text(block.text) : ''))
      .filter(Boolean)
      .join(' ')
  }

  const render = (result) => {
    if (!isRecord(result)) return
    hasResult = true
    app.replaceChildren()
    const payload = isRecord(result.structuredContent) ? result.structuredContent : {}
    const meta = isRecord(result._meta) && isRecord(result._meta[contextKey]) ? result._meta[contextKey] : {}
    const assembly = isRecord(payload.assembly) ? payload.assembly : null

    if (!assembly) {
      app.append(el('p', { className: 'error', role: 'alert', text: errorText(result, payload) || 'No Assembly result was returned.' }))
      return
    }

    const ok = text(assembly.ok)
    const failed = Boolean(assembly.error)
    const status = failed ? text(assembly.error) : ok || 'ASSEMBLY_EXECUTING'
    const header = el('header', {}, [
      el('h1', { text: 'Assembly ' + (text(assembly.assembly_id) || '') }),
      el('span', { className: 'badge ' + (failed ? 'err' : ok === 'ASSEMBLY_COMPLETED' ? 'ok' : ''), text: status }),
    ])
    const actions = el('div', { className: 'actions' })
    const consoleUrl = safeUrl(meta.assembly_console_url)
    if (consoleUrl) actions.append(linkButton('Open in Console', consoleUrl, true))
    const templateUrl = safeUrl(meta.new_template_url)
    if (meta.authenticated === true && templateUrl) actions.append(linkButton('Save as Template', templateUrl, false))
    if (actions.childElementCount > 0) header.append(actions)
    app.append(header)

    if (failed && text(assembly.message)) {
      app.append(el('p', { className: 'error', role: 'alert', text: text(assembly.message) }))
    }

    const results = isRecord(assembly.results) ? assembly.results : {}
    const uploads = Array.isArray(assembly.uploads) ? assembly.uploads : []
    const steps = Object.entries(results).filter(([, files]) => Array.isArray(files) && files.length > 0)
    if (uploads.length > 0) steps.unshift([':original', uploads])

    if (steps.length === 0) {
      app.append(el('p', { className: 'muted', text: 'No result files yet.' }))
    }
    for (const [stepName, files] of steps) {
      const section = el('section', { className: 'step' }, [
        el('h2', {}, [el('code', { text: stepName }), el('span', { className: 'muted', text: ' · ' + files.length + (files.length === 1 ? ' file' : ' files') })]),
        el('div', { className: 'files' }, files.filter(isRecord).map(fileCard)),
      ])
      app.append(section)
    }

    const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
    for (const warning of warnings) {
      if (isRecord(warning) && text(warning.message)) {
        app.append(el('p', { className: 'muted', text: warning.message }))
      }
    }
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
      if (!hasResult) showStatus('Running the Assembly…')
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
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(message.error)
    else entry.resolve(message.result)
  })

  // ChatGPT also exposes the result through window.openai; render from there when present.
  const renderFromOpenAi = () => {
    const openai = window.openai
    if (!openai) return
    applyHostContext({ theme: openai.theme })
    if (isRecord(openai.toolOutput)) {
      render({ structuredContent: openai.toolOutput, _meta: openai.toolResponseMetadata })
    }
  }
  window.addEventListener('openai:set_globals', renderFromOpenAi)
  renderFromOpenAi()

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
        if (!hasResult) showStatus('This host could not start the Assembly result view.', 'error')
      })

    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => {
        notify('ui/notifications/size-changed', {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        })
      }).observe(document.body)
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
}

/** Registers the widget so hosts can `resources/read` it through `_meta.ui.resourceUri`. */
export const registerAssemblyResultWidget = (
  server: McpServer,
  options: AssemblyResultWidgetOptions = {},
): void => {
  const meta = buildAssemblyResultWidgetMeta(
    options.resultDomains && options.resultDomains.length > 0
      ? options.resultDomains
      : defaultResultDomains,
  )
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
