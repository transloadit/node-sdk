import { z } from 'zod'

const assemblyBusyCodeSchema = z.enum(['ASSEMBLY_UPLOADING'])

export const assemblyStatusOkCodeSchema = z.enum([
  'ASSEMBLY_COMPLETED',
  'REQUEST_ABORTED',
  'ASSEMBLY_CANCELED',
  'ASSEMBLY_EXECUTING',
])

export const assemblyStatusErrCodeSchema = z.enum([
  'INVALID_INPUT_ERROR',
  'FILE_FILTER_DECLINED_FILE',
  'INTERNAL_COMMAND_TIMEOUT',
  'FILE_META_DATA_ERROR',
  'INVALID_FILE_META_DATA',
  'INTERNAL_COMMAND_ERROR',
  'TEMPLATE_NOT_FOUND',
  'TEMPLATE_DENIES_STEPS_OVERRIDE',
  'NO_AUTH_EXPIRES_PARAMETER',
  'MAX_SIZE_EXCEEDED',
  'CLOUDFLARE_IMPORT_VALIDATION',
  'S3_NOT_FOUND',
  'IMPORT_FILE_ERROR',
  'USER_COMMAND_ERROR',
  'BACKBLAZE_STORE_FAILURE',
  'DOCUMENT_CONVERT_UNSUPPORTED_CONVERSION',
  'INVALID_SIGNATURE',
  'GOOGLE_STORE_VALIDATION',
  'FILE_FILTER_VALIDATION',
  'HTTP_IMPORT_ACCESS_DENIED',
  'TEMPLATE_CREDENTIALS_INJECTION_ERROR',
  'HTTP_IMPORT_VALIDATION',
  'ASSEMBLY_EXPIRED',
  'WORKER_JOB_ERROR',
  'ASSEMBLY_STEP_UNKNOWN_USE',
  'IMAGE_RESIZE_ERROR',
  'TMP_FILE_DOWNLOAD_ERROR',
  'ASSEMBLY_DISALLOWED_ROBOTS_USED',
  'FILE_PREVIEW_VALIDATION',
  'HTTP_IMPORT_NOT_FOUND',
  'HTML_CONVERT_VALIDATION',
  'HTTP_IMPORT_FAILURE',
  'IMAGE_RESIZE_VALIDATION',
  'GOOGLE_IMPORT_VALIDATION',
  'S3_STORE_ACCESS_DENIED',
  'S3_ACCESS_DENIED',
  'CLOUDFILES_STORE_ERROR',
])

