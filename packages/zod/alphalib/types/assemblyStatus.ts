import { optionalWithV3Semantics } from '../lib/sdkZodOptional.ts'

import { z } from 'zod/v4'

import { errorReasonSchema } from './errorReason.ts'
import { fileAsSchema } from './file.ts'
import { storedAssetSchema } from './storageAsset.ts'

export const assemblyBusyCodeSchema = z.enum([
  'ASSEMBLY_UPLOADING',
  'ASSEMBLY_EXECUTING',
  'ASSEMBLY_REPLAYING',
])
export type AssemblyBusyCode = z.infer<typeof assemblyBusyCodeSchema>

export const assemblyStatusOkCodeSchema = z.enum([
  'ASSEMBLY_CANCELED',
  'ASSEMBLY_COMPLETED',
  'ASSEMBLY_EXECUTING',
  'ASSEMBLY_REPLAYING',
  'ASSEMBLY_UPLOADING',
  'REQUEST_ABORTED',
  // 'ASSEMBLY_EXECUTION_PROGRESS_FETCHED',
  // 'ASSEMBLY_FILE_ACCEPTED',
  // 'ASSEMBLY_FILE_RESERVED',
])
export type AssemblyStatusOkCode = z.infer<typeof assemblyStatusOkCodeSchema>

