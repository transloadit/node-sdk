import process from 'node:process'
import { Command, Option } from 'clipanion'
import 'dotenv/config'
import { Transloadit as TransloaditClient } from '../../Transloadit.ts'
import OutputCtl, { type IOutputCtl } from '../OutputCtl.ts'

export abstract class BaseCommand extends Command {
  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable debug output',
  })

  quiet = Option.Boolean('-q,--quiet', false, {
    description: 'Disable warnings',
  })

  json = Option.Boolean('-j,--json', false, {
    description: 'Output in JSON format',
  })

  protected output!: IOutputCtl
  protected client!: TransloaditClient

  protected get logLevel(): number {
    if (this.verbose) return 2
    if (this.quiet) return 0
    return 1
  }

  protected setupOutput(): void {
    this.output = new OutputCtl({
      logLevel: this.logLevel,
      jsonMode: this.json,
    })
  }

  protected setupClient(): boolean {
    if (!process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
      this.output.error(
        'Please provide API authentication in the environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET',
      )
      return false
    }

    this.client = new TransloaditClient({
      authKey: process.env.TRANSLOADIT_KEY,
      authSecret: process.env.TRANSLOADIT_SECRET,
    })
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
