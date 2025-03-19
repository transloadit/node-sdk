export default class PollingTimeoutError extends Error {
  override name = 'PollingTimeoutError'

  code = 'POLLING_TIMED_OUT'
}
