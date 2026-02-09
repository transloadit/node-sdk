import { Option } from 'clipanion'
import { getRobotHelp, isKnownRobot, listRobots } from '../../robots.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

const splitRobotArgs = (values: string[]): string[] => {
  const out: string[] = []
  for (const value of values) {
    for (const part of value.split(',')) {
      const trimmed = part.trim()
      if (trimmed) out.push(trimmed)
    }
  }
  return out
}

export class DocsRobotsListCommand extends UnauthenticatedCommand {
  static override paths = [['docs', 'robots', 'list']]

  search = Option.String('--search', { description: 'Filter by substring match.' })
  category = Option.String('--category', { description: 'Filter by category (service slug).' })
  limit = Option.String('--limit', { description: 'Max results (default: 20).' })
  cursor = Option.String('--cursor', { description: 'Pagination cursor.' })

  protected override run(): Promise<number | undefined> {
    const limitNum = this.limit ? Number.parseInt(this.limit, 10) : undefined
    const result = listRobots({
      search: this.search,
      category: this.category,
      limit: Number.isFinite(limitNum as number) ? (limitNum as number) : undefined,
      cursor: this.cursor,
    })

    this.output.print(result.robots.map((r) => `${r.name}  ${r.summary}`).join('\n'), {
      robots: result.robots,
      nextCursor: result.nextCursor,
    })

    return Promise.resolve(0)
  }
}

export class DocsRobotsGetCommand extends UnauthenticatedCommand {
  static override paths = [['docs', 'robots', 'get']]

  robots = Option.Rest({ required: 1 })

  protected override run(): Promise<number | undefined> {
    const requested = splitRobotArgs(this.robots)
    const robots = []
    const notFound: string[] = []

    for (const robotName of requested) {
      if (!isKnownRobot(robotName)) {
        notFound.push(robotName)
        continue
      }
      const help = getRobotHelp({ robotName, detailLevel: 'full' })
      robots.push(help)
    }

    this.output.print(robots.length === 1 ? robots[0] : robots, {
      robots,
      notFound,
    })

    return Promise.resolve(notFound.length > 0 ? 1 : 0)
  }
}
