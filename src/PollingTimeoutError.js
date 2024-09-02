class PollingTimeoutError extends Error {
  name = 'PollingTimeoutError'

  code = 'POLLING_TIMED_OUT'
}

module.exports = PollingTimeoutError
