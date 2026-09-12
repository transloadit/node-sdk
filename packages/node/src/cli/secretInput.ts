import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

import { parse } from 'dotenv'

/** Hidden terminal input shared by CLI login and the opt-in rendering-env setup. */
export async function promptSecretInput(
  labels: Readonly<Record<string, string>>,
): Promise<Record<string, string>> {
  if (!process.stdin.isTTY || !process.stderr.isTTY)
    throw new Error(
      'Use an interactive terminal, or --stdin with the requested variables in dotenv format',
    )
  const output = new Writable({
    write(_chunk, _encoding, done) {
      done()
    },
  })
  const prompt = createInterface({ input: process.stdin, output, terminal: true })
  const abort = new AbortController()
  prompt.on('SIGINT', () => abort.abort())
  try {
    const values: Record<string, string> = {}
    for (const [name, label] of Object.entries(labels)) {
      process.stderr.write(`${label} (input hidden): `)
      values[name] = (await prompt.question('', { signal: abort.signal })).trim()
      process.stderr.write('\n')
    }
    return values
  } finally {
    prompt.close()
    output.destroy()
  }
}

/** Preserve opaque punctuation and literal escapes when serializing a CLI credential file. */
export function quoteCredential(value: string): string {
  for (const quote of ["'", '"', '`']) {
    const quoted = `${quote}${value}${quote}`
    if (parse(`value=${quoted}`).value === value) return quoted
  }
  throw new Error(
    'This credential cannot be represented safely in a dotenv file; nothing was saved',
  )
}
