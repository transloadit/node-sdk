import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  aiProviderSchema,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      faces_detected: {
        robot: '/image/facedetect',
        use: ':original',
        crop: true,
        faces: 'each',
        crop_padding: '10px',
      },
    },
  },
  example_code_description:
    'Detect all faces in uploaded images, crop them, and save as separate images:',
  minimum_charge: 5242880,
  output_factor: 0.2,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence:
    'detects faces in images and can return either their coordinates or the faces themselves as new images',
  purpose_verb: 'detect',
  purpose_word: 'detect faces',
  purpose_words: 'Detect faces in images',
  service_slug: 'artificial-intelligence',
  slot_count: 20,
  title: 'Detect faces in images',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
  name: 'ImageFacedetectRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  minimumChargeUsd: 0.0013,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageFacedetectInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/facedetect').describe(`
You can specify padding around the extracted faces, tailoring the output for your needs.

This <dfn>Robot</dfn> works well together with [🤖/image/resize](/docs/robots/image-resize/) to bring the full power of resized and optimized images to your website or app.

<div class="alert alert-note">

**How to improve the accuracy:**

- Ensure that your pictures have the correct orientation. This <dfn>Robot</dfn> achieves the best performance when the faces in the image are oriented upright and not rotated.
- If the <dfn>Robot</dfn> detects objects other than a face, you can use \`"faces": "max-confidence"\` within your <dfn>Template</dfn> for selecting only the detection with the highest confidence.
- The number of returned detections can also be controlled using the \`min_confidence\` parameter. Increasing its value will yield less results but each with a higher confidence. Decreasing the value, on the other hand, will provide more results but may also include objects other than faces.

</div>
`),
    provider: aiProviderSchema.optional().describe(`
Which AI provider to leverage.

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.
`),
    crop: z
      .boolean()
      .default(false)
      .describe(`
Determine if the detected faces should be extracted. If this option is set to \`false\`, then the <dfn>Robot</dfn> returns the input image again, but with the coordinates of all detected faces attached to \`file.meta.faces\` in the result JSON. If this parameter is set to \`true\`, the <dfn>Robot</dfn> will output all detected faces as images.
`),
    crop_padding: z
      .string()
      .regex(/^\d+(px|%)$/)
      .default('5px')
      .describe(`
Specifies how much padding is added to the extracted face images if \`crop\` is set to \`true\`. Values can be in \`px\` (pixels) or \`%\` (percentage of the width and height of the particular face image).
`),
    format: z
      .enum(['jpg', 'png', 'preserve', 'tiff'])
      .default('preserve')
      .describe(`
Determines the output format of the extracted face images if \`crop\` is set to \`true\`.

The default value \`"preserve"\` means that the input image format is re-used.
`),
    min_confidence: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(70)
      .describe(`
Specifies the minimum confidence that a detected face must have. Only faces which have a higher confidence value than this threshold will be included in the result.
`),
    faces: z
      .union([z.enum(['each', 'group', 'max-confidence', 'max-size']), z.number().int()])
      .default('each')
      .describe(`
Determines which of the detected faces should be returned. Valid values are:

- \`"each"\` — each face is returned individually.
- \`"max-confidence"\` — only the face with the highest confidence value is returned.
- \`"max-size"\` — only the face with the largest area is returned.
- \`"group"\` — all detected faces are grouped together into one rectangle that contains all faces.
- any integer — the faces are sorted by their top-left corner and the integer determines the index of the returned face. Be aware the values are zero-indexed, meaning that \`faces: 0\` will return the first face. If no face for a given index exists, no output is produced.

For the following examples, the input image is:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-unsplash.jpg)

<br>

\`faces: "each"\` applied:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-0.jpg)
![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-1.jpg)

<br>

\`faces: "max-confidence"\` applied:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-1.jpg)

<br>

\`faces: "max-size"\` applied:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-1.jpg)

<br>

\`faces: "group"\` applied:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-group.jpg)

<br>

\`faces: 0\` applied:

![](/assets/images/abbas-malek-hosseini-22NnY93qaOk-face-0.jpg)
`),
  })
  .strict()

export const robotImageFacedetectInstructionsWithHiddenFieldsSchema =
  robotImageFacedetectInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotImageFacedetectInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageFacedetectInstructions = z.infer<
  typeof robotImageFacedetectInstructionsSchema
>
export type RobotImageFacedetectInstructionsWithHiddenFields = z.infer<
  typeof robotImageFacedetectInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageFacedetectInstructionsSchema = interpolateRobot(
  robotImageFacedetectInstructionsSchema,
)
export type InterpolatableRobotImageFacedetectInstructions =
  InterpolatableRobotImageFacedetectInstructionsInput

export type InterpolatableRobotImageFacedetectInstructionsInput = z.input<
  typeof interpolatableRobotImageFacedetectInstructionsSchema
>

export const interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotImageFacedetectInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotImageFacedetectInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageFacedetectInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema
>
