import { Builtins, Cli } from 'clipanion'

import packageJson from '../../../package.json' with { type: 'json' }

import {
  AssembliesCreateCommand,
  AssembliesDeleteCommand,
  AssembliesGetCommand,
  AssembliesListCommand,
  AssembliesReplayCommand,
} from './assemblies.ts'

import { SignatureCommand, SmartCdnSignatureCommand } from './auth.ts'

import { BillsGetCommand } from './bills.ts'

import { NotificationsListCommand, NotificationsReplayCommand } from './notifications.ts'

import {
  TemplatesCreateCommand,
  TemplatesDeleteCommand,
  TemplatesGetCommand,
  TemplatesListCommand,
  TemplatesModifyCommand,
  TemplatesSyncCommand,
} from './templates.ts'

export function createCli(): Cli {
  const cli = new Cli({
    binaryLabel: 'Transloadit CLI',
    binaryName: 'transloadit',
    binaryVersion: packageJson.version,
  })

  // Built-in commands
  cli.register(Builtins.HelpCommand)
  cli.register(Builtins.VersionCommand)

  // Auth commands (signature generation)
  cli.register(SignatureCommand)
  cli.register(SmartCdnSignatureCommand)

  // Assemblies commands
  cli.register(AssembliesCreateCommand)
  cli.register(AssembliesListCommand)
  cli.register(AssembliesGetCommand)
  cli.register(AssembliesDeleteCommand)
  cli.register(AssembliesReplayCommand)

  // Templates commands
  cli.register(TemplatesCreateCommand)
  cli.register(TemplatesGetCommand)
  cli.register(TemplatesModifyCommand)
  cli.register(TemplatesDeleteCommand)
  cli.register(TemplatesListCommand)
  cli.register(TemplatesSyncCommand)

  // Bills commands
  cli.register(BillsGetCommand)

  // Notifications commands
  cli.register(NotificationsReplayCommand)
  cli.register(NotificationsListCommand)

  return cli
}