/** Runtime and stored errors, including historical codes omitted from API2's public catalog. */
export const assemblyStatusErrCodeSchema = z.enum([
  'ADMIN_PERMISSIONS_REQUIRED',
  'AI_CHAT_VALIDATION',
  'ASSEMBLY_ACCOUNT_MISMATCH',
  'ASSEMBLY_CANNOT_BE_REPLAYED',
  'ASSEMBLY_COULD_NOT_BE_CREATED',
  'ASSEMBLY_CRASHED',
  'ASSEMBLY_DISALLOWED_ROBOTS_USED',
  'ASSEMBLY_EMPTY_STEPS',
  'ASSEMBLY_EXECUTION_PROGRESS_NOT_ENABLED',
  'ASSEMBLY_EXPIRED',
  'ASSEMBLY_FILE_NOT_RESERVED',
  'ASSEMBLY_INFINITE',
  'ASSEMBLY_INSTANCE_NOT_FOUND',
  'ASSEMBLY_INVALID_NOTIFY_URL',
  'ASSEMBLY_INVALID_NUM_EXPECTED_UPLOAD_FILES_PARAM',
  'ASSEMBLY_INVALID_STEPS',
  'ASSEMBLY_JOB_ENQUEUE_ERROR',
  'ASSEMBLY_LIST_ERROR',
  'ASSEMBLY_MEMORY_LIMIT_EXCEEDED',
  'ASSEMBLY_NOTIFICATIONS_LIST_ERROR',
  'ASSEMBLY_NOTIFICATION_LIST_ERROR',
  'ASSEMBLY_NOTIFICATION_NOT_PERSISTED',
  'ASSEMBLY_NOTIFICATION_NOT_REPLAYED',
  'ASSEMBLY_NOT_CAPABLE',
  'ASSEMBLY_NOT_FINISHED',
  'ASSEMBLY_NOT_FOUND',
  'ASSEMBLY_NOT_REPLAYED',
  'ASSEMBLY_NO_CHARGEABLE_STEP',
  'ASSEMBLY_NO_NOTIFY_URL',
  'ASSEMBLY_NO_STEPS',
  'ASSEMBLY_PLAN_FILE_SIZE_LIMIT_EXCEEDED',
  'ASSEMBLY_ROBOT_MISSING',
  'ASSEMBLY_SATURATED',
  'ASSEMBLY_STATS_ERROR',
  'ASSEMBLY_STATS_INVALID_TIME',
  'ASSEMBLY_STATS_MISSING_REGION',
  'ASSEMBLY_STATUS_FETCHING_RATE_LIMIT_REACHED',
  'ASSEMBLY_STATUS_NOT_FOUND',
  'ASSEMBLY_STATUS_PARSE_ERROR',
  'ASSEMBLY_STEP_INVALID',
  'ASSEMBLY_STEP_INVALID_ROBOT',
  'ASSEMBLY_STEP_INVALID_USE',
  'ASSEMBLY_STEP_NO_ROBOT',
  'ASSEMBLY_STEP_UNKNOWN_ROBOT',
  'ASSEMBLY_STEP_UNKNOWN_USE',
  'ASSEMBLY_URL_TRANSFORM_MISSING',
  'AUDIO_ARTWORK_VALIDATION',
  'AUDIO_CONCAT_INVALID_INPUT',
  'AUDIO_CONCAT_VALIDATION',
  'AUDIO_ENCODE_VALIDATION',
  'AUDIO_LOOP_VALIDATION',
  'AUDIO_MERGE_VALIDATION',
  'AUDIO_SPLIT_NO_OUTPUT',
  'AUDIO_SPLIT_VALIDATION',
  'AUDIO_WAVEFORM_VALIDATION',
  'AUTH_EXPIRED',
  'AUTH_KEYS_NOT_FOUND',
  'AUTH_KEY_SCOPES_NOT_FOUND',
  'AUTH_SECRET_NOT_RETRIEVED',
  'AZURE_IMPORT_ACCESS_DENIED',
  'AZURE_IMPORT_FAILURE',
  'AZURE_IMPORT_NOT_FOUND',
  'AZURE_IMPORT_VALIDATION',
  'AZURE_STORE_ACCESS_DENIED',
  'AZURE_STORE_NOT_FOUND',
  'AZURE_STORE_VALIDATION',
  'BACKBLAZE_IMPORT_ACCESS_DENIED',
  'BACKBLAZE_IMPORT_FAILURE',
  'BACKBLAZE_IMPORT_NOT_FOUND',
  'BACKBLAZE_IMPORT_VALIDATION',
  'BACKBLAZE_STORE_ACCESS_DENIED',
  'BACKBLAZE_STORE_FAILURE',
  'BACKBLAZE_STORE_VALIDATION',
  'BAD_PRICING',
  'BEARER_TOKEN_AUTH_KEY_MISMATCH',
  'BEARER_TOKEN_EXPIRED',
  'BEARER_TOKEN_INVALID',
  'BILL_LIMIT_EXCEEDED',
  'BOX_IMPORT_ACCESS_DENIED',
  'BOX_IMPORT_FAILURE',
  'BOX_IMPORT_NOT_FOUND',
  'BOX_IMPORT_VALIDATION',
  'BOX_STORE_COULD_NOT_PARSE_URL',
  'BOX_STORE_VALIDATION',
  'CANNOT_ACCEPT_NEW_ASSEMBLIES',
  'CANNOT_FETCH_ACTIVE_ASSEMBLIES',
  'CDN_REQUIRED',
  'CLOUDFILES_IMPORT_ACCESS_DENIED',
  'CLOUDFILES_IMPORT_FAILURE',
  'CLOUDFILES_IMPORT_NOT_FOUND',
  'CLOUDFILES_IMPORT_VALIDATION',
  'CLOUDFILES_STORE_ACCESS_DENIED',
  'CLOUDFILES_STORE_ERROR',
  'CLOUDFILES_STORE_VALIDATION',
  'CLOUDFLARE_IMPORT_ACCESS_DENIED',
  'CLOUDFLARE_IMPORT_FAILURE',
  'CLOUDFLARE_IMPORT_NOT_FOUND',
  'CLOUDFLARE_IMPORT_VALIDATION',
  'CLOUDFLARE_STORE_ACCESS_DENIED',
  'CLOUDFLARE_STORE_NOT_FOUND',
  'CLOUDFLARE_STORE_URL_VERIFICATION_FAILURE',
  'CLOUDFLARE_STORE_VALIDATION',
  'CLOUDFLARE_STORE_WRONG_REGION',
  'CLOUD_AI_IMAGE_VALIDATION',
  'DAM_STORAGE_UNAVAILABLE',
  'DIGITALOCEAN_IMPORT_ACCESS_DENIED',
  'DIGITALOCEAN_IMPORT_FAILURE',
  'DIGITALOCEAN_IMPORT_NOT_FOUND',
  'DIGITALOCEAN_IMPORT_VALIDATION',
  'DIGITALOCEAN_STORE_ACCESS_DENIED',
  'DIGITALOCEAN_STORE_NOT_FOUND',
  'DIGITALOCEAN_STORE_VALIDATION',
  'DIGITALOCEAN_STORE_WRONG_REGION',
  'DOCUMENT_AUTOROTATE_VALIDATION',
  'DOCUMENT_CONVERT_UNSUPPORTED_CONVERSION',
  'DOCUMENT_CONVERT_VALIDATION',
  'DOCUMENT_EXTRACT_VALIDATION',
  'DOCUMENT_MERGE_UNSUPPORTED_CONVERSION',
  'DOCUMENT_MERGE_VALIDATION',
  'DOCUMENT_OCR_VALIDATION',
  'DOCUMENT_OPTIMIZE_UNSUPPORTED_INPUT',
  'DOCUMENT_OPTIMIZE_VALIDATION',
  'DOCUMENT_SPLIT_VALIDATION',
  'DOCUMENT_THUMBS_INVALID_INPUT',
  'DOCUMENT_THUMBS_VALIDATION',
  'DO_NOT_REUSE_ASSEMBLY_IDS',
  'DROPBOX_IMPORT_ACCESS_DENIED',
  'DROPBOX_IMPORT_FAILURE',
  'DROPBOX_IMPORT_NOT_FOUND',
  'DROPBOX_IMPORT_VALIDATION',
  'DROPBOX_STORE_COULD_NOT_PARSE_URL',
  'DROPBOX_STORE_VALIDATION',
  'FILE_COMPRESS_INVALID_INPUT',
  'FILE_COMPRESS_VALIDATION',
  'FILE_DECOMPRESS_INVALID_INPUT',
  'FILE_DECOMPRESS_PASSWORD_INCORRECT',
  'FILE_DECOMPRESS_PASSWORD_REQUIRED',
  'FILE_DECOMPRESS_VALIDATION',
  'FILE_DOWNLOAD_ERROR',
  'FILE_FILTER_DECLINED_FILE',
  'FILE_FILTER_INVALID_OPERATOR',
  'FILE_FILTER_VALIDATION',
  'FILE_HASH_VALIDATION',
  'FILE_META_DATA_ERROR',
  'FILE_PREVIEW_VALIDATION',
  'FILE_READ_VALIDATION_ERROR',
  'FILE_SERVE_NO_RESULT',
  'FILE_SERVE_VALIDATION',
  'FILE_VERIFY_INVALID_FILE',
  'FILE_VERIFY_VALIDATION',
  'FILE_VIRUSSCAN_DECLINED_FILE',
  'FILE_VIRUSSCAN_INVALID_INPUT',
  'FILE_VIRUSSCAN_VALIDATION',
  'FILE_WATERMARK_VALIDATION',
  'FTP_IMPORT_ACCESS_DENIED',
  'FTP_IMPORT_FAILURE',
  'FTP_IMPORT_NOT_FOUND',
  'FTP_IMPORT_VALIDATION',
  'FTP_STORE_VALIDATION',
  'GET_ACCOUNT_DB_ERROR',
  'GET_ACCOUNT_UNKNOWN_AUTH_KEY',
  'GOOGLE_IMPORT_ACCESS_DENIED',
  'GOOGLE_IMPORT_FAILURE',
  'GOOGLE_IMPORT_NOT_FOUND',
  'GOOGLE_IMPORT_VALIDATION',
  'GOOGLE_STORE_ACCESS_DENIED',
  'GOOGLE_STORE_INVALID_INPUT',
  'GOOGLE_STORE_VALIDATION',
  'HTML_CONVERT_VALIDATION',
  'HTTP_IMPORT_ACCESS_DENIED',
  'HTTP_IMPORT_FAILURE',
  'HTTP_IMPORT_NOT_FOUND',
  'HTTP_IMPORT_VALIDATION',
  'HTTP_REQUEST_FAILURE',
  'HTTP_REQUEST_VALIDATION',
  'IMAGE_BGREMOVE_VALIDATION',
  'IMAGE_COPYRIGHT_DETECT_DECLINED_FILE',
  'IMAGE_COPYRIGHT_DETECT_VALIDATION',
  'IMAGE_DESCRIBE_VALIDATION',
  'IMAGE_ENHANCE_NO_INPUT_FILE',
  'IMAGE_ENHANCE_VALIDATION',
  'IMAGE_FACEDETECT_VALIDATION',
  'IMAGE_GENERATE_VALIDATION',
  'IMAGE_MERGE_FAILURE',
  'IMAGE_MERGE_VALIDATION',
  'IMAGE_OCR_VALIDATION',
  'IMAGE_OPTIMIZE_VALIDATION',
  'IMAGE_RESIZE_ERROR',
  'IMAGE_RESIZE_INVALID_BLUR_REGION',
  'IMAGE_RESIZE_INVALID_TEXT_OBJECT_VALUE',
  'IMAGE_RESIZE_INVALID_TEXT_VALUE',
  'IMAGE_RESIZE_INVALID_WATERMARK_OFFSET',
  'IMAGE_RESIZE_INVALID_WATERMARK_POSITION',
  'IMAGE_RESIZE_NO_CLUT_FILE',
  'IMAGE_RESIZE_NO_INPUT_FILE',
  'IMAGE_RESIZE_VALIDATION',
  'IMAGE_UPSCALE_VALIDATION',
  'IMPORT_FILE_ERROR',
  'INCOMPLETE_PRICING',
  'INSUFFICIENT_AUTH_SCOPE',
  'INTERNAL_COMMAND_ERROR',
  'INTERNAL_COMMAND_TIMEOUT',
  'INVALID_ASSEMBLY_STATUS',
  'INVALID_AUTH_EXPIRES_PARAMETER',
  'INVALID_AUTH_KEY_PARAMETER',
  'INVALID_AUTH_MAX_NUMBER_OF_FILES_PARAMETER',
  'INVALID_AUTH_MAX_SIZE_PARAMETER',
  'INVALID_AUTH_REFERER_PARAMETER',
  'INVALID_FILE_META_DATA',
  'INVALID_FORM_DATA',
  'INVALID_INPUT_ERROR',
  'INVALID_PARAMS_FIELD',
  'INVALID_SIGNATURE',
  'INVALID_STEP_NAME',
  'INVALID_TEMPLATE_FIELD',
  'INVALID_UPLOAD_HANDLE_STEP_NAME',
  'INVALID_URL_ENCODING',
  'MAX_NUMBER_OF_FILES_EXCEEDED',
  'MAX_SIZE_EXCEEDED',
  'MEGA_IMPORT_ACCESS_DENIED',
  'MEGA_IMPORT_FAILURE',
  'MEGA_IMPORT_NOT_FOUND',
  'MEGA_IMPORT_VALIDATION',
  'MEGA_STORE_ACCESS_DENIED',
  'MEGA_STORE_NOT_FOUND',
  'MEGA_STORE_VALIDATION',
  'MEGA_STORE_WRONG_REGION',
  'META_WRITE_VALIDATION',
  'MINIO_IMPORT_ACCESS_DENIED',
  'MINIO_IMPORT_FAILURE',
  'MINIO_IMPORT_NOT_FOUND',
  'MINIO_IMPORT_VALIDATION',
  'MINIO_STORE_ACCESS_DENIED',
  'MINIO_STORE_NOT_FOUND',
  'MINIO_STORE_VALIDATION',
  'MINIO_STORE_WRONG_REGION',
  'NO_AUTH_EXPIRES_PARAMETER',
  'NO_AUTH_KEY_PARAMETER',
  'NO_AUTH_PARAMETER',
  'NO_COUNTRY',
  'NO_OBJECT_AUTH_PARAMETER',
  'NO_OBJECT_PARAMS_FIELD',
  'NO_PARAMS_FIELD',
  'NO_PRICING',
  'NO_RESULT_STEP_FOUND',
  'NO_RPC_RESULT_FROM_IMAGE_RESIZER',
  'NO_SIGNATURE_FIELD',
  'NO_TEMPLATE_ID',
  'PLAN_LIMIT_EXCEEDED',
  'POSSIBLY_MALICIOUS_FILE_FOUND',
  'PRIORITY_JOB_SLOTS_NOT_FOUND',
  'PRIORITY_JOB_SLOT_STATS_ERROR',
  'PRIORITY_JOB_SLOT_STATS_INVALID_AGGREGATION',
  'PRIORITY_JOB_SLOT_STATS_INVALID_TIME',
  'PRIORITY_JOB_SLOT_STATS_MISSING_REGION',
  'PROGRESS_SIMULATE_VALIDATION',
  'RATE_LIMIT_REACHED',
  'REFERER_MISMATCH',
  'REQUEST_PREMATURE_CLOSED',
  'ROBOT_VALIDATION_BASE_ERROR',
  'S3_ACCESS_DENIED',
  'S3_IMPORT_ACCESS_DENIED',
  'S3_IMPORT_FAILURE',
  'S3_IMPORT_NOT_FOUND',
  'S3_IMPORT_VALIDATION',
  'S3_NOT_FOUND',
  'S3_STORE_ACCESS_DENIED',
  'S3_STORE_FAILURE',
  'S3_STORE_NOT_FOUND',
  'S3_STORE_URL_VERIFICATION_FAILURE',
  'S3_STORE_VALIDATION',
  'S3_STORE_WRONG_REGION',
  'S3_WRONG_REGION',
  'SCRIPT_RUN_VALIDATION',
  'SERVER_403',
  'SERVER_404',
  'SERVER_500',
  'SFTP_IMPORT_ACCESS_DENIED',
  'SFTP_IMPORT_FAILURE',
  'SFTP_IMPORT_NOT_FOUND',
  'SFTP_IMPORT_VALIDATION',
  'SFTP_STORE_VALIDATION',
  'SIGNATURE_REUSE_DETECTED',
  'SLOT_COUNTS_ERROR',
  'SLOT_COUNT_ERROR',
  'SLOT_COUNT_MISSING_PARAMS',
  'SPEECH_TRANSCRIBE_VALIDATION',
  'STORAGE_GRANT_NOT_CREATED',
  'SUPABASE_IMPORT_ACCESS_DENIED',
  'SUPABASE_IMPORT_FAILURE',
  'SUPABASE_IMPORT_NOT_FOUND',
  'SUPABASE_IMPORT_VALIDATION',
  'SUPABASE_STORE_ACCESS_DENIED',
  'SUPABASE_STORE_NOT_FOUND',
  'SUPABASE_STORE_VALIDATION',
  'SUPABASE_STORE_WRONG_REGION',
  'SWIFT_IMPORT_ACCESS_DENIED',
  'SWIFT_IMPORT_FAILURE',
  'SWIFT_IMPORT_NOT_FOUND',
  'SWIFT_IMPORT_VALIDATION',
  'SWIFT_STORE_ACCESS_DENIED',
  'SWIFT_STORE_NOT_FOUND',
  'SWIFT_STORE_VALIDATION',
  'SWIFT_STORE_WRONG_REGION',
  'TEMPLATE_CREDENTIALS_INJECTION_ERROR',
  'TEMPLATE_DB_ERROR',
  'TEMPLATE_DENIES_STEPS_OVERRIDE',
  'TEMPLATE_INVALID_JSON',
  'TEMPLATE_NOT_FOUND',
  'TEXT_SPEAK_VALIDATION',
  'TEXT_TRANSLATE_VALIDATION',
  'TIGRIS_IMPORT_ACCESS_DENIED',
  'TIGRIS_IMPORT_FAILURE',
  'TIGRIS_IMPORT_NOT_FOUND',
  'TIGRIS_IMPORT_VALIDATION',
  'TIGRIS_STORE_ACCESS_DENIED',
  'TIGRIS_STORE_NOT_FOUND',
  'TIGRIS_STORE_VALIDATION',
  'TIGRIS_STORE_WRONG_REGION',
  'TMP_FILE_DOWNLOAD_ERROR',
  'TOKEN_INVALID_CREDENTIALS',
  'TRANSIENT_STORAGE_SERVICE_ERROR',
  'TRANSLOADIT_IMPORT_ACCESS_DENIED',
  'TRANSLOADIT_IMPORT_FAILURE',
  'TRANSLOADIT_IMPORT_NOT_FOUND',
  'TRANSLOADIT_IMPORT_VALIDATION',
  'TRANSLOADIT_STORE_CONFLICT',
  'TRANSLOADIT_STORE_FAILURE',
  'TRANSLOADIT_STORE_UNAVAILABLE',
  'TRANSLOADIT_STORE_VALIDATION',
  'TUS_STORE_VALIDATION',
  'USER_COMMAND_ERROR',
  'VERIFIED_EMAIL_REQUIRED',
  'VIDEO_ADAPTIVE_VALIDATION',
  'VIDEO_ARTWORK_VALIDATION',
  'VIDEO_CONCAT_INVALID_INPUT',
  'VIDEO_CONCAT_NO_OUTPUT',
  'VIDEO_CONCAT_VALIDATION',
  'VIDEO_ENCODE_INVALID_VIDEO_CODEC',
  'VIDEO_ENCODE_INVALID_WATERMARK_POSITION',
  'VIDEO_ENCODE_VALIDATION',
  'VIDEO_GENERATE_VALIDATION',
  'VIDEO_MERGE_NO_IMAGE_FOUND',
  'VIDEO_MERGE_VALIDATION',
  'VIDEO_ONDEMAND_NOT_FOUND',
  'VIDEO_ONDEMAND_VALIDATION',
  'VIDEO_SPLIT_NO_OUTPUT',
  'VIDEO_SPLIT_VALIDATION',
  'VIDEO_SUBTITLE_VALIDATION',
  'VIDEO_THUMBS_INVALID_COUNT_VALUE',
  'VIDEO_THUMBS_INVALID_FORMAT',
  'VIDEO_THUMBS_INVALID_INPUT',
  'VIDEO_THUMBS_VALIDATION',
  'VIMEO_IMPORT_ACCESS_DENIED',
  'VIMEO_IMPORT_FAILURE',
  'VIMEO_IMPORT_NOT_FOUND',
  'VIMEO_IMPORT_VALIDATION',
  'VIMEO_STORE_ACCESS_DENIED',
  'VIMEO_STORE_PROBLEM_SENDING_FILE',
  'VIMEO_STORE_VALIDATION',
  'WASABI_IMPORT_ACCESS_DENIED',
  'WASABI_IMPORT_FAILURE',
  'WASABI_IMPORT_NOT_FOUND',
  'WASABI_IMPORT_VALIDATION',
  'WASABI_STORE_ACCESS_DENIED',
  'WASABI_STORE_NOT_FOUND',
  'WASABI_STORE_VALIDATION',
  'WASABI_STORE_WRONG_REGION',
  'WORKER_JOB_ERROR',
  'YOUTUBE_STORE_PROBLEM_SENDING_FILE',
  'YOUTUBE_STORE_VALIDATION',
])
export type AssemblyStatusErrCode = z.infer<typeof assemblyStatusErrCodeSchema>

