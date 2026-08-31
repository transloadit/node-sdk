import { execa } from 'execa'
import { expect, test } from 'vitest'

import { withProcess } from './withProcess.ts'

test('terminates and awaits the child when guarded work fails', async () => {
  const child = execa(process.execPath, ['-e', 'setInterval(() => undefined, 1_000)'])
  const readinessError = new Error('Fixture readiness failed')

  await expect(
    withProcess(child, async () => {
      await Promise.resolve()
      throw readinessError
    }),
  ).rejects.toBe(readinessError)
  expect(child.signalCode).toBe('SIGTERM')
})
