import { describe, expect, it } from 'vitest'
import * as notifications from '../../../src/cli/notifications.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

describe('assembly-notifications', () => {
  describe('list', () => {
    // Skipped: notifications.list is not implemented in the SDK
    it.skip(
      'should list notifications',
      testCase(async (client) => {
        const output = new OutputCtl()
        await notifications.list(output, client, { pagesize: 1 })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
      }),
    )
  })
})
