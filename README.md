<img src="https://assets.transloadit.com/assets/images/artwork/logos-transloadit-default.svg" width="400" />

# Transloadit Node.js SDK [![](https://github.com/transloadit/node-sdk/workflows/Test/badge.svg)](https://github.com/transloadit/node-sdk/actions?query=workflow%3ATest) [![](https://transloadit.github.io/node-sdk-coverage/coverage-badge.svg)](https://transloadit.github.io/node-sdk-coverage)

A **Node.js** integration for [Transloadit](https://transloadit.com)'s file uploading and encoding service.

## Intro

[Transloadit](https://transloadit.com) is a service that helps you handle file
uploads, resize, crop and watermark your images, make GIFs, transcode your
videos, extract thumbnails, generate audio waveforms, and so much more. In
short, [Transloadit](https://transloadit.com) is the Swiss Army Knife for your
files.

This is a **Node.js** SDK to make it easy to talk to the
[Transloadit](https://transloadit.com) REST API.

## Requirements

- [Node.js](https://nodejs.org/en/) version 10 or newer
- [A Transloadit account](https://transloadit.com/signup/) (free to register)
- [Your API credentials](https://transloadit.com/c/template-credentials) (`authKey`, `authSecret`)

## Install

Inside your project, type

```bash
yarn add transloadit
```
or
```bash
npm install transloadit --save
```

## Usage

The following code will show how to upload an image and resize it to a thumbnail:

```javascript
const TransloaditClient = require('transloadit')
const transloadit       = new TransloaditClient({
  authKey   : 'YOUR_TRANSLOADIT_KEY',
  authSecret: 'YOUR_TRANSLOADIT_SECRET'
})

transloadit.addFile('file1', '/PATH/TO/FILE.jpg')

try {
  const options = {
    waitForCompletion: true,  // Wait for the assembly (job) to finish executing before returning
    params           : {
      steps: { // You can have many steps. In this case we will just resize any inputs
        resize: {
          use   : ':original',
          robot : '/image/resize',
          result: true,
          width : 75,
          height: 75,
        }
      }
      // OR if you already created a template, you can use it instead of "steps":
      // template_id: 'YOUR_TEMPLATE_ID',
    },
  }

  const status = await transloadit.createAssemblyAsync(options)

  if (status.results.resize) {
    console.log('✅ Success - Your resized image:', status.results.resize[0].url)
  } else {
    console.log("❌ The assembly didn't produce any output. Make sure you used a valid image file")
  }
} catch (err) {
  console.error('❌ Unable to process assembly.', err)
  if (err.assemblyId) {
    console.error(`💡 More info: https://transloadit.com/assemblies/${err.assemblyId}`)
  }
}
```

You can find [details about your executed assemblies here](https://transloadit.com/assemblies).

## Examples

- [Upload and resize image](examples/resize_an_image.js)
- [Upload image and convert to WebP](examples/convert_to_webp.js)
- [Calculate total costs (GB usage)](examples/fetch_costs_of_all_assemblies_in_timeframe.js)
- [Templates CRUD](examples/template_api.js)

For more fully working examples take a look at [`examples/`](examples/).

For more example use cases and information about the available robots and their parameters, check out the [Transloadit website](https://transloadit.com/).

## API

These are the public methods on the `TransloaditClient` object and their descriptions. The methods are based on the [Transloadit API](https://transloadit.com/docs/api/).

### Main

#### constructor([options])

Returns a new instance of the client.

The `options` object can contain the following keys:
- `authKey` **(required)** - see [requirements](#requirements)
- `authSecret` **(required)** - see [requirements](#requirements)
- `service` (default `'api2.transloadit.com'`)
- `region` (default `'us-east-1'`)
- `useSsl` (default `true`)

By default `TransloaditClient` will use SSL so it will access `service` with a https:// prefix. You can switch this off by providing `options`.`useSsl` with a value of `false`.

### Assemblies

#### TransloaditClient.addFile(name, path)

Registers the local file with the client. The next call to `createAssembly` will upload all added files. The `name` may be used in the `createAssembly` `params`.`steps` to refer to the particular file.

#### TransloaditClient.addStream(name, stream)

Same as `addFile` but with a Node.js `Readable` stream instead of a file.

#### TransloaditClient.createAssemblyAsync(options[, onProgress]) -> Promise

Creates a new Assembly on Transloadit, uploading all streams and files that were registered via `.addStream()` and `.addFile()` prior to the call to `.createAssembly()`.

You can provide the following keys inside the `options` object:

* `params` - An object containing keys defining the assembly's behavior with the following keys: (See also [API doc](https://transloadit.com/docs/api/#assemblies-post) and [examples](#examples))
  * `steps` - Assembly instructions - See [Transloadit docs](https://transloadit.com/docs/#assembly-instructions)
  * `template_id` - The ID of the Template that contains your Assembly Instructions. **One of either `steps` or `template_id` is required.** If you specify both, then [any steps will overrule the template](https://transloadit.com/docs/#overruling-templates-at-runtime).
  * `fields` - An object of form fields to add to the request, to make use of in the assembly via [assembly variables](https://transloadit.com/docs#assembly-variables). 
  * `notify_url` - Transloadit can send a Pingback to your server when the Assembly is completed. We'll send the Assembly Status in JSON encoded string inside a transloadit field in a multipart POST request to the URL supplied here.
* `waitForCompletion` - A boolean (default is `false`) to indicate whether you want to wait for the Assembly to finish with all encoding results present before the promise is fulfilled. If `waitForCompletion` is `true`, this SDK will poll for status updates and fulfill the promise when all encoding work is done.

If specified, `onProgress({ uploadProgress, assemblyProgress })` will be periodically called with the current file upload progress in `uploadProgress` and then, *once the Assembly finished uploading*, Assembly Execution Status in `assemblyProgress`.

Example `onProgress` handler:
```javascript
function onProgress({ uploadProgress, assemblyProgress }) {
  if (uploadProgress) {
    console.log(`♻️ Upload progress polled: ${uploadProgress.uploadedBytes} of ${uploadProgress.totalBytes} bytes uploaded.`)
  } else if (assemblyProgress) {
    console.log(`♻️ Assembly progress polled: ${assemblyProgress.error ? assemblyProgress.error : assemblyProgress.ok} ${assemblyProgress.assembly_id} ... `)
  }
}
// ...
await transloadit.createAssemblyAsync(options, onProgress)
// ...
```

See also:
- [API documentation](https://transloadit.com/docs/api/#assemblies-post)
- Error codes and retry logic below

#### TransloaditClient.listAssembliesAsync(params) -> Promise

Retrieves an array of assemblies according to the given `params`.

Valid params can be `page`, `pagesize`, `type`, `fromdate`, `todate` and `keywords`. Please consult the [API documentation](https://transloadit.com/docs/api/#retrieve-assembly-list) for details.

#### TransloaditClient.streamAssemblies(params)

Creates an `objectMode` `Readable` stream that automates handling of `listAssembliesAsync` pagination. It accepts the same `params` as `listAssembliesAsync`.

This can be used to iterate through assemblies:

```javascript
const assemblyStream = client.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream.on('readable', function() {
  const assembly = assemblyStream.read();
  if (assembly == null) console.log('end of stream');

  console.log(assembly.id);
});
```

Results can also be piped. Here's an example using
[through2](https://github.com/rvagg/through2):

```javascript
const assemblyStream = client.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream
  .pipe(through.obj(function(chunk, enc, callback) {
    this.push(chunk.id + '\n');
    callback();
  }))
  .pipe(fs.createWriteStream('assemblies.txt'));
```

#### TransloaditClient.getAssemblyAsync(assemblyId) -> Promise

Retrieves the JSON status of the assembly identified by the given `assemblyId`. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-get).

#### TransloaditClient.cancelAssemblyAsync(assemblyId) -> Promise

Removes the assembly identified by the given `assemblyId` from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the assembly from the database - you can still access it on `https://transloadit.com/assemblies/{assembly_id}` in your Transloadit account. This also does not delete any files associated with the assembly from the Transloadit servers. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-delete).

#### TransloaditClient.replayAssemblyAsync(assemblyId, params) -> Promise

Replays the assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-replay-post) for more info about `params`.

#### TransloaditClient.lastUsedAssemblyUrl()

Returns the internal url that was used for the last call to `createAssemblyAsync`. This is meant to be used for debugging purposes.

### Assembly notifications

#### TransloaditClient.replayAssemblyNotificationAsync(assemblyId, params) -> Promise

Replays the notification for the assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/#assembly-notifications-assembly-id-replay-post) for more info about `params`.

#### TransloaditClient.listAssemblyNotificationsAsync(params) -> Promise

Retrieves an array of assembly notifications. [See example](examples/list_assembly_notifications.js) and [API documentation](https://transloadit.com/docs/api/#retrieve-assembly-notification-list) for more info about `params`.

#### TransloaditClient.streamAssemblyNotifications(params)

Creates an `objectMode` `Readable` stream that automates handling of `listAssemblynotificationsAsync` pagination. Similar to `streamAssemblies`.


### Templates

#### TransloaditClient.createTemplateAsync(params) -> Promise

Creates a template the provided params. The required `params` keys are:
- `name` - The template name
- `template` - The template JSON string (use `JSON.stringify`).

[See example](examples/template_api.js) and [API documentation](https://transloadit.com/docs/api/#templates-post).

#### TransloaditClient.editTemplateAsync(templateId, params) -> Promise

Updates the template represented by the given `templateId` with the new value. The `params` works just like the one from the `createTemplate` call. [See example](examples/template_api.js) and [API documentation](https://transloadit.com/docs/api/#templates-template-id-put).

#### TransloaditClient.getTemplateAsync(templateId) -> Promise

Retrieves the name and the template JSON for the template represented by the given `templateId`. [See example](examples/template_api.js) and [API documentation](https://transloadit.com/docs/api/#templates-template-id-get).

#### TransloaditClient.deleteTemplateAsync(templateId) -> Promise

Deletes the template represented by the given `templateId`. [See example](examples/template_api.js) and [API documentation](https://transloadit.com/docs/api/#templates-template-id-delete).

#### TransloaditClient.listTemplatesAsync(params) -> Promise

Retrieves a list of all your templates. [See example](examples/template_api.js) and [API documentation](https://transloadit.com/docs/api/#templates-get) for more info about `params`.

#### TransloaditClient.streamTemplates(params)

Creates an `objectMode` `Readable` stream that automates handling of `listTemplatesAsync` pagination. Similar to `streamAssemblies`.

### Other

#### TransloaditClient.getBillAsync(date)

Retrieves the billing data for a given `date` string with format `YYYY-MM`. See [API documentation](https://transloadit.com/docs/api/#bill-date-get).

#### TransloaditClient.calcSignature(params)

Calculates a signature for the given `params` JSON object. If the `params` object does not include an `authKey` or `expires` keys (and their values) in the `auth` sub-key, then they are set automatically.

This function returns an object with the key `signature` (containing the calculated signature string) and a key `params`, which contains the stringified version of the passed `params` object (including the set expires and authKey keys).

### Errors

Errors will be passed on from Node.js and we use [GOT](https://github.com/sindresorhus/got) for HTTP requests and errors from there will also be passed on. When the HTTP response code is not 200, the error will be a `TransloaditClient.HTTPError` (extends from [got.HTTPError](https://github.com/sindresorhus/got#errors)) with some additional properties:

- `HTTPError.response?.body` the JSON object returned by the server along with the error response (**note**: `HTTPError.response` will be `undefined` for non-server errors)
- `HTTPError.transloaditErrorCode` alias for `HTTPError.response.body.error` ([View all error codes](https://transloadit.com/docs/api/#error-codes))
- `HTTPError.assemblyId` (alias for `HTTPError.response.body.assembly_id`, if the request regards an [Assembly](https://transloadit.com/docs/api/#assemblies-assembly-id-get))

To identify errors you can either check its props or use `instanceof`, e.g.:
```js
catch (err) {
  if (err instanceof TransloaditClient.TimeoutError) {
    return console.error('The request timed out', err)
  }
  if (err.code === 'ENOENT') {
    return console.error('Cannot open file', err)
  }
  if (err.transloaditErrorCode === 'ASSEMBLY_INVALID_STEPS') {
    return console.error('Invalid assembly steps', err)
  }
}
```

- [More information on Transloadit errors (`transloaditErrorCode`)](https://transloadit.com/docs/api/#error-codes)
- [More information on request errors](https://github.com/sindresorhus/got#errors)

### Rate limiting & auto retry

All functions of the client automatically obey all rate limiting imposed by Transloadit (e.g. `RATE_LIMIT_REACHED`). It will automatically retry requests **5 times** with auto back-off. There is no need to write your own wrapper scripts to handle rate limits.

- https://transloadit.com/docs/api/#rate-limiting
- https://transloadit.com/blog/2012/04/introducing-rate-limiting/

## Debugging

This project uses [debug](https://github.com/visionmedia/debug) so you can run node with the `DEBUG=transloadit` evironment variable to enable verbose logging. Example:

```bash
DEBUG=transloadit* node examples/template_api.js
```

## Contributing

We'd be happy to accept pull requests. If you plan on working on something big, please first drop us a line!

### Testing

Check your sources for linting errors via `npm run lint`, and unit tests, and run them via `npm run test-unit`

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
