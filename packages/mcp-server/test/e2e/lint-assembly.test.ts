import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lintAssemblyInstructions } from '../../../node/src/lintAssemblyInstructions.ts'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

const toExpectedLintIssue = (issue: {
  summary: string
  desc?: string
  type: string
  stepName?: string
}) => ({
  path: issue.stepName ? `steps.${issue.stepName}` : 'instructions',
  message: issue.summary,
  severity: issue.type,
  hint: issue.desc && issue.desc !== issue.summary ? issue.desc : undefined,
})

maybeDescribe('mcp-server lint assembly instructions (stdio)', { timeout: 30000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('returns lint issues with consistent formatting', async () => {
    const instructions = {
      steps: {
        ':original': {
          robot: '/upload/handle',
        },
        resize: {
          use: ':original',
          width: 100,
          height: 100,
        },
      },
    }

    const lintResult = await lintAssemblyInstructions({
      assemblyInstructions: instructions,
    })

    const expectedIssues = lintResult.issues.map(toExpectedLintIssue)

    const result = await client.callTool({
      name: 'transloadit_lint_assembly_instructions',
      arguments: {
        assembly: instructions,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('error')
    const lintingIssues = Array.isArray(payload.linting_issues) ? payload.linting_issues : []

    for (const expected of expectedIssues) {
      expect(lintingIssues).toContainEqual(expected)
    }
  })

  it('treats warnings as fatal in strict mode', async () => {
    const result = await client.callTool({
      name: 'transloadit_lint_assembly_instructions',
      arguments: {
        assembly: {
          steps: {
            ':original': {
              robot: '/upload/handle',
            },
          },
        },
        strict: true,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('error')
    expect(Array.isArray(payload.linting_issues)).toBe(true)
    const firstIssue = (payload.linting_issues as Array<Record<string, unknown>>)[0]
    expect(isRecord(firstIssue)).toBe(true)
  })
})
