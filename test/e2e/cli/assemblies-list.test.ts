import { describe, expect, it } from 'vitest'
import * as assemblies from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

describe('assemblies', () => {
  describe('list', () => {
    it(
      'should list assemblies',
      testCase(async (client) => {
        const output = new OutputCtl()
        await assemblies.list(output, client, { pagesize: 1 })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
      }),
    )
  })
})