// --- Define Main Meta Schema (remove HLS specific fields) ---
const assemblyStatusMetaSchema = z
  .object({
    width: z.union([z.number(), z.null()]).optional(),
    height: z.union([z.number(), z.null()]).optional(),
    date_file_modified: z.string().nullable().optional(),
    aspect_ratio: z.union([z.number(), z.string(), z.null()]).optional(),
    has_clipping_path: z.boolean().optional(),
    frame_count: z.union([z.number(), z.null()]).optional(),
    colorspace: z.string().nullable().optional(),
    has_transparency: z.boolean().nullable().optional(),
    average_color: z.string().nullable().optional(),
    svgViewBoxWidth: z.union([z.number(), z.null()]).optional(),
    svgViewBoxHeight: z.union([z.number(), z.null()]).optional(),
    date_recorded: z.union([z.string(), z.number()]).nullable().optional(),
    date_file_created: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    duration: z.union([z.number(), z.null()]).optional(),
    location: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    rights: z.union([z.string(), z.number()]).nullable().optional(),
    country: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    keywords: z
      .union([z.string(), z.array(z.union([z.string(), z.number()]))])
      .nullable()
      .optional(),
    aperture: z.union([z.number(), z.null()]).optional(),
    exposure_compensation: z.union([z.number(), z.string()]).nullable().optional(),
    exposure_mode: z.string().nullable().optional(),
    exposure_time: z.union([z.number(), z.string()]).nullable().optional(),
    flash: z.string().nullable().optional(),
    focal_length: z.string().nullable().optional(),
    f_number: z.union([z.number(), z.null()]).optional(),
    iso: z.union([z.number(), z.null()]).optional(),
    light_value: z.union([z.number(), z.null()]).optional(),
    metering_mode: z.string().nullable().optional(),
    shutter_speed: z.union([z.number(), z.string()]).nullable().optional(),
    white_balance: z.string().nullable().optional(),
    device_name: z.string().nullable().optional(),
    device_vendor: z.string().nullable().optional(),
    device_software: z.union([z.string(), z.number()]).nullable().optional(),
    latitude: z.union([z.number(), z.null()]).optional(),
    longitude: z.union([z.number(), z.null()]).optional(),
    orientation: z.string().nullable().optional(),
    creator: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    copyright: z.string().nullable().optional(),
    copyright_notice: z.union([z.string(), z.number()]).nullable().optional(),
    dominant_colors: z.array(z.string()).nullable().optional(),
    xp_title: z.string().nullable().optional(),
    xp_comment: z.string().nullable().optional(),
    xp_keywords: z.string().nullable().optional(),
    xp_subject: z.string().nullable().optional(),
    recognized_text: z
      .array(
        z
          .object({
            text: z.string(),
            boundingPolygon: z.array(z.object({ x: z.number(), y: z.number() })),
          })
          .strict(),
      )
      .optional(),
    descriptions: z
      .array(z.union([z.string(), z.object({ name: z.string(), confidence: z.number() }).strict()]))
      .optional(),
    framerate: z.union([z.number(), z.null()]).optional(),
    mean_volume: z.union([z.number(), z.null()]).optional(),
    video_bitrate: z.union([z.number(), z.null()]).optional(),
    overall_bitrate: z.union([z.number(), z.null()]).optional(),
    video_codec: z.string().nullable().optional(),
    audio_bitrate: z.union([z.number(), z.null()]).optional(),
    audio_samplerate: z.union([z.number(), z.null()]).optional(),
    audio_channels: z.union([z.number(), z.null()]).optional(),
    audio_codec: z.union([z.string(), z.null()]).optional(),
    num_audio_streams: z.number().optional(),
    bit_depth: z.union([z.number(), z.null()]).optional(),
    seekable: z.union([z.boolean(), z.null()]).optional(),
    rotation: z.union([z.number(), z.null()]).optional(),
    album: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    year: z.union([z.string(), z.number()]).nullable().optional(),
    encoding_profile: z.string().nullable().optional(),
    encoding_level: z.string().nullable().optional(),
    has_artwork: z.union([z.boolean(), z.null()]).optional(),
    has_alpha_channel: z.boolean().nullable().optional(),
    beats_per_minute: z.union([z.number(), z.null()]).optional(),
    genre: z.union([z.string(), z.number()]).nullable().optional(),
    artist: z.string().nullable().optional(),
    performer: z.string().nullable().optional(),
    lyrics: z.string().nullable().optional(),
    band: z.string().nullable().optional(),
    disc: z.union([z.string(), z.number()]).nullable().optional(),
    track: z.union([z.string(), z.number()]).nullable().optional(),
    turbo: z.boolean().nullable().optional(),
    encoder: z.string().nullable().optional(),
    thumb_index: z.number().nullable().optional(),
    thumb_offset: z
      .preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number())
      .nullable()
      .optional(),
    page_count: z.union([z.number(), z.null()]).optional(),
    page_size: z.string().nullable().optional(),
    producer: z.string().nullable().optional(),
    create_date: z.string().nullable().optional(),
    modify_date: z.union([z.string(), z.number()]).nullable().optional(),
    colortransfer: z.string().nullable().optional(),
    colorprimaries: z.string().nullable().optional(),
    archive_directory: z.string().nullable().optional(),
    relative_path: z.string().nullable().optional(),
    segment_index: z.number().nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    bandwidth: z.number().nullable().optional(),
    closed_captions: z.boolean().nullable().optional(),
    codecs: z.string().nullable().optional(),
    storage_url: z.string().optional(),
    version_id: z.string().optional(),
    faces: z
      .array(
        z
          .object({
            x1: z.number(),
            y1: z.number(),
            x2: z.number(),
            y2: z.number(),
            confidence: z.number().optional(),
            width: z.number(),
            height: z.number(),
          })
          .strict(),
      )
      .nullable()
      .optional(),
    reason: z.string().optional(),
    step: z.string().optional(),
    previousStep: z.string().optional(),
    exitCode: z.number().nullable().optional(),
    exitSignal: z.string().nullable().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    cmd: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
    worker: z.string().optional(),
    word_count: z.union([z.number(), z.null()]).optional(),
    character_count: z.union([z.number(), z.null()]).optional(),
    character_count_with_spaces: z.union([z.number(), z.null()]).optional(),
    line_count: z.union([z.number(), z.null()]).optional(),
    paragraph_count: z.union([z.number(), z.null()]).optional(),
  })
  .strict()
