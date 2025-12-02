export interface OutputCtlOptions {
  logLevel?: number
  jsonMode?: boolean
}

/** Interface for output controllers (used to allow test mocks) */
export interface IOutputCtl {
  error(msg: unknown): void
  warn(msg: unknown): void
  info(msg: unknown): void
  debug(msg: unknown): void
  print(simple: unknown, json: unknown): void
}

export default class OutputCtl implements IOutputCtl {
  private json: boolean
  private logLevel: number

  constructor({ logLevel = 0, jsonMode = false }: OutputCtlOptions = {}) {
    this.json = jsonMode
    this.logLevel = logLevel

    process.stdout.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') {
        process.exitCode = 0
      }
    })
    process.stderr.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') {
        process.exitCode = 0
      }
    })
  }

  error(msg: unknown): void {
    console.error('ERROR  ', msg)
  }

  warn(msg: unknown): void {
    if (this.logLevel > 0) console.error('WARNING', msg)
  }

  info(msg: unknown): void {
    if (this.logLevel > 0) console.error('INFO   ', msg)
  }

  debug(msg: unknown): void {
    if (this.logLevel > 1) console.error('DEBUG  ', msg)
  }

  print(simple: unknown, json: unknown): void {
    if (this.json) console.log(JSON.stringify(json))
    else if (typeof simple === 'string') console.log(simple)
    else console.dir(simple, { depth: null })
  }
}
