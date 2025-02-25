import { z } from 'zod'

const assemblyStatusMetaSchema = z
  .object({
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    date_file_modified: z.string().optional(),
    aspect_ratio: z.union([z.number(), z.string()]).optional(),
    has_clipping_path: z.boolean().optional(),
    frame_count: z.number().optional(),
    colorspace: z.string().nullable().optional(),
    has_transparency: z.boolean().nullable().optional(),
    average_color: z.string().nullable().optional(),
    svgViewBoxWidth: z.number().nullable().optional(),
    svgViewBoxHeight: z.number().nullable().optional(),
    date_recorded: z.union([z.string(), z.number()]).nullable().optional(),
    date_file_created: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    location: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    rights: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    aperture: z.number().nullable().optional(),
    exposure_compensation: z.union([z.number(), z.string()]).nullable().optional(),
    exposure_mode: z.string().nullable().optional(),
    exposure_time: z.union([z.number(), z.string()]).nullable().optional(),
    flash: z.string().nullable().optional(),
    focal_length: z.string().nullable().optional(),
    f_number: z.number().nullable().optional(),
    iso: z.number().nullable().optional(),
    light_value: z.number().nullable().optional(),
    metering_mode: z.string().nullable().optional(),
    shutter_speed: z.union([z.number(), z.string()]).nullable().optional(),
    white_balance: z.string().nullable().optional(),
    device_name: z.string().nullable().optional(),
    device_vendor: z.string().nullable().optional(),
    device_software: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    orientation: z.string().nullable().optional(),
    creator: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    copyright: z.string().nullable().optional(),
    copyright_notice: z.string().nullable().optional(),
    dominant_colors: z.array(z.string()).nullable().optional(),
    xp_title: z.string().nullable().optional(),
    xp_comment: z.string().nullable().optional(),
    xp_keywords: z.string().nullable().optional(),
    xp_subject: z.string().nullable().optional(),
    recognized_text: z
      .array(
        z.object({
          text: z.string(),
          boundingPolygon: z.array(z.object({ x: z.number(), y: z.number() })),
        }),
      )
      .optional(),
    descriptions: z.array(z.string()).optional(),
    framerate: z.number().nullable().optional(),
    mean_volume: z.number().nullable().optional(),
    video_bitrate: z.number().nullable().optional(),
    overall_bitrate: z.number().nullable().optional(),
    video_codec: z.string().nullable().optional(),
    audio_bitrate: z.number().nullable().optional(),
    audio_samplerate: z.number().nullable().optional(),
    audio_channels: z.number().nullable().optional(),
    audio_codec: z.string().nullable().optional(),
    bit_depth: z.number().nullable().optional(),
    seekable: z.boolean().nullable().optional(),
    rotation: z.number().nullable().optional(),
    album: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    year: z.union([z.string(), z.number()]).nullable().optional(),
    encoding_profile: z.string().nullable().optional(),
    encoding_level: z.string().nullable().optional(),
    has_artwork: z.boolean().nullable().optional(),
    beats_per_minute: z.number().nullable().optional(),
    genre: z.string().nullable().optional(),
    artist: z.string().nullable().optional(),
    performer: z.string().nullable().optional(),
    lyrics: z.string().nullable().optional(),
    band: z.string().nullable().optional(),
    disc: z.string().nullable().optional(),
    track: z.union([z.string(), z.number()]).nullable().optional(),
    turbo: z.boolean().nullable().optional(),
    encoder: z.string().nullable().optional(),
    thumb_index: z.number().nullable().optional(),
    thumb_offset: z.number().nullable().optional(),
    page_count: z.number().nullable().optional(),
    page_size: z.string().nullable().optional(),
    producer: z.string().nullable().optional(),
    create_date: z.string().nullable().optional(),
    modify_date: z.string().nullable().optional(),
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
    faces: z
      .array(
        z.object({
          x1: z.number(),
          y1: z.number(),
          x2: z.number(),
          y2: z.number(),
          confidence: z.number().optional(),
          width: z.number(),
          height: z.number(),
        }),
      )
      .nullable()
      .optional(),
  })
  .passthrough()
