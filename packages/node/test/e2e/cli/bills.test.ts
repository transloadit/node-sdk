import { describe, expect, it } from 'vitest'
import * as bills from '../../../src/cli/commands/bills.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

describe('bills', () => {
  describe('get', () => {
    it(
      'should get bills',
      testCase(async (client) => {
        const output = new OutputCtl()
        const date = new Date()
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        await bills.get(output, client, { months: [month] })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
        expect(logs.filter((l) => l.type === 'print')).to.have.length.above(0)
      }),
    )
  })
})
