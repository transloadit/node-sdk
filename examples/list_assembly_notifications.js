// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
var TransloaditClient = require("../lib/TransloaditClient");

var client = new TransloaditClient({
  authKey    : 'YOUR_AUTH_KEY',
  authSecret : 'YOUR_AUTH_SECRET'
});

var params = {
  type: 'all'
};
client.listAssemblyNotifications(params, function(err, result) {
  if (err) {
    console.log('fail');
  } else {
    console.log('success');
  }
  console.log(result);
});
