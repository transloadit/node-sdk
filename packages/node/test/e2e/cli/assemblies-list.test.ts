import { describe, expect, it } from 'vitest'
import * as assemblies from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { hasTransloaditCredentials, testCase } from './test-utils.ts'

const describeLive = hasTransloaditCredentials ? describe : describe.skip

describeLive('assemblies', () => {
  describe('list', () => {
    it(
      'should list assemblies',
      testCase(async (client) => {
        const output = new OutputCtl()
        // Narrow the date range so the stream ends quickly and doesn't depend on the account history.
        const now = new Date().toISOString()
        await assemblies.list(output, client, { pagesize: 1, after: now, before: now })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
      }),
    )
  })
})
