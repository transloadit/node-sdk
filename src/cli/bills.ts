import { z } from 'zod'
import { tryCatch } from '../alphalib/tryCatch.ts'
import type { Transloadit } from '../Transloadit.ts'
import { formatAPIError } from './helpers.ts'
import type { IOutputCtl } from './OutputCtl.ts'

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
