export type TransloaditResponseBody =
  | {
      error?: string
      message?: string
      http_code?: string
      assembly_ssl_url?: string
      assembly_id?: string
    }
  | undefined

export class TransloaditError extends Error {
  override name = 'TransloaditError'

  /**
   * @deprecated use `cause` instead.
   */
  response: { body: TransloaditResponseBody }

  /**
   * @deprecated use `cause.assembly_id` instead.
   */
  assemblyId?: string

  /**
   * @deprecated use `cause?.error` instead.
   */
  transloaditErrorCode?: string

  override cause?: TransloaditResponseBody

  constructor(message: string, body: TransloaditResponseBody) {
    super(message)
    this.response = { body }
  }
}
