#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { SevLogger } from '@transloadit/sev-logger'
import { config as loadDotEnv } from 'dotenv'
import type {
  CounterMetricEvent,
  GaugeMetricEvent,
  ProxyLogEvent,
  ProxyRuntimeOptions,
  ProxySettings,
  TimingMetricEvent,
} from './index.ts'
import { TransloaditNotifyUrlProxy } from './index.ts'

loadDotEnv({ quiet: true })

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

const LOG_LEVEL_BY_NAME = {
  emerg: SevLogger.LEVEL.EMERG,
  alert: SevLogger.LEVEL.ALERT,
  crit: SevLogger.LEVEL.CRIT,
  err: SevLogger.LEVEL.ERR,
  error: SevLogger.LEVEL.ERR,
  warn: SevLogger.LEVEL.WARN,
  warning: SevLogger.LEVEL.WARN,
  notice: SevLogger.LEVEL.NOTICE,
  info: SevLogger.LEVEL.INFO,
  debug: SevLogger.LEVEL.DEBUG,
  trace: SevLogger.LEVEL.TRACE,
} as const

function isLogLevelName(value: string): value is keyof typeof LOG_LEVEL_BY_NAME {
  return Object.hasOwn(LOG_LEVEL_BY_NAME, value)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function parsePositiveIntOption(
  name: string,
  value: string,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    fail(`Invalid ${name}: ${value}`)
  }
  return parsed
}

function parsePositiveFloatOption(
  name: string,
  value: string,
  min = Number.MIN_VALUE,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fail(`Invalid ${name}: ${value}`)
  }
  return parsed
}

function parseLogLevelOption(value: string): number {
  const normalized = value.trim().toLowerCase()
  const parsedNumeric = Number.parseInt(normalized, 10)

  if (
    Number.isInteger(parsedNumeric) &&
    parsedNumeric >= SevLogger.LEVEL.EMERG &&
    parsedNumeric <= SevLogger.LEVEL.TRACE
  ) {
    return parsedNumeric
  }

  if (isLogLevelName(normalized)) {
    return LOG_LEVEL_BY_NAME[normalized]
  }

  fail(
    `Invalid log level: ${value}. Use 0-8 or one of ${Object.keys(LOG_LEVEL_BY_NAME).join(', ')}.`,
  )
}

function parseHttpUrlOption(name: string, value: string): URL {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    fail(`Invalid ${name}: ${value}`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    fail(`Invalid ${name} protocol: ${parsed.protocol}. Use http or https.`)
  }
  if (!parsed.hostname) {
    fail(`Invalid ${name}: missing hostname.`)
  }

  return parsed
}

function parseNotifyUrlOption(value: string): string {
  const parsed = parseHttpUrlOption('notifyUrl', value)
  const normalizedHost = parsed.hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase()
  if (parsed.protocol === 'http:' && !LOCAL_HOSTS.has(normalizedHost)) {
    fail('Insecure notifyUrl over HTTP is only allowed for localhost/127.0.0.1/::1.')
  }

  return parsed.toString()
}

function sparkline(values: number[], width = 44): string {
  const chars = '▁▂▃▄▅▆▇█'
  const tail = values.slice(-width)

  if (tail.length === 0) {
    return '·'.repeat(width)
  }

  const max = Math.max(...tail, 1)
  return tail
    .map((value) => {
      const ratio = value / max
      const index = Math.max(0, Math.min(chars.length - 1, Math.round(ratio * (chars.length - 1))))
      return chars[index]
    })
    .join('')
    .padStart(width, '·')
}

