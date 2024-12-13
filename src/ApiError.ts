import { HTTPError } from 'got'

export interface TransloaditErrorResponseBody {
  error?: string
  message?: string
  http_code?: string
  assembly_ssl_url?: string
  assembly_id?: string
}

export class ApiError extends Error {
  override name = 'ApiError'

  response: TransloaditErrorResponseBody

  override cause?: HTTPError | undefined

  constructor(params: {
    cause?: HTTPError
    appendStack?: string
    body: TransloaditErrorResponseBody | undefined
  }) {
    const { cause, body, appendStack } = params

    const parts = ['API error']
    if (cause?.response.statusCode) parts.push(`(HTTP ${cause.response.statusCode})`)
    if (body?.error) parts.push(`${body.error}:`)
    if (body?.message) parts.push(body.message)
    if (body?.assembly_ssl_url) parts.push(body.assembly_ssl_url)

    const message = parts.join(' ')

    super(message)

    // if we have a cause, use the stack trace from it instead
    if (cause != null && typeof cause.stack === 'string') {
      const indexOfMessageEnd = cause.stack.indexOf(cause.message) + cause.message.length
      const gotStacktrace = cause.stack.slice(indexOfMessageEnd)
      this.stack = `${message}${gotStacktrace}`
    }

    // If we have an original stack, append it to the bottom, because `got`s stack traces are not very good
    if (this.stack != null && appendStack != null) {
      this.stack += `\n${appendStack.replace(/^([^\n]+\n)/, '')}`
    }

    this.response = body ?? {}
    this.cause = cause
  }
}
