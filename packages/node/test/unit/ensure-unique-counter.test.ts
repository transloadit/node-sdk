import { describe, expect, it } from 'vitest'
import { ensureUniqueCounterValue } from '../../src/ensureUniqueCounter.ts'

describe('ensureUniqueCounterValue', () => {
  it('does not hand out the same candidate to concurrent callers in the same scope', async () => {
    const reserved = new Set<string>()
    const seenCandidates: string[] = []

    const allocate = async (): Promise<string> =>
      await ensureUniqueCounterValue({
        initialValue: 'result.txt',
        isTaken: async (candidate) => {
          seenCandidates.push(candidate)
          await Promise.resolve()
          return reserved.has(candidate)
        },
        reserve: (candidate) => {
          reserved.add(candidate)
        },
        nextValue: (counter) => `result__${counter}.txt`,
        scope: reserved,
      })

    const [first, second] = await Promise.all([allocate(), allocate()])

    expect(new Set([first, second]).size).toBe(2)
    expect(reserved).toEqual(new Set([first, second]))
    expect(seenCandidates.filter((candidate) => candidate === 'result.txt').length).toBeGreaterThan(
      0,
    )
  })
})
