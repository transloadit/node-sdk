import { once } from 'node:events'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

import { SevLogger } from '@transloadit/sev-logger'
import { signParamsSync } from '@transloadit/utils/node'
import type { AssemblyStatus, assemblyStatusOkCodeSchema } from '@transloadit/zod/v4'
import {
  assemblyStatusSchema,
  getAssemblyStage,
  getError,
  getOk,
  isAssemblyBusy,
  isAssemblyOkStatus,
  isAssemblyTerminalError,
  isAssemblyTerminalOk,
  parseAssemblyUrls,
} from '@transloadit/zod/v4'
import type { RetryContext } from 'p-retry'
import pRetry, { AbortError } from 'p-retry'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const DECODED_BODY_HEADERS = new Set(['content-encoding', 'content-length'])

const MAX_CAPTURED_RESPONSE_BYTES = 512 * 1024

export type ProxyErrorCode =
  | 'FORWARD_TIMEOUT'
  | 'FORWARD_UPSTREAM_ERROR'
  | 'POLL_TIMEOUT'
  | 'NOTIFY_TIMEOUT'

export interface ProxySettings {
  target: string
  port: number
  forwardTimeoutMs: number
  pollIntervalMs: number
  pollMaxIntervalMs: number
  pollBackoffFactor: number
  pollRequestTimeoutMs: number
  maxPollAttempts: number
  maxInFlightPolls: number
  notifyOnTerminalError: boolean
  notifyTimeoutMs: number
  notifyMaxAttempts: number
  notifyIntervalMs: number
  notifyMaxIntervalMs: number
  notifyBackoffFactor: number
}

export interface CounterMetricEvent {
  kind: 'counter'
  name: string
  at: string
  delta: number
  total: number
  tags?: Record<string, string>
}

export interface GaugeMetricEvent {
  kind: 'gauge'
  name: string
  at: string
  value: number
}

export interface TimingMetricEvent {
  kind: 'timing'
  name: string
  at: string
  durationMs: number
  count: number
  minMs: number
  maxMs: number
  avgMs: number
  tags?: Record<string, string>
}

export interface ProxyMetricsHooks {
  onCounter?: (event: CounterMetricEvent) => void
  onGauge?: (event: GaugeMetricEvent) => void
  onTiming?: (event: TimingMetricEvent) => void
}

export interface ProxyLogEvent {
  at: string
  level: 'debug' | 'info' | 'notice' | 'warn' | 'err'
  message: string
}

export interface ProxyRuntimeOptions {
  logger?: SevLogger
  logLevel?: number
  metricsHooks?: ProxyMetricsHooks
  onLog?: (event: ProxyLogEvent) => void
}

type KnownAssemblyState = (typeof assemblyStatusOkCodeSchema.options)[number]

export type AssemblyResponse = AssemblyStatus

interface TimingAggregate {
  count: number
  totalMs: number
  minMs: number
  maxMs: number
  lastMs: number
}

const DEFAULT_SETTINGS: ProxySettings = {
  target: 'https://api2.transloadit.com',
  port: 8888,
  forwardTimeoutMs: 15_000,
  pollIntervalMs: 2_000,
  pollMaxIntervalMs: 30_000,
  pollBackoffFactor: 2,
  pollRequestTimeoutMs: 15_000,
  maxPollAttempts: 10,
  maxInFlightPolls: 4,
  notifyOnTerminalError: false,
  notifyTimeoutMs: 15_000,
  notifyMaxAttempts: 3,
  notifyIntervalMs: 500,
  notifyMaxIntervalMs: 5_000,
  notifyBackoffFactor: 2,
}

const DEFAULT_LOG_LEVEL = SevLogger.LEVEL.INFO

class ProxyTimeoutError extends Error {
  readonly code: ProxyErrorCode

