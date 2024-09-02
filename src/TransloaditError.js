class TransloaditError extends Error {
  name = 'TransloaditError'

  constructor(message, body) {
    super(message)
    this.response = { body }
  }
}

module.exports = TransloaditError