const metadataTextSchema = z.union([z.string(), z.number().finite()])
const metadataDateSchema = z.union([metadataTextSchema, z.array(metadataTextSchema)])
// Readers must survive new server errors; the exported known-code enum remains closed.
const publicAssemblyErrorCodeSchema = z.string().min(1)

const assemblyStatusMetaSchema = z
  .object({
    thumbhash: storedAssetSchema.shape.thumbhash,
    has_alpha: storedAssetSchema.shape.has_alpha,
    width: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    height: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    date_file_modified: optionalWithV3Semantics(metadataDateSchema.nullable()),
    aspect_ratio: optionalWithV3Semantics(z.union([z.number(), z.string(), z.null()])),
    has_clipping_path: optionalWithV3Semantics(z.boolean()),
    frame_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    colorspace: optionalWithV3Semantics(z.string().nullable()),
    has_transparency: optionalWithV3Semantics(z.boolean().nullable()),
    average_color: optionalWithV3Semantics(z.string().nullable()),
    svgViewBoxWidth: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    svgViewBoxHeight: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    date_recorded: optionalWithV3Semantics(metadataDateSchema.nullable()),
    date_file_created: optionalWithV3Semantics(metadataDateSchema.nullable()),
    title: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    description: optionalWithV3Semantics(metadataTextSchema.nullable()),
    duration: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    location: optionalWithV3Semantics(z.string().nullable()),
    city: optionalWithV3Semantics(z.string().nullable()),
    state: optionalWithV3Semantics(metadataTextSchema.nullable()),
    rights: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    country: optionalWithV3Semantics(z.string().nullable()),
    country_code: optionalWithV3Semantics(z.string().nullable()),
    keywords: optionalWithV3Semantics(z
      .union([metadataTextSchema, z.array(z.union([z.string(), z.number(), z.boolean()]))])
      .nullable()
      ),
    aperture: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    exposure_compensation: optionalWithV3Semantics(z.union([z.number(), z.string()]).nullable()),
    exposure_mode: optionalWithV3Semantics(z.string().nullable()),
    exposure_time: optionalWithV3Semantics(z.union([z.number(), z.string()]).nullable()),
    flash: optionalWithV3Semantics(z.string().nullable()),
    focal_length: optionalWithV3Semantics(z.string().nullable()),
    f_number: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    iso: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    light_value: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    metering_mode: optionalWithV3Semantics(z.string().nullable()),
    shutter_speed: optionalWithV3Semantics(z.union([z.number(), z.string()]).nullable()),
    white_balance: optionalWithV3Semantics(z.string().nullable()),
    device_name: optionalWithV3Semantics(metadataTextSchema.nullable()),
    device_vendor: optionalWithV3Semantics(z.string().nullable()),
    device_software: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    latitude: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    longitude: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    orientation: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    creator: optionalWithV3Semantics(z.union([metadataTextSchema, z.array(z.string())]).nullable()),
    author: optionalWithV3Semantics(metadataTextSchema.nullable()),
    copyright: optionalWithV3Semantics(z
      .union([
        metadataTextSchema,
        z
          .object({
            licenses: z.array(z.unknown()),
            flagged: z.boolean(),
            max_confidence: z.number(),
            confidence_threshold: z.number(),
          })
          .catchall(z.unknown()),
      ])
      .nullable()
      ),
    copyright_notice: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    dominant_colors: optionalWithV3Semantics(z.array(z.string()).nullable()),
    xp_title: optionalWithV3Semantics(metadataTextSchema.nullable()),
    xp_comment: optionalWithV3Semantics(z.string().nullable()),
    xp_keywords: optionalWithV3Semantics(metadataTextSchema.nullable()),
    xp_subject: optionalWithV3Semantics(metadataTextSchema.nullable()),
    recognized_text: optionalWithV3Semantics(z
      .union([
        z.array(z.string()),
        z.array(
          z
            .object({
              text: z.string(),
              boundingPolygon: z.array(z.object({ x: z.number(), y: z.number() })),
            })
            .catchall(z.unknown()),
        ),
      ])
      ),
    descriptions: optionalWithV3Semantics(z
      .array(
        z.union([z.string(), z.object({ name: z.string(), confidence: z.number() }).catchall(z.unknown())]),
      )
      ),
    framerate: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    mean_volume: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    video_bitrate: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    overall_bitrate: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    video_codec: optionalWithV3Semantics(z.string().nullable()),
    audio_bitrate: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    audio_samplerate: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    audio_channels: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    audio_channel_layout: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    audio_sample_format: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    audio_profile: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    audio_codec: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    num_audio_streams: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    num_video_streams: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    num_subtitles: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    bit_depth: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    seekable: optionalWithV3Semantics(z.union([z.boolean(), z.null()])),
    interlaced: optionalWithV3Semantics(z.boolean().nullable()),
    field_order: optionalWithV3Semantics(z.string().nullable()),
    interlace_detection: optionalWithV3Semantics(z
      .object({
        sampled_frames: optionalWithV3Semantics(z.number()),
        tff: optionalWithV3Semantics(z.number()),
        bff: optionalWithV3Semantics(z.number()),
        progressive: optionalWithV3Semantics(z.number()),
        undetermined: optionalWithV3Semantics(z.number()),
        confidence: optionalWithV3Semantics(z.number()),
        method: optionalWithV3Semantics(z.string()),
        ffprobe_field_order: optionalWithV3Semantics(z.string().nullable()),
      })
      .catchall(z.unknown())
      .nullable()
      ),
    pixel_format: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    reference_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    time_base: optionalWithV3Semantics(z.union([z.string(), z.null()])),
    streams: optionalWithV3Semantics(z
      .union([
        z.object({
          video: optionalWithV3Semantics(z.array(z.unknown())),
          audio: optionalWithV3Semantics(z.array(z.unknown())),
          subtitle: optionalWithV3Semantics(z.array(z.unknown())),
        }),
        z.null(),
      ])
      ),
    rotation: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    album: optionalWithV3Semantics(metadataTextSchema.nullable()),
    comment: optionalWithV3Semantics(z.string().nullable()),
    year: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    encoding_profile: optionalWithV3Semantics(z.string().nullable()),
    encoding_level: optionalWithV3Semantics(z.string().nullable()),
    has_artwork: optionalWithV3Semantics(z.union([z.boolean(), z.null()])),
    has_alpha_channel: optionalWithV3Semantics(z.boolean().nullable()),
    beats_per_minute: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    genre: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    artist: optionalWithV3Semantics(metadataTextSchema.nullable()),
    performer: optionalWithV3Semantics(z.string().nullable()),
    lyrics: optionalWithV3Semantics(z.string().nullable()),
    band: optionalWithV3Semantics(z.string().nullable()),
    disc: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    track: optionalWithV3Semantics(z.union([z.string(), z.number()]).nullable()),
    turbo: optionalWithV3Semantics(z.boolean().nullable()),
    encoder: optionalWithV3Semantics(z.string().nullable()),
    thumb_index: optionalWithV3Semantics(z.number().nullable()),
    thumb_offset: optionalWithV3Semantics(z
      .preprocess((val) => (typeof val === 'string' ? Number.parseInt(val, 10) : val), z.number())
      .nullable()
      ),
    page_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    page_size: optionalWithV3Semantics(z.string().nullable()),
    producer: optionalWithV3Semantics(z.string().nullable()),
    create_date: optionalWithV3Semantics(metadataDateSchema.nullable()),
    modify_date: optionalWithV3Semantics(metadataDateSchema.nullable()),
    colortransfer: optionalWithV3Semantics(z.string().nullable()),
    colorprimaries: optionalWithV3Semantics(z.string().nullable()),
    archive_directory: optionalWithV3Semantics(z.string().nullable()),
    relative_path: optionalWithV3Semantics(z.string().nullable()),
    segment_index: optionalWithV3Semantics(z.number().nullable()),
    starts_at: optionalWithV3Semantics(z.string().nullable()),
    ends_at: optionalWithV3Semantics(z.string().nullable()),
    resolution: optionalWithV3Semantics(z.string().nullable()),
    bandwidth: optionalWithV3Semantics(z.number().nullable()),
    closed_captions: optionalWithV3Semantics(z.boolean().nullable()),
    codecs: optionalWithV3Semantics(z.string().nullable()),
    storage_url: optionalWithV3Semantics(z.string()),
    version_id: optionalWithV3Semantics(z.string()),
    faces: optionalWithV3Semantics(z
      .array(
        z
          .object({
            x1: z.number(),
            y1: z.number(),
            x2: z.number(),
            y2: z.number(),
            confidence: optionalWithV3Semantics(z.number()),
            width: z.number(),
            height: z.number(),
          })
          .catchall(z.unknown()),
      )
      .nullable()
      ),
    reason: optionalWithV3Semantics(z.string()),
    step: optionalWithV3Semantics(z.string()),
    previousStep: optionalWithV3Semantics(z.string()),
    exitCode: optionalWithV3Semantics(z.number().nullable()),
    exitSignal: optionalWithV3Semantics(z.string().nullable()),
    stdout: optionalWithV3Semantics(z.string()),
    stderr: optionalWithV3Semantics(z.string()),
    cmd: optionalWithV3Semantics(z.union([z.string(), z.array(z.union([z.string(), z.number()]))])),
    worker: optionalWithV3Semantics(z.string()),
    word_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    character_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    character_count_with_spaces: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    line_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
    paragraph_count: optionalWithV3Semantics(z.union([z.number(), z.null()])),
  })
  .catchall(z.unknown())