  constructor(code: ProxyErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function supportsBody(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase()
  return normalized !== 'GET' && normalized !== 'HEAD'
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  return error instanceof Error && error.name === 'AbortError'
}

function getErrorCode(error: unknown, fallback: ProxyErrorCode): ProxyErrorCode {
  if (error instanceof ProxyTimeoutError) {
    return error.code
  }

  return fallback
}

function getHeaderValues(name: string, headers: Headers): string[] {
  const normalized = name.toLowerCase()
  if (normalized !== 'set-cookie') {
    return []
  }

  const maybeGetSetCookie = Reflect.get(headers, 'getSetCookie')
  if (typeof maybeGetSetCookie === 'function') {
    const values = maybeGetSetCookie.call(headers)
    if (Array.isArray(values)) {
      return values.filter((value): value is string => typeof value === 'string')
    }
  }

  const fallback = headers.get('set-cookie')
  return fallback ? [fallback] : []
}

function isJsonResponse(contentType: string | null): boolean {
  if (!contentType) {
    return false
  }

  return /application\/json|\+json/i.test(contentType)
}

function createTimeoutSignal(
  parentSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; timeoutSignal: AbortSignal } {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signal = parentSignal ? AbortSignal.any([parentSignal, timeoutSignal]) : timeoutSignal
  return { signal, timeoutSignal }
}

function getListeningPort(server: Server): number {
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Could not resolve server address')
  }

  return address.port
}

export function extractAssemblyUrl(body: string): string | null {
  try {
    const payload: unknown = JSON.parse(body)
    return parseAssemblyUrls(payload).assemblyUrl
  } catch {
    return null
  }
}

export function getAssemblyState(payload: unknown): KnownAssemblyState {
  if (!isRecord(payload)) {
    throw new Error('No ok field found in Assembly response.')
  }

  const ok = typeof payload.ok === 'string' ? payload.ok : undefined
  if (!isAssemblyOkStatus(ok)) {
    throw new Error(`Unknown Assembly state found: ${String(payload.ok)}`)
  }

  return ok
}

export function getSignature(secret: string, toSign: string): string {
  return signParamsSync(toSign, secret, 'sha384')
}

export function parseAssemblyResponse(payload: unknown): AssemblyResponse {
  const parsed = assemblyStatusSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('Invalid assembly response payload.')
  }

  return parsed.data
}

export class TransloaditNotifyUrlProxy {
  private server: Server | null = null
  private isClosing = false

  private readonly secret: string
  private readonly notifyUrl: string
  private readonly logger: SevLogger
  private readonly metricsHooks: ProxyMetricsHooks | undefined
  private readonly onLog: ((event: ProxyLogEvent) => void) | undefined
  private readonly defaults: ProxySettings
  private settings: ProxySettings

  private readonly pendingAssemblyUrls = new Set<string>()
  private readonly activePolls = new Map<string, Promise<void>>()
  private readonly pollControllers = new Map<string, AbortController>()
  private activePollCount = 0

  private readonly counters = new Map<string, number>()
  private readonly gauges = new Map<string, number>()
  private readonly timings = new Map<string, TimingAggregate>()

  constructor(
    secret: string,
    notifyUrl = 'http://127.0.0.1:3000/transloadit',
    runtimeOptions: ProxyRuntimeOptions = {},
  ) {
    this.secret = secret || ''
    this.notifyUrl = notifyUrl
    this.metricsHooks = runtimeOptions.metricsHooks
    this.onLog = runtimeOptions.onLog

    this.defaults = { ...DEFAULT_SETTINGS }
    this.settings = { ...DEFAULT_SETTINGS }
    this.logger =
      runtimeOptions.logger ??
      new SevLogger({
        breadcrumbs: ['notify-url-relay'],
        level: runtimeOptions.logLevel ?? DEFAULT_LOG_LEVEL,
      })

    if (runtimeOptions.logger && typeof runtimeOptions.logLevel === 'number') {
      this.logger.update({ level: runtimeOptions.logLevel })
    }
  }

  run(opts: Partial<ProxySettings> = {}): void {
    if (this.server !== null) {
      this.close()
    }

    this.isClosing = false
    this.settings = { ...this.defaults, ...opts }

    this.setGauge('poll.in_flight', 0)
    this.setGauge('poll.pending', 0)

    this.server = createServer((request, response) => {
      void this.handleForward(request, response)
    })

    const listeningServer = this.server
    listeningServer.listen(this.settings.port, () => {
      this.log(
        'notice',
        `Listening on http://localhost:${getListeningPort(listeningServer)}, forwarding to ${this.settings.target}, notifying ${this.notifyUrl}`,
      )
    })
  }

