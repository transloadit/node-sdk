import { tryCatch } from '../alphalib/tryCatch.ts'
import type { Transloadit } from '../Transloadit.ts'
import type { IOutputCtl } from './OutputCtl.ts'
import { ensureError } from './types.ts'

export interface NotificationsReplayOptions {
  notify_url?: string
  assemblies: string[]
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
