import { Command, Option } from 'clipanion'
import { z } from 'zod'
import { tryCatch } from '../../alphalib/tryCatch.ts'
import type { Transloadit } from '../../Transloadit.ts'
import { formatAPIError } from '../helpers.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

// --- Types and business logic ---

export interface BillsGetOptions {
  months: string[]
}

const BillResponseSchema = z.object({
  total: z.number(),
})

export async function get(
  output: IOutputCtl,
  client: Transloadit,
  { months }: BillsGetOptions,
): Promise<void> {
  const requests = months.map((month) => client.getBill(month))

  const [err, results] = await tryCatch(Promise.all(requests))
  if (err) {
    output.error(formatAPIError(err))
    return
  }

  for (const result of results) {
    const parsed = BillResponseSchema.safeParse(result)
    if (parsed.success) {
      output.print(`$${parsed.data.total}`, result)
    } else {
      output.print('Unable to parse bill response', result)
    }
  }
}

// --- Command class ---

export class BillsGetCommand extends AuthenticatedCommand {
  static override paths = [
    ['bills', 'get'],
    ['bill', 'get'],
    ['b', 'get'],
    ['b', 'g'],
  ]

  static override usage = Command.Usage({
    category: 'Bills',
    description: 'Fetch billing information',
    details: `
      Fetch billing information for the specified months.
      Months should be specified in YYYY-MM format.
      If no month is specified, returns the current month.
    `,
    examples: [
      ['Get current month billing', 'transloadit bills get'],
      ['Get specific month', 'transloadit bills get 2024-01'],
      ['Get multiple months', 'transloadit bills get 2024-01 2024-02'],
    ],
  })

  months = Option.Rest()

  protected async run(): Promise<number | undefined> {
    const monthList: string[] = []

    for (const month of this.months) {
      if (!/^\d{4}-\d{1,2}$/.test(month)) {
        this.output.error(`invalid date format '${month}' (YYYY-MM)`)
        return 1
      }
      monthList.push(month)
    }

    // Default to current month if none specified
    if (monthList.length === 0) {
      const d = new Date()
      monthList.push(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`)
    }

    await get(this.output, this.client, {
      months: monthList,
    })
    return undefined
  }
}
