Transloadit NodeJS SDK
======================

[![Build Status](https://travis-ci.org/transloadit/node-sdk.svg?branch=master)](https://travis-ci.org/transloadit/node-sdk)

## Installation

```
npm install transloadit
```

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

### Assemblies

#### TransloaditClient.createAssembly(options, cb)

Creates a new assembly on Transloadit, uploading all streams and files that were registered via <code>.addStream()</code> and <code>.addFile()</code> prior to the call to <code>.createAssembly()</code>.

You can provide some options:

* <code>params</code> - an object containing your template_id, notify_url, some steps that overwrite your Transloadit template and other params to control Transloadit behavior.
* <code>fields</code> - an object of form fields to add to the request, to make use of in the assembly via [assembly variables](https://transloadit.com/docs#assembly-variables).

#### TransloaditClient.listAssemblies(params, cb)

Retrieves an array of assemblies according to the given <code>params</code>.

Valid params can be page, pagesize, type, fromdate and todate. Please consult the [Transloadit API docs](https://transloadit.com/docs/api-docs#retrieve-assembly-list) for details.

#### TransloaditClient.assemblyStatus(assemblyId, cb)

Retrieves the JSON status of the assembly identified by the given <code>assemblyId</code>.

#### TransloaditClient.deleteAssembly(assemblyId, cb)

Removes the assembly identified by the given assemblyId from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the assembly from the database - you can still access it on <code>https://transloadit.com/assemblies/[[assembly_id]]</code> in your Transloadit account. This also does not delete any files associated with the assembly from the Transloadit servers.

#### TransloaditClient.replayAssembly(options, cb)

Replays the assembly identified by the given assembly_id. The <code>options</code> parameter must contain an <code>assembly_id</code> key containing the assembly id. Optionally you can also provide a <code>notify_url</code> key if you want to change the notification target.


### Assembly notifications

#### TransloaditClient.replayAssemblyNotification(options, cb)

Replays the notification for the assembly identified by the given assembly_id.  The <code>options</code> parameter must contain an <code>assembly_id</code> key containing the assembly id. Optionally you can also provide a <code>notify_url</code> key if you want to change the notification target.

#### TransloaditClient.listAssemblyNotifications(params, cb)

Retrieves an array of assembly notifications according to the given <code>params</code>.

Valid params can be page, pagesize, type and assembly_id. Please consult the [Transloadit API docs](https://transloadit.com/docs/api-docs#retrieve-notification-list) for details.


### Templates

#### TransloaditClient.createTemplate(params, cb)

Creates a new template on Transloadit, with the given params. The params object must contain a <code>name</code> key (the template name) and a <code>template</code> key, which is the stringified value of the template JSON.

#### TransloaditClient.editTemplate(templateId, params, cb)

Updates the template represented by the given <code>templateId</code> with the new value. The <code>params</code> works just like the one from the **createTemplate** call.

#### TransloaditClient.getTemplate(templateId, cb)

Retrieves the name and the template JSON for the template represented by the given templateId.

#### TransloaditClient.deleteTemplate(templateId, cb)

Deletes the template represented by the given templateId on Transloadit.

#### TransloaditClient.listTemplates(params, cb)

Retrieves a list of all your templates from Transloadit. The <code>params</code> parameter can contain properties such as "order", "sort", and "page". For a list of all available params please check [this entry](https://transloadit.com/docs/api-docs#retrieve-template-list) in the Transloadit API docs.

# Authors

* Tim Koschützki (tim@transloadit.com)

Contributions from:

* Kevin van Zonneveld (kevin@transloadit.com)
* Geoff Wilson (gmwils@gmail.com)

Thanks to:

* Ian Hansen for donating the `transloadit` npm name. You can still access his code under `v0.0.0`.
