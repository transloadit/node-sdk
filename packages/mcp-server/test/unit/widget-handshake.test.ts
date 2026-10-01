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
const mountWidget = (): {
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
    },
  })
  const sent: JsonRpcMessage[] = []
  const host = { postMessage: (message: JsonRpcMessage) => sent.push(message) }
  Object.defineProperty(window, 'parent', { value: host, configurable: true })
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
