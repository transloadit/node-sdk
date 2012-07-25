var nop = function() {};

function Assembly(transloadit, options) {
  options = options || {};

  this._transloadit = transloadit;
  this._templateId = null;
  this._steps = {};
  this._fields = {};
  this._files = {};
  this._streams = {};

  this._refreshCount = 0;
  this._maxRefresh = options.maxRefresh || 20;
  this._refreshDelay = options.refreshDelay || 250;

  this._response = null;

  // reponse handlers
  this._update = nop;
  this._success = nop;
  this._error = nop;
  this._complete = nop;

  process.nextTick(this._run.bind(this));
}

Assembly.prototype.step = function(name, robot, params) {
  if (arguments.length === 1) return this._steps[name];

  this._steps[name] = params || {};
  this._steps[name].robot = robot;
  return this;
};

Assembly.prototype.field = function(name, value) {
  if (arguments.length === 1) return this._fields[name];

  this._fields[name] = value;
  return this;
};

Assembly.prototype.templateId = function(templateId) {
  if (arguments.length === 0) return this._templateId;

  this._templateId = templateId;
  return this;
};

Assembly.prototype.file = function(name, path, filename) {
  if (arguments.length === 1) return this._files[name];

  this._files[name] = {
    path: path,
    filename: filename
  };

  return this;
};

Assembly.prototype.stream = function(name, filename, mimeType, stream) {
  if (arguments.length === 1) return this._streams[name];

  this._streams[name] = {
    filename: filename,
    mimeType: mimeType,
    stream: stream
  };

  return this;
};

Assembly.prototype.error = function(cb) {
  this._error = cb;

  return this;
};

Assembly.prototype.complete = function(cb) {
  this._complete = cb;

  return this;
};

Assembly.prototype.success = function(cb) {
  this._success = cb;

  return this;
};

Assembly.prototype.update = function(cb) {
  this._update = cb;

  return this;
};

Assembly.prototype._run = function() {
  var params = {}
    , options
    ;

  params.steps = this._steps;
  if (this._fields) params.fields = this._fields;
  if (this._templateId) params.template_id = this._templateId;

  this._transloadit._multipart({
    path: '/assemblies',
    sign: true,
    params: params,
    streams: this._streams,
    files: this._files
  }, (function handleMultipart(err, response) {
    if (err) return this._error(err, response);
    return this._handleResponse(response);
  }).bind(this));
};

Assembly.prototype._handleResponse = function(response) {
  this._response = response;
  if (response.error) {
    this._error(response.error, response);
    this._complete(response);
    return;
  }

  if (response.ok && response.ok === 'ASSEMBLY_COMPLETED') {
    this._success(response);  
    this._complete(response);
    return;
  }
  
  switch (response.ok) {
    // terminal status codes that are not error or success
    case 'REQUEST_ABORTED':
    case 'ASSEMBLY_CANCELED':
      this._update(response);
      this._complete(response);
      break;

    default:
      this._update(response);
      this._refresh();
  }
};

Assembly.prototype._refresh = function() {
  var assemblyUrl;

  if (++this._refreshCount > this._maxRefresh) {
    return this._error('MAX_REFRESH', this._response);
  }

  if (this._response && this._response.assembly_url) assemblyUrl = this._response.assembly_url;
  
  if (!assemblyUrl) {
    return this._error('NO_ASSEMBLY_URL', this._response);
  }

  setTimeout(
    (function doRefresh() {
      this._transloadit.getAssemblyStatus(assemblyUrl, (function handleGetAssemblyStatus(err, response) {
        if (err) return this._error(err);
        return this._handleResponse(response);
      }).bind(this));
    }).bind(this), this._refreshDelay);
};

module.exports = Assembly;