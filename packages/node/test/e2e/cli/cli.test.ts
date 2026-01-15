import { describe, expect, it } from 'vitest'
import { runCli } from './test-utils.ts'

describe('CLI', () => {
  it('should list templates via CLI', async () => {
    const { stdout, stderr } = await runCli('templates list')
    expect(stderr).to.be.empty
    expect(stdout).to.match(/[a-f0-9]{32}/)
  })
})
