import { parse } from 'dotenv'

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
