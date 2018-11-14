# Transloadit Node.js SDK [![Build Status](https://travis-ci.org/transloadit/node-sdk.svg?branch=master)](https://travis-ci.org/transloadit/node-sdk)

A **Node** integration for [Transloadit](https://transloadit.com)'s file
uploading and encoding service.

## Intro

[Transloadit](https://transloadit.com) is a service that helps you handle file
uploads, resize, crop and watermark your images, make GIFs, transcode your
videos, extract thumbnails, generate audio waveforms, and so much more. In
short, [Transloadit](https://transloadit.com) is the Swiss Army Knife for your
files.

This is a **Node** SDK to make it easy to talk to the
[Transloadit](https://transloadit.com) REST API.

## Install

Inside your project, type

```bash
npm install transloadit --save
```

If there are no errors, you can start using the module.

## Usage

```javascript
const TransloaditClient = require('transloadit')
const transloadit       = new TransloaditClient({
  authKey   : 'YOUR_TRANSLOADIT_KEY',
  authSecret: 'YOUR_TRANSLOADIT_SECRET'
})

const options = {
  waitForCompletion: true,
  params           : {
    template_id: 'YOUR_TEMPLATE_ID',
  },
}

const doneCb = (err, status) => {
  let assemblyId = ''

  if (status) {
    if (status.assembly_id) {
      assemblyId = status.assembly_id
    }
    // Lowlevel errors (e.g. connection errors) are in err, Assembly errors are in status.error.
    // For this example, we don't discriminate and only care about erroring out:
    if (!err && status.error) {
      err = `${status.error}. ${status.message}. `
    }
  }

  if (err) {
    console.error({ status })
    throw new Error(`❌ Unable to process Assembly ${assemblyId}. ${err}`)
  }

  console.log({ status })
  console.log(`✅ Success`)
}

const progressCb = (ret) => {
  let msg = ''
  if (ret.uploadProgress) {
    msg += `♻️ Upload progress polled: ` + ret.uploadProgress.uploadedBytes + ` of ` + ret.uploadProgress.totalBytes + ` bytes uploaded.`
  }
  if (ret.assemblyProgress) {
    msg += `♻️ Assembly progress polled: ${ ret.assemblyProgress.error ? ret.assemblyProgress.error : ret.assemblyProgress.ok } ret.assemblyProgress.assembly_id ... `
  }

  console.log(msg)
}

transloadit.addFile('file1', '/PATH/TO/FILE.jpg')
transloadit.createAssembly(options, doneCb, progressCb)
```

## Example

For fully working examples take a look at
[`examples/`](https://github.com/transloadit/node-sdk/tree/master/examples).

## API

These are the public methods on the `TransloaditClient` object and their descriptions.

### Main

#### constructor([options])

Returns a new instance of the client. The `options` object must at least include `authKey` and `authSecret` keys (and their values).

You can also provide `service`, which defaults to `'api2.transloadit.com'`, and `region`, which defaults to `'us-east-1'`.

By default `TransloaditClient` will use SSL so it will access `service` with a https:// prefix. You can switch this off by providing options.useSsl with a value of `false`.

#### calcSignature(params)

Calculates a signature for the given `params` JSON object. If the `params` object does not include an `authKey` or `expires` keys (and their values) in the `auth` sub-key, then they are set automatically.

This function returns an object with the key `signature` (containing the calculated signature string) and a key `params`, which contains the stringified version of the passed `params` object (including the set expires and authKey keys).

### Assemblies

#### TransloaditClient.addFile(name, path)

Registers the local file with the client. The next call to `createAssembly` will upload that file.

#### TransloaditClient.addStream(name, stream)

Registers the provided stream with the client. The next call to `createAssembly` will upload that stream.

#### TransloaditClient.createAssembly(options, doneCb[, progressCb])

Creates a new Assembly on Transloadit, uploading all streams and files that were registered via `.addStream()` and `.addFile()` prior to the call to `.createAssembly()`.

You can provide these keys inside `options`:

* `params` - an object containing your `template_id`, `notify_url`, some steps that overwrite your Transloadit template and other params to control Transloadit behavior.
* `fields` - an object of form fields to add to the request, to make use of in the assembly via [assembly variables](https://transloadit.com/docs#assembly-variables).
* `waitForCompletion` - A boolean (default is `false`) to indicate whether you want to wait for the Assembly to finish with all encoding results present before the callback is called. If `waitForCompletion` is `true`, this SDK will poll for status updates and call `doneCb` when all encoding work is done. During each polling action, `progressCb(ret)` is called with the current Upload progress in `uploadProgress` and then, *once the Assembly finished uploading*, Assembly Execution Status in `assemblyProgress` inside a result object as its only argument.

Here is an example for a progressCb function:

```javascript
const progressCb = (ret) => {
  let msg = ''
  if (ret.uploadProgress) {
    msg += `♻️ Upload progress polled: ` + ret.uploadProgress.uploadedBytes + ` of ` + ret.uploadProgress.totalBytes + ` bytes uploaded.`
  }
  if (ret.assemblyProgress) {
    msg += `♻️ Assembly progress polled: ${ ret.assemblyProgress.error ? ret.assemblyProgress.error : ret.assemblyProgress.ok } ret.assemblyProgress.assembly_id ... `
  }

  console.log(msg)
}
```

This function (like all functions of this client) automatically obeys all rate limiting imposed by Transloadit. There is no need to write your own wrapper scripts to handle rate limits.

#### TransloaditClient.lastUsedAssemblyUrl()

Returns the internal url that was used for the last call to `Transloadit.createAssembly()`. This is meant to be used for debugging purposes.

#### TransloaditClient.listAssemblies(params, cb)

Retrieves an array of assemblies according to the given `params`.

Valid params can be page, pagesize, type, fromdate and todate. Please consult the [Transloadit API docs](https://transloadit.com/docs/api-docs/#retrieve-assembly-list) for details.

#### TransloaditClient.streamAssemblies(params)

Creates an objectMode readable stream that automates handling of listAssembly
pagination. It accepts the same params as listAssembly.

This can be used to iterate through assemblies:

```javascript
var assemblyStream = client.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream.on('readable', function() {
  var assembly = assemblyStream.read();
  if (assembly == null) console.log('end of stream');

  console.log(assembly.id);
});
```

Results can also be piped. Here's an example using
[through2](https://github.com/rvagg/through2):

```javascript
var assemblyStream = client.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream
  .pipe(through.obj(function(chunk, enc, callback) {
    this.push(chunk.id + '\n');
    callback();
  }))
  .pipe(fs.createWriteStream('assemblies.txt'));
```

#### TransloaditClient.getAssembly(assemblyId, cb)

Retrieves the JSON status of the assembly identified by the given `assemblyId`.

#### TransloaditClient.deleteAssembly(assemblyId, cb)

Removes the assembly identified by the given `assemblyId` from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the assembly from the database - you can still access it on `https://transloadit.com/assemblies/{assembly_id}` in your Transloadit account. This also does not delete any files associated with the assembly from the Transloadit servers.

#### TransloaditClient.replayAssembly(options, cb)

Replays the assembly identified by the given `assembly_id`. The `options` parameter must contain an `assembly_id` key containing the assembly id. Optionally you can also provide a `notify_url` key if you want to change the notification target.

### Assembly notifications

#### TransloaditClient.replayAssemblyNotification(options, cb)

Replays the notification for the assembly identified by the given `assembly_id`.  The `options` parameter must contain an `assembly_id` key containing the assembly id. Optionally you can also provide a `notify_url` key if you want to change the notification target.

#### TransloaditClient.listAssemblyNotifications(params, cb)

Retrieves an array of assembly notifications according to the given `params`.

Valid params can be `page`, `pagesize`, `type` and `assembly_id`. Please consult the [Transloadit API docs](https://transloadit.com/docs/api-docs/#retrieve-assembly-notification-list) for details.

#### TransloaditClient.streamAssemblyNotifications(params)

Creates an objectMode readable stream like streamAssemblies that automates
handling of listAssemblynotifications pagination.

### Templates

#### TransloaditClient.createTemplate(params, cb)

Creates a template the provided params. The required `params` keys are: name (the template name) and template (the template JSON string).

#### TransloaditClient.editTemplate(templateId, params, cb)

Updates the template represented by the given `templateId` with the new value. The `params` works just like the one from the `createTemplate` call.

#### TransloaditClient.getTemplate(templateId, cb)

Retrieves the name and the template JSON for the template represented by the given templateId.

#### TransloaditClient.deleteTemplate(templateId, cb)

Deletes the template represented by the given templateId on Transloadit.

#### TransloaditClient.listTemplates(params, cb)

Retrieves a list of all your templates from Transloadit. The `params` parameter can contain properties such as `order`, `sort`, and `page`. For a list of all available params please check [this entry](https://transloadit.com/docs/api-docs/#retrieve-template-list) in the Transloadit API docs.

#### TransloaditClient.streamTemplates(params)

Creates an objectMode readable stream like streamAssemblies that automates
handling of listTemplates pagination.

## Contributing

We'd be happy to accept pull requests. If you plan on working on something big, please first drop us a line!

### Building

The SDK is written in ES6, but the ES5 JavaScript it generates is committed back into the repository so people can use this module without a ES6 dependency. If you want to work on the source, please do so in `./src` and type: `npm run build` or `npm run test` (also builds first). Please don't edit generated JavaScript in `./lib`!

### Testing

Check your sources for linting errors via `npm run lint`, and unit tests, and run them via `npm run test`, or `npm run mocha` for faster iterations.

### Releasing

Releasing a new version to npmjs.org can be done via `npm run release:major` (or minor / patch, depending on the [semantic versioning](http://semver.org/) impact of your changes). This will automatically:

 - Bump the version inside the `package.json`
 - Save a release commit with the updated version in Git
 - Push a tag to Github
 - Publish to npmjs.org

### Convenience

If you come from a unix background and fancy faster auto-complete, you'll be delighted to know that all npm scripts are also accessible under `make`, via fakefile.

## Authors

* [Tim Koschützki](https://twitter.com/tim_kos)

Contributions from:

* [Kevin van Zonneveld](https://twitter.com/kvz)
* [Adrian Sinclair](https://github.com/adrusi)
* [Geoff Wilson](mailto:gmwils@gmail.com)
* [Jim Gibbs](https://www.linkedin.com/pub/james-gibbs/0/8/4ab)


Thanks to:

* [Ian Hansen](https://github.com/supershabam) for donating the `transloadit` npm name. You can still access his code under `v0.0.0`.

## License

[MIT Licensed](LICENSE).
