import type { Client } from '@modelcontextprotocol/sdk/client'
import { Transloadit } from '@transloadit/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
const endpoint = process.env.TRANSLOADIT_ENDPOINT

const shouldRun = authKey != null && authSecret != null
const maybeDescribe = shouldRun ? describe : describe.skip

type TemplateInfo = {
  id: string
  name: string
}

maybeDescribe('mcp-server template URL handling', { timeout: 60000 }, () => {
  let client: Client
  let api: Transloadit
  const templates: TemplateInfo[] = []

  beforeAll(async () => {
    client = await createMcpClient()
    api = new Transloadit({ authKey: authKey ?? '', authSecret: authSecret ?? '', endpoint })
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`

    const importTemplate = await api.createTemplate({
      name: `mcp-import-${suffix}`,
      template: {
        steps: {
          import: {
            robot: '/http/import',
          },
          resized: {
            robot: '/image/resize',
            use: 'import',
            width: 1,
            height: 1,
            result: true,
          },
        },
      },
    })

    const uploadTemplate = await api.createTemplate({
      name: `mcp-upload-${suffix}`,
      template: {
        steps: {
          ':original': {
            robot: '/upload/handle',
          },
          resized: {
            robot: '/image/resize',
            use: ':original',
            width: 1,
            height: 1,
            result: true,
          },
        },
      },
    })

    const noInputTemplate = await api.createTemplate({
      name: `mcp-no-input-${suffix}`,
      template: {
        steps: {
          convert: {
            robot: '/html/convert',
            url: 'https://example.com',
            result: true,
          },
        },
      },
    })

    const fieldTemplate = await api.createTemplate({
      name: `mcp-fields-${suffix}`,
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

    templates.push(
      { id: importTemplate.id, name: importTemplate.name },
      { id: uploadTemplate.id, name: uploadTemplate.name },
      { id: noInputTemplate.id, name: noInputTemplate.name },
      { id: fieldTemplate.id, name: fieldTemplate.name },
    )
  })

  afterAll(async () => {
    for (const template of templates) {
      try {
        await api.deleteTemplate(template.id)
      } catch {
        // Best-effort cleanup.
      }
    }
    await client?.close()
  })

  it('uses /http/import when the template includes it', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: templates[0]?.id,
        },
        files: [
          {
            kind: 'url',
            field: 'source',
            url: 'https://demos.transloadit.com/inputs/prinsengracht.jpg',
          },
        ],
        wait_for_completion: true,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    expect(isRecord(payload.upload)).toBe(true)
    const upload = payload.upload as Record<string, unknown>
    expect(upload.status).toBe('none')
  })

  it('downloads URL inputs when the template expects uploads', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: templates[1]?.id,
        },
        files: [
          {
            kind: 'url',
            field: 'source',
            url: 'https://demos.transloadit.com/inputs/prinsengracht.jpg',
          },
        ],
        wait_for_completion: true,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    expect(isRecord(payload.upload)).toBe(true)
    const upload = payload.upload as Record<string, unknown>
    expect(upload.status).toBe('complete')
  })

  it('ignores URL inputs when the template needs no files', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: templates[2]?.id,
        },
        files: [
          {
            kind: 'url',
            field: 'source',
            url: 'https://demos.transloadit.com/inputs/prinsengracht.jpg',
          },
        ],
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    const upload = isRecord(payload.upload) ? (payload.upload as Record<string, unknown>) : {}
    expect(upload.status).toBe('none')
    const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
    expect(warnings.some((warning) => warning.code === 'mcp_url_inputs_ignored')).toBe(true)
  })

  it('errors when required fields are missing', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: templates[3]?.id,
        },
        fields: {
          wrong: 'https://example.com',
        },
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('error')
    const errors = Array.isArray(payload.errors) ? payload.errors : []
    expect(errors.some((error) => error.code === 'mcp_missing_fields')).toBe(true)
  })

  it('accepts required fields referenced by the template', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: templates[3]?.id,
        },
        fields: {
          prompt: 'https://example.com',
        },
        wait_for_completion: false,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
  })
})
