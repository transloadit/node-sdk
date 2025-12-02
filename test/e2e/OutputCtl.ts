import type { OutputCtlOptions } from '../../src/cli/OutputCtl.ts'

interface OutputEntry {
  type: 'error' | 'warn' | 'info' | 'debug' | 'print'
  msg: unknown
  json?: unknown
}

/**
 * Test version of OutputCtl that captures output for verification
 * instead of writing to console. Implements the same interface as src/cli/OutputCtl.
 */
export default class OutputCtl {
  private output: OutputEntry[]
  // These properties are required by the src/cli/OutputCtl interface but not used in tests
  private json: boolean
  private logLevel: number

  constructor({ logLevel = 0, jsonMode = false }: OutputCtlOptions = {}) {
    this.output = []
    this.json = jsonMode
    this.logLevel = logLevel
  }

  error(msg: unknown): void {
    this.output.push({ type: 'error', msg })
  }

  warn(msg: unknown): void {
    this.output.push({ type: 'warn', msg })
  }

  info(msg: unknown): void {
    this.output.push({ type: 'info', msg })
  }

  debug(msg: unknown): void {
    this.output.push({ type: 'debug', msg })
  }

  print(msg: unknown, json?: unknown): void {
    this.output.push({ type: 'print', msg, json })
  }

  get(debug = false): OutputEntry[] {
    return this.output.filter((line) => debug || line.type !== 'debug')
  }
}
