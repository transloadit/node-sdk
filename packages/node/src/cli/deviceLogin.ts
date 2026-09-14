import type { CliKeySecretCredentials } from './helpers.ts'
import type { IOutputCtl } from './OutputCtl.ts'

import { hostname } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'

import { execa } from 'execa'
import got from 'got'
import { z } from 'zod'

import { cliSignatureAlgorithmSchema } from './helpers.ts'

const deviceSchema = z.object({
  ok: z.literal('CLI_DEVICE_AUTHORIZATION_CREATED'),
  device_code: z.string().min(1).max(4096),
  user_code: z
    .string()
    .regex(/^[BCDFGHJKLMNPQRSTVWXZ23456789]{4}-[BCDFGHJKLMNPQRSTVWXZ23456789]{4}$/),
  verification_url: z.string().url(),
  // The agreed device contract is bounded to 15 minutes; reject incompatible server responses.
  expires_in: z.number().int().positive().max(900),
  interval: z.number().int().positive().max(900),
})
const authorizedSchema = z.object({
  ok: z.literal('CLI_DEVICE_AUTHORIZED'),
  signature_algo: cliSignatureAlgorithmSchema.nullable(),
  workspace: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),
  auth_key: z
    .string()
    .min(1)
    .max(4096)
    .regex(/^[^\r\n\0]+$/),
  auth_secret: z
    .string()
    .min(1)
    .max(4096)
    .regex(/^[^\r\n\0]+$/),
  auth_key_id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,128}$/)
    .optional(),
  description: z
    .string()
    .max(512)
    .regex(/^[^\r\n\0]*$/)
    .optional(),
})
const pendingSchema = z.object({
  ok: z.literal('CLI_DEVICE_AUTHORIZATION_PENDING'),
  expires_in: z.number().int().nonnegative(),
})
const errorSchema = z.object({ error: z.string() })
const expiredMessage =
  'Device authorization expired or was already used. Run transloadit auth login again.'

/** Browser-approved credentials; the one-time device code never leaves this module. */
export interface DeviceLoginCredentials extends CliKeySecretCredentials {
  workspace: string
  authKeyId?: string
  description?: string
}

/** Obtain a combined Auth Key using the API's single-use device authorization contract. */
export async function deviceLogin(
  endpoint: string,
  output: IOutputCtl,
  noBrowser: boolean,
): Promise<DeviceLoginCredentials> {
  const cancellation = new AbortController()
  const cancel = (): void => cancellation.abort()
  process.once('SIGINT', cancel)
  let expired: AbortSignal | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined
  try {
    const response = await got
      .post(`${endpoint}/cli/device_authorizations`, {
        form: { client: 'transloadit-cli', hostname: hostname() },
        responseType: 'json',
        retry: { limit: 0 },
        followRedirect: false,
        timeout: { request: 10_000 },
        signal: cancellation.signal,
      })
      .catch((cause: unknown) => {
        throw new Error(
          'Could not start browser login. Check the API endpoint and retry; use auth login --stdin for an existing Auth Key.',
          { cause },
        )
      })
    const parsed = deviceSchema.safeParse(response.body)
    if (!parsed.success)
      throw new Error('The API returned an invalid device authorization; nothing was saved')
    const device = parsed.data
    const target = new URL(device.verification_url)
    if (
      target.username ||
      target.password ||
      target.hash ||
      (target.protocol !== 'https:' &&
        !(
          target.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
        ))
    )
      throw new Error('The API returned an unsafe verification URL; nothing was opened or saved')
    expired = AbortSignal.timeout(device.expires_in * 1000)
    const signal = AbortSignal.any([cancellation.signal, expired])
    const deadline = performance.now() + device.expires_in * 1000
    heartbeat = setInterval(() => {
      const minutes = Math.ceil((deadline - performance.now()) / 60_000)
      if (signal.aborted || minutes <= 0) return
      output.notice(
        `Still waiting for approval, ${minutes} minute${minutes === 1 ? '' : 's'} left. Use the verification URL printed above.`,
      )
    }, 60_000)
    heartbeat.unref()
    output.print(`Enter code ${device.user_code} at ${target.href}`, {
      user_code: device.user_code,
      verification_url: target.href,
    })
    const opener =
      process.platform === 'darwin' ? 'open' : process.platform === 'linux' ? 'xdg-open' : undefined
    // On platforms without an opener, the printed URL is the manual approval path.
    if (!noBrowser && opener !== undefined) {
      // xdg-open may live as long as the browser; launching it must not delay or cancel polling.
      const browser = execa(opener, [target.href], {
        stdio: 'ignore',
        detached: true,
        cleanup: false,
      })
      browser.unref()
      void browser.catch(() => {
        // A wrapper's later failure cannot prove whether its page opened or invalidate login.
        output.warn(
          'The browser opener reported an error. If the page did not open, use the verification URL printed above.',
        )
      })
    }
    if (!noBrowser && process.platform === 'win32')
      output.print('On Windows, open the verification URL printed above.', { browserOpened: false })
    let intervalMs = device.interval * 1000
    while (true) {
      await delay(intervalMs, undefined, { signal })
      const token = await got
        .post(`${endpoint}/cli/device_authorizations/token`, {
          form: { device_code: device.device_code },
          responseType: 'json',
          retry: { limit: 0 },
          followRedirect: false,
          throwHttpErrors: false,
          timeout: { request: 10_000 },
          signal,
        })
        .catch((cause: unknown) => {
          throw new Error(
            'Could not finish browser login. Check connectivity and run transloadit auth login again.',
            { cause },
          )
        })
      const error = errorSchema.safeParse(token.body)
      if (token.statusCode === 429 || (error.success && error.data.error === 'slow_down')) {
        const seconds = Number(token.headers['retry-after'])
        // Longer waits are pointless after the authorization deadline and can overflow Node's
        // timer range into 1 ms, accidentally hammering an already rate-limited API.
        intervalMs = Math.min(
          device.expires_in * 1000,
          Math.max(intervalMs + 5000, Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0),
        )
        continue
      }
      if (error.success && error.data.error === 'CLI_DEVICE_AUTHORIZATION_NOT_FOUND')
        throw new Error(expiredMessage)
      if (token.statusCode < 200 || token.statusCode >= 300)
        throw new Error(
          'Browser login was refused. Run transloadit auth login again; nothing was saved.',
        )
      const pending = pendingSchema.safeParse(token.body)
      if (pending.success) {
        if (pending.data.expires_in === 0) throw new Error(expiredMessage)
        continue
      }
      const authorized = authorizedSchema.safeParse(token.body)
      if (!authorized.success)
        throw new Error('The API returned an invalid login result; nothing was saved')
      signal.throwIfAborted()
      return {
        authKey: authorized.data.auth_key,
        authSecret: authorized.data.auth_secret,
        signatureAlgorithm: authorized.data.signature_algo ?? undefined,
        workspace: authorized.data.workspace,
        authKeyId: authorized.data.auth_key_id,
        description: authorized.data.description,
      }
    }
  } catch (cause) {
    if (cancellation.signal.aborted)
      throw new Error('Login canceled; nothing was saved.', { cause })
    if (expired?.aborted) throw new Error(expiredMessage, { cause })
    throw cause
  } finally {
    clearInterval(heartbeat)
    process.off('SIGINT', cancel)
  }
}
