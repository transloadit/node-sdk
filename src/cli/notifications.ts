import { tryCatch } from '../alphalib/tryCatch.ts'
import type { Transloadit } from '../Transloadit.ts'
import type { IOutputCtl } from './OutputCtl.ts'
import { ensureError } from './types.ts'

export interface NotificationsReplayOptions {
  notify_url?: string
  assemblies: string[]
}

export interface NotificationsListOptions {
  type?: string
  assembly_id?: string
  pagesize?: number
}

export async function replay(
  output: IOutputCtl,
  client: Transloadit,
  { notify_url, assemblies }: NotificationsReplayOptions,
): Promise<void> {
  const promises = assemblies.map((id) => client.replayAssemblyNotification(id, { notify_url }))
  const [err] = await tryCatch(Promise.all(promises))
  if (err) {
    output.error(ensureError(err).message)
  }
}

export function list(
  output: IOutputCtl,
  _client: Transloadit,
  { type: _type, assembly_id: _assembly_id }: NotificationsListOptions,
): Promise<void> {
  output.error('List notifications is not supported in this version')
  return Promise.resolve()
}
