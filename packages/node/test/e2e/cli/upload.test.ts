import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runCli, testCase } from './test-utils.ts'

describe('CLI upload', () => {
  it(
    'uploads a local file to a provided tus endpoint',
    testCase(async (client) => {
      const assembly = await client.createAssembly({
        params: {
          steps: {
            ':original': { robot: '/upload/handle' },
          },
        },
        expectedUploads: 1,
      })

      const assemblyUrl = String(assembly.assembly_ssl_url ?? '')
      const tusEndpoint = String(assembly.tus_url ?? '')

      expect(assemblyUrl).toMatch(/^https?:\/\//)
      expect(tusEndpoint).toMatch(/^https?:\/\//)

      const filePath = path.join(process.cwd(), 'upload.txt')
      await writeFile(filePath, 'hello from CLI upload', 'utf8')

      const { stdout, stderr } = await runCli(
        `upload ${filePath} ${tusEndpoint} --assembly ${assemblyUrl} --field :original --json`,
      )

      expect(stderr).toEqual('')

      const parsed = JSON.parse(stdout)
      expect(parsed.status).toBe('ok')
      expect(parsed.upload_url).toMatch(/^https?:\/\//)

      const completed = await client.awaitAssemblyCompletion(assembly.assembly_id, {
        timeout: 120_000,
      })

      expect(completed.ok).toBe('ASSEMBLY_COMPLETED')
      expect(Array.isArray(completed.uploads)).toBe(true)
      expect((completed.uploads ?? []).length).toBeGreaterThan(0)
    }),
    180_000,
  )
})