export type AssemblyStatusMeta = z.infer<typeof assemblyStatusMetaSchema>

// Need to export the schema itself for assemblyStatusForTests.ts
export { assemblyStatusMetaSchema }

const hlsNestedMetaSchema = z.object({
  relative_path: optionalWithV3Semantics(z.string()),
  duration: optionalWithV3Semantics(z.number()),
  width: optionalWithV3Semantics(z.number()),
  height: optionalWithV3Semantics(z.number()),
  framerate: optionalWithV3Semantics(z.number()),
  overall_bitrate: optionalWithV3Semantics(z.number()),
  aspect_ratio: optionalWithV3Semantics(z.number()),
  video_codec: optionalWithV3Semantics(z.string()),
  audio_samplerate: optionalWithV3Semantics(z.number()),
  audio_channels: optionalWithV3Semantics(z.number()),
  num_audio_streams: optionalWithV3Semantics(z.number()),
  audio_codec: optionalWithV3Semantics(z.string()),
  seekable: optionalWithV3Semantics(z.boolean()),
  date_file_modified: optionalWithV3Semantics(z.string()),
  encoding_profile: optionalWithV3Semantics(z.string()),
  encoding_level: optionalWithV3Semantics(z.string()),
  has_artwork: optionalWithV3Semantics(z.boolean()),
  has_alpha_channel: optionalWithV3Semantics(z.boolean()),
  version_id: optionalWithV3Semantics(z.string()),
})

