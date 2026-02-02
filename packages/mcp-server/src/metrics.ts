import { collectDefaultMetrics, Registry } from 'prom-client'

const registry = new Registry()
let defaultsStarted = false

const ensureDefaults = (): void => {
  if (defaultsStarted) return
  collectDefaultMetrics({ register: registry })
  defaultsStarted = true
}

export const getMetrics = (): Promise<string> => {
  ensureDefaults()
  return registry.metrics()
}

export const getMetricsContentType = (): string => {
  ensureDefaults()
  return registry.contentType
}
