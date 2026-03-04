#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { SevLogger } from '@transloadit/sev-logger'
import { config as loadDotEnv } from 'dotenv'
import TransloaditNotifyUrlProxy, {
  type CounterMetricEvent,
  type GaugeMetricEvent,
  type ProxyLogEvent,
  type ProxyRuntimeOptions,
  type ProxySettings,
  type TimingMetricEvent,
} from './index.ts'

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

  const parsedNamed = LOG_LEVEL_BY_NAME[normalized as keyof typeof LOG_LEVEL_BY_NAME]
  if (typeof parsedNamed === 'number') {
    return parsedNamed
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
  if (parsed.protocol === 'http:' && !LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
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
    lines.push('\x1b[38;5;117mNotify URL Proxy // Reactive TUI\x1b[0m')
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

const { values } = parseArgs({
  options: {
    notifyUrl: { type: 'string' },
    target: { type: 'string' },
    port: { type: 'string' },
    forwardTimeoutMs: { type: 'string' },
    pollIntervalMs: { type: 'string' },
    pollMaxIntervalMs: { type: 'string' },
    pollBackoffFactor: { type: 'string' },
    pollRequestTimeoutMs: { type: 'string' },
    maxPollAttempts: { type: 'string' },
    maxInFlightPolls: { type: 'string' },
    notifyOnTerminalError: { type: 'boolean' },
    'notify-on-terminal-error': { type: 'boolean' },
    notifyTimeoutMs: { type: 'string' },
    notifyMaxAttempts: { type: 'string' },
    notifyIntervalMs: { type: 'string' },
    notifyMaxIntervalMs: { type: 'string' },
    notifyBackoffFactor: { type: 'string' },
    ui: { type: 'boolean' },
    logLevel: { type: 'string', short: 'l' },
    'log-level': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(`Usage: notify-url-proxy [options]

Options:
  --notifyUrl <url>              URL to send notifications to (http://localhost allowed, otherwise https)
  --target <url>                 Transloadit endpoint base URL
  --port <number>                Local listen port
  --forwardTimeoutMs <number>    Forward request timeout in milliseconds
  --pollIntervalMs <number>      Base poll retry interval in milliseconds
  --pollMaxIntervalMs <number>   Max poll retry interval in milliseconds
  --pollBackoffFactor <number>   Poll retry backoff factor (>= 1)
  --pollRequestTimeoutMs <num>   Per poll request timeout in milliseconds
  --maxPollAttempts <number>     Max number of poll attempts
  --maxInFlightPolls <number>    Max number of active assembly pollers
  --notifyOnTerminalError        Send notify payload when terminal error is reached
  --notifyTimeoutMs <number>     Per notify request timeout in milliseconds
  --notifyMaxAttempts <number>   Max number of notify attempts
  --notifyIntervalMs <number>    Base notify retry interval in milliseconds
  --notifyMaxIntervalMs <number> Max notify retry interval in milliseconds
  --notifyBackoffFactor <number> Notify retry backoff factor (>= 1)
  --ui                           Enable reactive terminal dashboard (TUI)
  -l, --log-level <level>        Log level (0-8 or emerg/alert/crit/err/warn/notice/info/debug/trace)
  -h, --help                     Show this help

Environment fallback:
  TRANSLOADIT_SECRET, TRANSLOADIT_NOTIFY_URL, TRANSLOADIT_LOG_LEVEL
`)
  process.exit(0)
}

const secret = process.env.TRANSLOADIT_SECRET
if (!secret) {
  fail('Missing secret. Set TRANSLOADIT_SECRET.')
}

const settings: Partial<ProxySettings> = {}

if (values.target) {
  settings.target = parseHttpUrlOption('target', values.target).toString()
}
if (values.port) {
  settings.port = parsePositiveIntOption('port', values.port, 65_535)
}
if (values.forwardTimeoutMs) {
  settings.forwardTimeoutMs = parsePositiveIntOption('forwardTimeoutMs', values.forwardTimeoutMs)
}
if (values.pollIntervalMs) {
  settings.pollIntervalMs = parsePositiveIntOption('pollIntervalMs', values.pollIntervalMs)
}
if (values.pollMaxIntervalMs) {
  settings.pollMaxIntervalMs = parsePositiveIntOption('pollMaxIntervalMs', values.pollMaxIntervalMs)
}
if (values.pollBackoffFactor) {
  settings.pollBackoffFactor = parsePositiveFloatOption(
    'pollBackoffFactor',
    values.pollBackoffFactor,
    1,
  )
}
if (values.pollRequestTimeoutMs) {
  settings.pollRequestTimeoutMs = parsePositiveIntOption(
    'pollRequestTimeoutMs',
    values.pollRequestTimeoutMs,
  )
}
if (values.maxPollAttempts) {
  settings.maxPollAttempts = parsePositiveIntOption('maxPollAttempts', values.maxPollAttempts)
}
if (values.maxInFlightPolls) {
  settings.maxInFlightPolls = parsePositiveIntOption('maxInFlightPolls', values.maxInFlightPolls)
}

const notifyOnTerminalError =
  values.notifyOnTerminalError === true || values['notify-on-terminal-error'] === true
if (notifyOnTerminalError) {
  settings.notifyOnTerminalError = true
}

if (values.notifyTimeoutMs) {
  settings.notifyTimeoutMs = parsePositiveIntOption('notifyTimeoutMs', values.notifyTimeoutMs)
}
if (values.notifyMaxAttempts) {
  settings.notifyMaxAttempts = parsePositiveIntOption('notifyMaxAttempts', values.notifyMaxAttempts)
}
if (values.notifyIntervalMs) {
  settings.notifyIntervalMs = parsePositiveIntOption('notifyIntervalMs', values.notifyIntervalMs)
}
if (values.notifyMaxIntervalMs) {
  settings.notifyMaxIntervalMs = parsePositiveIntOption(
    'notifyMaxIntervalMs',
    values.notifyMaxIntervalMs,
  )
}
if (values.notifyBackoffFactor) {
  settings.notifyBackoffFactor = parsePositiveFloatOption(
    'notifyBackoffFactor',
    values.notifyBackoffFactor,
    1,
  )
}

const rawLogLevel = values['log-level'] ?? values.logLevel ?? process.env.TRANSLOADIT_LOG_LEVEL
const logLevel = rawLogLevel ? parseLogLevelOption(rawLogLevel) : undefined

const tui = values.ui === true ? createTuiMode(logLevel) : null
const runtimeOptions: ProxyRuntimeOptions = tui
  ? tui.runtimeOptions
  : {
      ...(typeof logLevel === 'number' ? { logLevel } : {}),
    }

const notifyUrlRaw = values.notifyUrl ?? process.env.TRANSLOADIT_NOTIFY_URL
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