  async waitForListenPort(): Promise<number> {
    if (this.server === null) {
      throw new Error('Proxy server is not running.')
    }

    if (!this.server.listening) {
      await once(this.server, 'listening')
    }

    return getListeningPort(this.server)
  }

  close(): void {
    this.isClosing = true

    this.server?.close()
    this.server = null

    for (const [assemblyUrl, controller] of this.pollControllers) {
      controller.abort(new Error(`Proxy closed while polling ${assemblyUrl}`))
    }

    this.pollControllers.clear()
    this.pendingAssemblyUrls.clear()
    this.activePolls.clear()
    this.activePollCount = 0

    this.setGauge('poll.in_flight', 0)
    this.setGauge('poll.pending', 0)
  }

  private log(level: ProxyLogEvent['level'], message: string): void {
    if (level === 'debug') {
      this.logger.debug(message)
    } else if (level === 'info') {
      this.logger.info(message)
    } else if (level === 'notice') {
      this.logger.notice(message)
    } else if (level === 'warn') {
      this.logger.warn(message)
    } else {
      this.logger.err(message)
    }

    this.onLog?.({
      at: new Date().toISOString(),
      level,
      message,
    })
  }

  private incrementCounter(name: string, delta = 1, tags?: Record<string, string>): void {
    const total = (this.counters.get(name) ?? 0) + delta
    this.counters.set(name, total)

    this.metricsHooks?.onCounter?.({
      kind: 'counter',
      name,
      at: new Date().toISOString(),
      delta,
      total,
      ...(tags ? { tags } : {}),
    })
  }

  private setGauge(name: string, value: number): void {
    this.gauges.set(name, value)

    this.metricsHooks?.onGauge?.({
      kind: 'gauge',
      name,
      at: new Date().toISOString(),
      value,
    })
  }

  private observeTiming(name: string, durationMs: number, tags?: Record<string, string>): void {
    let stats = this.timings.get(name)
    if (!stats) {
      stats = {
        count: 1,
        totalMs: durationMs,
        minMs: durationMs,
        maxMs: durationMs,
        lastMs: durationMs,
      }
      this.timings.set(name, stats)
    } else {
      stats.count += 1
      stats.totalMs += durationMs
      stats.minMs = Math.min(stats.minMs, durationMs)
      stats.maxMs = Math.max(stats.maxMs, durationMs)
      stats.lastMs = durationMs
    }

    this.metricsHooks?.onTiming?.({
      kind: 'timing',
      name,
      at: new Date().toISOString(),
      durationMs,
      count: stats.count,
      minMs: stats.minMs,
      maxMs: stats.maxMs,
      avgMs: stats.totalMs / stats.count,
      ...(tags ? { tags } : {}),
    })
  }

  private async handleForward(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const requestStartedAt = Date.now()
    this.incrementCounter('forward.requests_total')

    const proxyController = new AbortController()
    request.on('aborted', () => {
      proxyController.abort(new Error('Client aborted request'))
    })

    try {
      const targetUrl = this.resolveTargetUrl(request.url)
      const requestBody = supportsBody(request.method)
        ? (Readable.toWeb(request) as unknown as ReadableStream)
        : undefined

      const fetchInit: RequestInit & { duplex?: 'half' } = {
        method: request.method ?? 'GET',
        headers: this.createForwardHeaders(request),
        redirect: 'manual',
        signal: proxyController.signal,
      }

      if (requestBody) {
        fetchInit.body = requestBody
        fetchInit.duplex = 'half'
      }

      const upstreamResponse = await this.fetchWithTimeout(
        targetUrl,
        fetchInit,
        this.settings.forwardTimeoutMs,
        'FORWARD_TIMEOUT',
      )

      await this.pipeForwardResponse(response, upstreamResponse)

      this.incrementCounter('forward.requests_ok')
      this.observeTiming('forward.request_duration_ms', Date.now() - requestStartedAt)
    } catch (error) {
      if (isAbortLikeError(error)) {
        return
      }

      const code = getErrorCode(error, 'FORWARD_UPSTREAM_ERROR')
      const statusCode = code === 'FORWARD_TIMEOUT' ? 504 : 502

      this.incrementCounter('forward.requests_error', 1, { code })
      this.observeTiming('forward.request_duration_ms', Date.now() - requestStartedAt, { code })
      this.writeErrorResponse(response, statusCode, code, toErrorMessage(error))
      this.log('err', `Forward request failed with ${code}: ${toErrorMessage(error)}`)
    }
  }

