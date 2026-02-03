import type { Client } from '@modelcontextprotocol/sdk/client'
import { Transloadit } from '@transloadit/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
const endpoint = process.env.TRANSLOADIT_ENDPOINT

const shouldRun = authKey != null && authSecret != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server list templates', { timeout: 60000 }, () => {
  let client: Client
  let api: Transloadit
  let templateId = ''
  let templateName = ''

  beforeAll(async () => {
    client = await createMcpClient()
    api = new Transloadit({ authKey: authKey ?? '', authSecret: authSecret ?? '', endpoint })
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    templateName = `mcp-list-${suffix}`
    const tpl = await api.createTemplate({
      name: templateName,
      template: {
        steps: {
          generate: {
            robot: '/image/generate',
            model: 'google/nano-banana-pro',
            prompt: '${fields.prompt}',
            result: true,
          },
        },
      },
    })
    templateId = tpl.id
  })

  afterAll(async () => {
    if (templateId) {
      try {
        await api.deleteTemplate(templateId)
      } catch {
        // best-effort cleanup
      }
    }
    await client?.close()
  })

  it('returns steps when include_content is true', async () => {
    const result = await client.callTool({
      name: 'transloadit_list_templates',
      arguments: {
        keywords: [templateName],
        include_content: true,
        page_size: 50,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    const templates = Array.isArray(payload.templates) ? payload.templates : []
    const match = templates.find(
      (template: Record<string, unknown>) => template.name === templateName,
    )
    expect(isRecord(match)).toBe(true)
    expect(isRecord((match as Record<string, unknown>).steps)).toBe(true)
  })

  it('omits steps when include_content is false', async () => {
    const result = await client.callTool({
      name: 'transloadit_list_templates',
      arguments: {
        keywords: [templateName],
        include_content: false,
        page_size: 50,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    const templates = Array.isArray(payload.templates) ? payload.templates : []
    const match = templates.find(
      (template: Record<string, unknown>) => template.name === templateName,
    )
    expect(isRecord(match)).toBe(true)
    expect('steps' in (match as Record<string, unknown>)).toBe(false)
  })
})
