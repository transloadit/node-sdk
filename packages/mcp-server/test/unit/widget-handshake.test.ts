import { Window } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import packageJson from '../../package.json' with { type: 'json' }
import {
  assemblyResultWidgetHtml,
  widgetContextMetaKey,
} from '../../src/ui/assembly-result-widget.ts'

type JsonRpcMessage = Record<string, unknown>

const hostInfo = { name: 'TestHost', version: '9.9.9' }

/**
 * Loads the real widget document in a DOM whose `window.parent` is a fake MCP Apps host, so the
 * test sees exactly the JSON-RPC messages the inline script posts.
 */
const mountWidget = (
  options: { maxTimeout?: number; openai?: Record<string, unknown> } = {},
): {
  window: Window
  sent: JsonRpcMessage[]
  fromHost: (message: JsonRpcMessage) => Promise<void>
  appText: () => string
} => {
  const window = new Window({
    url: 'https://sandbox.example/',
    // The script under test is our own widget, so evaluating it in the VM is intended.
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      ...(options.maxTimeout === undefined ? {} : { timer: { maxTimeout: options.maxTimeout } }),
    },
  })
  const sent: JsonRpcMessage[] = []
  const host = { postMessage: (message: JsonRpcMessage) => sent.push(message) }
  Object.defineProperty(window, 'parent', { value: host, configurable: true })
  if (options.openai) {
    Object.defineProperty(window, 'openai', { value: options.openai, configurable: true })
  }
  window.document.write(assemblyResultWidgetHtml)

  const fromHost = async (message: JsonRpcMessage): Promise<void> => {
    window.dispatchEvent(new window.MessageEvent('message', { data: message, source: host }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  const appText = (): string => window.document.getElementById('app')?.textContent ?? ''
  return { window, sent, fromHost, appText }
}

const withoutSizeChanges = (messages: JsonRpcMessage[]): JsonRpcMessage[] =>
  messages.filter((message) => message.method !== 'ui/notifications/size-changed')

describe('assembly result widget handshake (MCP Apps 2026-01-26)', () => {
  let widget: ReturnType<typeof mountWidget>

  beforeEach(() => {
    widget = mountWidget()
  })

  afterEach(async () => {
    await widget.window.happyDOM.close()
  })

  const initialize = async (): Promise<void> => {
    await widget.fromHost({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2026-01-26',
        hostInfo,
        hostCapabilities: { openLinks: {} },
        hostContext: { theme: 'dark', displayMode: 'inline' },
      },
    })
  }

  it('opens with ui/initialize carrying appInfo, appCapabilities and protocolVersion', () => {
    expect(withoutSizeChanges(widget.sent)).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'ui/initialize',
        params: {
          appCapabilities: {},
          appInfo: { name: 'transloadit-assembly-result', version: packageJson.version },
          protocolVersion: '2026-01-26',
        },
      },
    ])
  })

  it('confirms with a param-less ui/notifications/initialized and applies the host theme', async () => {
    await initialize()

    expect(withoutSizeChanges(widget.sent).at(-1)).toEqual({
      jsonrpc: '2.0',
      method: 'ui/notifications/initialized',
    })
    expect(widget.window.document.documentElement.dataset.theme).toBe('dark')
  })

  it('renders tool-input progress, then the tool-result previews and actions', async () => {
    await initialize()
    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-input',
      params: { arguments: { instructions: { steps: {} } } },
    })
    expect(widget.appText()).toBe('Running the Assembly…')

    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        content: [{ type: 'text', text: '{}' }],
        structuredContent: {
          status: 'ok',
          assembly: {
            ok: 'ASSEMBLY_COMPLETED',
            assembly_id: 'abc123',
            results: {
              resized: [
                {
                  name: 'pixel.png',
                  mime: 'image/png',
                  ssl_url: 'https://pub-123.r2.dev/pixel.png',
                  width: 1,
                  height: 1,
                },
              ],
            },
          },
        },
        _meta: {
          [widgetContextMetaKey]: {
            authenticated: true,
            assembly_console_url: 'https://transloadit.com/c/acme/assemblies/abc123',
            new_template_url: 'https://transloadit.com/c/acme/templates/new',
          },
        },
      },
    })

    const document = widget.window.document
    expect(widget.appText()).toContain('Assembly abc123')
    expect(widget.appText()).toContain('ASSEMBLY_COMPLETED')
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://pub-123.r2.dev/pixel.png',
    )
    expect(widget.appText()).toContain('Download pixel.png')
    expect(widget.appText()).toContain('Save as Template')
    expect(widget.appText()).toContain('Open in Console')
  })

  it('opens download links through the host so sandboxed frames can still download', async () => {
    await initialize()
    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          status: 'ok',
          assembly: {
            ok: 'ASSEMBLY_COMPLETED',
            assembly_id: 'abc123',
            results: {
              resized: [
                { name: 'clip.mp4', mime: 'video/mp4', ssl_url: 'https://pub-123.r2.dev/clip.mp4' },
              ],
            },
          },
        },
      },
    })

    const link = widget.window.document.querySelector('a[download]')
    const click = new widget.window.MouseEvent('click', { bubbles: true, cancelable: true })
    link?.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(true)
    expect(widget.sent.find((message) => message.method === 'ui/open-link')).toMatchObject({
      params: { url: 'https://pub-123.r2.dev/clip.mp4' },
    })
  })

  it('shows the recovery advice when a created Assembly could not be read', async () => {
    await initialize()
    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        isError: true,
        structuredContent: {
          status: 'error',
          assembly: {
            assembly_id: 'abc123',
            assembly_ssl_url: 'https://api2.transloadit.com/assemblies/abc123',
          },
          errors: [
            {
              code: 'mcp_assembly_status_unavailable',
              message: 'The Assembly was created, but its status could not be read.',
              hint: 'Call transloadit_get_assembly_status instead of creating it again.',
            },
          ],
        },
      },
    })

    expect(widget.appText()).toContain('Assembly abc123')
    expect(widget.appText()).toContain(
      'The Assembly was created, but its status could not be read.',
    )
    expect(widget.appText()).toContain(
      'Call transloadit_get_assembly_status instead of creating it again.',
    )
  })

  it('shows the error text of a failed tool call instead of waiting forever', async () => {
    await initialize()
    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        isError: true,
        content: [{ type: 'text', text: 'API error (HTTP 400) INVALID_SIGNATURE' }],
      },
    })

    expect(widget.appText()).toBe('API error (HTTP 400) INVALID_SIGNATURE')
  })

  it('answers ping and ui/resource-teardown, and rejects unknown host requests', async () => {
    await initialize()
    await widget.fromHost({ jsonrpc: '2.0', id: 7, method: 'ping' })
    await widget.fromHost({ jsonrpc: '2.0', id: 8, method: 'ui/resource-teardown', params: {} })
    await widget.fromHost({ jsonrpc: '2.0', id: 9, method: 'ui/unknown', params: {} })

    expect(withoutSizeChanges(widget.sent).slice(-3)).toEqual([
      { jsonrpc: '2.0', id: 7, result: {} },
      { jsonrpc: '2.0', id: 8, result: {} },
      { jsonrpc: '2.0', id: 9, error: { code: -32601, message: 'Method not found: ui/unknown' } },
    ])
  })

  it('reports a rejected ui/initialize instead of staying on the waiting message', async () => {
    await widget.fromHost({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32602, message: 'Invalid params for ui/initialize' },
    })

    expect(widget.appText()).toBe('This host could not start the Assembly result view.')
  })
})

