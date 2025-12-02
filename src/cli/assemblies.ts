import { z } from 'zod'
import { tryCatch } from '../alphalib/tryCatch.ts'
import type { Transloadit } from '../Transloadit.ts'
import assembliesCreate from './assemblies-create.ts'
import { createReadStream, formatAPIError, streamToBuffer } from './helpers.ts'
import type { IOutputCtl } from './OutputCtl.ts'
import { ensureError } from './types.ts'

export const create = assembliesCreate

export interface AssemblyListOptions {
  before?: string
  after?: string
  fields?: string[]
  keywords?: string[]
  pagesize?: number
}

export interface AssemblyGetOptions {
  assemblies: string[]
}

export interface AssemblyDeleteOptions {
  assemblies: string[]
}

export interface AssemblyReplayOptions {
  fields?: Record<string, string>
  reparse?: boolean
  steps?: string
  notify_url?: string
  assemblies: string[]
}

const AssemblySchema = z.object({
  id: z.string(),
})

export function list(
  output: IOutputCtl,
  client: Transloadit,
  { before, after, fields, keywords }: AssemblyListOptions,
): Promise<void> {
  const assemblies = client.streamAssemblies({
    fromdate: after,
    todate: before,
    keywords,
  })

  assemblies.on('readable', () => {
    const assembly: unknown = assemblies.read()
    if (assembly == null) return

    const parsed = AssemblySchema.safeParse(assembly)
    if (!parsed.success) return

    if (fields == null) {
      output.print(parsed.data.id, assembly)
    } else {
      const assemblyRecord = assembly as Record<string, unknown>
      output.print(fields.map((field) => assemblyRecord[field]).join(' '), assembly)
    }
  })

  return new Promise<void>((resolve) => {
    assemblies.on('end', resolve)
    assemblies.on('error', (err: unknown) => {
      output.error(formatAPIError(err))
      resolve()
    })
  })
}

export async function get(
  output: IOutputCtl,
  client: Transloadit,
  { assemblies }: AssemblyGetOptions,
): Promise<void> {
  for (const assembly of assemblies) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const [err, result] = await tryCatch(client.getAssembly(assembly))
    if (err) {
      output.error(formatAPIError(err))
      throw ensureError(err)
    }
    output.print(result, result)
  }
}

async function _delete(
  output: IOutputCtl,
  client: Transloadit,
  { assemblies }: AssemblyDeleteOptions,
): Promise<void> {
  const promises = assemblies.map(async (assembly) => {
    const [err] = await tryCatch(client.cancelAssembly(assembly))
    if (err) {
      output.error(formatAPIError(err))
    }
  })
  await Promise.all(promises)
}

export { _delete as delete }

const StepsSchema = z.record(z.string(), z.unknown())

export async function replay(
  output: IOutputCtl,
  client: Transloadit,
  { fields, reparse, steps, notify_url, assemblies }: AssemblyReplayOptions,
): Promise<void> {
  if (steps) {
    try {
      const buf = await streamToBuffer(createReadStream(steps))
      const parsed: unknown = JSON.parse(buf.toString())
      const validated = StepsSchema.safeParse(parsed)
      if (!validated.success) {
        throw new Error('Invalid steps format')
      }
      await apiCall(validated.data)
    } catch (err) {
      const error = ensureError(err)
      output.error(error.message)
    }
  } else {
    await apiCall()
  }

  async function apiCall(_steps?: Record<string, unknown>): Promise<void> {
    const promises = assemblies.map(async (assembly) => {
      const [err] = await tryCatch(
        client.replayAssembly(assembly, {
          reparse_template: reparse ? 1 : 0,
          fields,
          notify_url,
        }),
      )
      if (err) {
        output.error(formatAPIError(err))
      }
    })
    await Promise.all(promises)
  }
}
