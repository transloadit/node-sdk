import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

type JsonRecord = Record<string, unknown>

type ToolTextContent = {
  type: 'text'
  text: string
}

export const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isTextContent = (value: unknown): value is ToolTextContent =>
  isRecord(value) && value.type === 'text' && typeof value.text === 'string'

export const parseToolPayload = (result: {
  structuredContent?: Record<string, unknown>
  content?: Array<unknown>
}): JsonRecord => {
  if (isRecord(result.structuredContent)) {
    return result.structuredContent
  }

  const content = result.content?.[0]
  if (!isTextContent(content)) {
    throw new Error('Expected tool response content to be text JSON.')
  }

  const parsed = JSON.parse(content.text)
  if (!isRecord(parsed)) {
    throw new Error('Expected tool response to be a JSON object.')
  }

  return parsed
}

export const createMcpClient = async (): Promise<Client> => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cliPath, 'stdio'],
    env: process.env,
  })

  const client = new Client(
    {
      name: 'transloadit-mcp-e2e',
      version: '0.1.0',
    },
    {
      capabilities: {},
    },
  )

  await client.connect(transport)

  return client
}
