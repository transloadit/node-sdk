import { Command, Option } from 'clipanion'
import * as notifications from '../notifications.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

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
    await notifications.replay(this.output, this.client, {
      notify_url: this.notifyUrl,
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}
