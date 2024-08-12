class TransloaditError extends Error {
  name = 'TransloaditError'
  response: { body: unknown }
  assemblyId?: string
  transloaditErrorCode?: string

  constructor(message: string, body: unknown) {
    super(message)
    this.response = { body }
  }
}

export = TransloaditError
