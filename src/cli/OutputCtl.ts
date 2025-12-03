/**
 * Log levels following syslog severity (https://en.wikipedia.org/wiki/Syslog#Severity_level)
 * Lower numbers = more severe, higher numbers = more verbose
 */
export const LOG_LEVEL = {
  ERR: 3, // Error conditions
  WARN: 4, // Warning conditions
  NOTICE: 5, // Normal but significant (default)
  INFO: 6, // Informational
  DEBUG: 7, // Debug-level messages
} as const

export type LogLevelName = keyof typeof LOG_LEVEL
export type LogLevelValue = (typeof LOG_LEVEL)[LogLevelName]

export const LOG_LEVEL_DEFAULT: LogLevelValue = LOG_LEVEL.NOTICE

/** Valid log level names for CLI parsing */
export const LOG_LEVEL_NAMES = Object.keys(LOG_LEVEL).map((k) => k.toLowerCase()) as Lowercase<
  LogLevelName
>[]

/** Parse a log level string to its numeric value */
export function parseLogLevel(level: string): LogLevelValue {
  const upper = level.toUpperCase() as LogLevelName
  if (upper in LOG_LEVEL) {
    return LOG_LEVEL[upper]
  }
  throw new Error(`Invalid log level: ${level}. Valid levels: ${LOG_LEVEL_NAMES.join(', ')}`)
}

export interface OutputCtlOptions {
  logLevel?: LogLevelValue
  jsonMode?: boolean
}

/** Interface for output controllers (used to allow test mocks) */
export interface IOutputCtl {
  error(msg: unknown): void
  warn(msg: unknown): void
  notice(msg: unknown): void
  info(msg: unknown): void
  debug(msg: unknown): void
  print(simple: unknown, json: unknown): void
}

export default class OutputCtl implements IOutputCtl {
  private json: boolean
  private logLevel: LogLevelValue

  constructor({ logLevel = LOG_LEVEL_DEFAULT, jsonMode = false }: OutputCtlOptions = {}) {
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
    if (this.logLevel >= LOG_LEVEL.ERR) console.error('err    ', msg)
  }

  warn(msg: unknown): void {
    if (this.logLevel >= LOG_LEVEL.WARN) console.error('warn   ', msg)
  }

  notice(msg: unknown): void {
    if (this.logLevel >= LOG_LEVEL.NOTICE) console.error('notice ', msg)
  }

  info(msg: unknown): void {
    if (this.logLevel >= LOG_LEVEL.INFO) console.error('info   ', msg)
  }

  debug(msg: unknown): void {
    if (this.logLevel >= LOG_LEVEL.DEBUG) console.error('debug  ', msg)
  }

  print(simple: unknown, json: unknown): void {
    if (this.json) console.log(JSON.stringify(json))
    else if (typeof simple === 'string') console.log(simple)
    else console.dir(simple, { depth: null })
  }
}
