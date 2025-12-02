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

export class NotificationsListCommand extends AuthenticatedCommand {
  static override paths = [
    ['assembly-notifications', 'list'],
    ['notifications', 'list'],
    ['notification', 'list'],
    ['n', 'list'],
    ['n', 'l'],
  ]

  static override usage = Command.Usage({
    category: 'Notifications',
    description: 'List notifications matching given criteria',
    details: `
      If ASSEMBLY is specified, return only notifications sent for that assembly.
    `,
    examples: [
      ['List all notifications', 'transloadit assembly-notifications list'],
      ['List failed notifications', 'transloadit assembly-notifications list --failed'],
      ['List for specific assembly', 'transloadit assembly-notifications list ASSEMBLY_ID'],
    ],
  })

  failed = Option.Boolean('--failed', false, {
    description: 'Return only failed notifications',
  })

  successful = Option.Boolean('--successful', false, {
    description: 'Return only successful notifications',
  })

  assemblyId = Option.String({ required: false })

  protected async run(): Promise<number | undefined> {
    if (this.failed && this.successful) {
      this.output.error('assembly-notifications accepts at most one of --failed and --successful')
      return 1
    }

    let type: string | undefined
    if (this.failed) type = 'failed'
    else if (this.successful) type = 'successful'

    await notifications.list(this.output, this.client, {
      type,
      assembly_id: this.assemblyId,
    })
    return undefined
  }
}
