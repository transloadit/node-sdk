import type { AssemblyLinterResult } from './assembly-linter.ts'
import { stackVersions } from './types/stackVersions.ts'

interface LintMessage {
  simple: string
  text: string
  desc: string
  example?: string
}

// Define specific result types for each message
interface SmartCdnMaxStepsResult {
  maxStepCount?: number
  stepCount?: number
}
interface SmartCdnRobotNotAllowedResult {
  robotName?: string
  robot?: string
}
interface StepNameResult {
  stepName?: string
}
interface RobotResult {
  robot?: string
  stepName?: string
}
interface StepNameWrongStepResult {
  stepName?: string
  wrongStepName?: string
}
interface SchemaViolationResult {
  message?: string
}
interface FfmpegResult {
  robot?: string
  isAudioRobot?: boolean
}
interface FfmpegVersionResult {
  stepName?: string
  stackVersion?: string
  isAudioRobot?: boolean
}
interface ImageMagickVersionResult {
  stepName?: string
  stackVersion?: string
}
interface DuplicateKeyResult {
  stepName?: string
  duplicateKeys?: string[]
}

export const linterMessages = {
  'smart-cdn-max-steps-exceeded': (result: SmartCdnMaxStepsResult): LintMessage => ({
    simple: `Smart CDN Assemblies are limited to ${result.maxStepCount} steps, but found ${result.stepCount} steps`,
    text: `Smart CDN Assemblies are limited to ${result.maxStepCount} steps, but found ${result.stepCount} steps`,
    desc: `
    When using the /file/serve Robot for Smart CDN Assemblies, Transloadit limits the number of steps to ${result.maxStepCount} for performance and security reasons.

    Your Assembly currently has ${result.stepCount} steps. Please reduce the number of steps to ${result.maxStepCount} or fewer. Consider combining operations or restructuring your Assembly.
    `,
  }),

  'smart-cdn-robot-not-allowed': (result: SmartCdnRobotNotAllowedResult): LintMessage => {
    const robotName = result.robotName ?? result.robot ?? 'unknown'
    return {
      simple: `Robot "${robotName}" is not allowed in Smart CDN Assemblies`,
      text: `Robot \`${robotName}\` is not allowed in Smart CDN Assemblies`,
      desc: `
    Smart CDN Assemblies, which use the /file/serve Robot, only support certain robots for security and performance reasons. The Robot "${robotName}" is not compatible with Smart CDN.

    Please check the [Content Delivery documentation](/services/content-delivery/) for more information about which robots are allowed in Smart CDN Assemblies.
    `,
    }
  },
  'empty-steps': (): LintMessage => ({
    simple: `The "steps" property is empty`,
    text: 'The `steps` property is empty',
    desc: 'The `steps` property is the main part of your Assembly Instructions. It defines which transcoding operations should be performed on your files and in which order. Each property inside `steps` represents a single transcoding operation, although this could be on multiple files passing through.',
  }),
  'missing-steps': (): LintMessage => ({
    simple: `The "steps" property is missing`,
    text: 'The `steps` property is missing',
    desc: `
The \`steps\` property is the main part of your Assembly Instructions. It defines which transcoding operations should be performed on your files and in which order. Each property inside \`steps\` represents a single transcoding operation.

Here's an example of a valid \`steps\` structure:

\`\`\`json
{
  "steps": {
    "resize": {
      "robot": "/image/resize",
      "use": ":original",
      "width": 100,
      "height": 100
    },
    "store": {
      "robot": "/s3/store",
      "use": "resize"
    }
  }
}
\`\`\`
`,
  }),

  'invalid-steps-type': (): LintMessage => ({
    simple: `The "steps" property must be an object`,
    text: 'The `steps` property must be an object',
    desc: `
The \`steps\` property in your Assembly Instructions must be an object, not an array or any other type. Each key in the \`steps\` object represents a _Step_ name, and its value should be an object describing that Step.

Here's an example of the correct structure:

\`\`\`json
{
  "steps": {
    "resize": {
      "robot": "/image/resize",
      "use": ":original",
      "width": 100,
      "height": 100
    },
    "store": {
      "robot": "/s3/store",
      "use": "resize"
    }
  }
}
\`\`\`

If you've used an array for \`steps\`, convert it to an object where each array item becomes a named _Step_.
`,
  }),

  'step-is-not-an-object': (result: StepNameResult): LintMessage => ({
    simple: `Step "${result.stepName}" is not an object`,
    text: `Step \`${result.stepName}\` is not an object`,
    desc: 'Each _Step_ should be an object.',
  }),
  'missing-robot': (result: StepNameResult): LintMessage => ({
    simple: `Step "${result.stepName}" is missing the "robot" parameter`,
    text: `Step \`${result.stepName}\` is missing the \`robot\` parameter`,
    desc: `
The \`robot\` parameter defines which _Robot_ should be used for a given _Step_. Each _Robot_ performs a specific transcoding operation on the files you give it. For example, 🤖/image/resize can resize and add effects to images. A list of available _Robots_ can be found in [the documentation](/docs/robots/#overview).

In order to use the _Robot_, you specify its name in the \`robot\` property. The \`use\` property indicates which files the _Robot_ should be working on. For example:
`,
  }),
  'undefined-robot': (result: RobotResult): LintMessage => ({
    simple: `Step "${result.stepName}" is using a non-existing Robot "${result.robot}"`,
    text: `Step \`${result.stepName}\` is using a non-existing Robot \`${result.robot}\``,
    desc: `
The \`robot\` parameter defines which _Robot_ should be used for a given _Step_. Each _Robot_ performs a specific transcoding operation on the files it is given. However, the _Robot_ that you are referring to with (\`${result.robot}\`) does not exist. Please have a look at [our documentation](/docs/robots/#overview) for a list of all available _Robots_.
`,
  }),
  'missing-url': (): LintMessage => ({
    simple: `The "url" property is missing`,
    text: '🤖/html/convert either needs the `use` or `url` parameter',
    desc: `
🤖/html/convert requires either the \`use\` or \`url\`. These are mutually exclusive. If the \`url\` parameter is given, the _Robot_ will create a screenshot of a given website. If the \`use\` parameter is given, the _Robot_ will create a screenshot of a provided HTML document. Here is an example showcasing the \`url\` parameter:
`,
  }),
  'schema-violation': (result: SchemaViolationResult): LintMessage => ({
    simple: `Schema violation: ${result.message}`,
    text: `Schema violation: ${result.message}`,
    desc: 'It is possible that the Instructions do not match the schema.',
  }),
  'missing-use': (result: StepNameResult): LintMessage => ({
    simple: `Step "${result.stepName}" is missing the "use" parameter`,
    text: `Step \`${result.stepName}\` is missing the \`use\` parameter`,
    desc: `
The \`use\` parameter defines which files a _Robot_ should process. You can reference another _Step_ name in order to use its output files as an input for your current _Step_, \`${result.stepName}\`. Alternatively, you can also use the built-in \`:original\` _Step_. In this case, the _Robot_ will process all uploaded files.

In the following example, you can see a pipeline where the _Step_ \`crop_thumbed\` uses the uploaded files from \`:original\` and the _Step_ \`exported\` uses \`:original\` and \`crop_thumbed\` as an input:
`,
  }),
  'missing-use-steps': (): LintMessage => ({
    simple: `The "use" parameter is an object and must have a "steps" property`,
    text: 'The `use` parameter is an object and must have a `steps` property',
    desc: `
The \`use\` parameter can be a string, an object, or an array. The object form can be used if the output from multiple _Steps_ should be bundled and processed in one take, for instance, to create a single slideshow from many images, as opposed to a slideshow for each individual image.

In this case, the _Steps_ should be listed in the \`steps\` property inside the \`use\` object. In the following example, the \`archived\` _Step_ produces a TAR archive containing the files from the \`:original\` and \`resized\` _Steps_:
`,
  }),
  'undefined-step': (result: StepNameWrongStepResult): LintMessage => ({
    simple: `Step "${result.stepName}" is using a non-existing Step "${result.wrongStepName}"`,
    text: `Step \`${result.stepName}\` references a non-existing Step \`${result.wrongStepName}\``,
    desc: `
The _Step_ \`${result.stepName}\` attempts to use the output files from _Step_ \`${result.wrongStepName}\`, but _Step_ \`${result.wrongStepName}\` does not exist in these _Assembly Instructions_. Please add the missing _Step_ or use another _Step_.
`,
  }),
  'wrong-use-type': (result: StepNameResult): LintMessage => ({
    simple: `The "use" parameter must be a string, object, or an array`,
    text: 'The `use` parameter must be a string, object, or an array',
    desc: `
The \`use\` parameter can be a string, an object, or an array.

If the _Step_ \`${result.stepName}\` should only process the output of **one other Step**, you can use a string like \`"use": ":original"\`.

If the _Step_ \`${result.stepName}\` should process the output of **multiple Steps individually**, you can use an array, such as: \`"use": [ ":original", "crop_thumbed" ]\`.

If the _Step_ \`${result.stepName}\` should process the output of **multiple Steps combined**, you can use an object, such as in this more complex example:
`,
  }),
  'wrong-step-name': (): LintMessage => ({
    simple: `When receiving uploads using "/upload/handle", the Step must be named ":original"`,
    text: 'When receiving uploads using `/upload/handle`, the Step must be named `:original`',
    desc: `
There are three constraints when using this _Robot_:

* **not** define a \`use\` parameter, contrary to all other _Robots_
* only use it **once** in a single set of _Assembly Instructions_
* name the _Step_ that it's used in: \`:original\`
`,
  }),
  'missing-input': (): LintMessage => ({
    simple: 'The Template does not take any input files',
    text: 'The _Template_ does not take any input files',
    desc: `
Templates can operate on user-uploaded files, or import files from file storage services and from around the web.

Use [🤖/upload/handle](/docs/robots/#upload-handle) to process uploaded files. Transloadit offers a range of [import _Robot_s](/docs/robots/#service-file-importing) for services like S3, Dropbox, and many others.
`,
  }),
  'no-storage': (): LintMessage => ({
    simple: 'No storage Robot is used to save the results',
    text: 'No storage _Robot_ is used to save the results',
    desc: `
Transloadit stores the encoding results of your _Assemblies_ for only 24 hours on its own servers at \`tmp.transloadit.com\`. After this period, the files will not be available from these locations anymore. To ensure that you are still able to access these files, we recommend to store them on your own servers (such as FTP and SFTP) or export them to cloud provider storage like AWS S3, Google Cloud Storage, or Microsoft Azure Storage.

For all of those destinations and many more, we offer [dedicated export Robots](/docs/robots/#service-file-exporting). For example, if you want to export your encoding results to AWS S3, you can use [🤖/s3/store](/docs/robots/#s3-store) like so:
`,
  }),
  'missing-original-storage': (): LintMessage => ({
    simple: 'The uploaded files are not stored for later reprocessing',
    text: 'The uploaded files are not stored for later reprocessing',
    desc: `
Transloadit stores the uploaded files of your _Assemblies_ for only 24 hours on its own servers at \`tmp.transloadit.com\`. After this period, the files will not be available from these locations anymore. Storing not only the encoded result files but also the files that your users originally uploaded gives you the chance to re-encode them later into different formats as your requirements change. If you do not store them, they are lost forever, as asking your users to upload them again is likely not an option.

In order to store the uploaded files, you can add the \`:original\` _Step_ to the \`use\` parameter in your storage _Step_.
`,
  }),
  'empty-use-array': (result: StepNameResult): LintMessage => ({
    simple: `The "use" array is empty`,
    text: 'The `use` array is empty',
    desc: `
The \`use\` parameter can be a string, an object, or an array. If it is an array, the _Step_ \`${result.stepName}\` will use the output of all _Steps_ that are referenced in the \`use\` parameter as its input. In following example, the \`exported\` _Step_ uses the output files from the \`crop_thumbed\` and the \`:original\` _Steps_:
`,
  }),
  'infinite-assembly': (result: StepNameResult): LintMessage => ({
    simple: `This "use" parameter creates an infinite loop`,
    text: 'The `use` parameter creates an infinite loop',
    desc: `
The \`use\` parameter used in _Step_ \`${result.stepName}\` creates an infinite _Assembly_ execution loop. The _Assembly_ will error upon execution. Please make sure that the \`use\` parameter does not create an infinite loop.
`,
  }),
  'invalid-json': (result: SchemaViolationResult): LintMessage => ({
    simple: result.message ?? 'Invalid JSON',
    text: result.message ?? 'Invalid JSON',
    desc: `
The _Assembly Instructions_ are written using JSON syntax, but the input above is not in a valid notation. Please consult the error on the editor's left hand side for more details.
`,
  }),
  'missing-ffmpeg-stack': (result: FfmpegResult): LintMessage => ({
    simple: `🤖${result.robot} should define the "ffmpeg_stack" parameter`,
    text: `🤖${result.robot} should define the \`ffmpeg_stack\` parameter`,
    desc: `
The \`ffmpeg_stack\` parameter specifies which version of the FFmpeg stack should be used for this _Step_. If this parameter is absent, your _Step_ will fall back to an older FFmpeg stack which might not support all the latest features. The current recommendation is to use \`${stackVersions.ffmpeg.recommendedVersion}\`. Other valid values can be found at ${result.isAudioRobot ? '[Audio Encoding Presets](/docs/presets/audio)' : '[Video Encoding Presets](/docs/presets/video/)'}.

Here is an example showcasing the \`ffmpeg_stack\` parameter:
`,
  }),
  'wrong-ffmpeg-version': (result: FfmpegVersionResult): LintMessage => ({
    simple: `Step "${result.stepName}" is using a nonexistent FFmpeg stack "${result.stackVersion}"`,
    text: `Step \`${result.stepName}\` is using a nonexistent FFmpeg stack \`${result.stackVersion}\``,
    desc: `
The \`ffmpeg_stack\` parameter defines which version of our internal FFmpeg stack should be used for a given _Step_. However, the \`ffmpeg_stack\` that you are referring to (\`${result.stackVersion}\`) does not exist. Please have a look at ${result.isAudioRobot ? '[Audio Encoding Presets](/docs/presets/audio)' : '[Video Encoding Presets](/docs/presets/video/)'} for a list of all available versions.

If you are unsure, we recommend using \`${stackVersions.ffmpeg.recommendedVersion}\`.
`,
  }),
  'missing-imagemagick-stack': (): LintMessage => ({
    simple: `The "imagemagick_stack" parameter is missing`,
    text: 'The `imagemagick_stack` parameter is missing',
    desc: `
The \`imagemagick_stack\` parameter specifies which version of the ImageMagick stack should be used for this _Step_. If this parameter is absent, your _Step_ will fall back to an older ImageMagick stack which might not support all the latest features. The current recommendation is to use \`${stackVersions.imagemagick.recommendedVersion}\`. Other valid values can be found at [Supported Image Formats](/docs/supported-formats/#image-formats).

Here is an example showcasing the \`imagemagick_stack\` parameter:
`,
  }),
  'wrong-imagemagick-version': (result: ImageMagickVersionResult): LintMessage => ({
    simple: `Step "${result.stepName}" is using a nonexistent ImageMagick stack "${result.stackVersion}"`,
    text: `Step \`${result.stepName}\` is using a nonexistent ImageMagick stack \`${result.stackVersion}\``,
    desc: `
The \`imagemagick_stack\` parameter defines which version of our internal ImageMagick stack should be used for a given _Step_. However, the \`imagemagick_stack\` that you are referring to (\`${result.stackVersion}\`) does not exist. Please have a look at [Supported Image Formats](/docs/supported-formats/#image-formats) for a list of all available versions.

If you are unsure, we recommend using \`${stackVersions.imagemagick.recommendedVersion}\`.
`,
  }),
  'unqualified-http-import-url': (result: StepNameResult): LintMessage => ({
    simple: `The /http/import url in Step "${result.stepName}" should start with a protocol and domain name`,
    text: `The \`url\` parameter in Step \`${result.stepName}\` should start with a protocol and domain name`,
    desc: `
When using the /http/import Robot, it's important to prefix any path variable with a full URL including the protocol, domain/bucket name, and optionally folder, in the \`url\` or \`path\` parameter. This ensures that Transloadit only imports files from intended sources and attackers can't just import from any source.

Signature Authentication can also help prevent this, but it's recommended to have layers of protection against this if you can.

Instead of using a relative URL or just a field variable like \`\${'{fields.input}'}\`, you should provide a complete URL. For example:

\`\`\`json
"${result.stepName}": {
  "robot": "/http/import",
  "url": "https://example.com/\${fields.input}"
}
\`\`\`

This practice helps prevent potential security issues by ensuring that files are only imported from specified domains.
`,
  }),
  'duplicate-key-in-step': (result: DuplicateKeyResult): LintMessage => ({
    simple: `Duplicate key(s) found${result.stepName ? ` in Step "${result.stepName}"` : ''}: ${result.duplicateKeys?.join(
      ', ',
    )}`,
    text: `Duplicate key(s) found${result.stepName ? ` in Step \`${result.stepName}\`` : ''}: \`${result.duplicateKeys?.join(', ')}\``,
    desc: `
Each key within an object must be unique. Duplicate keys can lead to unexpected behavior and may cause some settings to be overwritten.

Please remove or rename the duplicate key(s)${result.stepName ? ` in the _Step_ \`${result.stepName}\`` : ''} to ensure that each key is unique.
`,
  }),
  'smart-cdn-input-field-missing': (): LintMessage => ({
    simple: 'Smart CDN path component available as ${fields.input}',
    text: `You may have accidentally omitted the Smart CDN's \`\${'{fields.input}'}\` path component`,
    desc: `
When using Transloadit's Smart CDN with the 🤖 /file/serve Robot, the path component of the URL is automatically made available as \`\${'{fields.input}'}\`. For example, if your Smart CDN URL is \`https://my-app.tlcdn.com/img-preview/cities/amsterdam.jpg?w=400\`, then \`\${'{fields.input}'}\` would be set to \`/cities/amsterdam.jpg\`.

This is typically used to fetch the correct file from your storage bucket, before transforming and serving it. While the Smart CDN can be used in other ways, you may want to check if you accidentally omitted the \`\${'{fields.input}'}\` path component in your import _Step_. For example:

\`\`\`json
"imported": {
  "robot": "/http/import",
  "url": "https://example.com/\${fields.input}"
}
\`\`\`
`,
    example: `{
  "robot": "/file/serve",
  "url": "s3://my-bucket\${fields.input}"
}`,
  }),
}