export type AssemblyStatusMeta = z.infer<typeof assemblyStatusMetaSchema>

// --- Define HLS Nested Meta Schema ---
const hlsNestedMetaSchema = z.object({
  relative_path: z.string().optional(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  framerate: z.number().optional(),
  overall_bitrate: z.number().optional(),
  aspect_ratio: z.number().optional(),
  video_codec: z.string().optional(),
  audio_samplerate: z.number().optional(),
  audio_channels: z.number().optional(),
  num_audio_streams: z.number().optional(),
  audio_codec: z.string().optional(),
  seekable: z.boolean().optional(),
  date_file_modified: z.string().optional(),
  encoding_profile: z.string().optional(),
  encoding_level: z.string().optional(),
  has_artwork: z.boolean().optional(),
  has_alpha_channel: z.boolean().optional(),
  version_id: z.string().optional(),
})
// --- End HLS Nested Meta Schema ---

// --- Define HLS Playlist Schema ---
const hlsPlaylistSchema = z.object({
  name: z.union([z.string(), z.number()]).optional(),
  content: z.string().optional(),
  relative_path: z.string().optional(),
  stream: z.string().optional(),
  meta: hlsNestedMetaSchema.optional(),
})
// --- End HLS Playlist Schema ---

const assemblyStatusUploadSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    basename: z.string(),
    ext: z.string(),
    size: z.number(),
    mime: z.string(),
    type: z.string().nullable(),
    field: z.string().nullable(),
    md5hash: z.string().nullable(),
    original_id: z.string(),
    original_basename: z.string(),
    original_name: z.string(),
    original_path: z.string(),
    original_md5hash: z.string().nullable(),
    from_batch_import: z.boolean(),
    is_tus_file: z.boolean(),
    tus_upload_url: z.string().nullable(),
    url: z.string().nullable(),
    ssl_url: z.string(),
    meta: assemblyStatusMetaSchema,
    user_meta: z.record(z.unknown()).optional(),
    as: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
    is_temp_url: z.boolean().optional(),
    queue: z.string().nullable().optional(),
    queue_time: z.number().optional(),
    exec_time: z.number().optional(),
    import_url: z.string().optional(),
    cost: z.union([z.number(), z.null()]).optional(),
  })
  .strict()
export type AssemblyStatusUpload = z.infer<typeof assemblyStatusUploadSchema>

export const assemblyStatusUploadsSchema = z.array(assemblyStatusUploadSchema)
export type AssemblyStatusUploads = z.infer<typeof assemblyStatusUploadsSchema>

