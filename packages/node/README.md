[![Build Status](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/transloadit/node-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/transloadit/node-sdk)

<a href="https://transloadit.com/?utm_source=github&utm_medium=referral&utm_campaign=sdks&utm_content=node_sdk">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg">
    <img src="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg" alt="Transloadit Logo">
  </picture>
</a>

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

- [Node.js](https://nodejs.org/en/) version 20 or newer
- [A Transloadit account](https://transloadit.com/signup/) ([free signup](https://transloadit.com/pricing/))
- [Your API credentials](https://transloadit.com/c/template-credentials) (`authKey`, `authSecret`)

## Install

Inside your project, type:

```bash
yarn add transloadit
```

or

```bash
npm install --save transloadit
```

## Command Line Interface (CLI)

This package includes a full-featured CLI for interacting with Transloadit from your terminal.

### Quick Start

```bash
# Set your credentials
export TRANSLOADIT_KEY="YOUR_TRANSLOADIT_KEY"
export TRANSLOADIT_SECRET="YOUR_TRANSLOADIT_SECRET"

# See all available commands
npx transloadit --help
```

### Processing Media

Create Assemblies to process files using Assembly Instructions (steps) or Templates:

```bash
# Process a file using a steps file
npx transloadit assemblies create --steps steps.json --input image.jpg --output result.jpg

# Process using a Template
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --input image.jpg --output result.jpg

# Process with custom fields
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --field size=100 --input image.jpg --output thumb.jpg

# Process a directory of files
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --input images/ --output thumbs/

# Process recursively with file watching
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --input images/ --output thumbs/ --recursive --watch

# Process multiple files in a single assembly
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --input file1.jpg --input file2.jpg --output results/ --single-assembly

# Limit concurrent processing (default: 5)
npx transloadit assemblies create --template YOUR_TEMPLATE_ID --input images/ --output thumbs/ --concurrency 2
```

### Managing Assemblies

```bash
# List recent assemblies
npx transloadit assemblies list

# List assemblies with filters
npx transloadit assemblies list --after 2024-01-01 --before 2024-12-31

# Get assembly status
npx transloadit assemblies get ASSEMBLY_ID

# Cancel an assembly
npx transloadit assemblies delete ASSEMBLY_ID

# Replay an assembly (re-run with original instructions)
npx transloadit assemblies replay ASSEMBLY_ID

# Replay with different steps
npx transloadit assemblies replay --steps new-steps.json ASSEMBLY_ID

# Replay using latest template version
npx transloadit assemblies replay --reparse-template ASSEMBLY_ID
```

### Linting Assembly Instructions

Lint Assembly Instructions locally using the same linter as the API.

```bash
# From a JSON file (full instructions or steps-only)
npx transloadit assemblies lint --steps steps.json

# From stdin
cat steps.json | npx transloadit assemblies lint

# Merge template content before linting
npx transloadit assemblies lint --template TEMPLATE_ID --steps steps.json

# Treat warnings as fatal; apply fixes (overwrites files / stdout for stdin)
npx transloadit assemblies lint --fatal warning --fix --steps steps.json
```

When both `--template` and steps input are provided, Transloadit merges the template content with
the provided steps before linting, matching the API's runtime behavior. If the template sets
`allow_steps_override=false`, providing steps will fail with `TEMPLATE_DENIES_STEPS_OVERRIDE`.

### Managing Templates

```bash
# List all templates
npx transloadit templates list

# Get template content
npx transloadit templates get TEMPLATE_ID

# Create a template from a JSON file
npx transloadit templates create my-template template.json

# Modify a template
npx transloadit templates modify TEMPLATE_ID template.json

# Rename a template
npx transloadit templates modify TEMPLATE_ID --name new-name

# Delete a template
npx transloadit templates delete TEMPLATE_ID

# Sync local template files with Transloadit (bidirectional)
npx transloadit templates sync templates/*.json
npx transloadit templates sync --recursive templates/
```

### Billing

```bash
# Get bill for a month
npx transloadit bills get 2024-01

# Get detailed bill as JSON
npx transloadit bills get 2024-01 --json
```

### Assembly Notifications

```bash
# Replay a notification
npx transloadit assembly-notifications replay ASSEMBLY_ID

# Replay to a different URL
npx transloadit assembly-notifications replay --notify-url https://example.com/hook ASSEMBLY_ID
```

### Signature Generation

```bash
# Generate a signature for assembly params
echo '{"steps":{}}' | npx transloadit auth signature

# Generate with specific algorithm
echo '{"steps":{}}' | npx transloadit auth signature --algorithm sha256

# Generate a signed Smart CDN URL
echo '{"workspace":"my-workspace","template":"my-template","input":"image.jpg"}' | npx transloadit auth smart-cdn
```

### CLI Options

All commands support these common options:

- `--json, -j` - Output results as JSON (useful for scripting)
- `--log-level, -l` - Set log verbosity level by name or number (default: notice)
- `--endpoint` - Custom API endpoint URL (or set `TRANSLOADIT_ENDPOINT` env var)
- `--help, -h` - Show help for a command

The `assemblies create` command additionally supports:

- `--single-assembly` - Pass all input files to a single assembly instead of one assembly per file

#### Log Levels

The CLI uses [syslog severity levels](https://en.wikipedia.org/wiki/Syslog#Severity_level). Lower = more severe, higher = more verbose:

| Level    | Value | Description                           |
| -------- | ----- | ------------------------------------- |
| `err`    | 3     | Error conditions                      |
| `warn`   | 4     | Warning conditions                    |
| `notice` | 5     | Normal but significant **(default)**  |
| `info`   | 6     | Informational messages                |
| `debug`  | 7     | Debug-level messages                  |
| `trace`  | 8     | Most verbose/detailed                 |

You can use either the level name or its numeric value:

```bash
# Show only errors and warnings
npx transloadit assemblies list -l warn
npx transloadit assemblies list -l 4

# Show debug output
npx transloadit assemblies list -l debug
npx transloadit assemblies list -l 7
```

## SDK Usage

The following code will upload an image and resize it to a thumbnail:

```javascript
import { Transloadit } from 'transloadit'

const transloadit = new Transloadit({
  authKey: 'YOUR_TRANSLOADIT_KEY',
  authSecret: 'YOUR_TRANSLOADIT_SECRET',
})

try {
  const options = {
    files: {
      file1: '/PATH/TO/FILE.jpg',
    },
    params: {
      steps: {
        // You can have many Steps. In this case we will just resize any inputs (:original)
        resize: {
          use: ':original',
          robot: '/image/resize',
          result: true,
          width: 75,
          height: 75,
        },
      },
      // OR if you already created a template, you can use it instead of "steps":
      // template_id: 'YOUR_TEMPLATE_ID',
    },
    waitForCompletion: true, // Wait for the Assembly (job) to finish executing before returning
  }

  const status = await transloadit.createAssembly(options)

  if (status.results.resize) {
    console.log('✅ Success - Your resized image:', status.results.resize[0].ssl_url)
  } else {
    console.log("❌ The Assembly didn't produce any output. Make sure you used a valid image file")
  }
} catch (err) {
  console.error('❌ Unable to process Assembly.', err)
  if (err instanceof ApiError && err.assemblyId) {
    console.error(`💡 More info: https://transloadit.com/assemblies/${err.assemblyId}`)
  }
}
```

You can find [details about your executed Assemblies here](https://transloadit.com/assemblies).

### Resuming interrupted uploads

If an upload was interrupted, you can resume it by providing the original `assemblyUrl` and the
same input mapping. Resume relies on matching `fieldname`, `filename`, and `size`, so keep input
names stable and pass the same files. Only path-based inputs resume; Buffer/string/stream uploads
start a new tus upload automatically.

You can pass the same upload and progress options as `createAssembly` (such as `chunkSize`,
`uploadConcurrency`, `uploadBehavior`, `waitForCompletion`, `timeout`, `onUploadProgress`, and
`onAssemblyProgress`).
When `waitForCompletion` is `true`, the SDK will poll and resolve once the Assembly is finished.

```javascript
const status = await transloadit.resumeAssemblyUploads({
  assemblyUrl: 'https://api2.transloadit.com/assemblies/ASSEMBLY_ID',
  files: {
    file1: '/PATH/TO/FILE.jpg',
    file2: '/PATH/TO/FILE2.jpg',
  },
  uploadConcurrency: 2,
})
```

## Examples

- [Upload and resize image](https://github.com/transloadit/node-sdk/blob/main/examples/resize_an_image.ts)
- [Upload image and convert to WebP](https://github.com/transloadit/node-sdk/blob/main/examples/convert_to_webp.ts)
- [Rasterize SVG to PNG](https://github.com/transloadit/node-sdk/blob/main/examples/rasterize_svg_to_png.ts)
- [Crop a face out of an image and download the result](https://github.com/transloadit/node-sdk/blob/main/examples/face_detect_download.ts)
- [Retry example](https://github.com/transloadit/node-sdk/blob/main/examples/retry.ts)
- [Calculate total costs (GB usage)](https://github.com/transloadit/node-sdk/blob/main/examples/fetch_costs_of_all_assemblies_in_timeframe.ts)
- [Templates CRUD](https://github.com/transloadit/node-sdk/blob/main/examples/template_api.ts)
- [Template Credentials CRUD](https://github.com/transloadit/node-sdk/blob/main/examples/credentials.ts)

For more fully working examples take a look at [`examples/`](https://github.com/transloadit/node-sdk/blob/main/examples/).

For more example use cases and information about the available robots and their parameters, check out the [Transloadit website](https://transloadit.com/).

## API

These are the public methods on the `Transloadit` object and their descriptions. The methods are based on the [Transloadit API](https://transloadit.com/docs/api/).

Table of contents:

- [Main](#main)
- [Assemblies](#assemblies)
- [Assembly notifications](#assembly-notifications)
- [Templates](#templates)
- [Template Credentials](#template-credentials)
- [Errors](#errors)
- [Rate limiting & auto retry](#rate-limiting--auto-retry)

### Main

#### constructor(options)

Returns a new instance of the client.

The `options` object can contain the following keys:

- `authKey` **(required)** - see [requirements](#requirements)
- `authSecret` **(required)** - see [requirements](#requirements)
- `endpoint` (default `'https://api2.transloadit.com'`)
- `maxRetries` (default `5`) - see [Rate limiting & auto retry](#rate-limiting--auto-retry)
- `gotRetry` (default `0`) - see [Rate limiting & auto retry](#rate-limiting--auto-retry)
- `timeout` (default `60000`: 1 minute) - the timeout (in milliseconds) for all requests (except `createAssembly`)
- `validateResponses` (default `false`)

### Assemblies

#### async createAssembly(options)

Creates a new Assembly on Transloadit and optionally upload the specified `files` and `uploads`.

You can provide the following keys inside the `options` object:

- `params` **(required)** - An object containing keys defining the Assembly's behavior with the following keys: (See also [API doc](https://transloadit.com/docs/api/assemblies-post/) and [examples](#examples))
  - `steps` - Assembly instructions - See [Transloadit docs](https://transloadit.com/docs/topics/assembly-instructions/) and [demos](https://transloadit.com/demos/) for inspiration.
  - `template_id` - The ID of the Template that contains your Assembly Instructions. **One of either `steps` or `template_id` is required.** If you specify both, then [any Steps will overrule the template](https://transloadit.com/docs/topics/templates/#overruling-templates-at-runtime).
  - `fields` - An object of form fields to add to the request, to make use of in the Assembly instructions via [Assembly variables](https://transloadit.com/docs#assembly-variables).
  - `notify_url` - Transloadit can send a Pingback to your server when the Assembly is completed. We'll send the Assembly Status in JSON encoded string inside a transloadit field in a multipart POST request to the URL supplied here.
- `files` - An object (key-value pairs) containing one or more file paths to upload and use in your Assembly. The _key_ is the _field name_ and the _value_ is the path to the file to be uploaded. The _field name_ and the file's name may be used in the ([Assembly instructions](https://transloadit.com/docs/topics/assembly-instructions/)) (`params`.`steps`) to refer to the particular file. See example below.
  - `'fieldName': '/path/to/file'`
  - more files...
- `uploads` - An object (key-value pairs) containing one or more files to upload and use in your Assembly. The _key_ is the _file name_ and the _value_ is the _content_ of the file to be uploaded. _Value_ can be one of many types:
  - `'fieldName': (Readable | Buffer | TypedArray | ArrayBuffer | string | Iterable<Buffer | string> | AsyncIterable<Buffer | string> | Promise)`.
  - more uploads...
- `waitForCompletion` - A boolean (default is `false`) to indicate whether you want to wait for the Assembly to finish with all encoding results present before the promise is fulfilled. If `waitForCompletion` is `true`, this SDK will poll for status updates and fulfill the promise when all encoding work is done.
- `timeout` - Number of milliseconds to wait before aborting (default `86400000`: 24 hours).
- `onUploadProgress` - An optional function that will be periodically called with the file upload progress, which is an with an object containing:
  - `uploadedBytes` - Number of bytes uploaded so far.
  - `totalBytes` - Total number of bytes to upload or `undefined` if unknown (Streams).
- `onAssemblyProgress` - Once the Assembly has started processing this will be periodically called with the _Assembly Execution Status_ (result of `getAssembly`) **only if `waitForCompletion` is `true`**.
- `chunkSize` - (for uploads) a number indicating the maximum size of a tus `PATCH` request body in bytes. Default to `Infinity` for file uploads and 50MB for streams of unknown length. See [tus-js-client](https://github.com/tus/tus-js-client/blob/master/docs/api.md#chunksize).
- `uploadConcurrency` - Maximum number of concurrent tus file uploads to occur at any given time (default 10.)
- `uploadBehavior` - Controls how uploads are handled:
  - `await` (default) waits for all uploads to finish.
  - `background` starts uploads and returns once upload URLs are created.
  - `none` returns upload URLs without uploading any bytes.
  - When `uploadBehavior` is not `await`, `waitForCompletion` is ignored.

**NOTE**: Make sure the key in `files` and `uploads` is not one of `signature`, `params` or `max_size`.

When `uploadBehavior` is `background` or `none`, the resolved Assembly object includes
`upload_urls` with a map of field names to tus upload URLs.

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
  console.log(
    `♻️ Assembly progress polled: ${assembly.error ? assembly.error : assembly.ok} ${
      assembly.assembly_id
    } ... `
  )
}
```

**Tip:** `createAssembly` returns a `Promise` with an extra property `assemblyId`. This can be used to retrieve the Assembly ID before the Assembly has even been created. Useful for debugging by logging this ID when the request starts, for example:

```js
const promise = transloadit.createAssembly(options)
console.log('Creating', promise.assemblyId)
const status = await promise
```

See also:

- [API documentation](https://transloadit.com/docs/api/assemblies-post/)
- Error codes and retry logic below

#### async lintAssemblyInstructions(options)

Lint Assembly Instructions locally using the same linter as the API.
If you provide a `templateId`, the template content is fetched and merged with your instructions
before linting (matching the API's runtime merge behavior). If the template sets
`allow_steps_override=false`, providing steps will throw `TEMPLATE_DENIES_STEPS_OVERRIDE`.

The `options` object accepts:

- `assemblyInstructions` - Assembly Instructions as a JSON string, a full instructions object, or a steps-only object.
  If no `steps` property is present, the object is treated as steps.
- `templateId` - Optional template ID to merge before linting.
- `fatal` - `'error' | 'warning'` (default: `'error'`). When set to `'warning'`, warnings are treated as fatal.
- `fix` - Apply auto-fixes where possible. If `true`, the result includes `fixedInstructions`.

The method returns:

- `success` - `true` when no fatal issues are found.
- `issues` - Array of lint issues (each includes `code`, `type`, `row`, `column`, and `desc`).
- `fixedInstructions` - The fixed JSON string when `fix` is `true` (steps-only inputs return steps-only JSON).

Example:

```js
const result = await transloadit.lintAssemblyInstructions({
  assemblyInstructions: {
    resize: { robot: '/image/resize', use: ':original', width: 100, height: 100 },
  },
  fatal: 'warning',
})

if (!result.success) {
  console.log(result.issues)
}
```

#### async listAssemblies(params)

Retrieve Assemblies according to the given `params`.

Valid params can be `page`, `pagesize`, `type`, `fromdate`, `todate` and `keywords`. Please consult the [API documentation](https://transloadit.com/docs/api/assemblies-get/) for details.

The method returns an object containing these properties:

- `items`: An `Array` of up to `pagesize` Assemblies
- `count`: Total number of Assemblies

#### streamAssemblies(params)

Creates an `objectMode` `Readable` stream that automates handling of `listAssemblies` pagination. It accepts the same `params` as `listAssemblies`.

This can be used to iterate through Assemblies:

```javascript
const assemblyStream = transloadit.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' })

assemblyStream.on('readable', function () {
  const assembly = assemblyStream.read()
  if (assembly == null) console.log('end of stream')

  console.log(assembly.id)
})
```

Results can also be piped. Here's an example using
[through2](https://github.com/rvagg/through2):

```javascript
const assemblyStream = transloadit.streamAssemblies({ fromdate: '2016-08-19 01:15:00 UTC' })

assemblyStream
  .pipe(
    through.obj(function (chunk, enc, callback) {
      this.push(chunk.id + '\n')
      callback()
    })
  )
  .pipe(fs.createWriteStream('assemblies.txt'))
```

#### async getAssembly(assemblyId)

Retrieves the JSON status of the Assembly identified by the given `assemblyId`. See [API documentation](https://transloadit.com/docs/api/assemblies-assembly-id-get/).

#### async cancelAssembly(assemblyId)

Removes the Assembly identified by the given `assemblyId` from the memory of the Transloadit machines, ultimately cancelling it. This does not delete the Assembly from the database - you can still access it on `https://transloadit.com/assemblies/{assembly_id}` in your Transloadit account. This also does not delete any files associated with the Assembly from the Transloadit servers. See [API documentation](https://transloadit.com/docs/api/assemblies-assembly-id-delete/).

#### async replayAssembly(assemblyId, params)

Replays the Assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/assemblies-assembly-id-replay-post/) for more info about `params`.

The response from the `replayAssembly` is minimal and does not contain much information about the replayed assembly. Please call `getAssembly` or `awaitAssemblyCompletion` after replay to get more information:

```js
const replayAssemblyResponse = await transloadit.replayAssembly(failedAssemblyId)

const assembly = await transloadit.getAssembly(replayAssemblyResponse.assembly_id)
// Or
const completedAssembly = await transloadit.awaitAssemblyCompletion(
  replayAssemblyResponse.assembly_id
)
```

#### async awaitAssemblyCompletion(assemblyId, opts)

This function will continously poll the specified Assembly `assemblyId` and resolve when it is done uploading and executing (until `result.ok` is no longer `ASSEMBLY_UPLOADING`, `ASSEMBLY_EXECUTING` or `ASSEMBLY_REPLAYING`). It resolves with the same value as `getAssembly`.

`opts` is an object with the keys:

- `onAssemblyProgress` - A progress function called on each poll. See `createAssembly`
- `timeout` - How many milliseconds until polling times out (default: no timeout)
- `interval` - Poll interval in milliseconds (default `1000`)
- `signal` - An `AbortSignal` to cancel polling. When aborted, the promise rejects with an `AbortError`.
- `onPoll` - A callback invoked at the start of each poll iteration. Return `false` to stop polling early and resolve with the last known status. Useful for implementing custom cancellation logic (e.g., superseding assemblies in watch mode).

#### getLastUsedAssemblyUrl()

Returns the internal url that was used for the last call to `createAssembly`. This is meant to be used for debugging purposes.

### Assembly notifications

#### async replayAssemblyNotification(assemblyId, params)

Replays the notification for the Assembly identified by the given `assemblyId` (required argument). Optionally you can also provide a `notify_url` key inside `params` if you want to change the notification target. See [API documentation](https://transloadit.com/docs/api/assembly-notifications-assembly-id-replay-post/) for more info about `params`.

### Templates

Templates are Steps that can be reused. [See example template code](examples/template_api.ts).

#### async createTemplate(params)

Creates a template the provided params. The required `params` keys are:

- `name` - The template name
- `template` - The template JSON object containing its `steps`

See also [API documentation](https://transloadit.com/docs/api/templates-post/).

```js
const template = {
  steps: {
    encode: {
      use: ':original',
      robot: '/video/encode',
      preset: 'ipad-high',
    },
    thumbnail: {
      use: 'encode',
      robot: '/video/thumbnails',
    },
  },
}

const result = await transloadit.createTemplate({ name: 'my-template-name', template })
console.log('✅ Template created with template_id', result.id)
```

#### async editTemplate(templateId, params)

Updates the template represented by the given `templateId` with the new value. The `params` works just like the one from the `createTemplate` call. See [API documentation](https://transloadit.com/docs/api/templates-template-id-put/).

#### async getTemplate(templateId)

Retrieves the name and the template JSON for the template represented by the given `templateId`. See [API documentation](https://transloadit.com/docs/api/templates-template-id-get/).

#### async deleteTemplate(templateId)

Deletes the template represented by the given `templateId`. See [API documentation](https://transloadit.com/docs/api/templates-template-id-delete/).

#### async listTemplates(params)

Retrieve all your templates. See [API documentation](https://transloadit.com/docs/api/templates-template-id-get/) for more info about `params`.

The method returns an object containing these properties:

- `items`: An `Array` of up to `pagesize` templates
- `count`: Total number of templates

#### streamTemplates(params)

Creates an `objectMode` `Readable` stream that automates handling of `listTemplates` pagination. Similar to `streamAssemblies`.

### Template Credentials

Template Credentials allow you to store third-party credentials (e.g., AWS S3, Google Cloud Storage, FTP) securely on Transloadit for use in your Assembly Instructions.

#### async createTemplateCredential(params)

Creates a new Template Credential. The `params` object should contain the credential configuration. See [API documentation](https://transloadit.com/docs/api/template-credentials-post/).

#### async editTemplateCredential(credentialId, params)

Updates an existing Template Credential identified by `credentialId`. See [API documentation](https://transloadit.com/docs/api/template-credentials-credential-id-put/).

#### async deleteTemplateCredential(credentialId)

Deletes the Template Credential identified by `credentialId`. See [API documentation](https://transloadit.com/docs/api/template-credentials-credential-id-delete/).

#### async getTemplateCredential(credentialId)

Retrieves the Template Credential identified by `credentialId`. See [API documentation](https://transloadit.com/docs/api/template-credentials-credential-id-get/).

#### async listTemplateCredentials(params)

Lists all Template Credentials. See [API documentation](https://transloadit.com/docs/api/template-credentials-get/).

#### streamTemplateCredentials(params)

Creates an `objectMode` `Readable` stream that automates handling of `listTemplateCredentials` pagination. Similar to `streamAssemblies`.

### Other

#### setDefaultTimeout(timeout)

Same as `constructor` `timeout` option: Set the default timeout (in milliseconds) for all requests (except `createAssembly`)

#### async getBill(date)

Retrieves the billing data for a given `date` string with format `YYYY-MM`. See [API documentation](https://transloadit.com/docs/api/bill-date-get/).

#### calcSignature(params)

Calculates a signature for the given `params` JSON object. If the `params` object does not include an `authKey` or `expires` keys (and their values) in the `auth` sub-key, then they are set automatically.

This function returns an object with the key `signature` (containing the calculated signature string) and a key `params`, which contains the stringified version of the passed `params` object (including the set expires and authKey keys).

See [Signature Generation](#signature-generation) in the CLI section for command-line usage.

#### getSignedSmartCDNUrl(params)

Constructs a signed Smart CDN URL, as defined in the [API documentation](https://transloadit.com/docs/topics/signature-authentication/#smart-cdn). `params` must be an object with the following properties:

- `workspace` - Workspace slug (required)
- `template` - Template slug or template ID (required)
- `input` - Input value that is provided as `${fields.input}` in the template (required)
- `urlParams` - Object with additional parameters for the URL query string (optional)
- `expiresAt` - Expiration timestamp of the signature in milliseconds since UNIX epoch. Defaults to 1 hour from now. (optional)

Example:

```js
const client = new Transloadit({ authKey: 'foo_key', authSecret: 'foo_secret' })
const url = client.getSignedSmartCDNUrl({
  workspace: 'foo_workspace',
  template: 'foo_template',
  input: 'foo_input',
  urlParams: {
    foo: 'bar',
  },
})

// url is:
// https://foo_workspace.tlcdn.com/foo_template/foo_input?auth_key=foo_key&exp=1714525200000&foo=bar&sig=sha256:9548915ec70a5f0d05de9497289e792201ceec19a526fe315f4f4fd2e7e377ac
```

### Errors

Any errors originating from Node.js will be passed on and we use [GOT](https://github.com/sindresorhus/got) v11 for HTTP requests. [Errors from `got`](https://github.com/sindresorhus/got/tree/v11.8.6?tab=readme-ov-file#errors) will also be passed on, _except_ the `got.HTTPError` which will be replaced with a `transloadit.ApiError`, which will have its `cause` property set to the instance of the original `got.HTTPError`. `transloadit.ApiError` has these properties:

- `code` (`string`) - [The Transloadit API error code](https://transloadit.com/docs/api/response-codes/#error-codes).
- `rawMessage` (`string`) - A textual representation of the Transloadit API error.
- `reason` (`string`) - Additional information about the Transloadit API error.
- `assemblyId`: (`string`) - If the request is related to an assembly, this will be the ID of the assembly.
- `assemblySslUrl` (`string`) - If the request is related to an assembly, this will be the SSL URL to the assembly .

To identify errors you can either check its props or use `instanceof`, e.g.:

```js
try {
  await transloadit.createAssembly(options)
} catch (err) {
  if (err instanceof got.TimeoutError) {
    return console.error('The request timed out', err)
  }
  if (err.code === 'ENOENT') {
    return console.error('Cannot open file', err)
  }
  if (err instanceof ApiError && err.code === 'ASSEMBLY_INVALID_STEPS') {
    return console.error('Invalid Assembly Steps', err)
  }
}
```

**Note:** Assemblies that have an error status (`assembly.error`) will only result in an error being thrown from `createAssembly` and `replayAssembly`. For other Assembly methods, no errors will be thrown, but any error can be found in the response's `error` property (also `ApiError.code`).

- [More information on Transloadit errors (`ApiError.code`)](https://transloadit.com/docs/api/response-codes/#error-codes)
- [More information on request errors](https://github.com/sindresorhus/got#errors)

### Rate limiting & auto retry

There are three kinds of retries:

#### Retry on rate limiting (`maxRetries`, default `5`)

All functions of the client automatically obey all rate limiting imposed by Transloadit (e.g. `RATE_LIMIT_REACHED`), so there is no need to write your own wrapper scripts to handle rate limits. The SDK will by default retry requests **5 times** with auto back-off (See `maxRetries` constructor option).

#### GOT HTTP retries (`gotRetry`, default `{ limit: 0 }`)

Because we use [got](https://github.com/sindresorhus/got) under the hood, you can pass a `gotRetry` constructor option which is passed on to `got`. This offers great flexibility for handling retries on network errors and HTTP status codes with auto back-off. See [`got` `retry` object documentation](https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md).

**Note that the above `maxRetries` option does not affect the `gotRetry` logic.**

#### Validate API responses (`validateResponses`, default `false`)

As we have ported the JavaScript SDK to TypeScript in v4, we are now also validating API responses using `zod` schemas. Having schema validation enabled (`true`), guarantees that the data returned by the SDK adheres to the TypeScript types of this SDK. However we are still working on improving the schemas and they are not yet 100% complete. This means that if you hit a bug in the schemas, a `zod` schema validation error will be thrown. If you encounter such an error, please report it and we will fix it as soon as possible. If you set this option to `false`, schema validation will be disabled, and you won't get any such errors, however the TypeScript types will not protect you should such a bug be encountered.

#### Custom retry logic

If you want to retry on other errors, please see the [retry example code](examples/retry.ts).

- https://transloadit.com/docs/api/rate-limiting/
- https://transloadit.com/blog/2012/04/introducing-rate-limiting/

## Debugging

This project uses [debug](https://github.com/visionmedia/debug) so you can run node with the `DEBUG=transloadit` evironment variable to enable verbose logging. Example:

```bash
DEBUG=transloadit* node examples/template_api.ts
```

## Maintainers

- [Mikael Finstad](https://github.com/mifi)

### Changelog

See [Releases](https://github.com/transloadit/node-sdk/releases)

## Attribution

Thanks to [Ian Hansen](https://github.com/supershabam) for donating the `transloadit` npm name. You can still access his code under [`v0.0.0`](https://www.npmjs.com/package/transloadit/v/0.0.0).

## License

[MIT](LICENSE) © [Transloadit](https://transloadit.com)

## Development

See [CONTRIBUTING](./CONTRIBUTING.md).
