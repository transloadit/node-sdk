var request = require('request')
  , crypto = require('crypto')
  , MultipartStream = require('multipart-form-stream')
  , Assembly = require('./assembly')
  , API_HOST = 'api2.transloadit.com'
  , nop = function() {}
  ;

function Transloadit(options) {
  options = options || {};
  this._key = options.key;
  this._secret = options.secret;
};

Transloadit.prototype.createAssembly = function(options) {
  return new Assembly(this);
};

Transloadit.prototype.getAssemblyStatus = function(assemblyUrl, cb) {
  request.get({
    uri: assemblyUrl
  }, function handleResponse(err, response) {
    var body;
    
    if (err) return cb(err);

    response = response || {};
    response.body = response.body || '{}';
    
    try {
      body = JSON.parse(response.body);
      return cb(null, body);
    } catch (err) {
      return cb(err);
    }
  });
};

/**
 * options - {
 *   path: '/assemblies',
 *   sign: false (set true to sign request)
 *   params: {  - hash of name/value parameters
 *     signature: 'Test'
 *   },
 *   streams: { - hash of streams
 *     field: {
 *       filename,
 *       mimeType,
 *       stream
 *     }
 *   },
 *   files: {
 *     field: {
 *       path,
 *       filename (optional)
 *     }
 *   }
 * }
 */
Transloadit.prototype._multipart = function(options, cb) {
  var stream
    , json_params
    , hmac
    , expires
    ;

  options = options || {};
  options.params = options.params || {};
  options.streams = options.streams || {};
  options.files = options.files || {};
  stream = new MultipartStream();

  // add params
  options.params.auth = {
    key: this._key
  };
  if(options.sign) {
    expires = new Date();
    expires.setDate(expires.getDate() + 1);
    options.params.auth.expires = expires.toISOString();
    json_params = JSON.stringify(options.params);
    hmac = crypto.createHmac('sha1', this._secret);
    hmac.update(json_params);
    stream.addField('signature', hmac.digest('hex'));
  } else {
    json_params = JSON.stringify(options.params);
  }
  stream.addField('params', json_params);
  
  // add streams
  Object.keys(options.streams).forEach(function streamKey(key) {
    var currentStream = options.streams[key];
    stream.addStream(key, currentStream.filename, currentStream.mimeType, currentStream.stream);
  });

  // add files
  Object.keys(options.files).forEach(function fileKey(key) {
    var file = options.files[key];
    stream.addFile(key, file.path, file.filename);
  });

  // make streaming request
  stream.pipe(request.post({
    uri: 'http://' + API_HOST + options.path,
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + stream.getBoundary()
    }
  }, function handleResponse(err, response) {
    var body;
    
    if (err) return cb(err);

    response = response || {};
    response.body = response.body || '{}';
    
    try {
      body = JSON.parse(response.body);
      return cb(null, body);
    } catch (err) {
      return cb(err);
    }
  }));
};

module.exports = Transloadit;