export const assemblyStatusResultSchema = z
  .object({
    id: z.string().optional(),
    basename: z.string().nullable().optional(),
    field: z.string().nullable().optional(),
    md5hash: z.string().nullable().optional(),
    original_id: z.string().optional(),
    original_basename: z.string().nullable().optional(),
    original_path: z.string().nullable().optional(),
    original_md5hash: z.string().nullable().optional(),
    from_batch_import: z.boolean().optional(),
    is_tus_file: z.boolean().optional(),
    tus_upload_url: z.string().nullable().optional(),
    is_temp_url: z.boolean().optional(),
    cost: z.number().nullable().optional(),
    duration_human: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    exec_time: z.number().nullable().optional(),
    ext: z.string().nullable().optional(),
    filepath: z.string().nullable().optional(),
    path: z.string().optional(),
    height: z.number().nullable().optional(),
    meta: assemblyStatusMetaSchema.nullable().optional(),
    mime: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    original_name: z.string().nullable().optional(),
    preview: z.string().nullable().optional(),
    queue_time: z.number().nullable().optional(),
    queue: z.string().nullable().optional(),
    size_human: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    ssl_url: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    user_meta: z
      .record(z.union([z.string(), z.number()]))
      .nullable()
      .optional(),
    width: z.number().nullable().optional(),
    as: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
    queueTime: z.number().nullable().optional(),
    execTime: z.number().nullable().optional(),
    import_url: z.string().optional(),
    signed_url: z.string().optional(),
    signed_ssl_url: z.string().optional(),
    ios_url: z.string().optional(),
    streaming_url: z.string().optional(),
    remote_path: z.string().optional(),
    playlists: z.array(hlsPlaylistSchema).optional(),
    hls_url: z.string().optional(),
    forcedFileExt: z.string().optional(),
  })
  .strict()
export type AssemblyStatusResult = z.infer<typeof assemblyStatusResultSchema>

export const assemblyStatusResultsSchema = z.record(z.array(assemblyStatusResultSchema))
export type AssemblyStatusResults = z.infer<typeof assemblyStatusResultsSchema>

// --- Create Base Schema ---

const assemblyStatusBaseSchema = z.object({
  // Extracted fields from assemblyStatusOkSchema
  http_code: z.number().optional(),
  message: z.string().optional(),
  admin_cmd: z.unknown().optional(),
  assemblyId: z.string().optional(),
  assembly_id: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  account_id: z.string().optional(),
  account_name: z.string().optional(),
  account_slug: z.string().optional(),
  api_auth_key_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  template_name: z.string().nullable().optional(),
  instance: z.string().optional(),
  region: z.string().optional(),
  assembly_url: z.string().optional(),
  assembly_ssl_url: z.string().optional(),
  uppyserver_url: z.string().optional(),
  companion_url: z.string().optional(),
  websocket_url: z.string().optional(),
  update_stream_url: z.string().optional(),
  tus_url: z.string().optional(),
  bytes_received: z.number().optional(),
  bytes_expected: z.number().nullable().optional(),
  upload_duration: z.number().optional(),
  client_agent: z.string().nullable().optional(),
  client_ip: z.string().nullable().optional(),
  client_referer: z.string().nullable().optional(),
  transloadit_client: z.string().nullable().optional(),
  start_date: z.string().optional(),
  upload_meta_data_extracted: z.boolean().optional(),
  warnings: z
    .array(
      z.object({ level: z.literal('notice').or(z.literal('warning')), msg: z.string() }).strict(),
    )
    .optional(),
  is_infinite: z.boolean().optional(),
  has_dupe_jobs: z.boolean().optional(),
  execution_start: z.string().optional(),
  execution_duration: z.number().optional(),
  queue_duration: z.number().optional(),
  jobs_queue_duration: z.number().optional(),
  notify_start: z.string().nullable().optional(),
  notify_url: z.string().nullable().optional(),
  notify_status: z.string().nullable().optional(),
  notify_response_code: z.number().nullable().optional(),
  notify_response_data: z.string().nullable().optional(),
  notify_duration: z.number().nullable().optional(),
  last_job_completed: z.string().nullable().optional(),
  fields: z.record(z.unknown()).optional(),
  running_jobs: z.array(z.string()).optional(),
  bytes_usage: z.number().optional(),
  usage_tags: z.string().optional(),
  executing_jobs: z.array(z.string()).optional(),
  started_jobs: z.array(z.string()).optional(),
  parent_assembly_status: z.unknown().nullable().optional(),
  params: z.string().nullable().optional(),
  template: z.string().nullable().optional(),
  merged_params: z.string().nullable().optional(),
  num_input_files: z.number().optional(),
  uploads: assemblyStatusUploadsSchema.optional(),
  results: assemblyStatusResultsSchema.optional(),
  build_id: z.string().optional(),
  expected_tus_uploads: z.number().optional(),
  started_tus_uploads: z.number().optional(),
  finished_tus_uploads: z.number().optional(),
  tus_uploads: z
    .array(
      z
        .object({
          filename: z.string(),
          fieldname: z.string(),
          user_meta: z.record(z.unknown()).optional(),
          size: z.number(),
          offset: z.number(),
          finished: z.boolean(),
          upload_url: z.string(),
          local_path: z.string().optional(),
        })
        .strict(),
    )
    .optional(),
})
// --- End Base Schema ---

