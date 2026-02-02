import { describe, expect, it } from 'vitest'
import { getRobotHelp, listRobots } from '../../src/Transloadit.ts'

describe('robot catalog helpers', () => {
  it('lists robots with searchable summaries', () => {
    const { robots, nextCursor } = listRobots({ search: 'image', limit: 3 })

    expect(robots.length).toBeGreaterThan(0)
    expect(robots[0]?.summary.length).toBeGreaterThan(0)
    for (const robot of robots) {
      const haystack = `${robot.name} ${robot.title ?? ''} ${robot.summary}`.toLowerCase()
      expect(haystack).toContain('image')
    }

    if (nextCursor) {
      expect(Number.parseInt(nextCursor, 10)).toBeGreaterThan(0)
    }
  })

  it('returns robot help and resolves class names', () => {
    const help = getRobotHelp({ robotName: 'ImageResizeRobot', detailLevel: 'params' })

    expect(help.name).toBe('/image/resize')
    expect(help.summary.length).toBeGreaterThan(0)
    expect(help.requiredParams.length + help.optionalParams.length).toBeGreaterThan(0)
  })
})
