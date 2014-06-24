var TransloaditClient = require("../lib/TransloaditClient");

var client = new TransloaditClient({
  authKey    : 'YOUR_AUTH_KEY',
  authSecret : 'YOUR_AUTH_SECRET'
});

var fieldName = 'my_file';
var filePath  = 'ABSOLUTE_PATH_TO_SOME_FILE';
client.addFile(fieldName, filePath);

var opts = {
  params: {
    template_id: 'YOUR_TEMPLATE_ID'
  }
};
client.createAssembly(opts, function(err, result) {
  if (err) {
    console.log('fail');
  } else {
    console.log('success');
  }
  console.log(result);
});