function createTuiMode(logLevel: number | undefined): {
  runtimeOptions: ProxyRuntimeOptions
  start: () => void
  stop: () => void
} {
  const counters: Record<string, number> = {}
  const gauges: Record<string, number> = {}
  const timings: Record<string, TimingMetricEvent> = {}
  const logs: ProxyLogEvent[] = []
  const series: {
    forward: number[]
    pollRetry: number[]
    notifyOk: number[]
    inflight: number[]
    latencyForward: number[]
    latencyNotify: number[]
  } = {
    forward: [],
    pollRetry: [],
    notifyOk: [],
    inflight: [],
    latencyForward: [],
    latencyNotify: [],
  }

  const startedAt = Date.now()
  let timer: NodeJS.Timeout | null = null

  const pushSeries = (key: keyof typeof series, value: number): void => {
    const bucket = series[key]
    bucket.push(value)
    if (bucket.length > 160) {
      bucket.splice(0, bucket.length - 160)
    }
  }

  const onCounter = (event: CounterMetricEvent): void => {
    counters[event.name] = event.total
    if (event.name === 'forward.requests_total') pushSeries('forward', event.total)
    if (event.name === 'poll.retry_total') pushSeries('pollRetry', event.total)
    if (event.name === 'notify.success_total') pushSeries('notifyOk', event.total)
  }

  const onGauge = (event: GaugeMetricEvent): void => {
    gauges[event.name] = event.value
    if (event.name === 'poll.in_flight') pushSeries('inflight', event.value)
  }

  const onTiming = (event: TimingMetricEvent): void => {
    timings[event.name] = event
    if (event.name === 'forward.request_duration_ms') pushSeries('latencyForward', event.durationMs)
    if (event.name === 'notify.duration_ms') pushSeries('latencyNotify', event.durationMs)
  }

  const onLog = (event: ProxyLogEvent): void => {
    logs.push(event)
    if (logs.length > 160) {
      logs.splice(0, logs.length - 160)
    }
  }

  const runtimeOptions: ProxyRuntimeOptions = {
    ...(typeof logLevel === 'number' ? { logLevel } : {}),
    metricsHooks: {
      onCounter,
      onGauge,
      onTiming,
    },
    onLog,
  }

  const render = (): void => {
    const uptimeSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    const h = Math.floor(uptimeSec / 3600)
    const m = Math.floor((uptimeSec % 3600) / 60)
    const s = uptimeSec % 60
    const uptime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

    const lines: string[] = []
    lines.push('\x1b[2J\x1b[H')
    lines.push('\x1b[38;5;117mNotify URL Relay // Reactive TUI\x1b[0m')
    lines.push(`Uptime: ${uptime}  |  Press Ctrl+C to exit`)
    lines.push('')

    lines.push('METRICS')
    lines.push(
      `  forward.requests_total: ${counters['forward.requests_total'] ?? 0}   poll.retry_total: ${counters['poll.retry_total'] ?? 0}`,
    )
    lines.push(
      `  notify.success_total : ${counters['notify.success_total'] ?? 0}   poll.in_flight : ${gauges['poll.in_flight'] ?? 0}`,
    )
    lines.push(
      `  forward p50-ish last: ${Math.round(timings['forward.request_duration_ms']?.avgMs ?? 0)}ms   notify avg: ${Math.round(timings['notify.duration_ms']?.avgMs ?? 0)}ms`,
    )
    lines.push('')

    lines.push('GRAPHS')
    lines.push(`  Forward Throughput ${sparkline(series.forward)}`)
    lines.push(`  Poll Retries      ${sparkline(series.pollRetry)}`)
    lines.push(`  Notify Success    ${sparkline(series.notifyOk)}`)
    lines.push(`  In-Flight Polls   ${sparkline(series.inflight)}`)
    lines.push(`  Forward Latency   ${sparkline(series.latencyForward)}`)
    lines.push(`  Notify Latency    ${sparkline(series.latencyNotify)}`)
    lines.push('')

    lines.push('LIVE LOGS')
    for (const log of logs.slice(-18)) {
      const time = new Date(log.at).toLocaleTimeString()
      const level = log.level.padEnd(6, ' ')
      lines.push(`  ${time}  ${level}  ${log.message}`)
    }

    process.stdout.write(lines.join('\n'))
  }

  const start = (): void => {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25l')
    }
    timer = setInterval(render, 180)
    render()
  }

  const stop = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h\n')
    }
  }

  return { runtimeOptions, start, stop }
}

type CliState = {
  help: boolean
  logLevelRaw: string | undefined
  notifyUrlRaw: string | undefined
  settings: Partial<ProxySettings>
  ui: boolean
}

type CliOptionDefinitionBase = {
  aliases?: string[]
  description: string
  key: string
  short?: string
  usage: string
}

type CliOptionDefinitionString = CliOptionDefinitionBase & {
  apply: (value: string, state: CliState) => void
  type: 'string'
}

type CliOptionDefinitionBoolean = CliOptionDefinitionBase & {
  apply: (value: boolean, state: CliState) => void
  type: 'boolean'
}

type CliOptionDefinition = CliOptionDefinitionString | CliOptionDefinitionBoolean

