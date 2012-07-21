function Assembly(transloadit) {
  this._transloadit = transloadit;
  this._templateId = null;
  this._steps = {};
  this._fields = {};
  this._files = {};
  this._streams = {};

  this._response = null;
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

// Assembly.prototype.file = function(name, path) {
//   if (arguments.length === 0) return this._files[name];

//   this._files[name] = path;
//   return this;
// };

// Assembly.prototype.stream = function(name, stream) {
//   if (arguments.length === 0) return this._streams[name];

//   this._streams[name] = stream;
//   return this;
// };

Assembly.prototype.run = function(options) {
  this._transloadit._multipart({
    path: '/assemblies',
    params: {
      test: 'value'
    },
    streams: {}
  }, function handleMultipart(err, response) {
    console.log('multipart', arguments);
  });
};

Assembly.prototype.error = function(cb) {
  this._error = cb;
};

Assembly.prototype.success = function(cb) {
  this._success = cb;
};

Assembly.prototype.update = function(cb) {
  this._update = cb;
};

module.exports = Assembly;