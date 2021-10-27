class InconsistentResponseError extends Error {
  constructor (message) {
    super(message)
    this.name = 'InconsistentResponseError'
  }
}

module.exports = InconsistentResponseError