const firstNonEmptyLine = (text: string): string | undefined =>
  text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

export const getLintIssueDescription = (issue: AssemblyLinterResult): string => {
  const message = linterMessages[issue.code](issue)
  return message.desc.trim()
}

export const getLintIssueSummary = (issue: AssemblyLinterResult): string => {
  if (issue.message) return issue.message
  const fromDesc = issue.desc ?? getLintIssueDescription(issue)
  return firstNonEmptyLine(fromDesc) ?? issue.code
}

export type HydratedLintIssue = AssemblyLinterResult & {
  desc: string
  summary: string
}

export const hydrateLintIssue = (issue: AssemblyLinterResult): HydratedLintIssue => {
  const desc = issue.desc ?? getLintIssueDescription(issue)
  const summary = getLintIssueSummary({ ...issue, desc })
  return { ...issue, desc, summary }
}

export const hydrateLintIssues = (issues: AssemblyLinterResult[]): HydratedLintIssue[] =>
  issues.map((issue) => hydrateLintIssue(issue))

export const formatLintIssue = (issue: AssemblyLinterResult): string => {
  const summary =
    'summary' in issue && typeof issue.summary === 'string'
      ? issue.summary
      : getLintIssueSummary(issue)
  const stepInfo = issue.stepName ? ` ${issue.stepName}` : ''
  return `[${issue.type}] ${issue.code} (${issue.row}:${issue.column})${stepInfo} ${summary}`
}
