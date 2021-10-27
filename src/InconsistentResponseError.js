export default class InconsistentResponseError extends Error {
  constructor (message) {
    super(message)
    this.name = 'InconsistentResponseError'
  }
}
