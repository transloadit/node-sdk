import { Builtins, Cli } from 'clipanion'

import packageJson from '../../../package.json' with { type: 'json' }

import {
  AssembliesCreateCommand,
  AssembliesDeleteCommand,
  AssembliesGetCommand,
  AssembliesLintCommand,
  AssembliesListCommand,
  AssembliesReplayCommand,
} from './assemblies.ts'

import { SignatureCommand, SmartCdnSignatureCommand } from './auth.ts'

import { BillsGetCommand } from './bills.ts'
import { DocsRobotsGetCommand, DocsRobotsListCommand } from './docs.ts'
import { NotificationsReplayCommand } from './notifications.ts'
import {
  TemplatesCreateCommand,
  TemplatesDeleteCommand,
  TemplatesGetCommand,
  TemplatesListCommand,
  TemplatesModifyCommand,
  TemplatesSyncCommand,
} from './templates.ts'
import { UploadCommand } from './upload.ts'

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
  cli.register(AssembliesLintCommand)

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

  // Uploads commands
  cli.register(UploadCommand)

  // Documentation commands (offline metadata)
  cli.register(DocsRobotsListCommand)
  cli.register(DocsRobotsGetCommand)

  return cli
}
