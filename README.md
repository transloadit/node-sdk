<img src="https://assets.transloadit.com/assets/images/artwork/logos-transloadit-default.svg" width="400" />

[![](https://github.com/transloadit/node-sdk/workflows/Tests/badge.svg)](https://github.com/transloadit/node-sdk/actions?query=workflow%3ATests) [![](https://transloadit.github.io/node-sdk-coverage/coverage-badge.svg)](https://transloadit.github.io/node-sdk-coverage)

This is the official **Node.js** SDK for [Transloadit](https://transloadit.com)'s file uploading and encoding service.

## Intro

[Transloadit](https://transloadit.com) is a service that helps you handle file
uploads, resize, crop and watermark your images, make GIFs, transcode your
videos, extract thumbnails, generate audio waveforms, [and so much more](https://transloadit.com/demos/). In
short, [Transloadit](https://transloadit.com) is the Swiss Army Knife for your
files.

This is a **Node.js** SDK to make it easy to talk to the
[Transloadit](https://transloadit.com) REST API.

## Requirements

- [Node.js](https://nodejs.org/en/) version 10 or newer
- [A Transloadit account](https://transloadit.com/signup/) ([free signup](https://transloadit.com/pricing/))
- [Your API credentials](https://transloadit.com/c/template-credentials) (`authKey`, `authSecret`)

## Install

**Note: This documentation is for the current version (v3)**. Looking for [v2 docs?](https://github.com/transloadit/node-sdk/tree/v2) Looking for [breaking changes from v2 to v3?](https://github.com/transloadit/node-sdk/releases/tag/v3.0.0)

Inside your project, type:

```bash
yarn add transloadit
```
or
```bash
npm install --save transloadit
```

## Usage

The following code will upload an image and resize it to a thumbnail:

```javascript
const Transloadit = require('transloadit')

const transloadit = new Transloadit({
  authKey   : 'YOUR_TRANSLOADIT_KEY',
  authSecret: 'YOUR_TRANSLOADIT_SECRET',
});

(async () => {
  try {
    const options = {
      files: {
        file1: '/PATH/TO/FILE.jpg',
      },
      params: {
        steps: { // You can have many Steps. In this case we will just resize any inputs (:original)
          resize: {
            use   : ':original',
            robot : '/image/resize',
            result: true,
            width : 75,
            height: 75,
          },
        },
        // OR if you already created a template, you can use it instead of "steps":
        // template_id: 'YOUR_TEMPLATE_ID',
      },
      waitForCompletion: true,  // Wait for the Assembly (job) to finish executing before returning
    }

    const status = await transloadit.createAssembly(options)

    if (status.results.resize) {
      console.log('✅ Success - Your resized image:', status.results.resize[0].ssl_url)
    } else {
      console.log("❌ The Assembly didn't produce any output. Make sure you used a valid image file")
    }
  } catch (err) {
    console.error('❌ Unable to process Assembly.', err)
    if (err.assemblyId) {
      console.error(`💡 More info: https://transloadit.com/assemblies/${err.assemblyId}`)
    }
  }
})()
```

You can find [details about your executed Assemblies here](https://transloadit.com/assemblies).

## Examples

- [Upload and resize image](https://github.com/transloadit/node-sdk/blob/master/examples/resize_an_image.js)
- [Upload image and convert to WebP](https://github.com/transloadit/node-sdk/blob/master/examples/convert_to_webp.js)
- [Crop a face out of an image and download the result](https://github.com/transloadit/node-sdk/blob/master/examples/face_detect_download.js)
- [Retry example](https://github.com/transloadit/node-sdk/blob/master/examples/retry.js)
- [Calculate total costs (GB usage)](https://github.com/transloadit/node-sdk/blob/master/examples/fetch_costs_of_all_assemblies_in_timeframe.js)
- [Templates CRUD](https://github.com/transloadit/node-sdk/blob/master/examples/template_api.js)

For more fully working examples take a look at [`examples/`](examples/).

For more example use cases and information about the available robots and their parameters, check out the [Transloadit website](https://transloadit.com/).

## API

These are the public methods on the `Transloadit` object and their descriptions. The methods are based on the [Transloadit API](https://transloadit.com/docs/api/). See also [TypeScript definitions](types/index.d.ts).

Table of contents:
- [Main](#main)
- [Assemblies](#assemblies)
- [Assembly notifications](#assembly-notifications)
- [Templates](#templates)
- [Errors](#errors)

### Main

#### constructor(options)

Returns a new instance of the client.

The `options` object can contain the following keys:
- `authKey` **(required)** - see [requirements](#requirements)
- `authSecret` **(required)** - see [requirements](#requirements)
- `endpoint` (default `'https://api2.transloadit.com'`)
- `maxRetries` (default `5`) - see [Rate limiting & auto retry](#rate-limiting--auto-retry)
- `timeout` (default `60000`: 1 minute) - the timeout (in milliseconds) for all requests (except `createAssembly`)

### Assemblies

#### async createAssembly(options)

Creates a new Assembly on Transloadit and optionally upload the specified `files` and `uploads`.

You can provide the following keys inside the `options` object:

- `params` **(required)** - An object containing keys defining the Assembly's behavior with the following keys: (See also [API doc](https://transloadit.com/docs/api/#assemblies-post) and [examples](#examples))
  - `steps` - Assembly instructions - See [Transloadit docs](https://transloadit.com/docs/#assembly-instructions) and [demos](https://transloadit.com/demos/) for inspiration.
  - `template_id` - The ID of the Template that contains your Assembly Instructions. **One of either `steps` or `template_id` is required.** If you specify both, then [any Steps will overrule the template](https://transloadit.com/docs/#overruling-templates-at-runtime).
  - `fields` - An object of form fields to add to the request, to make use of in the Assembly instructions via [Assembly variables](https://transloadit.com/docs#assembly-variables). 
  - `notify_url` - Transloadit can send a Pingback to your server when the Assembly is completed. We'll send the Assembly Status in JSON encoded string inside a transloadit field in a multipart POST request to the URL supplied here.
- `files` - An object (key-value pairs) containing one or more file paths to upload and use in your Assembly. The *key* is the *field name* and the *value* is the path to the file to be uploaded. The *field name* and the file's name may be used in the ([Assembly instructions](https://transloadit.com/docs/#assembly-instructions)) (`params`.`steps`) to refer to the particular file. See example below.
  - `'fieldName': '/path/to/file'`
  - more files...
- `uploads` - An object (key-value pairs) containing one or more files to upload and use in your Assembly. The *key* is the *file name* and the *value* is the *content* of the file to be uploaded. *Value* can be one of many types:
  - `'fieldName': (Readable | Buffer | TypedArray | ArrayBuffer | string | Iterable<Buffer | string> | AsyncIterable<Buffer | string> | Promise)`
  - more uploads...
- `waitForCompletion` - A boolean (default is `false`) to indicate whether you want to wait for the Assembly to finish with all encoding results present before the promise is fulfilled. If `waitForCompletion` is `true`, this SDK will poll for status updates and fulfill the promise when all encoding work is done.
- `timeout` - Number of milliseconds to wait before aborting (default `86400000`: 24 hours).
- `onUploadProgress` - An optional function that will be periodically called with the file upload progress, which is an with an object containing:
  - `uploadedBytes` - Number of bytes uploaded so far.
  - `totalBytes` - Total number of bytes to upload or `undefined` if unknown (Streams).
- `onAssemblyProgress` - Once the Assembly has started processing this will be periodically called with the *Assembly Execution Status* (result of `getAssembly`) **only if `waitForCompletion` is `true`**.

Example code showing all options:
```js
await transloadit.createAssembly({
  files: {
    file1: '/path/to/file.jpg'
    // ...
  },
  uploads: {
    'file2.bin': Buffer.from([0, 0, 7]), // A buffer
    'file3.txt': 'file contents', // A string
    'file4.jpg': process.stdin // A stream
    // ...
  },
  params: {
    steps: { ... },
    template_id: 'MY_TEMPLATE_ID',
    fields: {
      field1: 'Field value',
      // ...
    }, 
    notify_url: 'https://example.com/notify-url',
  },
  waitForCompletion: true,
  timeout: 60000,
  onUploadProgress,
  onAssemblyProgress,
})
```

Example `onUploadProgress` and `onAssemblyProgress` handlers:
```javascript
function onUploadProgress({ uploadedBytes, totalBytes }) {
  // NOTE: totalBytes may be undefined
  console.log(`♻️ Upload progress polled: ${uploadedBytes} of ${totalBytes} bytes uploaded.`)
}
function onAssemblyProgress(assembly) {
  console.log(`♻️ Assembly progress polled: ${assembly.error ? assembly.error : assembly.ok} ${assembly.assembly_id} ... `)
}
```

**Tip:** `createAssembly` returns a `Promise` with an extra property `assemblyId`. This can be used to retrieve the Assembly ID before the Assembly has even been created. Useful for debugging by logging this ID when the request starts, for example:

```js
const promise = transloadit.createAssembly(options)
console.log('Creating', promise.assemblyId)
const status = await promise
```


See also:
- [API documentation](https://transloadit.com/docs/api/#assemblies-post)
- Error codes and retry logic below

#### async listAssemblies(params)

Retrieve Assemblies according to the given `params`.

Valid params can be `page`, `pagesize`, `type`, `fromdate`, `todate` and `keywords`. Please consult the [API documentation](https://transloadit.com/docs/api/#retrieve-assembly-list) for details.

The method returns an object containing these properties:

- `items`: An `Array` of up to `pagesize` Assemblies
- `count`: Total number of Assemblies

#### streamAssemblies(params)

Creates an `objectMode` `Readable` stream that automates handling of `listAssemblies` pagination. It accepts the same `params` as `listAssemblies`.

This can be used to iterate through Assemblies:

```javascript
const assemblyStream = transloadit.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream.on('readable', function() {
  const assembly = assemblyStream.read();
  if (assembly == null) console.log('end of stream');

  console.log(assembly.id);
});
```

Results can also be piped. Here's an example using
[through2](https://github.com/rvagg/through2):

```javascript
const assemblyStream = transloadit.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' });

assemblyStream
  .pipe(through.obj(function(chunk, enc, callback) {
    this.push(chunk.id + '\n');
    callback();
  }))
  .pipe(fs.createWriteStream('assemblies.txt'));
```

#### async getAssembly(assemblyId)

Retrieves the JSON status of the Assembly identified by the given `assemblyId`. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-get).

#### async cancelAssembly(assemblyId)

Removes the Assembly identified by the given `assemblyId` from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the Assembly from the database - you can still access it on `https://transloadit.com/assemblies/{assembly_id}` in your Transloadit account. This also does not delete any files associated with the Assembly from the Transloadit servers. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-delete).

#### async replayAssembly(assemblyId, params)

Replays the Assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/#assemblies-assembly-id-replay-post) for more info about `params`.

The response from the `replayAssembly` is minimal and does not contain much information about the replayed assembly. Please call `getAssembly` or `awaitAssemblyCompletion` after replay to get more information:

```js
const replayAssemblyResponse = await transloadit.replayAssembly(failedAssemblyId)

const assembly = await transloadit.getAssembly(replayAssemblyResponse.assembly_id)
// Or
const completedAssembly = await transloadit.awaitAssemblyCompletion(replayAssemblyResponse.assembly_id)
```

#### async awaitAssemblyCompletion(assemblyId, opts)

This function will continously poll the specified Assembly `assemblyId` and resolve when it is done uploading and executing (until `result.ok` is no longer `ASSEMBLY_UPLOADING`, `ASSEMBLY_EXECUTING` or `ASSEMBLY_REPLAYING`). It resolves with the same value as `getAssembly`.

`opts` is an object with the keys:
- `onAssemblyProgress` - A progress function called on each poll. See `createAssembly`
- `timeout` - How many milliseconds until polling times out (default: no timeout)
- `interval` - Poll interval in milliseconds (default `1000`)

#### getLastUsedAssemblyUrl()

Returns the internal url that was used for the last call to `createAssembly`. This is meant to be used for debugging purposes.

### Assembly notifications

#### async replayAssemblyNotification(assemblyId, params)

Replays the notification for the Assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/#assembly-notifications-assembly-id-replay-post) for more info about `params`.

#### async listAssemblyNotifications(params)

Retrieve Assembly notifications according to `params`. [See example](examples/list_assembly_notifications.js) and [API documentation](https://transloadit.com/docs/api/#assembly-notifications-get) for more info about `params`.

The method returns an object containing these properties:

- `items`: An `Array` of up to `pagesize` Assembly notifications
- `count`: Total number of Assembly notifications

#### streamAssemblyNotifications(params)

Creates an `objectMode` `Readable` stream that automates handling of `listAssemblynotifications` pagination. Similar to `streamAssemblies`.

### Templates

Templates are Steps that can be reused. [See example template code](examples/template_api.js).

#### async createTemplate(params)

Creates a template the provided params. The required `params` keys are:
- `name` - The template name
- `template` - The template JSON object containing its `steps`

See also [API documentation](https://transloadit.com/docs/api/#templates-post).

```js
const template = {
  steps: {
    encode: {
      use   : ':original',
      robot : '/video/encode',
      preset: 'ipad-high',
    },
    thumbnail: {
      use  : 'encode',
      robot: '/video/thumbnails',
    },
  },
}

const result = await transloadit.createTemplate({ name: 'my-template-name', template })
console.log('✅ Template created with template_id', result.id)
```

#### async editTemplate(templateId, params)

Updates the template represented by the given `templateId` with the new value. The `params` works just like the one from the `createTemplate` call. See [API documentation](https://transloadit.com/docs/api/#templates-template-id-put).

#### async getTemplate(templateId)

Retrieves the name and the template JSON for the template represented by the given `templateId`. See [API documentation](https://transloadit.com/docs/api/#templates-template-id-get).

#### async deleteTemplate(templateId)

Deletes the template represented by the given `templateId`. See [API documentation](https://transloadit.com/docs/api/#templates-template-id-delete).

#### async listTemplates(params)

Retrieve all your templates. See [API documentation](https://transloadit.com/docs/api/#templates-get) for more info about `params`.

The method returns an object containing these properties:

- `items`: An `Array` of up to `pagesize` templates
- `count`: Total number of templates

#### streamTemplates(params)

Creates an `objectMode` `Readable` stream that automates handling of `listTemplates` pagination. Similar to `streamAssemblies`.

### Other

#### setDefaultTimeout(timeout)

Same as `constructor` `timeout` option: Set the default timeout (in milliseconds) for all requests (except `createAssembly`)

#### async getBill(date)

Retrieves the billing data for a given `date` string with format `YYYY-MM`. See [API documentation](https://transloadit.com/docs/api/#bill-date-get).

#### calcSignature(params)

Calculates a signature for the given `params` JSON object. If the `params` object does not include an `authKey` or `expires` keys (and their values) in the `auth` sub-key, then they are set automatically.

This function returns an object with the key `signature` (containing the calculated signature string) and a key `params`, which contains the stringified version of the passed `params` object (including the set expires and authKey keys).

### Errors

Errors from Node.js will be passed on and we use [GOT](https://github.com/sindresorhus/got) for HTTP requests and errors from there will also be passed on. When the HTTP response code is not 200, the error will be a `Transloadit.HTTPError`, which is a [got.HTTPError](https://github.com/sindresorhus/got#errors)) with some additional properties:

- `HTTPError.response?.body` the JSON object returned by the server along with the error response (**note**: `HTTPError.response` will be `undefined` for non-server errors)
- `HTTPError.transloaditErrorCode` alias for `HTTPError.response.body.error` ([View all error codes](https://transloadit.com/docs/api/#error-codes))
- `HTTPError.assemblyId` (alias for `HTTPError.response.body.assembly_id`, if the request regards an [Assembly](https://transloadit.com/docs/api/#assemblies-assembly-id-get))

To identify errors you can either check its props or use `instanceof`, e.g.:
```js
catch (err) {
  if (err instanceof Transloadit.TimeoutError) {
    return console.error('The request timed out', err)
  }
  if (err.code === 'ENOENT') {
    return console.error('Cannot open file', err)
  }
  if (err.transloaditErrorCode === 'ASSEMBLY_INVALID_STEPS') {
    return console.error('Invalid Assembly Steps', err)
  }
}
```

**Note:** Assemblies that have an error status (`assembly.error`) will only result in an error thrown from `createAssembly` and `replayAssembly`. For other Assembly methods, no errors will be thrown, but any error can be found in the response's `error` property

- [More information on Transloadit errors (`transloaditErrorCode`)](https://transloadit.com/docs/api/#error-codes)
- [More information on request errors](https://github.com/sindresorhus/got#errors)

### Rate limiting & auto retry

All functions of the client automatically obey all rate limiting imposed by Transloadit (e.g. `RATE_LIMIT_REACHED`). It will automatically retry requests **5 times** with auto back-off (`maxRetries` option). There is no need to write your own wrapper scripts to handle rate limits.

If you want to retry on other errors, please see the [retry example code](examples/retry.js).

- https://transloadit.com/docs/api/#rate-limiting
- https://transloadit.com/blog/2012/04/introducing-rate-limiting/

## Debugging

This project uses [debug](https://github.com/visionmedia/debug) so you can run node with the `DEBUG=transloadit` evironment variable to enable verbose logging. Example:

```bash
DEBUG=transloadit* node examples/template_api.js
```

## Maintainers

- [Mikael Finstad](https://github.com/mifi)

## Contributing

We'd be happy to accept pull requests. If you plan on working on something big, please first drop us a line!

### Testing

Check your sources for linting errors via `npm run lint`, and unit tests, and run them via `npm test`

### Releasing

1. Install [np](https://github.com/sindresorhus/np): `npm i -g np`
2. Wait for [tests to succeed](https://github.com/transloadit/node-sdk/actions).
3. Run `np` and follow instructions.
4. When successful add [release notes](https://github.com/transloadit/node-sdk/releases).

### Change log
See [Releases](https://github.com/transloadit/node-sdk/releases)

### Convenience

If you come from a unix background and fancy faster auto-complete, you'll be delighted to know that all npm scripts are also accessible under `make`, via fakefile.

## License

[MIT](LICENSE)

Thanks to [Ian Hansen](https://github.com/supershabam) for donating the `transloadit` npm name. You can still access his code under `v0.0.0`.
