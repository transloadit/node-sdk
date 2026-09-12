import { Builtins, Cli } from 'clipanion'

import packageJson from '../../../package.json' with { type: 'json' }
import { intentCommands } from '../intentCommands.ts'
import {
  AssembliesCreateCommand,
  AssembliesDeleteCommand,
  AssembliesGetCommand,
  AssembliesLintCommand,
  AssembliesListCommand,
  AssembliesReplayCommand,
  AssemblyInstructionsCompileCommand,
  RunCommand,
} from './assemblies.ts'
import { SignatureCommand, SmartCdnSignatureCommand, TokenCommand } from './auth.ts'
import { BillsGetCommand } from './bills.ts'
import { DocsRobotsGetCommand, DocsRobotsListCommand } from './docs.ts'
import { ImageInitCommand } from './image.ts'
import { AuthLoginCommand } from './login.ts'
import { NotificationsReplayCommand } from './notifications.ts'
import { StorageListCommand, StorageStoreCommand } from './storage.ts'
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
  cli.register(TokenCommand)
  cli.register(AuthLoginCommand)

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
  cli.register(StorageStoreCommand)
  cli.register(StorageListCommand)
  cli.register(ImageInitCommand)

  // Prompt-to-Assembly-Instructions commands
  cli.register(AssemblyInstructionsCompileCommand)
  cli.register(RunCommand)

  // Documentation commands (offline metadata)
  cli.register(DocsRobotsListCommand)
  cli.register(DocsRobotsGetCommand)

  // Intent-first commands
  for (const command of intentCommands) {
    cli.register(command)
  }

  return cli
}