export type AssemblyStatusMeta = z.infer<typeof assemblyStatusMetaSchema>

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
    md5hash: z.string(),
    original_id: z.string(),
    original_basename: z.string(),
    original_name: z.string(),
    original_path: z.string(),
    original_md5hash: z.string(),
    from_batch_import: z.boolean(),
    is_tus_file: z.boolean(),
    tus_upload_url: z.string().nullable(),
    url: z.string(),
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
    cost: z.number().nullable().optional(),
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
    md5hash: z.string().optional(),
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
  })
  .strict()
export type AssemblyStatusResult = z.infer<typeof assemblyStatusResultSchema>

export const assemblyStatusResultsSchema = z.record(z.array(assemblyStatusResultSchema))
export type AssemblyStatusResults = z.infer<typeof assemblyStatusResultsSchema>

export const assemblyStatusSchema = z
  .object({
    ok: z.string(),
    http_code: z.number().optional(),
    message: z.string(),
    assembly_id: z.string(),
    parent_id: z.string().nullable(),
    account_id: z.string(),
    account_name: z.string().optional(),
    account_slug: z.string().optional(),
    api_auth_key_id: z.string().nullable().optional(),
    assembly_ssl_url: z.string(),
    assembly_url: z.string(),
    build_id: z.string().optional(),
    bytes_expected: z.number(),
    bytes_received: z.number(),
    bytes_usage: z.number(),
    client_agent: z.string().nullable(),
    client_ip: z.string().nullable(),
    client_referer: z.string().nullable(),
    companion_url: z.string(),
    executing_jobs: z.array(z.string()),
    execution_duration: z.number(),
    execution_start: z.string(),
    fields: z.record(z.string()),
    has_dupe_jobs: z.boolean(),
    instance: z.string(),
    is_infinite: z.boolean(),
    jobs_queue_duration: z.number(),
    last_job_completed: z.string(),
    merged_params: z.string(),
    notify_duration: z.string().nullable(),
    notify_response_code: z.string().nullable(),
    notify_response_data: z.string().nullable().optional(),
    notify_start: z.string().nullable(),
    notify_url: z.string().nullable(),
    notify_status: z.string().nullable().optional(),
    params: z.string(),
    parent_assembly_status: z.string().nullable(),
    queue_duration: z.number(),
    region: z.string().optional(),
    running_jobs: z.array(z.string()),
    start_date: z.string(),
    started_jobs: z.array(z.string()),
    template_id: z.string().nullable(),
    template_name: z.string().nullable().optional(),
    template: z.string().nullable(),
    transloadit_client: z.string(),
    tus_url: z.string(),
    usage_tags: z.string().optional(),
    num_input_files: z.number().optional(),
    expected_tus_uploads: z.number().optional(),
    started_tus_uploads: z.number().optional(),
    finished_tus_uploads: z.number().optional(),
    tus_uploads: z
      .array(
        z.object({
          filename: z.string(),
          fieldname: z.string(),
          size: z.number(),
          offset: z.number(),
          finished: z.boolean(),
          upload_url: z.string(),
        }),
      )
      .optional(),
    update_stream_url: z.string().optional(),
    upload_duration: z.number(),
    upload_meta_data_extracted: z.boolean(),
    uppyserver_url: z.string(),
    warnings: z.array(
      z.object({
        level: z.literal('notice').or(z.literal('warning')),
        msg: z.string(),
      }),
    ),
    websocket_url: z.string(),
    uploads: assemblyStatusUploadsSchema,
    results: assemblyStatusResultsSchema,
  })
  .strict()
export type AssemblyStatus = z.infer<typeof assemblyStatusSchema>
