import { Command, Option } from 'clipanion'
import { tryCatch } from '../../alphalib/tryCatch.ts'
import type { Transloadit } from '../../Transloadit.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import { ensureError } from '../types.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

// --- Types and business logic ---

export interface NotificationsReplayOptions {
  notify_url?: string
  assemblies: string[]
}

async function replay(
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

// --- Command class ---

export class NotificationsReplayCommand extends AuthenticatedCommand {
  static override paths = [
    ['assembly-notifications', 'replay'],
    ['notifications', 'replay'],
    ['notification', 'replay'],
    ['n', 'replay'],
    ['n', 'r'],
  ]

  static override usage = Command.Usage({
    category: 'Notifications',
    description: 'Replay notifications for assemblies',
    examples: [
      ['Replay notifications', 'transloadit assembly-notifications replay ASSEMBLY_ID'],
      [
        'Replay to a new URL',
        'transloadit assembly-notifications replay --notify-url https://example.com/notify ASSEMBLY_ID',
      ],
    ],
  })

  notifyUrl = Option.String('--notify-url', {
    description: 'Specify a new URL to send the notifications to',
  })

  assemblyIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    await replay(this.output, this.client, {
      notify_url: this.notifyUrl,
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}