const CLI_OPTIONS: CliOptionDefinition[] = [
  {
    key: 'notifyUrl',
    type: 'string',
    usage: '--notifyUrl <url>',
    description: 'URL to send notifications to (http://localhost allowed, otherwise https)',
    apply: (value, state) => {
      state.notifyUrlRaw = parseNotifyUrlOption(value)
    },
  },
  {
    key: 'target',
    type: 'string',
    usage: '--target <url>',
    description: 'Transloadit endpoint base URL',
    apply: (value, state) => {
      state.settings.target = parseHttpUrlOption('target', value).toString()
    },
  },
  {
    key: 'port',
    type: 'string',
    usage: '--port <number>',
    description: 'Local listen port',
    apply: (value, state) => {
      state.settings.port = parsePositiveIntOption('port', value, 65_535)
    },
  },
  {
    key: 'forwardTimeoutMs',
    type: 'string',
    usage: '--forwardTimeoutMs <number>',
    description: 'Forward request timeout in milliseconds',
    apply: (value, state) => {
      state.settings.forwardTimeoutMs = parsePositiveIntOption('forwardTimeoutMs', value)
    },
  },
  {
    key: 'pollIntervalMs',
    type: 'string',
    usage: '--pollIntervalMs <number>',
    description: 'Base poll retry interval in milliseconds',
    apply: (value, state) => {
      state.settings.pollIntervalMs = parsePositiveIntOption('pollIntervalMs', value)
    },
  },
  {
    key: 'pollMaxIntervalMs',
    type: 'string',
    usage: '--pollMaxIntervalMs <number>',
    description: 'Max poll retry interval in milliseconds',
    apply: (value, state) => {
      state.settings.pollMaxIntervalMs = parsePositiveIntOption('pollMaxIntervalMs', value)
    },
  },
  {
    key: 'pollBackoffFactor',
    type: 'string',
    usage: '--pollBackoffFactor <number>',
    description: 'Poll retry backoff factor (>= 1)',
    apply: (value, state) => {
      state.settings.pollBackoffFactor = parsePositiveFloatOption('pollBackoffFactor', value, 1)
    },
  },
  {
    key: 'pollRequestTimeoutMs',
    type: 'string',
    usage: '--pollRequestTimeoutMs <num>',
    description: 'Per poll request timeout in milliseconds',
    apply: (value, state) => {
      state.settings.pollRequestTimeoutMs = parsePositiveIntOption('pollRequestTimeoutMs', value)
    },
  },
  {
    key: 'maxPollAttempts',
    type: 'string',
    usage: '--maxPollAttempts <number>',
    description: 'Max number of poll attempts',
    apply: (value, state) => {
      state.settings.maxPollAttempts = parsePositiveIntOption('maxPollAttempts', value)
    },
  },
  {
    key: 'maxInFlightPolls',
    type: 'string',
    usage: '--maxInFlightPolls <number>',
    description: 'Max number of active assembly pollers',
    apply: (value, state) => {
      state.settings.maxInFlightPolls = parsePositiveIntOption('maxInFlightPolls', value)
    },
  },
  {
    key: 'notifyOnTerminalError',
    aliases: ['notify-on-terminal-error'],
    type: 'boolean',
    usage: '--notifyOnTerminalError',
    description: 'Send notify payload when terminal error is reached',
    apply: (value, state) => {
      if (value) {
        state.settings.notifyOnTerminalError = true
      }
    },
  },
  {
    key: 'notifyTimeoutMs',
    type: 'string',
    usage: '--notifyTimeoutMs <number>',
    description: 'Per notify request timeout in milliseconds',
    apply: (value, state) => {
      state.settings.notifyTimeoutMs = parsePositiveIntOption('notifyTimeoutMs', value)
    },
  },
  {
    key: 'notifyMaxAttempts',
    type: 'string',
    usage: '--notifyMaxAttempts <number>',
    description: 'Max number of notify attempts',
    apply: (value, state) => {
      state.settings.notifyMaxAttempts = parsePositiveIntOption('notifyMaxAttempts', value)
    },
  },
  {
    key: 'notifyIntervalMs',
    type: 'string',
    usage: '--notifyIntervalMs <number>',
    description: 'Base notify retry interval in milliseconds',
    apply: (value, state) => {
      state.settings.notifyIntervalMs = parsePositiveIntOption('notifyIntervalMs', value)
    },
  },
  {
    key: 'notifyMaxIntervalMs',
    type: 'string',
    usage: '--notifyMaxIntervalMs <number>',
    description: 'Max notify retry interval in milliseconds',
    apply: (value, state) => {
      state.settings.notifyMaxIntervalMs = parsePositiveIntOption('notifyMaxIntervalMs', value)
    },
  },
  {
    key: 'notifyBackoffFactor',
    type: 'string',
    usage: '--notifyBackoffFactor <number>',
    description: 'Notify retry backoff factor (>= 1)',
    apply: (value, state) => {
      state.settings.notifyBackoffFactor = parsePositiveFloatOption('notifyBackoffFactor', value, 1)
    },
  },
  {
    key: 'ui',
    type: 'boolean',
    usage: '--ui',
    description: 'Enable reactive terminal dashboard (TUI)',
    apply: (value, state) => {
      state.ui = value
    },
  },
  {
    key: 'log-level',
    aliases: ['logLevel'],
    short: 'l',
    type: 'string',
    usage: '-l, --log-level <level>',
    description: 'Log level (0-8 or emerg/alert/crit/err/warn/notice/info/debug/trace)',
    apply: (value, state) => {
      state.logLevelRaw = value
    },
  },
  {
    key: 'help',
    short: 'h',
    type: 'boolean',
    usage: '-h, --help',
    description: 'Show this help',
    apply: (value, state) => {
      state.help = value
    },
  },
]

