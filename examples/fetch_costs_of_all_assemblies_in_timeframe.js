// make sure to "npm install async" for this demo
var async             = require("async");
var TransloaditClient = require("./lib/TransloaditClient");

function TransloaditCostFetcher(authKey, secret) {
  this._client = new TransloaditClient({
    authKey    : authKey,
    authSecret : secret
  });

  this._params = params || {};
  if (typeof this._params.page === "undefined") {
    this._params.page = 1;
  }

  this._totalBytes = 0;
  this._lastCount = 1;
}

TransloaditCostFetcher.prototype.run = function(cb) {
  var self = this;

  async.whilst(
    function() {
      return self._lastCount > 0;
    },
    function (callback) {
      console.log("Processing page", self._params.page);
      self._client.listAssemblies(self._params, function(err, result) {
        self._lastCount = result.count;
        self._params.page++;

        if (!result.items || result.items.length === 0) {
          return callback(err);
        }

        var q = async.queue(self._fetchAssemblyCost.bind(self), 20);
        q.drain = callback;

        for (var i = 0; i < result.items.length; i++) {
          q.push(result.items[i].id);
        }

      });
    },
    function (err) {
      var gb = (self._totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      cb(err, gb);
    }
  );
};

TransloaditCostFetcher.prototype._fetchAssemblyCost = function(assemblyId, cb) {
  var self = this;

  this._client.getAssembly(assemblyId, function(err, result) {
    if (err) {
      return cb(err);
    }

    self._totalBytes += result.bytes_usage ? result.bytes_usage : 0;
    cb();
  });
};

var authKey    = "YOUR_AUTH_KEY";
var authSecret = "YOUR_AUTH_SECRET";

var params = {
  fromdate   : "2014-05-22 00:00:00",
  todate     : "2014-05-22 23:59:59"
};
var fetcher = new TransloaditCostFetcher(authKey, authSecret, params);
fetcher.run(function(err, usageInGb) {
  if (err) {
    console.error(err);
  } else {
    console.log("Total GB:", usageInGb);
  }
});