const hlsPlaylistSchema = z.object({
  name: optionalWithV3Semantics(z.union([z.string(), z.number()])),
  content: optionalWithV3Semantics(z.string()),
  relative_path: optionalWithV3Semantics(z.string()),
  stream: optionalWithV3Semantics(z.string()),
  meta: optionalWithV3Semantics(hlsNestedMetaSchema),
})

export const assemblyStatusUploadSchema = z
  .object({
    id: z.string(),
    // Historical asset identifiers predate the canonical Storage catalog ID format.
    asset_id: optionalWithV3Semantics(z.string()),
    asset_version: optionalWithV3Semantics(z.number().finite()),
    version_id: optionalWithV3Semantics(storedAssetSchema.shape.version_id),
    workspace: optionalWithV3Semantics(storedAssetSchema.shape.workspace),
    sha256: storedAssetSchema.shape.sha256,
    thumbhash: storedAssetSchema.shape.thumbhash,
    has_alpha: storedAssetSchema.shape.has_alpha,
    name: z.string().nullable(),
    basename: z.string().nullable(),
    ext: z.string().nullable(),
    size: z.number(),
    mime: z.string().nullable(),
    type: z.string().nullable(),
    field: z.string().nullable(),
    // Persisted uploads predate several fields emitted by current uploaders.
    md5hash: optionalWithV3Semantics(z.string().nullable()),
    original_id: z.union([z.string(), z.array(z.string().nullable())]),
    original_basename: optionalWithV3Semantics(z.string().nullable()),
    original_name: optionalWithV3Semantics(z.string().nullable()),
    original_path: optionalWithV3Semantics(z.string()),
    original_md5hash: optionalWithV3Semantics(z.string().nullable()),
    from_batch_import: optionalWithV3Semantics(z.boolean()),
    is_tus_file: optionalWithV3Semantics(z.boolean()),
    tus_upload_url: optionalWithV3Semantics(z.string().nullable()),
    url: z.string().nullable(),
    ssl_url: optionalWithV3Semantics(z.string().nullable()),
    meta: assemblyStatusMetaSchema,
    user_meta: optionalWithV3Semantics(z.record(z.string(), z.unknown())),
    as: optionalWithV3Semantics(fileAsSchema),
    is_temp_url: optionalWithV3Semantics(z.boolean()),
    queue: optionalWithV3Semantics(z.string().nullable()),
    queue_time: optionalWithV3Semantics(z.number()),
    exec_time: optionalWithV3Semantics(z.number()),
    import_url: optionalWithV3Semantics(z.string()),
    cost: optionalWithV3Semantics(z.union([z.number(), z.null()])),
  })
  .catchall(z.unknown())