export const assemblyStatusBusySchema = z
  .object({
    ok: assemblyBusyCodeSchema,
    // TODO: Does busy status also share base fields? Need example.
    // Assuming for now it might share some base fields but not all recursively?
    // Let's make it extend the *non-recursive* base for now.
  })
  .extend(assemblyStatusBaseSchema.shape) // Extend with non-recursive base fields
  .strict()

// --- Refactor Ok Schema to use Base ---
export const assemblyStatusOkSchema = assemblyStatusBaseSchema // Use original base
  .extend({
    ok: assemblyStatusOkCodeSchema,
  })
  .strict()

// --- Refactor Err Schema to use Base ---
export const assemblyStatusErrSchema = assemblyStatusBaseSchema // Use ORIGINAL base
  .extend({
    error: assemblyStatusErrCodeSchema,
    retries: z.number().optional(),
    numRetries: z.number().optional(),
    reason: z.string().optional(),
    step: z.string().optional(),
    previousStep: z.string().optional(),
    path: z.string().optional(),
    exitCode: z.number().nullable().optional(),
    exitSignal: z.string().nullable().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    cmd: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
    worker: z.string().optional(),
    err: z.record(z.unknown()).optional(),
    headers: z.record(z.unknown()).optional(),
    retryable: z.boolean().optional(),
  })
  .strict() // Restore strict()

// --- Define Step Failed Schema ---
// Represents an error that occurred during a specific step,
// but isn't one of the predefined general error codes.
export const assemblyStatusStepFailedSchema = assemblyStatusBaseSchema // Use ORIGINAL base
  .extend({
    // No 'ok' or 'error' discriminator
    step: z.string(),
    previousStep: z.string(),
    worker: z.string(),
    // Message is optional in base, but seems required for this state
    message: z.string(),
  })
  .strict() // Restore strict()
// --- End Step Failed Schema ---

// --- Define System Error Schema ---
// Represents a low-level system error not mapped to standard assembly errors.
// Happened in Assemblies:
// - 13ca71f3b8714859b48ec11e49be10f1
// - 14ef7ab868e84350b2c0b70c9f3b2df1
// - 83b21b12c30b416f82651464635f05f1
// - 9198732f03cf40adbf778ae28fd52ef1
// - dfa372cef24a420092f1be42af6d1df1
// - e975612bc76e4738b759d1b36bc527f1
// All for Workspace: 6f86325febd14de4bfb38cbd04ee1f39
export const assemblyStatusSysErrSchema = assemblyStatusBaseSchema // Use ORIGINAL base
  .extend({
    // Changed from .object()
    // No 'ok' or 'error' discriminator
    errno: z.number(),
    code: z.string(),
    syscall: z.string(),
    path: z.string().optional(), // Path might be present
    // Consider adding other potential sys error fields if observed later
  })
  .passthrough() // SysErr can keep passthrough as it's inherently less defined
