// Generated from API2 contract b6ab4439842519a0dbaeb315cee691cd71505800cda1609355486fa926bdf020. Do not edit.
import {
  ContractTransport,
  type ContractClientOptions,
  type UploadFile,
} from '../contractTransport.ts'
export { ContractResponseError } from '../contractTransport.ts'
export type { ContractClientOptions, UploadFile } from '../contractTransport.ts'
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type Wire1 = { nonce?: Wire2; region: Wire5; since: Wire6; template_id?: Wire7 }
type Wire2 = Wire3 | Wire4
type Wire3 = string
type Wire4 = number
type Wire5 = string
type Wire6 = string
type Wire7 = null | string
type Wire8 = {
  errorStats: Wire9
  errorStatsGranularity: Wire14
  errorStatsTotals: Wire15
  granularity: Wire19
  ok: Wire20
  stats: Wire21
  totalAssemblies: Wire45
  totalBytesProcessed: Wire46
  totalBytesUploaded: Wire47
  totalExecutionDuration: Wire48
  totalFilesProcessed: Wire49
  totalLiveQueueDuration: Wire50
  totalOutputBytesProcessed: Wire51
  totalOutputFilesProcessed: Wire52
  totalUploadDuration: Wire53
  totalUsage: Wire54
}
type Wire9 = Array<Wire10>
type Wire10 = { data_from_ts: Wire11; error: Wire12; num_erroneous_assemblies: Wire13 }
type Wire11 = number
type Wire12 = string
type Wire13 = number
type Wire14 = number
type Wire15 = Array<Wire16>
type Wire16 = { error: Wire17; num_erroneous_assemblies: Wire18 }
type Wire17 = string
type Wire18 = number
type Wire19 = number
type Wire20 = 'ASSEMBLY_STATS_FOUND'
type Wire21 = Array<Wire22>
type Wire22 = {
  avg_execution_duration: Wire23
  avg_input_file_sizes: Wire24
  avg_live_queue_duration: Wire25
  avg_output_file_sizes: Wire26
  avg_processing_speed: Wire27
  avg_upload_duration: Wire28
  avg_upload_speed: Wire29
  data_from_ts: Wire30
  num_assemblies: Wire31
  num_bytes: Wire32
  num_cancelled_assemblies: Wire33
  num_erroneous_assemblies: Wire34
  num_files: Wire35
  num_request_aborted_assemblies: Wire36
  num_successful_assemblies: Wire37
  total_bytes_usage: Wire38
  total_execution_duration: Wire39
  total_live_queue_duration: Wire40
  total_num_output_files: Wire41
  total_num_uploaded_bytes: Wire42
  total_output_file_sizes: Wire43
  total_upload_duration: Wire44
}
type Wire23 = number
type Wire24 = number
type Wire25 = number
type Wire26 = number
type Wire27 = number
type Wire28 = number
type Wire29 = number
type Wire30 = number
type Wire31 = number
type Wire32 = number
type Wire33 = number
type Wire34 = number
type Wire35 = number
type Wire36 = number
type Wire37 = number
type Wire38 = number
type Wire39 = number
type Wire40 = number
type Wire41 = number
type Wire42 = number
type Wire43 = number
type Wire44 = number
type Wire45 = number
type Wire46 = number
type Wire47 = number
type Wire48 = number
type Wire49 = number
type Wire50 = number
type Wire51 = number
type Wire52 = number
type Wire53 = number
type Wire54 = number
type Wire55 = Wire56 | Wire87 | Wire93
type Wire56 = Wire57 | Wire66
type Wire57 = Wire58 | Wire62
type Wire58 = {
  error: Wire59
  http_code?: Wire60
  message?: Wire61
  [key: string]: JsonValue | Wire59 | Wire60 | Wire61 | undefined
}
type Wire59 = 'ASSEMBLY_STATS_INVALID_TIME'
type Wire60 = 400
type Wire61 = string
type Wire62 = {
  error: Wire63
  http_code?: Wire64
  message?: Wire65
  [key: string]: JsonValue | Wire63 | Wire64 | Wire65 | undefined
}
type Wire63 = 'ASSEMBLY_STATS_MISSING_REGION'
type Wire64 = 400
type Wire65 = string
type Wire66 = Wire67
type Wire67 = {
  assembly_id?: Wire68
  error?: Wire69
  http_code?: Wire70
  message?: Wire73
  reason?: Wire74
  [key: string]: JsonValue | Wire68 | Wire69 | Wire70 | Wire73 | Wire74 | undefined
} & Wire83
type Wire68 = string
type Wire69 = string
type Wire70 = Wire71 | Wire72
type Wire71 = number
type Wire72 = string
type Wire73 = string
type Wire74 = Wire75 | Wire76 | Wire77 | Wire78 | Wire79 | Wire81
type Wire75 = null
type Wire76 = string
type Wire77 = number
type Wire78 = boolean
type Wire79 = Array<Wire80>
type Wire80 = JsonValue
type Wire81 = { [key: string]: Wire82 | undefined }
type Wire82 = JsonValue
type Wire83 = Wire84 | Wire85 | Wire86
type Wire84 = { error: JsonValue }
type Wire85 = { message: JsonValue }
type Wire86 = { reason: JsonValue }
type Wire87 = Wire88 | Wire92
type Wire88 = {
  error: Wire89
  http_code?: Wire90
  message?: Wire91
  [key: string]: JsonValue | Wire89 | Wire90 | Wire91 | undefined
}
type Wire89 = 'ASSEMBLY_STATS_ERROR'
type Wire90 = 500
type Wire91 = string
type Wire92 = Wire67
type Wire93 = Wire67
type Wire94 = { asset_ids: Wire95; nonce?: Wire97 }
type Wire95 = Array<Wire96>
type Wire96 = string
type Wire97 = Wire98 | Wire99
type Wire98 = string
type Wire99 = number
type Wire100 = { assets: Wire101; message: Wire106; ok: Wire107 }
type Wire101 = Array<Wire102>
type Wire102 = { asset_id: Wire103; deleted_at: Wire104 }
type Wire103 = string
type Wire104 = string & Wire105
type Wire105 = JsonValue
type Wire106 = string
type Wire107 = 'DAM_ASSETS_DELETED'
type Wire108 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire109 = Wire110 | Wire114
type Wire110 = {
  error: Wire111
  http_code?: Wire112
  message?: Wire113
  [key: string]: JsonValue | Wire111 | Wire112 | Wire113 | undefined
}
type Wire111 = 'DAM_INVALID_REQUEST'
type Wire112 = 400
type Wire113 = string
type Wire114 = Wire67
type Wire115 = Wire116 | Wire120
type Wire116 = {
  error: Wire117
  http_code?: Wire118
  message?: Wire119
  [key: string]: JsonValue | Wire117 | Wire118 | Wire119 | undefined
}
type Wire117 = 'DAM_RESOURCE_NOT_FOUND'
type Wire118 = 404
type Wire119 = string
type Wire120 = Wire67
type Wire121 = Wire122 | Wire126
type Wire122 = {
  error: Wire123
  http_code?: Wire124
  message?: Wire125
  [key: string]: JsonValue | Wire123 | Wire124 | Wire125 | undefined
}
type Wire123 = 'DAM_MUTATION_CONFLICT'
type Wire124 = 409
type Wire125 = string
type Wire126 = Wire67
type Wire127 = Wire128 | Wire132
type Wire128 = {
  error: Wire129
  http_code?: Wire130
  message?: Wire131
  [key: string]: JsonValue | Wire129 | Wire130 | Wire131 | undefined
}
type Wire129 = 'DAM_MUTATION_FAILED'
type Wire130 = 500
type Wire131 = string
type Wire132 = Wire67
type Wire133 = { asset_ids: Wire134; destination_folder_id: Wire136; nonce?: Wire139 }
type Wire134 = Array<Wire135>
type Wire135 = string
type Wire136 = Wire137 | Wire138
type Wire137 = string
type Wire138 = null
type Wire139 = Wire140 | Wire141
type Wire140 = string
type Wire141 = number
type Wire142 = { assets: Wire143; message: Wire168; ok: Wire169 }
type Wire143 = Array<Wire144>
type Wire144 = {
  asset: Wire145
  asset_id: Wire158
  deleted_at: Wire159
  filename: Wire163
  folder_id: Wire164
  path: Wire167
  updated_at: Wire160
}
type Wire145 = {
  asset_id: Wire146
  has_alpha?: Wire147
  height?: Wire148
  md5hash?: Wire149
  mime: Wire150
  path: Wire151
  sha256?: Wire152
  size: Wire153
  thumbhash?: Wire154
  version_id: Wire155
  width?: Wire156
  workspace: Wire157
  [key: string]:
    | JsonValue
    | Wire146
    | Wire147
    | Wire148
    | Wire149
    | Wire150
    | Wire151
    | Wire152
    | Wire153
    | Wire154
    | Wire155
    | Wire156
    | Wire157
    | undefined
}
type Wire146 = string
type Wire147 = boolean
type Wire148 = number
type Wire149 = string
type Wire150 = null | string
type Wire151 = string
type Wire152 = string
type Wire153 = number
type Wire154 = string
type Wire155 = string
type Wire156 = number
type Wire157 = string
type Wire158 = string
type Wire159 = Wire160 | Wire162
type Wire160 = string & Wire161
type Wire161 = JsonValue
type Wire162 = null
type Wire163 = string
type Wire164 = Wire165 | Wire166
type Wire165 = string
type Wire166 = null
type Wire167 = string
type Wire168 = string
type Wire169 = 'DAM_ASSETS_MOVED'
type Wire170 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire171 = Wire172 | Wire1147 | Wire1219
type Wire172 = {
  account_id?: Wire173
  account_name?: Wire174
  account_slug?: Wire175
  api_auth_key_id?: Wire176
  assemblyId?: Wire177
  assembly_id?: Wire178
  assembly_ssl_url?: Wire179
  assembly_url?: Wire180
  build_id?: Wire181
  bytes_expected?: Wire182
  bytes_received?: Wire183
  bytes_usage?: Wire184
  client_agent?: Wire187
  client_ip?: Wire188
  client_referer?: Wire189
  companion_url?: Wire190
  error?: Wire191
  executing_jobs?: Wire192
  execution_duration?: Wire194
  execution_start?: Wire197
  expected_tus_uploads?: Wire198
  fields?: Wire199
  finished_tus_uploads?: Wire201
  has_dupe_jobs?: Wire202
  ignored_error_count?: Wire203
  ignored_errors?: Wire204
  info?: Wire210
  instance?: Wire212
  is_infinite?: Wire213
  jobs_queue_duration?: Wire214
  last_job_completed?: Wire215
  merged_params?: Wire216
  message?: Wire217
  notify_duration?: Wire218
  notify_error?: Wire221
  notify_response_code?: Wire222
  notify_response_data?: Wire225
  notify_start?: Wire226
  notify_status?: Wire227
  notify_url?: Wire228
  num_input_files?: Wire229
  ok: Wire230
  params?: Wire231
  parent_assembly_status?: Wire232
  parent_id?: Wire235
  previousStep?: Wire236
  queue_duration?: Wire237
  region?: Wire238
  results?: Wire239
  running_jobs?: Wire732
  start_date?: Wire734
  started_jobs?: Wire735
  started_tus_uploads?: Wire737
  step?: Wire738
  template?: Wire739
  template_id?: Wire740
  template_name?: Wire741
  transloadit_client?: Wire742
  tus_uploads?: Wire743
  tus_url?: Wire753
  update_stream_url?: Wire754
  upload_duration?: Wire755
  upload_meta_data_extracted?: Wire756
  uploads?: Wire757
  uppyserver_url?: Wire1135
  usage_tags?: Wire1136
  virusname?: Wire1137
  warnings?: Wire1138
  websocket_url?: Wire1146
  [key: string]:
    | JsonValue
    | Wire173
    | Wire174
    | Wire175
    | Wire176
    | Wire177
    | Wire178
    | Wire179
    | Wire180
    | Wire181
    | Wire182
    | Wire183
    | Wire184
    | Wire187
    | Wire188
    | Wire189
    | Wire190
    | Wire191
    | Wire192
    | Wire194
    | Wire197
    | Wire198
    | Wire199
    | Wire201
    | Wire202
    | Wire203
    | Wire204
    | Wire210
    | Wire212
    | Wire213
    | Wire214
    | Wire215
    | Wire216
    | Wire217
    | Wire218
    | Wire221
    | Wire222
    | Wire225
    | Wire226
    | Wire227
    | Wire228
    | Wire229
    | Wire230
    | Wire231
    | Wire232
    | Wire235
    | Wire236
    | Wire237
    | Wire238
    | Wire239
    | Wire732
    | Wire734
    | Wire735
    | Wire737
    | Wire738
    | Wire739
    | Wire740
    | Wire741
    | Wire742
    | Wire743
    | Wire753
    | Wire754
    | Wire755
    | Wire756
    | Wire757
    | Wire1135
    | Wire1136
    | Wire1137
    | Wire1138
    | Wire1146
    | undefined
}
type Wire173 = null | string
type Wire174 = null | string
type Wire175 = null | string
type Wire176 = null | string
type Wire177 = string
type Wire178 = string
type Wire179 = null | string
type Wire180 = null | string
type Wire181 = string
type Wire182 = number
type Wire183 = number
type Wire184 = Wire185 | Wire186
type Wire185 = number
type Wire186 = null
type Wire187 = null | string
type Wire188 = null | string
type Wire189 = null | string
type Wire190 = null | string
type Wire191 = never
type Wire192 = Array<Wire193>
type Wire193 = string
type Wire194 = Wire195 | Wire196
type Wire195 = number
type Wire196 = null
type Wire197 = null | string
type Wire198 = number
type Wire199 = { [key: string]: Wire200 | undefined }
type Wire200 = JsonValue
type Wire201 = number
type Wire202 = boolean
type Wire203 = number
type Wire204 = Array<Wire205>
type Wire205 = {
  error?: Wire206
  message?: Wire207
  phase?: Wire208
  step?: Wire209
  [key: string]: JsonValue | Wire206 | Wire207 | Wire208 | Wire209 | undefined
}
type Wire206 = JsonValue
type Wire207 = string
type Wire208 = string
type Wire209 = null | string
type Wire210 = { retryIn?: Wire211; [key: string]: JsonValue | Wire211 | undefined }
type Wire211 = number
type Wire212 = null | string
type Wire213 = boolean
type Wire214 = number
type Wire215 = null | string
type Wire216 = null | string
type Wire217 = string
type Wire218 = Wire219 | Wire220
type Wire219 = number
type Wire220 = null
type Wire221 = null | string
type Wire222 = Wire223 | Wire224
type Wire223 = number
type Wire224 = null
type Wire225 = null | string
type Wire226 = null | string
type Wire227 = null | string
type Wire228 = null | string
type Wire229 = number
type Wire230 = 'ASSEMBLY_EXECUTING' | 'ASSEMBLY_REPLAYING' | 'ASSEMBLY_UPLOADING'
type Wire231 = null | string
type Wire232 = Wire233 | Wire234
type Wire233 = JsonValue
type Wire234 = null
type Wire235 = null | string
type Wire236 = string
type Wire237 = number
type Wire238 = string
type Wire239 = { [key: string]: Wire240 | undefined }
type Wire240 = Array<Wire241>
type Wire241 = {
  as?: Wire242
  asset_id?: Wire248
  asset_version?: Wire249
  basename?: Wire250
  cost?: Wire251
  duration?: Wire254
  duration_human?: Wire257
  execTime?: Wire258
  exec_time?: Wire261
  ext?: Wire264
  field?: Wire265
  filepath?: Wire266
  forcedFileExt?: Wire267
  from_batch_import?: Wire268
  has_alpha?: Wire269
  height?: Wire270
  hls_url?: Wire273
  id?: Wire274
  import_url?: Wire275
  ios_url?: Wire276
  is_temp_url?: Wire277
  is_tus_file?: Wire278
  md5hash?: Wire279
  meta?: Wire280
  mime?: Wire659
  name?: Wire660
  original_basename?: Wire661
  original_id?: Wire662
  original_md5hash?: Wire666
  original_name?: Wire667
  original_path?: Wire668
  path?: Wire669
  playlists?: Wire670
  preview?: Wire698
  queue?: Wire699
  queueTime?: Wire700
  queue_time?: Wire703
  remote_path?: Wire706
  sha256?: Wire707
  signed_ssl_url?: Wire708
  signed_url?: Wire709
  size?: Wire710
  size_human?: Wire713
  ssl_url?: Wire714
  streaming_url?: Wire715
  thumbhash?: Wire716
  tus_upload_url?: Wire717
  type?: Wire718
  url?: Wire719
  user_meta?: Wire720
  version_id?: Wire724
  vimeo?: Wire725
  width?: Wire728
  workspace?: Wire731
  [key: string]:
    | JsonValue
    | Wire242
    | Wire248
    | Wire249
    | Wire250
    | Wire251
    | Wire254
    | Wire257
    | Wire258
    | Wire261
    | Wire264
    | Wire265
    | Wire266
    | Wire267
    | Wire268
    | Wire269
    | Wire270
    | Wire273
    | Wire274
    | Wire275
    | Wire276
    | Wire277
    | Wire278
    | Wire279
    | Wire280
    | Wire659
    | Wire660
    | Wire661
    | Wire662
    | Wire666
    | Wire667
    | Wire668
    | Wire669
    | Wire670
    | Wire698
    | Wire699
    | Wire700
    | Wire703
    | Wire706
    | Wire707
    | Wire708
    | Wire709
    | Wire710
    | Wire713
    | Wire714
    | Wire715
    | Wire716
    | Wire717
    | Wire718
    | Wire719
    | Wire720
    | Wire724
    | Wire725
    | Wire728
    | Wire731
    | undefined
}
type Wire242 = Wire243 | Wire247
type Wire243 = Wire244 | Wire245
type Wire244 = string
type Wire245 = Array<Wire246>
type Wire246 = string
type Wire247 = null
type Wire248 = string
type Wire249 = number
type Wire250 = null | string
type Wire251 = Wire252 | Wire253
type Wire252 = number
type Wire253 = null
type Wire254 = Wire255 | Wire256
type Wire255 = number
type Wire256 = null
type Wire257 = null | string
type Wire258 = Wire259 | Wire260
type Wire259 = number
type Wire260 = null
type Wire261 = Wire262 | Wire263
type Wire262 = number
type Wire263 = null
type Wire264 = null | string
type Wire265 = null | string
type Wire266 = null | string
type Wire267 = string
type Wire268 = boolean
type Wire269 = boolean
type Wire270 = Wire271 | Wire272
type Wire271 = number
type Wire272 = null
type Wire273 = string
type Wire274 = string
type Wire275 = string
type Wire276 = string
type Wire277 = boolean
type Wire278 = boolean
type Wire279 = null | string
type Wire280 = Wire281 | Wire658
type Wire281 = {
  album?: Wire282
  aperture?: Wire287
  archive_directory?: Wire290
  artist?: Wire291
  aspect_ratio?: Wire296
  audio_bitrate?: Wire300
  audio_channel_layout?: Wire303
  audio_channels?: Wire304
  audio_codec?: Wire307
  audio_profile?: Wire308
  audio_sample_format?: Wire309
  audio_samplerate?: Wire310
  author?: Wire313
  average_color?: Wire318
  band?: Wire319
  bandwidth?: Wire320
  beats_per_minute?: Wire323
  bit_depth?: Wire326
  character_count?: Wire329
  character_count_with_spaces?: Wire332
  city?: Wire335
  closed_captions?: Wire336
  cmd?: Wire337
  codecs?: Wire343
  colorprimaries?: Wire344
  colorspace?: Wire345
  colortransfer?: Wire346
  comment?: Wire347
  copyright?: Wire348
  copyright_notice?: Wire359
  country?: Wire364
  country_code?: Wire365
  create_date?: Wire366
  creator?: Wire371
  date_file_created?: Wire378
  date_file_modified?: Wire383
  date_recorded?: Wire384
  description?: Wire389
  descriptions?: Wire394
  device_name?: Wire400
  device_software?: Wire405
  device_vendor?: Wire410
  disc?: Wire411
  dominant_colors?: Wire416
  duration?: Wire420
  encoder?: Wire423
  encoding_level?: Wire424
  encoding_profile?: Wire425
  ends_at?: Wire426
  exitCode?: Wire427
  exitSignal?: Wire430
  exposure_compensation?: Wire431
  exposure_mode?: Wire436
  exposure_time?: Wire437
  f_number?: Wire442
  faces?: Wire445
  field_order?: Wire456
  flash?: Wire457
  focal_length?: Wire458
  frame_count?: Wire459
  framerate?: Wire462
  genre?: Wire465
  has_alpha?: Wire470
  has_alpha_channel?: Wire471
  has_artwork?: Wire472
  has_clipping_path?: Wire473
  has_transparency?: Wire474
  height?: Wire475
  interlace_detection?: Wire478
  interlaced?: Wire489
  iso?: Wire490
  keywords?: Wire493
  latitude?: Wire503
  light_value?: Wire506
  line_count?: Wire509
  location?: Wire512
  longitude?: Wire513
  lyrics?: Wire516
  mean_volume?: Wire517
  metering_mode?: Wire520
  modify_date?: Wire521
  num_audio_streams?: Wire526
  num_subtitles?: Wire529
  num_video_streams?: Wire532
  orientation?: Wire535
  overall_bitrate?: Wire540
  page_count?: Wire543
  page_size?: Wire546
  paragraph_count?: Wire547
  performer?: Wire550
  pixel_format?: Wire551
  previousStep?: Wire552
  producer?: Wire553
  reason?: Wire554
  recognized_text?: Wire555
  reference_count?: Wire565
  relative_path?: Wire568
  resolution?: Wire569
  rights?: Wire570
  rotation?: Wire575
  seekable?: Wire578
  segment_index?: Wire579
  shutter_speed?: Wire582
  starts_at?: Wire587
  state?: Wire588
  stderr?: Wire589
  stdout?: Wire590
  step?: Wire591
  storage_url?: Wire592
  streams?: Wire593
  svgViewBoxHeight?: Wire602
  svgViewBoxWidth?: Wire605
  thumb_index?: Wire608
  thumb_offset?: Wire611
  thumbhash?: Wire616
  time_base?: Wire617
  title?: Wire618
  track?: Wire623
  turbo?: Wire628
  version_id?: Wire629
  video_bitrate?: Wire630
  video_codec?: Wire633
  white_balance?: Wire634
  width?: Wire635
  word_count?: Wire638
  xp_comment?: Wire641
  xp_keywords?: Wire642
  xp_subject?: Wire647
  xp_title?: Wire648
  year?: Wire653
  [key: string]:
    | JsonValue
    | Wire282
    | Wire287
    | Wire290
    | Wire291
    | Wire296
    | Wire300
    | Wire303
    | Wire304
    | Wire307
    | Wire308
    | Wire309
    | Wire310
    | Wire313
    | Wire318
    | Wire319
    | Wire320
    | Wire323
    | Wire326
    | Wire329
    | Wire332
    | Wire335
    | Wire336
    | Wire337
    | Wire343
    | Wire344
    | Wire345
    | Wire346
    | Wire347
    | Wire348
    | Wire359
    | Wire364
    | Wire365
    | Wire366
    | Wire371
    | Wire378
    | Wire383
    | Wire384
    | Wire389
    | Wire394
    | Wire400
    | Wire405
    | Wire410
    | Wire411
    | Wire416
    | Wire420
    | Wire423
    | Wire424
    | Wire425
    | Wire426
    | Wire427
    | Wire430
    | Wire431
    | Wire436
    | Wire437
    | Wire442
    | Wire445
    | Wire456
    | Wire457
    | Wire458
    | Wire459
    | Wire462
    | Wire465
    | Wire470
    | Wire471
    | Wire472
    | Wire473
    | Wire474
    | Wire475
    | Wire478
    | Wire489
    | Wire490
    | Wire493
    | Wire503
    | Wire506
    | Wire509
    | Wire512
    | Wire513
    | Wire516
    | Wire517
    | Wire520
    | Wire521
    | Wire526
    | Wire529
    | Wire532
    | Wire535
    | Wire540
    | Wire543
    | Wire546
    | Wire547
    | Wire550
    | Wire551
    | Wire552
    | Wire553
    | Wire554
    | Wire555
    | Wire565
    | Wire568
    | Wire569
    | Wire570
    | Wire575
    | Wire578
    | Wire579
    | Wire582
    | Wire587
    | Wire588
    | Wire589
    | Wire590
    | Wire591
    | Wire592
    | Wire593
    | Wire602
    | Wire605
    | Wire608
    | Wire611
    | Wire616
    | Wire617
    | Wire618
    | Wire623
    | Wire628
    | Wire629
    | Wire630
    | Wire633
    | Wire634
    | Wire635
    | Wire638
    | Wire641
    | Wire642
    | Wire647
    | Wire648
    | Wire653
    | undefined
}
type Wire282 = Wire283 | Wire286
type Wire283 = Wire284 | Wire285
type Wire284 = string
type Wire285 = number
type Wire286 = null
type Wire287 = Wire288 | Wire289
type Wire288 = number
type Wire289 = null
type Wire290 = null | string
type Wire291 = Wire292 | Wire295
type Wire292 = Wire293 | Wire294
type Wire293 = string
type Wire294 = number
type Wire295 = null
type Wire296 = Wire297 | Wire298 | Wire299
type Wire297 = number
type Wire298 = string
type Wire299 = null
type Wire300 = Wire301 | Wire302
type Wire301 = number
type Wire302 = null
type Wire303 = null | string
type Wire304 = Wire305 | Wire306
type Wire305 = number
type Wire306 = null
type Wire307 = null | string
type Wire308 = null | string
type Wire309 = null | string
type Wire310 = Wire311 | Wire312
type Wire311 = number
type Wire312 = null
type Wire313 = Wire314 | Wire317
type Wire314 = Wire315 | Wire316
type Wire315 = string
type Wire316 = number
type Wire317 = null
type Wire318 = null | string
type Wire319 = null | string
type Wire320 = Wire321 | Wire322
type Wire321 = number
type Wire322 = null
type Wire323 = Wire324 | Wire325
type Wire324 = number
type Wire325 = null
type Wire326 = Wire327 | Wire328
type Wire327 = number
type Wire328 = null
type Wire329 = Wire330 | Wire331
type Wire330 = number
type Wire331 = null
type Wire332 = Wire333 | Wire334
type Wire333 = number
type Wire334 = null
type Wire335 = null | string
type Wire336 = boolean | null
type Wire337 = Wire338 | Wire339
type Wire338 = string
type Wire339 = Array<Wire340>
type Wire340 = Wire341 | Wire342
type Wire341 = string
type Wire342 = number
type Wire343 = null | string
type Wire344 = null | string
type Wire345 = null | string
type Wire346 = null | string
type Wire347 = null | string
type Wire348 = Wire349 | Wire358
type Wire349 = Wire350 | Wire351 | Wire352
type Wire350 = string
type Wire351 = number
type Wire352 = {
  confidence_threshold: Wire353
  flagged: Wire354
  licenses: Wire355
  max_confidence: Wire357
  [key: string]: JsonValue | Wire353 | Wire354 | Wire355 | Wire357 | undefined
}
type Wire353 = number
type Wire354 = boolean
type Wire355 = Array<Wire356>
type Wire356 = JsonValue
type Wire357 = number
type Wire358 = null
type Wire359 = Wire360 | Wire363
type Wire360 = Wire361 | Wire362
type Wire361 = string
type Wire362 = number
type Wire363 = null
type Wire364 = null | string
type Wire365 = null | string
type Wire366 = Wire367 | Wire370
type Wire367 = Wire368 | Wire369
type Wire368 = string
type Wire369 = number
type Wire370 = null
type Wire371 = Wire372 | Wire377
type Wire372 = Wire373 | Wire374 | Wire375
type Wire373 = string
type Wire374 = number
type Wire375 = Array<Wire376>
type Wire376 = string
type Wire377 = null
type Wire378 = Wire379 | Wire382
type Wire379 = Wire380 | Wire381
type Wire380 = string
type Wire381 = number
type Wire382 = null
type Wire383 = null | string
type Wire384 = Wire385 | Wire388
type Wire385 = Wire386 | Wire387
type Wire386 = string
type Wire387 = number
type Wire388 = null
type Wire389 = Wire390 | Wire393
type Wire390 = Wire391 | Wire392
type Wire391 = string
type Wire392 = number
type Wire393 = null
type Wire394 = Array<Wire395>
type Wire395 = Wire396 | Wire397
type Wire396 = string
type Wire397 = {
  confidence: Wire398
  name: Wire399
  [key: string]: JsonValue | Wire398 | Wire399 | undefined
}
type Wire398 = number
type Wire399 = string
type Wire400 = Wire401 | Wire404
type Wire401 = Wire402 | Wire403
type Wire402 = string
type Wire403 = number
type Wire404 = null
type Wire405 = Wire406 | Wire409
type Wire406 = Wire407 | Wire408
type Wire407 = string
type Wire408 = number
type Wire409 = null
type Wire410 = null | string
type Wire411 = Wire412 | Wire415
type Wire412 = Wire413 | Wire414
type Wire413 = string
type Wire414 = number
type Wire415 = null
type Wire416 = Wire417 | Wire419
type Wire417 = Array<Wire418>
type Wire418 = string
type Wire419 = null
type Wire420 = Wire421 | Wire422
type Wire421 = number
type Wire422 = null
type Wire423 = null | string
type Wire424 = null | string
type Wire425 = null | string
type Wire426 = null | string
type Wire427 = Wire428 | Wire429
type Wire428 = number
type Wire429 = null
type Wire430 = null | string
type Wire431 = Wire432 | Wire435
type Wire432 = Wire433 | Wire434
type Wire433 = number
type Wire434 = string
type Wire435 = null
type Wire436 = null | string
type Wire437 = Wire438 | Wire441
type Wire438 = Wire439 | Wire440
type Wire439 = number
type Wire440 = string
type Wire441 = null
type Wire442 = Wire443 | Wire444
type Wire443 = number
type Wire444 = null
type Wire445 = Wire446 | Wire455
type Wire446 = Array<Wire447>
type Wire447 = {
  confidence?: Wire448
  height: Wire449
  width: Wire450
  x1: Wire451
  x2: Wire452
  y1: Wire453
  y2: Wire454
  [key: string]:
    JsonValue | Wire448 | Wire449 | Wire450 | Wire451 | Wire452 | Wire453 | Wire454 | undefined
}
type Wire448 = number
type Wire449 = number
type Wire450 = number
type Wire451 = number
type Wire452 = number
type Wire453 = number
type Wire454 = number
type Wire455 = null
type Wire456 = null | string
type Wire457 = null | string
type Wire458 = null | string
type Wire459 = Wire460 | Wire461
type Wire460 = number
type Wire461 = null
type Wire462 = Wire463 | Wire464
type Wire463 = number
type Wire464 = null
type Wire465 = Wire466 | Wire469
type Wire466 = Wire467 | Wire468
type Wire467 = string
type Wire468 = number
type Wire469 = null
type Wire470 = boolean
type Wire471 = boolean | null
type Wire472 = boolean | null
type Wire473 = boolean
type Wire474 = boolean | null
type Wire475 = Wire476 | Wire477
type Wire476 = number
type Wire477 = null
type Wire478 = Wire479 | Wire488
type Wire479 = {
  bff?: Wire480
  confidence?: Wire481
  ffprobe_field_order?: Wire482
  method?: Wire483
  progressive?: Wire484
  sampled_frames?: Wire485
  tff?: Wire486
  undetermined?: Wire487
  [key: string]:
    | JsonValue
    | Wire480
    | Wire481
    | Wire482
    | Wire483
    | Wire484
    | Wire485
    | Wire486
    | Wire487
    | undefined
}
type Wire480 = number
type Wire481 = number
type Wire482 = null | string
type Wire483 = string
type Wire484 = number
type Wire485 = number
type Wire486 = number
type Wire487 = number
type Wire488 = null
type Wire489 = boolean | null
type Wire490 = Wire491 | Wire492
type Wire491 = number
type Wire492 = null
type Wire493 = Wire494 | Wire502
type Wire494 = Wire495 | Wire496 | Wire497
type Wire495 = string
type Wire496 = number
type Wire497 = Array<Wire498>
type Wire498 = Wire499 | Wire500 | Wire501
type Wire499 = string
type Wire500 = number
type Wire501 = boolean
type Wire502 = null
type Wire503 = Wire504 | Wire505
type Wire504 = number
type Wire505 = null
type Wire506 = Wire507 | Wire508
type Wire507 = number
type Wire508 = null
type Wire509 = Wire510 | Wire511
type Wire510 = number
type Wire511 = null
type Wire512 = null | string
type Wire513 = Wire514 | Wire515
type Wire514 = number
type Wire515 = null
type Wire516 = null | string
type Wire517 = Wire518 | Wire519
type Wire518 = number
type Wire519 = null
type Wire520 = null | string
type Wire521 = Wire522 | Wire525
type Wire522 = Wire523 | Wire524
type Wire523 = string
type Wire524 = number
type Wire525 = null
type Wire526 = Wire527 | Wire528
type Wire527 = number
type Wire528 = null
type Wire529 = Wire530 | Wire531
type Wire530 = number
type Wire531 = null
type Wire532 = Wire533 | Wire534
type Wire533 = number
type Wire534 = null
type Wire535 = Wire536 | Wire539
type Wire536 = Wire537 | Wire538
type Wire537 = string
type Wire538 = number
type Wire539 = null
type Wire540 = Wire541 | Wire542
type Wire541 = number
type Wire542 = null
type Wire543 = Wire544 | Wire545
type Wire544 = number
type Wire545 = null
type Wire546 = null | string
type Wire547 = Wire548 | Wire549
type Wire548 = number
type Wire549 = null
type Wire550 = null | string
type Wire551 = null | string
type Wire552 = string
type Wire553 = null | string
type Wire554 = string
type Wire555 = Wire556 | Wire558
type Wire556 = Array<Wire557>
type Wire557 = string
type Wire558 = Array<Wire559>
type Wire559 = {
  boundingPolygon: Wire560
  text: Wire564
  [key: string]: JsonValue | Wire560 | Wire564 | undefined
}
type Wire560 = Array<Wire561>
type Wire561 = { x: Wire562; y: Wire563; [key: string]: JsonValue | Wire562 | Wire563 | undefined }
type Wire562 = number
type Wire563 = number
type Wire564 = string
type Wire565 = Wire566 | Wire567
type Wire566 = number
type Wire567 = null
type Wire568 = null | string
type Wire569 = null | string
type Wire570 = Wire571 | Wire574
type Wire571 = Wire572 | Wire573
type Wire572 = string
type Wire573 = number
type Wire574 = null
type Wire575 = Wire576 | Wire577
type Wire576 = number
type Wire577 = null
type Wire578 = boolean | null
type Wire579 = Wire580 | Wire581
type Wire580 = number
type Wire581 = null
type Wire582 = Wire583 | Wire586
type Wire583 = Wire584 | Wire585
type Wire584 = number
type Wire585 = string
type Wire586 = null
type Wire587 = null | string
type Wire588 = null | string
type Wire589 = string
type Wire590 = string
type Wire591 = string
type Wire592 = string
type Wire593 = Wire594 | Wire601
type Wire594 = {
  audio?: Wire595
  subtitle?: Wire597
  video?: Wire599
  [key: string]: JsonValue | Wire595 | Wire597 | Wire599 | undefined
}
type Wire595 = Array<Wire596>
type Wire596 = JsonValue
type Wire597 = Array<Wire598>
type Wire598 = JsonValue
type Wire599 = Array<Wire600>
type Wire600 = JsonValue
type Wire601 = null
type Wire602 = Wire603 | Wire604
type Wire603 = number
type Wire604 = null
type Wire605 = Wire606 | Wire607
type Wire606 = number
type Wire607 = null
type Wire608 = Wire609 | Wire610
type Wire609 = number
type Wire610 = null
type Wire611 = Wire612 | Wire615
type Wire612 = Wire613 | Wire614
type Wire613 = number
type Wire614 = string
type Wire615 = null
type Wire616 = string
type Wire617 = null | string
type Wire618 = Wire619 | Wire622
type Wire619 = Wire620 | Wire621
type Wire620 = string
type Wire621 = number
type Wire622 = null
type Wire623 = Wire624 | Wire627
type Wire624 = Wire625 | Wire626
type Wire625 = string
type Wire626 = number
type Wire627 = null
type Wire628 = boolean | null
type Wire629 = string
type Wire630 = Wire631 | Wire632
type Wire631 = number
type Wire632 = null
type Wire633 = null | string
type Wire634 = null | string
type Wire635 = Wire636 | Wire637
type Wire636 = number
type Wire637 = null
type Wire638 = Wire639 | Wire640
type Wire639 = number
type Wire640 = null
type Wire641 = null | string
type Wire642 = Wire643 | Wire646
type Wire643 = Wire644 | Wire645
type Wire644 = string
type Wire645 = number
type Wire646 = null
type Wire647 = null | string
type Wire648 = Wire649 | Wire652
type Wire649 = Wire650 | Wire651
type Wire650 = string
type Wire651 = number
type Wire652 = null
type Wire653 = Wire654 | Wire657
type Wire654 = Wire655 | Wire656
type Wire655 = string
type Wire656 = number
type Wire657 = null
type Wire658 = null
type Wire659 = null | string
type Wire660 = null | string
type Wire661 = null | string
type Wire662 = Wire663 | Wire664
type Wire663 = string
type Wire664 = Array<Wire665>
type Wire665 = null | string
type Wire666 = null | string
type Wire667 = null | string
type Wire668 = null | string
type Wire669 = null | string
type Wire670 = Array<Wire671>
type Wire671 = {
  content?: Wire672
  meta?: Wire673
  name?: Wire693
  relative_path?: Wire696
  stream?: Wire697
  [key: string]: JsonValue | Wire672 | Wire673 | Wire693 | Wire696 | Wire697 | undefined
}
type Wire672 = string
type Wire673 = {
  aspect_ratio?: Wire674
  audio_channels?: Wire675
  audio_codec?: Wire676
  audio_samplerate?: Wire677
  date_file_modified?: Wire678
  duration?: Wire679
  encoding_level?: Wire680
  encoding_profile?: Wire681
  framerate?: Wire682
  has_alpha_channel?: Wire683
  has_artwork?: Wire684
  height?: Wire685
  num_audio_streams?: Wire686
  overall_bitrate?: Wire687
  relative_path?: Wire688
  seekable?: Wire689
  version_id?: Wire690
  video_codec?: Wire691
  width?: Wire692
  [key: string]:
    | JsonValue
    | Wire674
    | Wire675
    | Wire676
    | Wire677
    | Wire678
    | Wire679
    | Wire680
    | Wire681
    | Wire682
    | Wire683
    | Wire684
    | Wire685
    | Wire686
    | Wire687
    | Wire688
    | Wire689
    | Wire690
    | Wire691
    | Wire692
    | undefined
}
type Wire674 = number
type Wire675 = number
type Wire676 = string
type Wire677 = number
type Wire678 = string
type Wire679 = number
type Wire680 = string
type Wire681 = string
type Wire682 = number
type Wire683 = boolean
type Wire684 = boolean
type Wire685 = number
type Wire686 = number
type Wire687 = number
type Wire688 = string
type Wire689 = boolean
type Wire690 = string
type Wire691 = string
type Wire692 = number
type Wire693 = Wire694 | Wire695
type Wire694 = string
type Wire695 = number
type Wire696 = string
type Wire697 = string
type Wire698 = null | string
type Wire699 = null | string
type Wire700 = Wire701 | Wire702
type Wire701 = number
type Wire702 = null
type Wire703 = Wire704 | Wire705
type Wire704 = number
type Wire705 = null
type Wire706 = string
type Wire707 = string
type Wire708 = string
type Wire709 = string
type Wire710 = Wire711 | Wire712
type Wire711 = number
type Wire712 = null
type Wire713 = null | string
type Wire714 = null | string
type Wire715 = string
type Wire716 = string
type Wire717 = null | string
type Wire718 = null | string
type Wire719 = null | string
type Wire720 = Wire721 | Wire723
type Wire721 = { [key: string]: Wire722 | undefined }
type Wire722 = JsonValue
type Wire723 = null
type Wire724 = string
type Wire725 = {
  title: Wire726
  uri: Wire727
  [key: string]: JsonValue | Wire726 | Wire727 | undefined
}
type Wire726 = string
type Wire727 = string
type Wire728 = Wire729 | Wire730
type Wire729 = number
type Wire730 = null
type Wire731 = string
type Wire732 = Array<Wire733>
type Wire733 = string
type Wire734 = string
type Wire735 = Array<Wire736>
type Wire736 = string
type Wire737 = number
type Wire738 = string
type Wire739 = null | string
type Wire740 = null | string
type Wire741 = null | string
type Wire742 = null | string
type Wire743 = Array<Wire744>
type Wire744 = {
  fieldname: Wire745
  filename: Wire746
  finished: Wire747
  offset: Wire748
  size: Wire749
  upload_url: Wire750
  user_meta?: Wire751
  [key: string]:
    JsonValue | Wire745 | Wire746 | Wire747 | Wire748 | Wire749 | Wire750 | Wire751 | undefined
}
type Wire745 = string
type Wire746 = string
type Wire747 = boolean
type Wire748 = number
type Wire749 = number
type Wire750 = string
type Wire751 = { [key: string]: Wire752 | undefined }
type Wire752 = JsonValue
type Wire753 = string
type Wire754 = null | string
type Wire755 = number
type Wire756 = boolean
type Wire757 = Array<Wire758>
type Wire758 = Wire759 | Wire1100
type Wire759 = {
  as?: Wire760
  asset_id?: Wire248
  asset_version?: Wire766
  basename: Wire767
  cost?: Wire768
  exec_time?: Wire771
  ext: Wire772
  field: Wire773
  from_batch_import?: Wire774
  has_alpha?: Wire775
  id: Wire776
  import_url?: Wire777
  is_temp_url?: Wire778
  is_tus_file?: Wire779
  md5hash?: Wire780
  meta: Wire781
  mime: Wire1087
  name: Wire660
  original_basename?: Wire1088
  original_id: Wire662
  original_md5hash?: Wire1089
  original_name?: Wire1090
  original_path?: Wire1091
  queue?: Wire1092
  queue_time?: Wire1093
  sha256?: Wire1094
  size: Wire1095
  ssl_url?: Wire1096
  thumbhash?: Wire716
  tus_upload_url?: Wire1097
  type: Wire718
  url: Wire719
  user_meta?: Wire1098
  version_id?: Wire724
  workspace?: Wire731
  [key: string]:
    | JsonValue
    | Wire760
    | Wire248
    | Wire766
    | Wire767
    | Wire768
    | Wire771
    | Wire772
    | Wire773
    | Wire774
    | Wire775
    | Wire776
    | Wire777
    | Wire778
    | Wire779
    | Wire780
    | Wire781
    | Wire1087
    | Wire660
    | Wire1088
    | Wire662
    | Wire1089
    | Wire1090
    | Wire1091
    | Wire1092
    | Wire1093
    | Wire1094
    | Wire1095
    | Wire1096
    | Wire716
    | Wire1097
    | Wire718
    | Wire719
    | Wire1098
    | Wire724
    | Wire731
    | undefined
}
type Wire760 = Wire761 | Wire765
type Wire761 = Wire762 | Wire763
type Wire762 = string
type Wire763 = Array<Wire764>
type Wire764 = string
type Wire765 = null
type Wire766 = number
type Wire767 = null | string
type Wire768 = Wire769 | Wire770
type Wire769 = number
type Wire770 = null
type Wire771 = number
type Wire772 = string
type Wire773 = null | string
type Wire774 = boolean
type Wire775 = boolean
type Wire776 = string
type Wire777 = string
type Wire778 = boolean
type Wire779 = boolean
type Wire780 = null | string
type Wire781 = {
  album?: Wire782
  aperture?: Wire787
  archive_directory?: Wire790
  artist?: Wire791
  aspect_ratio?: Wire796
  audio_bitrate?: Wire800
  audio_channel_layout?: Wire803
  audio_channels?: Wire804
  audio_codec?: Wire807
  audio_profile?: Wire808
  audio_sample_format?: Wire809
  audio_samplerate?: Wire810
  author?: Wire813
  average_color?: Wire318
  band?: Wire818
  bandwidth?: Wire819
  beats_per_minute?: Wire822
  bit_depth?: Wire825
  character_count?: Wire828
  character_count_with_spaces?: Wire831
  city?: Wire834
  closed_captions?: Wire835
  cmd?: Wire836
  codecs?: Wire842
  colorprimaries?: Wire843
  colorspace?: Wire345
  colortransfer?: Wire844
  comment?: Wire845
  copyright?: Wire348
  copyright_notice?: Wire846
  country?: Wire851
  country_code?: Wire852
  create_date?: Wire853
  creator?: Wire858
  date_file_created?: Wire865
  date_file_modified?: Wire870
  date_recorded?: Wire871
  description?: Wire876
  descriptions?: Wire881
  device_name?: Wire887
  device_software?: Wire892
  device_vendor?: Wire897
  disc?: Wire898
  dominant_colors?: Wire416
  duration?: Wire903
  encoder?: Wire906
  encoding_level?: Wire907
  encoding_profile?: Wire908
  ends_at?: Wire909
  exitCode?: Wire910
  exitSignal?: Wire913
  exposure_compensation?: Wire914
  exposure_mode?: Wire919
  exposure_time?: Wire920
  f_number?: Wire925
  faces?: Wire445
  field_order?: Wire456
  flash?: Wire928
  focal_length?: Wire929
  frame_count?: Wire930
  framerate?: Wire933
  genre?: Wire936
  has_alpha?: Wire941
  has_alpha_channel?: Wire942
  has_artwork?: Wire943
  has_clipping_path?: Wire944
  has_transparency?: Wire474
  height?: Wire945
  interlace_detection?: Wire478
  interlaced?: Wire489
  iso?: Wire948
  keywords?: Wire493
  latitude?: Wire951
  light_value?: Wire954
  line_count?: Wire957
  location?: Wire960
  longitude?: Wire961
  lyrics?: Wire964
  mean_volume?: Wire517
  metering_mode?: Wire965
  modify_date?: Wire966
  num_audio_streams?: Wire971
  num_subtitles?: Wire974
  num_video_streams?: Wire977
  orientation?: Wire980
  overall_bitrate?: Wire985
  page_count?: Wire988
  page_size?: Wire991
  paragraph_count?: Wire992
  performer?: Wire995
  pixel_format?: Wire996
  previousStep?: Wire997
  producer?: Wire998
  reason?: Wire999
  recognized_text?: Wire555
  reference_count?: Wire1000
  relative_path?: Wire1003
  resolution?: Wire1004
  rights?: Wire1005
  rotation?: Wire1010
  seekable?: Wire1013
  segment_index?: Wire1014
  shutter_speed?: Wire1017
  starts_at?: Wire1022
  state?: Wire1023
  stderr?: Wire1024
  stdout?: Wire1025
  step?: Wire1026
  storage_url?: Wire1027
  streams?: Wire1028
  svgViewBoxHeight?: Wire1037
  svgViewBoxWidth?: Wire1040
  thumb_index?: Wire1043
  thumb_offset?: Wire611
  thumbhash?: Wire616
  time_base?: Wire1046
  title?: Wire1047
  track?: Wire1052
  turbo?: Wire1057
  version_id?: Wire1058
  video_bitrate?: Wire1059
  video_codec?: Wire1062
  white_balance?: Wire1063
  width?: Wire1064
  word_count?: Wire1067
  xp_comment?: Wire1070
  xp_keywords?: Wire1071
  xp_subject?: Wire1076
  xp_title?: Wire1077
  year?: Wire1082
  [key: string]:
    | JsonValue
    | Wire782
    | Wire787
    | Wire790
    | Wire791
    | Wire796
    | Wire800
    | Wire803
    | Wire804
    | Wire807
    | Wire808
    | Wire809
    | Wire810
    | Wire813
    | Wire318
    | Wire818
    | Wire819
    | Wire822
    | Wire825
    | Wire828
    | Wire831
    | Wire834
    | Wire835
    | Wire836
    | Wire842
    | Wire843
    | Wire345
    | Wire844
    | Wire845
    | Wire348
    | Wire846
    | Wire851
    | Wire852
    | Wire853
    | Wire858
    | Wire865
    | Wire870
    | Wire871
    | Wire876
    | Wire881
    | Wire887
    | Wire892
    | Wire897
    | Wire898
    | Wire416
    | Wire903
    | Wire906
    | Wire907
    | Wire908
    | Wire909
    | Wire910
    | Wire913
    | Wire914
    | Wire919
    | Wire920
    | Wire925
    | Wire445
    | Wire456
    | Wire928
    | Wire929
    | Wire930
    | Wire933
    | Wire936
    | Wire941
    | Wire942
    | Wire943
    | Wire944
    | Wire474
    | Wire945
    | Wire478
    | Wire489
    | Wire948
    | Wire493
    | Wire951
    | Wire954
    | Wire957
    | Wire960
    | Wire961
    | Wire964
    | Wire517
    | Wire965
    | Wire966
    | Wire971
    | Wire974
    | Wire977
    | Wire980
    | Wire985
    | Wire988
    | Wire991
    | Wire992
    | Wire995
    | Wire996
    | Wire997
    | Wire998
    | Wire999
    | Wire555
    | Wire1000
    | Wire1003
    | Wire1004
    | Wire1005
    | Wire1010
    | Wire1013
    | Wire1014
    | Wire1017
    | Wire1022
    | Wire1023
    | Wire1024
    | Wire1025
    | Wire1026
    | Wire1027
    | Wire1028
    | Wire1037
    | Wire1040
    | Wire1043
    | Wire611
    | Wire616
    | Wire1046
    | Wire1047
    | Wire1052
    | Wire1057
    | Wire1058
    | Wire1059
    | Wire1062
    | Wire1063
    | Wire1064
    | Wire1067
    | Wire1070
    | Wire1071
    | Wire1076
    | Wire1077
    | Wire1082
    | undefined
}
type Wire782 = Wire783 | Wire786
type Wire783 = Wire784 | Wire785
type Wire784 = string
type Wire785 = number
type Wire786 = null
type Wire787 = Wire788 | Wire789
type Wire788 = number
type Wire789 = null
type Wire790 = null | string
type Wire791 = Wire792 | Wire795
type Wire792 = Wire793 | Wire794
type Wire793 = string
type Wire794 = number
type Wire795 = null
type Wire796 = Wire797 | Wire798 | Wire799
type Wire797 = number
type Wire798 = string
type Wire799 = null
type Wire800 = Wire801 | Wire802
type Wire801 = number
type Wire802 = null
type Wire803 = null | string
type Wire804 = Wire805 | Wire806
type Wire805 = number
type Wire806 = null
type Wire807 = null | string
type Wire808 = null | string
type Wire809 = null | string
type Wire810 = Wire811 | Wire812
type Wire811 = number
type Wire812 = null
type Wire813 = Wire814 | Wire817
type Wire814 = Wire815 | Wire816
type Wire815 = string
type Wire816 = number
type Wire817 = null
type Wire818 = null | string
type Wire819 = Wire820 | Wire821
type Wire820 = number
type Wire821 = null
type Wire822 = Wire823 | Wire824
type Wire823 = number
type Wire824 = null
type Wire825 = Wire826 | Wire827
type Wire826 = number
type Wire827 = null
type Wire828 = Wire829 | Wire830
type Wire829 = number
type Wire830 = null
type Wire831 = Wire832 | Wire833
type Wire832 = number
type Wire833 = null
type Wire834 = null | string
type Wire835 = boolean | null
type Wire836 = Wire837 | Wire838
type Wire837 = string
type Wire838 = Array<Wire839>
type Wire839 = Wire840 | Wire841
type Wire840 = string
type Wire841 = number
type Wire842 = null | string
type Wire843 = null | string
type Wire844 = null | string
type Wire845 = null | string
type Wire846 = Wire847 | Wire850
type Wire847 = Wire848 | Wire849
type Wire848 = string
type Wire849 = number
type Wire850 = null
type Wire851 = null | string
type Wire852 = null | string
type Wire853 = Wire854 | Wire857
type Wire854 = Wire855 | Wire856
type Wire855 = string
type Wire856 = number
type Wire857 = null
type Wire858 = Wire859 | Wire864
type Wire859 = Wire860 | Wire861 | Wire862
type Wire860 = string
type Wire861 = number
type Wire862 = Array<Wire863>
type Wire863 = string
type Wire864 = null
type Wire865 = Wire866 | Wire869
type Wire866 = Wire867 | Wire868
type Wire867 = string
type Wire868 = number
type Wire869 = null
type Wire870 = null | string
type Wire871 = Wire872 | Wire875
type Wire872 = Wire873 | Wire874
type Wire873 = string
type Wire874 = number
type Wire875 = null
type Wire876 = Wire877 | Wire880
type Wire877 = Wire878 | Wire879
type Wire878 = string
type Wire879 = number
type Wire880 = null
type Wire881 = Array<Wire882>
type Wire882 = Wire883 | Wire884
type Wire883 = string
type Wire884 = {
  confidence: Wire885
  name: Wire886
  [key: string]: JsonValue | Wire885 | Wire886 | undefined
}
type Wire885 = number
type Wire886 = string
type Wire887 = Wire888 | Wire891
type Wire888 = Wire889 | Wire890
type Wire889 = string
type Wire890 = number
type Wire891 = null
type Wire892 = Wire893 | Wire896
type Wire893 = Wire894 | Wire895
type Wire894 = string
type Wire895 = number
type Wire896 = null
type Wire897 = null | string
type Wire898 = Wire899 | Wire902
type Wire899 = Wire900 | Wire901
type Wire900 = string
type Wire901 = number
type Wire902 = null
type Wire903 = Wire904 | Wire905
type Wire904 = number
type Wire905 = null
type Wire906 = null | string
type Wire907 = null | string
type Wire908 = null | string
type Wire909 = null | string
type Wire910 = Wire911 | Wire912
type Wire911 = number
type Wire912 = null
type Wire913 = null | string
type Wire914 = Wire915 | Wire918
type Wire915 = Wire916 | Wire917
type Wire916 = number
type Wire917 = string
type Wire918 = null
type Wire919 = null | string
type Wire920 = Wire921 | Wire924
type Wire921 = Wire922 | Wire923
type Wire922 = number
type Wire923 = string
type Wire924 = null
type Wire925 = Wire926 | Wire927
type Wire926 = number
type Wire927 = null
type Wire928 = null | string
type Wire929 = null | string
type Wire930 = Wire931 | Wire932
type Wire931 = number
type Wire932 = null
type Wire933 = Wire934 | Wire935
type Wire934 = number
type Wire935 = null
type Wire936 = Wire937 | Wire940
type Wire937 = Wire938 | Wire939
type Wire938 = string
type Wire939 = number
type Wire940 = null
type Wire941 = boolean
type Wire942 = boolean | null
type Wire943 = boolean | null
type Wire944 = boolean
type Wire945 = Wire946 | Wire947
type Wire946 = number
type Wire947 = null
type Wire948 = Wire949 | Wire950
type Wire949 = number
type Wire950 = null
type Wire951 = Wire952 | Wire953
type Wire952 = number
type Wire953 = null
type Wire954 = Wire955 | Wire956
type Wire955 = number
type Wire956 = null
type Wire957 = Wire958 | Wire959
type Wire958 = number
type Wire959 = null
type Wire960 = null | string
type Wire961 = Wire962 | Wire963
type Wire962 = number
type Wire963 = null
type Wire964 = null | string
type Wire965 = null | string
type Wire966 = Wire967 | Wire970
type Wire967 = Wire968 | Wire969
type Wire968 = string
type Wire969 = number
type Wire970 = null
type Wire971 = Wire972 | Wire973
type Wire972 = number
type Wire973 = null
type Wire974 = Wire975 | Wire976
type Wire975 = number
type Wire976 = null
type Wire977 = Wire978 | Wire979
type Wire978 = number
type Wire979 = null
type Wire980 = Wire981 | Wire984
type Wire981 = Wire982 | Wire983
type Wire982 = string
type Wire983 = number
type Wire984 = null
type Wire985 = Wire986 | Wire987
type Wire986 = number
type Wire987 = null
type Wire988 = Wire989 | Wire990
type Wire989 = number
type Wire990 = null
type Wire991 = null | string
type Wire992 = Wire993 | Wire994
type Wire993 = number
type Wire994 = null
type Wire995 = null | string
type Wire996 = null | string
type Wire997 = string
type Wire998 = null | string
type Wire999 = string
type Wire1000 = Wire1001 | Wire1002
type Wire1001 = number
type Wire1002 = null
type Wire1003 = null | string
type Wire1004 = null | string
type Wire1005 = Wire1006 | Wire1009
type Wire1006 = Wire1007 | Wire1008
type Wire1007 = string
type Wire1008 = number
type Wire1009 = null
type Wire1010 = Wire1011 | Wire1012
type Wire1011 = number
type Wire1012 = null
type Wire1013 = boolean | null
type Wire1014 = Wire1015 | Wire1016
type Wire1015 = number
type Wire1016 = null
type Wire1017 = Wire1018 | Wire1021
type Wire1018 = Wire1019 | Wire1020
type Wire1019 = number
type Wire1020 = string
type Wire1021 = null
type Wire1022 = null | string
type Wire1023 = null | string
type Wire1024 = string
type Wire1025 = string
type Wire1026 = string
type Wire1027 = string
type Wire1028 = Wire1029 | Wire1036
type Wire1029 = {
  audio?: Wire1030
  subtitle?: Wire1032
  video?: Wire1034
  [key: string]: JsonValue | Wire1030 | Wire1032 | Wire1034 | undefined
}
type Wire1030 = Array<Wire1031>
type Wire1031 = JsonValue
type Wire1032 = Array<Wire1033>
type Wire1033 = JsonValue
type Wire1034 = Array<Wire1035>
type Wire1035 = JsonValue
type Wire1036 = null
type Wire1037 = Wire1038 | Wire1039
type Wire1038 = number
type Wire1039 = null
type Wire1040 = Wire1041 | Wire1042
type Wire1041 = number
type Wire1042 = null
type Wire1043 = Wire1044 | Wire1045
type Wire1044 = number
type Wire1045 = null
type Wire1046 = null | string
type Wire1047 = Wire1048 | Wire1051
type Wire1048 = Wire1049 | Wire1050
type Wire1049 = string
type Wire1050 = number
type Wire1051 = null
type Wire1052 = Wire1053 | Wire1056
type Wire1053 = Wire1054 | Wire1055
type Wire1054 = string
type Wire1055 = number
type Wire1056 = null
type Wire1057 = boolean | null
type Wire1058 = string
type Wire1059 = Wire1060 | Wire1061
type Wire1060 = number
type Wire1061 = null
type Wire1062 = null | string
type Wire1063 = null | string
type Wire1064 = Wire1065 | Wire1066
type Wire1065 = number
type Wire1066 = null
type Wire1067 = Wire1068 | Wire1069
type Wire1068 = number
type Wire1069 = null
type Wire1070 = null | string
type Wire1071 = Wire1072 | Wire1075
type Wire1072 = Wire1073 | Wire1074
type Wire1073 = string
type Wire1074 = number
type Wire1075 = null
type Wire1076 = null | string
type Wire1077 = Wire1078 | Wire1081
type Wire1078 = Wire1079 | Wire1080
type Wire1079 = string
type Wire1080 = number
type Wire1081 = null
type Wire1082 = Wire1083 | Wire1086
type Wire1083 = Wire1084 | Wire1085
type Wire1084 = string
type Wire1085 = number
type Wire1086 = null
type Wire1087 = null | string
type Wire1088 = null | string
type Wire1089 = null | string
type Wire1090 = null | string
type Wire1091 = string
type Wire1092 = null | string
type Wire1093 = number
type Wire1094 = string
type Wire1095 = number
type Wire1096 = null | string
type Wire1097 = null | string
type Wire1098 = { [key: string]: Wire1099 | undefined }
type Wire1099 = JsonValue
type Wire1100 = {
  as?: Wire1101
  asset_id?: Wire248
  asset_version?: Wire1107
  basename?: Wire1108
  cost?: Wire1109
  exec_time?: Wire1112
  ext?: Wire1113
  field?: Wire1114
  from_batch_import?: Wire1115
  has_alpha?: Wire1116
  id?: Wire1117
  import_url?: Wire1118
  is_temp_url?: Wire1119
  is_tus_file?: Wire1120
  md5hash?: Wire1121
  meta?: Wire781
  mime?: Wire1122
  name?: Wire660
  original_basename?: Wire1123
  original_id: Wire662
  original_md5hash?: Wire1124
  original_name?: Wire1125
  original_path?: Wire1126
  queue?: Wire1127
  queue_time?: Wire1128
  sha256?: Wire1129
  size?: Wire1130
  ssl_url?: Wire1131
  thumbhash?: Wire716
  tus_upload_url?: Wire1132
  type?: Wire718
  url?: Wire719
  user_meta?: Wire1133
  version_id?: Wire724
  workspace?: Wire731
  [key: string]:
    | JsonValue
    | Wire1101
    | Wire248
    | Wire1107
    | Wire1108
    | Wire1109
    | Wire1112
    | Wire1113
    | Wire1114
    | Wire1115
    | Wire1116
    | Wire1117
    | Wire1118
    | Wire1119
    | Wire1120
    | Wire1121
    | Wire781
    | Wire1122
    | Wire660
    | Wire1123
    | Wire662
    | Wire1124
    | Wire1125
    | Wire1126
    | Wire1127
    | Wire1128
    | Wire1129
    | Wire1130
    | Wire1131
    | Wire716
    | Wire1132
    | Wire718
    | Wire719
    | Wire1133
    | Wire724
    | Wire731
    | undefined
}
type Wire1101 = Wire1102 | Wire1106
type Wire1102 = Wire1103 | Wire1104
type Wire1103 = string
type Wire1104 = Array<Wire1105>
type Wire1105 = string
type Wire1106 = null
type Wire1107 = number
type Wire1108 = null | string
type Wire1109 = Wire1110 | Wire1111
type Wire1110 = number
type Wire1111 = null
type Wire1112 = number
type Wire1113 = string
type Wire1114 = null | string
type Wire1115 = boolean
type Wire1116 = boolean
type Wire1117 = never
type Wire1118 = string
type Wire1119 = boolean
type Wire1120 = boolean
type Wire1121 = null | string
type Wire1122 = null | string
type Wire1123 = null | string
type Wire1124 = null | string
type Wire1125 = null | string
type Wire1126 = string
type Wire1127 = null | string
type Wire1128 = number
type Wire1129 = string
type Wire1130 = number
type Wire1131 = null | string
type Wire1132 = null | string
type Wire1133 = { [key: string]: Wire1134 | undefined }
type Wire1134 = JsonValue
type Wire1135 = null | string
type Wire1136 = string
type Wire1137 = string
type Wire1138 = Array<Wire1139>
type Wire1139 = {
  action?: Wire1140
  level: Wire1144
  msg: Wire1145
  [key: string]: JsonValue | Wire1140 | Wire1144 | Wire1145 | undefined
}
type Wire1140 = {
  message: Wire1141
  text: Wire1142
  type: Wire1143
  [key: string]: JsonValue | Wire1141 | Wire1142 | Wire1143 | undefined
}
type Wire1141 = string
type Wire1142 = string
type Wire1143 = 'intercom'
type Wire1144 = 'notice' | 'warning'
type Wire1145 = string
type Wire1146 = null | string
type Wire1147 = {
  account_id?: Wire1148
  account_name?: Wire1149
  account_slug?: Wire1150
  api_auth_key_id?: Wire1151
  assemblyId?: Wire1152
  assembly_id?: Wire178
  assembly_ssl_url?: Wire179
  assembly_url?: Wire1153
  build_id?: Wire181
  bytes_expected?: Wire1154
  bytes_received?: Wire183
  bytes_usage?: Wire184
  client_agent?: Wire1155
  client_ip?: Wire1156
  client_referer?: Wire1157
  companion_url?: Wire1158
  error?: Wire1159
  executing_jobs?: Wire1160
  execution_duration?: Wire1162
  execution_start?: Wire1165
  expected_tus_uploads?: Wire1166
  fields?: Wire199
  finished_tus_uploads?: Wire1167
  has_dupe_jobs?: Wire1168
  ignored_error_count?: Wire1169
  ignored_errors?: Wire1170
  info?: Wire1176
  instance?: Wire1178
  is_infinite?: Wire1179
  jobs_queue_duration?: Wire1180
  last_job_completed?: Wire1181
  merged_params?: Wire1182
  message?: Wire1183
  notify_duration?: Wire218
  notify_error?: Wire1184
  notify_response_code?: Wire1185
  notify_response_data?: Wire1188
  notify_start?: Wire1189
  notify_status?: Wire1190
  notify_url?: Wire1191
  num_input_files?: Wire1192
  ok: Wire1193
  params?: Wire1194
  parent_assembly_status?: Wire1195
  parent_id?: Wire1198
  previousStep?: Wire1199
  queue_duration?: Wire1200
  region?: Wire1201
  results?: Wire239
  running_jobs?: Wire1202
  start_date?: Wire1204
  started_jobs?: Wire1205
  started_tus_uploads?: Wire1207
  step?: Wire1208
  template?: Wire1209
  template_id?: Wire1210
  template_name?: Wire1211
  transloadit_client?: Wire1212
  tus_uploads?: Wire743
  tus_url?: Wire1213
  update_stream_url?: Wire754
  upload_duration?: Wire1214
  upload_meta_data_extracted?: Wire1215
  uploads?: Wire757
  uppyserver_url?: Wire1216
  usage_tags?: Wire1217
  virusname?: Wire1218
  warnings?: Wire1138
  websocket_url?: Wire1146
  [key: string]:
    | JsonValue
    | Wire1148
    | Wire1149
    | Wire1150
    | Wire1151
    | Wire1152
    | Wire178
    | Wire179
    | Wire1153
    | Wire181
    | Wire1154
    | Wire183
    | Wire184
    | Wire1155
    | Wire1156
    | Wire1157
    | Wire1158
    | Wire1159
    | Wire1160
    | Wire1162
    | Wire1165
    | Wire1166
    | Wire199
    | Wire1167
    | Wire1168
    | Wire1169
    | Wire1170
    | Wire1176
    | Wire1178
    | Wire1179
    | Wire1180
    | Wire1181
    | Wire1182
    | Wire1183
    | Wire218
    | Wire1184
    | Wire1185
    | Wire1188
    | Wire1189
    | Wire1190
    | Wire1191
    | Wire1192
    | Wire1193
    | Wire1194
    | Wire1195
    | Wire1198
    | Wire1199
    | Wire1200
    | Wire1201
    | Wire239
    | Wire1202
    | Wire1204
    | Wire1205
    | Wire1207
    | Wire1208
    | Wire1209
    | Wire1210
    | Wire1211
    | Wire1212
    | Wire743
    | Wire1213
    | Wire754
    | Wire1214
    | Wire1215
    | Wire757
    | Wire1216
    | Wire1217
    | Wire1218
    | Wire1138
    | Wire1146
    | undefined
}
type Wire1148 = null | string
type Wire1149 = null | string
type Wire1150 = null | string
type Wire1151 = null | string
type Wire1152 = string
type Wire1153 = null | string
type Wire1154 = number
type Wire1155 = null | string
type Wire1156 = null | string
type Wire1157 = null | string
type Wire1158 = null | string
type Wire1159 = never
type Wire1160 = Array<Wire1161>
type Wire1161 = string
type Wire1162 = Wire1163 | Wire1164
type Wire1163 = number
type Wire1164 = null
type Wire1165 = null | string
type Wire1166 = number
type Wire1167 = number
type Wire1168 = boolean
type Wire1169 = number
type Wire1170 = Array<Wire1171>
type Wire1171 = {
  error?: Wire1172
  message?: Wire1173
  phase?: Wire1174
  step?: Wire1175
  [key: string]: JsonValue | Wire1172 | Wire1173 | Wire1174 | Wire1175 | undefined
}
type Wire1172 = JsonValue
type Wire1173 = string
type Wire1174 = string
type Wire1175 = null | string
type Wire1176 = { retryIn?: Wire1177; [key: string]: JsonValue | Wire1177 | undefined }
type Wire1177 = number
type Wire1178 = null | string
type Wire1179 = boolean
type Wire1180 = number
type Wire1181 = null | string
type Wire1182 = null | string
type Wire1183 = string
type Wire1184 = null | string
type Wire1185 = Wire1186 | Wire1187
type Wire1186 = number
type Wire1187 = null
type Wire1188 = null | string
type Wire1189 = null | string
type Wire1190 = null | string
type Wire1191 = null | string
type Wire1192 = number
type Wire1193 =
  | 'ASSEMBLY_CANCELED'
  | 'ASSEMBLY_COMPLETED'
  | 'ASSEMBLY_EXECUTING'
  | 'ASSEMBLY_REPLAYING'
  | 'ASSEMBLY_UPLOADING'
  | 'REQUEST_ABORTED'
type Wire1194 = null | string
type Wire1195 = Wire1196 | Wire1197
type Wire1196 = JsonValue
type Wire1197 = null
type Wire1198 = null | string
type Wire1199 = string
type Wire1200 = number
type Wire1201 = string
type Wire1202 = Array<Wire1203>
type Wire1203 = string
type Wire1204 = string
type Wire1205 = Array<Wire1206>
type Wire1206 = string
type Wire1207 = number
type Wire1208 = string
type Wire1209 = null | string
type Wire1210 = null | string
type Wire1211 = null | string
type Wire1212 = null | string
type Wire1213 = string
type Wire1214 = number
type Wire1215 = boolean
type Wire1216 = null | string
type Wire1217 = string
type Wire1218 = string
type Wire1219 = {
  account_id?: Wire1220
  account_name?: Wire1221
  account_slug?: Wire1222
  api_auth_key_id?: Wire1223
  assemblyId?: Wire1224
  assembly_id?: Wire178
  assembly_ssl_url?: Wire179
  assembly_url?: Wire1225
  build_id?: Wire181
  bytes_expected?: Wire1226
  bytes_received?: Wire183
  bytes_usage?: Wire184
  client_agent?: Wire1227
  client_ip?: Wire1228
  client_referer?: Wire1229
  cmd?: Wire1230
  companion_url?: Wire1236
  error: Wire1237
  executing_jobs?: Wire1238
  execution_duration?: Wire1240
  execution_start?: Wire1243
  exitCode?: Wire1244
  exitSignal?: Wire1247
  expected_tus_uploads?: Wire1248
  fields?: Wire199
  file?: Wire1249
  finished_tus_uploads?: Wire1250
  has_dupe_jobs?: Wire1251
  headers?: Wire1252
  ignored_error_count?: Wire1254
  ignored_errors?: Wire1255
  info?: Wire1261
  instance?: Wire1263
  is_infinite?: Wire1264
  is_private_address?: Wire1265
  jobs_queue_duration?: Wire1266
  last_job_completed?: Wire1267
  merged_params?: Wire1268
  message?: Wire1269
  name?: Wire1270
  notify_duration?: Wire218
  notify_error?: Wire1271
  notify_response_code?: Wire1272
  notify_response_data?: Wire1275
  notify_start?: Wire1276
  notify_status?: Wire1277
  notify_url?: Wire1278
  numRetries?: Wire1279
  num_input_files?: Wire1280
  ok?: Wire1281
  params?: Wire1282
  parent_assembly_status?: Wire1283
  parent_id?: Wire1286
  playwright_error_code?: Wire1287
  previousStep?: Wire1288
  queue_duration?: Wire1289
  reason?: Wire1290
  region?: Wire1299
  response_code?: Wire1300
  results?: Wire239
  retries?: Wire1303
  retryable?: Wire1304
  running_jobs?: Wire1305
  start_date?: Wire1307
  started_jobs?: Wire1308
  started_tus_uploads?: Wire1310
  stderr?: Wire1311
  stdout?: Wire1312
  step?: Wire1313
  template?: Wire1314
  template_id?: Wire1315
  template_name?: Wire1316
  transloadit_client?: Wire1317
  tus_uploads?: Wire743
  tus_url?: Wire1318
  update_stream_url?: Wire754
  upload_duration?: Wire1319
  upload_meta_data_extracted?: Wire1320
  uploads?: Wire757
  uppyserver_url?: Wire1321
  url?: Wire1322
  url_host?: Wire1323
  usage_tags?: Wire1324
  virusname?: Wire1325
  warnings?: Wire1138
  websocket_url?: Wire1146
  [key: string]:
    | JsonValue
    | Wire1220
    | Wire1221
    | Wire1222
    | Wire1223
    | Wire1224
    | Wire178
    | Wire179
    | Wire1225
    | Wire181
    | Wire1226
    | Wire183
    | Wire184
    | Wire1227
    | Wire1228
    | Wire1229
    | Wire1230
    | Wire1236
    | Wire1237
    | Wire1238
    | Wire1240
    | Wire1243
    | Wire1244
    | Wire1247
    | Wire1248
    | Wire199
    | Wire1249
    | Wire1250
    | Wire1251
    | Wire1252
    | Wire1254
    | Wire1255
    | Wire1261
    | Wire1263
    | Wire1264
    | Wire1265
    | Wire1266
    | Wire1267
    | Wire1268
    | Wire1269
    | Wire1270
    | Wire218
    | Wire1271
    | Wire1272
    | Wire1275
    | Wire1276
    | Wire1277
    | Wire1278
    | Wire1279
    | Wire1280
    | Wire1281
    | Wire1282
    | Wire1283
    | Wire1286
    | Wire1287
    | Wire1288
    | Wire1289
    | Wire1290
    | Wire1299
    | Wire1300
    | Wire239
    | Wire1303
    | Wire1304
    | Wire1305
    | Wire1307
    | Wire1308
    | Wire1310
    | Wire1311
    | Wire1312
    | Wire1313
    | Wire1314
    | Wire1315
    | Wire1316
    | Wire1317
    | Wire743
    | Wire1318
    | Wire754
    | Wire1319
    | Wire1320
    | Wire757
    | Wire1321
    | Wire1322
    | Wire1323
    | Wire1324
    | Wire1325
    | Wire1138
    | Wire1146
    | undefined
}
type Wire1220 = null | string
type Wire1221 = null | string
type Wire1222 = null | string
type Wire1223 = null | string
type Wire1224 = string
type Wire1225 = null | string
type Wire1226 = number
type Wire1227 = null | string
type Wire1228 = null | string
type Wire1229 = null | string
type Wire1230 = Wire1231 | Wire1232
type Wire1231 = string
type Wire1232 = Array<Wire1233>
type Wire1233 = Wire1234 | Wire1235
type Wire1234 = string
type Wire1235 = number
type Wire1236 = null | string
type Wire1237 =
  | 'ADMIN_PERMISSIONS_REQUIRED'
  | 'AI_CHAT_VALIDATION'
  | 'ASSEMBLY_ACCOUNT_MISMATCH'
  | 'ASSEMBLY_CANNOT_BE_REPLAYED'
  | 'ASSEMBLY_COULD_NOT_BE_CREATED'
  | 'ASSEMBLY_CRASHED'
  | 'ASSEMBLY_DISALLOWED_ROBOTS_USED'
  | 'ASSEMBLY_EMPTY_STEPS'
  | 'ASSEMBLY_EXECUTION_PROGRESS_NOT_ENABLED'
  | 'ASSEMBLY_EXPIRED'
  | 'ASSEMBLY_FILE_NOT_RESERVED'
  | 'ASSEMBLY_INFINITE'
  | 'ASSEMBLY_INVALID_NOTIFY_URL'
  | 'ASSEMBLY_INVALID_NUM_EXPECTED_UPLOAD_FILES_PARAM'
  | 'ASSEMBLY_INVALID_STEPS'
  | 'ASSEMBLY_JOB_ENQUEUE_ERROR'
  | 'ASSEMBLY_LIST_ERROR'
  | 'ASSEMBLY_MEMORY_LIMIT_EXCEEDED'
  | 'ASSEMBLY_NOTIFICATIONS_LIST_ERROR'
  | 'ASSEMBLY_NOTIFICATION_LIST_ERROR'
  | 'ASSEMBLY_NOTIFICATION_NOT_PERSISTED'
  | 'ASSEMBLY_NOTIFICATION_NOT_REPLAYED'
  | 'ASSEMBLY_NOT_CAPABLE'
  | 'ASSEMBLY_NOT_FINISHED'
  | 'ASSEMBLY_NOT_FOUND'
  | 'ASSEMBLY_NOT_REPLAYED'
  | 'ASSEMBLY_NO_CHARGEABLE_STEP'
  | 'ASSEMBLY_NO_NOTIFY_URL'
  | 'ASSEMBLY_NO_STEPS'
  | 'ASSEMBLY_PLAN_FILE_SIZE_LIMIT_EXCEEDED'
  | 'ASSEMBLY_ROBOT_MISSING'
  | 'ASSEMBLY_SATURATED'
  | 'ASSEMBLY_STATS_ERROR'
  | 'ASSEMBLY_STATS_INVALID_TIME'
  | 'ASSEMBLY_STATS_MISSING_REGION'
  | 'ASSEMBLY_STATUS_FETCHING_RATE_LIMIT_REACHED'
  | 'ASSEMBLY_STATUS_NOT_FOUND'
  | 'ASSEMBLY_STATUS_PARSE_ERROR'
  | 'ASSEMBLY_STEP_INVALID'
  | 'ASSEMBLY_STEP_INVALID_ROBOT'
  | 'ASSEMBLY_STEP_INVALID_USE'
  | 'ASSEMBLY_STEP_NO_ROBOT'
  | 'ASSEMBLY_STEP_UNKNOWN_ROBOT'
  | 'ASSEMBLY_STEP_UNKNOWN_USE'
  | 'ASSEMBLY_URL_TRANSFORM_MISSING'
  | 'AUDIO_ARTWORK_VALIDATION'
  | 'AUDIO_CONCAT_INVALID_INPUT'
  | 'AUDIO_CONCAT_VALIDATION'
  | 'AUDIO_ENCODE_VALIDATION'
  | 'AUDIO_LOOP_VALIDATION'
  | 'AUDIO_MERGE_VALIDATION'
  | 'AUDIO_SPLIT_NO_OUTPUT'
  | 'AUDIO_SPLIT_VALIDATION'
  | 'AUDIO_WAVEFORM_VALIDATION'
  | 'AUTH_EXPIRED'
  | 'AUTH_KEYS_NOT_FOUND'
  | 'AUTH_KEY_SCOPES_NOT_FOUND'
  | 'AUTH_SECRET_NOT_RETRIEVED'
  | 'AZURE_IMPORT_ACCESS_DENIED'
  | 'AZURE_IMPORT_FAILURE'
  | 'AZURE_IMPORT_NOT_FOUND'
  | 'AZURE_IMPORT_VALIDATION'
  | 'AZURE_STORE_ACCESS_DENIED'
  | 'AZURE_STORE_NOT_FOUND'
  | 'AZURE_STORE_VALIDATION'
  | 'BACKBLAZE_IMPORT_ACCESS_DENIED'
  | 'BACKBLAZE_IMPORT_FAILURE'
  | 'BACKBLAZE_IMPORT_NOT_FOUND'
  | 'BACKBLAZE_IMPORT_VALIDATION'
  | 'BACKBLAZE_STORE_ACCESS_DENIED'
  | 'BACKBLAZE_STORE_FAILURE'
  | 'BACKBLAZE_STORE_VALIDATION'
  | 'BAD_PRICING'
  | 'BEARER_TOKEN_AUTH_KEY_MISMATCH'
  | 'BEARER_TOKEN_EXPIRED'
  | 'BEARER_TOKEN_INVALID'
  | 'BILL_LIMIT_EXCEEDED'
  | 'BOX_IMPORT_ACCESS_DENIED'
  | 'BOX_IMPORT_FAILURE'
  | 'BOX_IMPORT_NOT_FOUND'
  | 'BOX_IMPORT_VALIDATION'
  | 'BOX_STORE_COULD_NOT_PARSE_URL'
  | 'BOX_STORE_VALIDATION'
  | 'CANNOT_ACCEPT_NEW_ASSEMBLIES'
  | 'CDN_REQUIRED'
  | 'CLOUDFILES_IMPORT_ACCESS_DENIED'
  | 'CLOUDFILES_IMPORT_FAILURE'
  | 'CLOUDFILES_IMPORT_NOT_FOUND'
  | 'CLOUDFILES_IMPORT_VALIDATION'
  | 'CLOUDFILES_STORE_ACCESS_DENIED'
  | 'CLOUDFILES_STORE_ERROR'
  | 'CLOUDFILES_STORE_VALIDATION'
  | 'CLOUDFLARE_IMPORT_ACCESS_DENIED'
  | 'CLOUDFLARE_IMPORT_FAILURE'
  | 'CLOUDFLARE_IMPORT_NOT_FOUND'
  | 'CLOUDFLARE_IMPORT_VALIDATION'
  | 'CLOUDFLARE_STORE_ACCESS_DENIED'
  | 'CLOUDFLARE_STORE_NOT_FOUND'
  | 'CLOUDFLARE_STORE_URL_VERIFICATION_FAILURE'
  | 'CLOUDFLARE_STORE_VALIDATION'
  | 'CLOUDFLARE_STORE_WRONG_REGION'
  | 'CLOUD_AI_IMAGE_VALIDATION'
  | 'DIGITALOCEAN_IMPORT_ACCESS_DENIED'
  | 'DIGITALOCEAN_IMPORT_FAILURE'
  | 'DIGITALOCEAN_IMPORT_NOT_FOUND'
  | 'DIGITALOCEAN_IMPORT_VALIDATION'
  | 'DIGITALOCEAN_STORE_ACCESS_DENIED'
  | 'DIGITALOCEAN_STORE_NOT_FOUND'
  | 'DIGITALOCEAN_STORE_VALIDATION'
  | 'DIGITALOCEAN_STORE_WRONG_REGION'
  | 'DOCUMENT_AUTOROTATE_VALIDATION'
  | 'DOCUMENT_CONVERT_UNSUPPORTED_CONVERSION'
  | 'DOCUMENT_CONVERT_VALIDATION'
  | 'DOCUMENT_EXTRACT_VALIDATION'
  | 'DOCUMENT_MERGE_UNSUPPORTED_CONVERSION'
  | 'DOCUMENT_MERGE_VALIDATION'
  | 'DOCUMENT_OCR_VALIDATION'
  | 'DOCUMENT_OPTIMIZE_UNSUPPORTED_INPUT'
  | 'DOCUMENT_OPTIMIZE_VALIDATION'
  | 'DOCUMENT_SPLIT_VALIDATION'
  | 'DOCUMENT_THUMBS_INVALID_INPUT'
  | 'DOCUMENT_THUMBS_VALIDATION'
  | 'DO_NOT_REUSE_ASSEMBLY_IDS'
  | 'DROPBOX_IMPORT_ACCESS_DENIED'
  | 'DROPBOX_IMPORT_FAILURE'
  | 'DROPBOX_IMPORT_NOT_FOUND'
  | 'DROPBOX_IMPORT_VALIDATION'
  | 'DROPBOX_STORE_COULD_NOT_PARSE_URL'
  | 'DROPBOX_STORE_VALIDATION'
  | 'FILE_COMPRESS_INVALID_INPUT'
  | 'FILE_COMPRESS_VALIDATION'
  | 'FILE_DECOMPRESS_INVALID_INPUT'
  | 'FILE_DECOMPRESS_PASSWORD_INCORRECT'
  | 'FILE_DECOMPRESS_PASSWORD_REQUIRED'
  | 'FILE_DECOMPRESS_VALIDATION'
  | 'FILE_DOWNLOAD_ERROR'
  | 'FILE_FILTER_DECLINED_FILE'
  | 'FILE_FILTER_INVALID_OPERATOR'
  | 'FILE_FILTER_VALIDATION'
  | 'FILE_HASH_VALIDATION'
  | 'FILE_META_DATA_ERROR'
  | 'FILE_PREVIEW_VALIDATION'
  | 'FILE_READ_VALIDATION_ERROR'
  | 'FILE_SERVE_NO_RESULT'
  | 'FILE_SERVE_VALIDATION'
  | 'FILE_VERIFY_INVALID_FILE'
  | 'FILE_VERIFY_VALIDATION'
  | 'FILE_VIRUSSCAN_DECLINED_FILE'
  | 'FILE_VIRUSSCAN_INVALID_INPUT'
  | 'FILE_VIRUSSCAN_VALIDATION'
  | 'FTP_IMPORT_ACCESS_DENIED'
  | 'FTP_IMPORT_FAILURE'
  | 'FTP_IMPORT_NOT_FOUND'
  | 'FTP_IMPORT_VALIDATION'
  | 'FTP_STORE_VALIDATION'
  | 'GET_ACCOUNT_DB_ERROR'
  | 'GET_ACCOUNT_UNKNOWN_AUTH_KEY'
  | 'GOOGLE_IMPORT_ACCESS_DENIED'
  | 'GOOGLE_IMPORT_FAILURE'
  | 'GOOGLE_IMPORT_NOT_FOUND'
  | 'GOOGLE_IMPORT_VALIDATION'
  | 'GOOGLE_STORE_INVALID_INPUT'
  | 'GOOGLE_STORE_VALIDATION'
  | 'HTML_CONVERT_VALIDATION'
  | 'HTTP_IMPORT_ACCESS_DENIED'
  | 'HTTP_IMPORT_FAILURE'
  | 'HTTP_IMPORT_NOT_FOUND'
  | 'HTTP_IMPORT_VALIDATION'
  | 'HTTP_REQUEST_FAILURE'
  | 'HTTP_REQUEST_VALIDATION'
  | 'IMAGE_BGREMOVE_VALIDATION'
  | 'IMAGE_COPYRIGHT_DETECT_DECLINED_FILE'
  | 'IMAGE_COPYRIGHT_DETECT_VALIDATION'
  | 'IMAGE_DESCRIBE_VALIDATION'
  | 'IMAGE_ENHANCE_NO_INPUT_FILE'
  | 'IMAGE_ENHANCE_VALIDATION'
  | 'IMAGE_FACEDETECT_VALIDATION'
  | 'IMAGE_GENERATE_VALIDATION'
  | 'IMAGE_MERGE_FAILURE'
  | 'IMAGE_MERGE_VALIDATION'
  | 'IMAGE_OCR_VALIDATION'
  | 'IMAGE_OPTIMIZE_VALIDATION'
  | 'IMAGE_RESIZE_ERROR'
  | 'IMAGE_RESIZE_INVALID_BLUR_REGION'
  | 'IMAGE_RESIZE_INVALID_TEXT_OBJECT_VALUE'
  | 'IMAGE_RESIZE_INVALID_TEXT_VALUE'
  | 'IMAGE_RESIZE_INVALID_WATERMARK_OFFSET'
  | 'IMAGE_RESIZE_INVALID_WATERMARK_POSITION'
  | 'IMAGE_RESIZE_NO_CLUT_FILE'
  | 'IMAGE_RESIZE_NO_INPUT_FILE'
  | 'IMAGE_RESIZE_VALIDATION'
  | 'IMAGE_UPSCALE_VALIDATION'
  | 'IMPORT_FILE_ERROR'
  | 'INCOMPLETE_PRICING'
  | 'INSUFFICIENT_AUTH_SCOPE'
  | 'INTERNAL_COMMAND_ERROR'
  | 'INTERNAL_COMMAND_TIMEOUT'
  | 'INVALID_ASSEMBLY_STATUS'
  | 'INVALID_AUTH_EXPIRES_PARAMETER'
  | 'INVALID_AUTH_KEY_PARAMETER'
  | 'INVALID_AUTH_MAX_NUMBER_OF_FILES_PARAMETER'
  | 'INVALID_AUTH_MAX_SIZE_PARAMETER'
  | 'INVALID_AUTH_REFERER_PARAMETER'
  | 'INVALID_FILE_META_DATA'
  | 'INVALID_FORM_DATA'
  | 'INVALID_INPUT_ERROR'
  | 'INVALID_PARAMS_FIELD'
  | 'INVALID_SIGNATURE'
  | 'INVALID_STEP_NAME'
  | 'INVALID_TEMPLATE_FIELD'
  | 'INVALID_UPLOAD_HANDLE_STEP_NAME'
  | 'INVALID_URL_ENCODING'
  | 'MAX_NUMBER_OF_FILES_EXCEEDED'
  | 'MAX_SIZE_EXCEEDED'
  | 'MEGA_IMPORT_ACCESS_DENIED'
  | 'MEGA_IMPORT_FAILURE'
  | 'MEGA_IMPORT_NOT_FOUND'
  | 'MEGA_IMPORT_VALIDATION'
  | 'MEGA_STORE_ACCESS_DENIED'
  | 'MEGA_STORE_NOT_FOUND'
  | 'MEGA_STORE_VALIDATION'
  | 'MEGA_STORE_WRONG_REGION'
  | 'META_WRITE_VALIDATION'
  | 'MINIO_IMPORT_ACCESS_DENIED'
  | 'MINIO_IMPORT_FAILURE'
  | 'MINIO_IMPORT_NOT_FOUND'
  | 'MINIO_IMPORT_VALIDATION'
  | 'MINIO_STORE_ACCESS_DENIED'
  | 'MINIO_STORE_NOT_FOUND'
  | 'MINIO_STORE_VALIDATION'
  | 'MINIO_STORE_WRONG_REGION'
  | 'NO_AUTH_EXPIRES_PARAMETER'
  | 'NO_AUTH_KEY_PARAMETER'
  | 'NO_AUTH_PARAMETER'
  | 'NO_COUNTRY'
  | 'NO_OBJECT_AUTH_PARAMETER'
  | 'NO_OBJECT_PARAMS_FIELD'
  | 'NO_PARAMS_FIELD'
  | 'NO_PRICING'
  | 'NO_RESULT_STEP_FOUND'
  | 'NO_RPC_RESULT_FROM_IMAGE_RESIZER'
  | 'NO_SIGNATURE_FIELD'
  | 'NO_TEMPLATE_ID'
  | 'PLAN_LIMIT_EXCEEDED'
  | 'POSSIBLY_MALICIOUS_FILE_FOUND'
  | 'PRIORITY_JOB_SLOTS_NOT_FOUND'
  | 'PRIORITY_JOB_SLOT_STATS_ERROR'
  | 'PRIORITY_JOB_SLOT_STATS_INVALID_AGGREGATION'
  | 'PRIORITY_JOB_SLOT_STATS_INVALID_TIME'
  | 'PRIORITY_JOB_SLOT_STATS_MISSING_REGION'
  | 'RATE_LIMIT_REACHED'
  | 'REFERER_MISMATCH'
  | 'REQUEST_PREMATURE_CLOSED'
  | 'ROBOT_VALIDATION_BASE_ERROR'
  | 'S3_ACCESS_DENIED'
  | 'S3_IMPORT_ACCESS_DENIED'
  | 'S3_IMPORT_FAILURE'
  | 'S3_IMPORT_NOT_FOUND'
  | 'S3_IMPORT_VALIDATION'
  | 'S3_NOT_FOUND'
  | 'S3_STORE_ACCESS_DENIED'
  | 'S3_STORE_FAILURE'
  | 'S3_STORE_NOT_FOUND'
  | 'S3_STORE_URL_VERIFICATION_FAILURE'
  | 'S3_STORE_VALIDATION'
  | 'S3_STORE_WRONG_REGION'
  | 'S3_WRONG_REGION'
  | 'SCRIPT_RUN_VALIDATION'
  | 'SERVER_403'
  | 'SERVER_404'
  | 'SERVER_500'
  | 'SFTP_IMPORT_ACCESS_DENIED'
  | 'SFTP_IMPORT_FAILURE'
  | 'SFTP_IMPORT_NOT_FOUND'
  | 'SFTP_IMPORT_VALIDATION'
  | 'SFTP_STORE_VALIDATION'
  | 'SIGNATURE_REUSE_DETECTED'
  | 'SPEECH_TRANSCRIBE_VALIDATION'
  | 'STORAGE_GRANT_NOT_CREATED'
  | 'SUPABASE_IMPORT_ACCESS_DENIED'
  | 'SUPABASE_IMPORT_FAILURE'
  | 'SUPABASE_IMPORT_NOT_FOUND'
  | 'SUPABASE_IMPORT_VALIDATION'
  | 'SUPABASE_STORE_ACCESS_DENIED'
  | 'SUPABASE_STORE_NOT_FOUND'
  | 'SUPABASE_STORE_VALIDATION'
  | 'SUPABASE_STORE_WRONG_REGION'
  | 'SWIFT_IMPORT_ACCESS_DENIED'
  | 'SWIFT_IMPORT_FAILURE'
  | 'SWIFT_IMPORT_NOT_FOUND'
  | 'SWIFT_IMPORT_VALIDATION'
  | 'SWIFT_STORE_ACCESS_DENIED'
  | 'SWIFT_STORE_NOT_FOUND'
  | 'SWIFT_STORE_VALIDATION'
  | 'SWIFT_STORE_WRONG_REGION'
  | 'TEMPLATE_CREDENTIALS_INJECTION_ERROR'
  | 'TEMPLATE_DB_ERROR'
  | 'TEMPLATE_DENIES_STEPS_OVERRIDE'
  | 'TEMPLATE_INVALID_JSON'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEXT_SPEAK_VALIDATION'
  | 'TEXT_TRANSLATE_VALIDATION'
  | 'TIGRIS_IMPORT_ACCESS_DENIED'
  | 'TIGRIS_IMPORT_FAILURE'
  | 'TIGRIS_IMPORT_NOT_FOUND'
  | 'TIGRIS_IMPORT_VALIDATION'
  | 'TIGRIS_STORE_ACCESS_DENIED'
  | 'TIGRIS_STORE_NOT_FOUND'
  | 'TIGRIS_STORE_VALIDATION'
  | 'TIGRIS_STORE_WRONG_REGION'
  | 'TMP_FILE_DOWNLOAD_ERROR'
  | 'TOKEN_INVALID_CREDENTIALS'
  | 'TRANSIENT_STORAGE_SERVICE_ERROR'
  | 'TRANSLOADIT_IMPORT_ACCESS_DENIED'
  | 'TRANSLOADIT_IMPORT_FAILURE'
  | 'TRANSLOADIT_IMPORT_NOT_FOUND'
  | 'TRANSLOADIT_IMPORT_VALIDATION'
  | 'TRANSLOADIT_STORE_CONFLICT'
  | 'TRANSLOADIT_STORE_FAILURE'
  | 'TRANSLOADIT_STORE_UNAVAILABLE'
  | 'TRANSLOADIT_STORE_VALIDATION'
  | 'TUS_STORE_VALIDATION'
  | 'USER_COMMAND_ERROR'
  | 'VERIFIED_EMAIL_REQUIRED'
  | 'VIDEO_ADAPTIVE_VALIDATION'
  | 'VIDEO_ARTWORK_VALIDATION'
  | 'VIDEO_CONCAT_INVALID_INPUT'
  | 'VIDEO_CONCAT_NO_OUTPUT'
  | 'VIDEO_CONCAT_VALIDATION'
  | 'VIDEO_ENCODE_INVALID_VIDEO_CODEC'
  | 'VIDEO_ENCODE_INVALID_WATERMARK_POSITION'
  | 'VIDEO_ENCODE_VALIDATION'
  | 'VIDEO_GENERATE_VALIDATION'
  | 'VIDEO_MERGE_NO_IMAGE_FOUND'
  | 'VIDEO_MERGE_VALIDATION'
  | 'VIDEO_ONDEMAND_NOT_FOUND'
  | 'VIDEO_ONDEMAND_VALIDATION'
  | 'VIDEO_SPLIT_NO_OUTPUT'
  | 'VIDEO_SPLIT_VALIDATION'
  | 'VIDEO_SUBTITLE_VALIDATION'
  | 'VIDEO_THUMBS_INVALID_COUNT_VALUE'
  | 'VIDEO_THUMBS_INVALID_FORMAT'
  | 'VIDEO_THUMBS_INVALID_INPUT'
  | 'VIDEO_THUMBS_VALIDATION'
  | 'VIMEO_IMPORT_ACCESS_DENIED'
  | 'VIMEO_IMPORT_FAILURE'
  | 'VIMEO_IMPORT_NOT_FOUND'
  | 'VIMEO_IMPORT_VALIDATION'
  | 'VIMEO_STORE_ACCESS_DENIED'
  | 'VIMEO_STORE_PROBLEM_SENDING_FILE'
  | 'VIMEO_STORE_VALIDATION'
  | 'WASABI_IMPORT_ACCESS_DENIED'
  | 'WASABI_IMPORT_FAILURE'
  | 'WASABI_IMPORT_NOT_FOUND'
  | 'WASABI_IMPORT_VALIDATION'
  | 'WASABI_STORE_ACCESS_DENIED'
  | 'WASABI_STORE_NOT_FOUND'
  | 'WASABI_STORE_VALIDATION'
  | 'WASABI_STORE_WRONG_REGION'
  | 'WORKER_JOB_ERROR'
  | 'YOUTUBE_STORE_PROBLEM_SENDING_FILE'
  | 'YOUTUBE_STORE_VALIDATION'
type Wire1238 = Array<Wire1239>
type Wire1239 = string
type Wire1240 = Wire1241 | Wire1242
type Wire1241 = number
type Wire1242 = null
type Wire1243 = null | string
type Wire1244 = Wire1245 | Wire1246
type Wire1245 = number
type Wire1246 = null
type Wire1247 = null | string
type Wire1248 = number
type Wire1249 = string
type Wire1250 = number
type Wire1251 = boolean
type Wire1252 = { [key: string]: Wire1253 | undefined }
type Wire1253 = JsonValue
type Wire1254 = number
type Wire1255 = Array<Wire1256>
type Wire1256 = {
  error?: Wire1257
  message?: Wire1258
  phase?: Wire1259
  step?: Wire1260
  [key: string]: JsonValue | Wire1257 | Wire1258 | Wire1259 | Wire1260 | undefined
}
type Wire1257 = JsonValue
type Wire1258 = string
type Wire1259 = string
type Wire1260 = null | string
type Wire1261 = { retryIn?: Wire1262; [key: string]: JsonValue | Wire1262 | undefined }
type Wire1262 = number
type Wire1263 = null | string
type Wire1264 = boolean
type Wire1265 = boolean
type Wire1266 = number
type Wire1267 = null | string
type Wire1268 = null | string
type Wire1269 = string
type Wire1270 = string
type Wire1271 = null | string
type Wire1272 = Wire1273 | Wire1274
type Wire1273 = number
type Wire1274 = null
type Wire1275 = null | string
type Wire1276 = null | string
type Wire1277 = null | string
type Wire1278 = null | string
type Wire1279 = number
type Wire1280 = number
type Wire1281 = null
type Wire1282 = null | string
type Wire1283 = Wire1284 | Wire1285
type Wire1284 = JsonValue
type Wire1285 = null
type Wire1286 = null | string
type Wire1287 = string
type Wire1288 = string
type Wire1289 = number
type Wire1290 = Wire1291 | Wire1292 | Wire1293 | Wire1294 | Wire1295 | Wire1297
type Wire1291 = null
type Wire1292 = string
type Wire1293 = number
type Wire1294 = boolean
type Wire1295 = Array<Wire1296>
type Wire1296 = JsonValue
type Wire1297 = { [key: string]: Wire1298 | undefined }
type Wire1298 = JsonValue
type Wire1299 = string
type Wire1300 = Wire1301 | Wire1302
type Wire1301 = number
type Wire1302 = null
type Wire1303 = number
type Wire1304 = boolean
type Wire1305 = Array<Wire1306>
type Wire1306 = string
type Wire1307 = string
type Wire1308 = Array<Wire1309>
type Wire1309 = string
type Wire1310 = number
type Wire1311 = string
type Wire1312 = string
type Wire1313 = string
type Wire1314 = null | string
type Wire1315 = null | string
type Wire1316 = null | string
type Wire1317 = null | string
type Wire1318 = string
type Wire1319 = number
type Wire1320 = boolean
type Wire1321 = null | string
type Wire1322 = string
type Wire1323 = null | string
type Wire1324 = string
type Wire1325 = string
type Wire1326 = Wire1327 | Wire1359
type Wire1327 = {
  emit_execution_progress?: Wire1328
  exiftool_stack?: Wire1329
  ffmpeg_stack?: Wire1330
  fields?: Wire1331
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire1334
  mplayer_stack?: Wire1335
  nonce?: Wire1336
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire1343
  response_headers?: Wire1344
  steps: Wire1354
  template_id: Wire1357
  usage_tags?: Wire1358
}
type Wire1328 = boolean
type Wire1329 = string
type Wire1330 = string
type Wire1331 = { [key: string]: Wire1332 | undefined }
type Wire1332 = JsonValue
type Wire1333 = string
type Wire1334 = string
type Wire1335 = string
type Wire1336 = Wire1337 | Wire1338
type Wire1337 = string
type Wire1338 = number
type Wire1339 = Array<Wire1340>
type Wire1340 =
  | 'without_params'
  | 'without_result_meta_data'
  | 'without_results'
  | 'without_upload_meta_data'
  | 'without_uploads'
type Wire1341 = null | string
type Wire1342 = boolean
type Wire1343 = string
type Wire1344 = { cors?: Wire1345; [key: string]: JsonValue | Wire1345 | undefined }
type Wire1345 = {
  'Access-Control-Allow-Credentials'?: Wire1346
  'Access-Control-Allow-Headers'?: Wire1347
  'Access-Control-Allow-Methods'?: Wire1348
  'Access-Control-Allow-Origin'?: Wire1349
  'Access-Control-Allow-Private-Network'?: Wire1350
  'Access-Control-Allow-Public-Network'?: Wire1351
  'Access-Control-Expose-Headers'?: Wire1352
  'Access-Control-Max-Age'?: Wire1353
  [key: string]:
    | JsonValue
    | Wire1346
    | Wire1347
    | Wire1348
    | Wire1349
    | Wire1350
    | Wire1351
    | Wire1352
    | Wire1353
    | undefined
}
type Wire1346 = boolean
type Wire1347 = string
type Wire1348 = string
type Wire1349 = string
type Wire1350 = boolean
type Wire1351 = boolean
type Wire1352 = string
type Wire1353 = number
type Wire1354 = { [key: string]: Wire1355 | undefined }
type Wire1355 = { robot?: Wire1356; [key: string]: JsonValue | Wire1356 | undefined }
type Wire1356 =
  | '/ai/chat'
  | '/audio/artwork'
  | '/audio/concat'
  | '/audio/encode'
  | '/audio/loop'
  | '/audio/merge'
  | '/audio/split'
  | '/audio/waveform'
  | '/azure/import'
  | '/azure/store'
  | '/backblaze/import'
  | '/backblaze/store'
  | '/box/import'
  | '/box/store'
  | '/cloudfiles/import'
  | '/cloudfiles/store'
  | '/cloudflare/import'
  | '/cloudflare/store'
  | '/digitalocean/import'
  | '/digitalocean/store'
  | '/document/autorotate'
  | '/document/convert'
  | '/document/extract'
  | '/document/merge'
  | '/document/ocr'
  | '/document/optimize'
  | '/document/split'
  | '/document/thumbs'
  | '/dropbox/import'
  | '/dropbox/store'
  | '/edgly/deliver'
  | '/file/compress'
  | '/file/decompress'
  | '/file/filter'
  | '/file/hash'
  | '/file/preview'
  | '/file/read'
  | '/file/serve'
  | '/file/verify'
  | '/file/virusscan'
  | '/ftp/import'
  | '/ftp/store'
  | '/google/import'
  | '/google/store'
  | '/html/convert'
  | '/http/import'
  | '/http/request'
  | '/image/bgremove'
  | '/image/copyrightdetect'
  | '/image/describe'
  | '/image/enhance'
  | '/image/facedetect'
  | '/image/generate'
  | '/image/merge'
  | '/image/ocr'
  | '/image/optimize'
  | '/image/resize'
  | '/image/upscale'
  | '/mega/import'
  | '/mega/store'
  | '/meta/write'
  | '/minio/import'
  | '/minio/store'
  | '/s3/import'
  | '/s3/store'
  | '/script/run'
  | '/sftp/import'
  | '/sftp/store'
  | '/speech/transcribe'
  | '/supabase/import'
  | '/supabase/store'
  | '/swift/import'
  | '/swift/store'
  | '/text/speak'
  | '/text/translate'
  | '/tigris/import'
  | '/tigris/store'
  | '/tlcdn/deliver'
  | '/transloadit/import'
  | '/transloadit/store'
  | '/tus/store'
  | '/upload/handle'
  | '/video/adaptive'
  | '/video/artwork'
  | '/video/concat'
  | '/video/encode'
  | '/video/generate'
  | '/video/merge'
  | '/video/ondemand'
  | '/video/split'
  | '/video/subtitle'
  | '/video/thumbs'
  | '/vimeo/import'
  | '/vimeo/store'
  | '/wasabi/import'
  | '/wasabi/store'
  | '/youtube/store'
type Wire1357 = string
type Wire1358 = string
type Wire1359 = {
  emit_execution_progress?: Wire1360
  exiftool_stack?: Wire1361
  ffmpeg_stack?: Wire1362
  fields?: Wire1363
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire1365
  mplayer_stack?: Wire1366
  nonce?: Wire1367
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire1370
  response_headers?: Wire1344
  steps?: Wire1371
  template_id?: Wire4918
  usage_tags?: Wire4919
}
type Wire1360 = boolean
type Wire1361 = string
type Wire1362 = string
type Wire1363 = { [key: string]: Wire1364 | undefined }
type Wire1364 = JsonValue
type Wire1365 = string
type Wire1366 = string
type Wire1367 = Wire1368 | Wire1369
type Wire1368 = string
type Wire1369 = number
type Wire1370 = string
type Wire1371 = Wire1372
type Wire1372 = { [key: string]: Wire1373 | undefined }
type Wire1373 =
  | Wire1374
  | Wire1441
  | Wire1453
  | Wire1635
  | Wire1662
  | Wire1680
  | Wire1682
  | Wire1688
  | Wire1701
  | Wire1835
  | Wire1866
  | Wire1909
  | Wire1940
  | Wire1955
  | Wire1965
  | Wire1972
  | Wire2011
  | Wire2042
  | Wire2072
  | Wire2092
  | Wire2109
  | Wire2130
  | Wire2157
  | Wire2178
  | Wire2180
  | Wire2213
  | Wire2269
  | Wire2280
  | Wire2291
  | Wire2323
  | Wire2325
  | Wire2332
  | Wire2406
  | Wire2422
  | Wire2424
  | Wire2426
  | Wire2454
  | Wire2470
  | Wire2563
  | Wire2575
  | Wire2708
  | Wire2721
  | Wire2731
  | Wire2733
  | Wire2761
  | Wire2786
  | Wire2796
  | Wire2818
  | Wire2857
  | Wire2899
  | Wire2945
  | Wire2959
  | Wire2982
  | Wire2998
  | Wire3024
  | Wire3050
  | Wire3084
  | Wire3102
  | Wire3171
  | Wire3173
  | Wire3198
  | Wire3491
  | Wire3495
  | Wire3512
  | Wire3534
  | Wire3561
  | Wire3609
  | Wire3614
  | Wire3636
  | Wire3656
  | Wire3682
  | Wire3702
  | Wire3723
  | Wire3745
  | Wire3763
  | Wire3781
  | Wire3788
  | Wire4257
  | Wire4277
  | Wire4298
  | Wire4305
  | Wire4313
  | Wire4335
  | Wire4337
  | Wire4377
  | Wire4382
  | Wire4404
  | Wire4512
  | Wire4567
  | Wire4615
  | Wire4666
  | Wire4671
  | Wire4737
  | Wire4800
  | Wire4821
  | Wire4854
  | Wire4874
  | Wire4898
type Wire1374 = {
  asset_id?: Wire1375
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path: Wire1422
  queue?: Wire1425
  recursive?: Wire1428
  result?: Wire1432
  robot: Wire1437
  user_meta?: Wire1438
  version_id?: Wire1440
}
type Wire1375 = never
type Wire1376 = Wire1377 | Wire1378
type Wire1377 = string
type Wire1378 = Wire1379 | Wire1380
type Wire1379 = boolean
type Wire1380 = 'false' | 'true'
type Wire1381 = Wire1382 | Wire1393
type Wire1382 = Wire1383 | Wire1384 | Wire1387
type Wire1383 = string
type Wire1384 = Wire1385 | Wire1386
type Wire1385 = string
type Wire1386 = string
type Wire1387 = Wire1388 | Wire1389
type Wire1388 = string
type Wire1389 = Array<Wire1390>
type Wire1390 = Wire1391 | Wire1392
type Wire1391 = string
type Wire1392 = string
type Wire1393 = null
type Wire1394 = Wire1395 | Wire1396
type Wire1395 = string
type Wire1396 = Wire1397 | Wire1398
type Wire1397 = boolean
type Wire1398 = Array<Wire1399>
type Wire1399 = 'execute' | 'import' | 'meta'
type Wire1400 = Wire1401 | Wire1402
type Wire1401 = string
type Wire1402 = Array<Wire1403>
type Wire1403 = Wire1404 | Wire1405
type Wire1404 = string
type Wire1405 = 'meta'
type Wire1406 = Wire1407 | Wire1410
type Wire1407 = Wire1408 | Wire1409
type Wire1408 = boolean
type Wire1409 = 'false' | 'true'
type Wire1410 = { [key: string]: Wire1411 | undefined }
type Wire1411 = Wire1412 | Wire1413
type Wire1412 = boolean
type Wire1413 = 'false' | 'true'
type Wire1414 = Wire1415 | Wire1416 | Wire1417 | Wire1387
type Wire1415 = string
type Wire1416 = { [key: string]: Wire1417 | undefined }
type Wire1417 = Wire1418 | Wire1419
type Wire1418 = string
type Wire1419 = Wire1420 | Wire1421
type Wire1420 = boolean
type Wire1421 = 'false' | 'true'
type Wire1422 = Wire1423 | Wire1424
type Wire1423 = string
type Wire1424 = string
type Wire1425 = Wire1426 | Wire1427
type Wire1426 = string
type Wire1427 = 'batch'
type Wire1428 = Wire1429 | Wire1430 | Wire1431
type Wire1429 = boolean
type Wire1430 = 'false' | 'true'
type Wire1431 = string
type Wire1432 = Wire1433 | Wire1434
type Wire1433 = string
type Wire1434 = Wire1435 | Wire1436
type Wire1435 = boolean
type Wire1436 = 'false' | 'true'
type Wire1437 = '/transloadit/import'
type Wire1438 = { [key: string]: Wire1439 | undefined }
type Wire1439 = JsonValue
type Wire1440 = never
type Wire1441 = {
  asset_id: Wire1442
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire1445
  queue?: Wire1425
  recursive?: Wire1446
  result?: Wire1432
  robot: Wire1437
  user_meta?: Wire1438
  version_id?: Wire1450
}
type Wire1442 = Wire1443 | Wire1444
type Wire1443 = string
type Wire1444 = string
type Wire1445 = never
type Wire1446 = Wire1447 | Wire1448 | Wire1449
type Wire1447 = false
type Wire1448 = 'false'
type Wire1449 = string
type Wire1450 = Wire1451 | Wire1452
type Wire1451 = string
type Wire1452 = string
type Wire1453 = {
  change_format_if_necessary?: Wire1454
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  method?: Wire1613
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1619
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1454 = Wire1455 | Wire1456
type Wire1455 = string
type Wire1456 = Wire1457 | Wire1458
type Wire1457 = boolean
type Wire1458 = 'false' | 'true'
type Wire1459 = Wire1460 | Wire1461
type Wire1460 = string
type Wire1461 = {
  ac?: Wire1462
  af?: Wire1466
  an?: Wire1417
  ar?: Wire1462
  async?: Wire1462
  b?: Wire1469
  'b:a'?: Wire1477
  'b:v'?: Wire1477
  bits_per_mb?: Wire1477
  bt?: Wire1482
  bufsize?: Wire1477
  c?: Wire1487
  'c:a'?: Wire1490
  'c:v'?: Wire1493
  codec?: Wire1496
  'codec:a'?: Wire1505
  'codec:v'?: Wire1508
  coder?: Wire1462
  'cpu-used'?: Wire1511
  crf?: Wire1462
  deadline?: Wire1514
  f?: Wire1517
  'filter:a'?: Wire1520
  'filter:v'?: Wire1523
  filter_complex?: Wire1526
  flags?: Wire1535
  g?: Wire1462
  i_qfactor?: Wire1477
  keyint_min?: Wire1462
  level?: Wire1477
  'level:v'?: Wire1477
  map?: Wire1538
  maxrate?: Wire1477
  me_range?: Wire1462
  movflags?: Wire1543
  'overshoot-pct'?: Wire1462
  partitions?: Wire1546
  pix_fmt?: Wire1549
  preset?: Wire1477
  profile?: Wire1552
  'profile:v'?: Wire1555
  'q:a'?: Wire1462
  qcomp?: Wire1477
  qdiff?: Wire1462
  qmax?: Wire1462
  qmin?: Wire1462
  'qscale:a'?: Wire1462
  'qscale:v'?: Wire1462
  r?: Wire1560
  rc_eq?: Wire1567
  refs?: Wire1462
  'row-mt'?: Wire1462
  s?: Wire1570
  sc_threshold?: Wire1462
  shortest?: Wire1573
  ss?: Wire1477
  'svtav1-params'?: Wire1575
  sws_flags?: Wire1578
  t?: Wire1477
  threads?: Wire1462
  to?: Wire1477
  transloaditffpreset?: Wire1581
  trellis?: Wire1462
  'undershoot-pct'?: Wire1462
  vbr?: Wire1477
  vendor?: Wire1584
  vf?: Wire1587
  vn?: Wire1417
  'x264-params'?: Wire1590
  x264opts?: Wire1593
  'x265-params'?: Wire1596
  [key: string]:
    | JsonValue
    | Wire1462
    | Wire1466
    | Wire1417
    | Wire1462
    | Wire1462
    | Wire1469
    | Wire1477
    | Wire1477
    | Wire1477
    | Wire1482
    | Wire1477
    | Wire1487
    | Wire1490
    | Wire1493
    | Wire1496
    | Wire1505
    | Wire1508
    | Wire1462
    | Wire1511
    | Wire1462
    | Wire1514
    | Wire1517
    | Wire1520
    | Wire1523
    | Wire1526
    | Wire1535
    | Wire1462
    | Wire1477
    | Wire1462
    | Wire1477
    | Wire1477
    | Wire1538
    | Wire1477
    | Wire1462
    | Wire1543
    | Wire1462
    | Wire1546
    | Wire1549
    | Wire1477
    | Wire1552
    | Wire1555
    | Wire1462
    | Wire1477
    | Wire1462
    | Wire1462
    | Wire1462
    | Wire1462
    | Wire1462
    | Wire1560
    | Wire1567
    | Wire1462
    | Wire1462
    | Wire1570
    | Wire1462
    | Wire1573
    | Wire1477
    | Wire1575
    | Wire1578
    | Wire1477
    | Wire1462
    | Wire1477
    | Wire1581
    | Wire1462
    | Wire1462
    | Wire1477
    | Wire1584
    | Wire1587
    | Wire1417
    | Wire1590
    | Wire1593
    | Wire1596
    | undefined
}
type Wire1462 = Wire1463 | Wire1464 | Wire1465
type Wire1463 = string
type Wire1464 = string
type Wire1465 = number
type Wire1466 = Wire1467 | Wire1468
type Wire1467 = string
type Wire1468 = string
type Wire1469 = Wire1470 | Wire1471 | Wire1474
type Wire1470 = string
type Wire1471 = Wire1472 | Wire1473
type Wire1472 = string
type Wire1473 = { a?: Wire1462; v?: Wire1462 }
type Wire1474 = Wire1475 | Wire1476
type Wire1475 = string
type Wire1476 = string
type Wire1477 = Wire1478 | Wire1479 | Wire1462
type Wire1478 = string
type Wire1479 = Wire1480 | Wire1481
type Wire1480 = string
type Wire1481 = string
type Wire1482 = Wire1483 | Wire1462 | Wire1484
type Wire1483 = string
type Wire1484 = Wire1485 | Wire1486
type Wire1485 = string
type Wire1486 = string
type Wire1487 = Wire1488 | Wire1489
type Wire1488 = string
type Wire1489 = string
type Wire1490 = Wire1491 | Wire1492
type Wire1491 = string
type Wire1492 = string
type Wire1493 = Wire1494 | Wire1495
type Wire1494 = string
type Wire1495 = string
type Wire1496 = Wire1497 | Wire1498
type Wire1497 = string
type Wire1498 = { a?: Wire1499; v?: Wire1502 }
type Wire1499 = Wire1500 | Wire1501
type Wire1500 = string
type Wire1501 = string
type Wire1502 = Wire1503 | Wire1504
type Wire1503 = string
type Wire1504 = string
type Wire1505 = Wire1506 | Wire1507
type Wire1506 = string
type Wire1507 = string
type Wire1508 = Wire1509 | Wire1510
type Wire1509 = string
type Wire1510 = string
type Wire1511 = Wire1512 | Wire1513
type Wire1512 = string
type Wire1513 = string
type Wire1514 = Wire1515 | Wire1516
type Wire1515 = string
type Wire1516 = string
type Wire1517 = Wire1518 | Wire1519
type Wire1518 = string
type Wire1519 = string
type Wire1520 = Wire1521 | Wire1522
type Wire1521 = string
type Wire1522 = string
type Wire1523 = Wire1524 | Wire1525
type Wire1524 = string
type Wire1525 = string
type Wire1526 = Wire1527 | Wire1528 | Wire1531
type Wire1527 = string
type Wire1528 = Wire1529 | Wire1530
type Wire1529 = string
type Wire1530 = string
type Wire1531 = { [key: string]: Wire1532 | undefined }
type Wire1532 = Wire1533 | Wire1534
type Wire1533 = string
type Wire1534 = string
type Wire1535 = Wire1536 | Wire1537
type Wire1536 = string
type Wire1537 = string
type Wire1538 = Wire1539 | Wire1540 | Wire1387
type Wire1539 = string
type Wire1540 = Wire1541 | Wire1542
type Wire1541 = string
type Wire1542 = string
type Wire1543 = Wire1544 | Wire1545
type Wire1544 = string
type Wire1545 = string
type Wire1546 = Wire1547 | Wire1548
type Wire1547 = string
type Wire1548 = string
type Wire1549 = Wire1550 | Wire1551
type Wire1550 = string
type Wire1551 = string
type Wire1552 = Wire1553 | Wire1554
type Wire1553 = string
type Wire1554 = string
type Wire1555 = Wire1556 | Wire1462 | Wire1557
type Wire1556 = string
type Wire1557 = Wire1558 | Wire1559
type Wire1558 = string
type Wire1559 = 'baseline' | 'high' | 'main' | 'main10'
type Wire1560 = Wire1561 | Wire1566
type Wire1561 = Wire1562 | Wire1462 | Wire1563
type Wire1562 = string
type Wire1563 = Wire1564 | Wire1565
type Wire1564 = string
type Wire1565 = string
type Wire1566 = null
type Wire1567 = Wire1568 | Wire1569
type Wire1568 = string
type Wire1569 = string
type Wire1570 = Wire1571 | Wire1572
type Wire1571 = string
type Wire1572 = string
type Wire1573 = Wire1417 | Wire1574
type Wire1574 = null
type Wire1575 = Wire1576 | Wire1577
type Wire1576 = string
type Wire1577 = {
  'enable-qm'?: Wire1462
  'fast-decode'?: Wire1462
  'film-grain-denoise'?: Wire1462
  tune?: Wire1462
}
type Wire1578 = Wire1579 | Wire1580
type Wire1579 = string
type Wire1580 = string
type Wire1581 = Wire1582 | Wire1583
type Wire1582 = string
type Wire1583 = 'empty'
type Wire1584 = Wire1585 | Wire1586
type Wire1585 = string
type Wire1586 = string
type Wire1587 = Wire1588 | Wire1589
type Wire1588 = string
type Wire1589 = string
type Wire1590 = Wire1591 | Wire1592
type Wire1591 = string
type Wire1592 = string
type Wire1593 = Wire1594 | Wire1595
type Wire1594 = string
type Wire1595 = string
type Wire1596 = Wire1597 | Wire1598
type Wire1597 = string
type Wire1598 = {
  'b-adapt'?: Wire1462
  'rc-lookahead'?: Wire1462
  'vbv-bufsize'?: Wire1462
  'vbv-maxrate'?: Wire1462
}
type Wire1599 = Wire1600 | Wire1601 | Wire1604
type Wire1600 = string
type Wire1601 = Wire1602 | Wire1603
type Wire1602 = string
type Wire1603 = 'v6' | 'v7' | 'v8'
type Wire1604 = Wire1605 | Wire1606
type Wire1605 = string
type Wire1606 = string
type Wire1607 = Wire1608 | Wire1609
type Wire1608 = string
type Wire1609 = Wire1610 | Wire1611
type Wire1610 = boolean
type Wire1611 = Array<Wire1612>
type Wire1612 = 'execute' | 'meta'
type Wire1613 = Wire1614 | Wire1615
type Wire1614 = string
type Wire1615 = 'extract' | 'insert'
type Wire1616 = Wire1617 | Wire1618
type Wire1617 = string
type Wire1618 =
  | 'aac'
  | 'alac'
  | 'audio/aac'
  | 'audio/alac'
  | 'audio/flac'
  | 'audio/mp3'
  | 'audio/ogg'
  | 'dash-128k-audio'
  | 'dash-128k_audio'
  | 'dash-256k-audio'
  | 'dash-256k_audio'
  | 'dash-32k-audio'
  | 'dash-32k_audio'
  | 'dash-64k-audio'
  | 'dash-64k_audio'
  | 'dash/128k-audio'
  | 'dash/128k_audio'
  | 'dash/256k-audio'
  | 'dash/256k_audio'
  | 'dash/32k-audio'
  | 'dash/32k_audio'
  | 'dash/64k-audio'
  | 'dash/64k_audio'
  | 'dash_128k-audio'
  | 'dash_128k_audio'
  | 'dash_256k-audio'
  | 'dash_256k_audio'
  | 'dash_32k-audio'
  | 'dash_32k_audio'
  | 'dash_64k-audio'
  | 'dash_64k_audio'
  | 'empty'
  | 'flac'
  | 'hg-transformers-audio'
  | 'hg-transformers_audio'
  | 'hg_transformers-audio'
  | 'hg_transformers_audio'
  | 'mp3'
  | 'ogg'
  | 'opus'
  | 'speech'
  | 'wav'
type Wire1619 = '/audio/artwork'
type Wire1620 = Wire1621 | Wire1630
type Wire1621 = Wire1622 | Wire1623 | Wire1625
type Wire1622 = string
type Wire1623 = Array<Wire1624>
type Wire1624 = string
type Wire1625 = Array<Wire1626>
type Wire1626 = { as?: Wire1627; fields?: Wire1628; name: Wire1629 }
type Wire1627 = string
type Wire1628 = string
type Wire1629 = string
type Wire1630 = {
  bundle_steps?: Wire1631
  fields?: Wire1632
  group_by_original?: Wire1634
  steps: Wire1621
}
type Wire1631 = boolean
type Wire1632 = Array<Wire1633>
type Wire1633 = string
type Wire1634 = boolean
type Wire1635 = {
  audio_fade_seconds?: Wire1636
  bitrate?: Wire1640
  crossfade?: Wire1644
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1649
  robot: Wire1654
  sample_rate?: Wire1655
  sort_by?: Wire1659
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1636 = Wire1637 | Wire1638 | Wire1639
type Wire1637 = string
type Wire1638 = string
type Wire1639 = number
type Wire1640 = Wire1641 | Wire1642 | Wire1643
type Wire1641 = string
type Wire1642 = string
type Wire1643 = number
type Wire1644 = Wire1645 | Wire1646
type Wire1645 = string
type Wire1646 = Wire1647 | Wire1648
type Wire1647 = boolean
type Wire1648 = 'false' | 'true'
type Wire1649 = Wire1650 | Wire1651
type Wire1650 = string
type Wire1651 = Wire1652 | Wire1653
type Wire1652 = boolean
type Wire1653 = 'false' | 'true'
type Wire1654 = '/audio/concat'
type Wire1655 = Wire1656 | Wire1657 | Wire1658
type Wire1656 = string
type Wire1657 = string
type Wire1658 = number
type Wire1659 = Wire1660 | Wire1661
type Wire1660 = string
type Wire1661 = 'auto' | 'basename' | 'import_order'
type Wire1662 = {
  bitrate?: Wire1640
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1649
  robot: Wire1663
  sample_rate?: Wire1655
  segments: Wire1664
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1663 = '/audio/split'
type Wire1664 = Wire1665 | Wire1666
type Wire1665 = string
type Wire1666 = Array<Wire1667>
type Wire1667 = Wire1668 | Wire1669
type Wire1668 = string
type Wire1669 = { from: Wire1670; to: Wire1675 }
type Wire1670 = Wire1671 | Wire1462 | Wire1672
type Wire1671 = string
type Wire1672 = Wire1673 | Wire1674
type Wire1673 = string
type Wire1674 = string
type Wire1675 = Wire1676 | Wire1462 | Wire1677
type Wire1676 = string
type Wire1677 = Wire1678 | Wire1679
type Wire1678 = string
type Wire1679 = string
type Wire1680 = {
  bitrate?: Wire1640
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1649
  robot: Wire1681
  sample_rate?: Wire1655
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1681 = '/audio/encode'
type Wire1682 = {
  bitrate?: Wire1640
  duration?: Wire1683
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1687
  sample_rate?: Wire1655
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1683 = Wire1684 | Wire1685 | Wire1686
type Wire1684 = string
type Wire1685 = string
type Wire1686 = number
type Wire1687 = '/audio/loop'
type Wire1688 = {
  bitrate?: Wire1640
  duration?: Wire1689
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  loop?: Wire1692
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1697
  sample_rate?: Wire1655
  use?: Wire1620
  user_meta?: Wire1438
  volume?: Wire1698
}
type Wire1689 = Wire1690 | Wire1691
type Wire1690 = string
type Wire1691 = 'first' | 'longest' | 'shortest'
type Wire1692 = Wire1693 | Wire1694
type Wire1693 = string
type Wire1694 = Wire1695 | Wire1696
type Wire1695 = boolean
type Wire1696 = 'false' | 'true'
type Wire1697 = '/audio/merge'
type Wire1698 = Wire1699 | Wire1700
type Wire1699 = string
type Wire1700 = 'average' | 'sum'
type Wire1701 = {
  amplitude_scale?: Wire1702
  antialiasing?: Wire1706
  axis_label_color?: Wire1714
  background_color?: Wire1717
  bar_gap?: Wire1720
  bar_style?: Wire1724
  bar_width?: Wire1727
  bits?: Wire1731
  border_color?: Wire1739
  center_color?: Wire1742
  color_map?: Wire1745
  colors?: Wire1748
  compression?: Wire1751
  end?: Wire1755
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  format?: Wire1759
  frequency_max?: Wire1762
  frequency_min?: Wire1766
  frequency_scale?: Wire1770
  gain?: Wire1773
  height?: Wire1777
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  legend?: Wire1781
  no_axis_labels?: Wire1786
  orientation?: Wire1791
  outer_color?: Wire1794
  output_meta?: Wire1414
  pixels_per_second?: Wire1797
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1801
  split_channels?: Wire1802
  start?: Wire1807
  style?: Wire1811
  use?: Wire1620
  user_meta?: Wire1438
  waveform_style?: Wire1819
  width?: Wire1822
  with_axis_labels?: Wire1826
  zoom?: Wire1831
}
type Wire1702 = Wire1703 | Wire1704 | Wire1705
type Wire1703 = string
type Wire1704 = string
type Wire1705 = number
type Wire1706 = Wire1707 | Wire1708 | Wire1711 | Wire1417
type Wire1707 = string
type Wire1708 = Wire1709 | Wire1710
type Wire1709 = string
type Wire1710 = 0
type Wire1711 = Wire1712 | Wire1713
type Wire1712 = string
type Wire1713 = 1
type Wire1714 = Wire1715 | Wire1716
type Wire1715 = string
type Wire1716 = string
type Wire1717 = Wire1718 | Wire1719
type Wire1718 = string
type Wire1719 = string
type Wire1720 = Wire1721 | Wire1722 | Wire1723
type Wire1721 = string
type Wire1722 = string
type Wire1723 = number
type Wire1724 = Wire1725 | Wire1726
type Wire1725 = string
type Wire1726 = 'rounded' | 'square'
type Wire1727 = Wire1728 | Wire1729 | Wire1730
type Wire1728 = string
type Wire1729 = string
type Wire1730 = number
type Wire1731 = Wire1732 | Wire1733 | Wire1736
type Wire1732 = string
type Wire1733 = Wire1734 | Wire1735
type Wire1734 = string
type Wire1735 = 8
type Wire1736 = Wire1737 | Wire1738
type Wire1737 = string
type Wire1738 = 16
type Wire1739 = Wire1740 | Wire1741
type Wire1740 = string
type Wire1741 = string
type Wire1742 = Wire1743 | Wire1744
type Wire1743 = string
type Wire1744 = string
type Wire1745 = Wire1746 | Wire1747
type Wire1746 = string
type Wire1747 =
  | 'cividis'
  | 'cool'
  | 'fiery'
  | 'fire'
  | 'fruit'
  | 'gray'
  | 'green'
  | 'magma'
  | 'moreland'
  | 'nebulae'
  | 'plasma'
  | 'rainbow'
  | 'terrain'
  | 'viridis'
type Wire1748 = Wire1749 | Wire1750
type Wire1749 = string
type Wire1750 = 'audacity' | 'audition'
type Wire1751 = Wire1752 | Wire1753 | Wire1754
type Wire1752 = string
type Wire1753 = string
type Wire1754 = number
type Wire1755 = Wire1756 | Wire1757 | Wire1758
type Wire1756 = string
type Wire1757 = string
type Wire1758 = number
type Wire1759 = Wire1760 | Wire1761
type Wire1760 = string
type Wire1761 = 'image' | 'json'
type Wire1762 = Wire1763 | Wire1764 | Wire1765
type Wire1763 = string
type Wire1764 = string
type Wire1765 = number
type Wire1766 = Wire1767 | Wire1768 | Wire1769
type Wire1767 = string
type Wire1768 = string
type Wire1769 = number
type Wire1770 = Wire1771 | Wire1772
type Wire1771 = string
type Wire1772 = 'linear' | 'logarithmic'
type Wire1773 = Wire1774 | Wire1775 | Wire1776
type Wire1774 = string
type Wire1775 = string
type Wire1776 = number
type Wire1777 = Wire1778 | Wire1779 | Wire1780
type Wire1778 = string
type Wire1779 = string
type Wire1780 = number
type Wire1781 = Wire1782 | Wire1783
type Wire1782 = string
type Wire1783 = Wire1784 | Wire1785
type Wire1784 = boolean
type Wire1785 = 'false' | 'true'
type Wire1786 = Wire1787 | Wire1788
type Wire1787 = string
type Wire1788 = Wire1789 | Wire1790
type Wire1789 = boolean
type Wire1790 = 'false' | 'true'
type Wire1791 = Wire1792 | Wire1793
type Wire1792 = string
type Wire1793 = 'horizontal' | 'vertical'
type Wire1794 = Wire1795 | Wire1796
type Wire1795 = string
type Wire1796 = string
type Wire1797 = Wire1798 | Wire1799 | Wire1800
type Wire1798 = string
type Wire1799 = string
type Wire1800 = number
type Wire1801 = '/audio/waveform'
type Wire1802 = Wire1803 | Wire1804
type Wire1803 = string
type Wire1804 = Wire1805 | Wire1806
type Wire1805 = boolean
type Wire1806 = 'false' | 'true'
type Wire1807 = Wire1808 | Wire1809 | Wire1810
type Wire1808 = string
type Wire1809 = string
type Wire1810 = number
type Wire1811 = Wire1812 | Wire1813
type Wire1812 = string
type Wire1813 = Wire1814 | Wire1815 | Wire1816 | Wire1817 | Wire1818
type Wire1814 = 'spectrogram' | 'v0' | 'v1'
type Wire1815 = 0
type Wire1816 = 1
type Wire1817 = '0'
type Wire1818 = '1'
type Wire1819 = Wire1820 | Wire1821
type Wire1820 = string
type Wire1821 = 'bars' | 'normal'
type Wire1822 = Wire1823 | Wire1824 | Wire1825
type Wire1823 = string
type Wire1824 = string
type Wire1825 = number
type Wire1826 = Wire1827 | Wire1828
type Wire1827 = string
type Wire1828 = Wire1829 | Wire1830
type Wire1829 = boolean
type Wire1830 = 'false' | 'true'
type Wire1831 = Wire1832 | Wire1833 | Wire1834
type Wire1832 = string
type Wire1833 = string
type Wire1834 = number
type Wire1835 = {
  account?: Wire1836
  container?: Wire1839
  credentials?: Wire1842
  files_per_page?: Wire1845
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire1849
  next_page_token?: Wire1852
  output_meta?: Wire1414
  path: Wire1855
  queue?: Wire1425
  recursive?: Wire1860
  result?: Wire1432
  robot: Wire1865
  user_meta?: Wire1438
}
type Wire1836 = Wire1837 | Wire1838
type Wire1837 = string
type Wire1838 = string
type Wire1839 = Wire1840 | Wire1841
type Wire1840 = string
type Wire1841 = string
type Wire1842 = Wire1843 | Wire1844
type Wire1843 = string
type Wire1844 = string
type Wire1845 = Wire1846 | Wire1847 | Wire1848
type Wire1846 = string
type Wire1847 = string
type Wire1848 = number
type Wire1849 = Wire1850 | Wire1851
type Wire1850 = string
type Wire1851 = string
type Wire1852 = Wire1853 | Wire1854
type Wire1853 = string
type Wire1854 = string
type Wire1855 = Wire1856 | Wire1857 | Wire1387
type Wire1856 = string
type Wire1857 = Wire1858 | Wire1859
type Wire1858 = string
type Wire1859 = string
type Wire1860 = Wire1861 | Wire1862
type Wire1861 = string
type Wire1862 = Wire1863 | Wire1864
type Wire1863 = boolean
type Wire1864 = 'false' | 'true'
type Wire1865 = '/azure/import'
type Wire1866 = {
  account?: Wire1867
  cache_control?: Wire1870
  container?: Wire1873
  content_disposition?: Wire1876
  content_encoding?: Wire1879
  content_language?: Wire1882
  content_type?: Wire1885
  credentials?: Wire1842
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire1888
  metadata?: Wire1891
  output_meta?: Wire1414
  path?: Wire1898
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1901
  sas_expires_in?: Wire1902
  sas_permissions?: Wire1906
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1867 = Wire1868 | Wire1869
type Wire1868 = string
type Wire1869 = string
type Wire1870 = Wire1871 | Wire1872
type Wire1871 = string
type Wire1872 = string
type Wire1873 = Wire1874 | Wire1875
type Wire1874 = string
type Wire1875 = string
type Wire1876 = Wire1877 | Wire1878
type Wire1877 = string
type Wire1878 = string
type Wire1879 = Wire1880 | Wire1881
type Wire1880 = string
type Wire1881 = string
type Wire1882 = Wire1883 | Wire1884
type Wire1883 = string
type Wire1884 = string
type Wire1885 = Wire1886 | Wire1887
type Wire1886 = string
type Wire1887 = string
type Wire1888 = Wire1889 | Wire1890
type Wire1889 = string
type Wire1890 = string
type Wire1891 = { [key: string]: Wire1892 | undefined }
type Wire1892 = Wire1893 | Wire1894
type Wire1893 = string
type Wire1894 = Wire1895 | Wire1896 | Wire1897
type Wire1895 = string
type Wire1896 = number
type Wire1897 = boolean
type Wire1898 = Wire1899 | Wire1900
type Wire1899 = string
type Wire1900 = string
type Wire1901 = '/azure/store'
type Wire1902 = Wire1903 | Wire1904 | Wire1905
type Wire1903 = string
type Wire1904 = string
type Wire1905 = number
type Wire1906 = Wire1907 | Wire1908
type Wire1907 = string
type Wire1908 = string
type Wire1909 = {
  app_key?: Wire1910
  app_key_id?: Wire1913
  bucket?: Wire1916
  credentials?: Wire1919
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path: Wire1926
  queue?: Wire1425
  recursive?: Wire1931
  result?: Wire1432
  robot: Wire1936
  start_file_name?: Wire1937
  user_meta?: Wire1438
}
type Wire1910 = Wire1911 | Wire1912
type Wire1911 = string
type Wire1912 = string
type Wire1913 = Wire1914 | Wire1915
type Wire1914 = string
type Wire1915 = string
type Wire1916 = Wire1917 | Wire1918
type Wire1917 = string
type Wire1918 = string
type Wire1919 = Wire1920 | Wire1921
type Wire1920 = string
type Wire1921 = string
type Wire1922 = Wire1923 | Wire1924 | Wire1925
type Wire1923 = string
type Wire1924 = string
type Wire1925 = number
type Wire1926 = Wire1927 | Wire1928 | Wire1387
type Wire1927 = string
type Wire1928 = Wire1929 | Wire1930
type Wire1929 = string
type Wire1930 = string
type Wire1931 = Wire1932 | Wire1933
type Wire1932 = string
type Wire1933 = Wire1934 | Wire1935
type Wire1934 = boolean
type Wire1935 = 'false' | 'true'
type Wire1936 = '/backblaze/import'
type Wire1937 = Wire1938 | Wire1939
type Wire1938 = string
type Wire1939 = string
type Wire1940 = {
  app_key?: Wire1941
  app_key_id?: Wire1944
  bucket?: Wire1947
  credentials?: Wire1919
  force_accept?: Wire1376
  headers?: Wire1950
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire1898
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1954
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1941 = Wire1942 | Wire1943
type Wire1942 = string
type Wire1943 = string
type Wire1944 = Wire1945 | Wire1946
type Wire1945 = string
type Wire1946 = string
type Wire1947 = Wire1948 | Wire1949
type Wire1948 = string
type Wire1949 = string
type Wire1950 = { [key: string]: Wire1951 | undefined }
type Wire1951 = Wire1952 | Wire1953
type Wire1952 = string
type Wire1953 = string
type Wire1954 = '/backblaze/store'
type Wire1955 = {
  credentials?: Wire1956
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path: Wire1959
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1964
  user_meta?: Wire1438
}
type Wire1956 = Wire1957 | Wire1958
type Wire1957 = string
type Wire1958 = string
type Wire1959 = Wire1960 | Wire1961 | Wire1387
type Wire1960 = string
type Wire1961 = Wire1962 | Wire1963
type Wire1962 = string
type Wire1963 = string
type Wire1964 = '/box/import'
type Wire1965 = {
  create_sharing_link?: Wire1966
  credentials?: Wire1956
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire1898
  queue?: Wire1425
  result?: Wire1432
  robot: Wire1971
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire1966 = Wire1967 | Wire1968
type Wire1967 = string
type Wire1968 = Wire1969 | Wire1970
type Wire1969 = boolean
type Wire1970 = 'false' | 'true'
type Wire1971 = '/box/store'
type Wire1972 = {
  bucket?: Wire1973
  bucket_region?: Wire1976
  credentials?: Wire1979
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire1982
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire1985
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire1997
  result?: Wire1649
  return_file_stubs?: Wire2002
  robot: Wire2007
  secret?: Wire2008
  user_meta?: Wire1438
}
type Wire1973 = Wire1974 | Wire1975
type Wire1974 = string
type Wire1975 = string
type Wire1976 = Wire1977 | Wire1978
type Wire1977 = string
type Wire1978 = string
type Wire1979 = Wire1980 | Wire1981
type Wire1980 = string
type Wire1981 = string
type Wire1982 = Wire1983 | Wire1984
type Wire1983 = string
type Wire1984 = string
type Wire1985 = Wire1986 | Wire1987
type Wire1986 = string
type Wire1987 = string
type Wire1988 = Wire1989 | Wire1990 | Wire1991
type Wire1989 = string
type Wire1990 = string
type Wire1991 = number
type Wire1992 = Wire1993 | Wire1994 | Wire1387
type Wire1993 = string
type Wire1994 = Wire1995 | Wire1996
type Wire1995 = string
type Wire1996 = string
type Wire1997 = Wire1998 | Wire1999
type Wire1998 = string
type Wire1999 = Wire2000 | Wire2001
type Wire2000 = boolean
type Wire2001 = 'false' | 'true'
type Wire2002 = Wire2003 | Wire2004
type Wire2003 = string
type Wire2004 = Wire2005 | Wire2006
type Wire2005 = boolean
type Wire2006 = 'false' | 'true'
type Wire2007 = '/mega/import'
type Wire2008 = Wire2009 | Wire2010
type Wire2009 = string
type Wire2010 = string
type Wire2011 = {
  acl?: Wire2012
  bucket?: Wire2015
  bucket_region?: Wire2018
  credentials?: Wire1979
  force_accept?: Wire1376
  headers?: Wire2021
  host?: Wire2025
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire2028
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2034
  secret?: Wire2035
  sign_urls_for?: Wire2038
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2012 = Wire2013 | Wire2014
type Wire2013 = string
type Wire2014 = 'private' | 'public-read'
type Wire2015 = Wire2016 | Wire2017
type Wire2016 = string
type Wire2017 = string
type Wire2018 = Wire2019 | Wire2020
type Wire2019 = string
type Wire2020 = string
type Wire2021 = { [key: string]: Wire2022 | undefined }
type Wire2022 = Wire2023 | Wire2024
type Wire2023 = string
type Wire2024 = string
type Wire2025 = Wire2026 | Wire2027
type Wire2026 = string
type Wire2027 = string
type Wire2028 = Wire2029 | Wire2030
type Wire2029 = string
type Wire2030 = string
type Wire2031 = Wire2032 | Wire2033
type Wire2032 = string
type Wire2033 = string
type Wire2034 = '/mega/store'
type Wire2035 = Wire2036 | Wire2037
type Wire2036 = string
type Wire2037 = string
type Wire2038 = Wire2039 | Wire2040 | Wire2041
type Wire2039 = string
type Wire2040 = string
type Wire2041 = number
type Wire2042 = {
  account_type?: Wire2043
  container?: Wire2046
  credentials?: Wire2049
  data_center?: Wire2052
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire2055
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire2058
  queue?: Wire1425
  recursive?: Wire2063
  result?: Wire1432
  robot: Wire2068
  user?: Wire2069
  user_meta?: Wire1438
}
type Wire2043 = Wire2044 | Wire2045
type Wire2044 = string
type Wire2045 = 'uk' | 'us'
type Wire2046 = Wire2047 | Wire2048
type Wire2047 = string
type Wire2048 = string
type Wire2049 = Wire2050 | Wire2051
type Wire2050 = string
type Wire2051 = string
type Wire2052 = Wire2053 | Wire2054
type Wire2053 = string
type Wire2054 = string
type Wire2055 = Wire2056 | Wire2057
type Wire2056 = string
type Wire2057 = string
type Wire2058 = Wire2059 | Wire2060 | Wire1387
type Wire2059 = string
type Wire2060 = Wire2061 | Wire2062
type Wire2061 = string
type Wire2062 = string
type Wire2063 = Wire2064 | Wire2065
type Wire2064 = string
type Wire2065 = Wire2066 | Wire2067
type Wire2066 = boolean
type Wire2067 = 'false' | 'true'
type Wire2068 = '/cloudfiles/import'
type Wire2069 = Wire2070 | Wire2071
type Wire2070 = string
type Wire2071 = string
type Wire2072 = {
  account_type?: Wire2073
  container?: Wire2076
  credentials?: Wire2049
  data_center?: Wire2079
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire2082
  output_meta?: Wire1414
  path?: Wire2085
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2088
  use?: Wire1620
  user?: Wire2089
  user_meta?: Wire1438
}
type Wire2073 = Wire2074 | Wire2075
type Wire2074 = string
type Wire2075 = 'uk' | 'us'
type Wire2076 = Wire2077 | Wire2078
type Wire2077 = string
type Wire2078 = string
type Wire2079 = Wire2080 | Wire2081
type Wire2080 = string
type Wire2081 = string
type Wire2082 = Wire2083 | Wire2084
type Wire2083 = string
type Wire2084 = string
type Wire2085 = Wire2086 | Wire2087
type Wire2086 = string
type Wire2087 = string
type Wire2088 = '/cloudfiles/store'
type Wire2089 = Wire2090 | Wire2091
type Wire2090 = string
type Wire2091 = string
type Wire2092 = {
  bucket?: Wire2093
  credentials?: Wire2096
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire2099
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire2102
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire1997
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire2105
  secret?: Wire2106
  user_meta?: Wire1438
}
type Wire2093 = Wire2094 | Wire2095
type Wire2094 = string
type Wire2095 = string
type Wire2096 = Wire2097 | Wire2098
type Wire2097 = string
type Wire2098 = string
type Wire2099 = Wire2100 | Wire2101
type Wire2100 = string
type Wire2101 = string
type Wire2102 = Wire2103 | Wire2104
type Wire2103 = string
type Wire2104 = string
type Wire2105 = '/cloudflare/import'
type Wire2106 = Wire2107 | Wire2108
type Wire2107 = string
type Wire2108 = string
type Wire2109 = {
  bucket?: Wire2110
  credentials?: Wire2096
  force_accept?: Wire1376
  headers?: Wire2113
  host?: Wire2117
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire2120
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2123
  secret?: Wire2124
  sign_urls_for?: Wire2038
  url_prefix?: Wire2127
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2110 = Wire2111 | Wire2112
type Wire2111 = string
type Wire2112 = string
type Wire2113 = { [key: string]: Wire2114 | undefined }
type Wire2114 = Wire2115 | Wire2116
type Wire2115 = string
type Wire2116 = string
type Wire2117 = Wire2118 | Wire2119
type Wire2118 = string
type Wire2119 = string
type Wire2120 = Wire2121 | Wire2122
type Wire2121 = string
type Wire2122 = string
type Wire2123 = '/cloudflare/store'
type Wire2124 = Wire2125 | Wire2126
type Wire2125 = string
type Wire2126 = string
type Wire2127 = Wire2128 | Wire2129
type Wire2128 = string
type Wire2129 = string
type Wire2130 = {
  credentials?: Wire2131
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire2134
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire2137
  queue?: Wire1425
  recursive?: Wire2142
  region?: Wire2147
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire2150
  secret?: Wire2151
  space?: Wire2154
  user_meta?: Wire1438
}
type Wire2131 = Wire2132 | Wire2133
type Wire2132 = string
type Wire2133 = string
type Wire2134 = Wire2135 | Wire2136
type Wire2135 = string
type Wire2136 = string
type Wire2137 = Wire2138 | Wire2139 | Wire1387
type Wire2138 = string
type Wire2139 = Wire2140 | Wire2141
type Wire2140 = string
type Wire2141 = string
type Wire2142 = Wire2143 | Wire2144
type Wire2143 = string
type Wire2144 = Wire2145 | Wire2146
type Wire2145 = boolean
type Wire2146 = 'false' | 'true'
type Wire2147 = Wire2148 | Wire2149
type Wire2148 = string
type Wire2149 = string
type Wire2150 = '/digitalocean/import'
type Wire2151 = Wire2152 | Wire2153
type Wire2152 = string
type Wire2153 = string
type Wire2154 = Wire2155 | Wire2156
type Wire2155 = string
type Wire2156 = string
type Wire2157 = {
  acl?: Wire2012
  credentials?: Wire2131
  force_accept?: Wire1376
  headers?: Wire2158
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire2162
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  region?: Wire2165
  result?: Wire1432
  robot: Wire2168
  secret?: Wire2169
  sign_urls_for?: Wire2038
  space?: Wire2172
  url_prefix?: Wire2175
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2158 = { [key: string]: Wire2159 | undefined }
type Wire2159 = Wire2160 | Wire2161
type Wire2160 = string
type Wire2161 = string
type Wire2162 = Wire2163 | Wire2164
type Wire2163 = string
type Wire2164 = string
type Wire2165 = Wire2166 | Wire2167
type Wire2166 = string
type Wire2167 = string
type Wire2168 = '/digitalocean/store'
type Wire2169 = Wire2170 | Wire2171
type Wire2170 = string
type Wire2171 = string
type Wire2172 = Wire2173 | Wire2174
type Wire2173 = string
type Wire2174 = string
type Wire2175 = Wire2176 | Wire2177
type Wire2176 = string
type Wire2177 = string
type Wire2178 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2179
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2179 = '/document/autorotate'
type Wire2180 = {
  force_accept?: Wire1376
  format: Wire2181
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  markdown_format?: Wire2184
  markdown_theme?: Wire2187
  output_meta?: Wire1414
  pdf_display_header_footer?: Wire2190
  pdf_footer_template?: Wire2195
  pdf_format?: Wire2198
  pdf_header_template?: Wire2201
  pdf_margin?: Wire2204
  pdf_print_background?: Wire2207
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2212
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2181 = Wire2182 | Wire2183
type Wire2182 = string
type Wire2183 =
  | 'ai'
  | 'csv'
  | 'doc'
  | 'docx'
  | 'eps'
  | 'gif'
  | 'html'
  | 'jpeg'
  | 'jpg'
  | 'latex'
  | 'md'
  | 'oda'
  | 'odd'
  | 'odt'
  | 'ott'
  | 'pdf'
  | 'png'
  | 'pot'
  | 'pps'
  | 'ppt'
  | 'pptx'
  | 'ppz'
  | 'ps'
  | 'rtf'
  | 'rtx'
  | 'srt'
  | 'svg'
  | 'text'
  | 'txt'
  | 'vtt'
  | 'xhtml'
  | 'xla'
  | 'xls'
  | 'xlsx'
  | 'xml'
type Wire2184 = Wire2185 | Wire2186
type Wire2185 = string
type Wire2186 = 'commonmark' | 'gfm'
type Wire2187 = Wire2188 | Wire2189
type Wire2188 = string
type Wire2189 = 'bare' | 'github'
type Wire2190 = Wire2191 | Wire2192
type Wire2191 = string
type Wire2192 = Wire2193 | Wire2194
type Wire2193 = boolean
type Wire2194 = 'false' | 'true'
type Wire2195 = Wire2196 | Wire2197
type Wire2196 = string
type Wire2197 = string
type Wire2198 = Wire2199 | Wire2200
type Wire2199 = string
type Wire2200 =
  'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'Ledger' | 'Legal' | 'Letter' | 'Tabloid'
type Wire2201 = Wire2202 | Wire2203
type Wire2202 = string
type Wire2203 = string
type Wire2204 = Wire2205 | Wire2206
type Wire2205 = string
type Wire2206 = string
type Wire2207 = Wire2208 | Wire2209
type Wire2208 = string
type Wire2209 = Wire2210 | Wire2211
type Wire2210 = boolean
type Wire2211 = 'false' | 'true'
type Wire2212 = '/document/convert'
type Wire2213 = {
  dedupe_images?: Wire2214
  extract?: Wire2219
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  image_format?: Wire2230
  include_image_masks?: Wire2233
  interpolate?: Wire1406
  min_image_bytes?: Wire2238
  min_image_height?: Wire2242
  min_image_width?: Wire2246
  ocr_provider?: Wire2250
  output_meta?: Wire1414
  page_range?: Wire2253
  password?: Wire2256
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2259
  text_format?: Wire2260
  text_granularity?: Wire2263
  text_method?: Wire2266
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2214 = Wire2215 | Wire2216
type Wire2215 = string
type Wire2216 = Wire2217 | Wire2218
type Wire2217 = boolean
type Wire2218 = 'false' | 'true'
type Wire2219 = Wire2220 | Wire2221 | Wire2224
type Wire2220 = string
type Wire2221 = Wire2222 | Wire2223
type Wire2222 = string
type Wire2223 = 'images' | 'text'
type Wire2224 = Wire2225 | Wire2226
type Wire2225 = string
type Wire2226 = Array<Wire2227>
type Wire2227 = Wire2228 | Wire2229
type Wire2228 = string
type Wire2229 = 'images' | 'text'
type Wire2230 = Wire2231 | Wire2232
type Wire2231 = string
type Wire2232 = 'auto' | 'jpg' | 'original' | 'png'
type Wire2233 = Wire2234 | Wire2235
type Wire2234 = string
type Wire2235 = Wire2236 | Wire2237
type Wire2236 = boolean
type Wire2237 = 'false' | 'true'
type Wire2238 = Wire2239 | Wire2240 | Wire2241
type Wire2239 = string
type Wire2240 = string
type Wire2241 = number
type Wire2242 = Wire2243 | Wire2244 | Wire2245
type Wire2243 = string
type Wire2244 = string
type Wire2245 = number
type Wire2246 = Wire2247 | Wire2248 | Wire2249
type Wire2247 = string
type Wire2248 = string
type Wire2249 = number
type Wire2250 = Wire2251 | Wire2252
type Wire2251 = string
type Wire2252 = 'aws' | 'gcp'
type Wire2253 = Wire2254 | Wire2255
type Wire2254 = string
type Wire2255 = string
type Wire2256 = Wire2257 | Wire2258
type Wire2257 = string
type Wire2258 = string
type Wire2259 = '/document/extract'
type Wire2260 = Wire2261 | Wire2262
type Wire2261 = string
type Wire2262 = 'json' | 'txt'
type Wire2263 = Wire2264 | Wire2265
type Wire2264 = string
type Wire2265 = 'document' | 'page'
type Wire2266 = Wire2267 | Wire2268
type Wire2267 = string
type Wire2268 = 'auto' | 'native' | 'ocr'
type Wire2269 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  input_passwords?: Wire2270
  interpolate?: Wire1406
  output_meta?: Wire1414
  output_password?: Wire2276
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2279
  sort_by?: Wire1659
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2270 = Wire2271 | Wire2272
type Wire2271 = string
type Wire2272 = Array<Wire2273>
type Wire2273 = Wire2274 | Wire2275
type Wire2274 = string
type Wire2275 = string
type Wire2276 = Wire2277 | Wire2278
type Wire2277 = string
type Wire2278 = string
type Wire2279 = '/document/merge'
type Wire2280 = {
  force_accept?: Wire1376
  format?: Wire2281
  granularity?: Wire2284
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  provider?: Wire2287
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2290
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2281 = Wire2282 | Wire2283
type Wire2282 = string
type Wire2283 = 'json' | 'meta' | 'text'
type Wire2284 = Wire2285 | Wire2286
type Wire2285 = string
type Wire2286 = 'full' | 'list'
type Wire2287 = Wire2288 | Wire2289
type Wire2288 = string
type Wire2289 = 'auto' | 'aws' | 'gcp'
type Wire2290 = '/document/ocr'
type Wire2291 = {
  compatibility?: Wire2292
  compress_fonts?: Wire2295
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  image_dpi?: Wire2300
  interpolate?: Wire1406
  linearize?: Wire2304
  output_meta?: Wire1414
  preset?: Wire2309
  queue?: Wire1425
  remove_metadata?: Wire2312
  result?: Wire1432
  robot: Wire2317
  subset_fonts?: Wire2318
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2292 = Wire2293 | Wire2294
type Wire2293 = string
type Wire2294 = '1.4' | '1.5' | '1.6' | '1.7' | '2.0'
type Wire2295 = Wire2296 | Wire2297
type Wire2296 = string
type Wire2297 = Wire2298 | Wire2299
type Wire2298 = boolean
type Wire2299 = 'false' | 'true'
type Wire2300 = Wire2301 | Wire2302 | Wire2303
type Wire2301 = string
type Wire2302 = string
type Wire2303 = number
type Wire2304 = Wire2305 | Wire2306
type Wire2305 = string
type Wire2306 = Wire2307 | Wire2308
type Wire2307 = boolean
type Wire2308 = 'false' | 'true'
type Wire2309 = Wire2310 | Wire2311
type Wire2310 = string
type Wire2311 = 'ebook' | 'prepress' | 'printer' | 'screen'
type Wire2312 = Wire2313 | Wire2314
type Wire2313 = string
type Wire2314 = Wire2315 | Wire2316
type Wire2315 = boolean
type Wire2316 = 'false' | 'true'
type Wire2317 = '/document/optimize'
type Wire2318 = Wire2319 | Wire2320
type Wire2319 = string
type Wire2320 = Wire2321 | Wire2322
type Wire2321 = boolean
type Wire2322 = 'false' | 'true'
type Wire2323 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2324
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2324 = '/file/read'
type Wire2325 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  pages?: Wire2326
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2331
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2326 = Wire2327 | Wire2328 | Wire1387
type Wire2327 = string
type Wire2328 = Wire2329 | Wire2330
type Wire2329 = string
type Wire2330 = string
type Wire2331 = '/document/split'
type Wire2332 = {
  alpha?: Wire2333
  antialiasing?: Wire2336
  background?: Wire2341
  colorspace?: Wire2344
  delay?: Wire2347
  density?: Wire2351
  force_accept?: Wire1376
  format?: Wire2354
  height?: Wire2357
  ignore_errors?: Wire1607
  imagemagick_stack?: Wire2361
  interpolate?: Wire1406
  output_meta?: Wire1414
  page?: Wire2369
  page_range?: Wire2375
  pdf_use_cropbox?: Wire2380
  queue?: Wire1425
  resize_strategy?: Wire2385
  result?: Wire1432
  robot: Wire2388
  stack?: Wire2389
  trim_whitespace?: Wire2392
  turbo?: Wire2397
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire2402
}
type Wire2333 = Wire2334 | Wire2335
type Wire2334 = string
type Wire2335 = 'Remove' | 'Set'
type Wire2336 = Wire2337 | Wire2338
type Wire2337 = string
type Wire2338 = Wire2339 | Wire2340
type Wire2339 = boolean
type Wire2340 = 'false' | 'true'
type Wire2341 = Wire2342 | Wire2343
type Wire2342 = string
type Wire2343 = string
type Wire2344 = Wire2345 | Wire2346
type Wire2345 = string
type Wire2346 =
  | 'CMY'
  | 'CMYK'
  | 'Gray'
  | 'HCL'
  | 'HCLp'
  | 'HSB'
  | 'HSI'
  | 'HSL'
  | 'HSV'
  | 'HWB'
  | 'Jzazbz'
  | 'LCHab'
  | 'LCHuv'
  | 'LMS'
  | 'Lab'
  | 'Log'
  | 'Luv'
  | 'OHTA'
  | 'OkLCH'
  | 'OkLab'
  | 'RGB'
  | 'Rec601YCbCr'
  | 'Rec709YCbCr'
  | 'Transparent'
  | 'Undefined'
  | 'XYZ'
  | 'YCC'
  | 'YCbCr'
  | 'YDbDr'
  | 'YIQ'
  | 'YPbPr'
  | 'YUV'
  | 'sRGB'
  | 'scRGB'
  | 'xyY'
type Wire2347 = Wire2348 | Wire2349 | Wire2350
type Wire2348 = string
type Wire2349 = string
type Wire2350 = number
type Wire2351 = Wire2352 | Wire2353
type Wire2352 = string
type Wire2353 = string
type Wire2354 = Wire2355 | Wire2356
type Wire2355 = string
type Wire2356 = 'gif' | 'jpeg' | 'jpg' | 'png'
type Wire2357 = Wire2358 | Wire2359 | Wire2360
type Wire2358 = string
type Wire2359 = string
type Wire2360 = number
type Wire2361 = Wire2362 | Wire2363 | Wire2366
type Wire2362 = string
type Wire2363 = Wire2364 | Wire2365
type Wire2364 = string
type Wire2365 = 'v3'
type Wire2366 = Wire2367 | Wire2368
type Wire2367 = string
type Wire2368 = string
type Wire2369 = Wire2370 | Wire2374
type Wire2370 = Wire2371 | Wire2372 | Wire2373
type Wire2371 = string
type Wire2372 = string
type Wire2373 = number
type Wire2374 = null
type Wire2375 = Wire2376 | Wire2379
type Wire2376 = Wire2377 | Wire2378
type Wire2377 = string
type Wire2378 = string
type Wire2379 = null
type Wire2380 = Wire2381 | Wire2382
type Wire2381 = string
type Wire2382 = Wire2383 | Wire2384
type Wire2383 = boolean
type Wire2384 = 'false' | 'true'
type Wire2385 = Wire2386 | Wire2387
type Wire2386 = string
type Wire2387 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire2388 = '/document/thumbs'
type Wire2389 = Wire2390 | Wire2391
type Wire2390 = string
type Wire2391 = 'ghostscript' | 'pdfium' | 'vips'
type Wire2392 = Wire2393 | Wire2394
type Wire2393 = string
type Wire2394 = Wire2395 | Wire2396
type Wire2395 = boolean
type Wire2396 = 'false' | 'true'
type Wire2397 = Wire2398 | Wire2399
type Wire2398 = string
type Wire2399 = Wire2400 | Wire2401
type Wire2400 = boolean
type Wire2401 = 'false' | 'true'
type Wire2402 = Wire2403 | Wire2404 | Wire2405
type Wire2403 = string
type Wire2404 = string
type Wire2405 = number
type Wire2406 = {
  access_token?: Wire2407
  credentials?: Wire2410
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path: Wire2413
  queue?: Wire1425
  refresh_token?: Wire2418
  result?: Wire1432
  robot: Wire2421
  user_meta?: Wire1438
}
type Wire2407 = Wire2408 | Wire2409
type Wire2408 = string
type Wire2409 = string
type Wire2410 = Wire2411 | Wire2412
type Wire2411 = string
type Wire2412 = string
type Wire2413 = Wire2414 | Wire2415 | Wire1387
type Wire2414 = string
type Wire2415 = Wire2416 | Wire2417
type Wire2416 = string
type Wire2417 = string
type Wire2418 = Wire2419 | Wire2420
type Wire2419 = string
type Wire2420 = string
type Wire2421 = '/dropbox/import'
type Wire2422 = {
  create_sharing_link?: Wire1966
  credentials?: Wire2410
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire1898
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2423
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2423 = '/dropbox/store'
type Wire2424 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2425
  user_meta?: Wire1438
}
type Wire2425 = '/edgly/deliver'
type Wire2426 = {
  archive_name?: Wire2427
  compression_level?: Wire2430
  file_layout?: Wire2434
  force_accept?: Wire1376
  format?: Wire2437
  gzip?: Wire2440
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  password?: Wire2445
  path?: Wire2450
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2453
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2427 = Wire2428 | Wire2429
type Wire2428 = string
type Wire2429 = string
type Wire2430 = Wire2431 | Wire2432 | Wire2433
type Wire2431 = string
type Wire2432 = string
type Wire2433 = number
type Wire2434 = Wire2435 | Wire2436
type Wire2435 = string
type Wire2436 = 'advanced' | 'relative-path' | 'simple'
type Wire2437 = Wire2438 | Wire2439
type Wire2438 = string
type Wire2439 = 'tar' | 'zip'
type Wire2440 = Wire2441 | Wire2442
type Wire2441 = string
type Wire2442 = Wire2443 | Wire2444
type Wire2443 = boolean
type Wire2444 = 'false' | 'true'
type Wire2445 = Wire2446 | Wire2449
type Wire2446 = Wire2447 | Wire2448
type Wire2447 = string
type Wire2448 = string
type Wire2449 = null
type Wire2450 = Wire2451 | Wire2452
type Wire2451 = string
type Wire2452 = string
type Wire2453 = '/file/compress'
type Wire2454 = {
  force_accept?: Wire1376
  ignore_errors?: Wire2455
  interpolate?: Wire1406
  output_meta?: Wire1414
  password?: Wire2461
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2464
  turbo?: Wire2465
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2455 = Wire2456 | Wire2457
type Wire2456 = string
type Wire2457 = Wire2458 | Wire2459
type Wire2458 = boolean
type Wire2459 = Array<Wire2460>
type Wire2460 = 'execute' | 'meta'
type Wire2461 = Wire2462 | Wire2463
type Wire2462 = string
type Wire2463 = string
type Wire2464 = '/file/decompress'
type Wire2465 = Wire2466 | Wire2467
type Wire2466 = string
type Wire2467 = Wire2468 | Wire2469
type Wire2468 = boolean
type Wire2469 = 'false' | 'true'
type Wire2470 = {
  accepts?: Wire2471
  condition_type?: Wire2545
  declines?: Wire2548
  error_msg?: Wire2554
  error_on_decline?: Wire2557
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2562
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2471 = Wire2472 | Wire2473 | Wire2474 | Wire2477
type Wire2472 = string
type Wire2473 = null
type Wire2474 = Wire2475 | Wire2476
type Wire2475 = string
type Wire2476 = string
type Wire2477 = Wire2478 | Wire2479
type Wire2478 = string
type Wire2479 = Array<Wire2480>
type Wire2480 = Wire2481 | Wire2482
type Wire2481 = string
type Wire2482 = [Wire2483, Wire2498, Wire2483]
type Wire2483 = Wire2484 | Wire2485 | Wire1462 | Wire2488 | Wire2489
type Wire2484 = string
type Wire2485 = Wire2486 | Wire2487
type Wire2486 = string
type Wire2487 = string
type Wire2488 = null
type Wire2489 = Wire2490 | Wire2491
type Wire2490 = string
type Wire2491 = Array<Wire2492>
type Wire2492 = Wire2493 | Wire2494 | Wire1462 | Wire2497
type Wire2493 = string
type Wire2494 = Wire2495 | Wire2496
type Wire2495 = string
type Wire2496 = string
type Wire2497 = null
type Wire2498 =
  | Wire2499
  | Wire2500
  | Wire2503
  | Wire2506
  | Wire2509
  | Wire2512
  | Wire2515
  | Wire2518
  | Wire2521
  | Wire2524
  | Wire2527
  | Wire2530
  | Wire2533
  | Wire2536
  | Wire2539
  | Wire2542
type Wire2499 = string
type Wire2500 = Wire2501 | Wire2502
type Wire2501 = string
type Wire2502 = '='
type Wire2503 = Wire2504 | Wire2505
type Wire2504 = string
type Wire2505 = '=='
type Wire2506 = Wire2507 | Wire2508
type Wire2507 = string
type Wire2508 = '==='
type Wire2509 = Wire2510 | Wire2511
type Wire2510 = string
type Wire2511 = '<'
type Wire2512 = Wire2513 | Wire2514
type Wire2513 = string
type Wire2514 = '>'
type Wire2515 = Wire2516 | Wire2517
type Wire2516 = string
type Wire2517 = '<='
type Wire2518 = Wire2519 | Wire2520
type Wire2519 = string
type Wire2520 = '>='
type Wire2521 = Wire2522 | Wire2523
type Wire2522 = string
type Wire2523 = '!='
type Wire2524 = Wire2525 | Wire2526
type Wire2525 = string
type Wire2526 = '!=='
type Wire2527 = Wire2528 | Wire2529
type Wire2528 = string
type Wire2529 = 'regex'
type Wire2530 = Wire2531 | Wire2532
type Wire2531 = string
type Wire2532 = '!regex'
type Wire2533 = Wire2534 | Wire2535
type Wire2534 = string
type Wire2535 = 'includes'
type Wire2536 = Wire2537 | Wire2538
type Wire2537 = string
type Wire2538 = '!includes'
type Wire2539 = Wire2540 | Wire2541
type Wire2540 = string
type Wire2541 = 'empty'
type Wire2542 = Wire2543 | Wire2544
type Wire2543 = string
type Wire2544 = '!empty'
type Wire2545 = Wire2546 | Wire2547
type Wire2546 = string
type Wire2547 = 'and' | 'or'
type Wire2548 = Wire2549 | Wire2550 | Wire2551 | Wire2477
type Wire2549 = string
type Wire2550 = null
type Wire2551 = Wire2552 | Wire2553
type Wire2552 = string
type Wire2553 = string
type Wire2554 = Wire2555 | Wire2556
type Wire2555 = string
type Wire2556 = string
type Wire2557 = Wire2558 | Wire2559
type Wire2558 = string
type Wire2559 = Wire2560 | Wire2561
type Wire2560 = boolean
type Wire2561 = 'false' | 'true'
type Wire2562 = '/file/filter'
type Wire2563 = {
  algorithm?: Wire2564
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  partial?: Wire2567
  partial_size?: Wire2570
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2574
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2564 = Wire2565 | Wire2566
type Wire2565 = string
type Wire2566 = 'b2' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512'
type Wire2567 = Wire2568 | Wire2569
type Wire2568 = string
type Wire2569 = 'both' | 'first' | 'full' | 'last'
type Wire2570 = Wire2571 | Wire2572 | Wire2573
type Wire2571 = string
type Wire2572 = string
type Wire2573 = number
type Wire2574 = '/file/hash'
type Wire2575 = {
  artwork_center_color?: Wire2576
  artwork_outer_color?: Wire2579
  background?: Wire2582
  clip_duration?: Wire2585
  clip_format?: Wire2589
  clip_framerate?: Wire2592
  clip_loop?: Wire2596
  clip_offset?: Wire2601
  force_accept?: Wire1376
  format?: Wire2605
  height?: Wire2608
  icon_style?: Wire2613
  icon_text_color?: Wire2616
  icon_text_content?: Wire2619
  icon_text_font?: Wire2622
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  optimize?: Wire2625
  optimize_priority?: Wire2630
  optimize_progressive?: Wire2633
  output_meta?: Wire1414
  queue?: Wire1425
  resize_strategy?: Wire2638
  result?: Wire1432
  robot: Wire2641
  strategy?: Wire2642
  use?: Wire1620
  user_meta?: Wire1438
  waveform_center_color?: Wire2687
  waveform_height?: Wire2690
  waveform_outer_color?: Wire2694
  waveform_width?: Wire2697
  width?: Wire2701
  zoom?: Wire2703
}
type Wire2576 = Wire2577 | Wire2578
type Wire2577 = string
type Wire2578 = string
type Wire2579 = Wire2580 | Wire2581
type Wire2580 = string
type Wire2581 = string
type Wire2582 = Wire2583 | Wire2584
type Wire2583 = string
type Wire2584 = string
type Wire2585 = Wire2586 | Wire2587 | Wire2588
type Wire2586 = string
type Wire2587 = string
type Wire2588 = number
type Wire2589 = Wire2590 | Wire2591
type Wire2590 = string
type Wire2591 = 'apng' | 'avif' | 'gif' | 'webp'
type Wire2592 = Wire2593 | Wire2594 | Wire2595
type Wire2593 = string
type Wire2594 = string
type Wire2595 = number
type Wire2596 = Wire2597 | Wire2598
type Wire2597 = string
type Wire2598 = Wire2599 | Wire2600
type Wire2599 = boolean
type Wire2600 = 'false' | 'true'
type Wire2601 = Wire2602 | Wire2603 | Wire2604
type Wire2602 = string
type Wire2603 = string
type Wire2604 = number
type Wire2605 = Wire2606 | Wire2607
type Wire2606 = string
type Wire2607 = 'avif' | 'gif' | 'jpeg' | 'jpg' | 'png' | 'webp'
type Wire2608 = Wire2609 | Wire2610
type Wire2609 = string
type Wire2610 = Wire2611 | Wire2612
type Wire2611 = number
type Wire2612 = string
type Wire2613 = Wire2614 | Wire2615
type Wire2614 = string
type Wire2615 = 'square' | 'with-text'
type Wire2616 = Wire2617 | Wire2618
type Wire2617 = string
type Wire2618 = string
type Wire2619 = Wire2620 | Wire2621
type Wire2620 = string
type Wire2621 = 'extension' | 'none'
type Wire2622 = Wire2623 | Wire2624
type Wire2623 = string
type Wire2624 = string
type Wire2625 = Wire2626 | Wire2627
type Wire2626 = string
type Wire2627 = Wire2628 | Wire2629
type Wire2628 = boolean
type Wire2629 = 'false' | 'true'
type Wire2630 = Wire2631 | Wire2632
type Wire2631 = string
type Wire2632 = 'compression-ratio' | 'conversion-speed'
type Wire2633 = Wire2634 | Wire2635
type Wire2634 = string
type Wire2635 = Wire2636 | Wire2637
type Wire2636 = boolean
type Wire2637 = 'false' | 'true'
type Wire2638 = Wire2639 | Wire2640
type Wire2639 = string
type Wire2640 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire2641 = '/file/preview'
type Wire2642 = Wire2643 | Wire2644
type Wire2643 = string
type Wire2644 = {
  archive?: Wire2645
  audio?: Wire2651
  document?: Wire2657
  image?: Wire2663
  unknown?: Wire2669
  video?: Wire2675
  webpage?: Wire2681
  [key: string]:
    | JsonValue
    | Wire2645
    | Wire2651
    | Wire2657
    | Wire2663
    | Wire2669
    | Wire2675
    | Wire2681
    | undefined
}
type Wire2645 = Wire2646 | Wire2647
type Wire2646 = string
type Wire2647 = Array<Wire2648>
type Wire2648 = Wire2649 | Wire2650
type Wire2649 = string
type Wire2650 = string
type Wire2651 = Wire2652 | Wire2653
type Wire2652 = string
type Wire2653 = Array<Wire2654>
type Wire2654 = Wire2655 | Wire2656
type Wire2655 = string
type Wire2656 = string
type Wire2657 = Wire2658 | Wire2659
type Wire2658 = string
type Wire2659 = Array<Wire2660>
type Wire2660 = Wire2661 | Wire2662
type Wire2661 = string
type Wire2662 = string
type Wire2663 = Wire2664 | Wire2665
type Wire2664 = string
type Wire2665 = Array<Wire2666>
type Wire2666 = Wire2667 | Wire2668
type Wire2667 = string
type Wire2668 = string
type Wire2669 = Wire2670 | Wire2671
type Wire2670 = string
type Wire2671 = Array<Wire2672>
type Wire2672 = Wire2673 | Wire2674
type Wire2673 = string
type Wire2674 = string
type Wire2675 = Wire2676 | Wire2677
type Wire2676 = string
type Wire2677 = Array<Wire2678>
type Wire2678 = Wire2679 | Wire2680
type Wire2679 = string
type Wire2680 = string
type Wire2681 = Wire2682 | Wire2683
type Wire2682 = string
type Wire2683 = Array<Wire2684>
type Wire2684 = Wire2685 | Wire2686
type Wire2685 = string
type Wire2686 = string
type Wire2687 = Wire2688 | Wire2689
type Wire2688 = string
type Wire2689 = string
type Wire2690 = Wire2691 | Wire2692 | Wire2693
type Wire2691 = string
type Wire2692 = string
type Wire2693 = number
type Wire2694 = Wire2695 | Wire2696
type Wire2695 = string
type Wire2696 = string
type Wire2697 = Wire2698 | Wire2699 | Wire2700
type Wire2698 = string
type Wire2699 = string
type Wire2700 = number
type Wire2701 = Wire2702 | Wire2610
type Wire2702 = string
type Wire2703 = Wire2704 | Wire2705
type Wire2704 = string
type Wire2705 = Wire2706 | Wire2707
type Wire2706 = boolean
type Wire2707 = 'false' | 'true'
type Wire2708 = {
  cache_duration?: Wire2709
  download_name?: Wire2713
  force_accept?: Wire1376
  headers?: Wire2716
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2720
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2709 = Wire2710 | Wire2711 | Wire2712
type Wire2710 = string
type Wire2711 = string
type Wire2712 = number
type Wire2713 = Wire2714 | Wire2715
type Wire2714 = string
type Wire2715 = string
type Wire2716 = { [key: string]: Wire2717 | undefined }
type Wire2717 = Wire2718 | Wire2719
type Wire2718 = string
type Wire2719 = string
type Wire2720 = '/file/serve'
type Wire2721 = {
  error_msg?: Wire2554
  error_on_decline?: Wire2557
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  repair_pdf?: Wire2722
  result?: Wire1432
  robot: Wire2727
  use?: Wire1620
  user_meta?: Wire1438
  verify_to_be?: Wire2728
}
type Wire2722 = Wire2723 | Wire2724
type Wire2723 = string
type Wire2724 = Wire2725 | Wire2726
type Wire2725 = boolean
type Wire2726 = 'false' | 'true'
type Wire2727 = '/file/verify'
type Wire2728 = Wire2729 | Wire2730
type Wire2729 = string
type Wire2730 = string
type Wire2731 = {
  error_msg?: Wire2554
  error_on_decline?: Wire2557
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2732
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2732 = '/file/virusscan'
type Wire2733 = {
  credentials?: Wire2734
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire2737
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  passive_mode?: Wire2740
  password?: Wire2745
  path: Wire2748
  port?: Wire2753
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2757
  user?: Wire2758
  user_meta?: Wire1438
}
type Wire2734 = Wire2735 | Wire2736
type Wire2735 = string
type Wire2736 = string
type Wire2737 = Wire2738 | Wire2739
type Wire2738 = string
type Wire2739 = string
type Wire2740 = Wire2741 | Wire2742
type Wire2741 = string
type Wire2742 = Wire2743 | Wire2744
type Wire2743 = boolean
type Wire2744 = 'false' | 'true'
type Wire2745 = Wire2746 | Wire2747
type Wire2746 = string
type Wire2747 = string
type Wire2748 = Wire2749 | Wire2750 | Wire1387
type Wire2749 = string
type Wire2750 = Wire2751 | Wire2752
type Wire2751 = string
type Wire2752 = string
type Wire2753 = Wire2754 | Wire2755 | Wire2756
type Wire2754 = string
type Wire2755 = string
type Wire2756 = number
type Wire2757 = '/ftp/import'
type Wire2758 = Wire2759 | Wire2760
type Wire2759 = string
type Wire2760 = string
type Wire2761 = {
  credentials?: Wire2734
  force_accept?: Wire1376
  host?: Wire2762
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  password?: Wire2765
  path?: Wire2768
  port?: Wire2753
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2771
  secure?: Wire2772
  ssl_url_template?: Wire2777
  url_template?: Wire2780
  use?: Wire1620
  user?: Wire2783
  user_meta?: Wire1438
}
type Wire2762 = Wire2763 | Wire2764
type Wire2763 = string
type Wire2764 = string
type Wire2765 = Wire2766 | Wire2767
type Wire2766 = string
type Wire2767 = string
type Wire2768 = Wire2769 | Wire2770
type Wire2769 = string
type Wire2770 = string
type Wire2771 = '/ftp/store'
type Wire2772 = Wire2773 | Wire2774
type Wire2773 = string
type Wire2774 = Wire2775 | Wire2776
type Wire2775 = boolean
type Wire2776 = 'false' | 'true'
type Wire2777 = Wire2778 | Wire2779
type Wire2778 = string
type Wire2779 = string
type Wire2780 = Wire2781 | Wire2782
type Wire2781 = string
type Wire2782 = string
type Wire2783 = Wire2784 | Wire2785
type Wire2784 = string
type Wire2785 = string
type Wire2786 = {
  credentials?: Wire2787
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  next_page_token?: Wire1852
  output_meta?: Wire1414
  path: Wire2790
  queue?: Wire1425
  recursive?: Wire1931
  result?: Wire1432
  robot: Wire2795
  user_meta?: Wire1438
}
type Wire2787 = Wire2788 | Wire2789
type Wire2788 = string
type Wire2789 = string
type Wire2790 = Wire2791 | Wire2792 | Wire1387
type Wire2791 = string
type Wire2792 = Wire2793 | Wire2794
type Wire2793 = string
type Wire2794 = string
type Wire2795 = '/google/import'
type Wire2796 = {
  acl?: Wire2797
  cache_control?: Wire2802
  credentials: Wire2805
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire2808
  queue?: Wire1425
  result?: Wire1649
  robot: Wire2811
  ssl_url_template?: Wire2812
  url_template?: Wire2815
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2797 = Wire2798 | Wire2801
type Wire2798 = Wire2799 | Wire2800
type Wire2799 = string
type Wire2800 =
  'authenticated-read' | 'bucket-owner-full-control' | 'private' | 'project-private' | 'public-read'
type Wire2801 = null
type Wire2802 = Wire2803 | Wire2804
type Wire2803 = string
type Wire2804 = string
type Wire2805 = Wire2806 | Wire2807
type Wire2806 = string
type Wire2807 = string
type Wire2808 = Wire2809 | Wire2810
type Wire2809 = string
type Wire2810 = string
type Wire2811 = '/google/store'
type Wire2812 = Wire2813 | Wire2814
type Wire2813 = string
type Wire2814 = string
type Wire2815 = Wire2816 | Wire2817
type Wire2816 = string
type Wire2817 = string
type Wire2818 = {
  delay?: Wire2819
  force_accept?: Wire1376
  format?: Wire2823
  fullpage?: Wire2826
  headers?: Wire2831
  height?: Wire2835
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  omit_background?: Wire2839
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2844
  url?: Wire2845
  use?: Wire1620
  user_meta?: Wire1438
  wait_until?: Wire2850
  width?: Wire2853
}
type Wire2819 = Wire2820 | Wire2821 | Wire2822
type Wire2820 = string
type Wire2821 = string
type Wire2822 = number
type Wire2823 = Wire2824 | Wire2825
type Wire2824 = string
type Wire2825 = 'jpeg' | 'jpg' | 'pdf' | 'png'
type Wire2826 = Wire2827 | Wire2828
type Wire2827 = string
type Wire2828 = Wire2829 | Wire2830
type Wire2829 = boolean
type Wire2830 = 'false' | 'true'
type Wire2831 = { [key: string]: Wire2832 | undefined }
type Wire2832 = Wire2833 | Wire2834
type Wire2833 = string
type Wire2834 = string
type Wire2835 = Wire2836 | Wire2837 | Wire2838
type Wire2836 = string
type Wire2837 = string
type Wire2838 = number
type Wire2839 = Wire2840 | Wire2841
type Wire2840 = string
type Wire2841 = Wire2842 | Wire2843
type Wire2842 = boolean
type Wire2843 = 'false' | 'true'
type Wire2844 = '/html/convert'
type Wire2845 = Wire2846 | Wire2849
type Wire2846 = Wire2847 | Wire2848
type Wire2847 = string
type Wire2848 = string
type Wire2849 = null
type Wire2850 = Wire2851 | Wire2852
type Wire2851 = string
type Wire2852 = 'commit' | 'domcontentloaded' | 'load' | 'networkidle'
type Wire2853 = Wire2854 | Wire2855 | Wire2856
type Wire2854 = string
type Wire2855 = string
type Wire2856 = number
type Wire2857 = {
  fail_fast?: Wire2858
  force_accept?: Wire1376
  force_name?: Wire1381
  headers?: Wire2863
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  max_file_size?: Wire2875
  output_meta?: Wire1414
  queue?: Wire1425
  range?: Wire2879
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire2884
  url: Wire2885
  url_delimiter?: Wire2896
  user_meta?: Wire1438
}
type Wire2858 = Wire2859 | Wire2860
type Wire2859 = string
type Wire2860 = Wire2861 | Wire2862
type Wire2861 = boolean
type Wire2862 = 'false' | 'true'
type Wire2863 = Wire2864 | Wire1387 | Wire2865 | Wire2872
type Wire2864 = string
type Wire2865 = Wire2866 | Wire2867
type Wire2866 = string
type Wire2867 = Array<Wire2868>
type Wire2868 = { [key: string]: Wire2869 | undefined }
type Wire2869 = Wire2870 | Wire2871
type Wire2870 = string
type Wire2871 = string
type Wire2872 = Wire2873 | Wire2874
type Wire2873 = string
type Wire2874 = string
type Wire2875 = Wire2876 | Wire2877 | Wire2878
type Wire2876 = string
type Wire2877 = string
type Wire2878 = number
type Wire2879 = Wire2880 | Wire2881 | Wire1387
type Wire2880 = string
type Wire2881 = Wire2882 | Wire2883
type Wire2882 = string
type Wire2883 = string
type Wire2884 = '/http/import'
type Wire2885 = Wire2886 | Wire2887 | Wire2890
type Wire2886 = string
type Wire2887 = Wire2888 | Wire2889
type Wire2888 = string
type Wire2889 = string
type Wire2890 = Wire2891 | Wire2892
type Wire2891 = string
type Wire2892 = Array<Wire2893>
type Wire2893 = Wire2894 | Wire2895
type Wire2894 = string
type Wire2895 = string
type Wire2896 = Wire2897 | Wire2898
type Wire2897 = string
type Wire2898 = string
type Wire2899 = {
  force_accept?: Wire1376
  headers?: Wire2900
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  max_response_size?: Wire2915
  max_result_file_size?: Wire2919
  max_result_files?: Wire2923
  method?: Wire2927
  output_meta?: Wire1414
  payload?: Wire2930
  queue?: Wire1425
  result?: Wire1432
  result_download_timeout?: Wire2933
  robot: Wire2937
  timeout?: Wire2938
  url: Wire2942
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2900 = Wire2901 | Wire1387 | Wire2902 | Wire2905 | Wire2912
type Wire2901 = string
type Wire2902 = Wire2903 | Wire2904
type Wire2903 = string
type Wire2904 = Array<Wire2905>
type Wire2905 = { [key: string]: Wire2906 | undefined }
type Wire2906 = Wire2907 | Wire1417 | Wire1462 | Wire2908 | Wire2911
type Wire2907 = string
type Wire2908 = Wire2909 | Wire2910
type Wire2909 = string
type Wire2910 = string
type Wire2911 = null
type Wire2912 = Wire2913 | Wire2914
type Wire2913 = string
type Wire2914 = string
type Wire2915 = Wire2916 | Wire2917 | Wire2918
type Wire2916 = string
type Wire2917 = string
type Wire2918 = number
type Wire2919 = Wire2920 | Wire2921 | Wire2922
type Wire2920 = string
type Wire2921 = string
type Wire2922 = number
type Wire2923 = Wire2924 | Wire2925 | Wire2926
type Wire2924 = string
type Wire2925 = string
type Wire2926 = number
type Wire2927 = Wire2928 | Wire2929
type Wire2928 = string
type Wire2929 = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
type Wire2930 = Wire2931 | Wire2932
type Wire2931 = string
type Wire2932 = 'file' | 'files' | 'metadata' | 'none'
type Wire2933 = Wire2934 | Wire2935 | Wire2936
type Wire2934 = string
type Wire2935 = string
type Wire2936 = number
type Wire2937 = '/http/request'
type Wire2938 = Wire2939 | Wire2940 | Wire2941
type Wire2939 = string
type Wire2940 = string
type Wire2941 = number
type Wire2942 = Wire2943 | Wire2944
type Wire2943 = string
type Wire2944 = string
type Wire2945 = {
  force_accept?: Wire1376
  format?: Wire2946
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  model?: Wire2949
  output_meta?: Wire1414
  provider?: Wire2952
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2955
  select?: Wire2956
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2946 = Wire2947 | Wire2948
type Wire2947 = string
type Wire2948 = 'gif' | 'png' | 'webp'
type Wire2949 = Wire2950 | Wire2951
type Wire2950 = string
type Wire2951 = string
type Wire2952 = Wire2953 | Wire2954
type Wire2953 = string
type Wire2954 = 'auto' | 'fal' | 'replicate' | 'transloadit'
type Wire2955 = '/image/bgremove'
type Wire2956 = Wire2957 | Wire2958
type Wire2957 = string
type Wire2958 = 'background' | 'foreground'
type Wire2959 = {
  categories?: Wire2960
  confidence_threshold?: Wire2966
  error_msg?: Wire2970
  error_on_decline?: Wire2973
  force_accept?: Wire1376
  format?: Wire2978
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2981
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2960 = Wire2961 | Wire2962
type Wire2961 = string
type Wire2962 = Array<Wire2963>
type Wire2963 = Wire2964 | Wire2965
type Wire2964 = string
type Wire2965 = 'all' | 'artwork' | 'brand_logo' | 'stock_photo' | 'watermarked'
type Wire2966 = Wire2967 | Wire2968 | Wire2969
type Wire2967 = string
type Wire2968 = string
type Wire2969 = number
type Wire2970 = Wire2971 | Wire2972
type Wire2971 = string
type Wire2972 = string
type Wire2973 = Wire2974 | Wire2975
type Wire2974 = string
type Wire2975 = Wire2976 | Wire2977
type Wire2976 = boolean
type Wire2977 = 'false' | 'true'
type Wire2978 = Wire2979 | Wire2980
type Wire2979 = string
type Wire2980 = 'json' | 'meta'
type Wire2981 = '/image/copyrightdetect'
type Wire2982 = {
  explicit_descriptions?: Wire2983
  force_accept?: Wire1376
  format?: Wire2988
  granularity?: Wire2991
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  provider?: Wire2994
  queue?: Wire1425
  result?: Wire1432
  robot: Wire2997
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2983 = Wire2984 | Wire2985
type Wire2984 = string
type Wire2985 = Wire2986 | Wire2987
type Wire2986 = boolean
type Wire2987 = 'false' | 'true'
type Wire2988 = Wire2989 | Wire2990
type Wire2989 = string
type Wire2990 = 'json' | 'meta' | 'text'
type Wire2991 = Wire2992 | Wire2993
type Wire2992 = string
type Wire2993 = 'full' | 'list'
type Wire2994 = Wire2995 | Wire2996
type Wire2995 = string
type Wire2996 = 'auto' | 'aws' | 'gcp'
type Wire2997 = '/image/describe'
type Wire2998 = {
  ai_preset?: Wire2999
  denoise?: Wire3002
  engine?: Wire3006
  enhance?: Wire3009
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  imagemagick_stack?: Wire2361
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire3012
  quality?: Wire3015
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3019
  sharpen?: Wire3020
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire2999 = Wire3000 | Wire3001
type Wire3000 = string
type Wire3001 = 'face_restore' | 'restore'
type Wire3002 = Wire3003 | Wire3004 | Wire3005
type Wire3003 = string
type Wire3004 = string
type Wire3005 = number
type Wire3006 = Wire3007 | Wire3008
type Wire3007 = string
type Wire3008 = 'ai' | 'classic'
type Wire3009 = Wire3010 | Wire3011
type Wire3010 = string
type Wire3011 = 'auto' | 'auto_aggressive' | 'auto_gentle' | 'none'
type Wire3012 = Wire3013 | Wire3014
type Wire3013 = string
type Wire3014 =
  | 'bw_classic'
  | 'bw_dramatic'
  | 'cinematic'
  | 'cool'
  | 'fade'
  | 'golden_hour'
  | 'matte'
  | 'noir'
  | 'none'
  | 'pastel'
  | 'teal_orange'
  | 'vintage'
  | 'vivid'
  | 'warm'
type Wire3015 = Wire3016 | Wire3017 | Wire3018
type Wire3016 = string
type Wire3017 = string
type Wire3018 = number
type Wire3019 = '/image/enhance'
type Wire3020 = Wire3021 | Wire3022 | Wire3023
type Wire3021 = string
type Wire3022 = string
type Wire3023 = number
type Wire3024 = {
  crop?: Wire3025
  crop_padding?: Wire3030
  faces?: Wire3033
  force_accept?: Wire1376
  format?: Wire3042
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  min_confidence?: Wire3045
  output_meta?: Wire1414
  provider?: Wire2994
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3049
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3025 = Wire3026 | Wire3027
type Wire3026 = string
type Wire3027 = Wire3028 | Wire3029
type Wire3028 = boolean
type Wire3029 = 'false' | 'true'
type Wire3030 = Wire3031 | Wire3032
type Wire3031 = string
type Wire3032 = string
type Wire3033 = Wire3034 | Wire3035 | Wire3038
type Wire3034 = string
type Wire3035 = Wire3036 | Wire3037
type Wire3036 = string
type Wire3037 = 'each' | 'group' | 'max-confidence' | 'max-size'
type Wire3038 = Wire3039 | Wire3040 | Wire3041
type Wire3039 = string
type Wire3040 = string
type Wire3041 = number
type Wire3042 = Wire3043 | Wire3044
type Wire3043 = string
type Wire3044 = 'jpg' | 'png' | 'preserve' | 'tiff'
type Wire3045 = Wire3046 | Wire3047 | Wire3048
type Wire3046 = string
type Wire3047 = string
type Wire3048 = number
type Wire3049 = '/image/facedetect'
type Wire3050 = {
  aspect_ratio?: Wire3051
  force_accept?: Wire1376
  format?: Wire3054
  height?: Wire3057
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  model?: Wire3061
  num_outputs?: Wire3064
  output_meta?: Wire1414
  prompt: Wire3068
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3071
  seed?: Wire3072
  style?: Wire3076
  use?: Wire3079
  user_meta?: Wire1438
  width?: Wire3080
}
type Wire3051 = Wire3052 | Wire3053
type Wire3052 = string
type Wire3053 = string
type Wire3054 = Wire3055 | Wire3056
type Wire3055 = string
type Wire3056 = 'gif' | 'jpeg' | 'jpg' | 'png' | 'svg' | 'webp'
type Wire3057 = Wire3058 | Wire3059 | Wire3060
type Wire3058 = string
type Wire3059 = string
type Wire3060 = number
type Wire3061 = Wire3062 | Wire3063
type Wire3062 = string
type Wire3063 = string
type Wire3064 = Wire3065 | Wire3066 | Wire3067
type Wire3065 = string
type Wire3066 = string
type Wire3067 = number
type Wire3068 = Wire3069 | Wire3070
type Wire3069 = string
type Wire3070 = string
type Wire3071 = '/image/generate'
type Wire3072 = Wire3073 | Wire3074 | Wire3075
type Wire3073 = string
type Wire3074 = string
type Wire3075 = number
type Wire3076 = Wire3077 | Wire3078
type Wire3077 = string
type Wire3078 = string
type Wire3079 = Wire1621 | Wire1630
type Wire3080 = Wire3081 | Wire3082 | Wire3083
type Wire3081 = string
type Wire3082 = string
type Wire3083 = number
type Wire3084 = {
  face_enhance?: Wire3085
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  model?: Wire3090
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3093
  scale?: Wire3094
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3085 = Wire3086 | Wire3087
type Wire3086 = string
type Wire3087 = Wire3088 | Wire3089
type Wire3088 = boolean
type Wire3089 = 'false' | 'true'
type Wire3090 = Wire3091 | Wire3092
type Wire3091 = string
type Wire3092 = 'nightmareai/real-esrgan' | 'sczhou/codeformer' | 'tencentarc/gfpgan'
type Wire3093 = '/image/upscale'
type Wire3094 = Wire3095 | Wire3096 | Wire3099
type Wire3095 = string
type Wire3096 = Wire3097 | Wire3098
type Wire3097 = string
type Wire3098 = 2
type Wire3099 = Wire3100 | Wire3101
type Wire3100 = string
type Wire3101 = 4
type Wire3102 = {
  adaptive_filtering?: Wire3103
  background?: Wire3108
  border?: Wire3116
  cell_height?: Wire3120
  cell_width?: Wire3124
  columns?: Wire3128
  coverage?: Wire3132
  direction?: Wire3136
  effect?: Wire3139
  force_accept?: Wire1376
  format?: Wire3142
  height?: Wire3145
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  quality?: Wire3149
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3153
  rows?: Wire3154
  seed?: Wire3158
  shuffle?: Wire3162
  sort_by?: Wire1659
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire3167
}
type Wire3103 = Wire3104 | Wire3105
type Wire3104 = string
type Wire3105 = Wire3106 | Wire3107
type Wire3106 = boolean
type Wire3107 = 'false' | 'true'
type Wire3108 = Wire3109 | Wire3110 | Wire3113
type Wire3109 = string
type Wire3110 = Wire3111 | Wire3112
type Wire3111 = string
type Wire3112 = string
type Wire3113 = Wire3114 | Wire3115
type Wire3114 = string
type Wire3115 =
  | 'black'
  | 'blue'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'grey'
  | 'magenta'
  | 'none'
  | 'opaque'
  | 'red'
  | 'transparent'
  | 'white'
  | 'yellow'
type Wire3116 = Wire3117 | Wire3118 | Wire3119
type Wire3117 = string
type Wire3118 = string
type Wire3119 = number
type Wire3120 = Wire3121 | Wire3122 | Wire3123
type Wire3121 = string
type Wire3122 = string
type Wire3123 = number
type Wire3124 = Wire3125 | Wire3126 | Wire3127
type Wire3125 = string
type Wire3126 = string
type Wire3127 = number
type Wire3128 = Wire3129 | Wire3130 | Wire3131
type Wire3129 = string
type Wire3130 = string
type Wire3131 = number
type Wire3132 = Wire3133 | Wire3134 | Wire3135
type Wire3133 = string
type Wire3134 = string
type Wire3135 = number
type Wire3136 = Wire3137 | Wire3138
type Wire3137 = string
type Wire3138 = 'grid' | 'horizontal' | 'vertical'
type Wire3139 = Wire3140 | Wire3141
type Wire3140 = string
type Wire3141 = 'mosaic' | 'polaroid-stack'
type Wire3142 = Wire3143 | Wire3144
type Wire3143 = string
type Wire3144 = 'jpg' | 'png' | 'webp'
type Wire3145 = Wire3146 | Wire3147 | Wire3148
type Wire3146 = string
type Wire3147 = string
type Wire3148 = number
type Wire3149 = Wire3150 | Wire3151 | Wire3152
type Wire3150 = string
type Wire3151 = string
type Wire3152 = number
type Wire3153 = '/image/merge'
type Wire3154 = Wire3155 | Wire3156 | Wire3157
type Wire3155 = string
type Wire3156 = string
type Wire3157 = number
type Wire3158 = Wire3159 | Wire3160 | Wire3161
type Wire3159 = string
type Wire3160 = string
type Wire3161 = number
type Wire3162 = Wire3163 | Wire3164
type Wire3163 = string
type Wire3164 = Wire3165 | Wire3166
type Wire3165 = boolean
type Wire3166 = 'false' | 'true'
type Wire3167 = Wire3168 | Wire3169 | Wire3170
type Wire3168 = string
type Wire3169 = string
type Wire3170 = number
type Wire3171 = {
  force_accept?: Wire1376
  format?: Wire2281
  granularity?: Wire2284
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  provider?: Wire2287
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3172
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3172 = '/image/ocr'
type Wire3173 = {
  fix_breaking_images?: Wire3174
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  lossy?: Wire3179
  output_meta?: Wire1414
  preserve_meta_data?: Wire3184
  priority?: Wire3189
  progressive?: Wire3192
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3197
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3174 = Wire3175 | Wire3176
type Wire3175 = string
type Wire3176 = Wire3177 | Wire3178
type Wire3177 = boolean
type Wire3178 = 'false' | 'true'
type Wire3179 = Wire3180 | Wire3181
type Wire3180 = string
type Wire3181 = Wire3182 | Wire3183
type Wire3182 = boolean
type Wire3183 = 'false' | 'true'
type Wire3184 = Wire3185 | Wire3186
type Wire3185 = string
type Wire3186 = Wire3187 | Wire3188
type Wire3187 = boolean
type Wire3188 = 'false' | 'true'
type Wire3189 = Wire3190 | Wire3191
type Wire3190 = string
type Wire3191 = 'compression-ratio' | 'conversion-speed'
type Wire3192 = Wire3193 | Wire3194
type Wire3193 = string
type Wire3194 = Wire3195 | Wire3196
type Wire3195 = boolean
type Wire3196 = 'false' | 'true'
type Wire3197 = '/image/optimize'
type Wire3198 = {
  adaptive_filtering?: Wire3103
  alpha?: Wire3199
  background?: Wire3202
  blur?: Wire3207
  blur_regions?: Wire3212
  brightness?: Wire3222
  clip?: Wire3226
  clut?: Wire3231
  colorspace?: Wire3236
  compress?: Wire3239
  contrast?: Wire3244
  correct_gamma?: Wire3248
  crop?: Wire3253
  density?: Wire3269
  flatten?: Wire3274
  force_accept?: Wire1376
  format?: Wire3279
  frame?: Wire3284
  gravity?: Wire3290
  height?: Wire3298
  hue?: Wire3300
  ignore_errors?: Wire1607
  imagemagick_stack?: Wire2361
  interpolate?: Wire1406
  monochrome?: Wire3304
  negate?: Wire3309
  output_meta?: Wire1414
  preclip_alpha?: Wire3314
  progressive?: Wire3317
  quality?: Wire3322
  queue?: Wire1425
  resize_strategy?: Wire3326
  result?: Wire1432
  robot: Wire3346
  rotation?: Wire3347
  saturation?: Wire3352
  sepia?: Wire3356
  shave?: Wire3362
  strip?: Wire3370
  text?: Wire3375
  transparent?: Wire3430
  trim_whitespace?: Wire3440
  type?: Wire3445
  use?: Wire1620
  user_meta?: Wire1438
  watermark_opacity?: Wire3448
  watermark_position?: Wire3452
  watermark_repeat_x?: Wire3457
  watermark_repeat_y?: Wire3462
  watermark_resize_strategy?: Wire3467
  watermark_size?: Wire3470
  watermark_url?: Wire3473
  watermark_x_offset?: Wire3476
  watermark_y_offset?: Wire3480
  width?: Wire3484
  zoom?: Wire3486
}
type Wire3199 = Wire3200 | Wire3201
type Wire3200 = string
type Wire3201 =
  | 'Activate'
  | 'Background'
  | 'Copy'
  | 'Deactivate'
  | 'Extract'
  | 'Off'
  | 'On'
  | 'Opaque'
  | 'Remove'
  | 'Set'
  | 'Shape'
  | 'Transparent'
type Wire3202 = Wire3203 | Wire3204 | Wire3113
type Wire3203 = string
type Wire3204 = Wire3205 | Wire3206
type Wire3205 = string
type Wire3206 = string
type Wire3207 = Wire3208 | Wire3211
type Wire3208 = Wire3209 | Wire3210
type Wire3209 = string
type Wire3210 = string
type Wire3211 = null
type Wire3212 = Wire3213 | Wire3221
type Wire3213 = Wire3214 | Wire3215
type Wire3214 = string
type Wire3215 = Array<Wire3216>
type Wire3216 = Wire3217 | Wire3218
type Wire3217 = string
type Wire3218 = {
  height: Wire3219
  width: Wire3219
  x: Wire3219
  y: Wire3219
  [key: string]: JsonValue | Wire3219 | Wire3219 | Wire3219 | Wire3219 | undefined
}
type Wire3219 = Wire3220 | Wire2610
type Wire3220 = string
type Wire3221 = null
type Wire3222 = Wire3223 | Wire3224 | Wire3225
type Wire3223 = string
type Wire3224 = string
type Wire3225 = number
type Wire3226 = Wire3227 | Wire3228 | Wire1417
type Wire3227 = string
type Wire3228 = Wire3229 | Wire3230
type Wire3229 = string
type Wire3230 = string
type Wire3231 = Wire3232 | Wire3233
type Wire3232 = string
type Wire3233 = Wire3234 | Wire3235
type Wire3234 = boolean
type Wire3235 = 'false' | 'true'
type Wire3236 = Wire3237 | Wire3238
type Wire3237 = string
type Wire3238 =
  | 'CMY'
  | 'CMYK'
  | 'Gray'
  | 'HCL'
  | 'HCLp'
  | 'HSB'
  | 'HSI'
  | 'HSL'
  | 'HSV'
  | 'HWB'
  | 'Jzazbz'
  | 'LCHab'
  | 'LCHuv'
  | 'LMS'
  | 'Lab'
  | 'Log'
  | 'Luv'
  | 'OHTA'
  | 'OkLCH'
  | 'OkLab'
  | 'RGB'
  | 'Rec601YCbCr'
  | 'Rec709YCbCr'
  | 'Transparent'
  | 'Undefined'
  | 'XYZ'
  | 'YCC'
  | 'YCbCr'
  | 'YDbDr'
  | 'YIQ'
  | 'YPbPr'
  | 'YUV'
  | 'sRGB'
  | 'scRGB'
  | 'xyY'
type Wire3239 = Wire3240 | Wire3243
type Wire3240 = Wire3241 | Wire3242
type Wire3241 = string
type Wire3242 =
  'BZip' | 'Fax' | 'Group4' | 'JPEG' | 'JPEG2000' | 'LZW' | 'Lossless' | 'None' | 'RLE' | 'Zip'
type Wire3243 = null
type Wire3244 = Wire3245 | Wire3246 | Wire3247
type Wire3245 = string
type Wire3246 = string
type Wire3247 = number
type Wire3248 = Wire3249 | Wire3250
type Wire3249 = string
type Wire3250 = Wire3251 | Wire3252
type Wire3251 = boolean
type Wire3252 = 'false' | 'true'
type Wire3253 = Wire3254 | Wire3255 | Wire3266
type Wire3254 = string
type Wire3255 = Wire3256 | Wire3257
type Wire3256 = string
type Wire3257 = { x1?: Wire3258; x2?: Wire3260; y1?: Wire3262; y2?: Wire3264 }
type Wire3258 = Wire1477 | Wire3259
type Wire3259 = null
type Wire3260 = Wire1477 | Wire3261
type Wire3261 = null
type Wire3262 = Wire1477 | Wire3263
type Wire3263 = null
type Wire3264 = Wire1477 | Wire3265
type Wire3265 = null
type Wire3266 = Wire3267 | Wire3268
type Wire3267 = string
type Wire3268 = string
type Wire3269 = Wire3270 | Wire3273
type Wire3270 = Wire3271 | Wire3272
type Wire3271 = string
type Wire3272 = string
type Wire3273 = null
type Wire3274 = Wire3275 | Wire3276
type Wire3275 = string
type Wire3276 = Wire3277 | Wire3278
type Wire3277 = boolean
type Wire3278 = 'false' | 'true'
type Wire3279 = Wire3280 | Wire3283
type Wire3280 = Wire3281 | Wire3282
type Wire3281 = string
type Wire3282 = string
type Wire3283 = null
type Wire3284 = Wire3285 | Wire3289
type Wire3285 = Wire3286 | Wire3287 | Wire3288
type Wire3286 = string
type Wire3287 = string
type Wire3288 = number
type Wire3289 = null
type Wire3290 = Wire3291 | Wire3292 | Wire3295
type Wire3291 = string
type Wire3292 = Wire3293 | Wire3294
type Wire3293 = string
type Wire3294 =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
type Wire3295 = Wire3296 | Wire3297
type Wire3296 = string
type Wire3297 = 'attention' | 'entropy'
type Wire3298 = Wire3299 | Wire2610
type Wire3299 = string
type Wire3300 = Wire3301 | Wire3302 | Wire3303
type Wire3301 = string
type Wire3302 = string
type Wire3303 = number
type Wire3304 = Wire3305 | Wire3306
type Wire3305 = string
type Wire3306 = Wire3307 | Wire3308
type Wire3307 = boolean
type Wire3308 = 'false' | 'true'
type Wire3309 = Wire3310 | Wire3311
type Wire3310 = string
type Wire3311 = Wire3312 | Wire3313
type Wire3312 = boolean
type Wire3313 = 'false' | 'true'
type Wire3314 = Wire3315 | Wire3316
type Wire3315 = string
type Wire3316 =
  | 'Activate'
  | 'Background'
  | 'Copy'
  | 'Deactivate'
  | 'Extract'
  | 'Off'
  | 'On'
  | 'Opaque'
  | 'Remove'
  | 'Set'
  | 'Shape'
  | 'Transparent'
type Wire3317 = Wire3318 | Wire3319
type Wire3318 = string
type Wire3319 = Wire3320 | Wire3321
type Wire3320 = boolean
type Wire3321 = 'false' | 'true'
type Wire3322 = Wire3323 | Wire3324 | Wire3325
type Wire3323 = string
type Wire3324 = string
type Wire3325 = number
type Wire3326 = Wire3327 | Wire3328 | Wire3331 | Wire3334 | Wire3337 | Wire3340 | Wire3343
type Wire3327 = string
type Wire3328 = Wire3329 | Wire3330
type Wire3329 = string
type Wire3330 = 'crop'
type Wire3331 = Wire3332 | Wire3333
type Wire3332 = string
type Wire3333 = 'fillcrop'
type Wire3334 = Wire3335 | Wire3336
type Wire3335 = string
type Wire3336 = 'fit'
type Wire3337 = Wire3338 | Wire3339
type Wire3338 = string
type Wire3339 = 'min_fit'
type Wire3340 = Wire3341 | Wire3342
type Wire3341 = string
type Wire3342 = 'pad'
type Wire3343 = Wire3344 | Wire3345
type Wire3344 = string
type Wire3345 = 'stretch'
type Wire3346 = '/image/resize'
type Wire3347 = Wire3348 | Wire1462 | Wire1417 | Wire3349
type Wire3348 = string
type Wire3349 = Wire3350 | Wire3351
type Wire3350 = string
type Wire3351 = 'auto'
type Wire3352 = Wire3353 | Wire3354 | Wire3355
type Wire3353 = string
type Wire3354 = string
type Wire3355 = number
type Wire3356 = Wire3357 | Wire3361
type Wire3357 = Wire3358 | Wire3359 | Wire3360
type Wire3358 = string
type Wire3359 = string
type Wire3360 = number
type Wire3361 = null
type Wire3362 = Wire3363 | Wire3364 | Wire3367
type Wire3363 = string
type Wire3364 = Wire3365 | Wire3366
type Wire3365 = string
type Wire3366 = string
type Wire3367 = Wire3368 | Wire3369
type Wire3368 = string
type Wire3369 = number
type Wire3370 = Wire3371 | Wire3372
type Wire3371 = string
type Wire3372 = Wire3373 | Wire3374
type Wire3373 = boolean
type Wire3374 = 'false' | 'true'
type Wire3375 = Wire3376 | Wire3377 | Wire3427
type Wire3376 = string
type Wire3377 = Wire3378 | Wire3379
type Wire3378 = string
type Wire3379 = {
  align?: Wire3380
  background_color?: Wire3383
  color?: Wire3388
  font?: Wire3393
  rotate?: Wire3396
  size?: Wire3400
  stroke_color?: Wire3404
  stroke_width?: Wire3409
  text: Wire3413
  valign?: Wire3416
  x_offset?: Wire3419
  y_offset?: Wire3423
  [key: string]:
    | JsonValue
    | Wire3380
    | Wire3383
    | Wire3388
    | Wire3393
    | Wire3396
    | Wire3400
    | Wire3404
    | Wire3409
    | Wire3413
    | Wire3416
    | Wire3419
    | Wire3423
    | undefined
}
type Wire3380 = Wire3381 | Wire3382
type Wire3381 = string
type Wire3382 = 'center' | 'left' | 'right'
type Wire3383 = Wire3384 | Wire3385 | Wire3113
type Wire3384 = string
type Wire3385 = Wire3386 | Wire3387
type Wire3386 = string
type Wire3387 = string
type Wire3388 = Wire3389 | Wire3390 | Wire3113
type Wire3389 = string
type Wire3390 = Wire3391 | Wire3392
type Wire3391 = string
type Wire3392 = string
type Wire3393 = Wire3394 | Wire3395
type Wire3394 = string
type Wire3395 = string
type Wire3396 = Wire3397 | Wire3398 | Wire3399
type Wire3397 = string
type Wire3398 = string
type Wire3399 = number
type Wire3400 = Wire3401 | Wire3402 | Wire3403
type Wire3401 = string
type Wire3402 = string
type Wire3403 = number
type Wire3404 = Wire3405 | Wire3406 | Wire3113
type Wire3405 = string
type Wire3406 = Wire3407 | Wire3408
type Wire3407 = string
type Wire3408 = string
type Wire3409 = Wire3410 | Wire3411 | Wire3412
type Wire3410 = string
type Wire3411 = string
type Wire3412 = number
type Wire3413 = Wire3414 | Wire3415
type Wire3414 = string
type Wire3415 = string
type Wire3416 = Wire3417 | Wire3418
type Wire3417 = string
type Wire3418 = 'bottom' | 'center' | 'top'
type Wire3419 = Wire3420 | Wire3421 | Wire3422
type Wire3420 = string
type Wire3421 = string
type Wire3422 = number
type Wire3423 = Wire3424 | Wire3425 | Wire3426
type Wire3424 = string
type Wire3425 = string
type Wire3426 = number
type Wire3427 = Wire3428 | Wire3429
type Wire3428 = string
type Wire3429 = Array<Wire3377>
type Wire3430 = Wire3431 | Wire3432 | Wire3437
type Wire3431 = string
type Wire3432 = Wire3433 | Wire3434 | Wire3113
type Wire3433 = string
type Wire3434 = Wire3435 | Wire3436
type Wire3435 = string
type Wire3436 = string
type Wire3437 = Wire3438 | Wire3439
type Wire3438 = string
type Wire3439 = string
type Wire3440 = Wire3441 | Wire3442
type Wire3441 = string
type Wire3442 = Wire3443 | Wire3444
type Wire3443 = boolean
type Wire3444 = 'false' | 'true'
type Wire3445 = Wire3446 | Wire3447
type Wire3446 = string
type Wire3447 =
  | 'Bilevel'
  | 'ColorSeparation'
  | 'ColorSeparationAlpha'
  | 'Grayscale'
  | 'GrayscaleAlpha'
  | 'Palette'
  | 'PaletteAlpha'
  | 'TrueColor'
  | 'TrueColorAlpha'
type Wire3448 = Wire3449 | Wire3450 | Wire3451
type Wire3449 = string
type Wire3450 = string
type Wire3451 = number
type Wire3452 = Wire3453 | Wire3292 | Wire3454
type Wire3453 = string
type Wire3454 = Wire3455 | Wire3456
type Wire3455 = string
type Wire3456 = Array<Wire3292>
type Wire3457 = Wire3458 | Wire3459
type Wire3458 = string
type Wire3459 = Wire3460 | Wire3461
type Wire3460 = boolean
type Wire3461 = 'false' | 'true'
type Wire3462 = Wire3463 | Wire3464
type Wire3463 = string
type Wire3464 = Wire3465 | Wire3466
type Wire3465 = boolean
type Wire3466 = 'false' | 'true'
type Wire3467 = Wire3468 | Wire3469
type Wire3468 = string
type Wire3469 = 'area' | 'fit' | 'min_fit' | 'stretch'
type Wire3470 = Wire3471 | Wire3472
type Wire3471 = string
type Wire3472 = string
type Wire3473 = Wire3474 | Wire3475
type Wire3474 = string
type Wire3475 = string
type Wire3476 = Wire3477 | Wire3478 | Wire3479
type Wire3477 = string
type Wire3478 = string
type Wire3479 = number
type Wire3480 = Wire3481 | Wire3482 | Wire3483
type Wire3481 = string
type Wire3482 = string
type Wire3483 = number
type Wire3484 = Wire3485 | Wire2610
type Wire3485 = string
type Wire3486 = Wire3487 | Wire3488
type Wire3487 = string
type Wire3488 = Wire3489 | Wire3490
type Wire3489 = boolean
type Wire3490 = 'false' | 'true'
type Wire3491 = {
  data_to_write?: Wire3492
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3494
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3492 = { [key: string]: Wire3493 | undefined }
type Wire3493 = JsonValue
type Wire3494 = '/meta/write'
type Wire3495 = {
  bucket?: Wire3496
  credentials?: Wire3499
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire3502
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire3505
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire2142
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire3508
  secret?: Wire3509
  user_meta?: Wire1438
}
type Wire3496 = Wire3497 | Wire3498
type Wire3497 = string
type Wire3498 = string
type Wire3499 = Wire3500 | Wire3501
type Wire3500 = string
type Wire3501 = string
type Wire3502 = Wire3503 | Wire3504
type Wire3503 = string
type Wire3504 = string
type Wire3505 = Wire3506 | Wire3507
type Wire3506 = string
type Wire3507 = string
type Wire3508 = '/minio/import'
type Wire3509 = Wire3510 | Wire3511
type Wire3510 = string
type Wire3511 = string
type Wire3512 = {
  acl?: Wire2012
  bucket?: Wire3513
  credentials?: Wire3499
  force_accept?: Wire1376
  headers?: Wire3516
  host?: Wire3520
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire3523
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3526
  secret?: Wire3527
  sign_urls_for?: Wire3530
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3513 = Wire3514 | Wire3515
type Wire3514 = string
type Wire3515 = string
type Wire3516 = { [key: string]: Wire3517 | undefined }
type Wire3517 = Wire3518 | Wire3519
type Wire3518 = string
type Wire3519 = string
type Wire3520 = Wire3521 | Wire3522
type Wire3521 = string
type Wire3522 = string
type Wire3523 = Wire3524 | Wire3525
type Wire3524 = string
type Wire3525 = string
type Wire3526 = '/minio/store'
type Wire3527 = Wire3528 | Wire3529
type Wire3528 = string
type Wire3529 = string
type Wire3530 = Wire3531 | Wire3532 | Wire3533
type Wire3531 = string
type Wire3532 = string
type Wire3533 = number
type Wire3534 = {
  bucket?: Wire3535
  bucket_region?: Wire3538
  credentials?: Wire3541
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire3544
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire3547
  queue?: Wire1425
  range?: Wire3552
  recursive?: Wire2142
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire3557
  secret?: Wire3558
  user_meta?: Wire1438
}
type Wire3535 = Wire3536 | Wire3537
type Wire3536 = string
type Wire3537 = string
type Wire3538 = Wire3539 | Wire3540
type Wire3539 = string
type Wire3540 = string
type Wire3541 = Wire3542 | Wire3543
type Wire3542 = string
type Wire3543 = string
type Wire3544 = Wire3545 | Wire3546
type Wire3545 = string
type Wire3546 = string
type Wire3547 = Wire3548 | Wire3549 | Wire1387
type Wire3548 = string
type Wire3549 = Wire3550 | Wire3551
type Wire3550 = string
type Wire3551 = string
type Wire3552 = Wire3553 | Wire3554 | Wire1387
type Wire3553 = string
type Wire3554 = Wire3555 | Wire3556
type Wire3555 = string
type Wire3556 = string
type Wire3557 = '/s3/import'
type Wire3558 = Wire3559 | Wire3560
type Wire3559 = string
type Wire3560 = string
type Wire3561 = {
  acl?: Wire3562
  bucket?: Wire3565
  bucket_region?: Wire3568
  check_integrity?: Wire3571
  credentials?: Wire3541
  force_accept?: Wire1376
  headers?: Wire3576
  host?: Wire3580
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire3583
  no_vhost?: Wire3586
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3591
  secret?: Wire3592
  session_token?: Wire3595
  sign_urls_for?: Wire3598
  tags?: Wire3602
  url_prefix?: Wire3606
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3562 = Wire3563 | Wire3564
type Wire3563 = string
type Wire3564 = 'bucket-default' | 'private' | 'public' | 'public-read'
type Wire3565 = Wire3566 | Wire3567
type Wire3566 = string
type Wire3567 = string
type Wire3568 = Wire3569 | Wire3570
type Wire3569 = string
type Wire3570 = string
type Wire3571 = Wire3572 | Wire3573
type Wire3572 = string
type Wire3573 = Wire3574 | Wire3575
type Wire3574 = boolean
type Wire3575 = 'false' | 'true'
type Wire3576 = { [key: string]: Wire3577 | undefined }
type Wire3577 = Wire3578 | Wire3579
type Wire3578 = string
type Wire3579 = string
type Wire3580 = Wire3581 | Wire3582
type Wire3581 = string
type Wire3582 = string
type Wire3583 = Wire3584 | Wire3585
type Wire3584 = string
type Wire3585 = string
type Wire3586 = Wire3587 | Wire3588
type Wire3587 = string
type Wire3588 = Wire3589 | Wire3590
type Wire3589 = boolean
type Wire3590 = 'false' | 'true'
type Wire3591 = '/s3/store'
type Wire3592 = Wire3593 | Wire3594
type Wire3593 = string
type Wire3594 = string
type Wire3595 = Wire3596 | Wire3597
type Wire3596 = string
type Wire3597 = string
type Wire3598 = Wire3599 | Wire3600 | Wire3601
type Wire3599 = string
type Wire3600 = string
type Wire3601 = number
type Wire3602 = { [key: string]: Wire3603 | undefined }
type Wire3603 = Wire3604 | Wire3605
type Wire3604 = string
type Wire3605 = string
type Wire3606 = Wire3607 | Wire3608
type Wire3607 = string
type Wire3608 = string
type Wire3609 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3610
  script: Wire3611
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3610 = '/script/run'
type Wire3611 = Wire3612 | Wire3613
type Wire3612 = string
type Wire3613 = string
type Wire3614 = {
  credentials?: Wire3615
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire3618
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  path: Wire3621
  port?: Wire2753
  public_key?: Wire3624
  queue?: Wire1425
  recursive?: Wire3627
  result?: Wire1432
  robot: Wire3632
  user?: Wire3633
  user_meta?: Wire1438
}
type Wire3615 = Wire3616 | Wire3617
type Wire3616 = string
type Wire3617 = string
type Wire3618 = Wire3619 | Wire3620
type Wire3619 = string
type Wire3620 = string
type Wire3621 = Wire3622 | Wire3623
type Wire3622 = string
type Wire3623 = string
type Wire3624 = Wire3625 | Wire3626
type Wire3625 = string
type Wire3626 = string
type Wire3627 = Wire3628 | Wire3629
type Wire3628 = string
type Wire3629 = Wire3630 | Wire3631
type Wire3630 = boolean
type Wire3631 = 'false' | 'true'
type Wire3632 = '/sftp/import'
type Wire3633 = Wire3634 | Wire3635
type Wire3634 = string
type Wire3635 = string
type Wire3636 = {
  credentials?: Wire3615
  file_chmod?: Wire3637
  force_accept?: Wire1376
  host?: Wire3640
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire1898
  port?: Wire2753
  public_key?: Wire3643
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3646
  ssl_url_template?: Wire3647
  url_template?: Wire3650
  use?: Wire1620
  user?: Wire3653
  user_meta?: Wire1438
}
type Wire3637 = Wire3638 | Wire3639
type Wire3638 = string
type Wire3639 = string
type Wire3640 = Wire3641 | Wire3642
type Wire3641 = string
type Wire3642 = string
type Wire3643 = Wire3644 | Wire3645
type Wire3644 = string
type Wire3645 = string
type Wire3646 = '/sftp/store'
type Wire3647 = Wire3648 | Wire3649
type Wire3648 = string
type Wire3649 = string
type Wire3650 = Wire3651 | Wire3652
type Wire3651 = string
type Wire3652 = string
type Wire3653 = Wire3654 | Wire3655
type Wire3654 = string
type Wire3655 = string
type Wire3656 = {
  force_accept?: Wire1376
  format?: Wire3657
  granularity?: Wire3660
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  max_speakers?: Wire3663
  output_meta?: Wire1414
  provider?: Wire3667
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3670
  source_language?: Wire3671
  speaker_labels?: Wire3674
  target_language?: Wire3679
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3657 = Wire3658 | Wire3659
type Wire3658 = string
type Wire3659 = 'json' | 'meta' | 'srt' | 'text' | 'webvtt'
type Wire3660 = Wire3661 | Wire3662
type Wire3661 = string
type Wire3662 = 'full' | 'list'
type Wire3663 = Wire3664 | Wire3665 | Wire3666
type Wire3664 = string
type Wire3665 = string
type Wire3666 = number
type Wire3667 = Wire3668 | Wire3669
type Wire3668 = string
type Wire3669 = 'auto' | 'aws' | 'gcp' | 'replicate'
type Wire3670 = '/speech/transcribe'
type Wire3671 = Wire3672 | Wire3673
type Wire3672 = string
type Wire3673 = string
type Wire3674 = Wire3675 | Wire3676
type Wire3675 = string
type Wire3676 = Wire3677 | Wire3678
type Wire3677 = boolean
type Wire3678 = 'false' | 'true'
type Wire3679 = Wire3680 | Wire3681
type Wire3680 = string
type Wire3681 = string
type Wire3682 = {
  bucket?: Wire3683
  bucket_region?: Wire3686
  credentials?: Wire3689
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire3692
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire3695
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire1997
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire3698
  secret?: Wire3699
  user_meta?: Wire1438
}
type Wire3683 = Wire3684 | Wire3685
type Wire3684 = string
type Wire3685 = string
type Wire3686 = Wire3687 | Wire3688
type Wire3687 = string
type Wire3688 = string
type Wire3689 = Wire3690 | Wire3691
type Wire3690 = string
type Wire3691 = string
type Wire3692 = Wire3693 | Wire3694
type Wire3693 = string
type Wire3694 = string
type Wire3695 = Wire3696 | Wire3697
type Wire3696 = string
type Wire3697 = string
type Wire3698 = '/supabase/import'
type Wire3699 = Wire3700 | Wire3701
type Wire3700 = string
type Wire3701 = string
type Wire3702 = {
  bucket?: Wire3703
  bucket_region?: Wire3706
  credentials?: Wire3689
  force_accept?: Wire1376
  headers?: Wire3709
  host?: Wire3713
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire3716
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3719
  secret?: Wire3720
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3703 = Wire3704 | Wire3705
type Wire3704 = string
type Wire3705 = string
type Wire3706 = Wire3707 | Wire3708
type Wire3707 = string
type Wire3708 = string
type Wire3709 = { [key: string]: Wire3710 | undefined }
type Wire3710 = Wire3711 | Wire3712
type Wire3711 = string
type Wire3712 = string
type Wire3713 = Wire3714 | Wire3715
type Wire3714 = string
type Wire3715 = string
type Wire3716 = Wire3717 | Wire3718
type Wire3717 = string
type Wire3718 = string
type Wire3719 = '/supabase/store'
type Wire3720 = Wire3721 | Wire3722
type Wire3721 = string
type Wire3722 = string
type Wire3723 = {
  bucket?: Wire3724
  credentials?: Wire3727
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire3730
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire3733
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire3736
  queue?: Wire1425
  recursive?: Wire2142
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire3741
  secret?: Wire3742
  user_meta?: Wire1438
}
type Wire3724 = Wire3725 | Wire3726
type Wire3725 = string
type Wire3726 = string
type Wire3727 = Wire3728 | Wire3729
type Wire3728 = string
type Wire3729 = string
type Wire3730 = Wire3731 | Wire3732
type Wire3731 = string
type Wire3732 = string
type Wire3733 = Wire3734 | Wire3735
type Wire3734 = string
type Wire3735 = string
type Wire3736 = Wire3737 | Wire3738 | Wire1387
type Wire3737 = string
type Wire3738 = Wire3739 | Wire3740
type Wire3739 = string
type Wire3740 = string
type Wire3741 = '/swift/import'
type Wire3742 = Wire3743 | Wire3744
type Wire3743 = string
type Wire3744 = string
type Wire3745 = {
  acl?: Wire2012
  bucket?: Wire3746
  credentials?: Wire3727
  force_accept?: Wire1376
  headers?: Wire3749
  host?: Wire3753
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire3756
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3759
  secret?: Wire3760
  sign_urls_for?: Wire2038
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3746 = Wire3747 | Wire3748
type Wire3747 = string
type Wire3748 = string
type Wire3749 = { [key: string]: Wire3750 | undefined }
type Wire3750 = Wire3751 | Wire3752
type Wire3751 = string
type Wire3752 = string
type Wire3753 = Wire3754 | Wire3755
type Wire3754 = string
type Wire3755 = string
type Wire3756 = Wire3757 | Wire3758
type Wire3757 = string
type Wire3758 = string
type Wire3759 = '/swift/store'
type Wire3760 = Wire3761 | Wire3762
type Wire3761 = string
type Wire3762 = string
type Wire3763 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  prompt?: Wire3764
  provider?: Wire2994
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3769
  ssml?: Wire3770
  target_language?: Wire3775
  use?: Wire1620
  user_meta?: Wire1438
  voice?: Wire3778
}
type Wire3764 = Wire3765 | Wire3768
type Wire3765 = Wire3766 | Wire3767
type Wire3766 = string
type Wire3767 = string
type Wire3768 = null
type Wire3769 = '/text/speak'
type Wire3770 = Wire3771 | Wire3772
type Wire3771 = string
type Wire3772 = Wire3773 | Wire3774
type Wire3773 = boolean
type Wire3774 = 'false' | 'true'
type Wire3775 = Wire3776 | Wire3777
type Wire3776 = string
type Wire3777 = string
type Wire3778 = Wire3779 | Wire3780
type Wire3779 = string
type Wire3780 = 'female-1' | 'female-2' | 'female-3' | 'female-child-1' | 'male-1' | 'male-child-1'
type Wire3781 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  provider?: Wire2994
  queue?: Wire1425
  result?: Wire1432
  robot: Wire3782
  source_language?: Wire3783
  target_language?: Wire3786
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3782 = '/text/translate'
type Wire3783 = Wire3784 | Wire3785
type Wire3784 = string
type Wire3785 =
  | 'af'
  | 'am'
  | 'ar'
  | 'az'
  | 'be'
  | 'bg'
  | 'bn'
  | 'bs'
  | 'ca'
  | 'ceb'
  | 'co'
  | 'cs'
  | 'cy'
  | 'da'
  | 'de'
  | 'el'
  | 'en'
  | 'en-US'
  | 'eo'
  | 'es'
  | 'es-MX'
  | 'et'
  | 'eu'
  | 'fa'
  | 'fa-AF'
  | 'fi'
  | 'fr'
  | 'fr-CA'
  | 'fy'
  | 'ga'
  | 'gd'
  | 'gl'
  | 'gu'
  | 'ha'
  | 'haw'
  | 'he'
  | 'hi'
  | 'hmn'
  | 'hr'
  | 'ht'
  | 'hu'
  | 'hy'
  | 'id'
  | 'ig'
  | 'is'
  | 'it'
  | 'iw'
  | 'ja'
  | 'jv'
  | 'ka'
  | 'kk'
  | 'km'
  | 'kn'
  | 'ko'
  | 'ku'
  | 'ky'
  | 'la'
  | 'lb'
  | 'lo'
  | 'lt'
  | 'lv'
  | 'mg'
  | 'mi'
  | 'mk'
  | 'ml'
  | 'mn'
  | 'mr'
  | 'ms'
  | 'mt'
  | 'my'
  | 'ne'
  | 'nl'
  | 'no'
  | 'ny'
  | 'or'
  | 'pa'
  | 'pl'
  | 'ps'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'rw'
  | 'sd'
  | 'si'
  | 'sk'
  | 'sl'
  | 'sm'
  | 'sn'
  | 'so'
  | 'sq'
  | 'sr'
  | 'st'
  | 'su'
  | 'sv'
  | 'sw'
  | 'ta'
  | 'te'
  | 'tg'
  | 'th'
  | 'tk'
  | 'tl'
  | 'tr'
  | 'tt'
  | 'ug'
  | 'uk'
  | 'ur'
  | 'uz'
  | 'vi'
  | 'xh'
  | 'yi'
  | 'yo'
  | 'zh'
  | 'zh-CN'
  | 'zh-TW'
  | 'zu'
type Wire3786 = Wire3787 | Wire3785
type Wire3787 = string
type Wire3788 = {
  credentials?: Wire3789
  force_accept?: Wire1376
  format?: Wire3794
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  mcp_servers?: Wire3797
  messages: Wire3822
  model?: Wire4231
  output_meta?: Wire1414
  queue?: Wire1425
  reasoning_effort?: Wire4239
  result?: Wire1432
  return_messages?: Wire4242
  robot: Wire4245
  schema?: Wire4246
  system_message?: Wire4249
  test_credentials?: Wire4252
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire3789 = Wire3790 | Wire3791 | Wire1387
type Wire3790 = string
type Wire3791 = Wire3792 | Wire3793
type Wire3792 = string
type Wire3793 = string
type Wire3794 = Wire3795 | Wire3796
type Wire3795 = string
type Wire3796 = 'json' | 'meta' | 'text'
type Wire3797 = Wire3798 | Wire3799
type Wire3798 = string
type Wire3799 = Array<Wire3800>
type Wire3800 = Wire3801 | Wire3802
type Wire3801 = string
type Wire3802 = {
  allowed_tools?: Wire3803
  auth?: Wire3809
  headers?: Wire3812
  type: Wire3816
  url: Wire3819
  [key: string]: JsonValue | Wire3803 | Wire3809 | Wire3812 | Wire3816 | Wire3819 | undefined
}
type Wire3803 = Wire3804 | Wire3805
type Wire3804 = string
type Wire3805 = Array<Wire3806>
type Wire3806 = Wire3807 | Wire3808
type Wire3807 = string
type Wire3808 = string
type Wire3809 = Wire3810 | Wire3811
type Wire3810 = string
type Wire3811 = 'transloadit'
type Wire3812 = { [key: string]: Wire3813 | undefined }
type Wire3813 = Wire3814 | Wire3815
type Wire3814 = string
type Wire3815 = string
type Wire3816 = Wire3817 | Wire3818
type Wire3817 = string
type Wire3818 = 'http' | 'sse'
type Wire3819 = Wire3820 | Wire3821
type Wire3820 = string
type Wire3821 = string
type Wire3822 = Wire3823 | Wire3824 | Wire3827
type Wire3823 = string
type Wire3824 = Wire3825 | Wire3826
type Wire3825 = string
type Wire3826 = string
type Wire3827 = Wire3828 | Wire3829
type Wire3828 = string
type Wire3829 = Array<Wire3830>
type Wire3830 = Wire3831 | Wire3832
type Wire3831 = string
type Wire3832 = Wire3833 | Wire3855 | Wire3997 | Wire4213
type Wire3833 = Wire3834 | Wire3847 | Wire3851
type Wire3834 = {
  content: Wire3835
  experimental_providerMetadata?: Wire3836
  providerOptions: Wire3837
  role: Wire3846
  [key: string]: JsonValue | Wire3835 | Wire3836 | Wire3837 | Wire3846 | undefined
}
type Wire3835 = string
type Wire3836 = JsonValue
type Wire3837 = { [key: string]: Wire3838 | undefined }
type Wire3838 = { [key: string]: Wire3839 | undefined }
type Wire3839 = Wire3840 | Wire3841 | Wire3842 | Wire3843 | Wire3844 | Wire3845
type Wire3840 = string
type Wire3841 = number
type Wire3842 = boolean
type Wire3843 = null
type Wire3844 = Array<Wire3839>
type Wire3845 = { [key: string]: Wire3839 | undefined }
type Wire3846 = 'system'
type Wire3847 = {
  content: Wire3848
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire3849
  role: Wire3850
  [key: string]: JsonValue | Wire3848 | Wire3837 | Wire3849 | Wire3850 | undefined
}
type Wire3848 = string
type Wire3849 = never
type Wire3850 = 'system'
type Wire3851 = {
  content: Wire3852
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire3853
  role: Wire3854
  [key: string]: JsonValue | Wire3852 | Wire3837 | Wire3853 | Wire3854 | undefined
}
type Wire3852 = string
type Wire3853 = null
type Wire3854 = 'system'
type Wire3855 = Wire3856 | Wire3991 | Wire3994
type Wire3856 = {
  content: Wire3857
  experimental_providerMetadata?: Wire3989
  providerOptions: Wire3837
  role: Wire3990
  [key: string]: JsonValue | Wire3857 | Wire3989 | Wire3837 | Wire3990 | undefined
}
type Wire3857 = Wire3858 | Wire3859
type Wire3858 = string
type Wire3859 = Array<Wire3860>
type Wire3860 = Wire3861 | Wire3874 | Wire3931 | Wire3970
type Wire3861 = Wire3862 | Wire3866 | Wire3870
type Wire3862 = {
  experimental_providerMetadata?: Wire3863
  providerOptions: Wire3837
  text: Wire3864
  type: Wire3865
  [key: string]: JsonValue | Wire3863 | Wire3837 | Wire3864 | Wire3865 | undefined
}
type Wire3863 = JsonValue
type Wire3864 = string
type Wire3865 = 'text'
type Wire3866 = {
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire3867
  text: Wire3868
  type: Wire3869
  [key: string]: JsonValue | Wire3837 | Wire3867 | Wire3868 | Wire3869 | undefined
}
type Wire3867 = never
type Wire3868 = string
type Wire3869 = 'text'
type Wire3870 = {
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire3871
  text: Wire3872
  type: Wire3873
  [key: string]: JsonValue | Wire3837 | Wire3871 | Wire3872 | Wire3873 | undefined
}
type Wire3871 = null
type Wire3872 = string
type Wire3873 = 'text'
type Wire3874 = Wire3875 | Wire3903
type Wire3875 = Wire3876 | Wire3885 | Wire3894
type Wire3876 = {
  experimental_providerMetadata?: Wire3877
  image: Wire3878
  mediaType: Wire3882
  mimeType?: Wire3883
  providerOptions: Wire3837
  type: Wire3884
  [key: string]:
    JsonValue | Wire3877 | Wire3878 | Wire3882 | Wire3883 | Wire3837 | Wire3884 | undefined
}
type Wire3877 = JsonValue
type Wire3878 = Wire3879 | Wire3880
type Wire3879 = string
type Wire3880 = { [key: string]: Wire3881 | undefined }
type Wire3881 = string
type Wire3882 = string
type Wire3883 = JsonValue
type Wire3884 = 'image'
type Wire3885 = {
  experimental_providerMetadata?: Wire3837
  image: Wire3886
  mediaType: Wire3890
  mimeType?: Wire3891
  providerOptions?: Wire3892
  type: Wire3893
  [key: string]:
    JsonValue | Wire3837 | Wire3886 | Wire3890 | Wire3891 | Wire3892 | Wire3893 | undefined
}
type Wire3886 = Wire3887 | Wire3888
type Wire3887 = string
type Wire3888 = { [key: string]: Wire3889 | undefined }
type Wire3889 = string
type Wire3890 = string
type Wire3891 = JsonValue
type Wire3892 = never
type Wire3893 = 'image'
type Wire3894 = {
  experimental_providerMetadata?: Wire3837
  image: Wire3895
  mediaType: Wire3899
  mimeType?: Wire3900
  providerOptions: Wire3901
  type: Wire3902
  [key: string]:
    JsonValue | Wire3837 | Wire3895 | Wire3899 | Wire3900 | Wire3901 | Wire3902 | undefined
}
type Wire3895 = Wire3896 | Wire3897
type Wire3896 = string
type Wire3897 = { [key: string]: Wire3898 | undefined }
type Wire3898 = string
type Wire3899 = string
type Wire3900 = JsonValue
type Wire3901 = null
type Wire3902 = 'image'
type Wire3903 = Wire3904 | Wire3913 | Wire3922
type Wire3904 = {
  experimental_providerMetadata?: Wire3905
  image: Wire3906
  mediaType?: Wire3910
  mimeType?: Wire3911
  providerOptions: Wire3837
  type: Wire3912
  [key: string]:
    JsonValue | Wire3905 | Wire3906 | Wire3910 | Wire3911 | Wire3837 | Wire3912 | undefined
}
type Wire3905 = JsonValue
type Wire3906 = Wire3907 | Wire3908
type Wire3907 = string
type Wire3908 = { [key: string]: Wire3909 | undefined }
type Wire3909 = string
type Wire3910 = never
type Wire3911 = string
type Wire3912 = 'image'
type Wire3913 = {
  experimental_providerMetadata?: Wire3837
  image: Wire3914
  mediaType?: Wire3918
  mimeType?: Wire3919
  providerOptions?: Wire3920
  type: Wire3921
  [key: string]:
    JsonValue | Wire3837 | Wire3914 | Wire3918 | Wire3919 | Wire3920 | Wire3921 | undefined
}
type Wire3914 = Wire3915 | Wire3916
type Wire3915 = string
type Wire3916 = { [key: string]: Wire3917 | undefined }
type Wire3917 = string
type Wire3918 = never
type Wire3919 = string
type Wire3920 = never
type Wire3921 = 'image'
type Wire3922 = {
  experimental_providerMetadata?: Wire3837
  image: Wire3923
  mediaType?: Wire3927
  mimeType?: Wire3928
  providerOptions: Wire3929
  type: Wire3930
  [key: string]:
    JsonValue | Wire3837 | Wire3923 | Wire3927 | Wire3928 | Wire3929 | Wire3930 | undefined
}
type Wire3923 = Wire3924 | Wire3925
type Wire3924 = string
type Wire3925 = { [key: string]: Wire3926 | undefined }
type Wire3926 = string
type Wire3927 = never
type Wire3928 = string
type Wire3929 = null
type Wire3930 = 'image'
type Wire3931 = Wire3932 | Wire3952 | Wire3961
type Wire3932 = {
  data: Wire3933
  experimental_providerMetadata?: Wire3948
  filename?: Wire3949
  mediaType: Wire3950
  providerOptions: Wire3837
  type: Wire3951
  [key: string]:
    JsonValue | Wire3933 | Wire3948 | Wire3949 | Wire3950 | Wire3837 | Wire3951 | undefined
}
type Wire3933 = Wire3934 | Wire3945 | Wire3946
type Wire3934 = Wire3935 | Wire3938 | Wire3942
type Wire3935 = {
  data: Wire3936
  type: Wire3937
  [key: string]: JsonValue | Wire3936 | Wire3937 | undefined
}
type Wire3936 = string
type Wire3937 = 'data'
type Wire3938 = {
  reference: Wire3939
  type: Wire3941
  [key: string]: JsonValue | Wire3939 | Wire3941 | undefined
}
type Wire3939 = { [key: string]: Wire3940 | undefined }
type Wire3940 = string
type Wire3941 = 'reference'
type Wire3942 = {
  text: Wire3943
  type: Wire3944
  [key: string]: JsonValue | Wire3943 | Wire3944 | undefined
}
type Wire3943 = string
type Wire3944 = 'text'
type Wire3945 = string
type Wire3946 = { [key: string]: Wire3947 | undefined }
type Wire3947 = string
type Wire3948 = JsonValue
type Wire3949 = string
type Wire3950 = string
type Wire3951 = 'file'
type Wire3952 = {
  data: Wire3953
  experimental_providerMetadata?: Wire3837
  filename?: Wire3957
  mediaType: Wire3958
  providerOptions?: Wire3959
  type: Wire3960
  [key: string]:
    JsonValue | Wire3953 | Wire3837 | Wire3957 | Wire3958 | Wire3959 | Wire3960 | undefined
}
type Wire3953 = Wire3934 | Wire3954 | Wire3955
type Wire3954 = string
type Wire3955 = { [key: string]: Wire3956 | undefined }
type Wire3956 = string
type Wire3957 = string
type Wire3958 = string
type Wire3959 = never
type Wire3960 = 'file'
type Wire3961 = {
  data: Wire3962
  experimental_providerMetadata?: Wire3837
  filename?: Wire3966
  mediaType: Wire3967
  providerOptions: Wire3968
  type: Wire3969
  [key: string]:
    JsonValue | Wire3962 | Wire3837 | Wire3966 | Wire3967 | Wire3968 | Wire3969 | undefined
}
type Wire3962 = Wire3934 | Wire3963 | Wire3964
type Wire3963 = string
type Wire3964 = { [key: string]: Wire3965 | undefined }
type Wire3965 = string
type Wire3966 = string
type Wire3967 = string
type Wire3968 = null
type Wire3969 = 'file'
type Wire3970 = Wire3971 | Wire3977 | Wire3983
type Wire3971 = {
  data: Wire3972
  experimental_providerMetadata?: Wire3973
  filename?: Wire3974
  mediaType: Wire3975
  providerOptions: Wire3837
  type: Wire3976
  [key: string]:
    JsonValue | Wire3972 | Wire3973 | Wire3974 | Wire3975 | Wire3837 | Wire3976 | undefined
}
type Wire3972 = string
type Wire3973 = JsonValue
type Wire3974 = string
type Wire3975 = string
type Wire3976 = 'media'
type Wire3977 = {
  data: Wire3978
  experimental_providerMetadata?: Wire3837
  filename?: Wire3979
  mediaType: Wire3980
  providerOptions?: Wire3981
  type: Wire3982
  [key: string]:
    JsonValue | Wire3978 | Wire3837 | Wire3979 | Wire3980 | Wire3981 | Wire3982 | undefined
}
type Wire3978 = string
type Wire3979 = string
type Wire3980 = string
type Wire3981 = never
type Wire3982 = 'media'
type Wire3983 = {
  data: Wire3984
  experimental_providerMetadata?: Wire3837
  filename?: Wire3985
  mediaType: Wire3986
  providerOptions: Wire3987
  type: Wire3988
  [key: string]:
    JsonValue | Wire3984 | Wire3837 | Wire3985 | Wire3986 | Wire3987 | Wire3988 | undefined
}
type Wire3984 = string
type Wire3985 = string
type Wire3986 = string
type Wire3987 = null
type Wire3988 = 'media'
type Wire3989 = JsonValue
type Wire3990 = 'user'
type Wire3991 = {
  content: Wire3857
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire3992
  role: Wire3993
  [key: string]: JsonValue | Wire3857 | Wire3837 | Wire3992 | Wire3993 | undefined
}
type Wire3992 = never
type Wire3993 = 'user'
type Wire3994 = {
  content: Wire3857
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire3995
  role: Wire3996
  [key: string]: JsonValue | Wire3857 | Wire3837 | Wire3995 | Wire3996 | undefined
}
type Wire3995 = null
type Wire3996 = 'user'
type Wire3997 = Wire3998 | Wire4207 | Wire4210
type Wire3998 = {
  content: Wire3999
  experimental_providerMetadata?: Wire4205
  providerOptions: Wire3837
  role: Wire4206
  [key: string]: JsonValue | Wire3999 | Wire4205 | Wire3837 | Wire4206 | undefined
}
type Wire3999 = Wire4000 | Wire4001
type Wire4000 = string
type Wire4001 = Array<Wire4002>
type Wire4002 =
  Wire3861 | Wire4003 | Wire3931 | Wire3970 | Wire4016 | Wire4029 | Wire4057 | Wire4082 | Wire4199
type Wire4003 = Wire4004 | Wire4008 | Wire4012
type Wire4004 = {
  experimental_providerMetadata?: Wire4005
  kind: Wire4006
  providerOptions: Wire3837
  type: Wire4007
  [key: string]: JsonValue | Wire4005 | Wire4006 | Wire3837 | Wire4007 | undefined
}
type Wire4005 = JsonValue
type Wire4006 = string
type Wire4007 = 'custom'
type Wire4008 = {
  experimental_providerMetadata?: Wire3837
  kind: Wire4009
  providerOptions?: Wire4010
  type: Wire4011
  [key: string]: JsonValue | Wire3837 | Wire4009 | Wire4010 | Wire4011 | undefined
}
type Wire4009 = string
type Wire4010 = never
type Wire4011 = 'custom'
type Wire4012 = {
  experimental_providerMetadata?: Wire3837
  kind: Wire4013
  providerOptions: Wire4014
  type: Wire4015
  [key: string]: JsonValue | Wire3837 | Wire4013 | Wire4014 | Wire4015 | undefined
}
type Wire4013 = string
type Wire4014 = null
type Wire4015 = 'custom'
type Wire4016 = Wire4017 | Wire4021 | Wire4025
type Wire4017 = {
  experimental_providerMetadata?: Wire4018
  providerOptions: Wire3837
  text: Wire4019
  type: Wire4020
  [key: string]: JsonValue | Wire4018 | Wire3837 | Wire4019 | Wire4020 | undefined
}
type Wire4018 = JsonValue
type Wire4019 = string
type Wire4020 = 'reasoning'
type Wire4021 = {
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire4022
  text: Wire4023
  type: Wire4024
  [key: string]: JsonValue | Wire3837 | Wire4022 | Wire4023 | Wire4024 | undefined
}
type Wire4022 = never
type Wire4023 = string
type Wire4024 = 'reasoning'
type Wire4025 = {
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire4026
  text: Wire4027
  type: Wire4028
  [key: string]: JsonValue | Wire3837 | Wire4026 | Wire4027 | Wire4028 | undefined
}
type Wire4026 = null
type Wire4027 = string
type Wire4028 = 'reasoning'
type Wire4029 = Wire4030 | Wire4039 | Wire4048
type Wire4030 = {
  data: Wire4031
  experimental_providerMetadata?: Wire4036
  mediaType: Wire4037
  providerOptions: Wire3837
  type: Wire4038
  [key: string]: JsonValue | Wire4031 | Wire4036 | Wire4037 | Wire3837 | Wire4038 | undefined
}
type Wire4031 = Wire4032 | Wire4035
type Wire4032 = {
  data: Wire4033
  type: Wire4034
  [key: string]: JsonValue | Wire4033 | Wire4034 | undefined
}
type Wire4033 = string
type Wire4034 = 'data'
type Wire4035 = string
type Wire4036 = JsonValue
type Wire4037 = string
type Wire4038 = 'reasoning-file'
type Wire4039 = {
  data: Wire4040
  experimental_providerMetadata?: Wire3837
  mediaType: Wire4045
  providerOptions?: Wire4046
  type: Wire4047
  [key: string]: JsonValue | Wire4040 | Wire3837 | Wire4045 | Wire4046 | Wire4047 | undefined
}
type Wire4040 = Wire4041 | Wire4044
type Wire4041 = {
  data: Wire4042
  type: Wire4043
  [key: string]: JsonValue | Wire4042 | Wire4043 | undefined
}
type Wire4042 = string
type Wire4043 = 'data'
type Wire4044 = string
type Wire4045 = string
type Wire4046 = never
type Wire4047 = 'reasoning-file'
type Wire4048 = {
  data: Wire4049
  experimental_providerMetadata?: Wire3837
  mediaType: Wire4054
  providerOptions: Wire4055
  type: Wire4056
  [key: string]: JsonValue | Wire4049 | Wire3837 | Wire4054 | Wire4055 | Wire4056 | undefined
}
type Wire4049 = Wire4050 | Wire4053
type Wire4050 = {
  data: Wire4051
  type: Wire4052
  [key: string]: JsonValue | Wire4051 | Wire4052 | undefined
}
type Wire4051 = string
type Wire4052 = 'data'
type Wire4053 = string
type Wire4054 = string
type Wire4055 = null
type Wire4056 = 'reasoning-file'
type Wire4057 = Wire4058 | Wire4066 | Wire4074
type Wire4058 = {
  args?: Wire4059
  experimental_providerMetadata?: Wire4060
  input?: Wire4061
  providerExecuted?: Wire4062
  providerOptions: Wire3837
  toolCallId: Wire4063
  toolName: Wire4064
  type: Wire4065
  [key: string]:
    | JsonValue
    | Wire4059
    | Wire4060
    | Wire4061
    | Wire4062
    | Wire3837
    | Wire4063
    | Wire4064
    | Wire4065
    | undefined
}
type Wire4059 = JsonValue
type Wire4060 = JsonValue
type Wire4061 = JsonValue
type Wire4062 = boolean
type Wire4063 = string
type Wire4064 = string
type Wire4065 = 'tool-call'
type Wire4066 = {
  args?: Wire4067
  experimental_providerMetadata?: Wire3837
  input?: Wire4068
  providerExecuted?: Wire4069
  providerOptions?: Wire4070
  toolCallId: Wire4071
  toolName: Wire4072
  type: Wire4073
  [key: string]:
    | JsonValue
    | Wire4067
    | Wire3837
    | Wire4068
    | Wire4069
    | Wire4070
    | Wire4071
    | Wire4072
    | Wire4073
    | undefined
}
type Wire4067 = JsonValue
type Wire4068 = JsonValue
type Wire4069 = boolean
type Wire4070 = never
type Wire4071 = string
type Wire4072 = string
type Wire4073 = 'tool-call'
type Wire4074 = {
  args?: Wire4075
  experimental_providerMetadata?: Wire3837
  input?: Wire4076
  providerExecuted?: Wire4077
  providerOptions: Wire4078
  toolCallId: Wire4079
  toolName: Wire4080
  type: Wire4081
  [key: string]:
    | JsonValue
    | Wire4075
    | Wire3837
    | Wire4076
    | Wire4077
    | Wire4078
    | Wire4079
    | Wire4080
    | Wire4081
    | undefined
}
type Wire4075 = JsonValue
type Wire4076 = JsonValue
type Wire4077 = boolean
type Wire4078 = null
type Wire4079 = string
type Wire4080 = string
type Wire4081 = 'tool-call'
type Wire4082 = Wire4083 | Wire4183 | Wire4191
type Wire4083 = {
  experimental_content?: Wire4084
  experimental_providerMetadata?: Wire4085
  isError?: Wire4086
  output?: Wire4087
  providerOptions: Wire3837
  result?: Wire4179
  toolCallId: Wire4180
  toolName: Wire4181
  type: Wire4182
  [key: string]:
    | JsonValue
    | Wire4084
    | Wire4085
    | Wire4086
    | Wire4087
    | Wire3837
    | Wire4179
    | Wire4180
    | Wire4181
    | Wire4182
    | undefined
}
type Wire4084 = JsonValue
type Wire4085 = JsonValue
type Wire4086 = JsonValue
type Wire4087 = Wire4088 | Wire4091 | Wire4093 | Wire4096 | Wire4099 | Wire4101
type Wire4088 = {
  providerOptions?: Wire3837
  type: Wire4089
  value: Wire4090
  [key: string]: JsonValue | Wire3837 | Wire4089 | Wire4090 | undefined
}
type Wire4089 = 'text'
type Wire4090 = string
type Wire4091 = {
  providerOptions?: Wire3837
  type: Wire4092
  value: Wire3839
  [key: string]: JsonValue | Wire3837 | Wire4092 | Wire3839 | undefined
}
type Wire4092 = 'json'
type Wire4093 = {
  providerOptions?: Wire3837
  reason?: Wire4094
  type: Wire4095
  [key: string]: JsonValue | Wire3837 | Wire4094 | Wire4095 | undefined
}
type Wire4094 = string
type Wire4095 = 'execution-denied'
type Wire4096 = {
  providerOptions?: Wire3837
  type: Wire4097
  value: Wire4098
  [key: string]: JsonValue | Wire3837 | Wire4097 | Wire4098 | undefined
}
type Wire4097 = 'error-text'
type Wire4098 = string
type Wire4099 = {
  providerOptions?: Wire3837
  type: Wire4100
  value: Wire3839
  [key: string]: JsonValue | Wire3837 | Wire4100 | Wire3839 | undefined
}
type Wire4100 = 'error-json'
type Wire4101 = {
  type: Wire4102
  value: Wire4103
  [key: string]: JsonValue | Wire4102 | Wire4103 | undefined
}
type Wire4102 = 'content'
type Wire4103 = Array<Wire4104>
type Wire4104 =
  | Wire3861
  | Wire4105
  | Wire4121
  | Wire4137
  | Wire4141
  | Wire4146
  | Wire4150
  | Wire4156
  | Wire4160
  | Wire4164
  | Wire4167
  | Wire4173
  | Wire4177
type Wire4105 = Wire4106 | Wire4111 | Wire4116
type Wire4106 = {
  data: Wire4107
  experimental_providerMetadata?: Wire4108
  mimeType?: Wire4109
  providerOptions: Wire3837
  type: Wire4110
  [key: string]: JsonValue | Wire4107 | Wire4108 | Wire4109 | Wire3837 | Wire4110 | undefined
}
type Wire4107 = string
type Wire4108 = JsonValue
type Wire4109 = JsonValue
type Wire4110 = 'image'
type Wire4111 = {
  data: Wire4112
  experimental_providerMetadata?: Wire3837
  mimeType?: Wire4113
  providerOptions?: Wire4114
  type: Wire4115
  [key: string]: JsonValue | Wire4112 | Wire3837 | Wire4113 | Wire4114 | Wire4115 | undefined
}
type Wire4112 = string
type Wire4113 = JsonValue
type Wire4114 = never
type Wire4115 = 'image'
type Wire4116 = {
  data: Wire4117
  experimental_providerMetadata?: Wire3837
  mimeType?: Wire4118
  providerOptions: Wire4119
  type: Wire4120
  [key: string]: JsonValue | Wire4117 | Wire3837 | Wire4118 | Wire4119 | Wire4120 | undefined
}
type Wire4117 = string
type Wire4118 = JsonValue
type Wire4119 = null
type Wire4120 = 'image'
type Wire4121 = Wire4122 | Wire4127 | Wire4132
type Wire4122 = {
  data: Wire4123
  experimental_providerMetadata?: Wire4124
  mediaType: Wire4125
  providerOptions: Wire3837
  type: Wire4126
  [key: string]: JsonValue | Wire4123 | Wire4124 | Wire4125 | Wire3837 | Wire4126 | undefined
}
type Wire4123 = string
type Wire4124 = JsonValue
type Wire4125 = string
type Wire4126 = 'media'
type Wire4127 = {
  data: Wire4128
  experimental_providerMetadata?: Wire3837
  mediaType: Wire4129
  providerOptions?: Wire4130
  type: Wire4131
  [key: string]: JsonValue | Wire4128 | Wire3837 | Wire4129 | Wire4130 | Wire4131 | undefined
}
type Wire4128 = string
type Wire4129 = string
type Wire4130 = never
type Wire4131 = 'media'
type Wire4132 = {
  data: Wire4133
  experimental_providerMetadata?: Wire3837
  mediaType: Wire4134
  providerOptions: Wire4135
  type: Wire4136
  [key: string]: JsonValue | Wire4133 | Wire3837 | Wire4134 | Wire4135 | Wire4136 | undefined
}
type Wire4133 = string
type Wire4134 = string
type Wire4135 = null
type Wire4136 = 'media'
type Wire4137 = {
  data: Wire3934
  filename?: Wire4138
  mediaType: Wire4139
  providerOptions?: Wire3837
  type: Wire4140
  [key: string]: JsonValue | Wire3934 | Wire4138 | Wire4139 | Wire3837 | Wire4140 | undefined
}
type Wire4138 = string
type Wire4139 = string
type Wire4140 = 'file'
type Wire4141 = {
  data: Wire4142
  filename?: Wire4143
  mediaType: Wire4144
  providerOptions?: Wire3837
  type: Wire4145
  [key: string]: JsonValue | Wire4142 | Wire4143 | Wire4144 | Wire3837 | Wire4145 | undefined
}
type Wire4142 = string
type Wire4143 = string
type Wire4144 = string
type Wire4145 = 'file-data'
type Wire4146 = {
  mediaType?: Wire4147
  providerOptions?: Wire3837
  type: Wire4148
  url: Wire4149
  [key: string]: JsonValue | Wire4147 | Wire3837 | Wire4148 | Wire4149 | undefined
}
type Wire4147 = string
type Wire4148 = 'file-url'
type Wire4149 = string
type Wire4150 = {
  fileId: Wire4151
  providerOptions?: Wire3837
  type: Wire4155
  [key: string]: JsonValue | Wire4151 | Wire3837 | Wire4155 | undefined
}
type Wire4151 = Wire4152 | Wire4153
type Wire4152 = string
type Wire4153 = { [key: string]: Wire4154 | undefined }
type Wire4154 = string
type Wire4155 = 'file-id'
type Wire4156 = {
  providerOptions?: Wire3837
  providerReference: Wire4157
  type: Wire4159
  [key: string]: JsonValue | Wire3837 | Wire4157 | Wire4159 | undefined
}
type Wire4157 = { [key: string]: Wire4158 | undefined }
type Wire4158 = string
type Wire4159 = 'file-reference'
type Wire4160 = {
  data: Wire4161
  mediaType: Wire4162
  providerOptions?: Wire3837
  type: Wire4163
  [key: string]: JsonValue | Wire4161 | Wire4162 | Wire3837 | Wire4163 | undefined
}
type Wire4161 = string
type Wire4162 = string
type Wire4163 = 'image-data'
type Wire4164 = {
  providerOptions?: Wire3837
  type: Wire4165
  url: Wire4166
  [key: string]: JsonValue | Wire3837 | Wire4165 | Wire4166 | undefined
}
type Wire4165 = 'image-url'
type Wire4166 = string
type Wire4167 = {
  fileId: Wire4168
  providerOptions?: Wire3837
  type: Wire4172
  [key: string]: JsonValue | Wire4168 | Wire3837 | Wire4172 | undefined
}
type Wire4168 = Wire4169 | Wire4170
type Wire4169 = string
type Wire4170 = { [key: string]: Wire4171 | undefined }
type Wire4171 = string
type Wire4172 = 'image-file-id'
type Wire4173 = {
  providerOptions?: Wire3837
  providerReference: Wire4174
  type: Wire4176
  [key: string]: JsonValue | Wire3837 | Wire4174 | Wire4176 | undefined
}
type Wire4174 = { [key: string]: Wire4175 | undefined }
type Wire4175 = string
type Wire4176 = 'image-file-reference'
type Wire4177 = {
  providerOptions?: Wire3837
  type: Wire4178
  [key: string]: JsonValue | Wire3837 | Wire4178 | undefined
}
type Wire4178 = 'custom'
type Wire4179 = JsonValue
type Wire4180 = string
type Wire4181 = string
type Wire4182 = 'tool-result'
type Wire4183 = {
  experimental_content?: Wire4184
  experimental_providerMetadata?: Wire3837
  isError?: Wire4185
  output?: Wire4087
  providerOptions?: Wire4186
  result?: Wire4187
  toolCallId: Wire4188
  toolName: Wire4189
  type: Wire4190
  [key: string]:
    | JsonValue
    | Wire4184
    | Wire3837
    | Wire4185
    | Wire4087
    | Wire4186
    | Wire4187
    | Wire4188
    | Wire4189
    | Wire4190
    | undefined
}
type Wire4184 = JsonValue
type Wire4185 = JsonValue
type Wire4186 = never
type Wire4187 = JsonValue
type Wire4188 = string
type Wire4189 = string
type Wire4190 = 'tool-result'
type Wire4191 = {
  experimental_content?: Wire4192
  experimental_providerMetadata?: Wire3837
  isError?: Wire4193
  output?: Wire4087
  providerOptions: Wire4194
  result?: Wire4195
  toolCallId: Wire4196
  toolName: Wire4197
  type: Wire4198
  [key: string]:
    | JsonValue
    | Wire4192
    | Wire3837
    | Wire4193
    | Wire4087
    | Wire4194
    | Wire4195
    | Wire4196
    | Wire4197
    | Wire4198
    | undefined
}
type Wire4192 = JsonValue
type Wire4193 = JsonValue
type Wire4194 = null
type Wire4195 = JsonValue
type Wire4196 = string
type Wire4197 = string
type Wire4198 = 'tool-result'
type Wire4199 = {
  approvalId: Wire4200
  isAutomatic?: Wire4201
  signature?: Wire4202
  toolCallId: Wire4203
  type: Wire4204
  [key: string]: JsonValue | Wire4200 | Wire4201 | Wire4202 | Wire4203 | Wire4204 | undefined
}
type Wire4200 = string
type Wire4201 = boolean
type Wire4202 = string
type Wire4203 = string
type Wire4204 = 'tool-approval-request'
type Wire4205 = JsonValue
type Wire4206 = 'assistant'
type Wire4207 = {
  content: Wire3999
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire4208
  role: Wire4209
  [key: string]: JsonValue | Wire3999 | Wire3837 | Wire4208 | Wire4209 | undefined
}
type Wire4208 = never
type Wire4209 = 'assistant'
type Wire4210 = {
  content: Wire3999
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire4211
  role: Wire4212
  [key: string]: JsonValue | Wire3999 | Wire3837 | Wire4211 | Wire4212 | undefined
}
type Wire4211 = null
type Wire4212 = 'assistant'
type Wire4213 = Wire4214 | Wire4225 | Wire4228
type Wire4214 = {
  content: Wire4215
  experimental_providerMetadata?: Wire4223
  providerOptions: Wire3837
  role: Wire4224
  [key: string]: JsonValue | Wire4215 | Wire4223 | Wire3837 | Wire4224 | undefined
}
type Wire4215 = Array<Wire4216>
type Wire4216 = Wire4082 | Wire4217
type Wire4217 = {
  approvalId: Wire4218
  approved: Wire4219
  providerExecuted?: Wire4220
  reason?: Wire4221
  type: Wire4222
  [key: string]: JsonValue | Wire4218 | Wire4219 | Wire4220 | Wire4221 | Wire4222 | undefined
}
type Wire4218 = string
type Wire4219 = boolean
type Wire4220 = boolean
type Wire4221 = string
type Wire4222 = 'tool-approval-response'
type Wire4223 = JsonValue
type Wire4224 = 'tool'
type Wire4225 = {
  content: Wire4215
  experimental_providerMetadata?: Wire3837
  providerOptions?: Wire4226
  role: Wire4227
  [key: string]: JsonValue | Wire4215 | Wire3837 | Wire4226 | Wire4227 | undefined
}
type Wire4226 = never
type Wire4227 = 'tool'
type Wire4228 = {
  content: Wire4215
  experimental_providerMetadata?: Wire3837
  providerOptions: Wire4229
  role: Wire4230
  [key: string]: JsonValue | Wire4215 | Wire3837 | Wire4229 | Wire4230 | undefined
}
type Wire4229 = null
type Wire4230 = 'tool'
type Wire4231 = Wire4232 | Wire4233 | Wire4236
type Wire4232 = string
type Wire4233 = Wire4234 | Wire4235
type Wire4234 = string
type Wire4235 =
  | 'anthropic/claude-4-opus-20250514'
  | 'anthropic/claude-4-sonnet-20250514'
  | 'anthropic/claude-fable-5'
  | 'anthropic/claude-fable-5-1'
  | 'anthropic/claude-opus-4-20250514'
  | 'anthropic/claude-opus-4-5'
  | 'anthropic/claude-opus-4-6'
  | 'anthropic/claude-opus-4-7'
  | 'anthropic/claude-opus-4-8'
  | 'anthropic/claude-opus-5'
  | 'anthropic/claude-opus-5-5'
  | 'anthropic/claude-sonnet-4-20250514'
  | 'anthropic/claude-sonnet-4-5'
  | 'anthropic/claude-sonnet-4-6'
  | 'anthropic/claude-sonnet-5'
  | 'google/gemini-2.5-pro'
  | 'moonshot/kimi-k2'
  | 'openai/chatgpt-4o-latest'
  | 'openai/gpt-4.1-2025-04-14'
  | 'openai/gpt-4o-audio-preview'
  | 'openai/gpt-5.2'
  | 'openai/gpt-5.2-2025-12-11'
  | 'openai/gpt-5.2-chat-latest'
  | 'openai/gpt-5.2-pro'
  | 'openai/gpt-5.4'
  | 'openai/gpt-5.4-mini'
  | 'openai/gpt-5.4-nano'
  | 'openai/gpt-5.5'
  | 'openai/gpt-5.6-sol'
  | 'openai/gpt-6-astra'
  | 'openai/gpt-audio'
  | 'openai/gpt-audio-2025-08-28'
  | 'openai/o3-2025-04-16'
type Wire4236 = Wire4237 | Wire4238
type Wire4237 = string
type Wire4238 = 'auto'
type Wire4239 = Wire4240 | Wire4241
type Wire4240 = string
type Wire4241 = 'high' | 'low' | 'medium' | 'xhigh'
type Wire4242 = Wire4243 | Wire4244
type Wire4243 = string
type Wire4244 = 'all' | 'last'
type Wire4245 = '/ai/chat'
type Wire4246 = Wire4247 | Wire4248
type Wire4247 = string
type Wire4248 = string
type Wire4249 = Wire4250 | Wire4251
type Wire4250 = string
type Wire4251 = string
type Wire4252 = Wire4253 | Wire4254
type Wire4253 = string
type Wire4254 = Wire4255 | Wire4256
type Wire4255 = boolean
type Wire4256 = 'false' | 'true'
type Wire4257 = {
  bucket?: Wire4258
  bucket_region?: Wire4261
  credentials?: Wire4264
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire4267
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire4270
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire2142
  result?: Wire1432
  return_file_stubs?: Wire2002
  robot: Wire4273
  secret?: Wire4274
  user_meta?: Wire1438
}
type Wire4258 = Wire4259 | Wire4260
type Wire4259 = string
type Wire4260 = string
type Wire4261 = Wire4262 | Wire4263
type Wire4262 = string
type Wire4263 = string
type Wire4264 = Wire4265 | Wire4266
type Wire4265 = string
type Wire4266 = string
type Wire4267 = Wire4268 | Wire4269
type Wire4268 = string
type Wire4269 = string
type Wire4270 = Wire4271 | Wire4272
type Wire4271 = string
type Wire4272 = string
type Wire4273 = '/tigris/import'
type Wire4274 = Wire4275 | Wire4276
type Wire4275 = string
type Wire4276 = string
type Wire4277 = {
  acl?: Wire2012
  bucket?: Wire4278
  bucket_region?: Wire4281
  credentials?: Wire4264
  force_accept?: Wire1376
  headers?: Wire4284
  host?: Wire4288
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire4291
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4294
  secret?: Wire4295
  sign_urls_for?: Wire3530
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4278 = Wire4279 | Wire4280
type Wire4279 = string
type Wire4280 = string
type Wire4281 = Wire4282 | Wire4283
type Wire4282 = string
type Wire4283 = string
type Wire4284 = { [key: string]: Wire4285 | undefined }
type Wire4285 = Wire4286 | Wire4287
type Wire4286 = string
type Wire4287 = string
type Wire4288 = Wire4289 | Wire4290
type Wire4289 = string
type Wire4290 = string
type Wire4291 = Wire4292 | Wire4293
type Wire4292 = string
type Wire4293 = string
type Wire4294 = '/tigris/store'
type Wire4295 = Wire4296 | Wire4297
type Wire4296 = string
type Wire4297 = string
type Wire4298 = {
  enable_hipaa_compliance?: Wire4299
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4304
  user_meta?: Wire1438
}
type Wire4299 = Wire4300 | Wire4301
type Wire4300 = string
type Wire4301 = Wire4302 | Wire4303
type Wire4302 = boolean
type Wire4303 = 'false' | 'true'
type Wire4304 = '/tlcdn/deliver'
type Wire4305 = {
  conflict_strategy?: Wire4306
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  path?: Wire4309
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4312
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4306 = Wire4307 | Wire4308
type Wire4307 = string
type Wire4308 = 'error' | 'overwrite' | 'rename'
type Wire4309 = Wire4310 | Wire4311
type Wire4310 = string
type Wire4311 = string
type Wire4312 = '/transloadit/store'
type Wire4313 = {
  credentials?: Wire4314
  endpoint: Wire4317
  force_accept?: Wire1376
  headers?: Wire4320
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  metadata?: Wire4324
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4328
  ssl_url_template?: Wire4329
  url_template?: Wire4332
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4314 = Wire4315 | Wire4316
type Wire4315 = string
type Wire4316 = string
type Wire4317 = Wire4318 | Wire4319
type Wire4318 = string
type Wire4319 = string
type Wire4320 = { [key: string]: Wire4321 | undefined }
type Wire4321 = Wire4322 | Wire4323
type Wire4322 = string
type Wire4323 = string
type Wire4324 = { [key: string]: Wire4325 | undefined }
type Wire4325 = Wire4326 | Wire4327
type Wire4326 = string
type Wire4327 = string
type Wire4328 = '/tus/store'
type Wire4329 = Wire4330 | Wire4331
type Wire4330 = string
type Wire4331 = string
type Wire4332 = Wire4333 | Wire4334
type Wire4333 = string
type Wire4334 = string
type Wire4335 = {
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4336
  user_meta?: Wire1438
}
type Wire4336 = '/upload/handle'
type Wire4337 = {
  audio_group?: Wire4338
  closed_captions?: Wire4343
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  height?: Wire4348
  hls_playlist_name?: Wire4354
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  playlist_name?: Wire4357
  preset?: Wire4360
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4363
  segment_duration?: Wire4364
  technique?: Wire4368
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire4371
}
type Wire4338 = Wire4339 | Wire4340
type Wire4339 = string
type Wire4340 = Wire4341 | Wire4342
type Wire4341 = boolean
type Wire4342 = 'false' | 'true'
type Wire4343 = Wire4344 | Wire4345
type Wire4344 = string
type Wire4345 = Wire4346 | Wire4347
type Wire4346 = boolean
type Wire4347 = 'false' | 'true'
type Wire4348 = Wire4349 | Wire4353
type Wire4349 = Wire4350 | Wire4351 | Wire4352
type Wire4350 = string
type Wire4351 = string
type Wire4352 = number
type Wire4353 = null
type Wire4354 = Wire4355 | Wire4356
type Wire4355 = string
type Wire4356 = string
type Wire4357 = Wire4358 | Wire4359
type Wire4358 = string
type Wire4359 = string
type Wire4360 = Wire4361 | Wire4362
type Wire4361 = string
type Wire4362 =
  | 'aac'
  | 'alac'
  | 'android'
  | 'android-high'
  | 'android-low'
  | 'android_high'
  | 'android_low'
  | 'audio/aac'
  | 'audio/alac'
  | 'audio/flac'
  | 'audio/mp3'
  | 'audio/ogg'
  | 'dash-1080p-video'
  | 'dash-1080p_video'
  | 'dash-128k-audio'
  | 'dash-128k_audio'
  | 'dash-256k-audio'
  | 'dash-256k_audio'
  | 'dash-270p-video'
  | 'dash-270p_video'
  | 'dash-32k-audio'
  | 'dash-32k_audio'
  | 'dash-360p-video'
  | 'dash-360p_video'
  | 'dash-480p-video'
  | 'dash-480p_video'
  | 'dash-540p-video'
  | 'dash-540p_video'
  | 'dash-576p-video'
  | 'dash-576p_video'
  | 'dash-64k-audio'
  | 'dash-64k_audio'
  | 'dash-720p-video'
  | 'dash-720p_video'
  | 'dash/1080p-video'
  | 'dash/1080p_video'
  | 'dash/128k-audio'
  | 'dash/128k_audio'
  | 'dash/256k-audio'
  | 'dash/256k_audio'
  | 'dash/270p-video'
  | 'dash/270p_video'
  | 'dash/32k-audio'
  | 'dash/32k_audio'
  | 'dash/360p-video'
  | 'dash/360p_video'
  | 'dash/480p-video'
  | 'dash/480p_video'
  | 'dash/540p-video'
  | 'dash/540p_video'
  | 'dash/576p-video'
  | 'dash/576p_video'
  | 'dash/64k-audio'
  | 'dash/64k_audio'
  | 'dash/720p-video'
  | 'dash/720p_video'
  | 'dash_1080p-video'
  | 'dash_1080p_video'
  | 'dash_128k-audio'
  | 'dash_128k_audio'
  | 'dash_256k-audio'
  | 'dash_256k_audio'
  | 'dash_270p-video'
  | 'dash_270p_video'
  | 'dash_32k-audio'
  | 'dash_32k_audio'
  | 'dash_360p-video'
  | 'dash_360p_video'
  | 'dash_480p-video'
  | 'dash_480p_video'
  | 'dash_540p-video'
  | 'dash_540p_video'
  | 'dash_576p-video'
  | 'dash_576p_video'
  | 'dash_64k-audio'
  | 'dash_64k_audio'
  | 'dash_720p-video'
  | 'dash_720p_video'
  | 'empty'
  | 'flac'
  | 'flash'
  | 'gif'
  | 'hevc'
  | 'hg-transformers-audio'
  | 'hg-transformers_audio'
  | 'hg_transformers-audio'
  | 'hg_transformers_audio'
  | 'hls-1080p'
  | 'hls-270p'
  | 'hls-360p'
  | 'hls-480p'
  | 'hls-540p'
  | 'hls-576p'
  | 'hls-720p'
  | 'hls/1080p'
  | 'hls/270p'
  | 'hls/360p'
  | 'hls/480p'
  | 'hls/4k'
  | 'hls/540p'
  | 'hls/720p'
  | 'hls_1080p'
  | 'hls_270p'
  | 'hls_360p'
  | 'hls_480p'
  | 'hls_540p'
  | 'hls_576p'
  | 'hls_720p'
  | 'ipad'
  | 'ipad-high'
  | 'ipad-low'
  | 'ipad_high'
  | 'ipad_low'
  | 'iphone'
  | 'iphone-high'
  | 'iphone-low'
  | 'iphone_high'
  | 'iphone_low'
  | 'mp3'
  | 'ogg'
  | 'ogv'
  | 'opus'
  | 'speech'
  | 'vod/1080p'
  | 'vod/270p'
  | 'vod/480p'
  | 'vod/720p'
  | 'vp9'
  | 'vp9-1080p'
  | 'vp9-270p'
  | 'vp9-360p'
  | 'vp9-480p'
  | 'vp9-540p'
  | 'vp9-576p'
  | 'vp9-720p'
  | 'vp9_1080p'
  | 'vp9_270p'
  | 'vp9_360p'
  | 'vp9_480p'
  | 'vp9_540p'
  | 'vp9_576p'
  | 'vp9_720p'
  | 'wav'
  | 'web/mp4-x265/1080p'
  | 'web/mp4-x265/240p'
  | 'web/mp4-x265/360p'
  | 'web/mp4-x265/480p'
  | 'web/mp4-x265/4k'
  | 'web/mp4-x265/720p'
  | 'web/mp4-x265/8k'
  | 'web/mp4/1080p'
  | 'web/mp4/240p'
  | 'web/mp4/360p'
  | 'web/mp4/480p'
  | 'web/mp4/4k'
  | 'web/mp4/540p'
  | 'web/mp4/720p'
  | 'web/mp4/8k'
  | 'web/mp4_x265/1080p'
  | 'web/mp4_x265/240p'
  | 'web/mp4_x265/360p'
  | 'web/mp4_x265/480p'
  | 'web/mp4_x265/4k'
  | 'web/mp4_x265/720p'
  | 'web/mp4_x265/8k'
  | 'web/webm-av1/1080p'
  | 'web/webm-av1/240p'
  | 'web/webm-av1/360p'
  | 'web/webm-av1/480p'
  | 'web/webm-av1/4k'
  | 'web/webm-av1/720p'
  | 'web/webm-av1/8k'
  | 'web/webm/1080p'
  | 'web/webm/240p'
  | 'web/webm/360p'
  | 'web/webm/480p'
  | 'web/webm/4k'
  | 'web/webm/720p'
  | 'web/webm/8k'
  | 'web/webm_av1/1080p'
  | 'web/webm_av1/240p'
  | 'web/webm_av1/360p'
  | 'web/webm_av1/480p'
  | 'web/webm_av1/4k'
  | 'web/webm_av1/720p'
  | 'web/webm_av1/8k'
  | 'webm'
  | 'webm-1080p'
  | 'webm-270p'
  | 'webm-360p'
  | 'webm-480p'
  | 'webm-540p'
  | 'webm-576p'
  | 'webm-720p'
  | 'webm_1080p'
  | 'webm_270p'
  | 'webm_360p'
  | 'webm_480p'
  | 'webm_540p'
  | 'webm_576p'
  | 'webm_720p'
  | 'wmv'
type Wire4363 = '/video/adaptive'
type Wire4364 = Wire4365 | Wire4366 | Wire4367
type Wire4365 = string
type Wire4366 = string
type Wire4367 = number
type Wire4368 = Wire4369 | Wire4370
type Wire4369 = string
type Wire4370 = 'cmaf' | 'dash' | 'hls'
type Wire4371 = Wire4372 | Wire4376
type Wire4372 = Wire4373 | Wire4374 | Wire4375
type Wire4373 = string
type Wire4374 = string
type Wire4375 = number
type Wire4376 = null
type Wire4377 = {
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  method?: Wire4378
  output_meta?: Wire1414
  preset?: Wire1616
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4381
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4378 = Wire4379 | Wire4380
type Wire4379 = string
type Wire4380 = 'extract' | 'insert'
type Wire4381 = '/video/artwork'
type Wire4382 = {
  audio_fade_seconds?: Wire4383
  chapter_markers?: Wire4387
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  height?: Wire4348
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire4360
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4392
  sort_by?: Wire1659
  transition?: Wire4393
  transition_duration?: Wire4396
  use?: Wire1620
  user_meta?: Wire1438
  video_fade_seconds?: Wire4400
  width?: Wire4371
}
type Wire4383 = Wire4384 | Wire4385 | Wire4386
type Wire4384 = string
type Wire4385 = string
type Wire4386 = number
type Wire4387 = Wire4388 | Wire4389
type Wire4388 = string
type Wire4389 = Wire4390 | Wire4391
type Wire4390 = boolean
type Wire4391 = 'false' | 'true'
type Wire4392 = '/video/concat'
type Wire4393 = Wire4394 | Wire4395
type Wire4394 = string
type Wire4395 = 'crossfade' | 'fade_to_black' | 'none'
type Wire4396 = Wire4397 | Wire4398 | Wire4399
type Wire4397 = string
type Wire4398 = string
type Wire4399 = number
type Wire4400 = Wire4401 | Wire4402 | Wire4403
type Wire4401 = string
type Wire4402 = string
type Wire4403 = number
type Wire4404 = {
  background?: Wire4405
  chunk_duration?: Wire4408
  crop?: Wire4412
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  font_color?: Wire4417
  font_size?: Wire1462
  force_accept?: Wire1376
  height?: Wire4348
  hint?: Wire4420
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire4360
  queue?: Wire1425
  resize_strategy?: Wire4425
  result?: Wire1432
  robot: Wire4428
  rotate?: Wire4429
  segment?: Wire4449
  segment_duration?: Wire4454
  segment_name?: Wire4458
  segment_prefix?: Wire4461
  segment_time_delta?: Wire4464
  text_background_color?: Wire4468
  turbo?: Wire4471
  use?: Wire1620
  user_meta?: Wire1438
  watermark_duration?: Wire4476
  watermark_opacity?: Wire4480
  watermark_position?: Wire4484
  watermark_resize_strategy?: Wire4489
  watermark_size?: Wire4492
  watermark_start_time?: Wire4495
  watermark_url?: Wire4499
  watermark_x_offset?: Wire3476
  watermark_y_offset?: Wire3480
  width?: Wire4371
  zoom?: Wire4507
}
type Wire4405 = Wire4406 | Wire4407
type Wire4406 = string
type Wire4407 = string
type Wire4408 = Wire4409 | Wire4410 | Wire4411
type Wire4409 = string
type Wire4410 = string
type Wire4411 = number
type Wire4412 = Wire4413 | Wire3255 | Wire4414
type Wire4413 = string
type Wire4414 = Wire4415 | Wire4416
type Wire4415 = string
type Wire4416 = string
type Wire4417 = Wire4418 | Wire4419
type Wire4418 = string
type Wire4419 = string
type Wire4420 = Wire4421 | Wire4422
type Wire4421 = string
type Wire4422 = Wire4423 | Wire4424
type Wire4423 = boolean
type Wire4424 = 'false' | 'true'
type Wire4425 = Wire4426 | Wire4427
type Wire4426 = string
type Wire4427 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4428 = '/video/encode'
type Wire4429 = Wire4430 | Wire4431 | Wire4434 | Wire4437 | Wire4440 | Wire4443 | Wire4446
type Wire4430 = string
type Wire4431 = Wire4432 | Wire4433
type Wire4432 = string
type Wire4433 = 0
type Wire4434 = Wire4435 | Wire4436
type Wire4435 = string
type Wire4436 = 90
type Wire4437 = Wire4438 | Wire4439
type Wire4438 = string
type Wire4439 = 180
type Wire4440 = Wire4441 | Wire4442
type Wire4441 = string
type Wire4442 = 270
type Wire4443 = Wire4444 | Wire4445
type Wire4444 = string
type Wire4445 = 360
type Wire4446 = Wire4447 | Wire4448
type Wire4447 = string
type Wire4448 = false
type Wire4449 = Wire4450 | Wire4451
type Wire4450 = string
type Wire4451 = Wire4452 | Wire4453
type Wire4452 = boolean
type Wire4453 = 'false' | 'true'
type Wire4454 = Wire4455 | Wire4456 | Wire4457
type Wire4455 = string
type Wire4456 = string
type Wire4457 = number
type Wire4458 = Wire4459 | Wire4460
type Wire4459 = string
type Wire4460 = string
type Wire4461 = Wire4462 | Wire4463
type Wire4462 = string
type Wire4463 = string
type Wire4464 = Wire4465 | Wire4466 | Wire4467
type Wire4465 = string
type Wire4466 = string
type Wire4467 = number
type Wire4468 = Wire4469 | Wire4470
type Wire4469 = string
type Wire4470 = string
type Wire4471 = Wire4472 | Wire4473
type Wire4472 = string
type Wire4473 = Wire4474 | Wire4475
type Wire4474 = boolean
type Wire4475 = 'false' | 'true'
type Wire4476 = Wire4477 | Wire4478 | Wire4479
type Wire4477 = string
type Wire4478 = string
type Wire4479 = number
type Wire4480 = Wire4481 | Wire4482 | Wire4483
type Wire4481 = string
type Wire4482 = string
type Wire4483 = number
type Wire4484 = Wire4485 | Wire3292 | Wire4486
type Wire4485 = string
type Wire4486 = Wire4487 | Wire4488
type Wire4487 = string
type Wire4488 = Array<Wire3292>
type Wire4489 = Wire4490 | Wire4491
type Wire4490 = string
type Wire4491 = 'area' | 'fit' | 'stretch'
type Wire4492 = Wire4493 | Wire4494
type Wire4493 = string
type Wire4494 = string
type Wire4495 = Wire4496 | Wire4497 | Wire4498
type Wire4496 = string
type Wire4497 = string
type Wire4498 = number
type Wire4499 = Wire4500 | Wire4501 | Wire4504
type Wire4500 = string
type Wire4501 = Wire4502 | Wire4503
type Wire4502 = string
type Wire4503 = ''
type Wire4504 = Wire4505 | Wire4506
type Wire4505 = string
type Wire4506 = string
type Wire4507 = Wire4508 | Wire4509
type Wire4508 = string
type Wire4509 = Wire4510 | Wire4511
type Wire4510 = boolean
type Wire4511 = 'false' | 'true'
type Wire4512 = {
  aspect_ratio?: Wire4513
  camera_motion?: Wire4516
  duration?: Wire4519
  force_accept?: Wire1376
  format?: Wire4523
  fps?: Wire4526
  height?: Wire4530
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  model?: Wire4534
  motion_amount?: Wire4537
  negative_prompt?: Wire4541
  num_outputs?: Wire4544
  output_meta?: Wire1414
  prompt: Wire4548
  queue?: Wire1425
  reference_strength?: Wire4551
  result?: Wire1432
  robot: Wire4555
  seed?: Wire4556
  style?: Wire4560
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire4563
}
type Wire4513 = Wire4514 | Wire4515
type Wire4514 = string
type Wire4515 = string
type Wire4516 = Wire4517 | Wire4518
type Wire4517 = string
type Wire4518 = string
type Wire4519 = Wire4520 | Wire4521 | Wire4522
type Wire4520 = string
type Wire4521 = string
type Wire4522 = number
type Wire4523 = Wire4524 | Wire4525
type Wire4524 = string
type Wire4525 = 'gif' | 'mp4'
type Wire4526 = Wire4527 | Wire4528 | Wire4529
type Wire4527 = string
type Wire4528 = string
type Wire4529 = number
type Wire4530 = Wire4531 | Wire4532 | Wire4533
type Wire4531 = string
type Wire4532 = string
type Wire4533 = number
type Wire4534 = Wire4535 | Wire4536
type Wire4535 = string
type Wire4536 = string
type Wire4537 = Wire4538 | Wire4539 | Wire4540
type Wire4538 = string
type Wire4539 = string
type Wire4540 = number
type Wire4541 = Wire4542 | Wire4543
type Wire4542 = string
type Wire4543 = string
type Wire4544 = Wire4545 | Wire4546 | Wire4547
type Wire4545 = string
type Wire4546 = string
type Wire4547 = number
type Wire4548 = Wire4549 | Wire4550
type Wire4549 = string
type Wire4550 = string
type Wire4551 = Wire4552 | Wire4553 | Wire4554
type Wire4552 = string
type Wire4553 = string
type Wire4554 = number
type Wire4555 = '/video/generate'
type Wire4556 = Wire4557 | Wire4558 | Wire4559
type Wire4557 = string
type Wire4558 = string
type Wire4559 = number
type Wire4560 = Wire4561 | Wire4562
type Wire4561 = string
type Wire4562 = string
type Wire4563 = Wire4564 | Wire4565 | Wire4566
type Wire4564 = string
type Wire4565 = string
type Wire4566 = number
type Wire4567 = {
  audio_delay?: Wire4568
  background?: Wire4405
  duration?: Wire4572
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  framerate?: Wire4574
  height?: Wire4348
  ignore_errors?: Wire1607
  image_durations?: Wire4583
  image_url?: Wire4586
  interpolate?: Wire1406
  loop?: Wire4589
  output_meta?: Wire1414
  preset?: Wire4360
  queue?: Wire1425
  replace_audio?: Wire4594
  resize_strategy?: Wire4599
  result?: Wire1432
  robot: Wire4602
  sort_by?: Wire1659
  transition?: Wire4603
  transition_duration?: Wire4606
  use?: Wire1620
  user_meta?: Wire1438
  vstack?: Wire4610
  width?: Wire4371
}
type Wire4568 = Wire4569 | Wire4570 | Wire4571
type Wire4569 = string
type Wire4570 = string
type Wire4571 = number
type Wire4572 = Wire1462 | Wire4573
type Wire4573 = null
type Wire4574 = Wire4575 | Wire4576 | Wire4580
type Wire4575 = string
type Wire4576 = Wire4577 | Wire4578 | Wire4579
type Wire4577 = string
type Wire4578 = string
type Wire4579 = number
type Wire4580 = Wire4581 | Wire4582
type Wire4581 = string
type Wire4582 = string
type Wire4583 = Wire4584 | Wire4585
type Wire4584 = string
type Wire4585 = Array<Wire1462>
type Wire4586 = Wire4587 | Wire4588
type Wire4587 = string
type Wire4588 = string
type Wire4589 = Wire4590 | Wire4591
type Wire4590 = string
type Wire4591 = Wire4592 | Wire4593
type Wire4592 = boolean
type Wire4593 = 'false' | 'true'
type Wire4594 = Wire4595 | Wire4596
type Wire4595 = string
type Wire4596 = Wire4597 | Wire4598
type Wire4597 = boolean
type Wire4598 = 'false' | 'true'
type Wire4599 = Wire4600 | Wire4601
type Wire4600 = string
type Wire4601 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4602 = '/video/merge'
type Wire4603 = Wire4604 | Wire4605
type Wire4604 = string
type Wire4605 = 'crossfade' | 'fade_to_black' | 'none'
type Wire4606 = Wire4607 | Wire4608 | Wire4609
type Wire4607 = string
type Wire4608 = string
type Wire4609 = number
type Wire4610 = Wire4611 | Wire4612
type Wire4611 = string
type Wire4612 = Wire4613 | Wire4614
type Wire4613 = boolean
type Wire4614 = 'false' | 'true'
type Wire4615 = {
  asset?: Wire4616
  asset_param_name?: Wire4619
  enabled_variants?: Wire4622
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4627
  segment_duration?: Wire4628
  sign_urls_for?: Wire4632
  use?: Wire1620
  user_meta?: Wire1438
  variants: Wire4636
}
type Wire4616 = Wire4617 | Wire4618
type Wire4617 = string
type Wire4618 = string
type Wire4619 = Wire4620 | Wire4621
type Wire4620 = string
type Wire4621 = string
type Wire4622 = Wire4623 | Wire4624 | Wire1387
type Wire4623 = string
type Wire4624 = Wire4625 | Wire4626
type Wire4625 = string
type Wire4626 = string
type Wire4627 = '/video/ondemand'
type Wire4628 = Wire4629 | Wire4630 | Wire4631
type Wire4629 = string
type Wire4630 = string
type Wire4631 = number
type Wire4632 = Wire4633 | Wire4634 | Wire4635
type Wire4633 = string
type Wire4634 = string
type Wire4635 = number
type Wire4636 = { [key: string]: Wire4637 | undefined }
type Wire4637 = Wire4638 | Wire4639
type Wire4638 = string
type Wire4639 = {
  background?: Wire4405
  chunk_duration?: Wire4408
  crop?: Wire4412
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  height?: Wire4348
  hint?: Wire4640
  preset?: Wire4360
  resize_strategy?: Wire4645
  rotate?: Wire4429
  segment?: Wire4449
  segment_duration?: Wire4454
  segment_name?: Wire4648
  segment_prefix?: Wire4461
  segment_time_delta?: Wire4651
  turbo?: Wire4471
  watermark_duration?: Wire4476
  watermark_opacity?: Wire4655
  watermark_position?: Wire4484
  watermark_resize_strategy?: Wire4489
  watermark_size?: Wire4659
  watermark_start_time?: Wire4662
  watermark_url?: Wire4499
  watermark_x_offset?: Wire3476
  watermark_y_offset?: Wire3480
  width?: Wire4371
  zoom?: Wire4507
}
type Wire4640 = Wire4641 | Wire4642
type Wire4641 = string
type Wire4642 = Wire4643 | Wire4644
type Wire4643 = boolean
type Wire4644 = 'false' | 'true'
type Wire4645 = Wire4646 | Wire4647
type Wire4646 = string
type Wire4647 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4648 = Wire4649 | Wire4650
type Wire4649 = string
type Wire4650 = string
type Wire4651 = Wire4652 | Wire4653 | Wire4654
type Wire4652 = string
type Wire4653 = string
type Wire4654 = number
type Wire4655 = Wire4656 | Wire4657 | Wire4658
type Wire4656 = string
type Wire4657 = string
type Wire4658 = number
type Wire4659 = Wire4660 | Wire4661
type Wire4660 = string
type Wire4661 = string
type Wire4662 = Wire4663 | Wire4664 | Wire4665
type Wire4663 = string
type Wire4664 = string
type Wire4665 = number
type Wire4666 = {
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  height?: Wire4348
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  preset?: Wire4360
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4667
  segments: Wire4668
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire4371
}
type Wire4667 = '/video/split'
type Wire4668 = Wire4669 | Wire4670
type Wire4669 = string
type Wire4670 = Array<Wire1667>
type Wire4671 = {
  bold?: Wire4672
  border_color?: Wire4677
  border_style?: Wire4680
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  font?: Wire4683
  font_color?: Wire4686
  font_size?: Wire4694
  force_accept?: Wire1376
  height?: Wire4348
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  italic?: Wire4698
  keep_subtitles?: Wire4703
  language?: Wire4708
  name?: Wire4715
  outline_width?: Wire4722
  output_meta?: Wire1414
  position?: Wire4730
  preset?: Wire4360
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4733
  subtitles_type?: Wire4734
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire4371
}
type Wire4672 = Wire4673 | Wire4674
type Wire4673 = string
type Wire4674 = Wire4675 | Wire4676
type Wire4675 = boolean
type Wire4676 = 'false' | 'true'
type Wire4677 = Wire4678 | Wire4679
type Wire4678 = string
type Wire4679 = string
type Wire4680 = Wire4681 | Wire4682
type Wire4681 = string
type Wire4682 = 'box' | 'outline' | 'shadow'
type Wire4683 = Wire4684 | Wire4685
type Wire4684 = string
type Wire4685 = string
type Wire4686 = Wire4687 | Wire4688 | Wire4691
type Wire4687 = string
type Wire4688 = Wire4689 | Wire4690
type Wire4689 = string
type Wire4690 = string
type Wire4691 = Wire4692 | Wire4693
type Wire4692 = string
type Wire4693 = string
type Wire4694 = Wire4695 | Wire4696 | Wire4697
type Wire4695 = string
type Wire4696 = string
type Wire4697 = number
type Wire4698 = Wire4699 | Wire4700
type Wire4699 = string
type Wire4700 = Wire4701 | Wire4702
type Wire4701 = boolean
type Wire4702 = 'false' | 'true'
type Wire4703 = Wire4704 | Wire4705
type Wire4704 = string
type Wire4705 = Wire4706 | Wire4707
type Wire4706 = boolean
type Wire4707 = 'false' | 'true'
type Wire4708 = Wire4709 | Wire4714
type Wire4709 = Wire4710 | Wire4711
type Wire4710 = never
type Wire4711 = Wire4712 | Wire4713
type Wire4712 = string
type Wire4713 = string
type Wire4714 = null
type Wire4715 = Wire4716 | Wire4721
type Wire4716 = Wire4717 | Wire4718
type Wire4717 = never
type Wire4718 = Wire4719 | Wire4720
type Wire4719 = string
type Wire4720 = string
type Wire4721 = null
type Wire4722 = Wire4723 | Wire4729
type Wire4723 = Wire4724 | Wire4725
type Wire4724 = never
type Wire4725 = Wire4726 | Wire4727 | Wire4728
type Wire4726 = string
type Wire4727 = string
type Wire4728 = number
type Wire4729 = null
type Wire4730 = Wire4731 | Wire4732
type Wire4731 = string
type Wire4732 =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
type Wire4733 = '/video/subtitle'
type Wire4734 = Wire4735 | Wire4736
type Wire4735 = string
type Wire4736 = 'burn' | 'burned' | 'external'
type Wire4737 = {
  background?: Wire4738
  count?: Wire4741
  ffmpeg?: Wire1459
  ffmpeg_stack?: Wire1599
  force_accept?: Wire1376
  format?: Wire4745
  height?: Wire4748
  ignore_errors?: Wire1607
  input_codec?: Wire4752
  interpolate?: Wire1406
  offsets?: Wire4755
  output_meta?: Wire1414
  queue?: Wire1425
  resize_strategy?: Wire4766
  result?: Wire1432
  robot: Wire4769
  rotate?: Wire4770
  smart?: Wire4787
  smart_max_candidates?: Wire4792
  use?: Wire1620
  user_meta?: Wire1438
  width?: Wire4796
}
type Wire4738 = Wire4739 | Wire4740
type Wire4739 = string
type Wire4740 = string
type Wire4741 = Wire4742 | Wire4743 | Wire4744
type Wire4742 = string
type Wire4743 = string
type Wire4744 = number
type Wire4745 = Wire4746 | Wire4747
type Wire4746 = string
type Wire4747 = 'jpeg' | 'jpg' | 'png'
type Wire4748 = Wire4749 | Wire4750 | Wire4751
type Wire4749 = string
type Wire4750 = string
type Wire4751 = number
type Wire4752 = Wire4753 | Wire4754
type Wire4753 = string
type Wire4754 = string
type Wire4755 = Wire4756 | Wire4757 | Wire4760
type Wire4756 = string
type Wire4757 = Wire4758 | Wire4759
type Wire4758 = string
type Wire4759 = Array<Wire1462>
type Wire4760 = Wire4761 | Wire4762
type Wire4761 = string
type Wire4762 = Array<Wire4763>
type Wire4763 = Wire4764 | Wire4765
type Wire4764 = string
type Wire4765 = string
type Wire4766 = Wire4767 | Wire4768
type Wire4767 = string
type Wire4768 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4769 = '/video/thumbs'
type Wire4770 = Wire4771 | Wire4772 | Wire4775 | Wire4778 | Wire4781 | Wire4784
type Wire4771 = string
type Wire4772 = Wire4773 | Wire4774
type Wire4773 = string
type Wire4774 = 0
type Wire4775 = Wire4776 | Wire4777
type Wire4776 = string
type Wire4777 = 90
type Wire4778 = Wire4779 | Wire4780
type Wire4779 = string
type Wire4780 = 180
type Wire4781 = Wire4782 | Wire4783
type Wire4782 = string
type Wire4783 = 270
type Wire4784 = Wire4785 | Wire4786
type Wire4785 = string
type Wire4786 = 360
type Wire4787 = Wire4788 | Wire4789
type Wire4788 = string
type Wire4789 = Wire4790 | Wire4791
type Wire4790 = boolean
type Wire4791 = 'false' | 'true'
type Wire4792 = Wire4793 | Wire4794 | Wire4795
type Wire4793 = string
type Wire4794 = string
type Wire4795 = number
type Wire4796 = Wire4797 | Wire4798 | Wire4799
type Wire4797 = string
type Wire4798 = string
type Wire4799 = number
type Wire4800 = {
  credentials?: Wire4801
  files_per_page?: Wire4804
  force_accept?: Wire1376
  force_name?: Wire1381
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  output_meta?: Wire1414
  page_number?: Wire4808
  path?: Wire4812
  queue?: Wire1425
  rendition?: Wire4817
  result?: Wire1432
  robot: Wire4820
  user_meta?: Wire1438
}
type Wire4801 = Wire4802 | Wire4803
type Wire4802 = string
type Wire4803 = string
type Wire4804 = Wire4805 | Wire4806 | Wire4807
type Wire4805 = string
type Wire4806 = string
type Wire4807 = number
type Wire4808 = Wire4809 | Wire4810 | Wire4811
type Wire4809 = string
type Wire4810 = string
type Wire4811 = number
type Wire4812 = Wire4813 | Wire4814 | Wire1387
type Wire4813 = string
type Wire4814 = Wire4815 | Wire4816
type Wire4815 = string
type Wire4816 = string
type Wire4817 = Wire4818 | Wire4819
type Wire4818 = string
type Wire4819 = '1080p' | '240p' | '360p' | '540p' | '720p' | 'source'
type Wire4820 = '/vimeo/import'
type Wire4821 = {
  acl?: Wire4822
  credentials?: Wire4801
  description: Wire4825
  downloadable?: Wire4828
  folder_id?: Wire4833
  folder_uri?: Wire4838
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  output_meta?: Wire1414
  password?: Wire4841
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4844
  showcases?: Wire4845
  title: Wire4851
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4822 = Wire4823 | Wire4824
type Wire4823 = string
type Wire4824 = 'anybody' | 'contacts' | 'disable' | 'nobody' | 'password' | 'unlisted' | 'users'
type Wire4825 = Wire4826 | Wire4827
type Wire4826 = string
type Wire4827 = string
type Wire4828 = Wire4829 | Wire4830
type Wire4829 = string
type Wire4830 = Wire4831 | Wire4832
type Wire4831 = boolean
type Wire4832 = 'false' | 'true'
type Wire4833 = Wire4834 | Wire4837
type Wire4834 = Wire4835 | Wire4836
type Wire4835 = string
type Wire4836 = string
type Wire4837 = null
type Wire4838 = Wire4839 | Wire4840
type Wire4839 = string
type Wire4840 = string
type Wire4841 = Wire4842 | Wire4843
type Wire4842 = string
type Wire4843 = string
type Wire4844 = '/vimeo/store'
type Wire4845 = Wire4846 | Wire4847
type Wire4846 = string
type Wire4847 = Array<Wire4848>
type Wire4848 = Wire4849 | Wire4850
type Wire4849 = string
type Wire4850 = string
type Wire4851 = Wire4852 | Wire4853
type Wire4852 = string
type Wire4853 = string
type Wire4854 = {
  bucket?: Wire4855
  bucket_region?: Wire4858
  credentials?: Wire4861
  files_per_page?: Wire1922
  force_accept?: Wire1376
  force_name?: Wire1381
  host?: Wire4864
  ignore_errors?: Wire1394
  import_on_errors?: Wire1400
  interpolate?: Wire1406
  key?: Wire4867
  output_meta?: Wire1414
  page_number?: Wire1988
  path: Wire1992
  queue?: Wire1425
  recursive?: Wire1997
  result?: Wire1649
  return_file_stubs?: Wire2002
  robot: Wire4870
  secret?: Wire4871
  user_meta?: Wire1438
}
type Wire4855 = Wire4856 | Wire4857
type Wire4856 = string
type Wire4857 = string
type Wire4858 = Wire4859 | Wire4860
type Wire4859 = string
type Wire4860 = string
type Wire4861 = Wire4862 | Wire4863
type Wire4862 = string
type Wire4863 = string
type Wire4864 = Wire4865 | Wire4866
type Wire4865 = string
type Wire4866 = string
type Wire4867 = Wire4868 | Wire4869
type Wire4868 = string
type Wire4869 = string
type Wire4870 = '/wasabi/import'
type Wire4871 = Wire4872 | Wire4873
type Wire4872 = string
type Wire4873 = string
type Wire4874 = {
  acl?: Wire4875
  bucket?: Wire4878
  bucket_region?: Wire4881
  credentials?: Wire4861
  force_accept?: Wire1376
  headers?: Wire4884
  host?: Wire4888
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  key?: Wire4891
  output_meta?: Wire1414
  path?: Wire2031
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4894
  secret?: Wire4895
  sign_urls_for?: Wire2038
  use?: Wire1620
  user_meta?: Wire1438
}
type Wire4875 = Wire4876 | Wire4877
type Wire4876 = string
type Wire4877 = 'private' | 'public-read'
type Wire4878 = Wire4879 | Wire4880
type Wire4879 = string
type Wire4880 = string
type Wire4881 = Wire4882 | Wire4883
type Wire4882 = string
type Wire4883 = string
type Wire4884 = { [key: string]: Wire4885 | undefined }
type Wire4885 = Wire4886 | Wire4887
type Wire4886 = string
type Wire4887 = string
type Wire4888 = Wire4889 | Wire4890
type Wire4889 = string
type Wire4890 = string
type Wire4891 = Wire4892 | Wire4893
type Wire4892 = string
type Wire4893 = string
type Wire4894 = '/wasabi/store'
type Wire4895 = Wire4896 | Wire4897
type Wire4896 = string
type Wire4897 = string
type Wire4898 = {
  category: Wire4899
  credentials: Wire4902
  description: Wire4905
  force_accept?: Wire1376
  ignore_errors?: Wire1607
  interpolate?: Wire1406
  keywords: Wire4908
  output_meta?: Wire1414
  queue?: Wire1425
  result?: Wire1432
  robot: Wire4911
  title: Wire4912
  use?: Wire1620
  user_meta?: Wire1438
  visibility: Wire4915
}
type Wire4899 = Wire4900 | Wire4901
type Wire4900 = string
type Wire4901 = string
type Wire4902 = Wire4903 | Wire4904
type Wire4903 = string
type Wire4904 = string
type Wire4905 = Wire4906 | Wire4907
type Wire4906 = string
type Wire4907 = string
type Wire4908 = Wire4909 | Wire4910
type Wire4909 = string
type Wire4910 = string
type Wire4911 = '/youtube/store'
type Wire4912 = Wire4913 | Wire4914
type Wire4913 = string
type Wire4914 = string
type Wire4915 = Wire4916 | Wire4917
type Wire4916 = string
type Wire4917 = 'private' | 'public' | 'unlisted'
type Wire4918 = string
type Wire4919 = string
type Wire4920 = Wire93 | Wire4921
type Wire4921 = Wire4922 | Wire4926
type Wire4922 = {
  error: Wire4923
  http_code?: Wire4924
  message?: Wire4925
  [key: string]: JsonValue | Wire4923 | Wire4924 | Wire4925 | undefined
}
type Wire4923 = 'INVALID_PARAMS_FIELD'
type Wire4924 = 400
type Wire4925 = string
type Wire4926 = Wire67
type Wire4927 = {
  auth_key?: Wire4928
  can_show_auth_secret?: Wire4929
  description?: Wire4933
  is_allowed_for_smartcdn?: Wire4934
  nonce?: Wire4938
  scope: Wire4941
  signature_algo?: Wire4942
}
type Wire4928 = string
type Wire4929 = Wire4930 | Wire4931 | Wire4932
type Wire4930 = boolean
type Wire4931 = 0
type Wire4932 = 1
type Wire4933 = string
type Wire4934 = Wire4935 | Wire4936 | Wire4937
type Wire4935 = boolean
type Wire4936 = 0
type Wire4937 = 1
type Wire4938 = Wire4939 | Wire4940
type Wire4939 = string
type Wire4940 = number
type Wire4941 = string
type Wire4942 = Wire4943 | Wire4944
type Wire4943 = 'sha1' | 'sha256' | 'sha384'
type Wire4944 = null
type Wire4945 = {
  auth_key: Wire4946
  message: Wire4964
  ok: Wire4965
  [key: string]: JsonValue | Wire4946 | Wire4964 | Wire4965 | undefined
}
type Wire4946 = {
  auth_key: Wire4947
  auth_secret: Wire4948
  can_show_auth_secret: Wire4949
  created: Wire4950
  description: Wire4952
  id: Wire4953
  is_active: Wire4954
  is_allowed_for_smartcdn: Wire4955
  last_used: Wire4956
  modified: Wire4958
  scope: Wire4960
  signature_algo: Wire4963
}
type Wire4947 = string
type Wire4948 = string
type Wire4949 = boolean
type Wire4950 = Wire160 | Wire4951
type Wire4951 = null
type Wire4952 = string
type Wire4953 = string
type Wire4954 = boolean
type Wire4955 = boolean
type Wire4956 = Wire160 | Wire4957
type Wire4957 = null
type Wire4958 = Wire160 | Wire4959
type Wire4959 = null
type Wire4960 = Wire4961 | Wire4962
type Wire4961 = string
type Wire4962 = null
type Wire4963 = null | string
type Wire4964 = string
type Wire4965 = 'AUTH_KEY_CREATED'
type Wire4966 = Wire93 | Wire4967
type Wire4967 = Wire4968 | Wire4972
type Wire4968 = {
  error: Wire4969
  http_code?: Wire4970
  message?: Wire4971
  [key: string]: JsonValue | Wire4969 | Wire4970 | Wire4971 | undefined
}
type Wire4969 = 'AUTH_KEY_NOT_CREATED'
type Wire4970 = 400
type Wire4971 = string
type Wire4972 = Wire67
type Wire4973 = {
  assembly_status_expiry?: Wire4974
  name: Wire4975
  nonce?: Wire4976
  require_signature_auth?: Wire4979
  template: Wire4980
  transcoding_result_expiry?: Wire5016
}
type Wire4974 = '1day' | '30days' | '7days' | '90days' | 'NoSave'
type Wire4975 = string
type Wire4976 = Wire4977 | Wire4978
type Wire4977 = string
type Wire4978 = number
type Wire4979 = 0 | 1
type Wire4980 = Wire4981 | Wire5015
type Wire4981 = {
  allow_steps_override?: Wire4982
  auth?: Wire4983
  emit_execution_progress?: Wire4989
  exiftool_stack?: Wire4990
  ffmpeg_stack?: Wire4991
  fields?: Wire4992
  imagemagick_stack?: Wire4994
  mediainfo_stack?: Wire4995
  mplayer_stack?: Wire4996
  notification_payload?: Wire4997
  notify_url?: Wire4999
  quiet?: Wire5000
  redirect_url?: Wire5001
  response_headers?: Wire5002
  steps?: Wire5012
  template_id?: Wire5013
  usage_tags?: Wire5014
}
type Wire4982 = boolean
type Wire4983 = {
  expires?: Wire4984
  key?: Wire4985
  max_number_of_files?: Wire4986
  max_size?: Wire4987
  referer?: Wire4988
}
type Wire4984 = string
type Wire4985 = string
type Wire4986 = number
type Wire4987 = number
type Wire4988 = string
type Wire4989 = boolean
type Wire4990 = string
type Wire4991 = string
type Wire4992 = { [key: string]: Wire4993 | undefined }
type Wire4993 = JsonValue
type Wire4994 = string
type Wire4995 = string
type Wire4996 = string
type Wire4997 = Array<Wire4998>
type Wire4998 =
  | 'without_params'
  | 'without_result_meta_data'
  | 'without_results'
  | 'without_upload_meta_data'
  | 'without_uploads'
type Wire4999 = null | string
type Wire5000 = boolean
type Wire5001 = string
type Wire5002 = { cors?: Wire5003; [key: string]: JsonValue | Wire5003 | undefined }
type Wire5003 = {
  'Access-Control-Allow-Credentials'?: Wire5004
  'Access-Control-Allow-Headers'?: Wire5005
  'Access-Control-Allow-Methods'?: Wire5006
  'Access-Control-Allow-Origin'?: Wire5007
  'Access-Control-Allow-Private-Network'?: Wire5008
  'Access-Control-Allow-Public-Network'?: Wire5009
  'Access-Control-Expose-Headers'?: Wire5010
  'Access-Control-Max-Age'?: Wire5011
  [key: string]:
    | JsonValue
    | Wire5004
    | Wire5005
    | Wire5006
    | Wire5007
    | Wire5008
    | Wire5009
    | Wire5010
    | Wire5011
    | undefined
}
type Wire5004 = boolean
type Wire5005 = string
type Wire5006 = string
type Wire5007 = string
type Wire5008 = boolean
type Wire5009 = boolean
type Wire5010 = string
type Wire5011 = number
type Wire5012 = Wire1372
type Wire5013 = string
type Wire5014 = string
type Wire5015 = string
type Wire5016 = '1day' | 'NoSave'
type Wire5017 = {
  assembly_status_expiry: Wire5018
  content: Wire5019
  id: Wire5028
  message: Wire5031
  name: Wire5032
  ok: Wire5033
  require_signature_auth: Wire5034
  transcoding_result_expiry: Wire5035
}
type Wire5018 = null | string
type Wire5019 = Wire5020 | Wire5022 | Wire5024 | Wire5025 | Wire5026 | Wire5027
type Wire5020 = { [key: string]: Wire5021 | undefined }
type Wire5021 = JsonValue
type Wire5022 = Array<Wire5023>
type Wire5023 = JsonValue
type Wire5024 = string
type Wire5025 = number
type Wire5026 = boolean
type Wire5027 = null
type Wire5028 = Wire5029 | Wire5030
type Wire5029 = string
type Wire5030 = string
type Wire5031 = string
type Wire5032 = string
type Wire5033 = 'TEMPLATE_CREATED'
type Wire5034 = 0 | 1
type Wire5035 = null | string
type Wire5036 = Wire93 | Wire5037
type Wire5037 = Wire5038 | Wire5042
type Wire5038 = {
  error: Wire5039
  http_code?: Wire5040
  message?: Wire5041
  [key: string]: JsonValue | Wire5039 | Wire5040 | Wire5041 | undefined
}
type Wire5039 = 'TEMPLATE_VALIDATION_ERROR'
type Wire5040 = 400
type Wire5041 = string
type Wire5042 = Wire67
type Wire5043 = { content: Wire5044; name: Wire5048; nonce?: Wire5049; type: Wire5052 }
type Wire5044 = Wire5045 | Wire5047
type Wire5045 = { [key: string]: Wire5046 | undefined }
type Wire5046 = JsonValue
type Wire5047 = string
type Wire5048 = string
type Wire5049 = Wire5050 | Wire5051
type Wire5050 = string
type Wire5051 = number
type Wire5052 =
  | 'ai'
  | 'azure'
  | 'backblaze'
  | 'box'
  | 'cloudflare'
  | 'companion'
  | 'digitalocean'
  | 'dropbox'
  | 'ftp'
  | 'google'
  | 'http'
  | 'mega'
  | 'minio'
  | 'rackspace'
  | 's3'
  | 'sftp'
  | 'supabase'
  | 'swift'
  | 'tigris'
  | 'vimeo'
  | 'wasabi'
  | 'youtube'
type Wire5053 = {
  credential: Wire5054
  message: Wire5084
  ok: Wire5085
  [key: string]: JsonValue | Wire5054 | Wire5084 | Wire5085 | undefined
}
type Wire5054 = {
  account_id: Wire5055
  content: Wire5056
  created: Wire5065
  deleted: Wire5070
  id: Wire5075
  modified: Wire5076
  name: Wire5081
  stringified: Wire5082
  type: Wire5083
}
type Wire5055 = string
type Wire5056 = Wire5057 | Wire5059 | Wire5061 | Wire5062 | Wire5063 | Wire5064
type Wire5057 = { [key: string]: Wire5058 | undefined }
type Wire5058 = JsonValue
type Wire5059 = Array<Wire5060>
type Wire5060 = JsonValue
type Wire5061 = string
type Wire5062 = number
type Wire5063 = boolean
type Wire5064 = null
type Wire5065 = Wire5066 | Wire5069
type Wire5066 = Wire5067 | Wire5068
type Wire5067 = number
type Wire5068 = string
type Wire5069 = null
type Wire5070 = Wire5071 | Wire5074
type Wire5071 = Wire5072 | Wire5073
type Wire5072 = number
type Wire5073 = string
type Wire5074 = null
type Wire5075 = string
type Wire5076 = Wire5077 | Wire5080
type Wire5077 = Wire5078 | Wire5079
type Wire5078 = number
type Wire5079 = string
type Wire5080 = null
type Wire5081 = string
type Wire5082 = string
type Wire5083 = string
type Wire5084 = string
type Wire5085 = 'TEMPLATE_CREDENTIALS_CREATED'
type Wire5086 = Wire93 | Wire5087
type Wire5087 = Wire5088 | Wire5092
type Wire5088 = {
  error: Wire5089
  http_code?: Wire5090
  message?: Wire5091
  [key: string]: JsonValue | Wire5089 | Wire5090 | Wire5091 | undefined
}
type Wire5089 = 'TEMPLATE_CREDENTIALS_NOT_CREATED'
type Wire5090 = 400
type Wire5091 = string
type Wire5092 = Wire67
type Wire5093 = { nonce?: Wire5094 }
type Wire5094 = Wire5095 | Wire5096
type Wire5095 = string
type Wire5096 = number
type Wire5097 = {
  message: Wire5098
  ok: Wire5099
  [key: string]: JsonValue | Wire5098 | Wire5099 | undefined
}
type Wire5098 = string
type Wire5099 = 'AUTH_KEY_DELETED'
type Wire5100 = Wire93 | Wire5101
type Wire5101 = Wire5102 | Wire5106
type Wire5102 = {
  error: Wire5103
  http_code?: Wire5104
  message?: Wire5105
  [key: string]: JsonValue | Wire5103 | Wire5104 | Wire5105 | undefined
}
type Wire5103 = 'AUTH_KEY_NOT_DELETED'
type Wire5104 = 400
type Wire5105 = string
type Wire5106 = Wire67
type Wire5107 = { nonce?: Wire5108 }
type Wire5108 = Wire5109 | Wire5110
type Wire5109 = string
type Wire5110 = number
type Wire5111 = { asset_id: Wire5112; deleted_at: Wire5113; message: Wire5115; ok: Wire5116 }
type Wire5112 = string
type Wire5113 = string & Wire5114
type Wire5114 = JsonValue
type Wire5115 = string
type Wire5116 = 'DAM_ASSET_DELETED'
type Wire5117 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire5118 = { nonce?: Wire5119 }
type Wire5119 = Wire5120 | Wire5121
type Wire5120 = string
type Wire5121 = number
type Wire5122 = { message: Wire5123; ok: Wire5124 }
type Wire5123 = string
type Wire5124 = 'TEMPLATE_DELETED'
type Wire5125 = { nonce?: Wire5126 }
type Wire5126 = Wire5127 | Wire5128
type Wire5127 = string
type Wire5128 = number
type Wire5129 = {
  message: Wire5130
  ok: Wire5131
  [key: string]: JsonValue | Wire5130 | Wire5131 | undefined
}
type Wire5130 = string
type Wire5131 = 'TEMPLATE_CREDENTIALS_DELETED'
type Wire5132 = Wire93 | Wire5133
type Wire5133 = Wire5134 | Wire5138
type Wire5134 = {
  error: Wire5135
  http_code?: Wire5136
  message?: Wire5137
  [key: string]: JsonValue | Wire5135 | Wire5136 | Wire5137 | undefined
}
type Wire5135 = 'TEMPLATE_CREDENTIALS_NOT_DELETED'
type Wire5136 = 400
type Wire5137 = string
type Wire5138 = Wire67
type Wire5139 = { nonce?: Wire5140 }
type Wire5140 = Wire5141 | Wire5142
type Wire5141 = string
type Wire5142 = number
type Wire5143 = Wire5144 | Wire5239 | Wire5319
type Wire5144 = {
  additional_gb?: Wire5145
  additional_gb_fee?: Wire5146
  address_1?: Wire5147
  address_2?: Wire5148
  bill_limit?: Wire5149
  city?: Wire5150
  company?: Wire5151
  country?: Wire5152
  country_id?: Wire5153
  coupon_discount?: Wire5154
  coupon_discount_percent?: Wire5159
  created: Wire5164
  credit: Wire5167
  currency?: Wire5172
  email?: Wire5173
  final_sub_total?: Wire5174
  invoice_id: Wire5175
  is_prorated: Wire5176
  month: Wire5177
  ok: Wire5178
  plan: Wire5179
  po_number?: Wire5203
  reverse_charge_vat?: Wire5204
  reward_discount?: Wire5205
  reward_discount_percent?: Wire5210
  robots: Wire5215
  signup_discount?: Wire5218
  signup_discount_percent?: Wire5223
  state?: Wire5228
  sub_total: Wire5229
  tiers?: Wire5230
  to?: Wire5231
  to_contact_email_address?: Wire5232
  total: Wire5233
  used_gb?: Wire5234
  vat?: Wire5235
  vat_id?: Wire5236
  vat_rate?: Wire5237
  zip?: Wire5238
}
type Wire5145 = number
type Wire5146 = number
type Wire5147 = null | string
type Wire5148 = null | string
type Wire5149 = number
type Wire5150 = null | string
type Wire5151 = null | string
type Wire5152 = null | string
type Wire5153 = null | string
type Wire5154 = Wire5155 | Wire5158
type Wire5155 = Wire5156 | Wire5157
type Wire5156 = number
type Wire5157 = string
type Wire5158 = null
type Wire5159 = Wire5160 | Wire5163
type Wire5160 = Wire5161 | Wire5162
type Wire5161 = number
type Wire5162 = string
type Wire5163 = null
type Wire5164 = Wire5165 | Wire5166
type Wire5165 = string
type Wire5166 = null
type Wire5167 = Wire5168 | Wire5171
type Wire5168 = Wire5169 | Wire5170
type Wire5169 = number
type Wire5170 = string
type Wire5171 = null
type Wire5172 = null | string
type Wire5173 = null | string
type Wire5174 = number
type Wire5175 = null
type Wire5176 = boolean
type Wire5177 = string
type Wire5178 = 'BILL_FOUND'
type Wire5179 = {
  gb_included: Wire5180
  gb_limit: Wire5183
  has_lifetime_limit: Wire5188
  id: Wire5196
  price_per_gb: Wire5197
  price_per_month: Wire5200
  [key: string]:
    JsonValue | Wire5180 | Wire5183 | Wire5188 | Wire5196 | Wire5197 | Wire5200 | undefined
}
type Wire5180 = Wire5181 | Wire5182
type Wire5181 = number
type Wire5182 = string
type Wire5183 = Wire5184 | Wire5187
type Wire5184 = Wire5185 | Wire5186
type Wire5185 = number
type Wire5186 = string
type Wire5187 = null
type Wire5188 = Wire5189 | Wire5195
type Wire5189 = Wire5190 | Wire5191 | Wire5192 | Wire5193 | Wire5194
type Wire5190 = boolean
type Wire5191 = 0
type Wire5192 = 1
type Wire5193 = '0'
type Wire5194 = '1'
type Wire5195 = null
type Wire5196 = null | string
type Wire5197 = Wire5198 | Wire5199
type Wire5198 = number
type Wire5199 = string
type Wire5200 = Wire5201 | Wire5202
type Wire5201 = number
type Wire5202 = string
type Wire5203 = null | string
type Wire5204 = boolean
type Wire5205 = Wire5206 | Wire5209
type Wire5206 = Wire5207 | Wire5208
type Wire5207 = number
type Wire5208 = string
type Wire5209 = null
type Wire5210 = Wire5211 | Wire5214
type Wire5211 = Wire5212 | Wire5213
type Wire5212 = number
type Wire5213 = string
type Wire5214 = null
type Wire5215 = { [key: string]: Wire5216 | undefined }
type Wire5216 = { gb: Wire5217; [key: string]: JsonValue | Wire5217 | undefined }
type Wire5217 = number
type Wire5218 = Wire5219 | Wire5222
type Wire5219 = Wire5220 | Wire5221
type Wire5220 = number
type Wire5221 = string
type Wire5222 = null
type Wire5223 = Wire5224 | Wire5227
type Wire5224 = Wire5225 | Wire5226
type Wire5225 = number
type Wire5226 = string
type Wire5227 = null
type Wire5228 = null | string
type Wire5229 = number
type Wire5230 = JsonValue
type Wire5231 = null | string
type Wire5232 = null | string
type Wire5233 = number
type Wire5234 = number
type Wire5235 = number
type Wire5236 = null | string
type Wire5237 = number
type Wire5238 = null | string
type Wire5239 = {
  additional_gb?: Wire5240
  additional_gb_fee?: Wire5241
  address_1?: Wire5242
  address_2?: Wire5243
  bill_limit?: Wire5244
  city?: Wire5245
  company?: Wire5246
  country?: Wire5247
  country_id?: Wire5248
  coupon_discount?: Wire5249
  coupon_discount_percent?: Wire5254
  created: Wire5259
  credit: Wire5262
  currency?: Wire5267
  custom_expenses?: Wire5268
  email?: Wire5269
  final_sub_total?: Wire5270
  invoice_id: Wire5271
  is_prorated: Wire5274
  month: Wire5275
  ok: Wire5276
  plan: Wire5179
  po_number?: Wire5277
  reverse_charge_vat?: Wire5278
  reward_discount?: Wire5279
  reward_discount_percent?: Wire5284
  robots: Wire5289
  signup_discount?: Wire5298
  signup_discount_percent?: Wire5303
  state?: Wire5308
  sub_total: Wire5309
  tiers?: Wire5310
  to?: Wire5311
  to_contact_email_address?: Wire5312
  total: Wire5313
  used_gb?: Wire5314
  vat?: Wire5315
  vat_id?: Wire5316
  vat_rate?: Wire5317
  zip?: Wire5318
}
type Wire5240 = number
type Wire5241 = number
type Wire5242 = null | string
type Wire5243 = null | string
type Wire5244 = number
type Wire5245 = null | string
type Wire5246 = null | string
type Wire5247 = null | string
type Wire5248 = null | string
type Wire5249 = Wire5250 | Wire5253
type Wire5250 = Wire5251 | Wire5252
type Wire5251 = number
type Wire5252 = string
type Wire5253 = null
type Wire5254 = Wire5255 | Wire5258
type Wire5255 = Wire5256 | Wire5257
type Wire5256 = number
type Wire5257 = string
type Wire5258 = null
type Wire5259 = Wire5260 | Wire5261
type Wire5260 = string
type Wire5261 = null
type Wire5262 = Wire5263 | Wire5266
type Wire5263 = Wire5264 | Wire5265
type Wire5264 = number
type Wire5265 = string
type Wire5266 = null
type Wire5267 = null | string
type Wire5268 = JsonValue
type Wire5269 = null | string
type Wire5270 = number
type Wire5271 = Wire5272 | Wire5273
type Wire5272 = string
type Wire5273 = number
type Wire5274 = boolean
type Wire5275 = string
type Wire5276 = 'BILL_FOUND'
type Wire5277 = null | string
type Wire5278 = boolean
type Wire5279 = Wire5280 | Wire5283
type Wire5280 = Wire5281 | Wire5282
type Wire5281 = number
type Wire5282 = string
type Wire5283 = null
type Wire5284 = Wire5285 | Wire5288
type Wire5285 = Wire5286 | Wire5287
type Wire5286 = number
type Wire5287 = string
type Wire5288 = null
type Wire5289 = Wire5290 | Wire5291 | Wire5292 | Wire5293 | Wire5294 | Wire5296
type Wire5290 = string
type Wire5291 = number
type Wire5292 = boolean
type Wire5293 = null
type Wire5294 = Array<Wire5295>
type Wire5295 = JsonValue
type Wire5296 = { [key: string]: Wire5297 | undefined }
type Wire5297 = JsonValue
type Wire5298 = Wire5299 | Wire5302
type Wire5299 = Wire5300 | Wire5301
type Wire5300 = number
type Wire5301 = string
type Wire5302 = null
type Wire5303 = Wire5304 | Wire5307
type Wire5304 = Wire5305 | Wire5306
type Wire5305 = number
type Wire5306 = string
type Wire5307 = null
type Wire5308 = null | string
type Wire5309 = number
type Wire5310 = JsonValue
type Wire5311 = null | string
type Wire5312 = null | string
type Wire5313 = number
type Wire5314 = number
type Wire5315 = number
type Wire5316 = null | string
type Wire5317 = number
type Wire5318 = null | string
type Wire5319 = { error: Wire5320; http_code: Wire5321; message: Wire5322; reason: Wire5323 }
type Wire5320 = 'BILL_NOT_FOUND'
type Wire5321 = 200
type Wire5322 = string
type Wire5323 = string
type Wire5324 = Wire93 | Wire5325
type Wire5325 = Wire5326 | Wire5330
type Wire5326 = {
  error: Wire5327
  http_code?: Wire5328
  message?: Wire5329
  [key: string]: JsonValue | Wire5327 | Wire5328 | Wire5329 | undefined
}
type Wire5327 = 'SIGNATURE_REUSE_DETECTED'
type Wire5328 = 400
type Wire5329 = string
type Wire5330 = Wire67
type Wire5331 = { nonce?: Wire5332; version_id?: Wire5335 }
type Wire5332 = Wire5333 | Wire5334
type Wire5333 = string
type Wire5334 = number
type Wire5335 = string
type Wire5336 = { asset: Wire5337; message: Wire5350; ok: Wire5351 }
type Wire5337 = {
  asset_id: Wire5338
  has_alpha?: Wire5339
  height?: Wire5340
  md5hash?: Wire5341
  mime: Wire5342
  path: Wire5343
  sha256?: Wire5344
  size: Wire5345
  thumbhash?: Wire5346
  version_id: Wire5347
  width?: Wire5348
  workspace: Wire5349
  [key: string]:
    | JsonValue
    | Wire5338
    | Wire5339
    | Wire5340
    | Wire5341
    | Wire5342
    | Wire5343
    | Wire5344
    | Wire5345
    | Wire5346
    | Wire5347
    | Wire5348
    | Wire5349
    | undefined
}
type Wire5338 = string
type Wire5339 = boolean
type Wire5340 = number
type Wire5341 = string
type Wire5342 = null | string
type Wire5343 = string
type Wire5344 = string
type Wire5345 = number
type Wire5346 = string
type Wire5347 = string
type Wire5348 = number
type Wire5349 = string
type Wire5350 = string
type Wire5351 = 'DAM_ASSET_FOUND'
type Wire5352 = { nonce?: Wire5353 }
type Wire5353 = Wire5354 | Wire5355
type Wire5354 = string
type Wire5355 = number
type Wire5356 = {
  assembly_status_expiry: Wire5357
  content: Wire5358
  id: Wire5367
  message: Wire5370
  name: Wire5371
  ok: Wire5372
  require_signature_auth: Wire5373
  transcoding_result_expiry: Wire5374
}
type Wire5357 = null | string
type Wire5358 = Wire5359 | Wire5361 | Wire5363 | Wire5364 | Wire5365 | Wire5366
type Wire5359 = { [key: string]: Wire5360 | undefined }
type Wire5360 = JsonValue
type Wire5361 = Array<Wire5362>
type Wire5362 = JsonValue
type Wire5363 = string
type Wire5364 = number
type Wire5365 = boolean
type Wire5366 = null
type Wire5367 = Wire5368 | Wire5369
type Wire5368 = string
type Wire5369 = string
type Wire5370 = string
type Wire5371 = string
type Wire5372 = 'TEMPLATE_FOUND'
type Wire5373 = 0 | 1
type Wire5374 = null | string
type Wire5375 = Wire93 | Wire5325
type Wire5376 = { nonce?: Wire5377 }
type Wire5377 = Wire5378 | Wire5379
type Wire5378 = string
type Wire5379 = number
type Wire5380 = {
  credential: Wire5381
  message: Wire5411
  ok: Wire5412
  [key: string]: JsonValue | Wire5381 | Wire5411 | Wire5412 | undefined
}
type Wire5381 = {
  account_id: Wire5382
  content: Wire5383
  created: Wire5392
  deleted: Wire5397
  id: Wire5402
  modified: Wire5403
  name: Wire5408
  stringified: Wire5409
  type: Wire5410
}
type Wire5382 = string
type Wire5383 = Wire5384 | Wire5386 | Wire5388 | Wire5389 | Wire5390 | Wire5391
type Wire5384 = { [key: string]: Wire5385 | undefined }
type Wire5385 = JsonValue
type Wire5386 = Array<Wire5387>
type Wire5387 = JsonValue
type Wire5388 = string
type Wire5389 = number
type Wire5390 = boolean
type Wire5391 = null
type Wire5392 = Wire5393 | Wire5396
type Wire5393 = Wire5394 | Wire5395
type Wire5394 = number
type Wire5395 = string
type Wire5396 = null
type Wire5397 = Wire5398 | Wire5401
type Wire5398 = Wire5399 | Wire5400
type Wire5399 = number
type Wire5400 = string
type Wire5401 = null
type Wire5402 = string
type Wire5403 = Wire5404 | Wire5407
type Wire5404 = Wire5405 | Wire5406
type Wire5405 = number
type Wire5406 = string
type Wire5407 = null
type Wire5408 = string
type Wire5409 = string
type Wire5410 = string
type Wire5411 = string
type Wire5412 = 'TEMPLATE_CREDENTIALS_READ'
type Wire5413 = Wire93 | Wire5414
type Wire5414 = Wire5415 | Wire5419
type Wire5415 = {
  error: Wire5416
  http_code?: Wire5417
  message?: Wire5418
  [key: string]: JsonValue | Wire5416 | Wire5417 | Wire5418 | undefined
}
type Wire5416 = 'TEMPLATE_CREDENTIALS_NOT_READ'
type Wire5417 = 400
type Wire5418 = string
type Wire5419 = Wire67
type Wire5420 = {
  aud?: Wire5421
  grant_type: Wire5422
  scope?: Wire5423
  [key: string]: JsonValue | Wire5421 | Wire5422 | Wire5423 | undefined
}
type Wire5421 = string
type Wire5422 = 'client_credentials'
type Wire5423 = string
type Wire5424 = {
  access_token: Wire5425
  expires_in: Wire5426
  scope: Wire5427
  token_type: Wire5428
}
type Wire5425 = string
type Wire5426 = number
type Wire5427 = string
type Wire5428 = 'Bearer'
type Wire5429 = Wire5430 | Wire5443 | Wire5452 | Wire5461 | Wire5465
type Wire5430 = Wire5431 | Wire5435 | Wire5439
type Wire5431 = {
  error: Wire5432
  http_code?: Wire5433
  message?: Wire5434
  [key: string]: JsonValue | Wire5432 | Wire5433 | Wire5434 | undefined
}
type Wire5432 = 'GET_ACCOUNT_UNKNOWN_AUTH_KEY'
type Wire5433 = 400
type Wire5434 = string
type Wire5435 = {
  error: Wire5436
  http_code?: Wire5437
  message?: Wire5438
  [key: string]: JsonValue | Wire5436 | Wire5437 | Wire5438 | undefined
}
type Wire5436 = 'TOKEN_INVALID_GRANT_TYPE'
type Wire5437 = 400
type Wire5438 = string
type Wire5439 = {
  error: Wire5440
  http_code?: Wire5441
  message?: Wire5442
  [key: string]: JsonValue | Wire5440 | Wire5441 | Wire5442 | undefined
}
type Wire5440 = 'TOKEN_INVALID_REQUEST'
type Wire5441 = 400
type Wire5442 = string
type Wire5443 = Wire5444 | Wire5448
type Wire5444 = {
  error: Wire5445
  http_code?: Wire5446
  message?: Wire5447
  [key: string]: JsonValue | Wire5445 | Wire5446 | Wire5447 | undefined
}
type Wire5445 = 'SERVER_401'
type Wire5446 = 401
type Wire5447 = string
type Wire5448 = {
  error: Wire5449
  http_code?: Wire5450
  message?: Wire5451
  [key: string]: JsonValue | Wire5449 | Wire5450 | Wire5451 | undefined
}
type Wire5449 = 'TOKEN_INVALID_CREDENTIALS'
type Wire5450 = 401
type Wire5451 = string
type Wire5452 = Wire5453 | Wire5457
type Wire5453 = {
  error: Wire5454
  http_code?: Wire5455
  message?: Wire5456
  [key: string]: JsonValue | Wire5454 | Wire5455 | Wire5456 | undefined
}
type Wire5454 = 'TOKEN_INVALID_AUDIENCE'
type Wire5455 = 403
type Wire5456 = string
type Wire5457 = {
  error: Wire5458
  http_code?: Wire5459
  message?: Wire5460
  [key: string]: JsonValue | Wire5458 | Wire5459 | Wire5460 | undefined
}
type Wire5458 = 'TOKEN_INVALID_SCOPE'
type Wire5459 = 403
type Wire5460 = string
type Wire5461 = {
  error: Wire5462
  http_code?: Wire5463
  message?: Wire5464
  [key: string]: JsonValue | Wire5462 | Wire5463 | Wire5464 | undefined
}
type Wire5462 = 'RATE_LIMIT_REACHED'
type Wire5463 = 429
type Wire5464 = string
type Wire5465 = {
  error: Wire5466
  http_code?: Wire5467
  message?: Wire5468
  [key: string]: JsonValue | Wire5466 | Wire5467 | Wire5468 | undefined
}
type Wire5466 = 'SERVER_500'
type Wire5467 = 500
type Wire5468 = string
type Wire5469 = {
  assembly_id?: Wire5470
  fromdate?: Wire5471
  keywords?: Wire5472
  nonce?: Wire5476
  order?: Wire5479
  page?: Wire5480
  pagesize?: Wire5481
  region?: Wire5482
  sort?: Wire5485
  template_id?: Wire5486
  todate?: Wire5487
  type?: Wire5488
}
type Wire5470 = string
type Wire5471 = string
type Wire5472 = Wire5473 | Wire5474
type Wire5473 = string
type Wire5474 = Array<Wire5475>
type Wire5475 = string
type Wire5476 = Wire5477 | Wire5478
type Wire5477 = string
type Wire5478 = number
type Wire5479 = 'asc' | 'desc'
type Wire5480 = number
type Wire5481 = number
type Wire5482 = Wire5483 | Wire5484
type Wire5483 = string
type Wire5484 = string
type Wire5485 = 'created' | 'created_ts' | 'updated'
type Wire5486 = string
type Wire5487 = string
type Wire5488 =
  | 'all'
  | 'canceled'
  | 'completed'
  | 'executing'
  | 'expired'
  | 'failed'
  | 'fixable'
  | 'problematic'
  | 'request_aborted'
  | 'uploading'
type Wire5489 = {
  count: Wire5490
  items: Wire5491
  [key: string]: JsonValue | Wire5490 | Wire5491 | undefined
}
type Wire5490 = number
type Wire5491 = Array<Wire5492>
type Wire5492 = {
  account_id?: Wire5493
  bytes_expected?: Wire5494
  bytes_received?: Wire5495
  bytes_usage?: Wire5496
  created: Wire5499
  created_ts?: Wire5500
  error?: Wire5501
  execution_duration?: Wire5502
  execution_start?: Wire5505
  files?: Wire5506
  id: Wire5507
  instance?: Wire5508
  notify_url?: Wire5509
  num_input_files?: Wire5510
  ok?: Wire5513
  parent_id?: Wire5514
  redirect_url?: Wire5515
  region?: Wire5516
  template_id?: Wire5517
  template_name?: Wire5518
  upload_duration?: Wire5519
  warning_count?: Wire5520
  [key: string]:
    | JsonValue
    | Wire5493
    | Wire5494
    | Wire5495
    | Wire5496
    | Wire5499
    | Wire5500
    | Wire5501
    | Wire5502
    | Wire5505
    | Wire5506
    | Wire5507
    | Wire5508
    | Wire5509
    | Wire5510
    | Wire5513
    | Wire5514
    | Wire5515
    | Wire5516
    | Wire5517
    | Wire5518
    | Wire5519
    | Wire5520
    | undefined
}
type Wire5493 = null | string
type Wire5494 = number
type Wire5495 = number
type Wire5496 = Wire5497 | Wire5498
type Wire5497 = number
type Wire5498 = null
type Wire5499 = string
type Wire5500 = number
type Wire5501 = null | string
type Wire5502 = Wire5503 | Wire5504
type Wire5503 = number
type Wire5504 = null
type Wire5505 = null | string
type Wire5506 = null | string
type Wire5507 = string
type Wire5508 = null | string
type Wire5509 = null | string
type Wire5510 = Wire5511 | Wire5512
type Wire5511 = number
type Wire5512 = null
type Wire5513 = null | string
type Wire5514 = null | string
type Wire5515 = null | string
type Wire5516 = null | string
type Wire5517 = null | string
type Wire5518 = null | string
type Wire5519 = number
type Wire5520 = Wire5521 | Wire5522
type Wire5521 = number
type Wire5522 = null
type Wire5523 = Wire93 | Wire5524
type Wire5524 = Wire5525 | Wire5529
type Wire5525 = {
  error: Wire5526
  http_code?: Wire5527
  message?: Wire5528
  [key: string]: JsonValue | Wire5526 | Wire5527 | Wire5528 | undefined
}
type Wire5526 = 'ASSEMBLY_LIST_ERROR'
type Wire5527 = 400
type Wire5528 = string
type Wire5529 = Wire67
type Wire5530 = { notifications: Wire5531; ok: Wire5548 }
type Wire5531 = Array<Wire5532>
type Wire5532 = {
  app_id?: Wire5533
  assembly_id?: Wire5534
  duration?: Wire5535
  error?: Wire5538
  response_code?: Wire5539
  response_data?: Wire5542
  start?: Wire5543
  status?: Wire5544
  url?: Wire5547
}
type Wire5533 = null | string
type Wire5534 = string
type Wire5535 = Wire5536 | Wire5537
type Wire5536 = number
type Wire5537 = null
type Wire5538 = null | string
type Wire5539 = Wire5540 | Wire5541
type Wire5540 = number
type Wire5541 = null
type Wire5542 = null | string
type Wire5543 = null | string
type Wire5544 = Wire5545 | Wire5546
type Wire5545 = 'error' | 'processing' | 'successful'
type Wire5546 = null
type Wire5547 = null | string
type Wire5548 = 'ASSEMBLY_NOTIFICATIONS_LISTED'
type Wire5549 = { nonce?: Wire5550 }
type Wire5550 = Wire5551 | Wire5552
type Wire5551 = string
type Wire5552 = number
type Wire5553 = {
  message: Wire5554
  ok: Wire5555
  scopes: Wire5556
  [key: string]: JsonValue | Wire5554 | Wire5555 | Wire5556 | undefined
}
type Wire5554 = string
type Wire5555 = 'AUTH_KEY_SCOPES_FOUND'
type Wire5556 = Array<Wire5557>
type Wire5557 =
  | 'assemblies:read'
  | 'assemblies:write'
  | 'assembly_notifications:write'
  | 'auth_keys:read'
  | 'auth_keys:write'
  | 'billing:read'
  | 'dam:read'
  | 'dam:write'
  | 'queues:read'
  | 'read'
  | 'smart_cdn:sign'
  | 'storage_grants:write'
  | 'template_credentials:read'
  | 'template_credentials:write'
  | 'templates:read'
  | 'templates:write'
  | 'write'
type Wire5558 = { nonce?: Wire5559 }
type Wire5559 = Wire5560 | Wire5561
type Wire5560 = string
type Wire5561 = number
type Wire5562 = {
  auth_keys: Wire5563
  message: Wire5583
  ok: Wire5584
  [key: string]: JsonValue | Wire5563 | Wire5583 | Wire5584 | undefined
}
type Wire5563 = Array<Wire5564>
type Wire5564 = {
  auth_key: Wire5565
  can_show_auth_secret: Wire5568
  created: Wire5569
  description: Wire5571
  id: Wire5572
  is_active: Wire5573
  is_allowed_for_smartcdn: Wire5574
  last_used: Wire5575
  modified: Wire5577
  scope: Wire5579
  signature_algo: Wire5582
}
type Wire5565 = Wire5566 | Wire5567
type Wire5566 = string
type Wire5567 = null
type Wire5568 = boolean
type Wire5569 = Wire160 | Wire5570
type Wire5570 = null
type Wire5571 = string
type Wire5572 = string
type Wire5573 = boolean
type Wire5574 = boolean
type Wire5575 = Wire160 | Wire5576
type Wire5576 = null
type Wire5577 = Wire160 | Wire5578
type Wire5578 = null
type Wire5579 = Wire5580 | Wire5581
type Wire5580 = string
type Wire5581 = null
type Wire5582 = null | string
type Wire5583 = string
type Wire5584 = 'AUTH_KEYS_FOUND'
type Wire5585 = Wire93 | Wire5325
type Wire5586 = { cursor?: Wire5587; limit?: Wire5588; nonce?: Wire5589; prefix?: Wire5592 }
type Wire5587 = string
type Wire5588 = number
type Wire5589 = Wire5590 | Wire5591
type Wire5590 = string
type Wire5591 = number
type Wire5592 = string
type Wire5593 = {
  assets: Wire5594
  message: Wire5608
  next_cursor: Wire5609
  ok: Wire5610
  workspace: Wire5611
}
type Wire5594 = Array<Wire5595>
type Wire5595 = {
  asset_id: Wire5596
  has_alpha?: Wire5597
  height?: Wire5598
  md5hash?: Wire5599
  mime: Wire5600
  path: Wire5601
  sha256?: Wire5602
  size: Wire5603
  thumbhash?: Wire5604
  version_id: Wire5605
  width?: Wire5606
  workspace: Wire5607
  [key: string]:
    | JsonValue
    | Wire5596
    | Wire5597
    | Wire5598
    | Wire5599
    | Wire5600
    | Wire5601
    | Wire5602
    | Wire5603
    | Wire5604
    | Wire5605
    | Wire5606
    | Wire5607
    | undefined
}
type Wire5596 = string
type Wire5597 = boolean
type Wire5598 = number
type Wire5599 = string
type Wire5600 = null | string
type Wire5601 = string
type Wire5602 = string
type Wire5603 = number
type Wire5604 = string
type Wire5605 = string
type Wire5606 = number
type Wire5607 = string
type Wire5608 = string
type Wire5609 = null | string
type Wire5610 = 'DAM_ASSETS_LISTED'
type Wire5611 = string
type Wire5612 = { nonce?: Wire5613 }
type Wire5613 = Wire5614 | Wire5615
type Wire5614 = string
type Wire5615 = number
type Wire5616 = { message: Wire5617; ok: Wire5618; priority_job_slots: Wire5619 }
type Wire5617 = string
type Wire5618 = 'PRIORITY_JOB_SLOTS_FOUND'
type Wire5619 = { count: Wire5620; slots: Wire5621 }
type Wire5620 = number
type Wire5621 = { [key: string]: Wire5622 | undefined }
type Wire5622 = { [key: string]: Wire5623 | undefined }
type Wire5623 = { [key: string]: Wire5624 | undefined }
type Wire5624 = number
type Wire5625 = { nonce?: Wire5626 }
type Wire5626 = Wire5627 | Wire5628
type Wire5627 = string
type Wire5628 = number
type Wire5629 = {
  message: Wire5630
  ok: Wire5631
  types: Wire5632
  [key: string]: JsonValue | Wire5630 | Wire5631 | Wire5632 | undefined
}
type Wire5630 = string
type Wire5631 = 'TEMPLATE_CREDENTIALS_TYPES_FOUND'
type Wire5632 = { [key: string]: Wire5633 | undefined }
type Wire5633 = {
  fields: Wire5634
  providers?: Wire5638
  [key: string]: JsonValue | Wire5634 | Wire5638 | undefined
}
type Wire5634 = { [key: string]: Wire5635 | undefined }
type Wire5635 = {
  requiredOnCreate?: Wire5636
  requiredOnUpdate?: Wire5637
  [key: string]: JsonValue | Wire5636 | Wire5637 | undefined
}
type Wire5636 = boolean
type Wire5637 = boolean
type Wire5638 = Array<Wire5639>
type Wire5639 = string
type Wire5640 = { nonce?: Wire5641 }
type Wire5641 = Wire5642 | Wire5643
type Wire5642 = string
type Wire5643 = number
type Wire5644 = {
  credentials: Wire5645
  message: Wire5676
  ok: Wire5677
  [key: string]: JsonValue | Wire5645 | Wire5676 | Wire5677 | undefined
}
type Wire5645 = Array<Wire5646>
type Wire5646 = {
  account_id: Wire5647
  content: Wire5648
  created: Wire5657
  deleted: Wire5662
  id: Wire5667
  modified: Wire5668
  name: Wire5673
  stringified: Wire5674
  type: Wire5675
}
type Wire5647 = string
type Wire5648 = Wire5649 | Wire5651 | Wire5653 | Wire5654 | Wire5655 | Wire5656
type Wire5649 = { [key: string]: Wire5650 | undefined }
type Wire5650 = JsonValue
type Wire5651 = Array<Wire5652>
type Wire5652 = JsonValue
type Wire5653 = string
type Wire5654 = number
type Wire5655 = boolean
type Wire5656 = null
type Wire5657 = Wire5658 | Wire5661
type Wire5658 = Wire5659 | Wire5660
type Wire5659 = number
type Wire5660 = string
type Wire5661 = null
type Wire5662 = Wire5663 | Wire5666
type Wire5663 = Wire5664 | Wire5665
type Wire5664 = number
type Wire5665 = string
type Wire5666 = null
type Wire5667 = string
type Wire5668 = Wire5669 | Wire5672
type Wire5669 = Wire5670 | Wire5671
type Wire5670 = number
type Wire5671 = string
type Wire5672 = null
type Wire5673 = string
type Wire5674 = string
type Wire5675 = string
type Wire5676 = string
type Wire5677 = 'TEMPLATE_CREDENTIALS_FOUND'
type Wire5678 = Wire93 | Wire5679
type Wire5679 = Wire5680 | Wire5684 | Wire5685
type Wire5680 = {
  error: Wire5681
  http_code?: Wire5682
  message?: Wire5683
  [key: string]: JsonValue | Wire5681 | Wire5682 | Wire5683 | undefined
}
type Wire5681 = 'TEMPLATE_CREDENTIALS_NOT_FOUND'
type Wire5682 = 400
type Wire5683 = string
type Wire5684 = Wire67
type Wire5685 = {
  error: Wire5686
  http_code?: Wire5687
  message?: Wire5688
  [key: string]: JsonValue | Wire5686 | Wire5687 | Wire5688 | undefined
}
type Wire5686 = 'SIGNATURE_REUSE_DETECTED'
type Wire5687 = 400
type Wire5688 = string
type Wire5689 = {
  fromdate?: Wire5690
  include_builtin?: Wire5691
  keywords?: Wire5692
  nonce?: Wire5696
  order?: Wire5699
  page?: Wire5700
  pagesize?: Wire5701
  sort?: Wire5702
  todate?: Wire5703
}
type Wire5690 = string
type Wire5691 = 'all' | 'exclusively-all' | 'exclusively-latest' | 'latest' | 'none'
type Wire5692 = Wire5693 | Wire5694
type Wire5693 = string
type Wire5694 = Array<Wire5695>
type Wire5695 = string
type Wire5696 = Wire5697 | Wire5698
type Wire5697 = string
type Wire5698 = number
type Wire5699 = 'asc' | 'desc'
type Wire5700 = number
type Wire5701 = number
type Wire5702 = 'created' | 'id' | 'last_used' | 'modified' | 'name'
type Wire5703 = string
type Wire5704 = { count: Wire5705; items: Wire5706 }
type Wire5705 = number
type Wire5706 = Array<Wire5707>
type Wire5707 = {
  account_id?: Wire5708
  assembly_status_expiry?: Wire5709
  builtin_version?: Wire5710
  content: Wire5711
  created?: Wire5720
  deleted?: Wire5724
  description?: Wire5725
  encryption_version?: Wire5726
  id?: Wire5729
  json?: Wire5732
  last_used?: Wire5720
  modified?: Wire5720
  name?: Wire5733
  require_signature_auth?: Wire5734
  transcoding_result_expiry?: Wire5735
}
type Wire5708 = null | string
type Wire5709 = null | string
type Wire5710 = string
type Wire5711 = Wire5712 | Wire5714 | Wire5716 | Wire5717 | Wire5718 | Wire5719
type Wire5712 = { [key: string]: Wire5713 | undefined }
type Wire5713 = JsonValue
type Wire5714 = Array<Wire5715>
type Wire5715 = JsonValue
type Wire5716 = string
type Wire5717 = number
type Wire5718 = boolean
type Wire5719 = null
type Wire5720 = Wire5721 | Wire5723
type Wire5721 = string & Wire5722
type Wire5722 = JsonValue
type Wire5723 = null
type Wire5724 = null
type Wire5725 = string
type Wire5726 = Wire5727 | Wire5728
type Wire5727 = number
type Wire5728 = null
type Wire5729 = Wire5730 | Wire5731
type Wire5730 = string
type Wire5731 = string
type Wire5732 = null
type Wire5733 = string
type Wire5734 = 0 | 1
type Wire5735 = null | string
type Wire5736 = Wire93 | Wire5737
type Wire5737 = Wire5738 | Wire5742
type Wire5738 = {
  error: Wire5739
  http_code?: Wire5740
  message?: Wire5741
  [key: string]: JsonValue | Wire5739 | Wire5740 | Wire5741 | undefined
}
type Wire5739 = 'TEMPLATE_LIST_ERROR'
type Wire5740 = 400
type Wire5741 = string
type Wire5742 = Wire67
type Wire5743 = { destination_folder_id?: Wire5744; filename?: Wire5747; nonce?: Wire5748 }
type Wire5744 = Wire5745 | Wire5746
type Wire5745 = string
type Wire5746 = null
type Wire5747 = string
type Wire5748 = Wire5749 | Wire5750
type Wire5749 = string
type Wire5750 = number
type Wire5751 = {
  asset: Wire5752
  asset_id: Wire5765
  deleted_at: Wire5766
  filename: Wire5768
  folder_id: Wire5769
  message: Wire5772
  ok: Wire5773
  path: Wire5774
  updated_at: Wire160
}
type Wire5752 = {
  asset_id: Wire5753
  has_alpha?: Wire5754
  height?: Wire5755
  md5hash?: Wire5756
  mime: Wire5757
  path: Wire5758
  sha256?: Wire5759
  size: Wire5760
  thumbhash?: Wire5761
  version_id: Wire5762
  width?: Wire5763
  workspace: Wire5764
  [key: string]:
    | JsonValue
    | Wire5753
    | Wire5754
    | Wire5755
    | Wire5756
    | Wire5757
    | Wire5758
    | Wire5759
    | Wire5760
    | Wire5761
    | Wire5762
    | Wire5763
    | Wire5764
    | undefined
}
type Wire5753 = string
type Wire5754 = boolean
type Wire5755 = number
type Wire5756 = string
type Wire5757 = null | string
type Wire5758 = string
type Wire5759 = string
type Wire5760 = number
type Wire5761 = string
type Wire5762 = string
type Wire5763 = number
type Wire5764 = string
type Wire5765 = string
type Wire5766 = Wire160 | Wire5767
type Wire5767 = null
type Wire5768 = string
type Wire5769 = Wire5770 | Wire5771
type Wire5770 = string
type Wire5771 = null
type Wire5772 = string
type Wire5773 = 'DAM_ASSET_MOVED'
type Wire5774 = string
type Wire5775 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire5776 = { destination: Wire5777; nonce?: Wire5778; source: Wire5781 }
type Wire5777 = string
type Wire5778 = Wire5779 | Wire5780
type Wire5779 = string
type Wire5780 = number
type Wire5781 = string
type Wire5782 = { message: Wire5783; ok: Wire5784; path: Wire5785 }
type Wire5783 = string
type Wire5784 = 'DAM_ENTRY_MOVED'
type Wire5785 = string
type Wire5786 = { aggregation?: Wire5787; nonce?: Wire5790; region: Wire5793; since: Wire5794 }
type Wire5787 = Wire5788 | Wire5789
type Wire5788 = 'avg' | 'max'
type Wire5789 = null
type Wire5790 = Wire5791 | Wire5792
type Wire5791 = string
type Wire5792 = number
type Wire5793 = string
type Wire5794 = string
type Wire5795 = {
  aggregation: Wire5796
  avgSlotCount: Wire5797
  granularity: Wire5798
  maxSlotCount: Wire5799
  ok: Wire5800
  stats: Wire5801
}
type Wire5796 = 'avg' | 'max'
type Wire5797 = number
type Wire5798 = number
type Wire5799 = number
type Wire5800 = 'PRIORITY_JOB_SLOT_STATS_FOUND'
type Wire5801 = Array<Wire5802>
type Wire5802 = {
  avg_slot_count: Wire5803
  data_from_ts: Wire5804
  max_slot_count: Wire5805
  slot_count: Wire5806
}
type Wire5803 = number
type Wire5804 = number
type Wire5805 = number
type Wire5806 = number
type Wire5807 = Wire5808 | Wire5823 | Wire93
type Wire5808 = Wire5809 | Wire5822
type Wire5809 = Wire5810 | Wire5814 | Wire5818
type Wire5810 = {
  error: Wire5811
  http_code?: Wire5812
  message?: Wire5813
  [key: string]: JsonValue | Wire5811 | Wire5812 | Wire5813 | undefined
}
type Wire5811 = 'PRIORITY_JOB_SLOT_STATS_INVALID_AGGREGATION'
type Wire5812 = 400
type Wire5813 = string
type Wire5814 = {
  error: Wire5815
  http_code?: Wire5816
  message?: Wire5817
  [key: string]: JsonValue | Wire5815 | Wire5816 | Wire5817 | undefined
}
type Wire5815 = 'PRIORITY_JOB_SLOT_STATS_INVALID_TIME'
type Wire5816 = 400
type Wire5817 = string
type Wire5818 = {
  error: Wire5819
  http_code?: Wire5820
  message?: Wire5821
  [key: string]: JsonValue | Wire5819 | Wire5820 | Wire5821 | undefined
}
type Wire5819 = 'PRIORITY_JOB_SLOT_STATS_MISSING_REGION'
type Wire5820 = 400
type Wire5821 = string
type Wire5822 = Wire67
type Wire5823 = Wire5824 | Wire5828
type Wire5824 = {
  error: Wire5825
  http_code?: Wire5826
  message?: Wire5827
  [key: string]: JsonValue | Wire5825 | Wire5826 | Wire5827 | undefined
}
type Wire5825 = 'PRIORITY_JOB_SLOT_STATS_ERROR'
type Wire5826 = 500
type Wire5827 = string
type Wire5828 = Wire67
type Wire5829 = Wire5830 | Wire5847
type Wire5830 = {
  emit_execution_progress?: Wire5831
  exiftool_stack?: Wire5832
  ffmpeg_stack?: Wire5833
  fields?: Wire5834
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire5836
  mplayer_stack?: Wire5837
  nonce?: Wire5838
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire5841
  response_headers?: Wire1344
  steps: Wire5842
  template_id: Wire5845
  usage_tags?: Wire5846
}
type Wire5831 = boolean
type Wire5832 = string
type Wire5833 = string
type Wire5834 = { [key: string]: Wire5835 | undefined }
type Wire5835 = JsonValue
type Wire5836 = string
type Wire5837 = string
type Wire5838 = Wire5839 | Wire5840
type Wire5839 = string
type Wire5840 = number
type Wire5841 = string
type Wire5842 = { [key: string]: Wire5843 | undefined }
type Wire5843 = { robot?: Wire5844; [key: string]: JsonValue | Wire5844 | undefined }
type Wire5844 =
  | '/ai/chat'
  | '/audio/artwork'
  | '/audio/concat'
  | '/audio/encode'
  | '/audio/loop'
  | '/audio/merge'
  | '/audio/split'
  | '/audio/waveform'
  | '/azure/import'
  | '/azure/store'
  | '/backblaze/import'
  | '/backblaze/store'
  | '/box/import'
  | '/box/store'
  | '/cloudfiles/import'
  | '/cloudfiles/store'
  | '/cloudflare/import'
  | '/cloudflare/store'
  | '/digitalocean/import'
  | '/digitalocean/store'
  | '/document/autorotate'
  | '/document/convert'
  | '/document/extract'
  | '/document/merge'
  | '/document/ocr'
  | '/document/optimize'
  | '/document/split'
  | '/document/thumbs'
  | '/dropbox/import'
  | '/dropbox/store'
  | '/edgly/deliver'
  | '/file/compress'
  | '/file/decompress'
  | '/file/filter'
  | '/file/hash'
  | '/file/preview'
  | '/file/read'
  | '/file/serve'
  | '/file/verify'
  | '/file/virusscan'
  | '/ftp/import'
  | '/ftp/store'
  | '/google/import'
  | '/google/store'
  | '/html/convert'
  | '/http/import'
  | '/http/request'
  | '/image/bgremove'
  | '/image/copyrightdetect'
  | '/image/describe'
  | '/image/enhance'
  | '/image/facedetect'
  | '/image/generate'
  | '/image/merge'
  | '/image/ocr'
  | '/image/optimize'
  | '/image/resize'
  | '/image/upscale'
  | '/mega/import'
  | '/mega/store'
  | '/meta/write'
  | '/minio/import'
  | '/minio/store'
  | '/s3/import'
  | '/s3/store'
  | '/script/run'
  | '/sftp/import'
  | '/sftp/store'
  | '/speech/transcribe'
  | '/supabase/import'
  | '/supabase/store'
  | '/swift/import'
  | '/swift/store'
  | '/text/speak'
  | '/text/translate'
  | '/tigris/import'
  | '/tigris/store'
  | '/tlcdn/deliver'
  | '/transloadit/import'
  | '/transloadit/store'
  | '/tus/store'
  | '/upload/handle'
  | '/video/adaptive'
  | '/video/artwork'
  | '/video/concat'
  | '/video/encode'
  | '/video/generate'
  | '/video/merge'
  | '/video/ondemand'
  | '/video/split'
  | '/video/subtitle'
  | '/video/thumbs'
  | '/vimeo/import'
  | '/vimeo/store'
  | '/wasabi/import'
  | '/wasabi/store'
  | '/youtube/store'
type Wire5845 = string
type Wire5846 = string
type Wire5847 = {
  emit_execution_progress?: Wire5848
  exiftool_stack?: Wire5849
  ffmpeg_stack?: Wire5850
  fields?: Wire5851
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire5853
  mplayer_stack?: Wire5854
  nonce?: Wire5855
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire5858
  response_headers?: Wire1344
  steps?: Wire5859
  template_id?: Wire5860
  usage_tags?: Wire5861
}
type Wire5848 = boolean
type Wire5849 = string
type Wire5850 = string
type Wire5851 = { [key: string]: Wire5852 | undefined }
type Wire5852 = JsonValue
type Wire5853 = string
type Wire5854 = string
type Wire5855 = Wire5856 | Wire5857
type Wire5856 = string
type Wire5857 = number
type Wire5858 = string
type Wire5859 = Wire1372
type Wire5860 = string
type Wire5861 = string
type Wire5862 = Wire93 | Wire4921
type Wire5863 = {
  fields?: Wire5864
  nonce?: Wire5866
  notify_url?: Wire5869
  reparse_template?: Wire5870
  steps?: Wire5871
}
type Wire5864 = { [key: string]: Wire5865 | undefined }
type Wire5865 = JsonValue
type Wire5866 = Wire5867 | Wire5868
type Wire5867 = string
type Wire5868 = number
type Wire5869 = null | string
type Wire5870 = 0 | 1
type Wire5871 = Wire5872 | Wire5884
type Wire5872 = { [key: string]: Wire5873 | undefined }
type Wire5873 = {
  field?: Wire5874
  force_name?: Wire5875
  key?: Wire5876
  output_meta?: Wire5877
  password?: Wire5878
  prompt?: Wire5879
  robot?: Wire5880
  secret?: Wire5881
  url?: Wire5882
  use?: Wire5883
  [key: string]:
    | JsonValue
    | Wire5874
    | Wire5875
    | Wire5876
    | Wire5877
    | Wire5878
    | Wire5879
    | Wire5880
    | Wire5881
    | Wire5882
    | Wire5883
    | undefined
}
type Wire5874 = JsonValue
type Wire5875 = JsonValue
type Wire5876 = JsonValue
type Wire5877 = JsonValue
type Wire5878 = JsonValue
type Wire5879 = JsonValue
type Wire5880 = string
type Wire5881 = JsonValue
type Wire5882 = JsonValue
type Wire5883 = JsonValue
type Wire5884 = Array<Wire5873>
type Wire5885 = {
  assembly_id: Wire5886
  assembly_ssl_url: Wire5887
  assembly_url: Wire5888
  message: Wire5889
  notify_url: Wire5890
  ok: Wire5891
  success: Wire5892
  [key: string]:
    | JsonValue
    | Wire5886
    | Wire5887
    | Wire5888
    | Wire5889
    | Wire5890
    | Wire5891
    | Wire5892
    | undefined
}
type Wire5886 = string
type Wire5887 = string
type Wire5888 = string
type Wire5889 = string
type Wire5890 = null | string
type Wire5891 = 'ASSEMBLY_REPLAYING'
type Wire5892 = true
type Wire5893 = { fields?: Wire5894; nonce?: Wire5896; notify_url?: Wire5899; wait?: Wire5900 }
type Wire5894 = { [key: string]: Wire5895 | undefined }
type Wire5895 = JsonValue
type Wire5896 = Wire5897 | Wire5898
type Wire5897 = string
type Wire5898 = number
type Wire5899 = null | string
type Wire5900 = boolean
type Wire5901 = { notification_id: Wire5902; ok: Wire5903; success: Wire5904 }
type Wire5902 = string
type Wire5903 = 'ASSEMBLY_NOTIFICATION_REPLAYED' | 'ASSEMBLY_NOTIFICATION_REPLAYING'
type Wire5904 = true
type Wire5905 = { nonce?: Wire5906 }
type Wire5906 = Wire5907 | Wire5908
type Wire5907 = string
type Wire5908 = number
type Wire5909 = {
  auth_key: Wire5910
  auth_secret: Wire5913
  message: Wire5914
  ok: Wire5915
  [key: string]: JsonValue | Wire5910 | Wire5913 | Wire5914 | Wire5915 | undefined
}
type Wire5910 = Wire5911 | Wire5912
type Wire5911 = string
type Wire5912 = null
type Wire5913 = string
type Wire5914 = string
type Wire5915 = 'AUTH_SECRET_RETRIEVED'
type Wire5916 = Wire93 | Wire5917
type Wire5917 = Wire5918 | Wire5922
type Wire5918 = {
  error: Wire5919
  http_code?: Wire5920
  message?: Wire5921
  [key: string]: JsonValue | Wire5919 | Wire5920 | Wire5921 | undefined
}
type Wire5919 = 'AUTH_SECRET_NOT_RETRIEVED'
type Wire5920 = 400
type Wire5921 = string
type Wire5922 = Wire67
type Wire5923 = {
  description?: Wire5924
  is_active?: Wire5925
  is_allowed_for_smartcdn?: Wire5929
  nonce?: Wire5933
  scope?: Wire5936
  signature_algo?: Wire5937
}
type Wire5924 = string
type Wire5925 = Wire5926 | Wire5927 | Wire5928
type Wire5926 = boolean
type Wire5927 = 0
type Wire5928 = 1
type Wire5929 = Wire5930 | Wire5931 | Wire5932
type Wire5930 = boolean
type Wire5931 = 0
type Wire5932 = 1
type Wire5933 = Wire5934 | Wire5935
type Wire5934 = string
type Wire5935 = number
type Wire5936 = string
type Wire5937 = Wire5938 | Wire5939
type Wire5938 = 'sha1' | 'sha256' | 'sha384'
type Wire5939 = null
type Wire5940 = {
  auth_key: Wire5941
  message: Wire5960
  ok: Wire5961
  [key: string]: JsonValue | Wire5941 | Wire5960 | Wire5961 | undefined
}
type Wire5941 = {
  auth_key: Wire5942
  can_show_auth_secret: Wire5945
  created: Wire5946
  description: Wire5948
  id: Wire5949
  is_active: Wire5950
  is_allowed_for_smartcdn: Wire5951
  last_used: Wire5952
  modified: Wire5954
  scope: Wire5956
  signature_algo: Wire5959
}
type Wire5942 = Wire5943 | Wire5944
type Wire5943 = string
type Wire5944 = null
type Wire5945 = boolean
type Wire5946 = Wire160 | Wire5947
type Wire5947 = null
type Wire5948 = string
type Wire5949 = string
type Wire5950 = boolean
type Wire5951 = boolean
type Wire5952 = Wire160 | Wire5953
type Wire5953 = null
type Wire5954 = Wire160 | Wire5955
type Wire5955 = null
type Wire5956 = Wire5957 | Wire5958
type Wire5957 = string
type Wire5958 = null
type Wire5959 = null | string
type Wire5960 = string
type Wire5961 = 'AUTH_KEY_UPDATED'
type Wire5962 = Wire93 | Wire5963
type Wire5963 = Wire5964 | Wire5968
type Wire5964 = {
  error: Wire5965
  http_code?: Wire5966
  message?: Wire5967
  [key: string]: JsonValue | Wire5965 | Wire5966 | Wire5967 | undefined
}
type Wire5965 = 'AUTH_KEY_NOT_UPDATED'
type Wire5966 = 400
type Wire5967 = string
type Wire5968 = Wire67
type Wire5969 = {
  assembly_status_expiry?: Wire5970
  name?: Wire5971
  nonce?: Wire5972
  require_signature_auth?: Wire5975
  template?: Wire5976
  transcoding_result_expiry?: Wire6012
}
type Wire5970 = '1day' | '30days' | '7days' | '90days' | 'NoSave'
type Wire5971 = string
type Wire5972 = Wire5973 | Wire5974
type Wire5973 = string
type Wire5974 = number
type Wire5975 = 0 | 1
type Wire5976 = Wire5977 | Wire6011
type Wire5977 = {
  allow_steps_override?: Wire5978
  auth?: Wire5979
  emit_execution_progress?: Wire5985
  exiftool_stack?: Wire5986
  ffmpeg_stack?: Wire5987
  fields?: Wire5988
  imagemagick_stack?: Wire5990
  mediainfo_stack?: Wire5991
  mplayer_stack?: Wire5992
  notification_payload?: Wire5993
  notify_url?: Wire5995
  quiet?: Wire5996
  redirect_url?: Wire5997
  response_headers?: Wire5998
  steps?: Wire6008
  template_id?: Wire6009
  usage_tags?: Wire6010
}
type Wire5978 = boolean
type Wire5979 = {
  expires?: Wire5980
  key?: Wire5981
  max_number_of_files?: Wire5982
  max_size?: Wire5983
  referer?: Wire5984
}
type Wire5980 = string
type Wire5981 = string
type Wire5982 = number
type Wire5983 = number
type Wire5984 = string
type Wire5985 = boolean
type Wire5986 = string
type Wire5987 = string
type Wire5988 = { [key: string]: Wire5989 | undefined }
type Wire5989 = JsonValue
type Wire5990 = string
type Wire5991 = string
type Wire5992 = string
type Wire5993 = Array<Wire5994>
type Wire5994 =
  | 'without_params'
  | 'without_result_meta_data'
  | 'without_results'
  | 'without_upload_meta_data'
  | 'without_uploads'
type Wire5995 = null | string
type Wire5996 = boolean
type Wire5997 = string
type Wire5998 = { cors?: Wire5999; [key: string]: JsonValue | Wire5999 | undefined }
type Wire5999 = {
  'Access-Control-Allow-Credentials'?: Wire6000
  'Access-Control-Allow-Headers'?: Wire6001
  'Access-Control-Allow-Methods'?: Wire6002
  'Access-Control-Allow-Origin'?: Wire6003
  'Access-Control-Allow-Private-Network'?: Wire6004
  'Access-Control-Allow-Public-Network'?: Wire6005
  'Access-Control-Expose-Headers'?: Wire6006
  'Access-Control-Max-Age'?: Wire6007
  [key: string]:
    | JsonValue
    | Wire6000
    | Wire6001
    | Wire6002
    | Wire6003
    | Wire6004
    | Wire6005
    | Wire6006
    | Wire6007
    | undefined
}
type Wire6000 = boolean
type Wire6001 = string
type Wire6002 = string
type Wire6003 = string
type Wire6004 = boolean
type Wire6005 = boolean
type Wire6006 = string
type Wire6007 = number
type Wire6008 = Wire1372
type Wire6009 = string
type Wire6010 = string
type Wire6011 = string
type Wire6012 = '1day' | 'NoSave'
type Wire6013 = {
  assembly_status_expiry: Wire6014
  content: Wire6015
  id: Wire6024
  message: Wire6027
  name: Wire6028
  ok: Wire6029
  require_signature_auth: Wire6030
  transcoding_result_expiry: Wire6031
}
type Wire6014 = null | string
type Wire6015 = Wire6016 | Wire6018 | Wire6020 | Wire6021 | Wire6022 | Wire6023
type Wire6016 = { [key: string]: Wire6017 | undefined }
type Wire6017 = JsonValue
type Wire6018 = Array<Wire6019>
type Wire6019 = JsonValue
type Wire6020 = string
type Wire6021 = number
type Wire6022 = boolean
type Wire6023 = null
type Wire6024 = Wire6025 | Wire6026
type Wire6025 = string
type Wire6026 = string
type Wire6027 = string
type Wire6028 = string
type Wire6029 = 'TEMPLATE_UPDATED'
type Wire6030 = 0 | 1
type Wire6031 = null | string
type Wire6032 = Wire93 | Wire5037
type Wire6033 = { content?: Wire6034; name: Wire6040; nonce?: Wire6041; type: Wire6044 }
type Wire6034 = Wire6035 | Wire6039
type Wire6035 = Wire6036 | Wire6038
type Wire6036 = { [key: string]: Wire6037 | undefined }
type Wire6037 = JsonValue
type Wire6038 = string
type Wire6039 = null
type Wire6040 = string
type Wire6041 = Wire6042 | Wire6043
type Wire6042 = string
type Wire6043 = number
type Wire6044 =
  | 'ai'
  | 'azure'
  | 'backblaze'
  | 'box'
  | 'cloudflare'
  | 'companion'
  | 'digitalocean'
  | 'dropbox'
  | 'ftp'
  | 'google'
  | 'http'
  | 'mega'
  | 'minio'
  | 'rackspace'
  | 's3'
  | 'sftp'
  | 'supabase'
  | 'swift'
  | 'tigris'
  | 'vimeo'
  | 'wasabi'
  | 'youtube'
type Wire6045 = {
  credential: Wire6046
  message: Wire6076
  ok: Wire6077
  [key: string]: JsonValue | Wire6046 | Wire6076 | Wire6077 | undefined
}
type Wire6046 = {
  account_id: Wire6047
  content: Wire6048
  created: Wire6057
  deleted: Wire6062
  id: Wire6067
  modified: Wire6068
  name: Wire6073
  stringified: Wire6074
  type: Wire6075
}
type Wire6047 = string
type Wire6048 = Wire6049 | Wire6051 | Wire6053 | Wire6054 | Wire6055 | Wire6056
type Wire6049 = { [key: string]: Wire6050 | undefined }
type Wire6050 = JsonValue
type Wire6051 = Array<Wire6052>
type Wire6052 = JsonValue
type Wire6053 = string
type Wire6054 = number
type Wire6055 = boolean
type Wire6056 = null
type Wire6057 = Wire6058 | Wire6061
type Wire6058 = Wire6059 | Wire6060
type Wire6059 = number
type Wire6060 = string
type Wire6061 = null
type Wire6062 = Wire6063 | Wire6066
type Wire6063 = Wire6064 | Wire6065
type Wire6064 = number
type Wire6065 = string
type Wire6066 = null
type Wire6067 = string
type Wire6068 = Wire6069 | Wire6072
type Wire6069 = Wire6070 | Wire6071
type Wire6070 = number
type Wire6071 = string
type Wire6072 = null
type Wire6073 = string
type Wire6074 = string
type Wire6075 = string
type Wire6076 = string
type Wire6077 = 'TEMPLATE_CREDENTIALS_UPDATED'
type Wire6078 = Wire93 | Wire6079
type Wire6079 = Wire6080 | Wire6084
type Wire6080 = {
  error: Wire6081
  http_code?: Wire6082
  message?: Wire6083
  [key: string]: JsonValue | Wire6081 | Wire6082 | Wire6083 | undefined
}
type Wire6081 = 'TEMPLATE_CREDENTIALS_NOT_UPDATED'
type Wire6082 = 400
type Wire6083 = string
type Wire6084 = Wire67
export type AssemblyStatsParams = Wire1
export interface AssemblyStatsInput {
  params: AssemblyStatsParams
  signal?: AbortSignal
}
export type AssemblyStatsResult = Wire8
export type AssemblyStatsError = Wire55
export type BulkDeleteDamAssetsParams = Wire94
export interface BulkDeleteDamAssetsInput {
  params: BulkDeleteDamAssetsParams
  signal?: AbortSignal
}
export type BulkDeleteDamAssetsResult = Wire100
export type BulkDeleteDamAssetsError = Wire108
export type BulkMoveDamAssetsParams = Wire133
export interface BulkMoveDamAssetsInput {
  params: BulkMoveDamAssetsParams
  signal?: AbortSignal
}
export type BulkMoveDamAssetsResult = Wire142
export type BulkMoveDamAssetsError = Wire170
export interface CancelAssemblyInput {
  path: { assemblyId: string }
  signal?: AbortSignal
}
export type CancelAssemblyResult = Wire171
export type CancelAssemblyError = Wire93
export type CreateAssemblyParams = Wire1326
export interface CreateAssemblyInput {
  params: CreateAssemblyParams
  files?: Readonly<Record<string, UploadFile>>
  fields?: Readonly<Record<string, string>>
  signal?: AbortSignal
}
export type CreateAssemblyResult = Wire171
export type CreateAssemblyError = Wire4920
export type CreateAuthKeyParams = Wire4927
export interface CreateAuthKeyInput {
  params: CreateAuthKeyParams
  signal?: AbortSignal
}
export type CreateAuthKeyResult = Wire4945
export type CreateAuthKeyError = Wire4966
export type CreateTemplateParams = Wire4973
export interface CreateTemplateInput {
  params: CreateTemplateParams
  signal?: AbortSignal
}
export type CreateTemplateResult = Wire5017
export type CreateTemplateError = Wire5036
export type CreateTemplateCredentialParams = Wire5043
export interface CreateTemplateCredentialInput {
  params: CreateTemplateCredentialParams
  signal?: AbortSignal
}
export type CreateTemplateCredentialResult = Wire5053
export type CreateTemplateCredentialError = Wire5086
export type DeleteAuthKeyParams = Wire5093
export interface DeleteAuthKeyInput {
  path: { authKeyId: string }
  params: DeleteAuthKeyParams
  signal?: AbortSignal
}
export type DeleteAuthKeyResult = Wire5097
export type DeleteAuthKeyError = Wire5100
export type DeleteDamAssetParams = Wire5107
export interface DeleteDamAssetInput {
  path: { assetId: string }
  params: DeleteDamAssetParams
  signal?: AbortSignal
}
export type DeleteDamAssetResult = Wire5111
export type DeleteDamAssetError = Wire5117
export type DeleteTemplateParams = Wire5118
export interface DeleteTemplateInput {
  path: { templateIdOrName: string }
  params: DeleteTemplateParams
  signal?: AbortSignal
}
export type DeleteTemplateResult = Wire5122
export type DeleteTemplateError = Wire93
export type DeleteTemplateCredentialParams = Wire5125
export interface DeleteTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: DeleteTemplateCredentialParams
  signal?: AbortSignal
}
export type DeleteTemplateCredentialResult = Wire5129
export type DeleteTemplateCredentialError = Wire5132
export interface GetAssemblyInput {
  path: { assemblyId: string }
  signal?: AbortSignal
}
export type GetAssemblyResult = Wire171
export type GetAssemblyError = Wire93
export type GetBillParams = Wire5139
export interface GetBillInput {
  path: { billYearMonth: string }
  params: GetBillParams
  signal?: AbortSignal
}
export type GetBillResult = Wire5143
export type GetBillError = Wire5324
export type GetDamAssetParams = Wire5331
export interface GetDamAssetInput {
  path: { assetId: string }
  params: GetDamAssetParams
  signal?: AbortSignal
}
export type GetDamAssetResult = Wire5336
export type GetDamAssetError = Wire93
export type GetTemplateParams = Wire5352
export interface GetTemplateInput {
  path: { templateIdOrName: string }
  params: GetTemplateParams
  signal?: AbortSignal
}
export type GetTemplateResult = Wire5356
export type GetTemplateError = Wire5375
export type GetTemplateCredentialParams = Wire5376
export interface GetTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: GetTemplateCredentialParams
  signal?: AbortSignal
}
export type GetTemplateCredentialResult = Wire5380
export type GetTemplateCredentialError = Wire5413
export interface IssueBearerTokenInput {
  body: Wire5420
  signal?: AbortSignal
}
export type IssueBearerTokenResult = Wire5424
export type IssueBearerTokenError = Wire5429
export type ListAssembliesParams = Wire5469
export interface ListAssembliesInput {
  params: ListAssembliesParams
  signal?: AbortSignal
}
export type ListAssembliesResult = Wire5489
export type ListAssembliesError = Wire5523
export interface ListAssemblyNotificationsInput {
  path: { assemblyId: string }
  signal?: AbortSignal
}
export type ListAssemblyNotificationsResult = Wire5530
export type ListAssemblyNotificationsError = Wire93
export type ListAuthKeyScopesParams = Wire5549
export interface ListAuthKeyScopesInput {
  params: ListAuthKeyScopesParams
  signal?: AbortSignal
}
export type ListAuthKeyScopesResult = Wire5553
export type ListAuthKeyScopesError = Wire93
export type ListAuthKeysParams = Wire5558
export interface ListAuthKeysInput {
  params: ListAuthKeysParams
  signal?: AbortSignal
}
export type ListAuthKeysResult = Wire5562
export type ListAuthKeysError = Wire5585
export type ListDamAssetsParams = Wire5586
export interface ListDamAssetsInput {
  params: ListDamAssetsParams
  signal?: AbortSignal
}
export type ListDamAssetsResult = Wire5593
export type ListDamAssetsError = Wire93
export type ListPriorityJobSlotsParams = Wire5612
export interface ListPriorityJobSlotsInput {
  params: ListPriorityJobSlotsParams
  signal?: AbortSignal
}
export type ListPriorityJobSlotsResult = Wire5616
export type ListPriorityJobSlotsError = Wire93
export type ListTemplateCredentialTypesParams = Wire5625
export interface ListTemplateCredentialTypesInput {
  params: ListTemplateCredentialTypesParams
  signal?: AbortSignal
}
export type ListTemplateCredentialTypesResult = Wire5629
export type ListTemplateCredentialTypesError = Wire93
export type ListTemplateCredentialsParams = Wire5640
export interface ListTemplateCredentialsInput {
  params: ListTemplateCredentialsParams
  signal?: AbortSignal
}
export type ListTemplateCredentialsResult = Wire5644
export type ListTemplateCredentialsError = Wire5678
export type ListTemplatesParams = Wire5689
export interface ListTemplatesInput {
  params: ListTemplatesParams
  signal?: AbortSignal
}
export type ListTemplatesResult = Wire5704
export type ListTemplatesError = Wire5736
export type MoveDamAssetParams = Wire5743
export interface MoveDamAssetInput {
  path: { assetId: string }
  params: MoveDamAssetParams
  signal?: AbortSignal
}
export type MoveDamAssetResult = Wire5751
export type MoveDamAssetError = Wire5775
export type MoveDamEntryParams = Wire5776
export interface MoveDamEntryInput {
  params: MoveDamEntryParams
  signal?: AbortSignal
}
export type MoveDamEntryResult = Wire5782
export type MoveDamEntryError = Wire93
export type PriorityJobSlotStatsParams = Wire5786
export interface PriorityJobSlotStatsInput {
  params: PriorityJobSlotStatsParams
  signal?: AbortSignal
}
export type PriorityJobSlotStatsResult = Wire5795
export type PriorityJobSlotStatsError = Wire5807
export type ReplaceAssemblyParams = Wire5829
export interface ReplaceAssemblyInput {
  path: { assemblyId: string }
  params: ReplaceAssemblyParams
  files?: Readonly<Record<string, UploadFile>>
  fields?: Readonly<Record<string, string>>
  signal?: AbortSignal
}
export type ReplaceAssemblyResult = Wire171
export type ReplaceAssemblyError = Wire5862
export type ReplayAssemblyParams = Wire5863
export interface ReplayAssemblyInput {
  path: { assemblyId: string }
  params: ReplayAssemblyParams
  signal?: AbortSignal
}
export type ReplayAssemblyResult = Wire5885
export type ReplayAssemblyError = Wire93
export type ReplayAssemblyNotificationParams = Wire5893
export interface ReplayAssemblyNotificationInput {
  path: { assemblyId: string }
  params: ReplayAssemblyNotificationParams
  signal?: AbortSignal
}
export type ReplayAssemblyNotificationResult = Wire5901
export type ReplayAssemblyNotificationError = Wire93
export type ShowAuthKeySecretParams = Wire5905
export interface ShowAuthKeySecretInput {
  path: { authKeyId: string }
  params: ShowAuthKeySecretParams
  signal?: AbortSignal
}
export type ShowAuthKeySecretResult = Wire5909
export type ShowAuthKeySecretError = Wire5916
export type UpdateAuthKeyParams = Wire5923
export interface UpdateAuthKeyInput {
  path: { authKeyId: string }
  params: UpdateAuthKeyParams
  signal?: AbortSignal
}
export type UpdateAuthKeyResult = Wire5940
export type UpdateAuthKeyError = Wire5962
export type UpdateTemplateParams = Wire5969
export interface UpdateTemplateInput {
  path: { templateIdOrName: string }
  params: UpdateTemplateParams
  signal?: AbortSignal
}
export type UpdateTemplateResult = Wire6013
export type UpdateTemplateError = Wire6032
export type UpdateTemplateCredentialParams = Wire6033
export interface UpdateTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: UpdateTemplateCredentialParams
  signal?: AbortSignal
}
export type UpdateTemplateCredentialResult = Wire6045
export type UpdateTemplateCredentialError = Wire6078
export class ContractClient extends ContractTransport {
  constructor(options: ContractClientOptions) {
    super(
      options,
      {
        algorithms: ['sha384', 'sha256', 'sha1'],
        defaultAlgorithm: 'sha384',
        digestEncoding: 'hex',
        inputEncoding: 'utf8',
        kind: 'hmac',
        prefixSeparator: ':',
        signedValue: 'exact-serialized-params',
      },
      'https://api2.transloadit.com',
    )
  }
  assemblyStats(input: AssemblyStatsInput): Promise<AssemblyStatsResult> {
    return this.request<AssemblyStatsResult>(
      {
        id: 'api2.assembly-stats',
        method: 'GET',
        path: '/assembly_stats',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  bulkDeleteDamAssets(input: BulkDeleteDamAssetsInput): Promise<BulkDeleteDamAssetsResult> {
    return this.request<BulkDeleteDamAssetsResult>(
      {
        id: 'api2.bulk-delete-dam-assets',
        method: 'POST',
        path: '/dam/assets/bulk/delete',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  bulkMoveDamAssets(input: BulkMoveDamAssetsInput): Promise<BulkMoveDamAssetsResult> {
    return this.request<BulkMoveDamAssetsResult>(
      {
        id: 'api2.bulk-move-dam-assets',
        method: 'POST',
        path: '/dam/assets/bulk/move',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  cancelAssembly(input: CancelAssemblyInput): Promise<CancelAssemblyResult> {
    return this.request<CancelAssemblyResult>(
      {
        id: 'api2.cancel-assembly',
        method: 'DELETE',
        path: '/assemblies/{assemblyId}',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'none' },
        request: { kind: 'dispatch-only' },
      },
      input,
    )
  }
  createAssembly(input: CreateAssemblyInput): Promise<CreateAssemblyResult> {
    return this.request<CreateAssemblyResult>(
      {
        id: 'api2.create-assembly',
        method: 'POST',
        path: '/assemblies',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'multipart/form-data',
          },
        },
      },
      input,
    )
  }
  createAuthKey(input: CreateAuthKeyInput): Promise<CreateAuthKeyResult> {
    return this.request<CreateAuthKeyResult>(
      {
        id: 'api2.create-auth-key',
        method: 'POST',
        path: '/auth_keys',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  createTemplate(input: CreateTemplateInput): Promise<CreateTemplateResult> {
    return this.request<CreateTemplateResult>(
      {
        id: 'api2.create-template',
        method: 'POST',
        path: '/templates',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  createTemplateCredential(
    input: CreateTemplateCredentialInput,
  ): Promise<CreateTemplateCredentialResult> {
    return this.request<CreateTemplateCredentialResult>(
      {
        id: 'api2.create-template-credential',
        method: 'POST',
        path: '/template_credentials',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  deleteAuthKey(input: DeleteAuthKeyInput): Promise<DeleteAuthKeyResult> {
    return this.request<DeleteAuthKeyResult>(
      {
        id: 'api2.delete-auth-key',
        method: 'DELETE',
        path: '/auth_keys/{authKeyId}',
        pathParameters: [{ name: 'authKeyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  deleteDamAsset(input: DeleteDamAssetInput): Promise<DeleteDamAssetResult> {
    return this.request<DeleteDamAssetResult>(
      {
        id: 'api2.delete-dam-asset',
        method: 'DELETE',
        path: '/dam/assets/{assetId}',
        pathParameters: [{ name: 'assetId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  deleteTemplate(input: DeleteTemplateInput): Promise<DeleteTemplateResult> {
    return this.request<DeleteTemplateResult>(
      {
        id: 'api2.delete-template',
        method: 'DELETE',
        path: '/templates/{templateIdOrName}',
        pathParameters: [{ name: 'templateIdOrName', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  deleteTemplateCredential(
    input: DeleteTemplateCredentialInput,
  ): Promise<DeleteTemplateCredentialResult> {
    return this.request<DeleteTemplateCredentialResult>(
      {
        id: 'api2.delete-template-credential',
        method: 'DELETE',
        path: '/template_credentials/{templateCredentialId}',
        pathParameters: [{ name: 'templateCredentialId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  getAssembly(input: GetAssemblyInput): Promise<GetAssemblyResult> {
    return this.request<GetAssemblyResult>(
      {
        id: 'api2.get-assembly',
        method: 'GET',
        path: '/assemblies/{assemblyId}',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'none' },
        request: { kind: 'dispatch-only' },
      },
      input,
    )
  }
  getBill(input: GetBillInput): Promise<GetBillResult> {
    return this.request<GetBillResult>(
      {
        id: 'api2.get-bill',
        method: 'GET',
        path: '/bill/{billYearMonth}',
        pathParameters: [{ name: 'billYearMonth', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  getDamAsset(input: GetDamAssetInput): Promise<GetDamAssetResult> {
    return this.request<GetDamAssetResult>(
      {
        id: 'api2.get-dam-asset',
        method: 'GET',
        path: '/dam/assets/{assetId}',
        pathParameters: [{ name: 'assetId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  getTemplate(input: GetTemplateInput): Promise<GetTemplateResult> {
    return this.request<GetTemplateResult>(
      {
        id: 'api2.get-template',
        method: 'GET',
        path: '/templates/{templateIdOrName}',
        pathParameters: [{ name: 'templateIdOrName', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  getTemplateCredential(input: GetTemplateCredentialInput): Promise<GetTemplateCredentialResult> {
    return this.request<GetTemplateCredentialResult>(
      {
        id: 'api2.get-template-credential',
        method: 'GET',
        path: '/template_credentials/{templateCredentialId}',
        pathParameters: [{ name: 'templateCredentialId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  issueBearerToken(input: IssueBearerTokenInput): Promise<IssueBearerTokenResult> {
    return this.request<IssueBearerTokenResult>(
      {
        id: 'api2.issue-bearer-token',
        method: 'POST',
        path: '/token',
        pathParameters: [],
        auth: { kind: 'basic' },
        request: { kind: 'form', mediaType: 'application/x-www-form-urlencoded' },
      },
      input,
    )
  }
  listAssemblies(input: ListAssembliesInput): Promise<ListAssembliesResult> {
    return this.request<ListAssembliesResult>(
      {
        id: 'api2.list-assemblies',
        method: 'GET',
        path: '/assemblies',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listAssemblyNotifications(
    input: ListAssemblyNotificationsInput,
  ): Promise<ListAssemblyNotificationsResult> {
    return this.request<ListAssemblyNotificationsResult>(
      {
        id: 'api2.list-assembly-notifications',
        method: 'GET',
        path: '/assembly_notifications/{assemblyId}',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'none' },
        request: { kind: 'dispatch-only' },
      },
      input,
    )
  }
  listAuthKeyScopes(input: ListAuthKeyScopesInput): Promise<ListAuthKeyScopesResult> {
    return this.request<ListAuthKeyScopesResult>(
      {
        id: 'api2.list-auth-key-scopes',
        method: 'GET',
        path: '/auth_keys/scopes',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listAuthKeys(input: ListAuthKeysInput): Promise<ListAuthKeysResult> {
    return this.request<ListAuthKeysResult>(
      {
        id: 'api2.list-auth-keys',
        method: 'GET',
        path: '/auth_keys',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listDamAssets(input: ListDamAssetsInput): Promise<ListDamAssetsResult> {
    return this.request<ListDamAssetsResult>(
      {
        id: 'api2.list-dam-assets',
        method: 'GET',
        path: '/dam/assets',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listPriorityJobSlots(input: ListPriorityJobSlotsInput): Promise<ListPriorityJobSlotsResult> {
    return this.request<ListPriorityJobSlotsResult>(
      {
        id: 'api2.list-priority-job-slots',
        method: 'GET',
        path: '/queues/job_slots',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listTemplateCredentialTypes(
    input: ListTemplateCredentialTypesInput,
  ): Promise<ListTemplateCredentialTypesResult> {
    return this.request<ListTemplateCredentialTypesResult>(
      {
        id: 'api2.list-template-credential-types',
        method: 'GET',
        path: '/template_credentials/types',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listTemplateCredentials(
    input: ListTemplateCredentialsInput,
  ): Promise<ListTemplateCredentialsResult> {
    return this.request<ListTemplateCredentialsResult>(
      {
        id: 'api2.list-template-credentials',
        method: 'GET',
        path: '/template_credentials',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  listTemplates(input: ListTemplatesInput): Promise<ListTemplatesResult> {
    return this.request<ListTemplatesResult>(
      {
        id: 'api2.list-templates',
        method: 'GET',
        path: '/templates',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  moveDamAsset(input: MoveDamAssetInput): Promise<MoveDamAssetResult> {
    return this.request<MoveDamAssetResult>(
      {
        id: 'api2.move-dam-asset',
        method: 'PATCH',
        path: '/dam/assets/{assetId}',
        pathParameters: [{ name: 'assetId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  moveDamEntry(input: MoveDamEntryInput): Promise<MoveDamEntryResult> {
    return this.request<MoveDamEntryResult>(
      {
        id: 'api2.move-dam-entry',
        method: 'POST',
        path: '/dam/entries/move',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  priorityJobSlotStats(input: PriorityJobSlotStatsInput): Promise<PriorityJobSlotStatsResult> {
    return this.request<PriorityJobSlotStatsResult>(
      {
        id: 'api2.priority-job-slot-stats',
        method: 'GET',
        path: '/priority_job_slot_stats',
        pathParameters: [],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: { kind: 'query', paramsField: 'params', signatureField: 'signature' },
        },
      },
      input,
    )
  }
  replaceAssembly(input: ReplaceAssemblyInput): Promise<ReplaceAssemblyResult> {
    return this.request<ReplaceAssemblyResult>(
      {
        id: 'api2.replace-assembly',
        method: 'PUT',
        path: '/assemblies/{assemblyId}',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'multipart/form-data',
          },
        },
      },
      input,
    )
  }
  replayAssembly(input: ReplayAssemblyInput): Promise<ReplayAssemblyResult> {
    return this.request<ReplayAssemblyResult>(
      {
        id: 'api2.replay-assembly',
        method: 'POST',
        path: '/assemblies/{assemblyId}/replay',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  replayAssemblyNotification(
    input: ReplayAssemblyNotificationInput,
  ): Promise<ReplayAssemblyNotificationResult> {
    return this.request<ReplayAssemblyNotificationResult>(
      {
        id: 'api2.replay-assembly-notification',
        method: 'POST',
        path: '/assembly_notifications/{assemblyId}/replay',
        pathParameters: [{ name: 'assemblyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  showAuthKeySecret(input: ShowAuthKeySecretInput): Promise<ShowAuthKeySecretResult> {
    return this.request<ShowAuthKeySecretResult>(
      {
        id: 'api2.show-auth-key-secret',
        method: 'POST',
        path: '/auth_keys/show_secret/{authKeyId}',
        pathParameters: [{ name: 'authKeyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  updateAuthKey(input: UpdateAuthKeyInput): Promise<UpdateAuthKeyResult> {
    return this.request<UpdateAuthKeyResult>(
      {
        id: 'api2.update-auth-key',
        method: 'PUT',
        path: '/auth_keys/{authKeyId}',
        pathParameters: [{ name: 'authKeyId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  updateTemplate(input: UpdateTemplateInput): Promise<UpdateTemplateResult> {
    return this.request<UpdateTemplateResult>(
      {
        id: 'api2.update-template',
        method: 'PUT',
        path: '/templates/{templateIdOrName}',
        pathParameters: [{ name: 'templateIdOrName', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
  updateTemplateCredential(
    input: UpdateTemplateCredentialInput,
  ): Promise<UpdateTemplateCredentialResult> {
    return this.request<UpdateTemplateCredentialResult>(
      {
        id: 'api2.update-template-credential',
        method: 'PUT',
        path: '/template_credentials/{templateCredentialId}',
        pathParameters: [{ name: 'templateCredentialId', percentDecode: false }],
        auth: { kind: 'api-key', bearerBypassesSignature: true },
        request: {
          kind: 'normalized-params',
          transport: {
            kind: 'form',
            paramsField: 'params',
            signatureField: 'signature',
            mediaType: 'application/x-www-form-urlencoded',
          },
        },
      },
      input,
    )
  }
}