export type AssemblyStatusUpload = z.infer<typeof assemblyStatusUploadSchema>

// Reservations have an original ID before an upload ID or extracted metadata is available.
const assemblyStatusIntermediateUploadSchema = assemblyStatusUploadSchema
  .partial()
  .extend({ id: optionalWithV3Semantics(z.never()) })
  .required({ original_id: true })

export const assemblyStatusUploadsSchema = z.array(
  z.union([assemblyStatusUploadSchema, assemblyStatusIntermediateUploadSchema]),
)
export type AssemblyStatusUploads = z.infer<typeof assemblyStatusUploadsSchema>

export const assemblyStatusResultSchema = z
  .object({
    id: optionalWithV3Semantics(z.string()),
    asset_id: optionalWithV3Semantics(z.string()),
    asset_version: optionalWithV3Semantics(z.number().finite()),
    version_id: optionalWithV3Semantics(storedAssetSchema.shape.version_id),
    workspace: optionalWithV3Semantics(storedAssetSchema.shape.workspace),
    sha256: storedAssetSchema.shape.sha256,
    thumbhash: storedAssetSchema.shape.thumbhash,
    has_alpha: storedAssetSchema.shape.has_alpha,
    basename: optionalWithV3Semantics(z.string().nullable()),
    field: optionalWithV3Semantics(z.string().nullable()),
    md5hash: optionalWithV3Semantics(z.string().nullable()),
    original_id: optionalWithV3Semantics(z.union([z.string(), z.array(z.string().nullable())])),
    original_basename: optionalWithV3Semantics(z.string().nullable()),
    original_path: optionalWithV3Semantics(z.string().nullable()),
    original_md5hash: optionalWithV3Semantics(z.string().nullable()),
    from_batch_import: optionalWithV3Semantics(z.boolean()),
    is_tus_file: optionalWithV3Semantics(z.boolean()),
    tus_upload_url: optionalWithV3Semantics(z.string().nullable()),
    is_temp_url: optionalWithV3Semantics(z.boolean()),
    cost: optionalWithV3Semantics(z.number().nullable()),
    duration_human: optionalWithV3Semantics(z.string().nullable()),
    duration: optionalWithV3Semantics(z.number().nullable()),
    exec_time: optionalWithV3Semantics(z.number().nullable()),
    ext: optionalWithV3Semantics(z.string().nullable()),
    filepath: optionalWithV3Semantics(z.string().nullable()),
    path: optionalWithV3Semantics(z.string().nullable()),
    height: optionalWithV3Semantics(z.number().nullable()),
    meta: optionalWithV3Semantics(assemblyStatusMetaSchema.nullable()),
    mime: optionalWithV3Semantics(z.string().nullable()),
    name: optionalWithV3Semantics(z.string().nullable()),
    original_name: optionalWithV3Semantics(z.string().nullable()),
    preview: optionalWithV3Semantics(z.string().nullable()),
    queue_time: optionalWithV3Semantics(z.number().nullable()),
    queue: optionalWithV3Semantics(z.string().nullable()),
    size_human: optionalWithV3Semantics(z.string().nullable()),
    size: optionalWithV3Semantics(z.number().nullable()),
    ssl_url: optionalWithV3Semantics(z.string().nullable()),
    type: optionalWithV3Semantics(z.string().nullable()),
    url: optionalWithV3Semantics(z.string().nullable()),
    user_meta: optionalWithV3Semantics(z.record(z.string(), z.unknown()).nullable()),
    width: optionalWithV3Semantics(z.number().nullable()),
    as: optionalWithV3Semantics(fileAsSchema),
    queueTime: optionalWithV3Semantics(z.number().nullable()),
    execTime: optionalWithV3Semantics(z.number().nullable()),
    import_url: optionalWithV3Semantics(z.string()),
    signed_url: optionalWithV3Semantics(z.string()),
    signed_ssl_url: optionalWithV3Semantics(z.string()),
    ios_url: optionalWithV3Semantics(z.string()),
    streaming_url: optionalWithV3Semantics(z.string()),
    remote_path: optionalWithV3Semantics(z.string()),
    playlists: optionalWithV3Semantics(z.array(hlsPlaylistSchema)),
    hls_url: optionalWithV3Semantics(z.string()),
    forcedFileExt: optionalWithV3Semantics(z.string()),
    // Robot-specific metadata added at runtime by /vimeo/import
    vimeo: optionalWithV3Semantics(z
      .object({
        title: z.string(),
        uri: z.string(),
      })
      ),
  })
  .catchall(z.unknown())
export type AssemblyStatusResult = z.infer<typeof assemblyStatusResultSchema>

export const assemblyStatusResultsSchema = z.record(z.string(), z.array(assemblyStatusResultSchema))
export type AssemblyStatusResults = z.infer<typeof assemblyStatusResultsSchema>

// Define a more specific schema for debuginfo if its structure is known
export const debugInfoSchema = z
  .object({
    err: optionalWithV3Semantics(z.unknown()), // Or a more specific error type if known
    screenshot_ssl_url: optionalWithV3Semantics(z.string()),
    screenshot_filepath: optionalWithV3Semantics(z.string()),
    screenshot_s3_url: optionalWithV3Semantics(z.string()), // Add s3 URL field
    console_filepath: optionalWithV3Semantics(z.string()),
    console_ssl_url: optionalWithV3Semantics(z.string()), // Add console SSL URL field
    console_s3_url: optionalWithV3Semantics(z.string()), // Add console s3 URL field
  })
  .catchall(z.unknown())

