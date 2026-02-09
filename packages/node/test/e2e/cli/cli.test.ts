import { describe, expect, it } from 'vitest'
import { hasTransloaditCredentials, runCli } from './test-utils.ts'

const describeLive = hasTransloaditCredentials ? describe : describe.skip

describeLive('CLI', () => {
  it('should list templates via CLI', async () => {
    const { stdout, stderr } = await runCli('templates list')
    expect(stderr).to.be.empty
    expect(stdout).to.match(/[a-f0-9]{32}/)
  })
})
