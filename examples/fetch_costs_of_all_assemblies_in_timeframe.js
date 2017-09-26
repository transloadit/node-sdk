// make sure to "npm install async" for this demo
const async = require('async')
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../lib/TransloaditClient')

class TransloaditCostFetcher {
  constructor (authKey, secret) {
    this._client = new TransloaditClient({
      authKey,
      authSecret: secret,
    })

    this._params = params || {}
    if (typeof this._params.page === 'undefined') {
      this._params.page = 1
    }

    this._totalBytes = 0
    this._lastCount = 1
  }

  run (cb) {
    const self = this

    async.whilst(
      () => self._lastCount > 0,
      callback => {
        console.log('Processing page', self._params.page)
        self._client.listAssemblies(self._params, (err, { count, items }) => {
          self._lastCount = count
          self._params.page++

          if (!items || items.length === 0) {
            return callback(err)
          }

          const q = async.queue(self._fetchAssemblyCost.bind(self), 20)
          q.drain = callback

          for (let i = 0; i < items.length; i++) {
            q.push(items[i].id)
          }
        })
      },
      err => {
        const gb = (self._totalBytes / (1024 * 1024 * 1024)).toFixed(2)
        cb(err, gb)
      }
    )
  }

  _fetchAssemblyCost (assemblyId, cb) {
    const self = this

    this._client.getAssembly(assemblyId, (err, { bytesUsage }) => {
      if (err) {
        return cb(err)
      }

      self._totalBytes += bytesUsage || 0
      cb()
    })
  }
}

const authKey = 'YOUR_AUTH_KEY'
const authSecret = 'YOUR_AUTH_SECRET'

var params = {
  fromdate: '2014-05-22 00:00:00',
  todate  : '2014-05-22 23:59:59',
}
const fetcher = new TransloaditCostFetcher(authKey, authSecret, params)
fetcher.run((err, usageInGb) => {
  if (err) {
    console.error(err)
  } else {
    console.log('Total GB:', usageInGb)
  }
})
