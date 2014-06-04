transloadit-node-js-sdk
=======================

Transloadit NodeJS SDK

[![Build Status](https://travis-ci.org/transloadit/node-sdk.svg?branch=master)](https://travis-ci.org/transloadit/node-sdk)

## Quick code sample:

```javascript
var TransloaditClient = require("./lib/TransloaditClient");

var client = new TransloaditClient({
  authKey:    'YOUR_AUTH_KEY',
  authSecret: 'YOUR_AUTH_SECRET'
});

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

  var assemblyId = result.assembly_id;
  console.log(assemblyId);

  client.deleteAssembly(assemblyId, function(err) {
    console.log('deleted');
  });
});
```

# API


## TransloaditClient

### constructor([options])

Returns a new instance of the client. The <code>options</code> object must at least include <code>authKey</code> and <code>authSecret</code> keys (and their values).

You can also provide <code>service</code>, which defaults to "api2.transloadit.com", and <code>region</code>, which defaults to "us-east-1".

### TransloaditClient.addFile(name, path)

Registers the local file with the client. The next call to <code>createAssembly</code> will upload that file.

### TransloaditClient.addStream(stream)

Registers the provided stream with the client. The next call to <code>createAssembly</code> will upload that stream.

### TransloaditClient.createAssembly(options, cb)

Creates a new assembly on Transloadit, uploading all streams and files that were registered via <code>.addStream()</code> and <code>.addFile()</code> prior to the call to <code>.createAssembly()</code>.

You can provide some options:

* <code>params</code> - an object containing your template_id, notify_url, some steps that overwrite your Transloadit template and other params to control Transloadit behavior.
* <code>fields</code> - an object of form fields to add to the request, to make use of in the assembly via [assembly variables](https://transloadit.com/docs#assembly-variables).

### TransloaditClient.assemblyStatus(assemblyId, cb)

Retrieves the JSON status of the assembly identified by the given <code>assemblyId</code>.

### TransloaditClient.deleteAssembly(assemblyId, cb)

Removes the assembly identified by the given assemblyId from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the assembly from the database - you can still access it on <code>https://transloadit.com/assemblies/[[assembly_id]]</code> in your Transloadit account. This also does not delete any files associated with the assembly from the Transloadit servers.

### TransloaditClient.replayAssembly(options, cb)

Replays the assembly identified by the given assembly_id. The <code>options</code> parameter must contain an <code>assembly_id</code> key containing the assembly id. Optionally you can also provide a <code>notify_url</code> key if you want to change the notification target.

### TransloaditClient.replayAssemblyNotification(options, cb)

Replays the notification for the assembly identified by the given assembly_id.  The <code>options</code> parameter must contain an <code>assembly_id</code> key containing the assembly id. Optionally you can also provide a <code>notify_url</code> key if you want to change the notification target.


# Authors

* Tim Koschützki (tim@transloadit.com)

Contributions from:

* Kevin van Zonneveld (kevin@transloadit.com)
* Geoff Wilson (gmwils@gmail.com)