export const assemblyStatusBaseSchema = z.object({
  message: optionalWithV3Semantics(z.string()),
  admin_cmd: optionalWithV3Semantics(z.unknown()),
  assemblyId: optionalWithV3Semantics(z.string()),
  assembly_id: optionalWithV3Semantics(z.string()),
  parent_id: optionalWithV3Semantics(z.string().nullable()),
  account_id: optionalWithV3Semantics(z.string().nullable()),
  account_name: optionalWithV3Semantics(z.string().nullable()),
  account_slug: optionalWithV3Semantics(z.string().nullable()),
  api_auth_key_id: optionalWithV3Semantics(z.string().nullable()),
  template_id: optionalWithV3Semantics(z.string().nullable()),
  template_name: optionalWithV3Semantics(z.string().nullable()),
  instance: optionalWithV3Semantics(z.string().nullable()),
  region: optionalWithV3Semantics(z.string()),
  assembly_url: optionalWithV3Semantics(z.string().nullable()),
  assembly_ssl_url: optionalWithV3Semantics(z.string().nullable()),
  uppyserver_url: optionalWithV3Semantics(z.string().nullable()),
  companion_url: optionalWithV3Semantics(z.string().nullable()),
  websocket_url: optionalWithV3Semantics(z.string().nullable()),
  update_stream_url: optionalWithV3Semantics(z.string().nullable()),
  tus_url: optionalWithV3Semantics(z.string()),
  bytes_received: optionalWithV3Semantics(z.number()),
  bytes_expected: optionalWithV3Semantics(z.number()),
  upload_duration: optionalWithV3Semantics(z.number()),
  client_agent: optionalWithV3Semantics(z.string().nullable()),
  client_ip: optionalWithV3Semantics(z.string().nullable()),
  client_referer: optionalWithV3Semantics(z.string().nullable()),
  transloadit_client: optionalWithV3Semantics(z.string().nullable()),
  start_date: optionalWithV3Semantics(z.string()),
  upload_meta_data_extracted: optionalWithV3Semantics(z.boolean()),
  warnings: optionalWithV3Semantics(z
    .array(
      z
        .object({ level: z.literal('notice').or(z.literal('warning')), msg: z.string() })
        .catchall(z.unknown()),
    )
    ),
  is_infinite: optionalWithV3Semantics(z.boolean()),
  error: optionalWithV3Semantics(z.undefined()),
  has_dupe_jobs: optionalWithV3Semantics(z.boolean()),
  execution_start: optionalWithV3Semantics(z.string().nullable()),
  execution_duration: optionalWithV3Semantics(z.number().nullable()),
  queue_duration: optionalWithV3Semantics(z.number()),
  jobs_queue_duration: optionalWithV3Semantics(z.number()),
  notify_start: optionalWithV3Semantics(z.string().nullable()),
  notify_url: optionalWithV3Semantics(z.string().nullable()),
  notify_status: optionalWithV3Semantics(z.string().nullable()),
  notify_response_code: optionalWithV3Semantics(z.number().nullable()),
  notify_response_data: optionalWithV3Semantics(z.string().nullable()),
  notify_error: optionalWithV3Semantics(z.string().nullable()),
  notify_duration: optionalWithV3Semantics(z.number().nullable()),
  last_job_completed: optionalWithV3Semantics(z.string().nullable()),
  fields: optionalWithV3Semantics(z.record(z.string(), z.unknown())),
  running_jobs: optionalWithV3Semantics(z.array(z.string())),
  bytes_usage: optionalWithV3Semantics(z.number().nullable()),
  usage_tags: optionalWithV3Semantics(z.string()),
  executing_jobs: optionalWithV3Semantics(z.array(z.string())),
  started_jobs: optionalWithV3Semantics(z.array(z.string())),
  parent_assembly_status: optionalWithV3Semantics(z.unknown().nullable()),
  params: optionalWithV3Semantics(z.string().nullable()),
  template: optionalWithV3Semantics(z.string().nullable()),
  merged_params: optionalWithV3Semantics(z.string().nullable()),
  num_input_files: optionalWithV3Semantics(z.number()),
  uploads: optionalWithV3Semantics(assemblyStatusUploadsSchema),
  results: optionalWithV3Semantics(assemblyStatusResultsSchema),
  build_id: optionalWithV3Semantics(z.string()),
  expected_tus_uploads: optionalWithV3Semantics(z.number()),
  started_tus_uploads: optionalWithV3Semantics(z.number()),
  finished_tus_uploads: optionalWithV3Semantics(z.number()),
  virusname: optionalWithV3Semantics(z.string()),
  tus_uploads: optionalWithV3Semantics(z
    .array(
      z
        .object({
          filename: z.string(),
          fieldname: z.string(),
          user_meta: optionalWithV3Semantics(z.record(z.string(), z.unknown())),
          size: z.number(),
          offset: z.number(),
          finished: z.boolean(),
          upload_url: z.string(),
          local_path: optionalWithV3Semantics(z.string()),
        })
        .catchall(z.unknown()),
    )
    ),
  debuginfo: optionalWithV3Semantics(debugInfoSchema),
  step: optionalWithV3Semantics(z.string()),
  previousStep: optionalWithV3Semantics(z.string()),
  worker: optionalWithV3Semantics(z.string()),
  info: optionalWithV3Semantics(z
    .object({
      retryIn: optionalWithV3Semantics(z.number()),
    })
    ),
  ignored_errors: optionalWithV3Semantics(z
    .array(
      z
        .object({
          step: optionalWithV3Semantics(z.string().nullable()),
          phase: optionalWithV3Semantics(z.string()),
          error: optionalWithV3Semantics(z.unknown()),
          message: optionalWithV3Semantics(z.string()),
        })
        .catchall(z.unknown()),
    )
    ),
  ignored_error_count: optionalWithV3Semantics(z.number()),
})

export type AssemblyStatusTusUpload = NonNullable<
  z.infer<typeof assemblyStatusBaseSchema>['tus_uploads']
>[number]

// Name the shared shape to keep declaration emission below TypeScript's serialization limit.
type AssemblyStatusVariant<Shape extends z.ZodRawShape> = ReturnType<
  ReturnType<typeof assemblyStatusBaseSchema.extend<Shape>>['passthrough']
>

export const assemblyStatusBusySchema: AssemblyStatusVariant<{
  ok: typeof assemblyBusyCodeSchema
}> = z
  .object({
    ok: assemblyBusyCodeSchema,
    // TODO: Does busy status also share base fields? Need example.
    // Assuming for now it might share some base fields but not all recursively?
    // Let's make it extend the *non-recursive* base for now.
  })
  .extend(assemblyStatusBaseSchema.shape)
  .catchall(z.unknown())

export const assemblyStatusOkSchema: AssemblyStatusVariant<{
  ok: typeof assemblyStatusOkCodeSchema
}> = assemblyStatusBaseSchema
  .extend({
    ok: assemblyStatusOkCodeSchema,
  })
  .catchall(z.unknown())

const assemblyStatusErrorFields = z.object({
  error: publicAssemblyErrorCodeSchema,
  ok: optionalWithV3Semantics(z.null()),
  retries: optionalWithV3Semantics(z.number()),
  numRetries: optionalWithV3Semantics(z.number()),
  reason: optionalWithV3Semantics(errorReasonSchema),
  step: optionalWithV3Semantics(z.string()),
  previousStep: optionalWithV3Semantics(z.string()),
  file: optionalWithV3Semantics(z.string()),
  name: optionalWithV3Semantics(z.string()),
  path: optionalWithV3Semantics(z.string()),
  exitCode: optionalWithV3Semantics(z.number().nullable()),
  exitSignal: optionalWithV3Semantics(z.string().nullable()),
  stdout: optionalWithV3Semantics(z.string()),
  stderr: optionalWithV3Semantics(z.string()),
  cmd: optionalWithV3Semantics(z.union([z.string(), z.array(z.union([z.string(), z.number()]))])),
  admin_cmd: optionalWithV3Semantics(z.union([z.string(), z.array(z.union([z.string(), z.number()]))])),
  is_private_address: optionalWithV3Semantics(z.boolean()),
  playwright_error_code: optionalWithV3Semantics(z.string()),
  url: optionalWithV3Semantics(z.string()),
  url_host: optionalWithV3Semantics(z.string().nullable()),
  worker: optionalWithV3Semantics(z.string()),
  headers: optionalWithV3Semantics(z.record(z.string(), z.unknown())),
  retryable: optionalWithV3Semantics(z.boolean()),
  response_code: optionalWithV3Semantics(z.number().finite().nullable()),
  err: optionalWithV3Semantics(z.unknown()),
})

export const assemblyStatusErrSchema: AssemblyStatusVariant<
  typeof assemblyStatusErrorFields.shape
> = assemblyStatusBaseSchema.extend(assemblyStatusErrorFields.shape).catchall(z.unknown())