function getOptionNames(definition: CliOptionDefinition): string[] {
  return [definition.key, ...(definition.aliases ?? [])]
}

function buildParseOptions(
  definitions: CliOptionDefinition[],
): Record<string, { short?: string; type: 'boolean' | 'string' }> {
  const options: Record<string, { short?: string; type: 'boolean' | 'string' }> = {}

  for (const definition of definitions) {
    for (const name of getOptionNames(definition)) {
      options[name] = {
        type: definition.type,
        ...(name === definition.key && definition.short ? { short: definition.short } : {}),
      }
    }
  }

  return options
}

function readStringOption(
  values: Record<string, string | boolean | undefined>,
  definition: CliOptionDefinitionString,
): string | undefined {
  for (const name of getOptionNames(definition)) {
    const value = values[name]
    if (typeof value === 'string') {
      return value
    }
  }

  return undefined
}

function readBooleanOption(
  values: Record<string, string | boolean | undefined>,
  definition: CliOptionDefinitionBoolean,
): boolean {
  for (const name of getOptionNames(definition)) {
    if (values[name] === true) {
      return true
    }
  }

  return false
}

function parseCliState(values: Record<string, string | boolean | undefined>): CliState {
  const state: CliState = {
    help: false,
    logLevelRaw: undefined,
    notifyUrlRaw: undefined,
    settings: {},
    ui: false,
  }

  for (const definition of CLI_OPTIONS) {
    if (definition.type === 'string') {
      const value = readStringOption(values, definition)
      if (value !== undefined) {
        definition.apply(value, state)
      }
      continue
    }

    const value = readBooleanOption(values, definition)
    if (value) {
      definition.apply(value, state)
    }
  }

  return state
}

function normalizeCliValues(
  values: Record<string, unknown>,
): Record<string, string | boolean | undefined> {
  const normalized: Record<string, string | boolean | undefined> = {}

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'boolean' || value === undefined) {
      normalized[key] = value
    }
  }

  return normalized
}

function printHelp(): void {
  const usageWidth = Math.max(...CLI_OPTIONS.map((option) => option.usage.length))
  const optionLines = CLI_OPTIONS.map(
    (option) => `  ${option.usage.padEnd(usageWidth + 2)}${option.description}`,
  )

  console.log(`Usage: notify-url-relay [options]

Options:
${optionLines.join('\n')}

Environment fallback:
  TRANSLOADIT_SECRET, TRANSLOADIT_NOTIFY_URL, TRANSLOADIT_LOG_LEVEL
`)
}

const { values } = parseArgs({
  options: buildParseOptions(CLI_OPTIONS),
})

const cliState = parseCliState(normalizeCliValues(values))

if (cliState.help) {
  printHelp()
  process.exit(0)
}

const secret = process.env.TRANSLOADIT_SECRET
if (!secret) {
  fail('Missing secret. Set TRANSLOADIT_SECRET.')
}

const settings = cliState.settings

const rawLogLevel = cliState.logLevelRaw ?? process.env.TRANSLOADIT_LOG_LEVEL
const logLevel = rawLogLevel ? parseLogLevelOption(rawLogLevel) : undefined

const tui = cliState.ui ? createTuiMode(logLevel) : null
const runtimeOptions: ProxyRuntimeOptions = tui
  ? tui.runtimeOptions
  : {
      ...(typeof logLevel === 'number' ? { logLevel } : {}),
    }

const notifyUrlRaw = cliState.notifyUrlRaw ?? process.env.TRANSLOADIT_NOTIFY_URL
const notifyUrl = notifyUrlRaw ? parseNotifyUrlOption(notifyUrlRaw) : undefined

const proxy = new TransloaditNotifyUrlProxy(secret, notifyUrl, runtimeOptions)
proxy.run(settings)

if (tui) {
  tui.start()
}

const close = () => {
  tui?.stop()
  proxy.close()
  process.exit(0)
}

process.on('SIGINT', close)
process.on('SIGTERM', close)