  private resolveTargetUrl(requestUrl: string | undefined): string {
    const path = requestUrl ?? '/'
    if (/^https?:\/\//i.test(path)) {
      throw new Error(`Absolute request URL is not supported: ${path}`)
    }
    if (path.startsWith('//')) {
      throw new Error(`Protocol-relative request URL is not supported: ${path}`)
    }
    if (/^(?:\[[^\]]+\]|[a-z0-9.-]+):\d+$/i.test(path)) {
      throw new Error(`Authority-form request URL is not supported: ${path}`)
    }

    return new URL(path, this.settings.target).toString()
  }

  private createForwardHeaders(request: IncomingMessage): Headers {
    const headers = new Headers()

    for (const [name, value] of Object.entries(request.headers)) {
      const headerName = name.toLowerCase()
      if (
        HOP_BY_HOP_HEADERS.has(headerName) ||
        headerName === 'host' ||
        headerName === 'accept-encoding'
      ) {
        continue
      }
      if (value === undefined) {
        continue
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(name, item)
        }
      } else {
        headers.set(name, value)
      }
    }

    if (request.socket.remoteAddress) {
      headers.set('x-forwarded-for', request.socket.remoteAddress)
    }
    if (typeof request.headers.host === 'string') {
      headers.set('x-forwarded-host', request.headers.host)
    }
    headers.set('accept-encoding', 'identity')

    return headers
  }

  private async pipeForwardResponse(
    response: ServerResponse,
    upstreamResponse: Response,
  ): Promise<void> {
    response.statusCode = upstreamResponse.status
    response.statusMessage = upstreamResponse.statusText

    for (const [name, value] of upstreamResponse.headers) {
      const headerName = name.toLowerCase()
      if (
        HOP_BY_HOP_HEADERS.has(headerName) ||
        headerName === 'set-cookie' ||
        DECODED_BODY_HEADERS.has(headerName)
      ) {
        continue
      }
      response.setHeader(name, value)
    }

    const setCookies = getHeaderValues('set-cookie', upstreamResponse.headers)
    if (setCookies.length > 0) {
      response.setHeader('set-cookie', setCookies)
    }

    if (!upstreamResponse.body) {
      response.end()
      return
    }

    const shouldCapture = isJsonResponse(upstreamResponse.headers.get('content-type'))

    const upstreamBodyNode = Readable.fromWeb(
      upstreamResponse.body as unknown as NodeReadableStream,
    )
    const capturedChunks: Buffer[] = []
    let capturedBytes = 0

    if (shouldCapture) {
      upstreamBodyNode.on('data', (chunk: Buffer | string | Uint8Array) => {
        if (capturedBytes >= MAX_CAPTURED_RESPONSE_BYTES) {
          return
        }

        const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        const remaining = MAX_CAPTURED_RESPONSE_BYTES - capturedBytes
        const toCapture =
          chunkBuffer.length <= remaining ? chunkBuffer : chunkBuffer.subarray(0, remaining)

        capturedChunks.push(Buffer.from(toCapture))
        capturedBytes += toCapture.length
      })
    }

    await pipeline(upstreamBodyNode, response)

    if (shouldCapture && capturedBytes > 0) {
      const body = Buffer.concat(capturedChunks, capturedBytes)
      this.maybePollAssemblyFromBody(body)
    }
  }

  private writeErrorResponse(
    response: ServerResponse,
    statusCode: number,
    code: ProxyErrorCode,
    message: string,
  ): void {
    if (response.headersSent) {
      if (!response.writableEnded) {
        response.end()
      }
      return
    }

    response.writeHead(statusCode, {
      'content-type': 'application/json; charset=utf-8',
      'x-notify-proxy-error-code': code,
    })

    response.end(
      JSON.stringify({
        error: code,
        message,
      }),
    )
  }

  private maybePollAssemblyFromBody(body: Buffer): void {
    const assemblyUrl = extractAssemblyUrl(body.toString('utf-8'))
    if (!assemblyUrl) {
      return
    }

    this.enqueueAssemblyPoll(assemblyUrl)
  }

  private enqueueAssemblyPoll(assemblyUrl: string): void {
    if (this.isClosing) {
      return
    }

    if (this.pendingAssemblyUrls.has(assemblyUrl) || this.activePolls.has(assemblyUrl)) {
      this.incrementCounter('poll.dedupe_skipped_total')
      this.log('debug', `Skipping duplicate poll registration for ${assemblyUrl}`)
      return
    }

    this.pendingAssemblyUrls.add(assemblyUrl)
    this.setGauge('poll.pending', this.pendingAssemblyUrls.size)
    this.incrementCounter('poll.enqueued_total')
    this.log('info', `Queued poll for ${assemblyUrl}`)

    this.drainPollQueue()
  }

  private drainPollQueue(): void {
    if (this.isClosing) {
      return
    }

    while (this.activePollCount < this.settings.maxInFlightPolls) {
      const nextEntry = this.pendingAssemblyUrls.values().next()
      if (nextEntry.done) {
        break
      }
      const next = nextEntry.value

      this.pendingAssemblyUrls.delete(next)
      this.setGauge('poll.pending', this.pendingAssemblyUrls.size)

      const controller = new AbortController()
      this.pollControllers.set(next, controller)
      this.activePollCount += 1
      this.setGauge('poll.in_flight', this.activePollCount)

      const pollPromise = this.pollAssembly(next, controller.signal).finally(() => {
        if (this.activePolls.get(next) !== pollPromise) {
          return
        }

        this.activePolls.delete(next)
        this.pollControllers.delete(next)
        this.activePollCount = Math.max(0, this.activePollCount - 1)
        this.setGauge('poll.in_flight', this.activePollCount)

        if (!this.isClosing) {
          this.drainPollQueue()
        }
      })

      this.activePolls.set(next, pollPromise)
    }
  }

  private async pollAssembly(assemblyUrl: string, signal: AbortSignal): Promise<void> {
    const retries = Math.max(this.settings.maxPollAttempts - 1, 0)
    const pollStartedAt = Date.now()

    this.incrementCounter('poll.started_total')

    try {
      const response = await pRetry(() => this.checkAssembly(assemblyUrl, signal), {
        retries,
        minTimeout: this.settings.pollIntervalMs,
        maxTimeout: this.settings.pollMaxIntervalMs,
        factor: this.settings.pollBackoffFactor,
        randomize: true,
        signal,
        onFailedAttempt: (retryContext: RetryContext) => {
          if (retryContext.retriesLeft <= 0) {
            return
          }

          this.incrementCounter('poll.retry_total')
          this.log(
            'warn',
            `Attempt ${retryContext.attemptNumber}/${this.settings.maxPollAttempts} failed for ${assemblyUrl}: ${retryContext.error.message}`,
          )
        },
      })

      await this.notifyWithRetry(response, signal)

      this.incrementCounter('poll.completed_total')
      this.observeTiming('poll.duration_ms', Date.now() - pollStartedAt)
    } catch (error) {
      if (error instanceof AbortError) {
        this.incrementCounter('poll.aborted_total')
        this.log('notice', error.message)
        return
      }

      if (signal.aborted || this.isClosing || isAbortLikeError(error)) {
        this.incrementCounter('poll.cancelled_total')
        this.log('debug', `Polling cancelled for ${assemblyUrl}`)
        return
      }

      const code = getErrorCode(error, 'POLL_TIMEOUT')
      this.incrementCounter('poll.failed_total', 1, { code })
      this.observeTiming('poll.duration_ms', Date.now() - pollStartedAt, { code })
      this.log('err', `No attempts left for ${assemblyUrl}: ${toErrorMessage(error)}`)
    }
  }

  private async checkAssembly(assemblyUrl: string, signal: AbortSignal): Promise<AssemblyResponse> {
    this.incrementCounter('poll.fetch_attempt_total')

    const response = await this.fetchWithTimeout(
      assemblyUrl,
      { signal },
      this.settings.pollRequestTimeoutMs,
      'POLL_TIMEOUT',
    )

    if (!response.ok) {
      throw new Error(`Assembly poll returned HTTP ${response.status}`)
    }

    const assembly = parseAssemblyResponse(await response.json())

    if (isAssemblyTerminalError(assembly)) {
      const errorCode = getError(assembly) ?? 'UNKNOWN_ERROR'
      this.incrementCounter('poll.terminal_error_total', 1, { errorCode })

      if (this.settings.notifyOnTerminalError) {
        this.log(
          'notice',
          `${assemblyUrl} reached terminal error state ${errorCode}; notifying because notifyOnTerminalError=true.`,
        )
        return assembly
      }

      throw new AbortError(`${assemblyUrl} reached terminal error state ${errorCode}.`)
    }

    if (isAssemblyTerminalOk(assembly)) {
      this.incrementCounter('poll.terminal_ok_total', 1, { state: getOk(assembly) ?? 'UNKNOWN' })
      this.log('info', `${assemblyUrl} reached terminal state ${getOk(assembly)}.`)
      return assembly
    }

    if (isAssemblyBusy(assembly)) {
      const stage = getAssemblyStage(assembly)
      if (stage === 'uploading') {
        throw new Error(`${assemblyUrl} is still uploading.`)
      }
      if (stage === 'processing') {
        throw new Error(`${assemblyUrl} is still executing.`)
      }
      throw new Error(`${assemblyUrl} is still replaying.`)
    }

    throw new Error(`${assemblyUrl} returned a non-terminal assembly state.`)
  }

  private async notifyWithRetry(response: AssemblyResponse, signal: AbortSignal): Promise<void> {
    const retries = Math.max(this.settings.notifyMaxAttempts - 1, 0)

    await pRetry(() => this.notifyOnce(response, signal), {
      retries,
      minTimeout: this.settings.notifyIntervalMs,
      maxTimeout: this.settings.notifyMaxIntervalMs,
      factor: this.settings.notifyBackoffFactor,
      randomize: true,
      signal,
      onFailedAttempt: (retryContext: RetryContext) => {
        if (signal.aborted || isAbortLikeError(retryContext.error)) {
          return
        }

        if (retryContext.retriesLeft <= 0) {
          return
        }

        this.incrementCounter('notify.retry_total')
        this.log(
          'warn',
          `Notify retry ${retryContext.attemptNumber}/${this.settings.notifyMaxAttempts} failed: ${retryContext.error.message}`,
        )
      },
      shouldRetry: (retryContext: RetryContext) => {
        if (signal.aborted || isAbortLikeError(retryContext.error)) {
          return false
        }

        return true
      },
    })
  }

  private async notifyOnce(response: AssemblyResponse, signal: AbortSignal): Promise<void> {
    const notifyStartedAt = Date.now()
    this.incrementCounter('notify.attempt_total')

    const transloadit = JSON.stringify(response)
    const signature = getSignature(this.secret, transloadit)

    const notifyResponse = await this.fetchWithTimeout(
      this.notifyUrl,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: new URLSearchParams({
          transloadit,
          signature,
        }),
        signal,
      },
      this.settings.notifyTimeoutMs,
      'NOTIFY_TIMEOUT',
    )

    if (!notifyResponse.ok) {
      this.incrementCounter('notify.failed_total', 1, { code: `HTTP_${notifyResponse.status}` })
      this.observeTiming('notify.duration_ms', Date.now() - notifyStartedAt, {
        code: `HTTP_${notifyResponse.status}`,
      })
      throw new Error(`Notify URL returned HTTP ${notifyResponse.status}`)
    }

    this.incrementCounter('notify.success_total')
    this.observeTiming('notify.duration_ms', Date.now() - notifyStartedAt)
    this.log('notice', `Notify payload sent to ${this.notifyUrl}`)
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    timeoutCode: ProxyErrorCode,
  ): Promise<Response> {
    const timeoutSignal = createTimeoutSignal(init.signal, timeoutMs)

    const fetchInit: RequestInit = {
      ...init,
      signal: timeoutSignal.signal,
    }

    try {
      return await fetch(url, fetchInit)
    } catch (error) {
      if (timeoutSignal.timeoutSignal.aborted) {
        throw new ProxyTimeoutError(timeoutCode, `${timeoutCode} after ${timeoutMs}ms`)
      }

      if (timeoutSignal.signal.reason instanceof ProxyTimeoutError) {
        throw timeoutSignal.signal.reason
      }

      throw error
    }
  }
}
