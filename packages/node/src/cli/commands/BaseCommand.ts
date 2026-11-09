import type { ResolvedCliConfig } from '../helpers.ts'
import type { IOutputCtl } from '../OutputCtl.ts'

import { Command, Option } from 'clipanion'
import { RequestError } from 'got'
import { z } from 'zod'

import { ApiError } from '../../ApiError.ts'
import { tryCatch } from '../../alphalib/tryCatch.ts'
import { Transloadit as TransloaditClient } from '../../Transloadit.ts'
import { CliInputError, formatSchemaIssues } from '../errors.ts'
import { buildMissingAuthMessage, formatAPIError, resolveCliConfig } from '../helpers.ts'
import OutputCtl, { LOG_LEVEL_DEFAULT, LOG_LEVEL_NAMES, parseLogLevel } from '../OutputCtl.ts'

abstract class BaseCommand extends Command {
  logLevelOption = Option.String('-l,--log-level', {
    description: `Log level: ${LOG_LEVEL_NAMES.join(', ')} or 3-8 (default: notice)`,
  })

  json = Option.Boolean('-j,--json', false, {
    description: 'Output in JSON format',
  })

  endpoint = Option.String('--endpoint', {
    description:
      'API endpoint URL (default: https://api2.transloadit.com, or TRANSLOADIT_ENDPOINT from the environment, .env, or ~/.transloadit/credentials)',
  })

  protected output!: IOutputCtl
  protected client!: TransloaditClient
  protected cliConfig!: ResolvedCliConfig

  protected setupOutput(): void {
    const logLevel = this.logLevelOption ? parseLogLevel(this.logLevelOption) : LOG_LEVEL_DEFAULT
    this.output = new OutputCtl({
      logLevel,
      jsonMode: this.json,
    })
  }

  protected setupClient(config: ResolvedCliConfig = resolveCliConfig()): boolean {
    this.cliConfig = config
    if (config.auth == null) {
      this.output.error(config.loadError ?? buildMissingAuthMessage())
      return false
    }

    const endpoint = this.endpoint || config.endpoint

    this.client = new TransloaditClient({
      ...config.auth,
      ...(endpoint && { endpoint }),
    })
    return true
  }

  abstract override execute(): Promise<number | undefined>

  protected abstract run(): Promise<number | undefined>

  /** Report schema, API, and transport failures once; other errors retain Clipanion's diagnostics. */
  protected async runWithErrorReporting(): Promise<number | undefined> {
    const [error, result] = await tryCatch(this.run())
    if (!error) return result
    if (error instanceof z.ZodError) {
      this.output.error(`Invalid options: ${formatSchemaIssues(error.issues)}`)
      return 1
    }
    if (error instanceof RequestError) {
      this.output.error(formatAPIError(error))
      return 1
    }
    if (error instanceof CliInputError || error instanceof ApiError) {
      this.output.error(formatAPIError(error))
      return 1
    }
    throw error
  }
}

export abstract class AuthenticatedCommand extends BaseCommand {
  override async execute(): Promise<number | undefined> {
    this.setupOutput()
    if (!this.setupClient()) {
      return 1
    }
    return await this.runWithErrorReporting()
  }
}

export abstract class UnauthenticatedCommand extends BaseCommand {
  override async execute(): Promise<number | undefined> {
    this.setupOutput()
    return await this.runWithErrorReporting()
  }
}