describe('assembly result widget in ChatGPT', () => {
  it('opens download links through window.openai.openExternal without a redirectUrl', async () => {
    const opened: unknown[] = []
    const widget = mountWidget({
      openai: {
        openExternal: (options: unknown) => {
          opened.push(options)
        },
        toolOutput: {
          status: 'ok',
          assembly: {
            ok: 'ASSEMBLY_COMPLETED',
            assembly_id: 'abc123',
            results: {
              resized: [
                { name: 'clip.mp4', mime: 'video/mp4', ssl_url: 'https://pub-123.r2.dev/clip.mp4' },
              ],
            },
          },
        },
      },
    })

    const click = new widget.window.MouseEvent('click', { bubbles: true, cancelable: true })
    widget.window.document.querySelector('a[download]')?.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(true)
    expect(opened).toEqual([{ href: 'https://pub-123.r2.dev/clip.mp4', redirectUrl: false }])
    await widget.window.happyDOM.close()
  })
})

describe('assembly result widget previews', () => {
  it('retries a preview that is not readable yet, then says so', async () => {
    // Collapse the widget's 1 s / 3 s / 6 s retry delays.
    const widget = mountWidget({ maxTimeout: 0 })
    const resultUrl = 'https://pub-123.r2.dev/resized.jpg'
    await widget.fromHost({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2026-01-26', hostInfo, hostCapabilities: {}, hostContext: {} },
    })
    await widget.fromHost({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          status: 'ok',
          assembly: {
            ok: 'ASSEMBLY_COMPLETED',
            assembly_id: 'abc123',
            results: { resized: [{ name: 'resized.jpg', mime: 'image/jpeg', ssl_url: resultUrl }] },
          },
        },
      },
    })

    const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5))
    const image = widget.window.document.querySelector('img')
    image?.dispatchEvent(new widget.window.Event('error'))
    await settle()
    expect(image?.getAttribute('src')).toBe(resultUrl)
    image?.dispatchEvent(new widget.window.Event('error'))
    await settle()
    image?.dispatchEvent(new widget.window.Event('error'))
    await settle()
    image?.dispatchEvent(new widget.window.Event('error'))
    await settle()

    expect(widget.appText()).toContain('Preview not available yet')
    expect(widget.appText()).toContain('Download resized.jpg')
    await widget.window.happyDOM.close()
  })
})
