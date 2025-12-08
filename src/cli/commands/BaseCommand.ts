import 'dotenv/config'
import process from 'node:process'
import { Command, Option } from 'clipanion'
import { Transloadit as TransloaditClient } from '../../Transloadit.ts'
import { getEnvCredentials } from '../helpers.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import OutputCtl, { LOG_LEVEL_DEFAULT, LOG_LEVEL_NAMES, parseLogLevel } from '../OutputCtl.ts'

export abstract class BaseCommand extends Command {
  logLevelOption = Option.String('-l,--log-level', {
    description: `Log level: ${LOG_LEVEL_NAMES.join(', ')} or 3-8 (default: notice)`,
  })

  json = Option.Boolean('-j,--json', false, {
    description: 'Output in JSON format',
  })

  endpoint = Option.String('--endpoint', {
    description:
      'API endpoint URL (default: https://api2.transloadit.com, or TRANSLOADIT_ENDPOINT env var)',
  })

  protected output!: IOutputCtl
  protected client!: TransloaditClient

  protected setupOutput(): void {
    const logLevel = this.logLevelOption ? parseLogLevel(this.logLevelOption) : LOG_LEVEL_DEFAULT
    this.output = new OutputCtl({
      logLevel,
      jsonMode: this.json,
    })
  }

  protected setupClient(): boolean {
    const creds = getEnvCredentials()
    if (!creds) {
      this.output.error(
        'Please provide API authentication in the environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET',
      )
      return false
    }

    const endpoint = this.endpoint || process.env.TRANSLOADIT_ENDPOINT

    this.client = new TransloaditClient({ ...creds, ...(endpoint && { endpoint }) })
    return true
  }

  abstract override execute(): Promise<number | undefined>
}

export abstract class AuthenticatedCommand extends BaseCommand {
  override async execute(): Promise<number | undefined> {
    this.setupOutput()
    if (!this.setupClient()) {
      return 1
    }
    return await this.run()
  }

  protected abstract run(): Promise<number | undefined>
}

export abstract class UnauthenticatedCommand extends BaseCommand {
  override async execute(): Promise<number | undefined> {
    this.setupOutput()
    return await this.run()
  }

  protected abstract run(): Promise<number | undefined>
}
