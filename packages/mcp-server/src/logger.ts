import { SevLogger } from '@transloadit/sev-logger'

const baseLogger = new SevLogger({ breadcrumbs: ['mcp-server'] })

const redactString = (value: string, secrets: string[]): string => {
  let output = value.replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
  for (const secret of secrets) {
    if (!secret) continue
    output = output.split(secret).join('[redacted]')
  }
  return output
}

export const redactForLog = (value: unknown, secrets: string[]): string => {
  if (typeof value === 'string') return redactString(value, secrets)
  if (value instanceof Error) {
    const message = redactString(value.message, secrets)
    const stack = value.stack ? redactString(value.stack, secrets) : undefined
    return stack ? `${message}\n${stack}` : message
  }
  try {
    const serialized = JSON.stringify(value)
    if (serialized) return redactString(serialized, secrets)
  } catch {
    // ignore
  }
  return redactString(String(value), secrets)
}

export const buildRedactor = (secrets: Array<string | undefined>): ((value: unknown) => string) => {
  const normalized = secrets.filter((secret): secret is string => Boolean(secret))
  return (value) => redactForLog(value, normalized)
}

export const getLogger = (): SevLogger => baseLogger
