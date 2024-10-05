export class TransloaditError extends Error {
  override name = 'TransloaditError'
  response: { body: unknown }
  assemblyId?: string
  transloaditErrorCode?: string

  constructor(message: string, body: unknown) {
    super(message)
    this.response = { body }
  }
}