export type AssemblyStatusError = z.infer<typeof assemblyStatusErrSchema>

// Represents a low-level system error not mapped to standard assembly errors.
// Happened in Assemblies:
// - 13ca71f3b8714859b48ec11e49be10f1
// - 14ef7ab868e84350b2c0b70c9f3b2df1
// - 83b21b12c30b416f82651464635f05f1
// - 9198732f03cf40adbf778ae28fd52ef1
// - dfa372cef24a420092f1be42af6d1df1
// - e975612bc76e4738b759d1b36bc527f1
// All for Workspace: 6f86325febd14de4bfb38cbd04ee1f39
const assemblyStatusSysErrFields = z.object({
  // No 'ok' or 'error' discriminator.
  errno: z.number(),
  code: z.string(),
  syscall: z.string(),
  path: optionalWithV3Semantics(z.string()),
})

export const assemblyStatusSysErrSchema: AssemblyStatusVariant<
  typeof assemblyStatusSysErrFields.shape
> = assemblyStatusBaseSchema.extend(assemblyStatusSysErrFields.shape).catchall(z.unknown())

// Final schema defined lazily to handle recursion
// We break up inference to avoid:
// error TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.
export const assemblyStatusSchema: z.ZodUnion<
  [
    typeof assemblyStatusBusySchema,
    typeof assemblyStatusOkSchema,
    typeof assemblyStatusErrSchema,
    typeof assemblyStatusSysErrSchema,
  ]
> = z.union([
  assemblyStatusBusySchema, // Use schema defined above
  assemblyStatusOkSchema, // Use schema defined above
  assemblyStatusErrSchema, // Use schema defined above
  assemblyStatusSysErrSchema, // Add the new system error state
])

export type AssemblyStatus = z.infer<typeof assemblyStatusSchema>

/**
 * Type guard to check if an assembly has an error.
 */
export function hasError(
  assembly: AssemblyStatus | undefined | null,
  // Keep known-code suggestions while matching future public response codes too.
  particularErrorCode?: AssemblyStatusErrCode | (string & {}),
): assembly is AssemblyStatusError {
  const errorExists =
    Boolean(assembly) && assembly != null && typeof assembly === 'object' && 'error' in assembly

  if (particularErrorCode !== undefined) {
    return errorExists && assembly.error === particularErrorCode
  }

  return errorExists
}

export function hasSpecificError(
  assembly: AssemblyStatus | null | undefined,
  errorType: string,
): boolean {
  if (!assembly) return false

  if (hasError(assembly) && assembly.error === errorType) {
    return true
  }

  if (typeof assembly === 'object' && assembly !== null && errorType in assembly) {
    const candidate = Reflect.get(assembly, errorType)
    return Boolean(candidate)
  }

  return false
}

/**
 * Type guard to check if an assembly has an ok status
 */
export function hasOk(
  assembly: AssemblyStatus | undefined | null,
  particularOkCode?: z.infer<typeof assemblyStatusOkCodeSchema>,
): assembly is AssemblyStatus & { ok: string } {
  const okExists =
    Boolean(assembly) && assembly != null && typeof assembly === 'object' && 'ok' in assembly

  if (particularOkCode) {
    return okExists && assembly.ok === particularOkCode
  }
  return okExists
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
 * Type guard to check if a status string is a busy (in-progress) state.
 */
export function isAssemblyBusyStatus(
  status: string | undefined | null,
): status is z.infer<typeof assemblyBusyCodeSchema> {
  return Boolean(status) && assemblyBusyCodeSchema.safeParse(status).success
}

/**
 * Type guard to check if a status string is an ok (non-error) state.
 */
export function isAssemblyOkStatus(
  status: string | undefined | null,
): status is z.infer<typeof assemblyStatusOkCodeSchema> {
  return Boolean(status) && assemblyStatusOkCodeSchema.safeParse(status).success
}

/**
 * Type guard to check if a status string is a known error code.
 */
export function isAssemblyErrorStatus(
  status: string | undefined | null,
): status is z.infer<typeof assemblyStatusErrCodeSchema> {
  return Boolean(status) && assemblyStatusErrCodeSchema.safeParse(status).success
}

/**
 * Type guard to check if an assembly matches the system error shape.
 */
export function isAssemblySysError(
  assembly: AssemblyStatus | undefined | null,
): assembly is z.infer<typeof assemblyStatusSysErrSchema> {
  return Boolean(assembly) && assemblyStatusSysErrSchema.safeParse(assembly).success
}

/**
 * Type guard to check if a status string is terminal (ok, but not busy).
 */
export function isAssemblyTerminalOkStatus(
  status: string | undefined | null,
): status is z.infer<typeof assemblyStatusOkCodeSchema> {
  return isAssemblyOkStatus(status) && !isAssemblyBusyStatus(status)
}

/**
 * Returns true if the assembly is in a busy (in-progress) state.
 */
export function isAssemblyBusy(assembly: AssemblyStatus | undefined | null): boolean {
  return isAssemblyBusyStatus(getOk(assembly))
}

/**
 * Returns true if the assembly is in a terminal ok state.
 */
export function isAssemblyTerminalOk(assembly: AssemblyStatus | undefined | null): boolean {
  return isAssemblyTerminalOkStatus(getOk(assembly))
}

/**
 * Returns true if the assembly has a terminal error state.
 */
export function isAssemblyTerminalError(assembly: AssemblyStatus | undefined | null): boolean {
  // getError() historically stringifies explicit undefined; classification needs the raw value.
  return (
    (hasError(assembly) && publicAssemblyErrorCodeSchema.safeParse(assembly.error).success) ||
    isAssemblySysError(assembly)
  )
}

/**
 * Returns true if the assembly is terminal (ok or error).
 */
export function isAssemblyTerminal(assembly: AssemblyStatus | undefined | null): boolean {
  return isAssemblyTerminalOk(assembly) || isAssemblyTerminalError(assembly)
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
    parent_id: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.parent_id),
    account_id: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.account_id.unwrap()),
    template_id: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.template_id),
    instance: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.instance.unwrap()),
    notify_url: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.notify_url),
    redirect_url: optionalWithV3Semantics(z.string().nullable()),
    files: optionalWithV3Semantics(z.string().nullable()), // JSON stringified list metadata; replay rows omit it
    warning_count: optionalWithV3Semantics(z.number()),
    execution_duration: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.execution_duration),
    execution_start: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.execution_start),
    region: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.region),
    num_input_files: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.num_input_files),
    bytes_usage: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.bytes_usage),
    bytes_expected: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.bytes_expected),
    bytes_received: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.bytes_received),
    upload_duration: optionalWithV3Semantics(assemblyStatusBaseSchema.shape.upload_duration),
    ok: optionalWithV3Semantics(assemblyStatusOkCodeSchema.nullable()),
    error: optionalWithV3Semantics(publicAssemblyErrorCodeSchema.nullable()),
    created: z.string(),
    created_ts: optionalWithV3Semantics(z.number()),
    template_name: optionalWithV3Semantics(z.string().nullable()),
  })
  .catchall(z.unknown())

export type AssemblyIndexItem = z.infer<typeof assemblyIndexItemSchema>

export const assemblyIndexSchema = z.array(assemblyIndexItemSchema)
export type AssemblyIndex = z.infer<typeof assemblyIndexSchema>