// --- End System Error Schema ---

// Final schema defined lazily to handle recursion
export const assemblyStatusSchema = z.union([
  assemblyStatusBusySchema, // Use schema defined above
  assemblyStatusOkSchema, // Use schema defined above
  assemblyStatusErrSchema, // Use schema defined above
  assemblyStatusStepFailedSchema, // Add the new step failed state
  assemblyStatusSysErrSchema, // Add the new system error state
])

export type AssemblyStatus = z.infer<typeof assemblyStatusSchema>

/**
 * Type guard to check if an assembly has an error
 */
export function hasError(
  assembly: AssemblyStatus | undefined | null,
): assembly is AssemblyStatus & { error: string } {
  return (
    Boolean(assembly) && assembly != null && typeof assembly === 'object' && 'error' in assembly
  )
}

/**
 * Type guard to check if an assembly has an ok status
 */
export function hasOk(
  assembly: AssemblyStatus | undefined | null,
): assembly is AssemblyStatus & { ok: string } {
  return Boolean(assembly) && assembly != null && typeof assembly === 'object' && 'ok' in assembly
}

/**
 * Returns the error value if it exists or undefined
 */
export function getError(assembly: AssemblyStatus | undefined | null): string | undefined {
  return assembly && assembly != null && typeof assembly === 'object' && 'error' in assembly
    ? String(assembly.error)
    : undefined
}

/**
 * Returns the ok value if it exists or undefined
 */
export function getOk(assembly: AssemblyStatus | undefined | null): string | undefined {
  return assembly && assembly != null && typeof assembly === 'object' && 'ok' in assembly
    ? String(assembly.ok)
    : undefined
}

/**
 * This type and these functions below are compatibility helpers for
 * working with partial assembly status objects during the transition
 * from the old types to the new Zod-based schema.
 */
export type PartialAssemblyStatus = Partial<AssemblyStatus>

export function hasErrorPartial(
  assembly: PartialAssemblyStatus | undefined | null,
): assembly is PartialAssemblyStatus & { error: string } {
  return (
    Boolean(assembly) &&
    assembly != null &&
    typeof assembly === 'object' &&
    'error' in assembly &&
    Boolean(assembly.error)
  )
}

export function hasOkPartial(
  assembly: PartialAssemblyStatus | undefined | null,
): assembly is PartialAssemblyStatus & { ok: string } {
  return (
    Boolean(assembly) &&
    assembly != null &&
    typeof assembly === 'object' &&
    'ok' in assembly &&
    Boolean(assembly.ok)
  )
}

// Schema for items returned by the List Assemblies endpoint
export const assemblyIndexItemSchema = z
  .object({
    id: z.string(), // Likely always present for a list item
    parent_id: assemblyStatusBaseSchema.shape.parent_id.optional(), // from base, made optional explicitly
    account_id: assemblyStatusBaseSchema.shape.account_id.unwrap().optional(), // from base (it's string().optional() so unwrap then optional)
    template_id: assemblyStatusBaseSchema.shape.template_id.optional(), // from base, made optional
    instance: assemblyStatusBaseSchema.shape.instance.unwrap().optional(), // from base
    notify_url: assemblyStatusBaseSchema.shape.notify_url.optional(), // from base
    redirect_url: z.string().nullable().optional(), // Specific to list item, was in old ListedAssembly
    files: z.string(), // JSON stringified, specific to list item
    warning_count: z.number().optional(), // Specific to list item
    execution_duration: assemblyStatusBaseSchema.shape.execution_duration.optional(), // from base
    execution_start: assemblyStatusBaseSchema.shape.execution_start.optional(), // from base
    ok: assemblyStatusOkCodeSchema.nullable().optional(), // Use exported enum
    error: assemblyStatusErrCodeSchema.nullable().optional(), // Use exported enum
    created: z.string(), // Specific to list item, mandatory based on old interface
  })
  .strict()

export type AssemblyIndexItem = z.infer<typeof assemblyIndexItemSchema>
