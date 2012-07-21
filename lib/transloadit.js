var multiparter = require('multiparter')
  , http = require('http')
  , Assembly = require('./assembly')
  , API_HOST = 'api2.transloadit.com'
  , nop = function() {}
  ;

function Transloadit(options) {
  options = options || {};
  this._key = options.key;
  this._secret = options.secret;
};

/**
 * options - {
 *   steps: {} - assembly steps
 *   templateId: (optional) string template id
 *   fields: {} (optional) variables to be used in the assembly
 *   files: {} (optional) hash {name: filepath} 
 *   auth: {key: String, secret: String} - (optional) use transloadit constructor values by default
 *   redirect_url: (optional) no redirect url by default
 *   notify_url: (optional) no notify url by default
 *   success: (optional) callback to trigger when the assembly completes successfully
 *   error: (optional) callback to trigger on error
 *   change: (optional) callback to trigger when the state of the assembly changes
 * }
 */
Transloadit.prototype.createAssembly = function(options) {
  if (!options) return new Assembly(this);


  request({
    url: 'http://' + API_HOST + '/assemblies',
    method: 'POST',
    json: options.params || {},
  })
};

Transloadit.prototype.getAssemblyStatus = function() {};

/**
 * options - {
 *   path: '/assemblies',
 *   params: {  - hash of name/value parameters
 *     signature: 'Test'
 *   },
 *   streams: { - hash of streams
 *     name: {
 *       fileName,
 *       mimeType,
 *       streamLength,
 *       stream
 *     }
 *   }
 * }
 */
Transloadit.prototype._multipart = function(options, cb) {
  var request = new multiparter.request(http, {
    host: API_HOST,
    port: 80,
    path: options.path,
    method: 'POST'
  });
  Object.keys(options.params).forEach(function(key) {
    request.setParam(key, options.params[key]);
  });
  Object.keys(options.streams).forEach(function(key) {
    var stream = options.streams[key];
    request.addStream(key, stream.fileName, stream.mimeType, stream.streamLength, stream.stream);
  });

  request.send(cb);
};

module.exports = Transloadit;