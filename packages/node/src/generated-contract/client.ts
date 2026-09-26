// Generated from API2 contract a3d79872eb285e056f5b5849b3dd34bd0ebd7b1137e9d234634c8395aae9d64a. Do not edit.
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
type Wire1326 = Wire1327 | Wire1363
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
  auth?: Wire1359
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
type Wire1359 = { max_number_of_files?: Wire1360; max_size?: Wire1361; referer?: Wire1362 }
type Wire1360 = number
type Wire1361 = number
type Wire1362 = string
type Wire1363 = {
  emit_execution_progress?: Wire1364
  exiftool_stack?: Wire1365
  ffmpeg_stack?: Wire1366
  fields?: Wire1367
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire1369
  mplayer_stack?: Wire1370
  nonce?: Wire1371
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire1374
  response_headers?: Wire1344
  steps?: Wire1375
  template_id?: Wire4922
  usage_tags?: Wire4923
  auth?: Wire4924
}
type Wire1364 = boolean
type Wire1365 = string
type Wire1366 = string
type Wire1367 = { [key: string]: Wire1368 | undefined }
type Wire1368 = JsonValue
type Wire1369 = string
type Wire1370 = string
type Wire1371 = Wire1372 | Wire1373
type Wire1372 = string
type Wire1373 = number
type Wire1374 = string
type Wire1375 = Wire1376
type Wire1376 = { [key: string]: Wire1377 | undefined }
type Wire1377 =
  | Wire1378
  | Wire1445
  | Wire1457
  | Wire1639
  | Wire1666
  | Wire1684
  | Wire1686
  | Wire1692
  | Wire1705
  | Wire1839
  | Wire1870
  | Wire1913
  | Wire1944
  | Wire1959
  | Wire1969
  | Wire1976
  | Wire2015
  | Wire2046
  | Wire2076
  | Wire2096
  | Wire2113
  | Wire2134
  | Wire2161
  | Wire2182
  | Wire2184
  | Wire2217
  | Wire2273
  | Wire2284
  | Wire2295
  | Wire2327
  | Wire2329
  | Wire2336
  | Wire2410
  | Wire2426
  | Wire2428
  | Wire2430
  | Wire2458
  | Wire2474
  | Wire2567
  | Wire2579
  | Wire2712
  | Wire2725
  | Wire2735
  | Wire2737
  | Wire2765
  | Wire2790
  | Wire2800
  | Wire2822
  | Wire2861
  | Wire2903
  | Wire2949
  | Wire2963
  | Wire2986
  | Wire3002
  | Wire3028
  | Wire3054
  | Wire3088
  | Wire3106
  | Wire3175
  | Wire3177
  | Wire3202
  | Wire3495
  | Wire3499
  | Wire3516
  | Wire3538
  | Wire3565
  | Wire3613
  | Wire3618
  | Wire3640
  | Wire3660
  | Wire3686
  | Wire3706
  | Wire3727
  | Wire3749
  | Wire3767
  | Wire3785
  | Wire3792
  | Wire4261
  | Wire4281
  | Wire4302
  | Wire4309
  | Wire4317
  | Wire4339
  | Wire4341
  | Wire4381
  | Wire4386
  | Wire4408
  | Wire4516
  | Wire4571
  | Wire4619
  | Wire4670
  | Wire4675
  | Wire4741
  | Wire4804
  | Wire4825
  | Wire4858
  | Wire4878
  | Wire4902
type Wire1378 = {
  asset_id?: Wire1379
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path: Wire1426
  queue?: Wire1429
  recursive?: Wire1432
  result?: Wire1436
  robot: Wire1441
  user_meta?: Wire1442
  version_id?: Wire1444
}
type Wire1379 = never
type Wire1380 = Wire1381 | Wire1382
type Wire1381 = string
type Wire1382 = Wire1383 | Wire1384
type Wire1383 = boolean
type Wire1384 = 'false' | 'true'
type Wire1385 = Wire1386 | Wire1397
type Wire1386 = Wire1387 | Wire1388 | Wire1391
type Wire1387 = string
type Wire1388 = Wire1389 | Wire1390
type Wire1389 = string
type Wire1390 = string
type Wire1391 = Wire1392 | Wire1393
type Wire1392 = string
type Wire1393 = Array<Wire1394>
type Wire1394 = Wire1395 | Wire1396
type Wire1395 = string
type Wire1396 = string
type Wire1397 = null
type Wire1398 = Wire1399 | Wire1400
type Wire1399 = string
type Wire1400 = Wire1401 | Wire1402
type Wire1401 = boolean
type Wire1402 = Array<Wire1403>
type Wire1403 = 'execute' | 'import' | 'meta'
type Wire1404 = Wire1405 | Wire1406
type Wire1405 = string
type Wire1406 = Array<Wire1407>
type Wire1407 = Wire1408 | Wire1409
type Wire1408 = string
type Wire1409 = 'meta'
type Wire1410 = Wire1411 | Wire1414
type Wire1411 = Wire1412 | Wire1413
type Wire1412 = boolean
type Wire1413 = 'false' | 'true'
type Wire1414 = { [key: string]: Wire1415 | undefined }
type Wire1415 = Wire1416 | Wire1417
type Wire1416 = boolean
type Wire1417 = 'false' | 'true'
type Wire1418 = Wire1419 | Wire1420 | Wire1421 | Wire1391
type Wire1419 = string
type Wire1420 = { [key: string]: Wire1421 | undefined }
type Wire1421 = Wire1422 | Wire1423
type Wire1422 = string
type Wire1423 = Wire1424 | Wire1425
type Wire1424 = boolean
type Wire1425 = 'false' | 'true'
type Wire1426 = Wire1427 | Wire1428
type Wire1427 = string
type Wire1428 = string
type Wire1429 = Wire1430 | Wire1431
type Wire1430 = string
type Wire1431 = 'batch'
type Wire1432 = Wire1433 | Wire1434 | Wire1435
type Wire1433 = boolean
type Wire1434 = 'false' | 'true'
type Wire1435 = string
type Wire1436 = Wire1437 | Wire1438
type Wire1437 = string
type Wire1438 = Wire1439 | Wire1440
type Wire1439 = boolean
type Wire1440 = 'false' | 'true'
type Wire1441 = '/transloadit/import'
type Wire1442 = { [key: string]: Wire1443 | undefined }
type Wire1443 = JsonValue
type Wire1444 = never
type Wire1445 = {
  asset_id: Wire1446
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire1449
  queue?: Wire1429
  recursive?: Wire1450
  result?: Wire1436
  robot: Wire1441
  user_meta?: Wire1442
  version_id?: Wire1454
}
type Wire1446 = Wire1447 | Wire1448
type Wire1447 = string
type Wire1448 = string
type Wire1449 = never
type Wire1450 = Wire1451 | Wire1452 | Wire1453
type Wire1451 = false
type Wire1452 = 'false'
type Wire1453 = string
type Wire1454 = Wire1455 | Wire1456
type Wire1455 = string
type Wire1456 = string
type Wire1457 = {
  change_format_if_necessary?: Wire1458
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  method?: Wire1617
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1623
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1458 = Wire1459 | Wire1460
type Wire1459 = string
type Wire1460 = Wire1461 | Wire1462
type Wire1461 = boolean
type Wire1462 = 'false' | 'true'
type Wire1463 = Wire1464 | Wire1465
type Wire1464 = string
type Wire1465 = {
  ac?: Wire1466
  af?: Wire1470
  an?: Wire1421
  ar?: Wire1466
  async?: Wire1466
  b?: Wire1473
  'b:a'?: Wire1481
  'b:v'?: Wire1481
  bits_per_mb?: Wire1481
  bt?: Wire1486
  bufsize?: Wire1481
  c?: Wire1491
  'c:a'?: Wire1494
  'c:v'?: Wire1497
  codec?: Wire1500
  'codec:a'?: Wire1509
  'codec:v'?: Wire1512
  coder?: Wire1466
  'cpu-used'?: Wire1515
  crf?: Wire1466
  deadline?: Wire1518
  f?: Wire1521
  'filter:a'?: Wire1524
  'filter:v'?: Wire1527
  filter_complex?: Wire1530
  flags?: Wire1539
  g?: Wire1466
  i_qfactor?: Wire1481
  keyint_min?: Wire1466
  level?: Wire1481
  'level:v'?: Wire1481
  map?: Wire1542
  maxrate?: Wire1481
  me_range?: Wire1466
  movflags?: Wire1547
  'overshoot-pct'?: Wire1466
  partitions?: Wire1550
  pix_fmt?: Wire1553
  preset?: Wire1481
  profile?: Wire1556
  'profile:v'?: Wire1559
  'q:a'?: Wire1466
  qcomp?: Wire1481
  qdiff?: Wire1466
  qmax?: Wire1466
  qmin?: Wire1466
  'qscale:a'?: Wire1466
  'qscale:v'?: Wire1466
  r?: Wire1564
  rc_eq?: Wire1571
  refs?: Wire1466
  'row-mt'?: Wire1466
  s?: Wire1574
  sc_threshold?: Wire1466
  shortest?: Wire1577
  ss?: Wire1481
  'svtav1-params'?: Wire1579
  sws_flags?: Wire1582
  t?: Wire1481
  threads?: Wire1466
  to?: Wire1481
  transloaditffpreset?: Wire1585
  trellis?: Wire1466
  'undershoot-pct'?: Wire1466
  vbr?: Wire1481
  vendor?: Wire1588
  vf?: Wire1591
  vn?: Wire1421
  'x264-params'?: Wire1594
  x264opts?: Wire1597
  'x265-params'?: Wire1600
  [key: string]:
    | JsonValue
    | Wire1466
    | Wire1470
    | Wire1421
    | Wire1466
    | Wire1466
    | Wire1473
    | Wire1481
    | Wire1481
    | Wire1481
    | Wire1486
    | Wire1481
    | Wire1491
    | Wire1494
    | Wire1497
    | Wire1500
    | Wire1509
    | Wire1512
    | Wire1466
    | Wire1515
    | Wire1466
    | Wire1518
    | Wire1521
    | Wire1524
    | Wire1527
    | Wire1530
    | Wire1539
    | Wire1466
    | Wire1481
    | Wire1466
    | Wire1481
    | Wire1481
    | Wire1542
    | Wire1481
    | Wire1466
    | Wire1547
    | Wire1466
    | Wire1550
    | Wire1553
    | Wire1481
    | Wire1556
    | Wire1559
    | Wire1466
    | Wire1481
    | Wire1466
    | Wire1466
    | Wire1466
    | Wire1466
    | Wire1466
    | Wire1564
    | Wire1571
    | Wire1466
    | Wire1466
    | Wire1574
    | Wire1466
    | Wire1577
    | Wire1481
    | Wire1579
    | Wire1582
    | Wire1481
    | Wire1466
    | Wire1481
    | Wire1585
    | Wire1466
    | Wire1466
    | Wire1481
    | Wire1588
    | Wire1591
    | Wire1421
    | Wire1594
    | Wire1597
    | Wire1600
    | undefined
}
type Wire1466 = Wire1467 | Wire1468 | Wire1469
type Wire1467 = string
type Wire1468 = string
type Wire1469 = number
type Wire1470 = Wire1471 | Wire1472
type Wire1471 = string
type Wire1472 = string
type Wire1473 = Wire1474 | Wire1475 | Wire1478
type Wire1474 = string
type Wire1475 = Wire1476 | Wire1477
type Wire1476 = string
type Wire1477 = { a?: Wire1466; v?: Wire1466 }
type Wire1478 = Wire1479 | Wire1480
type Wire1479 = string
type Wire1480 = string
type Wire1481 = Wire1482 | Wire1483 | Wire1466
type Wire1482 = string
type Wire1483 = Wire1484 | Wire1485
type Wire1484 = string
type Wire1485 = string
type Wire1486 = Wire1487 | Wire1466 | Wire1488
type Wire1487 = string
type Wire1488 = Wire1489 | Wire1490
type Wire1489 = string
type Wire1490 = string
type Wire1491 = Wire1492 | Wire1493
type Wire1492 = string
type Wire1493 = string
type Wire1494 = Wire1495 | Wire1496
type Wire1495 = string
type Wire1496 = string
type Wire1497 = Wire1498 | Wire1499
type Wire1498 = string
type Wire1499 = string
type Wire1500 = Wire1501 | Wire1502
type Wire1501 = string
type Wire1502 = { a?: Wire1503; v?: Wire1506 }
type Wire1503 = Wire1504 | Wire1505
type Wire1504 = string
type Wire1505 = string
type Wire1506 = Wire1507 | Wire1508
type Wire1507 = string
type Wire1508 = string
type Wire1509 = Wire1510 | Wire1511
type Wire1510 = string
type Wire1511 = string
type Wire1512 = Wire1513 | Wire1514
type Wire1513 = string
type Wire1514 = string
type Wire1515 = Wire1516 | Wire1517
type Wire1516 = string
type Wire1517 = string
type Wire1518 = Wire1519 | Wire1520
type Wire1519 = string
type Wire1520 = string
type Wire1521 = Wire1522 | Wire1523
type Wire1522 = string
type Wire1523 = string
type Wire1524 = Wire1525 | Wire1526
type Wire1525 = string
type Wire1526 = string
type Wire1527 = Wire1528 | Wire1529
type Wire1528 = string
type Wire1529 = string
type Wire1530 = Wire1531 | Wire1532 | Wire1535
type Wire1531 = string
type Wire1532 = Wire1533 | Wire1534
type Wire1533 = string
type Wire1534 = string
type Wire1535 = { [key: string]: Wire1536 | undefined }
type Wire1536 = Wire1537 | Wire1538
type Wire1537 = string
type Wire1538 = string
type Wire1539 = Wire1540 | Wire1541
type Wire1540 = string
type Wire1541 = string
type Wire1542 = Wire1543 | Wire1544 | Wire1391
type Wire1543 = string
type Wire1544 = Wire1545 | Wire1546
type Wire1545 = string
type Wire1546 = string
type Wire1547 = Wire1548 | Wire1549
type Wire1548 = string
type Wire1549 = string
type Wire1550 = Wire1551 | Wire1552
type Wire1551 = string
type Wire1552 = string
type Wire1553 = Wire1554 | Wire1555
type Wire1554 = string
type Wire1555 = string
type Wire1556 = Wire1557 | Wire1558
type Wire1557 = string
type Wire1558 = string
type Wire1559 = Wire1560 | Wire1466 | Wire1561
type Wire1560 = string
type Wire1561 = Wire1562 | Wire1563
type Wire1562 = string
type Wire1563 = 'baseline' | 'high' | 'main' | 'main10'
type Wire1564 = Wire1565 | Wire1570
type Wire1565 = Wire1566 | Wire1466 | Wire1567
type Wire1566 = string
type Wire1567 = Wire1568 | Wire1569
type Wire1568 = string
type Wire1569 = string
type Wire1570 = null
type Wire1571 = Wire1572 | Wire1573
type Wire1572 = string
type Wire1573 = string
type Wire1574 = Wire1575 | Wire1576
type Wire1575 = string
type Wire1576 = string
type Wire1577 = Wire1421 | Wire1578
type Wire1578 = null
type Wire1579 = Wire1580 | Wire1581
type Wire1580 = string
type Wire1581 = {
  'enable-qm'?: Wire1466
  'fast-decode'?: Wire1466
  'film-grain-denoise'?: Wire1466
  tune?: Wire1466
}
type Wire1582 = Wire1583 | Wire1584
type Wire1583 = string
type Wire1584 = string
type Wire1585 = Wire1586 | Wire1587
type Wire1586 = string
type Wire1587 = 'empty'
type Wire1588 = Wire1589 | Wire1590
type Wire1589 = string
type Wire1590 = string
type Wire1591 = Wire1592 | Wire1593
type Wire1592 = string
type Wire1593 = string
type Wire1594 = Wire1595 | Wire1596
type Wire1595 = string
type Wire1596 = string
type Wire1597 = Wire1598 | Wire1599
type Wire1598 = string
type Wire1599 = string
type Wire1600 = Wire1601 | Wire1602
type Wire1601 = string
type Wire1602 = {
  'b-adapt'?: Wire1466
  'rc-lookahead'?: Wire1466
  'vbv-bufsize'?: Wire1466
  'vbv-maxrate'?: Wire1466
}
type Wire1603 = Wire1604 | Wire1605 | Wire1608
type Wire1604 = string
type Wire1605 = Wire1606 | Wire1607
type Wire1606 = string
type Wire1607 = 'v6' | 'v7' | 'v8'
type Wire1608 = Wire1609 | Wire1610
type Wire1609 = string
type Wire1610 = string
type Wire1611 = Wire1612 | Wire1613
type Wire1612 = string
type Wire1613 = Wire1614 | Wire1615
type Wire1614 = boolean
type Wire1615 = Array<Wire1616>
type Wire1616 = 'execute' | 'meta'
type Wire1617 = Wire1618 | Wire1619
type Wire1618 = string
type Wire1619 = 'extract' | 'insert'
type Wire1620 = Wire1621 | Wire1622
type Wire1621 = string
type Wire1622 =
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
type Wire1623 = '/audio/artwork'
type Wire1624 = Wire1625 | Wire1634
type Wire1625 = Wire1626 | Wire1627 | Wire1629
type Wire1626 = string
type Wire1627 = Array<Wire1628>
type Wire1628 = string
type Wire1629 = Array<Wire1630>
type Wire1630 = { as?: Wire1631; fields?: Wire1632; name: Wire1633 }
type Wire1631 = string
type Wire1632 = string
type Wire1633 = string
type Wire1634 = {
  bundle_steps?: Wire1635
  fields?: Wire1636
  group_by_original?: Wire1638
  steps: Wire1625
}
type Wire1635 = boolean
type Wire1636 = Array<Wire1637>
type Wire1637 = string
type Wire1638 = boolean
type Wire1639 = {
  audio_fade_seconds?: Wire1640
  bitrate?: Wire1644
  crossfade?: Wire1648
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1653
  robot: Wire1658
  sample_rate?: Wire1659
  sort_by?: Wire1663
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1640 = Wire1641 | Wire1642 | Wire1643
type Wire1641 = string
type Wire1642 = string
type Wire1643 = number
type Wire1644 = Wire1645 | Wire1646 | Wire1647
type Wire1645 = string
type Wire1646 = string
type Wire1647 = number
type Wire1648 = Wire1649 | Wire1650
type Wire1649 = string
type Wire1650 = Wire1651 | Wire1652
type Wire1651 = boolean
type Wire1652 = 'false' | 'true'
type Wire1653 = Wire1654 | Wire1655
type Wire1654 = string
type Wire1655 = Wire1656 | Wire1657
type Wire1656 = boolean
type Wire1657 = 'false' | 'true'
type Wire1658 = '/audio/concat'
type Wire1659 = Wire1660 | Wire1661 | Wire1662
type Wire1660 = string
type Wire1661 = string
type Wire1662 = number
type Wire1663 = Wire1664 | Wire1665
type Wire1664 = string
type Wire1665 = 'auto' | 'basename' | 'import_order'
type Wire1666 = {
  bitrate?: Wire1644
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1653
  robot: Wire1667
  sample_rate?: Wire1659
  segments: Wire1668
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1667 = '/audio/split'
type Wire1668 = Wire1669 | Wire1670
type Wire1669 = string
type Wire1670 = Array<Wire1671>
type Wire1671 = Wire1672 | Wire1673
type Wire1672 = string
type Wire1673 = { from: Wire1674; to: Wire1679 }
type Wire1674 = Wire1675 | Wire1466 | Wire1676
type Wire1675 = string
type Wire1676 = Wire1677 | Wire1678
type Wire1677 = string
type Wire1678 = string
type Wire1679 = Wire1680 | Wire1466 | Wire1681
type Wire1680 = string
type Wire1681 = Wire1682 | Wire1683
type Wire1682 = string
type Wire1683 = string
type Wire1684 = {
  bitrate?: Wire1644
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1653
  robot: Wire1685
  sample_rate?: Wire1659
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1685 = '/audio/encode'
type Wire1686 = {
  bitrate?: Wire1644
  duration?: Wire1687
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1691
  sample_rate?: Wire1659
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1687 = Wire1688 | Wire1689 | Wire1690
type Wire1688 = string
type Wire1689 = string
type Wire1690 = number
type Wire1691 = '/audio/loop'
type Wire1692 = {
  bitrate?: Wire1644
  duration?: Wire1693
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  loop?: Wire1696
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1701
  sample_rate?: Wire1659
  use?: Wire1624
  user_meta?: Wire1442
  volume?: Wire1702
}
type Wire1693 = Wire1694 | Wire1695
type Wire1694 = string
type Wire1695 = 'first' | 'longest' | 'shortest'
type Wire1696 = Wire1697 | Wire1698
type Wire1697 = string
type Wire1698 = Wire1699 | Wire1700
type Wire1699 = boolean
type Wire1700 = 'false' | 'true'
type Wire1701 = '/audio/merge'
type Wire1702 = Wire1703 | Wire1704
type Wire1703 = string
type Wire1704 = 'average' | 'sum'
type Wire1705 = {
  amplitude_scale?: Wire1706
  antialiasing?: Wire1710
  axis_label_color?: Wire1718
  background_color?: Wire1721
  bar_gap?: Wire1724
  bar_style?: Wire1728
  bar_width?: Wire1731
  bits?: Wire1735
  border_color?: Wire1743
  center_color?: Wire1746
  color_map?: Wire1749
  colors?: Wire1752
  compression?: Wire1755
  end?: Wire1759
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  format?: Wire1763
  frequency_max?: Wire1766
  frequency_min?: Wire1770
  frequency_scale?: Wire1774
  gain?: Wire1777
  height?: Wire1781
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  legend?: Wire1785
  no_axis_labels?: Wire1790
  orientation?: Wire1795
  outer_color?: Wire1798
  output_meta?: Wire1418
  pixels_per_second?: Wire1801
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1805
  split_channels?: Wire1806
  start?: Wire1811
  style?: Wire1815
  use?: Wire1624
  user_meta?: Wire1442
  waveform_style?: Wire1823
  width?: Wire1826
  with_axis_labels?: Wire1830
  zoom?: Wire1835
}
type Wire1706 = Wire1707 | Wire1708 | Wire1709
type Wire1707 = string
type Wire1708 = string
type Wire1709 = number
type Wire1710 = Wire1711 | Wire1712 | Wire1715 | Wire1421
type Wire1711 = string
type Wire1712 = Wire1713 | Wire1714
type Wire1713 = string
type Wire1714 = 0
type Wire1715 = Wire1716 | Wire1717
type Wire1716 = string
type Wire1717 = 1
type Wire1718 = Wire1719 | Wire1720
type Wire1719 = string
type Wire1720 = string
type Wire1721 = Wire1722 | Wire1723
type Wire1722 = string
type Wire1723 = string
type Wire1724 = Wire1725 | Wire1726 | Wire1727
type Wire1725 = string
type Wire1726 = string
type Wire1727 = number
type Wire1728 = Wire1729 | Wire1730
type Wire1729 = string
type Wire1730 = 'rounded' | 'square'
type Wire1731 = Wire1732 | Wire1733 | Wire1734
type Wire1732 = string
type Wire1733 = string
type Wire1734 = number
type Wire1735 = Wire1736 | Wire1737 | Wire1740
type Wire1736 = string
type Wire1737 = Wire1738 | Wire1739
type Wire1738 = string
type Wire1739 = 8
type Wire1740 = Wire1741 | Wire1742
type Wire1741 = string
type Wire1742 = 16
type Wire1743 = Wire1744 | Wire1745
type Wire1744 = string
type Wire1745 = string
type Wire1746 = Wire1747 | Wire1748
type Wire1747 = string
type Wire1748 = string
type Wire1749 = Wire1750 | Wire1751
type Wire1750 = string
type Wire1751 =
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
type Wire1752 = Wire1753 | Wire1754
type Wire1753 = string
type Wire1754 = 'audacity' | 'audition'
type Wire1755 = Wire1756 | Wire1757 | Wire1758
type Wire1756 = string
type Wire1757 = string
type Wire1758 = number
type Wire1759 = Wire1760 | Wire1761 | Wire1762
type Wire1760 = string
type Wire1761 = string
type Wire1762 = number
type Wire1763 = Wire1764 | Wire1765
type Wire1764 = string
type Wire1765 = 'image' | 'json'
type Wire1766 = Wire1767 | Wire1768 | Wire1769
type Wire1767 = string
type Wire1768 = string
type Wire1769 = number
type Wire1770 = Wire1771 | Wire1772 | Wire1773
type Wire1771 = string
type Wire1772 = string
type Wire1773 = number
type Wire1774 = Wire1775 | Wire1776
type Wire1775 = string
type Wire1776 = 'linear' | 'logarithmic'
type Wire1777 = Wire1778 | Wire1779 | Wire1780
type Wire1778 = string
type Wire1779 = string
type Wire1780 = number
type Wire1781 = Wire1782 | Wire1783 | Wire1784
type Wire1782 = string
type Wire1783 = string
type Wire1784 = number
type Wire1785 = Wire1786 | Wire1787
type Wire1786 = string
type Wire1787 = Wire1788 | Wire1789
type Wire1788 = boolean
type Wire1789 = 'false' | 'true'
type Wire1790 = Wire1791 | Wire1792
type Wire1791 = string
type Wire1792 = Wire1793 | Wire1794
type Wire1793 = boolean
type Wire1794 = 'false' | 'true'
type Wire1795 = Wire1796 | Wire1797
type Wire1796 = string
type Wire1797 = 'horizontal' | 'vertical'
type Wire1798 = Wire1799 | Wire1800
type Wire1799 = string
type Wire1800 = string
type Wire1801 = Wire1802 | Wire1803 | Wire1804
type Wire1802 = string
type Wire1803 = string
type Wire1804 = number
type Wire1805 = '/audio/waveform'
type Wire1806 = Wire1807 | Wire1808
type Wire1807 = string
type Wire1808 = Wire1809 | Wire1810
type Wire1809 = boolean
type Wire1810 = 'false' | 'true'
type Wire1811 = Wire1812 | Wire1813 | Wire1814
type Wire1812 = string
type Wire1813 = string
type Wire1814 = number
type Wire1815 = Wire1816 | Wire1817
type Wire1816 = string
type Wire1817 = Wire1818 | Wire1819 | Wire1820 | Wire1821 | Wire1822
type Wire1818 = 'spectrogram' | 'v0' | 'v1'
type Wire1819 = 0
type Wire1820 = 1
type Wire1821 = '0'
type Wire1822 = '1'
type Wire1823 = Wire1824 | Wire1825
type Wire1824 = string
type Wire1825 = 'bars' | 'normal'
type Wire1826 = Wire1827 | Wire1828 | Wire1829
type Wire1827 = string
type Wire1828 = string
type Wire1829 = number
type Wire1830 = Wire1831 | Wire1832
type Wire1831 = string
type Wire1832 = Wire1833 | Wire1834
type Wire1833 = boolean
type Wire1834 = 'false' | 'true'
type Wire1835 = Wire1836 | Wire1837 | Wire1838
type Wire1836 = string
type Wire1837 = string
type Wire1838 = number
type Wire1839 = {
  account?: Wire1840
  container?: Wire1843
  credentials?: Wire1846
  files_per_page?: Wire1849
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire1853
  next_page_token?: Wire1856
  output_meta?: Wire1418
  path: Wire1859
  queue?: Wire1429
  recursive?: Wire1864
  result?: Wire1436
  robot: Wire1869
  user_meta?: Wire1442
}
type Wire1840 = Wire1841 | Wire1842
type Wire1841 = string
type Wire1842 = string
type Wire1843 = Wire1844 | Wire1845
type Wire1844 = string
type Wire1845 = string
type Wire1846 = Wire1847 | Wire1848
type Wire1847 = string
type Wire1848 = string
type Wire1849 = Wire1850 | Wire1851 | Wire1852
type Wire1850 = string
type Wire1851 = string
type Wire1852 = number
type Wire1853 = Wire1854 | Wire1855
type Wire1854 = string
type Wire1855 = string
type Wire1856 = Wire1857 | Wire1858
type Wire1857 = string
type Wire1858 = string
type Wire1859 = Wire1860 | Wire1861 | Wire1391
type Wire1860 = string
type Wire1861 = Wire1862 | Wire1863
type Wire1862 = string
type Wire1863 = string
type Wire1864 = Wire1865 | Wire1866
type Wire1865 = string
type Wire1866 = Wire1867 | Wire1868
type Wire1867 = boolean
type Wire1868 = 'false' | 'true'
type Wire1869 = '/azure/import'
type Wire1870 = {
  account?: Wire1871
  cache_control?: Wire1874
  container?: Wire1877
  content_disposition?: Wire1880
  content_encoding?: Wire1883
  content_language?: Wire1886
  content_type?: Wire1889
  credentials?: Wire1846
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire1892
  metadata?: Wire1895
  output_meta?: Wire1418
  path?: Wire1902
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1905
  sas_expires_in?: Wire1906
  sas_permissions?: Wire1910
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1871 = Wire1872 | Wire1873
type Wire1872 = string
type Wire1873 = string
type Wire1874 = Wire1875 | Wire1876
type Wire1875 = string
type Wire1876 = string
type Wire1877 = Wire1878 | Wire1879
type Wire1878 = string
type Wire1879 = string
type Wire1880 = Wire1881 | Wire1882
type Wire1881 = string
type Wire1882 = string
type Wire1883 = Wire1884 | Wire1885
type Wire1884 = string
type Wire1885 = string
type Wire1886 = Wire1887 | Wire1888
type Wire1887 = string
type Wire1888 = string
type Wire1889 = Wire1890 | Wire1891
type Wire1890 = string
type Wire1891 = string
type Wire1892 = Wire1893 | Wire1894
type Wire1893 = string
type Wire1894 = string
type Wire1895 = { [key: string]: Wire1896 | undefined }
type Wire1896 = Wire1897 | Wire1898
type Wire1897 = string
type Wire1898 = Wire1899 | Wire1900 | Wire1901
type Wire1899 = string
type Wire1900 = number
type Wire1901 = boolean
type Wire1902 = Wire1903 | Wire1904
type Wire1903 = string
type Wire1904 = string
type Wire1905 = '/azure/store'
type Wire1906 = Wire1907 | Wire1908 | Wire1909
type Wire1907 = string
type Wire1908 = string
type Wire1909 = number
type Wire1910 = Wire1911 | Wire1912
type Wire1911 = string
type Wire1912 = string
type Wire1913 = {
  app_key?: Wire1914
  app_key_id?: Wire1917
  bucket?: Wire1920
  credentials?: Wire1923
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path: Wire1930
  queue?: Wire1429
  recursive?: Wire1935
  result?: Wire1436
  robot: Wire1940
  start_file_name?: Wire1941
  user_meta?: Wire1442
}
type Wire1914 = Wire1915 | Wire1916
type Wire1915 = string
type Wire1916 = string
type Wire1917 = Wire1918 | Wire1919
type Wire1918 = string
type Wire1919 = string
type Wire1920 = Wire1921 | Wire1922
type Wire1921 = string
type Wire1922 = string
type Wire1923 = Wire1924 | Wire1925
type Wire1924 = string
type Wire1925 = string
type Wire1926 = Wire1927 | Wire1928 | Wire1929
type Wire1927 = string
type Wire1928 = string
type Wire1929 = number
type Wire1930 = Wire1931 | Wire1932 | Wire1391
type Wire1931 = string
type Wire1932 = Wire1933 | Wire1934
type Wire1933 = string
type Wire1934 = string
type Wire1935 = Wire1936 | Wire1937
type Wire1936 = string
type Wire1937 = Wire1938 | Wire1939
type Wire1938 = boolean
type Wire1939 = 'false' | 'true'
type Wire1940 = '/backblaze/import'
type Wire1941 = Wire1942 | Wire1943
type Wire1942 = string
type Wire1943 = string
type Wire1944 = {
  app_key?: Wire1945
  app_key_id?: Wire1948
  bucket?: Wire1951
  credentials?: Wire1923
  force_accept?: Wire1380
  headers?: Wire1954
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire1902
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1958
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1945 = Wire1946 | Wire1947
type Wire1946 = string
type Wire1947 = string
type Wire1948 = Wire1949 | Wire1950
type Wire1949 = string
type Wire1950 = string
type Wire1951 = Wire1952 | Wire1953
type Wire1952 = string
type Wire1953 = string
type Wire1954 = { [key: string]: Wire1955 | undefined }
type Wire1955 = Wire1956 | Wire1957
type Wire1956 = string
type Wire1957 = string
type Wire1958 = '/backblaze/store'
type Wire1959 = {
  credentials?: Wire1960
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path: Wire1963
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1968
  user_meta?: Wire1442
}
type Wire1960 = Wire1961 | Wire1962
type Wire1961 = string
type Wire1962 = string
type Wire1963 = Wire1964 | Wire1965 | Wire1391
type Wire1964 = string
type Wire1965 = Wire1966 | Wire1967
type Wire1966 = string
type Wire1967 = string
type Wire1968 = '/box/import'
type Wire1969 = {
  create_sharing_link?: Wire1970
  credentials?: Wire1960
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire1902
  queue?: Wire1429
  result?: Wire1436
  robot: Wire1975
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire1970 = Wire1971 | Wire1972
type Wire1971 = string
type Wire1972 = Wire1973 | Wire1974
type Wire1973 = boolean
type Wire1974 = 'false' | 'true'
type Wire1975 = '/box/store'
type Wire1976 = {
  bucket?: Wire1977
  bucket_region?: Wire1980
  credentials?: Wire1983
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire1986
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire1989
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2001
  result?: Wire1653
  return_file_stubs?: Wire2006
  robot: Wire2011
  secret?: Wire2012
  user_meta?: Wire1442
}
type Wire1977 = Wire1978 | Wire1979
type Wire1978 = string
type Wire1979 = string
type Wire1980 = Wire1981 | Wire1982
type Wire1981 = string
type Wire1982 = string
type Wire1983 = Wire1984 | Wire1985
type Wire1984 = string
type Wire1985 = string
type Wire1986 = Wire1987 | Wire1988
type Wire1987 = string
type Wire1988 = string
type Wire1989 = Wire1990 | Wire1991
type Wire1990 = string
type Wire1991 = string
type Wire1992 = Wire1993 | Wire1994 | Wire1995
type Wire1993 = string
type Wire1994 = string
type Wire1995 = number
type Wire1996 = Wire1997 | Wire1998 | Wire1391
type Wire1997 = string
type Wire1998 = Wire1999 | Wire2000
type Wire1999 = string
type Wire2000 = string
type Wire2001 = Wire2002 | Wire2003
type Wire2002 = string
type Wire2003 = Wire2004 | Wire2005
type Wire2004 = boolean
type Wire2005 = 'false' | 'true'
type Wire2006 = Wire2007 | Wire2008
type Wire2007 = string
type Wire2008 = Wire2009 | Wire2010
type Wire2009 = boolean
type Wire2010 = 'false' | 'true'
type Wire2011 = '/mega/import'
type Wire2012 = Wire2013 | Wire2014
type Wire2013 = string
type Wire2014 = string
type Wire2015 = {
  acl?: Wire2016
  bucket?: Wire2019
  bucket_region?: Wire2022
  credentials?: Wire1983
  force_accept?: Wire1380
  headers?: Wire2025
  host?: Wire2029
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire2032
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2038
  secret?: Wire2039
  sign_urls_for?: Wire2042
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2016 = Wire2017 | Wire2018
type Wire2017 = string
type Wire2018 = 'private' | 'public-read'
type Wire2019 = Wire2020 | Wire2021
type Wire2020 = string
type Wire2021 = string
type Wire2022 = Wire2023 | Wire2024
type Wire2023 = string
type Wire2024 = string
type Wire2025 = { [key: string]: Wire2026 | undefined }
type Wire2026 = Wire2027 | Wire2028
type Wire2027 = string
type Wire2028 = string
type Wire2029 = Wire2030 | Wire2031
type Wire2030 = string
type Wire2031 = string
type Wire2032 = Wire2033 | Wire2034
type Wire2033 = string
type Wire2034 = string
type Wire2035 = Wire2036 | Wire2037
type Wire2036 = string
type Wire2037 = string
type Wire2038 = '/mega/store'
type Wire2039 = Wire2040 | Wire2041
type Wire2040 = string
type Wire2041 = string
type Wire2042 = Wire2043 | Wire2044 | Wire2045
type Wire2043 = string
type Wire2044 = string
type Wire2045 = number
type Wire2046 = {
  account_type?: Wire2047
  container?: Wire2050
  credentials?: Wire2053
  data_center?: Wire2056
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire2059
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire2062
  queue?: Wire1429
  recursive?: Wire2067
  result?: Wire1436
  robot: Wire2072
  user?: Wire2073
  user_meta?: Wire1442
}
type Wire2047 = Wire2048 | Wire2049
type Wire2048 = string
type Wire2049 = 'uk' | 'us'
type Wire2050 = Wire2051 | Wire2052
type Wire2051 = string
type Wire2052 = string
type Wire2053 = Wire2054 | Wire2055
type Wire2054 = string
type Wire2055 = string
type Wire2056 = Wire2057 | Wire2058
type Wire2057 = string
type Wire2058 = string
type Wire2059 = Wire2060 | Wire2061
type Wire2060 = string
type Wire2061 = string
type Wire2062 = Wire2063 | Wire2064 | Wire1391
type Wire2063 = string
type Wire2064 = Wire2065 | Wire2066
type Wire2065 = string
type Wire2066 = string
type Wire2067 = Wire2068 | Wire2069
type Wire2068 = string
type Wire2069 = Wire2070 | Wire2071
type Wire2070 = boolean
type Wire2071 = 'false' | 'true'
type Wire2072 = '/cloudfiles/import'
type Wire2073 = Wire2074 | Wire2075
type Wire2074 = string
type Wire2075 = string
type Wire2076 = {
  account_type?: Wire2077
  container?: Wire2080
  credentials?: Wire2053
  data_center?: Wire2083
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire2086
  output_meta?: Wire1418
  path?: Wire2089
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2092
  use?: Wire1624
  user?: Wire2093
  user_meta?: Wire1442
}
type Wire2077 = Wire2078 | Wire2079
type Wire2078 = string
type Wire2079 = 'uk' | 'us'
type Wire2080 = Wire2081 | Wire2082
type Wire2081 = string
type Wire2082 = string
type Wire2083 = Wire2084 | Wire2085
type Wire2084 = string
type Wire2085 = string
type Wire2086 = Wire2087 | Wire2088
type Wire2087 = string
type Wire2088 = string
type Wire2089 = Wire2090 | Wire2091
type Wire2090 = string
type Wire2091 = string
type Wire2092 = '/cloudfiles/store'
type Wire2093 = Wire2094 | Wire2095
type Wire2094 = string
type Wire2095 = string
type Wire2096 = {
  bucket?: Wire2097
  credentials?: Wire2100
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire2103
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire2106
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2001
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire2109
  secret?: Wire2110
  user_meta?: Wire1442
}
type Wire2097 = Wire2098 | Wire2099
type Wire2098 = string
type Wire2099 = string
type Wire2100 = Wire2101 | Wire2102
type Wire2101 = string
type Wire2102 = string
type Wire2103 = Wire2104 | Wire2105
type Wire2104 = string
type Wire2105 = string
type Wire2106 = Wire2107 | Wire2108
type Wire2107 = string
type Wire2108 = string
type Wire2109 = '/cloudflare/import'
type Wire2110 = Wire2111 | Wire2112
type Wire2111 = string
type Wire2112 = string
type Wire2113 = {
  bucket?: Wire2114
  credentials?: Wire2100
  force_accept?: Wire1380
  headers?: Wire2117
  host?: Wire2121
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire2124
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2127
  secret?: Wire2128
  sign_urls_for?: Wire2042
  url_prefix?: Wire2131
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2114 = Wire2115 | Wire2116
type Wire2115 = string
type Wire2116 = string
type Wire2117 = { [key: string]: Wire2118 | undefined }
type Wire2118 = Wire2119 | Wire2120
type Wire2119 = string
type Wire2120 = string
type Wire2121 = Wire2122 | Wire2123
type Wire2122 = string
type Wire2123 = string
type Wire2124 = Wire2125 | Wire2126
type Wire2125 = string
type Wire2126 = string
type Wire2127 = '/cloudflare/store'
type Wire2128 = Wire2129 | Wire2130
type Wire2129 = string
type Wire2130 = string
type Wire2131 = Wire2132 | Wire2133
type Wire2132 = string
type Wire2133 = string
type Wire2134 = {
  credentials?: Wire2135
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire2138
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire2141
  queue?: Wire1429
  recursive?: Wire2146
  region?: Wire2151
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire2154
  secret?: Wire2155
  space?: Wire2158
  user_meta?: Wire1442
}
type Wire2135 = Wire2136 | Wire2137
type Wire2136 = string
type Wire2137 = string
type Wire2138 = Wire2139 | Wire2140
type Wire2139 = string
type Wire2140 = string
type Wire2141 = Wire2142 | Wire2143 | Wire1391
type Wire2142 = string
type Wire2143 = Wire2144 | Wire2145
type Wire2144 = string
type Wire2145 = string
type Wire2146 = Wire2147 | Wire2148
type Wire2147 = string
type Wire2148 = Wire2149 | Wire2150
type Wire2149 = boolean
type Wire2150 = 'false' | 'true'
type Wire2151 = Wire2152 | Wire2153
type Wire2152 = string
type Wire2153 = string
type Wire2154 = '/digitalocean/import'
type Wire2155 = Wire2156 | Wire2157
type Wire2156 = string
type Wire2157 = string
type Wire2158 = Wire2159 | Wire2160
type Wire2159 = string
type Wire2160 = string
type Wire2161 = {
  acl?: Wire2016
  credentials?: Wire2135
  force_accept?: Wire1380
  headers?: Wire2162
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire2166
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  region?: Wire2169
  result?: Wire1436
  robot: Wire2172
  secret?: Wire2173
  sign_urls_for?: Wire2042
  space?: Wire2176
  url_prefix?: Wire2179
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2162 = { [key: string]: Wire2163 | undefined }
type Wire2163 = Wire2164 | Wire2165
type Wire2164 = string
type Wire2165 = string
type Wire2166 = Wire2167 | Wire2168
type Wire2167 = string
type Wire2168 = string
type Wire2169 = Wire2170 | Wire2171
type Wire2170 = string
type Wire2171 = string
type Wire2172 = '/digitalocean/store'
type Wire2173 = Wire2174 | Wire2175
type Wire2174 = string
type Wire2175 = string
type Wire2176 = Wire2177 | Wire2178
type Wire2177 = string
type Wire2178 = string
type Wire2179 = Wire2180 | Wire2181
type Wire2180 = string
type Wire2181 = string
type Wire2182 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2183
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2183 = '/document/autorotate'
type Wire2184 = {
  force_accept?: Wire1380
  format: Wire2185
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  markdown_format?: Wire2188
  markdown_theme?: Wire2191
  output_meta?: Wire1418
  pdf_display_header_footer?: Wire2194
  pdf_footer_template?: Wire2199
  pdf_format?: Wire2202
  pdf_header_template?: Wire2205
  pdf_margin?: Wire2208
  pdf_print_background?: Wire2211
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2216
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2185 = Wire2186 | Wire2187
type Wire2186 = string
type Wire2187 =
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
type Wire2188 = Wire2189 | Wire2190
type Wire2189 = string
type Wire2190 = 'commonmark' | 'gfm'
type Wire2191 = Wire2192 | Wire2193
type Wire2192 = string
type Wire2193 = 'bare' | 'github'
type Wire2194 = Wire2195 | Wire2196
type Wire2195 = string
type Wire2196 = Wire2197 | Wire2198
type Wire2197 = boolean
type Wire2198 = 'false' | 'true'
type Wire2199 = Wire2200 | Wire2201
type Wire2200 = string
type Wire2201 = string
type Wire2202 = Wire2203 | Wire2204
type Wire2203 = string
type Wire2204 =
  'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'Ledger' | 'Legal' | 'Letter' | 'Tabloid'
type Wire2205 = Wire2206 | Wire2207
type Wire2206 = string
type Wire2207 = string
type Wire2208 = Wire2209 | Wire2210
type Wire2209 = string
type Wire2210 = string
type Wire2211 = Wire2212 | Wire2213
type Wire2212 = string
type Wire2213 = Wire2214 | Wire2215
type Wire2214 = boolean
type Wire2215 = 'false' | 'true'
type Wire2216 = '/document/convert'
type Wire2217 = {
  dedupe_images?: Wire2218
  extract?: Wire2223
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  image_format?: Wire2234
  include_image_masks?: Wire2237
  interpolate?: Wire1410
  min_image_bytes?: Wire2242
  min_image_height?: Wire2246
  min_image_width?: Wire2250
  ocr_provider?: Wire2254
  output_meta?: Wire1418
  page_range?: Wire2257
  password?: Wire2260
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2263
  text_format?: Wire2264
  text_granularity?: Wire2267
  text_method?: Wire2270
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2218 = Wire2219 | Wire2220
type Wire2219 = string
type Wire2220 = Wire2221 | Wire2222
type Wire2221 = boolean
type Wire2222 = 'false' | 'true'
type Wire2223 = Wire2224 | Wire2225 | Wire2228
type Wire2224 = string
type Wire2225 = Wire2226 | Wire2227
type Wire2226 = string
type Wire2227 = 'images' | 'text'
type Wire2228 = Wire2229 | Wire2230
type Wire2229 = string
type Wire2230 = Array<Wire2231>
type Wire2231 = Wire2232 | Wire2233
type Wire2232 = string
type Wire2233 = 'images' | 'text'
type Wire2234 = Wire2235 | Wire2236
type Wire2235 = string
type Wire2236 = 'auto' | 'jpg' | 'original' | 'png'
type Wire2237 = Wire2238 | Wire2239
type Wire2238 = string
type Wire2239 = Wire2240 | Wire2241
type Wire2240 = boolean
type Wire2241 = 'false' | 'true'
type Wire2242 = Wire2243 | Wire2244 | Wire2245
type Wire2243 = string
type Wire2244 = string
type Wire2245 = number
type Wire2246 = Wire2247 | Wire2248 | Wire2249
type Wire2247 = string
type Wire2248 = string
type Wire2249 = number
type Wire2250 = Wire2251 | Wire2252 | Wire2253
type Wire2251 = string
type Wire2252 = string
type Wire2253 = number
type Wire2254 = Wire2255 | Wire2256
type Wire2255 = string
type Wire2256 = 'aws' | 'gcp'
type Wire2257 = Wire2258 | Wire2259
type Wire2258 = string
type Wire2259 = string
type Wire2260 = Wire2261 | Wire2262
type Wire2261 = string
type Wire2262 = string
type Wire2263 = '/document/extract'
type Wire2264 = Wire2265 | Wire2266
type Wire2265 = string
type Wire2266 = 'json' | 'txt'
type Wire2267 = Wire2268 | Wire2269
type Wire2268 = string
type Wire2269 = 'document' | 'page'
type Wire2270 = Wire2271 | Wire2272
type Wire2271 = string
type Wire2272 = 'auto' | 'native' | 'ocr'
type Wire2273 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  input_passwords?: Wire2274
  interpolate?: Wire1410
  output_meta?: Wire1418
  output_password?: Wire2280
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2283
  sort_by?: Wire1663
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2274 = Wire2275 | Wire2276
type Wire2275 = string
type Wire2276 = Array<Wire2277>
type Wire2277 = Wire2278 | Wire2279
type Wire2278 = string
type Wire2279 = string
type Wire2280 = Wire2281 | Wire2282
type Wire2281 = string
type Wire2282 = string
type Wire2283 = '/document/merge'
type Wire2284 = {
  force_accept?: Wire1380
  format?: Wire2285
  granularity?: Wire2288
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  provider?: Wire2291
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2294
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2285 = Wire2286 | Wire2287
type Wire2286 = string
type Wire2287 = 'json' | 'meta' | 'text'
type Wire2288 = Wire2289 | Wire2290
type Wire2289 = string
type Wire2290 = 'full' | 'list'
type Wire2291 = Wire2292 | Wire2293
type Wire2292 = string
type Wire2293 = 'auto' | 'aws' | 'gcp'
type Wire2294 = '/document/ocr'
type Wire2295 = {
  compatibility?: Wire2296
  compress_fonts?: Wire2299
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  image_dpi?: Wire2304
  interpolate?: Wire1410
  linearize?: Wire2308
  output_meta?: Wire1418
  preset?: Wire2313
  queue?: Wire1429
  remove_metadata?: Wire2316
  result?: Wire1436
  robot: Wire2321
  subset_fonts?: Wire2322
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2296 = Wire2297 | Wire2298
type Wire2297 = string
type Wire2298 = '1.4' | '1.5' | '1.6' | '1.7' | '2.0'
type Wire2299 = Wire2300 | Wire2301
type Wire2300 = string
type Wire2301 = Wire2302 | Wire2303
type Wire2302 = boolean
type Wire2303 = 'false' | 'true'
type Wire2304 = Wire2305 | Wire2306 | Wire2307
type Wire2305 = string
type Wire2306 = string
type Wire2307 = number
type Wire2308 = Wire2309 | Wire2310
type Wire2309 = string
type Wire2310 = Wire2311 | Wire2312
type Wire2311 = boolean
type Wire2312 = 'false' | 'true'
type Wire2313 = Wire2314 | Wire2315
type Wire2314 = string
type Wire2315 = 'ebook' | 'prepress' | 'printer' | 'screen'
type Wire2316 = Wire2317 | Wire2318
type Wire2317 = string
type Wire2318 = Wire2319 | Wire2320
type Wire2319 = boolean
type Wire2320 = 'false' | 'true'
type Wire2321 = '/document/optimize'
type Wire2322 = Wire2323 | Wire2324
type Wire2323 = string
type Wire2324 = Wire2325 | Wire2326
type Wire2325 = boolean
type Wire2326 = 'false' | 'true'
type Wire2327 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2328
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2328 = '/file/read'
type Wire2329 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  pages?: Wire2330
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2335
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2330 = Wire2331 | Wire2332 | Wire1391
type Wire2331 = string
type Wire2332 = Wire2333 | Wire2334
type Wire2333 = string
type Wire2334 = string
type Wire2335 = '/document/split'
type Wire2336 = {
  alpha?: Wire2337
  antialiasing?: Wire2340
  background?: Wire2345
  colorspace?: Wire2348
  delay?: Wire2351
  density?: Wire2355
  force_accept?: Wire1380
  format?: Wire2358
  height?: Wire2361
  ignore_errors?: Wire1611
  imagemagick_stack?: Wire2365
  interpolate?: Wire1410
  output_meta?: Wire1418
  page?: Wire2373
  page_range?: Wire2379
  pdf_use_cropbox?: Wire2384
  queue?: Wire1429
  resize_strategy?: Wire2389
  result?: Wire1436
  robot: Wire2392
  stack?: Wire2393
  trim_whitespace?: Wire2396
  turbo?: Wire2401
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire2406
}
type Wire2337 = Wire2338 | Wire2339
type Wire2338 = string
type Wire2339 = 'Remove' | 'Set'
type Wire2340 = Wire2341 | Wire2342
type Wire2341 = string
type Wire2342 = Wire2343 | Wire2344
type Wire2343 = boolean
type Wire2344 = 'false' | 'true'
type Wire2345 = Wire2346 | Wire2347
type Wire2346 = string
type Wire2347 = string
type Wire2348 = Wire2349 | Wire2350
type Wire2349 = string
type Wire2350 =
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
type Wire2351 = Wire2352 | Wire2353 | Wire2354
type Wire2352 = string
type Wire2353 = string
type Wire2354 = number
type Wire2355 = Wire2356 | Wire2357
type Wire2356 = string
type Wire2357 = string
type Wire2358 = Wire2359 | Wire2360
type Wire2359 = string
type Wire2360 = 'gif' | 'jpeg' | 'jpg' | 'png'
type Wire2361 = Wire2362 | Wire2363 | Wire2364
type Wire2362 = string
type Wire2363 = string
type Wire2364 = number
type Wire2365 = Wire2366 | Wire2367 | Wire2370
type Wire2366 = string
type Wire2367 = Wire2368 | Wire2369
type Wire2368 = string
type Wire2369 = 'v3'
type Wire2370 = Wire2371 | Wire2372
type Wire2371 = string
type Wire2372 = string
type Wire2373 = Wire2374 | Wire2378
type Wire2374 = Wire2375 | Wire2376 | Wire2377
type Wire2375 = string
type Wire2376 = string
type Wire2377 = number
type Wire2378 = null
type Wire2379 = Wire2380 | Wire2383
type Wire2380 = Wire2381 | Wire2382
type Wire2381 = string
type Wire2382 = string
type Wire2383 = null
type Wire2384 = Wire2385 | Wire2386
type Wire2385 = string
type Wire2386 = Wire2387 | Wire2388
type Wire2387 = boolean
type Wire2388 = 'false' | 'true'
type Wire2389 = Wire2390 | Wire2391
type Wire2390 = string
type Wire2391 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire2392 = '/document/thumbs'
type Wire2393 = Wire2394 | Wire2395
type Wire2394 = string
type Wire2395 = 'ghostscript' | 'pdfium' | 'vips'
type Wire2396 = Wire2397 | Wire2398
type Wire2397 = string
type Wire2398 = Wire2399 | Wire2400
type Wire2399 = boolean
type Wire2400 = 'false' | 'true'
type Wire2401 = Wire2402 | Wire2403
type Wire2402 = string
type Wire2403 = Wire2404 | Wire2405
type Wire2404 = boolean
type Wire2405 = 'false' | 'true'
type Wire2406 = Wire2407 | Wire2408 | Wire2409
type Wire2407 = string
type Wire2408 = string
type Wire2409 = number
type Wire2410 = {
  access_token?: Wire2411
  credentials?: Wire2414
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path: Wire2417
  queue?: Wire1429
  refresh_token?: Wire2422
  result?: Wire1436
  robot: Wire2425
  user_meta?: Wire1442
}
type Wire2411 = Wire2412 | Wire2413
type Wire2412 = string
type Wire2413 = string
type Wire2414 = Wire2415 | Wire2416
type Wire2415 = string
type Wire2416 = string
type Wire2417 = Wire2418 | Wire2419 | Wire1391
type Wire2418 = string
type Wire2419 = Wire2420 | Wire2421
type Wire2420 = string
type Wire2421 = string
type Wire2422 = Wire2423 | Wire2424
type Wire2423 = string
type Wire2424 = string
type Wire2425 = '/dropbox/import'
type Wire2426 = {
  create_sharing_link?: Wire1970
  credentials?: Wire2414
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire1902
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2427
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2427 = '/dropbox/store'
type Wire2428 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2429
  user_meta?: Wire1442
}
type Wire2429 = '/edgly/deliver'
type Wire2430 = {
  archive_name?: Wire2431
  compression_level?: Wire2434
  file_layout?: Wire2438
  force_accept?: Wire1380
  format?: Wire2441
  gzip?: Wire2444
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  password?: Wire2449
  path?: Wire2454
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2457
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2431 = Wire2432 | Wire2433
type Wire2432 = string
type Wire2433 = string
type Wire2434 = Wire2435 | Wire2436 | Wire2437
type Wire2435 = string
type Wire2436 = string
type Wire2437 = number
type Wire2438 = Wire2439 | Wire2440
type Wire2439 = string
type Wire2440 = 'advanced' | 'relative-path' | 'simple'
type Wire2441 = Wire2442 | Wire2443
type Wire2442 = string
type Wire2443 = 'tar' | 'zip'
type Wire2444 = Wire2445 | Wire2446
type Wire2445 = string
type Wire2446 = Wire2447 | Wire2448
type Wire2447 = boolean
type Wire2448 = 'false' | 'true'
type Wire2449 = Wire2450 | Wire2453
type Wire2450 = Wire2451 | Wire2452
type Wire2451 = string
type Wire2452 = string
type Wire2453 = null
type Wire2454 = Wire2455 | Wire2456
type Wire2455 = string
type Wire2456 = string
type Wire2457 = '/file/compress'
type Wire2458 = {
  force_accept?: Wire1380
  ignore_errors?: Wire2459
  interpolate?: Wire1410
  output_meta?: Wire1418
  password?: Wire2465
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2468
  turbo?: Wire2469
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2459 = Wire2460 | Wire2461
type Wire2460 = string
type Wire2461 = Wire2462 | Wire2463
type Wire2462 = boolean
type Wire2463 = Array<Wire2464>
type Wire2464 = 'execute' | 'meta'
type Wire2465 = Wire2466 | Wire2467
type Wire2466 = string
type Wire2467 = string
type Wire2468 = '/file/decompress'
type Wire2469 = Wire2470 | Wire2471
type Wire2470 = string
type Wire2471 = Wire2472 | Wire2473
type Wire2472 = boolean
type Wire2473 = 'false' | 'true'
type Wire2474 = {
  accepts?: Wire2475
  condition_type?: Wire2549
  declines?: Wire2552
  error_msg?: Wire2558
  error_on_decline?: Wire2561
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2566
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2475 = Wire2476 | Wire2477 | Wire2478 | Wire2481
type Wire2476 = string
type Wire2477 = null
type Wire2478 = Wire2479 | Wire2480
type Wire2479 = string
type Wire2480 = string
type Wire2481 = Wire2482 | Wire2483
type Wire2482 = string
type Wire2483 = Array<Wire2484>
type Wire2484 = Wire2485 | Wire2486
type Wire2485 = string
type Wire2486 = [Wire2487, Wire2502, Wire2487]
type Wire2487 = Wire2488 | Wire2489 | Wire1466 | Wire2492 | Wire2493
type Wire2488 = string
type Wire2489 = Wire2490 | Wire2491
type Wire2490 = string
type Wire2491 = string
type Wire2492 = null
type Wire2493 = Wire2494 | Wire2495
type Wire2494 = string
type Wire2495 = Array<Wire2496>
type Wire2496 = Wire2497 | Wire2498 | Wire1466 | Wire2501
type Wire2497 = string
type Wire2498 = Wire2499 | Wire2500
type Wire2499 = string
type Wire2500 = string
type Wire2501 = null
type Wire2502 =
  | Wire2503
  | Wire2504
  | Wire2507
  | Wire2510
  | Wire2513
  | Wire2516
  | Wire2519
  | Wire2522
  | Wire2525
  | Wire2528
  | Wire2531
  | Wire2534
  | Wire2537
  | Wire2540
  | Wire2543
  | Wire2546
type Wire2503 = string
type Wire2504 = Wire2505 | Wire2506
type Wire2505 = string
type Wire2506 = '='
type Wire2507 = Wire2508 | Wire2509
type Wire2508 = string
type Wire2509 = '=='
type Wire2510 = Wire2511 | Wire2512
type Wire2511 = string
type Wire2512 = '==='
type Wire2513 = Wire2514 | Wire2515
type Wire2514 = string
type Wire2515 = '<'
type Wire2516 = Wire2517 | Wire2518
type Wire2517 = string
type Wire2518 = '>'
type Wire2519 = Wire2520 | Wire2521
type Wire2520 = string
type Wire2521 = '<='
type Wire2522 = Wire2523 | Wire2524
type Wire2523 = string
type Wire2524 = '>='
type Wire2525 = Wire2526 | Wire2527
type Wire2526 = string
type Wire2527 = '!='
type Wire2528 = Wire2529 | Wire2530
type Wire2529 = string
type Wire2530 = '!=='
type Wire2531 = Wire2532 | Wire2533
type Wire2532 = string
type Wire2533 = 'regex'
type Wire2534 = Wire2535 | Wire2536
type Wire2535 = string
type Wire2536 = '!regex'
type Wire2537 = Wire2538 | Wire2539
type Wire2538 = string
type Wire2539 = 'includes'
type Wire2540 = Wire2541 | Wire2542
type Wire2541 = string
type Wire2542 = '!includes'
type Wire2543 = Wire2544 | Wire2545
type Wire2544 = string
type Wire2545 = 'empty'
type Wire2546 = Wire2547 | Wire2548
type Wire2547 = string
type Wire2548 = '!empty'
type Wire2549 = Wire2550 | Wire2551
type Wire2550 = string
type Wire2551 = 'and' | 'or'
type Wire2552 = Wire2553 | Wire2554 | Wire2555 | Wire2481
type Wire2553 = string
type Wire2554 = null
type Wire2555 = Wire2556 | Wire2557
type Wire2556 = string
type Wire2557 = string
type Wire2558 = Wire2559 | Wire2560
type Wire2559 = string
type Wire2560 = string
type Wire2561 = Wire2562 | Wire2563
type Wire2562 = string
type Wire2563 = Wire2564 | Wire2565
type Wire2564 = boolean
type Wire2565 = 'false' | 'true'
type Wire2566 = '/file/filter'
type Wire2567 = {
  algorithm?: Wire2568
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  partial?: Wire2571
  partial_size?: Wire2574
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2578
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2568 = Wire2569 | Wire2570
type Wire2569 = string
type Wire2570 = 'b2' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512'
type Wire2571 = Wire2572 | Wire2573
type Wire2572 = string
type Wire2573 = 'both' | 'first' | 'full' | 'last'
type Wire2574 = Wire2575 | Wire2576 | Wire2577
type Wire2575 = string
type Wire2576 = string
type Wire2577 = number
type Wire2578 = '/file/hash'
type Wire2579 = {
  artwork_center_color?: Wire2580
  artwork_outer_color?: Wire2583
  background?: Wire2586
  clip_duration?: Wire2589
  clip_format?: Wire2593
  clip_framerate?: Wire2596
  clip_loop?: Wire2600
  clip_offset?: Wire2605
  force_accept?: Wire1380
  format?: Wire2609
  height?: Wire2612
  icon_style?: Wire2617
  icon_text_color?: Wire2620
  icon_text_content?: Wire2623
  icon_text_font?: Wire2626
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  optimize?: Wire2629
  optimize_priority?: Wire2634
  optimize_progressive?: Wire2637
  output_meta?: Wire1418
  queue?: Wire1429
  resize_strategy?: Wire2642
  result?: Wire1436
  robot: Wire2645
  strategy?: Wire2646
  use?: Wire1624
  user_meta?: Wire1442
  waveform_center_color?: Wire2691
  waveform_height?: Wire2694
  waveform_outer_color?: Wire2698
  waveform_width?: Wire2701
  width?: Wire2705
  zoom?: Wire2707
}
type Wire2580 = Wire2581 | Wire2582
type Wire2581 = string
type Wire2582 = string
type Wire2583 = Wire2584 | Wire2585
type Wire2584 = string
type Wire2585 = string
type Wire2586 = Wire2587 | Wire2588
type Wire2587 = string
type Wire2588 = string
type Wire2589 = Wire2590 | Wire2591 | Wire2592
type Wire2590 = string
type Wire2591 = string
type Wire2592 = number
type Wire2593 = Wire2594 | Wire2595
type Wire2594 = string
type Wire2595 = 'apng' | 'avif' | 'gif' | 'webp'
type Wire2596 = Wire2597 | Wire2598 | Wire2599
type Wire2597 = string
type Wire2598 = string
type Wire2599 = number
type Wire2600 = Wire2601 | Wire2602
type Wire2601 = string
type Wire2602 = Wire2603 | Wire2604
type Wire2603 = boolean
type Wire2604 = 'false' | 'true'
type Wire2605 = Wire2606 | Wire2607 | Wire2608
type Wire2606 = string
type Wire2607 = string
type Wire2608 = number
type Wire2609 = Wire2610 | Wire2611
type Wire2610 = string
type Wire2611 = 'avif' | 'gif' | 'jpeg' | 'jpg' | 'png' | 'webp'
type Wire2612 = Wire2613 | Wire2614
type Wire2613 = string
type Wire2614 = Wire2615 | Wire2616
type Wire2615 = number
type Wire2616 = string
type Wire2617 = Wire2618 | Wire2619
type Wire2618 = string
type Wire2619 = 'square' | 'with-text'
type Wire2620 = Wire2621 | Wire2622
type Wire2621 = string
type Wire2622 = string
type Wire2623 = Wire2624 | Wire2625
type Wire2624 = string
type Wire2625 = 'extension' | 'none'
type Wire2626 = Wire2627 | Wire2628
type Wire2627 = string
type Wire2628 = string
type Wire2629 = Wire2630 | Wire2631
type Wire2630 = string
type Wire2631 = Wire2632 | Wire2633
type Wire2632 = boolean
type Wire2633 = 'false' | 'true'
type Wire2634 = Wire2635 | Wire2636
type Wire2635 = string
type Wire2636 = 'compression-ratio' | 'conversion-speed'
type Wire2637 = Wire2638 | Wire2639
type Wire2638 = string
type Wire2639 = Wire2640 | Wire2641
type Wire2640 = boolean
type Wire2641 = 'false' | 'true'
type Wire2642 = Wire2643 | Wire2644
type Wire2643 = string
type Wire2644 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire2645 = '/file/preview'
type Wire2646 = Wire2647 | Wire2648
type Wire2647 = string
type Wire2648 = {
  archive?: Wire2649
  audio?: Wire2655
  document?: Wire2661
  image?: Wire2667
  unknown?: Wire2673
  video?: Wire2679
  webpage?: Wire2685
  [key: string]:
    | JsonValue
    | Wire2649
    | Wire2655
    | Wire2661
    | Wire2667
    | Wire2673
    | Wire2679
    | Wire2685
    | undefined
}
type Wire2649 = Wire2650 | Wire2651
type Wire2650 = string
type Wire2651 = Array<Wire2652>
type Wire2652 = Wire2653 | Wire2654
type Wire2653 = string
type Wire2654 = string
type Wire2655 = Wire2656 | Wire2657
type Wire2656 = string
type Wire2657 = Array<Wire2658>
type Wire2658 = Wire2659 | Wire2660
type Wire2659 = string
type Wire2660 = string
type Wire2661 = Wire2662 | Wire2663
type Wire2662 = string
type Wire2663 = Array<Wire2664>
type Wire2664 = Wire2665 | Wire2666
type Wire2665 = string
type Wire2666 = string
type Wire2667 = Wire2668 | Wire2669
type Wire2668 = string
type Wire2669 = Array<Wire2670>
type Wire2670 = Wire2671 | Wire2672
type Wire2671 = string
type Wire2672 = string
type Wire2673 = Wire2674 | Wire2675
type Wire2674 = string
type Wire2675 = Array<Wire2676>
type Wire2676 = Wire2677 | Wire2678
type Wire2677 = string
type Wire2678 = string
type Wire2679 = Wire2680 | Wire2681
type Wire2680 = string
type Wire2681 = Array<Wire2682>
type Wire2682 = Wire2683 | Wire2684
type Wire2683 = string
type Wire2684 = string
type Wire2685 = Wire2686 | Wire2687
type Wire2686 = string
type Wire2687 = Array<Wire2688>
type Wire2688 = Wire2689 | Wire2690
type Wire2689 = string
type Wire2690 = string
type Wire2691 = Wire2692 | Wire2693
type Wire2692 = string
type Wire2693 = string
type Wire2694 = Wire2695 | Wire2696 | Wire2697
type Wire2695 = string
type Wire2696 = string
type Wire2697 = number
type Wire2698 = Wire2699 | Wire2700
type Wire2699 = string
type Wire2700 = string
type Wire2701 = Wire2702 | Wire2703 | Wire2704
type Wire2702 = string
type Wire2703 = string
type Wire2704 = number
type Wire2705 = Wire2706 | Wire2614
type Wire2706 = string
type Wire2707 = Wire2708 | Wire2709
type Wire2708 = string
type Wire2709 = Wire2710 | Wire2711
type Wire2710 = boolean
type Wire2711 = 'false' | 'true'
type Wire2712 = {
  cache_duration?: Wire2713
  download_name?: Wire2717
  force_accept?: Wire1380
  headers?: Wire2720
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2724
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2713 = Wire2714 | Wire2715 | Wire2716
type Wire2714 = string
type Wire2715 = string
type Wire2716 = number
type Wire2717 = Wire2718 | Wire2719
type Wire2718 = string
type Wire2719 = string
type Wire2720 = { [key: string]: Wire2721 | undefined }
type Wire2721 = Wire2722 | Wire2723
type Wire2722 = string
type Wire2723 = string
type Wire2724 = '/file/serve'
type Wire2725 = {
  error_msg?: Wire2558
  error_on_decline?: Wire2561
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  repair_pdf?: Wire2726
  result?: Wire1436
  robot: Wire2731
  use?: Wire1624
  user_meta?: Wire1442
  verify_to_be?: Wire2732
}
type Wire2726 = Wire2727 | Wire2728
type Wire2727 = string
type Wire2728 = Wire2729 | Wire2730
type Wire2729 = boolean
type Wire2730 = 'false' | 'true'
type Wire2731 = '/file/verify'
type Wire2732 = Wire2733 | Wire2734
type Wire2733 = string
type Wire2734 = string
type Wire2735 = {
  error_msg?: Wire2558
  error_on_decline?: Wire2561
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2736
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2736 = '/file/virusscan'
type Wire2737 = {
  credentials?: Wire2738
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire2741
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  passive_mode?: Wire2744
  password?: Wire2749
  path: Wire2752
  port?: Wire2757
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2761
  user?: Wire2762
  user_meta?: Wire1442
}
type Wire2738 = Wire2739 | Wire2740
type Wire2739 = string
type Wire2740 = string
type Wire2741 = Wire2742 | Wire2743
type Wire2742 = string
type Wire2743 = string
type Wire2744 = Wire2745 | Wire2746
type Wire2745 = string
type Wire2746 = Wire2747 | Wire2748
type Wire2747 = boolean
type Wire2748 = 'false' | 'true'
type Wire2749 = Wire2750 | Wire2751
type Wire2750 = string
type Wire2751 = string
type Wire2752 = Wire2753 | Wire2754 | Wire1391
type Wire2753 = string
type Wire2754 = Wire2755 | Wire2756
type Wire2755 = string
type Wire2756 = string
type Wire2757 = Wire2758 | Wire2759 | Wire2760
type Wire2758 = string
type Wire2759 = string
type Wire2760 = number
type Wire2761 = '/ftp/import'
type Wire2762 = Wire2763 | Wire2764
type Wire2763 = string
type Wire2764 = string
type Wire2765 = {
  credentials?: Wire2738
  force_accept?: Wire1380
  host?: Wire2766
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  password?: Wire2769
  path?: Wire2772
  port?: Wire2757
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2775
  secure?: Wire2776
  ssl_url_template?: Wire2781
  url_template?: Wire2784
  use?: Wire1624
  user?: Wire2787
  user_meta?: Wire1442
}
type Wire2766 = Wire2767 | Wire2768
type Wire2767 = string
type Wire2768 = string
type Wire2769 = Wire2770 | Wire2771
type Wire2770 = string
type Wire2771 = string
type Wire2772 = Wire2773 | Wire2774
type Wire2773 = string
type Wire2774 = string
type Wire2775 = '/ftp/store'
type Wire2776 = Wire2777 | Wire2778
type Wire2777 = string
type Wire2778 = Wire2779 | Wire2780
type Wire2779 = boolean
type Wire2780 = 'false' | 'true'
type Wire2781 = Wire2782 | Wire2783
type Wire2782 = string
type Wire2783 = string
type Wire2784 = Wire2785 | Wire2786
type Wire2785 = string
type Wire2786 = string
type Wire2787 = Wire2788 | Wire2789
type Wire2788 = string
type Wire2789 = string
type Wire2790 = {
  credentials?: Wire2791
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  next_page_token?: Wire1856
  output_meta?: Wire1418
  path: Wire2794
  queue?: Wire1429
  recursive?: Wire1935
  result?: Wire1436
  robot: Wire2799
  user_meta?: Wire1442
}
type Wire2791 = Wire2792 | Wire2793
type Wire2792 = string
type Wire2793 = string
type Wire2794 = Wire2795 | Wire2796 | Wire1391
type Wire2795 = string
type Wire2796 = Wire2797 | Wire2798
type Wire2797 = string
type Wire2798 = string
type Wire2799 = '/google/import'
type Wire2800 = {
  acl?: Wire2801
  cache_control?: Wire2806
  credentials: Wire2809
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire2812
  queue?: Wire1429
  result?: Wire1653
  robot: Wire2815
  ssl_url_template?: Wire2816
  url_template?: Wire2819
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2801 = Wire2802 | Wire2805
type Wire2802 = Wire2803 | Wire2804
type Wire2803 = string
type Wire2804 =
  'authenticated-read' | 'bucket-owner-full-control' | 'private' | 'project-private' | 'public-read'
type Wire2805 = null
type Wire2806 = Wire2807 | Wire2808
type Wire2807 = string
type Wire2808 = string
type Wire2809 = Wire2810 | Wire2811
type Wire2810 = string
type Wire2811 = string
type Wire2812 = Wire2813 | Wire2814
type Wire2813 = string
type Wire2814 = string
type Wire2815 = '/google/store'
type Wire2816 = Wire2817 | Wire2818
type Wire2817 = string
type Wire2818 = string
type Wire2819 = Wire2820 | Wire2821
type Wire2820 = string
type Wire2821 = string
type Wire2822 = {
  delay?: Wire2823
  force_accept?: Wire1380
  format?: Wire2827
  fullpage?: Wire2830
  headers?: Wire2835
  height?: Wire2839
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  omit_background?: Wire2843
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2848
  url?: Wire2849
  use?: Wire1624
  user_meta?: Wire1442
  wait_until?: Wire2854
  width?: Wire2857
}
type Wire2823 = Wire2824 | Wire2825 | Wire2826
type Wire2824 = string
type Wire2825 = string
type Wire2826 = number
type Wire2827 = Wire2828 | Wire2829
type Wire2828 = string
type Wire2829 = 'jpeg' | 'jpg' | 'pdf' | 'png'
type Wire2830 = Wire2831 | Wire2832
type Wire2831 = string
type Wire2832 = Wire2833 | Wire2834
type Wire2833 = boolean
type Wire2834 = 'false' | 'true'
type Wire2835 = { [key: string]: Wire2836 | undefined }
type Wire2836 = Wire2837 | Wire2838
type Wire2837 = string
type Wire2838 = string
type Wire2839 = Wire2840 | Wire2841 | Wire2842
type Wire2840 = string
type Wire2841 = string
type Wire2842 = number
type Wire2843 = Wire2844 | Wire2845
type Wire2844 = string
type Wire2845 = Wire2846 | Wire2847
type Wire2846 = boolean
type Wire2847 = 'false' | 'true'
type Wire2848 = '/html/convert'
type Wire2849 = Wire2850 | Wire2853
type Wire2850 = Wire2851 | Wire2852
type Wire2851 = string
type Wire2852 = string
type Wire2853 = null
type Wire2854 = Wire2855 | Wire2856
type Wire2855 = string
type Wire2856 = 'commit' | 'domcontentloaded' | 'load' | 'networkidle'
type Wire2857 = Wire2858 | Wire2859 | Wire2860
type Wire2858 = string
type Wire2859 = string
type Wire2860 = number
type Wire2861 = {
  fail_fast?: Wire2862
  force_accept?: Wire1380
  force_name?: Wire1385
  headers?: Wire2867
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  max_file_size?: Wire2879
  output_meta?: Wire1418
  queue?: Wire1429
  range?: Wire2883
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire2888
  url: Wire2889
  url_delimiter?: Wire2900
  user_meta?: Wire1442
}
type Wire2862 = Wire2863 | Wire2864
type Wire2863 = string
type Wire2864 = Wire2865 | Wire2866
type Wire2865 = boolean
type Wire2866 = 'false' | 'true'
type Wire2867 = Wire2868 | Wire1391 | Wire2869 | Wire2876
type Wire2868 = string
type Wire2869 = Wire2870 | Wire2871
type Wire2870 = string
type Wire2871 = Array<Wire2872>
type Wire2872 = { [key: string]: Wire2873 | undefined }
type Wire2873 = Wire2874 | Wire2875
type Wire2874 = string
type Wire2875 = string
type Wire2876 = Wire2877 | Wire2878
type Wire2877 = string
type Wire2878 = string
type Wire2879 = Wire2880 | Wire2881 | Wire2882
type Wire2880 = string
type Wire2881 = string
type Wire2882 = number
type Wire2883 = Wire2884 | Wire2885 | Wire1391
type Wire2884 = string
type Wire2885 = Wire2886 | Wire2887
type Wire2886 = string
type Wire2887 = string
type Wire2888 = '/http/import'
type Wire2889 = Wire2890 | Wire2891 | Wire2894
type Wire2890 = string
type Wire2891 = Wire2892 | Wire2893
type Wire2892 = string
type Wire2893 = string
type Wire2894 = Wire2895 | Wire2896
type Wire2895 = string
type Wire2896 = Array<Wire2897>
type Wire2897 = Wire2898 | Wire2899
type Wire2898 = string
type Wire2899 = string
type Wire2900 = Wire2901 | Wire2902
type Wire2901 = string
type Wire2902 = string
type Wire2903 = {
  force_accept?: Wire1380
  headers?: Wire2904
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  max_response_size?: Wire2919
  max_result_file_size?: Wire2923
  max_result_files?: Wire2927
  method?: Wire2931
  output_meta?: Wire1418
  payload?: Wire2934
  queue?: Wire1429
  result?: Wire1436
  result_download_timeout?: Wire2937
  robot: Wire2941
  timeout?: Wire2942
  url: Wire2946
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2904 = Wire2905 | Wire1391 | Wire2906 | Wire2909 | Wire2916
type Wire2905 = string
type Wire2906 = Wire2907 | Wire2908
type Wire2907 = string
type Wire2908 = Array<Wire2909>
type Wire2909 = { [key: string]: Wire2910 | undefined }
type Wire2910 = Wire2911 | Wire1421 | Wire1466 | Wire2912 | Wire2915
type Wire2911 = string
type Wire2912 = Wire2913 | Wire2914
type Wire2913 = string
type Wire2914 = string
type Wire2915 = null
type Wire2916 = Wire2917 | Wire2918
type Wire2917 = string
type Wire2918 = string
type Wire2919 = Wire2920 | Wire2921 | Wire2922
type Wire2920 = string
type Wire2921 = string
type Wire2922 = number
type Wire2923 = Wire2924 | Wire2925 | Wire2926
type Wire2924 = string
type Wire2925 = string
type Wire2926 = number
type Wire2927 = Wire2928 | Wire2929 | Wire2930
type Wire2928 = string
type Wire2929 = string
type Wire2930 = number
type Wire2931 = Wire2932 | Wire2933
type Wire2932 = string
type Wire2933 = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
type Wire2934 = Wire2935 | Wire2936
type Wire2935 = string
type Wire2936 = 'file' | 'files' | 'metadata' | 'none'
type Wire2937 = Wire2938 | Wire2939 | Wire2940
type Wire2938 = string
type Wire2939 = string
type Wire2940 = number
type Wire2941 = '/http/request'
type Wire2942 = Wire2943 | Wire2944 | Wire2945
type Wire2943 = string
type Wire2944 = string
type Wire2945 = number
type Wire2946 = Wire2947 | Wire2948
type Wire2947 = string
type Wire2948 = string
type Wire2949 = {
  force_accept?: Wire1380
  format?: Wire2950
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  model?: Wire2953
  output_meta?: Wire1418
  provider?: Wire2956
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2959
  select?: Wire2960
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2950 = Wire2951 | Wire2952
type Wire2951 = string
type Wire2952 = 'gif' | 'png' | 'webp'
type Wire2953 = Wire2954 | Wire2955
type Wire2954 = string
type Wire2955 = string
type Wire2956 = Wire2957 | Wire2958
type Wire2957 = string
type Wire2958 = 'auto' | 'fal' | 'replicate' | 'transloadit'
type Wire2959 = '/image/bgremove'
type Wire2960 = Wire2961 | Wire2962
type Wire2961 = string
type Wire2962 = 'background' | 'foreground'
type Wire2963 = {
  categories?: Wire2964
  confidence_threshold?: Wire2970
  error_msg?: Wire2974
  error_on_decline?: Wire2977
  force_accept?: Wire1380
  format?: Wire2982
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire2985
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2964 = Wire2965 | Wire2966
type Wire2965 = string
type Wire2966 = Array<Wire2967>
type Wire2967 = Wire2968 | Wire2969
type Wire2968 = string
type Wire2969 = 'all' | 'artwork' | 'brand_logo' | 'stock_photo' | 'watermarked'
type Wire2970 = Wire2971 | Wire2972 | Wire2973
type Wire2971 = string
type Wire2972 = string
type Wire2973 = number
type Wire2974 = Wire2975 | Wire2976
type Wire2975 = string
type Wire2976 = string
type Wire2977 = Wire2978 | Wire2979
type Wire2978 = string
type Wire2979 = Wire2980 | Wire2981
type Wire2980 = boolean
type Wire2981 = 'false' | 'true'
type Wire2982 = Wire2983 | Wire2984
type Wire2983 = string
type Wire2984 = 'json' | 'meta'
type Wire2985 = '/image/copyrightdetect'
type Wire2986 = {
  explicit_descriptions?: Wire2987
  force_accept?: Wire1380
  format?: Wire2992
  granularity?: Wire2995
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  provider?: Wire2998
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3001
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire2987 = Wire2988 | Wire2989
type Wire2988 = string
type Wire2989 = Wire2990 | Wire2991
type Wire2990 = boolean
type Wire2991 = 'false' | 'true'
type Wire2992 = Wire2993 | Wire2994
type Wire2993 = string
type Wire2994 = 'json' | 'meta' | 'text'
type Wire2995 = Wire2996 | Wire2997
type Wire2996 = string
type Wire2997 = 'full' | 'list'
type Wire2998 = Wire2999 | Wire3000
type Wire2999 = string
type Wire3000 = 'auto' | 'aws' | 'gcp'
type Wire3001 = '/image/describe'
type Wire3002 = {
  ai_preset?: Wire3003
  denoise?: Wire3006
  engine?: Wire3010
  enhance?: Wire3013
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  imagemagick_stack?: Wire2365
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire3016
  quality?: Wire3019
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3023
  sharpen?: Wire3024
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3003 = Wire3004 | Wire3005
type Wire3004 = string
type Wire3005 = 'face_restore' | 'restore'
type Wire3006 = Wire3007 | Wire3008 | Wire3009
type Wire3007 = string
type Wire3008 = string
type Wire3009 = number
type Wire3010 = Wire3011 | Wire3012
type Wire3011 = string
type Wire3012 = 'ai' | 'classic'
type Wire3013 = Wire3014 | Wire3015
type Wire3014 = string
type Wire3015 = 'auto' | 'auto_aggressive' | 'auto_gentle' | 'none'
type Wire3016 = Wire3017 | Wire3018
type Wire3017 = string
type Wire3018 =
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
type Wire3019 = Wire3020 | Wire3021 | Wire3022
type Wire3020 = string
type Wire3021 = string
type Wire3022 = number
type Wire3023 = '/image/enhance'
type Wire3024 = Wire3025 | Wire3026 | Wire3027
type Wire3025 = string
type Wire3026 = string
type Wire3027 = number
type Wire3028 = {
  crop?: Wire3029
  crop_padding?: Wire3034
  faces?: Wire3037
  force_accept?: Wire1380
  format?: Wire3046
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  min_confidence?: Wire3049
  output_meta?: Wire1418
  provider?: Wire2998
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3053
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3029 = Wire3030 | Wire3031
type Wire3030 = string
type Wire3031 = Wire3032 | Wire3033
type Wire3032 = boolean
type Wire3033 = 'false' | 'true'
type Wire3034 = Wire3035 | Wire3036
type Wire3035 = string
type Wire3036 = string
type Wire3037 = Wire3038 | Wire3039 | Wire3042
type Wire3038 = string
type Wire3039 = Wire3040 | Wire3041
type Wire3040 = string
type Wire3041 = 'each' | 'group' | 'max-confidence' | 'max-size'
type Wire3042 = Wire3043 | Wire3044 | Wire3045
type Wire3043 = string
type Wire3044 = string
type Wire3045 = number
type Wire3046 = Wire3047 | Wire3048
type Wire3047 = string
type Wire3048 = 'jpg' | 'png' | 'preserve' | 'tiff'
type Wire3049 = Wire3050 | Wire3051 | Wire3052
type Wire3050 = string
type Wire3051 = string
type Wire3052 = number
type Wire3053 = '/image/facedetect'
type Wire3054 = {
  aspect_ratio?: Wire3055
  force_accept?: Wire1380
  format?: Wire3058
  height?: Wire3061
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  model?: Wire3065
  num_outputs?: Wire3068
  output_meta?: Wire1418
  prompt: Wire3072
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3075
  seed?: Wire3076
  style?: Wire3080
  use?: Wire3083
  user_meta?: Wire1442
  width?: Wire3084
}
type Wire3055 = Wire3056 | Wire3057
type Wire3056 = string
type Wire3057 = string
type Wire3058 = Wire3059 | Wire3060
type Wire3059 = string
type Wire3060 = 'gif' | 'jpeg' | 'jpg' | 'png' | 'svg' | 'webp'
type Wire3061 = Wire3062 | Wire3063 | Wire3064
type Wire3062 = string
type Wire3063 = string
type Wire3064 = number
type Wire3065 = Wire3066 | Wire3067
type Wire3066 = string
type Wire3067 = string
type Wire3068 = Wire3069 | Wire3070 | Wire3071
type Wire3069 = string
type Wire3070 = string
type Wire3071 = number
type Wire3072 = Wire3073 | Wire3074
type Wire3073 = string
type Wire3074 = string
type Wire3075 = '/image/generate'
type Wire3076 = Wire3077 | Wire3078 | Wire3079
type Wire3077 = string
type Wire3078 = string
type Wire3079 = number
type Wire3080 = Wire3081 | Wire3082
type Wire3081 = string
type Wire3082 = string
type Wire3083 = Wire1625 | Wire1634
type Wire3084 = Wire3085 | Wire3086 | Wire3087
type Wire3085 = string
type Wire3086 = string
type Wire3087 = number
type Wire3088 = {
  face_enhance?: Wire3089
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  model?: Wire3094
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3097
  scale?: Wire3098
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3089 = Wire3090 | Wire3091
type Wire3090 = string
type Wire3091 = Wire3092 | Wire3093
type Wire3092 = boolean
type Wire3093 = 'false' | 'true'
type Wire3094 = Wire3095 | Wire3096
type Wire3095 = string
type Wire3096 = 'nightmareai/real-esrgan' | 'sczhou/codeformer' | 'tencentarc/gfpgan'
type Wire3097 = '/image/upscale'
type Wire3098 = Wire3099 | Wire3100 | Wire3103
type Wire3099 = string
type Wire3100 = Wire3101 | Wire3102
type Wire3101 = string
type Wire3102 = 2
type Wire3103 = Wire3104 | Wire3105
type Wire3104 = string
type Wire3105 = 4
type Wire3106 = {
  adaptive_filtering?: Wire3107
  background?: Wire3112
  border?: Wire3120
  cell_height?: Wire3124
  cell_width?: Wire3128
  columns?: Wire3132
  coverage?: Wire3136
  direction?: Wire3140
  effect?: Wire3143
  force_accept?: Wire1380
  format?: Wire3146
  height?: Wire3149
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  quality?: Wire3153
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3157
  rows?: Wire3158
  seed?: Wire3162
  shuffle?: Wire3166
  sort_by?: Wire1663
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire3171
}
type Wire3107 = Wire3108 | Wire3109
type Wire3108 = string
type Wire3109 = Wire3110 | Wire3111
type Wire3110 = boolean
type Wire3111 = 'false' | 'true'
type Wire3112 = Wire3113 | Wire3114 | Wire3117
type Wire3113 = string
type Wire3114 = Wire3115 | Wire3116
type Wire3115 = string
type Wire3116 = string
type Wire3117 = Wire3118 | Wire3119
type Wire3118 = string
type Wire3119 =
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
type Wire3136 = Wire3137 | Wire3138 | Wire3139
type Wire3137 = string
type Wire3138 = string
type Wire3139 = number
type Wire3140 = Wire3141 | Wire3142
type Wire3141 = string
type Wire3142 = 'grid' | 'horizontal' | 'vertical'
type Wire3143 = Wire3144 | Wire3145
type Wire3144 = string
type Wire3145 = 'mosaic' | 'polaroid-stack'
type Wire3146 = Wire3147 | Wire3148
type Wire3147 = string
type Wire3148 = 'jpg' | 'png' | 'webp'
type Wire3149 = Wire3150 | Wire3151 | Wire3152
type Wire3150 = string
type Wire3151 = string
type Wire3152 = number
type Wire3153 = Wire3154 | Wire3155 | Wire3156
type Wire3154 = string
type Wire3155 = string
type Wire3156 = number
type Wire3157 = '/image/merge'
type Wire3158 = Wire3159 | Wire3160 | Wire3161
type Wire3159 = string
type Wire3160 = string
type Wire3161 = number
type Wire3162 = Wire3163 | Wire3164 | Wire3165
type Wire3163 = string
type Wire3164 = string
type Wire3165 = number
type Wire3166 = Wire3167 | Wire3168
type Wire3167 = string
type Wire3168 = Wire3169 | Wire3170
type Wire3169 = boolean
type Wire3170 = 'false' | 'true'
type Wire3171 = Wire3172 | Wire3173 | Wire3174
type Wire3172 = string
type Wire3173 = string
type Wire3174 = number
type Wire3175 = {
  force_accept?: Wire1380
  format?: Wire2285
  granularity?: Wire2288
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  provider?: Wire2291
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3176
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3176 = '/image/ocr'
type Wire3177 = {
  fix_breaking_images?: Wire3178
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  lossy?: Wire3183
  output_meta?: Wire1418
  preserve_meta_data?: Wire3188
  priority?: Wire3193
  progressive?: Wire3196
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3201
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3178 = Wire3179 | Wire3180
type Wire3179 = string
type Wire3180 = Wire3181 | Wire3182
type Wire3181 = boolean
type Wire3182 = 'false' | 'true'
type Wire3183 = Wire3184 | Wire3185
type Wire3184 = string
type Wire3185 = Wire3186 | Wire3187
type Wire3186 = boolean
type Wire3187 = 'false' | 'true'
type Wire3188 = Wire3189 | Wire3190
type Wire3189 = string
type Wire3190 = Wire3191 | Wire3192
type Wire3191 = boolean
type Wire3192 = 'false' | 'true'
type Wire3193 = Wire3194 | Wire3195
type Wire3194 = string
type Wire3195 = 'compression-ratio' | 'conversion-speed'
type Wire3196 = Wire3197 | Wire3198
type Wire3197 = string
type Wire3198 = Wire3199 | Wire3200
type Wire3199 = boolean
type Wire3200 = 'false' | 'true'
type Wire3201 = '/image/optimize'
type Wire3202 = {
  adaptive_filtering?: Wire3107
  alpha?: Wire3203
  background?: Wire3206
  blur?: Wire3211
  blur_regions?: Wire3216
  brightness?: Wire3226
  clip?: Wire3230
  clut?: Wire3235
  colorspace?: Wire3240
  compress?: Wire3243
  contrast?: Wire3248
  correct_gamma?: Wire3252
  crop?: Wire3257
  density?: Wire3273
  flatten?: Wire3278
  force_accept?: Wire1380
  format?: Wire3283
  frame?: Wire3288
  gravity?: Wire3294
  height?: Wire3302
  hue?: Wire3304
  ignore_errors?: Wire1611
  imagemagick_stack?: Wire2365
  interpolate?: Wire1410
  monochrome?: Wire3308
  negate?: Wire3313
  output_meta?: Wire1418
  preclip_alpha?: Wire3318
  progressive?: Wire3321
  quality?: Wire3326
  queue?: Wire1429
  resize_strategy?: Wire3330
  result?: Wire1436
  robot: Wire3350
  rotation?: Wire3351
  saturation?: Wire3356
  sepia?: Wire3360
  shave?: Wire3366
  strip?: Wire3374
  text?: Wire3379
  transparent?: Wire3434
  trim_whitespace?: Wire3444
  type?: Wire3449
  use?: Wire1624
  user_meta?: Wire1442
  watermark_opacity?: Wire3452
  watermark_position?: Wire3456
  watermark_repeat_x?: Wire3461
  watermark_repeat_y?: Wire3466
  watermark_resize_strategy?: Wire3471
  watermark_size?: Wire3474
  watermark_url?: Wire3477
  watermark_x_offset?: Wire3480
  watermark_y_offset?: Wire3484
  width?: Wire3488
  zoom?: Wire3490
}
type Wire3203 = Wire3204 | Wire3205
type Wire3204 = string
type Wire3205 =
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
type Wire3206 = Wire3207 | Wire3208 | Wire3117
type Wire3207 = string
type Wire3208 = Wire3209 | Wire3210
type Wire3209 = string
type Wire3210 = string
type Wire3211 = Wire3212 | Wire3215
type Wire3212 = Wire3213 | Wire3214
type Wire3213 = string
type Wire3214 = string
type Wire3215 = null
type Wire3216 = Wire3217 | Wire3225
type Wire3217 = Wire3218 | Wire3219
type Wire3218 = string
type Wire3219 = Array<Wire3220>
type Wire3220 = Wire3221 | Wire3222
type Wire3221 = string
type Wire3222 = {
  height: Wire3223
  width: Wire3223
  x: Wire3223
  y: Wire3223
  [key: string]: JsonValue | Wire3223 | Wire3223 | Wire3223 | Wire3223 | undefined
}
type Wire3223 = Wire3224 | Wire2614
type Wire3224 = string
type Wire3225 = null
type Wire3226 = Wire3227 | Wire3228 | Wire3229
type Wire3227 = string
type Wire3228 = string
type Wire3229 = number
type Wire3230 = Wire3231 | Wire3232 | Wire1421
type Wire3231 = string
type Wire3232 = Wire3233 | Wire3234
type Wire3233 = string
type Wire3234 = string
type Wire3235 = Wire3236 | Wire3237
type Wire3236 = string
type Wire3237 = Wire3238 | Wire3239
type Wire3238 = boolean
type Wire3239 = 'false' | 'true'
type Wire3240 = Wire3241 | Wire3242
type Wire3241 = string
type Wire3242 =
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
type Wire3243 = Wire3244 | Wire3247
type Wire3244 = Wire3245 | Wire3246
type Wire3245 = string
type Wire3246 =
  'BZip' | 'Fax' | 'Group4' | 'JPEG' | 'JPEG2000' | 'LZW' | 'Lossless' | 'None' | 'RLE' | 'Zip'
type Wire3247 = null
type Wire3248 = Wire3249 | Wire3250 | Wire3251
type Wire3249 = string
type Wire3250 = string
type Wire3251 = number
type Wire3252 = Wire3253 | Wire3254
type Wire3253 = string
type Wire3254 = Wire3255 | Wire3256
type Wire3255 = boolean
type Wire3256 = 'false' | 'true'
type Wire3257 = Wire3258 | Wire3259 | Wire3270
type Wire3258 = string
type Wire3259 = Wire3260 | Wire3261
type Wire3260 = string
type Wire3261 = { x1?: Wire3262; x2?: Wire3264; y1?: Wire3266; y2?: Wire3268 }
type Wire3262 = Wire1481 | Wire3263
type Wire3263 = null
type Wire3264 = Wire1481 | Wire3265
type Wire3265 = null
type Wire3266 = Wire1481 | Wire3267
type Wire3267 = null
type Wire3268 = Wire1481 | Wire3269
type Wire3269 = null
type Wire3270 = Wire3271 | Wire3272
type Wire3271 = string
type Wire3272 = string
type Wire3273 = Wire3274 | Wire3277
type Wire3274 = Wire3275 | Wire3276
type Wire3275 = string
type Wire3276 = string
type Wire3277 = null
type Wire3278 = Wire3279 | Wire3280
type Wire3279 = string
type Wire3280 = Wire3281 | Wire3282
type Wire3281 = boolean
type Wire3282 = 'false' | 'true'
type Wire3283 = Wire3284 | Wire3287
type Wire3284 = Wire3285 | Wire3286
type Wire3285 = string
type Wire3286 = string
type Wire3287 = null
type Wire3288 = Wire3289 | Wire3293
type Wire3289 = Wire3290 | Wire3291 | Wire3292
type Wire3290 = string
type Wire3291 = string
type Wire3292 = number
type Wire3293 = null
type Wire3294 = Wire3295 | Wire3296 | Wire3299
type Wire3295 = string
type Wire3296 = Wire3297 | Wire3298
type Wire3297 = string
type Wire3298 =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
type Wire3299 = Wire3300 | Wire3301
type Wire3300 = string
type Wire3301 = 'attention' | 'entropy'
type Wire3302 = Wire3303 | Wire2614
type Wire3303 = string
type Wire3304 = Wire3305 | Wire3306 | Wire3307
type Wire3305 = string
type Wire3306 = string
type Wire3307 = number
type Wire3308 = Wire3309 | Wire3310
type Wire3309 = string
type Wire3310 = Wire3311 | Wire3312
type Wire3311 = boolean
type Wire3312 = 'false' | 'true'
type Wire3313 = Wire3314 | Wire3315
type Wire3314 = string
type Wire3315 = Wire3316 | Wire3317
type Wire3316 = boolean
type Wire3317 = 'false' | 'true'
type Wire3318 = Wire3319 | Wire3320
type Wire3319 = string
type Wire3320 =
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
type Wire3321 = Wire3322 | Wire3323
type Wire3322 = string
type Wire3323 = Wire3324 | Wire3325
type Wire3324 = boolean
type Wire3325 = 'false' | 'true'
type Wire3326 = Wire3327 | Wire3328 | Wire3329
type Wire3327 = string
type Wire3328 = string
type Wire3329 = number
type Wire3330 = Wire3331 | Wire3332 | Wire3335 | Wire3338 | Wire3341 | Wire3344 | Wire3347
type Wire3331 = string
type Wire3332 = Wire3333 | Wire3334
type Wire3333 = string
type Wire3334 = 'crop'
type Wire3335 = Wire3336 | Wire3337
type Wire3336 = string
type Wire3337 = 'fillcrop'
type Wire3338 = Wire3339 | Wire3340
type Wire3339 = string
type Wire3340 = 'fit'
type Wire3341 = Wire3342 | Wire3343
type Wire3342 = string
type Wire3343 = 'min_fit'
type Wire3344 = Wire3345 | Wire3346
type Wire3345 = string
type Wire3346 = 'pad'
type Wire3347 = Wire3348 | Wire3349
type Wire3348 = string
type Wire3349 = 'stretch'
type Wire3350 = '/image/resize'
type Wire3351 = Wire3352 | Wire1466 | Wire1421 | Wire3353
type Wire3352 = string
type Wire3353 = Wire3354 | Wire3355
type Wire3354 = string
type Wire3355 = 'auto'
type Wire3356 = Wire3357 | Wire3358 | Wire3359
type Wire3357 = string
type Wire3358 = string
type Wire3359 = number
type Wire3360 = Wire3361 | Wire3365
type Wire3361 = Wire3362 | Wire3363 | Wire3364
type Wire3362 = string
type Wire3363 = string
type Wire3364 = number
type Wire3365 = null
type Wire3366 = Wire3367 | Wire3368 | Wire3371
type Wire3367 = string
type Wire3368 = Wire3369 | Wire3370
type Wire3369 = string
type Wire3370 = string
type Wire3371 = Wire3372 | Wire3373
type Wire3372 = string
type Wire3373 = number
type Wire3374 = Wire3375 | Wire3376
type Wire3375 = string
type Wire3376 = Wire3377 | Wire3378
type Wire3377 = boolean
type Wire3378 = 'false' | 'true'
type Wire3379 = Wire3380 | Wire3381 | Wire3431
type Wire3380 = string
type Wire3381 = Wire3382 | Wire3383
type Wire3382 = string
type Wire3383 = {
  align?: Wire3384
  background_color?: Wire3387
  color?: Wire3392
  font?: Wire3397
  rotate?: Wire3400
  size?: Wire3404
  stroke_color?: Wire3408
  stroke_width?: Wire3413
  text: Wire3417
  valign?: Wire3420
  x_offset?: Wire3423
  y_offset?: Wire3427
  [key: string]:
    | JsonValue
    | Wire3384
    | Wire3387
    | Wire3392
    | Wire3397
    | Wire3400
    | Wire3404
    | Wire3408
    | Wire3413
    | Wire3417
    | Wire3420
    | Wire3423
    | Wire3427
    | undefined
}
type Wire3384 = Wire3385 | Wire3386
type Wire3385 = string
type Wire3386 = 'center' | 'left' | 'right'
type Wire3387 = Wire3388 | Wire3389 | Wire3117
type Wire3388 = string
type Wire3389 = Wire3390 | Wire3391
type Wire3390 = string
type Wire3391 = string
type Wire3392 = Wire3393 | Wire3394 | Wire3117
type Wire3393 = string
type Wire3394 = Wire3395 | Wire3396
type Wire3395 = string
type Wire3396 = string
type Wire3397 = Wire3398 | Wire3399
type Wire3398 = string
type Wire3399 = string
type Wire3400 = Wire3401 | Wire3402 | Wire3403
type Wire3401 = string
type Wire3402 = string
type Wire3403 = number
type Wire3404 = Wire3405 | Wire3406 | Wire3407
type Wire3405 = string
type Wire3406 = string
type Wire3407 = number
type Wire3408 = Wire3409 | Wire3410 | Wire3117
type Wire3409 = string
type Wire3410 = Wire3411 | Wire3412
type Wire3411 = string
type Wire3412 = string
type Wire3413 = Wire3414 | Wire3415 | Wire3416
type Wire3414 = string
type Wire3415 = string
type Wire3416 = number
type Wire3417 = Wire3418 | Wire3419
type Wire3418 = string
type Wire3419 = string
type Wire3420 = Wire3421 | Wire3422
type Wire3421 = string
type Wire3422 = 'bottom' | 'center' | 'top'
type Wire3423 = Wire3424 | Wire3425 | Wire3426
type Wire3424 = string
type Wire3425 = string
type Wire3426 = number
type Wire3427 = Wire3428 | Wire3429 | Wire3430
type Wire3428 = string
type Wire3429 = string
type Wire3430 = number
type Wire3431 = Wire3432 | Wire3433
type Wire3432 = string
type Wire3433 = Array<Wire3381>
type Wire3434 = Wire3435 | Wire3436 | Wire3441
type Wire3435 = string
type Wire3436 = Wire3437 | Wire3438 | Wire3117
type Wire3437 = string
type Wire3438 = Wire3439 | Wire3440
type Wire3439 = string
type Wire3440 = string
type Wire3441 = Wire3442 | Wire3443
type Wire3442 = string
type Wire3443 = string
type Wire3444 = Wire3445 | Wire3446
type Wire3445 = string
type Wire3446 = Wire3447 | Wire3448
type Wire3447 = boolean
type Wire3448 = 'false' | 'true'
type Wire3449 = Wire3450 | Wire3451
type Wire3450 = string
type Wire3451 =
  | 'Bilevel'
  | 'ColorSeparation'
  | 'ColorSeparationAlpha'
  | 'Grayscale'
  | 'GrayscaleAlpha'
  | 'Palette'
  | 'PaletteAlpha'
  | 'TrueColor'
  | 'TrueColorAlpha'
type Wire3452 = Wire3453 | Wire3454 | Wire3455
type Wire3453 = string
type Wire3454 = string
type Wire3455 = number
type Wire3456 = Wire3457 | Wire3296 | Wire3458
type Wire3457 = string
type Wire3458 = Wire3459 | Wire3460
type Wire3459 = string
type Wire3460 = Array<Wire3296>
type Wire3461 = Wire3462 | Wire3463
type Wire3462 = string
type Wire3463 = Wire3464 | Wire3465
type Wire3464 = boolean
type Wire3465 = 'false' | 'true'
type Wire3466 = Wire3467 | Wire3468
type Wire3467 = string
type Wire3468 = Wire3469 | Wire3470
type Wire3469 = boolean
type Wire3470 = 'false' | 'true'
type Wire3471 = Wire3472 | Wire3473
type Wire3472 = string
type Wire3473 = 'area' | 'fit' | 'min_fit' | 'stretch'
type Wire3474 = Wire3475 | Wire3476
type Wire3475 = string
type Wire3476 = string
type Wire3477 = Wire3478 | Wire3479
type Wire3478 = string
type Wire3479 = string
type Wire3480 = Wire3481 | Wire3482 | Wire3483
type Wire3481 = string
type Wire3482 = string
type Wire3483 = number
type Wire3484 = Wire3485 | Wire3486 | Wire3487
type Wire3485 = string
type Wire3486 = string
type Wire3487 = number
type Wire3488 = Wire3489 | Wire2614
type Wire3489 = string
type Wire3490 = Wire3491 | Wire3492
type Wire3491 = string
type Wire3492 = Wire3493 | Wire3494
type Wire3493 = boolean
type Wire3494 = 'false' | 'true'
type Wire3495 = {
  data_to_write?: Wire3496
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3498
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3496 = { [key: string]: Wire3497 | undefined }
type Wire3497 = JsonValue
type Wire3498 = '/meta/write'
type Wire3499 = {
  bucket?: Wire3500
  credentials?: Wire3503
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire3506
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire3509
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2146
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire3512
  secret?: Wire3513
  user_meta?: Wire1442
}
type Wire3500 = Wire3501 | Wire3502
type Wire3501 = string
type Wire3502 = string
type Wire3503 = Wire3504 | Wire3505
type Wire3504 = string
type Wire3505 = string
type Wire3506 = Wire3507 | Wire3508
type Wire3507 = string
type Wire3508 = string
type Wire3509 = Wire3510 | Wire3511
type Wire3510 = string
type Wire3511 = string
type Wire3512 = '/minio/import'
type Wire3513 = Wire3514 | Wire3515
type Wire3514 = string
type Wire3515 = string
type Wire3516 = {
  acl?: Wire2016
  bucket?: Wire3517
  credentials?: Wire3503
  force_accept?: Wire1380
  headers?: Wire3520
  host?: Wire3524
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire3527
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3530
  secret?: Wire3531
  sign_urls_for?: Wire3534
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3517 = Wire3518 | Wire3519
type Wire3518 = string
type Wire3519 = string
type Wire3520 = { [key: string]: Wire3521 | undefined }
type Wire3521 = Wire3522 | Wire3523
type Wire3522 = string
type Wire3523 = string
type Wire3524 = Wire3525 | Wire3526
type Wire3525 = string
type Wire3526 = string
type Wire3527 = Wire3528 | Wire3529
type Wire3528 = string
type Wire3529 = string
type Wire3530 = '/minio/store'
type Wire3531 = Wire3532 | Wire3533
type Wire3532 = string
type Wire3533 = string
type Wire3534 = Wire3535 | Wire3536 | Wire3537
type Wire3535 = string
type Wire3536 = string
type Wire3537 = number
type Wire3538 = {
  bucket?: Wire3539
  bucket_region?: Wire3542
  credentials?: Wire3545
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire3548
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire3551
  queue?: Wire1429
  range?: Wire3556
  recursive?: Wire2146
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire3561
  secret?: Wire3562
  user_meta?: Wire1442
}
type Wire3539 = Wire3540 | Wire3541
type Wire3540 = string
type Wire3541 = string
type Wire3542 = Wire3543 | Wire3544
type Wire3543 = string
type Wire3544 = string
type Wire3545 = Wire3546 | Wire3547
type Wire3546 = string
type Wire3547 = string
type Wire3548 = Wire3549 | Wire3550
type Wire3549 = string
type Wire3550 = string
type Wire3551 = Wire3552 | Wire3553 | Wire1391
type Wire3552 = string
type Wire3553 = Wire3554 | Wire3555
type Wire3554 = string
type Wire3555 = string
type Wire3556 = Wire3557 | Wire3558 | Wire1391
type Wire3557 = string
type Wire3558 = Wire3559 | Wire3560
type Wire3559 = string
type Wire3560 = string
type Wire3561 = '/s3/import'
type Wire3562 = Wire3563 | Wire3564
type Wire3563 = string
type Wire3564 = string
type Wire3565 = {
  acl?: Wire3566
  bucket?: Wire3569
  bucket_region?: Wire3572
  check_integrity?: Wire3575
  credentials?: Wire3545
  force_accept?: Wire1380
  headers?: Wire3580
  host?: Wire3584
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire3587
  no_vhost?: Wire3590
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3595
  secret?: Wire3596
  session_token?: Wire3599
  sign_urls_for?: Wire3602
  tags?: Wire3606
  url_prefix?: Wire3610
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3566 = Wire3567 | Wire3568
type Wire3567 = string
type Wire3568 = 'bucket-default' | 'private' | 'public' | 'public-read'
type Wire3569 = Wire3570 | Wire3571
type Wire3570 = string
type Wire3571 = string
type Wire3572 = Wire3573 | Wire3574
type Wire3573 = string
type Wire3574 = string
type Wire3575 = Wire3576 | Wire3577
type Wire3576 = string
type Wire3577 = Wire3578 | Wire3579
type Wire3578 = boolean
type Wire3579 = 'false' | 'true'
type Wire3580 = { [key: string]: Wire3581 | undefined }
type Wire3581 = Wire3582 | Wire3583
type Wire3582 = string
type Wire3583 = string
type Wire3584 = Wire3585 | Wire3586
type Wire3585 = string
type Wire3586 = string
type Wire3587 = Wire3588 | Wire3589
type Wire3588 = string
type Wire3589 = string
type Wire3590 = Wire3591 | Wire3592
type Wire3591 = string
type Wire3592 = Wire3593 | Wire3594
type Wire3593 = boolean
type Wire3594 = 'false' | 'true'
type Wire3595 = '/s3/store'
type Wire3596 = Wire3597 | Wire3598
type Wire3597 = string
type Wire3598 = string
type Wire3599 = Wire3600 | Wire3601
type Wire3600 = string
type Wire3601 = string
type Wire3602 = Wire3603 | Wire3604 | Wire3605
type Wire3603 = string
type Wire3604 = string
type Wire3605 = number
type Wire3606 = { [key: string]: Wire3607 | undefined }
type Wire3607 = Wire3608 | Wire3609
type Wire3608 = string
type Wire3609 = string
type Wire3610 = Wire3611 | Wire3612
type Wire3611 = string
type Wire3612 = string
type Wire3613 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3614
  script: Wire3615
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3614 = '/script/run'
type Wire3615 = Wire3616 | Wire3617
type Wire3616 = string
type Wire3617 = string
type Wire3618 = {
  credentials?: Wire3619
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire3622
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  path: Wire3625
  port?: Wire2757
  public_key?: Wire3628
  queue?: Wire1429
  recursive?: Wire3631
  result?: Wire1436
  robot: Wire3636
  user?: Wire3637
  user_meta?: Wire1442
}
type Wire3619 = Wire3620 | Wire3621
type Wire3620 = string
type Wire3621 = string
type Wire3622 = Wire3623 | Wire3624
type Wire3623 = string
type Wire3624 = string
type Wire3625 = Wire3626 | Wire3627
type Wire3626 = string
type Wire3627 = string
type Wire3628 = Wire3629 | Wire3630
type Wire3629 = string
type Wire3630 = string
type Wire3631 = Wire3632 | Wire3633
type Wire3632 = string
type Wire3633 = Wire3634 | Wire3635
type Wire3634 = boolean
type Wire3635 = 'false' | 'true'
type Wire3636 = '/sftp/import'
type Wire3637 = Wire3638 | Wire3639
type Wire3638 = string
type Wire3639 = string
type Wire3640 = {
  credentials?: Wire3619
  file_chmod?: Wire3641
  force_accept?: Wire1380
  host?: Wire3644
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire1902
  port?: Wire2757
  public_key?: Wire3647
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3650
  ssl_url_template?: Wire3651
  url_template?: Wire3654
  use?: Wire1624
  user?: Wire3657
  user_meta?: Wire1442
}
type Wire3641 = Wire3642 | Wire3643
type Wire3642 = string
type Wire3643 = string
type Wire3644 = Wire3645 | Wire3646
type Wire3645 = string
type Wire3646 = string
type Wire3647 = Wire3648 | Wire3649
type Wire3648 = string
type Wire3649 = string
type Wire3650 = '/sftp/store'
type Wire3651 = Wire3652 | Wire3653
type Wire3652 = string
type Wire3653 = string
type Wire3654 = Wire3655 | Wire3656
type Wire3655 = string
type Wire3656 = string
type Wire3657 = Wire3658 | Wire3659
type Wire3658 = string
type Wire3659 = string
type Wire3660 = {
  force_accept?: Wire1380
  format?: Wire3661
  granularity?: Wire3664
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  max_speakers?: Wire3667
  output_meta?: Wire1418
  provider?: Wire3671
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3674
  source_language?: Wire3675
  speaker_labels?: Wire3678
  target_language?: Wire3683
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3661 = Wire3662 | Wire3663
type Wire3662 = string
type Wire3663 = 'json' | 'meta' | 'srt' | 'text' | 'webvtt'
type Wire3664 = Wire3665 | Wire3666
type Wire3665 = string
type Wire3666 = 'full' | 'list'
type Wire3667 = Wire3668 | Wire3669 | Wire3670
type Wire3668 = string
type Wire3669 = string
type Wire3670 = number
type Wire3671 = Wire3672 | Wire3673
type Wire3672 = string
type Wire3673 = 'auto' | 'aws' | 'gcp' | 'replicate'
type Wire3674 = '/speech/transcribe'
type Wire3675 = Wire3676 | Wire3677
type Wire3676 = string
type Wire3677 = string
type Wire3678 = Wire3679 | Wire3680
type Wire3679 = string
type Wire3680 = Wire3681 | Wire3682
type Wire3681 = boolean
type Wire3682 = 'false' | 'true'
type Wire3683 = Wire3684 | Wire3685
type Wire3684 = string
type Wire3685 = string
type Wire3686 = {
  bucket?: Wire3687
  bucket_region?: Wire3690
  credentials?: Wire3693
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire3696
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire3699
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2001
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire3702
  secret?: Wire3703
  user_meta?: Wire1442
}
type Wire3687 = Wire3688 | Wire3689
type Wire3688 = string
type Wire3689 = string
type Wire3690 = Wire3691 | Wire3692
type Wire3691 = string
type Wire3692 = string
type Wire3693 = Wire3694 | Wire3695
type Wire3694 = string
type Wire3695 = string
type Wire3696 = Wire3697 | Wire3698
type Wire3697 = string
type Wire3698 = string
type Wire3699 = Wire3700 | Wire3701
type Wire3700 = string
type Wire3701 = string
type Wire3702 = '/supabase/import'
type Wire3703 = Wire3704 | Wire3705
type Wire3704 = string
type Wire3705 = string
type Wire3706 = {
  bucket?: Wire3707
  bucket_region?: Wire3710
  credentials?: Wire3693
  force_accept?: Wire1380
  headers?: Wire3713
  host?: Wire3717
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire3720
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3723
  secret?: Wire3724
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3707 = Wire3708 | Wire3709
type Wire3708 = string
type Wire3709 = string
type Wire3710 = Wire3711 | Wire3712
type Wire3711 = string
type Wire3712 = string
type Wire3713 = { [key: string]: Wire3714 | undefined }
type Wire3714 = Wire3715 | Wire3716
type Wire3715 = string
type Wire3716 = string
type Wire3717 = Wire3718 | Wire3719
type Wire3718 = string
type Wire3719 = string
type Wire3720 = Wire3721 | Wire3722
type Wire3721 = string
type Wire3722 = string
type Wire3723 = '/supabase/store'
type Wire3724 = Wire3725 | Wire3726
type Wire3725 = string
type Wire3726 = string
type Wire3727 = {
  bucket?: Wire3728
  credentials?: Wire3731
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire3734
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire3737
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire3740
  queue?: Wire1429
  recursive?: Wire2146
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire3745
  secret?: Wire3746
  user_meta?: Wire1442
}
type Wire3728 = Wire3729 | Wire3730
type Wire3729 = string
type Wire3730 = string
type Wire3731 = Wire3732 | Wire3733
type Wire3732 = string
type Wire3733 = string
type Wire3734 = Wire3735 | Wire3736
type Wire3735 = string
type Wire3736 = string
type Wire3737 = Wire3738 | Wire3739
type Wire3738 = string
type Wire3739 = string
type Wire3740 = Wire3741 | Wire3742 | Wire1391
type Wire3741 = string
type Wire3742 = Wire3743 | Wire3744
type Wire3743 = string
type Wire3744 = string
type Wire3745 = '/swift/import'
type Wire3746 = Wire3747 | Wire3748
type Wire3747 = string
type Wire3748 = string
type Wire3749 = {
  acl?: Wire2016
  bucket?: Wire3750
  credentials?: Wire3731
  force_accept?: Wire1380
  headers?: Wire3753
  host?: Wire3757
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire3760
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3763
  secret?: Wire3764
  sign_urls_for?: Wire2042
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3750 = Wire3751 | Wire3752
type Wire3751 = string
type Wire3752 = string
type Wire3753 = { [key: string]: Wire3754 | undefined }
type Wire3754 = Wire3755 | Wire3756
type Wire3755 = string
type Wire3756 = string
type Wire3757 = Wire3758 | Wire3759
type Wire3758 = string
type Wire3759 = string
type Wire3760 = Wire3761 | Wire3762
type Wire3761 = string
type Wire3762 = string
type Wire3763 = '/swift/store'
type Wire3764 = Wire3765 | Wire3766
type Wire3765 = string
type Wire3766 = string
type Wire3767 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  prompt?: Wire3768
  provider?: Wire2998
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3773
  ssml?: Wire3774
  target_language?: Wire3779
  use?: Wire1624
  user_meta?: Wire1442
  voice?: Wire3782
}
type Wire3768 = Wire3769 | Wire3772
type Wire3769 = Wire3770 | Wire3771
type Wire3770 = string
type Wire3771 = string
type Wire3772 = null
type Wire3773 = '/text/speak'
type Wire3774 = Wire3775 | Wire3776
type Wire3775 = string
type Wire3776 = Wire3777 | Wire3778
type Wire3777 = boolean
type Wire3778 = 'false' | 'true'
type Wire3779 = Wire3780 | Wire3781
type Wire3780 = string
type Wire3781 = string
type Wire3782 = Wire3783 | Wire3784
type Wire3783 = string
type Wire3784 = 'female-1' | 'female-2' | 'female-3' | 'female-child-1' | 'male-1' | 'male-child-1'
type Wire3785 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  provider?: Wire2998
  queue?: Wire1429
  result?: Wire1436
  robot: Wire3786
  source_language?: Wire3787
  target_language?: Wire3790
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3786 = '/text/translate'
type Wire3787 = Wire3788 | Wire3789
type Wire3788 = string
type Wire3789 =
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
type Wire3790 = Wire3791 | Wire3789
type Wire3791 = string
type Wire3792 = {
  credentials?: Wire3793
  force_accept?: Wire1380
  format?: Wire3798
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  mcp_servers?: Wire3801
  messages: Wire3826
  model?: Wire4235
  output_meta?: Wire1418
  queue?: Wire1429
  reasoning_effort?: Wire4243
  result?: Wire1436
  return_messages?: Wire4246
  robot: Wire4249
  schema?: Wire4250
  system_message?: Wire4253
  test_credentials?: Wire4256
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire3793 = Wire3794 | Wire3795 | Wire1391
type Wire3794 = string
type Wire3795 = Wire3796 | Wire3797
type Wire3796 = string
type Wire3797 = string
type Wire3798 = Wire3799 | Wire3800
type Wire3799 = string
type Wire3800 = 'json' | 'meta' | 'text'
type Wire3801 = Wire3802 | Wire3803
type Wire3802 = string
type Wire3803 = Array<Wire3804>
type Wire3804 = Wire3805 | Wire3806
type Wire3805 = string
type Wire3806 = {
  allowed_tools?: Wire3807
  auth?: Wire3813
  headers?: Wire3816
  type: Wire3820
  url: Wire3823
  [key: string]: JsonValue | Wire3807 | Wire3813 | Wire3816 | Wire3820 | Wire3823 | undefined
}
type Wire3807 = Wire3808 | Wire3809
type Wire3808 = string
type Wire3809 = Array<Wire3810>
type Wire3810 = Wire3811 | Wire3812
type Wire3811 = string
type Wire3812 = string
type Wire3813 = Wire3814 | Wire3815
type Wire3814 = string
type Wire3815 = 'transloadit'
type Wire3816 = { [key: string]: Wire3817 | undefined }
type Wire3817 = Wire3818 | Wire3819
type Wire3818 = string
type Wire3819 = string
type Wire3820 = Wire3821 | Wire3822
type Wire3821 = string
type Wire3822 = 'http' | 'sse'
type Wire3823 = Wire3824 | Wire3825
type Wire3824 = string
type Wire3825 = string
type Wire3826 = Wire3827 | Wire3828 | Wire3831
type Wire3827 = string
type Wire3828 = Wire3829 | Wire3830
type Wire3829 = string
type Wire3830 = string
type Wire3831 = Wire3832 | Wire3833
type Wire3832 = string
type Wire3833 = Array<Wire3834>
type Wire3834 = Wire3835 | Wire3836
type Wire3835 = string
type Wire3836 = Wire3837 | Wire3859 | Wire4001 | Wire4217
type Wire3837 = Wire3838 | Wire3851 | Wire3855
type Wire3838 = {
  content: Wire3839
  experimental_providerMetadata?: Wire3840
  providerOptions: Wire3841
  role: Wire3850
  [key: string]: JsonValue | Wire3839 | Wire3840 | Wire3841 | Wire3850 | undefined
}
type Wire3839 = string
type Wire3840 = JsonValue
type Wire3841 = { [key: string]: Wire3842 | undefined }
type Wire3842 = { [key: string]: Wire3843 | undefined }
type Wire3843 = Wire3844 | Wire3845 | Wire3846 | Wire3847 | Wire3848 | Wire3849
type Wire3844 = string
type Wire3845 = number
type Wire3846 = boolean
type Wire3847 = null
type Wire3848 = Array<Wire3843>
type Wire3849 = { [key: string]: Wire3843 | undefined }
type Wire3850 = 'system'
type Wire3851 = {
  content: Wire3852
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire3853
  role: Wire3854
  [key: string]: JsonValue | Wire3852 | Wire3841 | Wire3853 | Wire3854 | undefined
}
type Wire3852 = string
type Wire3853 = never
type Wire3854 = 'system'
type Wire3855 = {
  content: Wire3856
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire3857
  role: Wire3858
  [key: string]: JsonValue | Wire3856 | Wire3841 | Wire3857 | Wire3858 | undefined
}
type Wire3856 = string
type Wire3857 = null
type Wire3858 = 'system'
type Wire3859 = Wire3860 | Wire3995 | Wire3998
type Wire3860 = {
  content: Wire3861
  experimental_providerMetadata?: Wire3993
  providerOptions: Wire3841
  role: Wire3994
  [key: string]: JsonValue | Wire3861 | Wire3993 | Wire3841 | Wire3994 | undefined
}
type Wire3861 = Wire3862 | Wire3863
type Wire3862 = string
type Wire3863 = Array<Wire3864>
type Wire3864 = Wire3865 | Wire3878 | Wire3935 | Wire3974
type Wire3865 = Wire3866 | Wire3870 | Wire3874
type Wire3866 = {
  experimental_providerMetadata?: Wire3867
  providerOptions: Wire3841
  text: Wire3868
  type: Wire3869
  [key: string]: JsonValue | Wire3867 | Wire3841 | Wire3868 | Wire3869 | undefined
}
type Wire3867 = JsonValue
type Wire3868 = string
type Wire3869 = 'text'
type Wire3870 = {
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire3871
  text: Wire3872
  type: Wire3873
  [key: string]: JsonValue | Wire3841 | Wire3871 | Wire3872 | Wire3873 | undefined
}
type Wire3871 = never
type Wire3872 = string
type Wire3873 = 'text'
type Wire3874 = {
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire3875
  text: Wire3876
  type: Wire3877
  [key: string]: JsonValue | Wire3841 | Wire3875 | Wire3876 | Wire3877 | undefined
}
type Wire3875 = null
type Wire3876 = string
type Wire3877 = 'text'
type Wire3878 = Wire3879 | Wire3907
type Wire3879 = Wire3880 | Wire3889 | Wire3898
type Wire3880 = {
  experimental_providerMetadata?: Wire3881
  image: Wire3882
  mediaType: Wire3886
  mimeType?: Wire3887
  providerOptions: Wire3841
  type: Wire3888
  [key: string]:
    JsonValue | Wire3881 | Wire3882 | Wire3886 | Wire3887 | Wire3841 | Wire3888 | undefined
}
type Wire3881 = JsonValue
type Wire3882 = Wire3883 | Wire3884
type Wire3883 = string
type Wire3884 = { [key: string]: Wire3885 | undefined }
type Wire3885 = string
type Wire3886 = string
type Wire3887 = JsonValue
type Wire3888 = 'image'
type Wire3889 = {
  experimental_providerMetadata?: Wire3841
  image: Wire3890
  mediaType: Wire3894
  mimeType?: Wire3895
  providerOptions?: Wire3896
  type: Wire3897
  [key: string]:
    JsonValue | Wire3841 | Wire3890 | Wire3894 | Wire3895 | Wire3896 | Wire3897 | undefined
}
type Wire3890 = Wire3891 | Wire3892
type Wire3891 = string
type Wire3892 = { [key: string]: Wire3893 | undefined }
type Wire3893 = string
type Wire3894 = string
type Wire3895 = JsonValue
type Wire3896 = never
type Wire3897 = 'image'
type Wire3898 = {
  experimental_providerMetadata?: Wire3841
  image: Wire3899
  mediaType: Wire3903
  mimeType?: Wire3904
  providerOptions: Wire3905
  type: Wire3906
  [key: string]:
    JsonValue | Wire3841 | Wire3899 | Wire3903 | Wire3904 | Wire3905 | Wire3906 | undefined
}
type Wire3899 = Wire3900 | Wire3901
type Wire3900 = string
type Wire3901 = { [key: string]: Wire3902 | undefined }
type Wire3902 = string
type Wire3903 = string
type Wire3904 = JsonValue
type Wire3905 = null
type Wire3906 = 'image'
type Wire3907 = Wire3908 | Wire3917 | Wire3926
type Wire3908 = {
  experimental_providerMetadata?: Wire3909
  image: Wire3910
  mediaType?: Wire3914
  mimeType?: Wire3915
  providerOptions: Wire3841
  type: Wire3916
  [key: string]:
    JsonValue | Wire3909 | Wire3910 | Wire3914 | Wire3915 | Wire3841 | Wire3916 | undefined
}
type Wire3909 = JsonValue
type Wire3910 = Wire3911 | Wire3912
type Wire3911 = string
type Wire3912 = { [key: string]: Wire3913 | undefined }
type Wire3913 = string
type Wire3914 = never
type Wire3915 = string
type Wire3916 = 'image'
type Wire3917 = {
  experimental_providerMetadata?: Wire3841
  image: Wire3918
  mediaType?: Wire3922
  mimeType?: Wire3923
  providerOptions?: Wire3924
  type: Wire3925
  [key: string]:
    JsonValue | Wire3841 | Wire3918 | Wire3922 | Wire3923 | Wire3924 | Wire3925 | undefined
}
type Wire3918 = Wire3919 | Wire3920
type Wire3919 = string
type Wire3920 = { [key: string]: Wire3921 | undefined }
type Wire3921 = string
type Wire3922 = never
type Wire3923 = string
type Wire3924 = never
type Wire3925 = 'image'
type Wire3926 = {
  experimental_providerMetadata?: Wire3841
  image: Wire3927
  mediaType?: Wire3931
  mimeType?: Wire3932
  providerOptions: Wire3933
  type: Wire3934
  [key: string]:
    JsonValue | Wire3841 | Wire3927 | Wire3931 | Wire3932 | Wire3933 | Wire3934 | undefined
}
type Wire3927 = Wire3928 | Wire3929
type Wire3928 = string
type Wire3929 = { [key: string]: Wire3930 | undefined }
type Wire3930 = string
type Wire3931 = never
type Wire3932 = string
type Wire3933 = null
type Wire3934 = 'image'
type Wire3935 = Wire3936 | Wire3956 | Wire3965
type Wire3936 = {
  data: Wire3937
  experimental_providerMetadata?: Wire3952
  filename?: Wire3953
  mediaType: Wire3954
  providerOptions: Wire3841
  type: Wire3955
  [key: string]:
    JsonValue | Wire3937 | Wire3952 | Wire3953 | Wire3954 | Wire3841 | Wire3955 | undefined
}
type Wire3937 = Wire3938 | Wire3949 | Wire3950
type Wire3938 = Wire3939 | Wire3942 | Wire3946
type Wire3939 = {
  data: Wire3940
  type: Wire3941
  [key: string]: JsonValue | Wire3940 | Wire3941 | undefined
}
type Wire3940 = string
type Wire3941 = 'data'
type Wire3942 = {
  reference: Wire3943
  type: Wire3945
  [key: string]: JsonValue | Wire3943 | Wire3945 | undefined
}
type Wire3943 = { [key: string]: Wire3944 | undefined }
type Wire3944 = string
type Wire3945 = 'reference'
type Wire3946 = {
  text: Wire3947
  type: Wire3948
  [key: string]: JsonValue | Wire3947 | Wire3948 | undefined
}
type Wire3947 = string
type Wire3948 = 'text'
type Wire3949 = string
type Wire3950 = { [key: string]: Wire3951 | undefined }
type Wire3951 = string
type Wire3952 = JsonValue
type Wire3953 = string
type Wire3954 = string
type Wire3955 = 'file'
type Wire3956 = {
  data: Wire3957
  experimental_providerMetadata?: Wire3841
  filename?: Wire3961
  mediaType: Wire3962
  providerOptions?: Wire3963
  type: Wire3964
  [key: string]:
    JsonValue | Wire3957 | Wire3841 | Wire3961 | Wire3962 | Wire3963 | Wire3964 | undefined
}
type Wire3957 = Wire3938 | Wire3958 | Wire3959
type Wire3958 = string
type Wire3959 = { [key: string]: Wire3960 | undefined }
type Wire3960 = string
type Wire3961 = string
type Wire3962 = string
type Wire3963 = never
type Wire3964 = 'file'
type Wire3965 = {
  data: Wire3966
  experimental_providerMetadata?: Wire3841
  filename?: Wire3970
  mediaType: Wire3971
  providerOptions: Wire3972
  type: Wire3973
  [key: string]:
    JsonValue | Wire3966 | Wire3841 | Wire3970 | Wire3971 | Wire3972 | Wire3973 | undefined
}
type Wire3966 = Wire3938 | Wire3967 | Wire3968
type Wire3967 = string
type Wire3968 = { [key: string]: Wire3969 | undefined }
type Wire3969 = string
type Wire3970 = string
type Wire3971 = string
type Wire3972 = null
type Wire3973 = 'file'
type Wire3974 = Wire3975 | Wire3981 | Wire3987
type Wire3975 = {
  data: Wire3976
  experimental_providerMetadata?: Wire3977
  filename?: Wire3978
  mediaType: Wire3979
  providerOptions: Wire3841
  type: Wire3980
  [key: string]:
    JsonValue | Wire3976 | Wire3977 | Wire3978 | Wire3979 | Wire3841 | Wire3980 | undefined
}
type Wire3976 = string
type Wire3977 = JsonValue
type Wire3978 = string
type Wire3979 = string
type Wire3980 = 'media'
type Wire3981 = {
  data: Wire3982
  experimental_providerMetadata?: Wire3841
  filename?: Wire3983
  mediaType: Wire3984
  providerOptions?: Wire3985
  type: Wire3986
  [key: string]:
    JsonValue | Wire3982 | Wire3841 | Wire3983 | Wire3984 | Wire3985 | Wire3986 | undefined
}
type Wire3982 = string
type Wire3983 = string
type Wire3984 = string
type Wire3985 = never
type Wire3986 = 'media'
type Wire3987 = {
  data: Wire3988
  experimental_providerMetadata?: Wire3841
  filename?: Wire3989
  mediaType: Wire3990
  providerOptions: Wire3991
  type: Wire3992
  [key: string]:
    JsonValue | Wire3988 | Wire3841 | Wire3989 | Wire3990 | Wire3991 | Wire3992 | undefined
}
type Wire3988 = string
type Wire3989 = string
type Wire3990 = string
type Wire3991 = null
type Wire3992 = 'media'
type Wire3993 = JsonValue
type Wire3994 = 'user'
type Wire3995 = {
  content: Wire3861
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire3996
  role: Wire3997
  [key: string]: JsonValue | Wire3861 | Wire3841 | Wire3996 | Wire3997 | undefined
}
type Wire3996 = never
type Wire3997 = 'user'
type Wire3998 = {
  content: Wire3861
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire3999
  role: Wire4000
  [key: string]: JsonValue | Wire3861 | Wire3841 | Wire3999 | Wire4000 | undefined
}
type Wire3999 = null
type Wire4000 = 'user'
type Wire4001 = Wire4002 | Wire4211 | Wire4214
type Wire4002 = {
  content: Wire4003
  experimental_providerMetadata?: Wire4209
  providerOptions: Wire3841
  role: Wire4210
  [key: string]: JsonValue | Wire4003 | Wire4209 | Wire3841 | Wire4210 | undefined
}
type Wire4003 = Wire4004 | Wire4005
type Wire4004 = string
type Wire4005 = Array<Wire4006>
type Wire4006 =
  Wire3865 | Wire4007 | Wire3935 | Wire3974 | Wire4020 | Wire4033 | Wire4061 | Wire4086 | Wire4203
type Wire4007 = Wire4008 | Wire4012 | Wire4016
type Wire4008 = {
  experimental_providerMetadata?: Wire4009
  kind: Wire4010
  providerOptions: Wire3841
  type: Wire4011
  [key: string]: JsonValue | Wire4009 | Wire4010 | Wire3841 | Wire4011 | undefined
}
type Wire4009 = JsonValue
type Wire4010 = string
type Wire4011 = 'custom'
type Wire4012 = {
  experimental_providerMetadata?: Wire3841
  kind: Wire4013
  providerOptions?: Wire4014
  type: Wire4015
  [key: string]: JsonValue | Wire3841 | Wire4013 | Wire4014 | Wire4015 | undefined
}
type Wire4013 = string
type Wire4014 = never
type Wire4015 = 'custom'
type Wire4016 = {
  experimental_providerMetadata?: Wire3841
  kind: Wire4017
  providerOptions: Wire4018
  type: Wire4019
  [key: string]: JsonValue | Wire3841 | Wire4017 | Wire4018 | Wire4019 | undefined
}
type Wire4017 = string
type Wire4018 = null
type Wire4019 = 'custom'
type Wire4020 = Wire4021 | Wire4025 | Wire4029
type Wire4021 = {
  experimental_providerMetadata?: Wire4022
  providerOptions: Wire3841
  text: Wire4023
  type: Wire4024
  [key: string]: JsonValue | Wire4022 | Wire3841 | Wire4023 | Wire4024 | undefined
}
type Wire4022 = JsonValue
type Wire4023 = string
type Wire4024 = 'reasoning'
type Wire4025 = {
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire4026
  text: Wire4027
  type: Wire4028
  [key: string]: JsonValue | Wire3841 | Wire4026 | Wire4027 | Wire4028 | undefined
}
type Wire4026 = never
type Wire4027 = string
type Wire4028 = 'reasoning'
type Wire4029 = {
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire4030
  text: Wire4031
  type: Wire4032
  [key: string]: JsonValue | Wire3841 | Wire4030 | Wire4031 | Wire4032 | undefined
}
type Wire4030 = null
type Wire4031 = string
type Wire4032 = 'reasoning'
type Wire4033 = Wire4034 | Wire4043 | Wire4052
type Wire4034 = {
  data: Wire4035
  experimental_providerMetadata?: Wire4040
  mediaType: Wire4041
  providerOptions: Wire3841
  type: Wire4042
  [key: string]: JsonValue | Wire4035 | Wire4040 | Wire4041 | Wire3841 | Wire4042 | undefined
}
type Wire4035 = Wire4036 | Wire4039
type Wire4036 = {
  data: Wire4037
  type: Wire4038
  [key: string]: JsonValue | Wire4037 | Wire4038 | undefined
}
type Wire4037 = string
type Wire4038 = 'data'
type Wire4039 = string
type Wire4040 = JsonValue
type Wire4041 = string
type Wire4042 = 'reasoning-file'
type Wire4043 = {
  data: Wire4044
  experimental_providerMetadata?: Wire3841
  mediaType: Wire4049
  providerOptions?: Wire4050
  type: Wire4051
  [key: string]: JsonValue | Wire4044 | Wire3841 | Wire4049 | Wire4050 | Wire4051 | undefined
}
type Wire4044 = Wire4045 | Wire4048
type Wire4045 = {
  data: Wire4046
  type: Wire4047
  [key: string]: JsonValue | Wire4046 | Wire4047 | undefined
}
type Wire4046 = string
type Wire4047 = 'data'
type Wire4048 = string
type Wire4049 = string
type Wire4050 = never
type Wire4051 = 'reasoning-file'
type Wire4052 = {
  data: Wire4053
  experimental_providerMetadata?: Wire3841
  mediaType: Wire4058
  providerOptions: Wire4059
  type: Wire4060
  [key: string]: JsonValue | Wire4053 | Wire3841 | Wire4058 | Wire4059 | Wire4060 | undefined
}
type Wire4053 = Wire4054 | Wire4057
type Wire4054 = {
  data: Wire4055
  type: Wire4056
  [key: string]: JsonValue | Wire4055 | Wire4056 | undefined
}
type Wire4055 = string
type Wire4056 = 'data'
type Wire4057 = string
type Wire4058 = string
type Wire4059 = null
type Wire4060 = 'reasoning-file'
type Wire4061 = Wire4062 | Wire4070 | Wire4078
type Wire4062 = {
  args?: Wire4063
  experimental_providerMetadata?: Wire4064
  input?: Wire4065
  providerExecuted?: Wire4066
  providerOptions: Wire3841
  toolCallId: Wire4067
  toolName: Wire4068
  type: Wire4069
  [key: string]:
    | JsonValue
    | Wire4063
    | Wire4064
    | Wire4065
    | Wire4066
    | Wire3841
    | Wire4067
    | Wire4068
    | Wire4069
    | undefined
}
type Wire4063 = JsonValue
type Wire4064 = JsonValue
type Wire4065 = JsonValue
type Wire4066 = boolean
type Wire4067 = string
type Wire4068 = string
type Wire4069 = 'tool-call'
type Wire4070 = {
  args?: Wire4071
  experimental_providerMetadata?: Wire3841
  input?: Wire4072
  providerExecuted?: Wire4073
  providerOptions?: Wire4074
  toolCallId: Wire4075
  toolName: Wire4076
  type: Wire4077
  [key: string]:
    | JsonValue
    | Wire4071
    | Wire3841
    | Wire4072
    | Wire4073
    | Wire4074
    | Wire4075
    | Wire4076
    | Wire4077
    | undefined
}
type Wire4071 = JsonValue
type Wire4072 = JsonValue
type Wire4073 = boolean
type Wire4074 = never
type Wire4075 = string
type Wire4076 = string
type Wire4077 = 'tool-call'
type Wire4078 = {
  args?: Wire4079
  experimental_providerMetadata?: Wire3841
  input?: Wire4080
  providerExecuted?: Wire4081
  providerOptions: Wire4082
  toolCallId: Wire4083
  toolName: Wire4084
  type: Wire4085
  [key: string]:
    | JsonValue
    | Wire4079
    | Wire3841
    | Wire4080
    | Wire4081
    | Wire4082
    | Wire4083
    | Wire4084
    | Wire4085
    | undefined
}
type Wire4079 = JsonValue
type Wire4080 = JsonValue
type Wire4081 = boolean
type Wire4082 = null
type Wire4083 = string
type Wire4084 = string
type Wire4085 = 'tool-call'
type Wire4086 = Wire4087 | Wire4187 | Wire4195
type Wire4087 = {
  experimental_content?: Wire4088
  experimental_providerMetadata?: Wire4089
  isError?: Wire4090
  output?: Wire4091
  providerOptions: Wire3841
  result?: Wire4183
  toolCallId: Wire4184
  toolName: Wire4185
  type: Wire4186
  [key: string]:
    | JsonValue
    | Wire4088
    | Wire4089
    | Wire4090
    | Wire4091
    | Wire3841
    | Wire4183
    | Wire4184
    | Wire4185
    | Wire4186
    | undefined
}
type Wire4088 = JsonValue
type Wire4089 = JsonValue
type Wire4090 = JsonValue
type Wire4091 = Wire4092 | Wire4095 | Wire4097 | Wire4100 | Wire4103 | Wire4105
type Wire4092 = {
  providerOptions?: Wire3841
  type: Wire4093
  value: Wire4094
  [key: string]: JsonValue | Wire3841 | Wire4093 | Wire4094 | undefined
}
type Wire4093 = 'text'
type Wire4094 = string
type Wire4095 = {
  providerOptions?: Wire3841
  type: Wire4096
  value: Wire3843
  [key: string]: JsonValue | Wire3841 | Wire4096 | Wire3843 | undefined
}
type Wire4096 = 'json'
type Wire4097 = {
  providerOptions?: Wire3841
  reason?: Wire4098
  type: Wire4099
  [key: string]: JsonValue | Wire3841 | Wire4098 | Wire4099 | undefined
}
type Wire4098 = string
type Wire4099 = 'execution-denied'
type Wire4100 = {
  providerOptions?: Wire3841
  type: Wire4101
  value: Wire4102
  [key: string]: JsonValue | Wire3841 | Wire4101 | Wire4102 | undefined
}
type Wire4101 = 'error-text'
type Wire4102 = string
type Wire4103 = {
  providerOptions?: Wire3841
  type: Wire4104
  value: Wire3843
  [key: string]: JsonValue | Wire3841 | Wire4104 | Wire3843 | undefined
}
type Wire4104 = 'error-json'
type Wire4105 = {
  type: Wire4106
  value: Wire4107
  [key: string]: JsonValue | Wire4106 | Wire4107 | undefined
}
type Wire4106 = 'content'
type Wire4107 = Array<Wire4108>
type Wire4108 =
  | Wire3865
  | Wire4109
  | Wire4125
  | Wire4141
  | Wire4145
  | Wire4150
  | Wire4154
  | Wire4160
  | Wire4164
  | Wire4168
  | Wire4171
  | Wire4177
  | Wire4181
type Wire4109 = Wire4110 | Wire4115 | Wire4120
type Wire4110 = {
  data: Wire4111
  experimental_providerMetadata?: Wire4112
  mimeType?: Wire4113
  providerOptions: Wire3841
  type: Wire4114
  [key: string]: JsonValue | Wire4111 | Wire4112 | Wire4113 | Wire3841 | Wire4114 | undefined
}
type Wire4111 = string
type Wire4112 = JsonValue
type Wire4113 = JsonValue
type Wire4114 = 'image'
type Wire4115 = {
  data: Wire4116
  experimental_providerMetadata?: Wire3841
  mimeType?: Wire4117
  providerOptions?: Wire4118
  type: Wire4119
  [key: string]: JsonValue | Wire4116 | Wire3841 | Wire4117 | Wire4118 | Wire4119 | undefined
}
type Wire4116 = string
type Wire4117 = JsonValue
type Wire4118 = never
type Wire4119 = 'image'
type Wire4120 = {
  data: Wire4121
  experimental_providerMetadata?: Wire3841
  mimeType?: Wire4122
  providerOptions: Wire4123
  type: Wire4124
  [key: string]: JsonValue | Wire4121 | Wire3841 | Wire4122 | Wire4123 | Wire4124 | undefined
}
type Wire4121 = string
type Wire4122 = JsonValue
type Wire4123 = null
type Wire4124 = 'image'
type Wire4125 = Wire4126 | Wire4131 | Wire4136
type Wire4126 = {
  data: Wire4127
  experimental_providerMetadata?: Wire4128
  mediaType: Wire4129
  providerOptions: Wire3841
  type: Wire4130
  [key: string]: JsonValue | Wire4127 | Wire4128 | Wire4129 | Wire3841 | Wire4130 | undefined
}
type Wire4127 = string
type Wire4128 = JsonValue
type Wire4129 = string
type Wire4130 = 'media'
type Wire4131 = {
  data: Wire4132
  experimental_providerMetadata?: Wire3841
  mediaType: Wire4133
  providerOptions?: Wire4134
  type: Wire4135
  [key: string]: JsonValue | Wire4132 | Wire3841 | Wire4133 | Wire4134 | Wire4135 | undefined
}
type Wire4132 = string
type Wire4133 = string
type Wire4134 = never
type Wire4135 = 'media'
type Wire4136 = {
  data: Wire4137
  experimental_providerMetadata?: Wire3841
  mediaType: Wire4138
  providerOptions: Wire4139
  type: Wire4140
  [key: string]: JsonValue | Wire4137 | Wire3841 | Wire4138 | Wire4139 | Wire4140 | undefined
}
type Wire4137 = string
type Wire4138 = string
type Wire4139 = null
type Wire4140 = 'media'
type Wire4141 = {
  data: Wire3938
  filename?: Wire4142
  mediaType: Wire4143
  providerOptions?: Wire3841
  type: Wire4144
  [key: string]: JsonValue | Wire3938 | Wire4142 | Wire4143 | Wire3841 | Wire4144 | undefined
}
type Wire4142 = string
type Wire4143 = string
type Wire4144 = 'file'
type Wire4145 = {
  data: Wire4146
  filename?: Wire4147
  mediaType: Wire4148
  providerOptions?: Wire3841
  type: Wire4149
  [key: string]: JsonValue | Wire4146 | Wire4147 | Wire4148 | Wire3841 | Wire4149 | undefined
}
type Wire4146 = string
type Wire4147 = string
type Wire4148 = string
type Wire4149 = 'file-data'
type Wire4150 = {
  mediaType?: Wire4151
  providerOptions?: Wire3841
  type: Wire4152
  url: Wire4153
  [key: string]: JsonValue | Wire4151 | Wire3841 | Wire4152 | Wire4153 | undefined
}
type Wire4151 = string
type Wire4152 = 'file-url'
type Wire4153 = string
type Wire4154 = {
  fileId: Wire4155
  providerOptions?: Wire3841
  type: Wire4159
  [key: string]: JsonValue | Wire4155 | Wire3841 | Wire4159 | undefined
}
type Wire4155 = Wire4156 | Wire4157
type Wire4156 = string
type Wire4157 = { [key: string]: Wire4158 | undefined }
type Wire4158 = string
type Wire4159 = 'file-id'
type Wire4160 = {
  providerOptions?: Wire3841
  providerReference: Wire4161
  type: Wire4163
  [key: string]: JsonValue | Wire3841 | Wire4161 | Wire4163 | undefined
}
type Wire4161 = { [key: string]: Wire4162 | undefined }
type Wire4162 = string
type Wire4163 = 'file-reference'
type Wire4164 = {
  data: Wire4165
  mediaType: Wire4166
  providerOptions?: Wire3841
  type: Wire4167
  [key: string]: JsonValue | Wire4165 | Wire4166 | Wire3841 | Wire4167 | undefined
}
type Wire4165 = string
type Wire4166 = string
type Wire4167 = 'image-data'
type Wire4168 = {
  providerOptions?: Wire3841
  type: Wire4169
  url: Wire4170
  [key: string]: JsonValue | Wire3841 | Wire4169 | Wire4170 | undefined
}
type Wire4169 = 'image-url'
type Wire4170 = string
type Wire4171 = {
  fileId: Wire4172
  providerOptions?: Wire3841
  type: Wire4176
  [key: string]: JsonValue | Wire4172 | Wire3841 | Wire4176 | undefined
}
type Wire4172 = Wire4173 | Wire4174
type Wire4173 = string
type Wire4174 = { [key: string]: Wire4175 | undefined }
type Wire4175 = string
type Wire4176 = 'image-file-id'
type Wire4177 = {
  providerOptions?: Wire3841
  providerReference: Wire4178
  type: Wire4180
  [key: string]: JsonValue | Wire3841 | Wire4178 | Wire4180 | undefined
}
type Wire4178 = { [key: string]: Wire4179 | undefined }
type Wire4179 = string
type Wire4180 = 'image-file-reference'
type Wire4181 = {
  providerOptions?: Wire3841
  type: Wire4182
  [key: string]: JsonValue | Wire3841 | Wire4182 | undefined
}
type Wire4182 = 'custom'
type Wire4183 = JsonValue
type Wire4184 = string
type Wire4185 = string
type Wire4186 = 'tool-result'
type Wire4187 = {
  experimental_content?: Wire4188
  experimental_providerMetadata?: Wire3841
  isError?: Wire4189
  output?: Wire4091
  providerOptions?: Wire4190
  result?: Wire4191
  toolCallId: Wire4192
  toolName: Wire4193
  type: Wire4194
  [key: string]:
    | JsonValue
    | Wire4188
    | Wire3841
    | Wire4189
    | Wire4091
    | Wire4190
    | Wire4191
    | Wire4192
    | Wire4193
    | Wire4194
    | undefined
}
type Wire4188 = JsonValue
type Wire4189 = JsonValue
type Wire4190 = never
type Wire4191 = JsonValue
type Wire4192 = string
type Wire4193 = string
type Wire4194 = 'tool-result'
type Wire4195 = {
  experimental_content?: Wire4196
  experimental_providerMetadata?: Wire3841
  isError?: Wire4197
  output?: Wire4091
  providerOptions: Wire4198
  result?: Wire4199
  toolCallId: Wire4200
  toolName: Wire4201
  type: Wire4202
  [key: string]:
    | JsonValue
    | Wire4196
    | Wire3841
    | Wire4197
    | Wire4091
    | Wire4198
    | Wire4199
    | Wire4200
    | Wire4201
    | Wire4202
    | undefined
}
type Wire4196 = JsonValue
type Wire4197 = JsonValue
type Wire4198 = null
type Wire4199 = JsonValue
type Wire4200 = string
type Wire4201 = string
type Wire4202 = 'tool-result'
type Wire4203 = {
  approvalId: Wire4204
  isAutomatic?: Wire4205
  signature?: Wire4206
  toolCallId: Wire4207
  type: Wire4208
  [key: string]: JsonValue | Wire4204 | Wire4205 | Wire4206 | Wire4207 | Wire4208 | undefined
}
type Wire4204 = string
type Wire4205 = boolean
type Wire4206 = string
type Wire4207 = string
type Wire4208 = 'tool-approval-request'
type Wire4209 = JsonValue
type Wire4210 = 'assistant'
type Wire4211 = {
  content: Wire4003
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire4212
  role: Wire4213
  [key: string]: JsonValue | Wire4003 | Wire3841 | Wire4212 | Wire4213 | undefined
}
type Wire4212 = never
type Wire4213 = 'assistant'
type Wire4214 = {
  content: Wire4003
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire4215
  role: Wire4216
  [key: string]: JsonValue | Wire4003 | Wire3841 | Wire4215 | Wire4216 | undefined
}
type Wire4215 = null
type Wire4216 = 'assistant'
type Wire4217 = Wire4218 | Wire4229 | Wire4232
type Wire4218 = {
  content: Wire4219
  experimental_providerMetadata?: Wire4227
  providerOptions: Wire3841
  role: Wire4228
  [key: string]: JsonValue | Wire4219 | Wire4227 | Wire3841 | Wire4228 | undefined
}
type Wire4219 = Array<Wire4220>
type Wire4220 = Wire4086 | Wire4221
type Wire4221 = {
  approvalId: Wire4222
  approved: Wire4223
  providerExecuted?: Wire4224
  reason?: Wire4225
  type: Wire4226
  [key: string]: JsonValue | Wire4222 | Wire4223 | Wire4224 | Wire4225 | Wire4226 | undefined
}
type Wire4222 = string
type Wire4223 = boolean
type Wire4224 = boolean
type Wire4225 = string
type Wire4226 = 'tool-approval-response'
type Wire4227 = JsonValue
type Wire4228 = 'tool'
type Wire4229 = {
  content: Wire4219
  experimental_providerMetadata?: Wire3841
  providerOptions?: Wire4230
  role: Wire4231
  [key: string]: JsonValue | Wire4219 | Wire3841 | Wire4230 | Wire4231 | undefined
}
type Wire4230 = never
type Wire4231 = 'tool'
type Wire4232 = {
  content: Wire4219
  experimental_providerMetadata?: Wire3841
  providerOptions: Wire4233
  role: Wire4234
  [key: string]: JsonValue | Wire4219 | Wire3841 | Wire4233 | Wire4234 | undefined
}
type Wire4233 = null
type Wire4234 = 'tool'
type Wire4235 = Wire4236 | Wire4237 | Wire4240
type Wire4236 = string
type Wire4237 = Wire4238 | Wire4239
type Wire4238 = string
type Wire4239 =
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
type Wire4240 = Wire4241 | Wire4242
type Wire4241 = string
type Wire4242 = 'auto'
type Wire4243 = Wire4244 | Wire4245
type Wire4244 = string
type Wire4245 = 'high' | 'low' | 'medium' | 'xhigh'
type Wire4246 = Wire4247 | Wire4248
type Wire4247 = string
type Wire4248 = 'all' | 'last'
type Wire4249 = '/ai/chat'
type Wire4250 = Wire4251 | Wire4252
type Wire4251 = string
type Wire4252 = string
type Wire4253 = Wire4254 | Wire4255
type Wire4254 = string
type Wire4255 = string
type Wire4256 = Wire4257 | Wire4258
type Wire4257 = string
type Wire4258 = Wire4259 | Wire4260
type Wire4259 = boolean
type Wire4260 = 'false' | 'true'
type Wire4261 = {
  bucket?: Wire4262
  bucket_region?: Wire4265
  credentials?: Wire4268
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire4271
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire4274
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2146
  result?: Wire1436
  return_file_stubs?: Wire2006
  robot: Wire4277
  secret?: Wire4278
  user_meta?: Wire1442
}
type Wire4262 = Wire4263 | Wire4264
type Wire4263 = string
type Wire4264 = string
type Wire4265 = Wire4266 | Wire4267
type Wire4266 = string
type Wire4267 = string
type Wire4268 = Wire4269 | Wire4270
type Wire4269 = string
type Wire4270 = string
type Wire4271 = Wire4272 | Wire4273
type Wire4272 = string
type Wire4273 = string
type Wire4274 = Wire4275 | Wire4276
type Wire4275 = string
type Wire4276 = string
type Wire4277 = '/tigris/import'
type Wire4278 = Wire4279 | Wire4280
type Wire4279 = string
type Wire4280 = string
type Wire4281 = {
  acl?: Wire2016
  bucket?: Wire4282
  bucket_region?: Wire4285
  credentials?: Wire4268
  force_accept?: Wire1380
  headers?: Wire4288
  host?: Wire4292
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire4295
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4298
  secret?: Wire4299
  sign_urls_for?: Wire3534
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4282 = Wire4283 | Wire4284
type Wire4283 = string
type Wire4284 = string
type Wire4285 = Wire4286 | Wire4287
type Wire4286 = string
type Wire4287 = string
type Wire4288 = { [key: string]: Wire4289 | undefined }
type Wire4289 = Wire4290 | Wire4291
type Wire4290 = string
type Wire4291 = string
type Wire4292 = Wire4293 | Wire4294
type Wire4293 = string
type Wire4294 = string
type Wire4295 = Wire4296 | Wire4297
type Wire4296 = string
type Wire4297 = string
type Wire4298 = '/tigris/store'
type Wire4299 = Wire4300 | Wire4301
type Wire4300 = string
type Wire4301 = string
type Wire4302 = {
  enable_hipaa_compliance?: Wire4303
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4308
  user_meta?: Wire1442
}
type Wire4303 = Wire4304 | Wire4305
type Wire4304 = string
type Wire4305 = Wire4306 | Wire4307
type Wire4306 = boolean
type Wire4307 = 'false' | 'true'
type Wire4308 = '/tlcdn/deliver'
type Wire4309 = {
  conflict_strategy?: Wire4310
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  path?: Wire4313
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4316
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4310 = Wire4311 | Wire4312
type Wire4311 = string
type Wire4312 = 'error' | 'overwrite' | 'rename'
type Wire4313 = Wire4314 | Wire4315
type Wire4314 = string
type Wire4315 = string
type Wire4316 = '/transloadit/store'
type Wire4317 = {
  credentials?: Wire4318
  endpoint: Wire4321
  force_accept?: Wire1380
  headers?: Wire4324
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  metadata?: Wire4328
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4332
  ssl_url_template?: Wire4333
  url_template?: Wire4336
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4318 = Wire4319 | Wire4320
type Wire4319 = string
type Wire4320 = string
type Wire4321 = Wire4322 | Wire4323
type Wire4322 = string
type Wire4323 = string
type Wire4324 = { [key: string]: Wire4325 | undefined }
type Wire4325 = Wire4326 | Wire4327
type Wire4326 = string
type Wire4327 = string
type Wire4328 = { [key: string]: Wire4329 | undefined }
type Wire4329 = Wire4330 | Wire4331
type Wire4330 = string
type Wire4331 = string
type Wire4332 = '/tus/store'
type Wire4333 = Wire4334 | Wire4335
type Wire4334 = string
type Wire4335 = string
type Wire4336 = Wire4337 | Wire4338
type Wire4337 = string
type Wire4338 = string
type Wire4339 = {
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4340
  user_meta?: Wire1442
}
type Wire4340 = '/upload/handle'
type Wire4341 = {
  audio_group?: Wire4342
  closed_captions?: Wire4347
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  height?: Wire4352
  hls_playlist_name?: Wire4358
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  playlist_name?: Wire4361
  preset?: Wire4364
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4367
  segment_duration?: Wire4368
  technique?: Wire4372
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire4375
}
type Wire4342 = Wire4343 | Wire4344
type Wire4343 = string
type Wire4344 = Wire4345 | Wire4346
type Wire4345 = boolean
type Wire4346 = 'false' | 'true'
type Wire4347 = Wire4348 | Wire4349
type Wire4348 = string
type Wire4349 = Wire4350 | Wire4351
type Wire4350 = boolean
type Wire4351 = 'false' | 'true'
type Wire4352 = Wire4353 | Wire4357
type Wire4353 = Wire4354 | Wire4355 | Wire4356
type Wire4354 = string
type Wire4355 = string
type Wire4356 = number
type Wire4357 = null
type Wire4358 = Wire4359 | Wire4360
type Wire4359 = string
type Wire4360 = string
type Wire4361 = Wire4362 | Wire4363
type Wire4362 = string
type Wire4363 = string
type Wire4364 = Wire4365 | Wire4366
type Wire4365 = string
type Wire4366 =
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
type Wire4367 = '/video/adaptive'
type Wire4368 = Wire4369 | Wire4370 | Wire4371
type Wire4369 = string
type Wire4370 = string
type Wire4371 = number
type Wire4372 = Wire4373 | Wire4374
type Wire4373 = string
type Wire4374 = 'cmaf' | 'dash' | 'hls'
type Wire4375 = Wire4376 | Wire4380
type Wire4376 = Wire4377 | Wire4378 | Wire4379
type Wire4377 = string
type Wire4378 = string
type Wire4379 = number
type Wire4380 = null
type Wire4381 = {
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  method?: Wire4382
  output_meta?: Wire1418
  preset?: Wire1620
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4385
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4382 = Wire4383 | Wire4384
type Wire4383 = string
type Wire4384 = 'extract' | 'insert'
type Wire4385 = '/video/artwork'
type Wire4386 = {
  audio_fade_seconds?: Wire4387
  chapter_markers?: Wire4391
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  height?: Wire4352
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire4364
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4396
  sort_by?: Wire1663
  transition?: Wire4397
  transition_duration?: Wire4400
  use?: Wire1624
  user_meta?: Wire1442
  video_fade_seconds?: Wire4404
  width?: Wire4375
}
type Wire4387 = Wire4388 | Wire4389 | Wire4390
type Wire4388 = string
type Wire4389 = string
type Wire4390 = number
type Wire4391 = Wire4392 | Wire4393
type Wire4392 = string
type Wire4393 = Wire4394 | Wire4395
type Wire4394 = boolean
type Wire4395 = 'false' | 'true'
type Wire4396 = '/video/concat'
type Wire4397 = Wire4398 | Wire4399
type Wire4398 = string
type Wire4399 = 'crossfade' | 'fade_to_black' | 'none'
type Wire4400 = Wire4401 | Wire4402 | Wire4403
type Wire4401 = string
type Wire4402 = string
type Wire4403 = number
type Wire4404 = Wire4405 | Wire4406 | Wire4407
type Wire4405 = string
type Wire4406 = string
type Wire4407 = number
type Wire4408 = {
  background?: Wire4409
  chunk_duration?: Wire4412
  crop?: Wire4416
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  font_color?: Wire4421
  font_size?: Wire1466
  force_accept?: Wire1380
  height?: Wire4352
  hint?: Wire4424
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire4364
  queue?: Wire1429
  resize_strategy?: Wire4429
  result?: Wire1436
  robot: Wire4432
  rotate?: Wire4433
  segment?: Wire4453
  segment_duration?: Wire4458
  segment_name?: Wire4462
  segment_prefix?: Wire4465
  segment_time_delta?: Wire4468
  text_background_color?: Wire4472
  turbo?: Wire4475
  use?: Wire1624
  user_meta?: Wire1442
  watermark_duration?: Wire4480
  watermark_opacity?: Wire4484
  watermark_position?: Wire4488
  watermark_resize_strategy?: Wire4493
  watermark_size?: Wire4496
  watermark_start_time?: Wire4499
  watermark_url?: Wire4503
  watermark_x_offset?: Wire3480
  watermark_y_offset?: Wire3484
  width?: Wire4375
  zoom?: Wire4511
}
type Wire4409 = Wire4410 | Wire4411
type Wire4410 = string
type Wire4411 = string
type Wire4412 = Wire4413 | Wire4414 | Wire4415
type Wire4413 = string
type Wire4414 = string
type Wire4415 = number
type Wire4416 = Wire4417 | Wire3259 | Wire4418
type Wire4417 = string
type Wire4418 = Wire4419 | Wire4420
type Wire4419 = string
type Wire4420 = string
type Wire4421 = Wire4422 | Wire4423
type Wire4422 = string
type Wire4423 = string
type Wire4424 = Wire4425 | Wire4426
type Wire4425 = string
type Wire4426 = Wire4427 | Wire4428
type Wire4427 = boolean
type Wire4428 = 'false' | 'true'
type Wire4429 = Wire4430 | Wire4431
type Wire4430 = string
type Wire4431 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4432 = '/video/encode'
type Wire4433 = Wire4434 | Wire4435 | Wire4438 | Wire4441 | Wire4444 | Wire4447 | Wire4450
type Wire4434 = string
type Wire4435 = Wire4436 | Wire4437
type Wire4436 = string
type Wire4437 = 0
type Wire4438 = Wire4439 | Wire4440
type Wire4439 = string
type Wire4440 = 90
type Wire4441 = Wire4442 | Wire4443
type Wire4442 = string
type Wire4443 = 180
type Wire4444 = Wire4445 | Wire4446
type Wire4445 = string
type Wire4446 = 270
type Wire4447 = Wire4448 | Wire4449
type Wire4448 = string
type Wire4449 = 360
type Wire4450 = Wire4451 | Wire4452
type Wire4451 = string
type Wire4452 = false
type Wire4453 = Wire4454 | Wire4455
type Wire4454 = string
type Wire4455 = Wire4456 | Wire4457
type Wire4456 = boolean
type Wire4457 = 'false' | 'true'
type Wire4458 = Wire4459 | Wire4460 | Wire4461
type Wire4459 = string
type Wire4460 = string
type Wire4461 = number
type Wire4462 = Wire4463 | Wire4464
type Wire4463 = string
type Wire4464 = string
type Wire4465 = Wire4466 | Wire4467
type Wire4466 = string
type Wire4467 = string
type Wire4468 = Wire4469 | Wire4470 | Wire4471
type Wire4469 = string
type Wire4470 = string
type Wire4471 = number
type Wire4472 = Wire4473 | Wire4474
type Wire4473 = string
type Wire4474 = string
type Wire4475 = Wire4476 | Wire4477
type Wire4476 = string
type Wire4477 = Wire4478 | Wire4479
type Wire4478 = boolean
type Wire4479 = 'false' | 'true'
type Wire4480 = Wire4481 | Wire4482 | Wire4483
type Wire4481 = string
type Wire4482 = string
type Wire4483 = number
type Wire4484 = Wire4485 | Wire4486 | Wire4487
type Wire4485 = string
type Wire4486 = string
type Wire4487 = number
type Wire4488 = Wire4489 | Wire3296 | Wire4490
type Wire4489 = string
type Wire4490 = Wire4491 | Wire4492
type Wire4491 = string
type Wire4492 = Array<Wire3296>
type Wire4493 = Wire4494 | Wire4495
type Wire4494 = string
type Wire4495 = 'area' | 'fit' | 'stretch'
type Wire4496 = Wire4497 | Wire4498
type Wire4497 = string
type Wire4498 = string
type Wire4499 = Wire4500 | Wire4501 | Wire4502
type Wire4500 = string
type Wire4501 = string
type Wire4502 = number
type Wire4503 = Wire4504 | Wire4505 | Wire4508
type Wire4504 = string
type Wire4505 = Wire4506 | Wire4507
type Wire4506 = string
type Wire4507 = ''
type Wire4508 = Wire4509 | Wire4510
type Wire4509 = string
type Wire4510 = string
type Wire4511 = Wire4512 | Wire4513
type Wire4512 = string
type Wire4513 = Wire4514 | Wire4515
type Wire4514 = boolean
type Wire4515 = 'false' | 'true'
type Wire4516 = {
  aspect_ratio?: Wire4517
  camera_motion?: Wire4520
  duration?: Wire4523
  force_accept?: Wire1380
  format?: Wire4527
  fps?: Wire4530
  height?: Wire4534
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  model?: Wire4538
  motion_amount?: Wire4541
  negative_prompt?: Wire4545
  num_outputs?: Wire4548
  output_meta?: Wire1418
  prompt: Wire4552
  queue?: Wire1429
  reference_strength?: Wire4555
  result?: Wire1436
  robot: Wire4559
  seed?: Wire4560
  style?: Wire4564
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire4567
}
type Wire4517 = Wire4518 | Wire4519
type Wire4518 = string
type Wire4519 = string
type Wire4520 = Wire4521 | Wire4522
type Wire4521 = string
type Wire4522 = string
type Wire4523 = Wire4524 | Wire4525 | Wire4526
type Wire4524 = string
type Wire4525 = string
type Wire4526 = number
type Wire4527 = Wire4528 | Wire4529
type Wire4528 = string
type Wire4529 = 'gif' | 'mp4'
type Wire4530 = Wire4531 | Wire4532 | Wire4533
type Wire4531 = string
type Wire4532 = string
type Wire4533 = number
type Wire4534 = Wire4535 | Wire4536 | Wire4537
type Wire4535 = string
type Wire4536 = string
type Wire4537 = number
type Wire4538 = Wire4539 | Wire4540
type Wire4539 = string
type Wire4540 = string
type Wire4541 = Wire4542 | Wire4543 | Wire4544
type Wire4542 = string
type Wire4543 = string
type Wire4544 = number
type Wire4545 = Wire4546 | Wire4547
type Wire4546 = string
type Wire4547 = string
type Wire4548 = Wire4549 | Wire4550 | Wire4551
type Wire4549 = string
type Wire4550 = string
type Wire4551 = number
type Wire4552 = Wire4553 | Wire4554
type Wire4553 = string
type Wire4554 = string
type Wire4555 = Wire4556 | Wire4557 | Wire4558
type Wire4556 = string
type Wire4557 = string
type Wire4558 = number
type Wire4559 = '/video/generate'
type Wire4560 = Wire4561 | Wire4562 | Wire4563
type Wire4561 = string
type Wire4562 = string
type Wire4563 = number
type Wire4564 = Wire4565 | Wire4566
type Wire4565 = string
type Wire4566 = string
type Wire4567 = Wire4568 | Wire4569 | Wire4570
type Wire4568 = string
type Wire4569 = string
type Wire4570 = number
type Wire4571 = {
  audio_delay?: Wire4572
  background?: Wire4409
  duration?: Wire4576
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  framerate?: Wire4578
  height?: Wire4352
  ignore_errors?: Wire1611
  image_durations?: Wire4587
  image_url?: Wire4590
  interpolate?: Wire1410
  loop?: Wire4593
  output_meta?: Wire1418
  preset?: Wire4364
  queue?: Wire1429
  replace_audio?: Wire4598
  resize_strategy?: Wire4603
  result?: Wire1436
  robot: Wire4606
  sort_by?: Wire1663
  transition?: Wire4607
  transition_duration?: Wire4610
  use?: Wire1624
  user_meta?: Wire1442
  vstack?: Wire4614
  width?: Wire4375
}
type Wire4572 = Wire4573 | Wire4574 | Wire4575
type Wire4573 = string
type Wire4574 = string
type Wire4575 = number
type Wire4576 = Wire1466 | Wire4577
type Wire4577 = null
type Wire4578 = Wire4579 | Wire4580 | Wire4584
type Wire4579 = string
type Wire4580 = Wire4581 | Wire4582 | Wire4583
type Wire4581 = string
type Wire4582 = string
type Wire4583 = number
type Wire4584 = Wire4585 | Wire4586
type Wire4585 = string
type Wire4586 = string
type Wire4587 = Wire4588 | Wire4589
type Wire4588 = string
type Wire4589 = Array<Wire1466>
type Wire4590 = Wire4591 | Wire4592
type Wire4591 = string
type Wire4592 = string
type Wire4593 = Wire4594 | Wire4595
type Wire4594 = string
type Wire4595 = Wire4596 | Wire4597
type Wire4596 = boolean
type Wire4597 = 'false' | 'true'
type Wire4598 = Wire4599 | Wire4600
type Wire4599 = string
type Wire4600 = Wire4601 | Wire4602
type Wire4601 = boolean
type Wire4602 = 'false' | 'true'
type Wire4603 = Wire4604 | Wire4605
type Wire4604 = string
type Wire4605 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4606 = '/video/merge'
type Wire4607 = Wire4608 | Wire4609
type Wire4608 = string
type Wire4609 = 'crossfade' | 'fade_to_black' | 'none'
type Wire4610 = Wire4611 | Wire4612 | Wire4613
type Wire4611 = string
type Wire4612 = string
type Wire4613 = number
type Wire4614 = Wire4615 | Wire4616
type Wire4615 = string
type Wire4616 = Wire4617 | Wire4618
type Wire4617 = boolean
type Wire4618 = 'false' | 'true'
type Wire4619 = {
  asset?: Wire4620
  asset_param_name?: Wire4623
  enabled_variants?: Wire4626
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4631
  segment_duration?: Wire4632
  sign_urls_for?: Wire4636
  use?: Wire1624
  user_meta?: Wire1442
  variants: Wire4640
}
type Wire4620 = Wire4621 | Wire4622
type Wire4621 = string
type Wire4622 = string
type Wire4623 = Wire4624 | Wire4625
type Wire4624 = string
type Wire4625 = string
type Wire4626 = Wire4627 | Wire4628 | Wire1391
type Wire4627 = string
type Wire4628 = Wire4629 | Wire4630
type Wire4629 = string
type Wire4630 = string
type Wire4631 = '/video/ondemand'
type Wire4632 = Wire4633 | Wire4634 | Wire4635
type Wire4633 = string
type Wire4634 = string
type Wire4635 = number
type Wire4636 = Wire4637 | Wire4638 | Wire4639
type Wire4637 = string
type Wire4638 = string
type Wire4639 = number
type Wire4640 = { [key: string]: Wire4641 | undefined }
type Wire4641 = Wire4642 | Wire4643
type Wire4642 = string
type Wire4643 = {
  background?: Wire4409
  chunk_duration?: Wire4412
  crop?: Wire4416
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  height?: Wire4352
  hint?: Wire4644
  preset?: Wire4364
  resize_strategy?: Wire4649
  rotate?: Wire4433
  segment?: Wire4453
  segment_duration?: Wire4458
  segment_name?: Wire4652
  segment_prefix?: Wire4465
  segment_time_delta?: Wire4655
  turbo?: Wire4475
  watermark_duration?: Wire4480
  watermark_opacity?: Wire4659
  watermark_position?: Wire4488
  watermark_resize_strategy?: Wire4493
  watermark_size?: Wire4663
  watermark_start_time?: Wire4666
  watermark_url?: Wire4503
  watermark_x_offset?: Wire3480
  watermark_y_offset?: Wire3484
  width?: Wire4375
  zoom?: Wire4511
}
type Wire4644 = Wire4645 | Wire4646
type Wire4645 = string
type Wire4646 = Wire4647 | Wire4648
type Wire4647 = boolean
type Wire4648 = 'false' | 'true'
type Wire4649 = Wire4650 | Wire4651
type Wire4650 = string
type Wire4651 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4652 = Wire4653 | Wire4654
type Wire4653 = string
type Wire4654 = string
type Wire4655 = Wire4656 | Wire4657 | Wire4658
type Wire4656 = string
type Wire4657 = string
type Wire4658 = number
type Wire4659 = Wire4660 | Wire4661 | Wire4662
type Wire4660 = string
type Wire4661 = string
type Wire4662 = number
type Wire4663 = Wire4664 | Wire4665
type Wire4664 = string
type Wire4665 = string
type Wire4666 = Wire4667 | Wire4668 | Wire4669
type Wire4667 = string
type Wire4668 = string
type Wire4669 = number
type Wire4670 = {
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  height?: Wire4352
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  preset?: Wire4364
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4671
  segments: Wire4672
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire4375
}
type Wire4671 = '/video/split'
type Wire4672 = Wire4673 | Wire4674
type Wire4673 = string
type Wire4674 = Array<Wire1671>
type Wire4675 = {
  bold?: Wire4676
  border_color?: Wire4681
  border_style?: Wire4684
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  font?: Wire4687
  font_color?: Wire4690
  font_size?: Wire4698
  force_accept?: Wire1380
  height?: Wire4352
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  italic?: Wire4702
  keep_subtitles?: Wire4707
  language?: Wire4712
  name?: Wire4719
  outline_width?: Wire4726
  output_meta?: Wire1418
  position?: Wire4734
  preset?: Wire4364
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4737
  subtitles_type?: Wire4738
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire4375
}
type Wire4676 = Wire4677 | Wire4678
type Wire4677 = string
type Wire4678 = Wire4679 | Wire4680
type Wire4679 = boolean
type Wire4680 = 'false' | 'true'
type Wire4681 = Wire4682 | Wire4683
type Wire4682 = string
type Wire4683 = string
type Wire4684 = Wire4685 | Wire4686
type Wire4685 = string
type Wire4686 = 'box' | 'outline' | 'shadow'
type Wire4687 = Wire4688 | Wire4689
type Wire4688 = string
type Wire4689 = string
type Wire4690 = Wire4691 | Wire4692 | Wire4695
type Wire4691 = string
type Wire4692 = Wire4693 | Wire4694
type Wire4693 = string
type Wire4694 = string
type Wire4695 = Wire4696 | Wire4697
type Wire4696 = string
type Wire4697 = string
type Wire4698 = Wire4699 | Wire4700 | Wire4701
type Wire4699 = string
type Wire4700 = string
type Wire4701 = number
type Wire4702 = Wire4703 | Wire4704
type Wire4703 = string
type Wire4704 = Wire4705 | Wire4706
type Wire4705 = boolean
type Wire4706 = 'false' | 'true'
type Wire4707 = Wire4708 | Wire4709
type Wire4708 = string
type Wire4709 = Wire4710 | Wire4711
type Wire4710 = boolean
type Wire4711 = 'false' | 'true'
type Wire4712 = Wire4713 | Wire4718
type Wire4713 = Wire4714 | Wire4715
type Wire4714 = never
type Wire4715 = Wire4716 | Wire4717
type Wire4716 = string
type Wire4717 = string
type Wire4718 = null
type Wire4719 = Wire4720 | Wire4725
type Wire4720 = Wire4721 | Wire4722
type Wire4721 = never
type Wire4722 = Wire4723 | Wire4724
type Wire4723 = string
type Wire4724 = string
type Wire4725 = null
type Wire4726 = Wire4727 | Wire4733
type Wire4727 = Wire4728 | Wire4729
type Wire4728 = never
type Wire4729 = Wire4730 | Wire4731 | Wire4732
type Wire4730 = string
type Wire4731 = string
type Wire4732 = number
type Wire4733 = null
type Wire4734 = Wire4735 | Wire4736
type Wire4735 = string
type Wire4736 =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
type Wire4737 = '/video/subtitle'
type Wire4738 = Wire4739 | Wire4740
type Wire4739 = string
type Wire4740 = 'burn' | 'burned' | 'external'
type Wire4741 = {
  background?: Wire4742
  count?: Wire4745
  ffmpeg?: Wire1463
  ffmpeg_stack?: Wire1603
  force_accept?: Wire1380
  format?: Wire4749
  height?: Wire4752
  ignore_errors?: Wire1611
  input_codec?: Wire4756
  interpolate?: Wire1410
  offsets?: Wire4759
  output_meta?: Wire1418
  queue?: Wire1429
  resize_strategy?: Wire4770
  result?: Wire1436
  robot: Wire4773
  rotate?: Wire4774
  smart?: Wire4791
  smart_max_candidates?: Wire4796
  use?: Wire1624
  user_meta?: Wire1442
  width?: Wire4800
}
type Wire4742 = Wire4743 | Wire4744
type Wire4743 = string
type Wire4744 = string
type Wire4745 = Wire4746 | Wire4747 | Wire4748
type Wire4746 = string
type Wire4747 = string
type Wire4748 = number
type Wire4749 = Wire4750 | Wire4751
type Wire4750 = string
type Wire4751 = 'jpeg' | 'jpg' | 'png'
type Wire4752 = Wire4753 | Wire4754 | Wire4755
type Wire4753 = string
type Wire4754 = string
type Wire4755 = number
type Wire4756 = Wire4757 | Wire4758
type Wire4757 = string
type Wire4758 = string
type Wire4759 = Wire4760 | Wire4761 | Wire4764
type Wire4760 = string
type Wire4761 = Wire4762 | Wire4763
type Wire4762 = string
type Wire4763 = Array<Wire1466>
type Wire4764 = Wire4765 | Wire4766
type Wire4765 = string
type Wire4766 = Array<Wire4767>
type Wire4767 = Wire4768 | Wire4769
type Wire4768 = string
type Wire4769 = string
type Wire4770 = Wire4771 | Wire4772
type Wire4771 = string
type Wire4772 = 'crop' | 'fillcrop' | 'fit' | 'min_fit' | 'pad' | 'stretch'
type Wire4773 = '/video/thumbs'
type Wire4774 = Wire4775 | Wire4776 | Wire4779 | Wire4782 | Wire4785 | Wire4788
type Wire4775 = string
type Wire4776 = Wire4777 | Wire4778
type Wire4777 = string
type Wire4778 = 0
type Wire4779 = Wire4780 | Wire4781
type Wire4780 = string
type Wire4781 = 90
type Wire4782 = Wire4783 | Wire4784
type Wire4783 = string
type Wire4784 = 180
type Wire4785 = Wire4786 | Wire4787
type Wire4786 = string
type Wire4787 = 270
type Wire4788 = Wire4789 | Wire4790
type Wire4789 = string
type Wire4790 = 360
type Wire4791 = Wire4792 | Wire4793
type Wire4792 = string
type Wire4793 = Wire4794 | Wire4795
type Wire4794 = boolean
type Wire4795 = 'false' | 'true'
type Wire4796 = Wire4797 | Wire4798 | Wire4799
type Wire4797 = string
type Wire4798 = string
type Wire4799 = number
type Wire4800 = Wire4801 | Wire4802 | Wire4803
type Wire4801 = string
type Wire4802 = string
type Wire4803 = number
type Wire4804 = {
  credentials?: Wire4805
  files_per_page?: Wire4808
  force_accept?: Wire1380
  force_name?: Wire1385
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  output_meta?: Wire1418
  page_number?: Wire4812
  path?: Wire4816
  queue?: Wire1429
  rendition?: Wire4821
  result?: Wire1436
  robot: Wire4824
  user_meta?: Wire1442
}
type Wire4805 = Wire4806 | Wire4807
type Wire4806 = string
type Wire4807 = string
type Wire4808 = Wire4809 | Wire4810 | Wire4811
type Wire4809 = string
type Wire4810 = string
type Wire4811 = number
type Wire4812 = Wire4813 | Wire4814 | Wire4815
type Wire4813 = string
type Wire4814 = string
type Wire4815 = number
type Wire4816 = Wire4817 | Wire4818 | Wire1391
type Wire4817 = string
type Wire4818 = Wire4819 | Wire4820
type Wire4819 = string
type Wire4820 = string
type Wire4821 = Wire4822 | Wire4823
type Wire4822 = string
type Wire4823 = '1080p' | '240p' | '360p' | '540p' | '720p' | 'source'
type Wire4824 = '/vimeo/import'
type Wire4825 = {
  acl?: Wire4826
  credentials?: Wire4805
  description: Wire4829
  downloadable?: Wire4832
  folder_id?: Wire4837
  folder_uri?: Wire4842
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  output_meta?: Wire1418
  password?: Wire4845
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4848
  showcases?: Wire4849
  title: Wire4855
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4826 = Wire4827 | Wire4828
type Wire4827 = string
type Wire4828 = 'anybody' | 'contacts' | 'disable' | 'nobody' | 'password' | 'unlisted' | 'users'
type Wire4829 = Wire4830 | Wire4831
type Wire4830 = string
type Wire4831 = string
type Wire4832 = Wire4833 | Wire4834
type Wire4833 = string
type Wire4834 = Wire4835 | Wire4836
type Wire4835 = boolean
type Wire4836 = 'false' | 'true'
type Wire4837 = Wire4838 | Wire4841
type Wire4838 = Wire4839 | Wire4840
type Wire4839 = string
type Wire4840 = string
type Wire4841 = null
type Wire4842 = Wire4843 | Wire4844
type Wire4843 = string
type Wire4844 = string
type Wire4845 = Wire4846 | Wire4847
type Wire4846 = string
type Wire4847 = string
type Wire4848 = '/vimeo/store'
type Wire4849 = Wire4850 | Wire4851
type Wire4850 = string
type Wire4851 = Array<Wire4852>
type Wire4852 = Wire4853 | Wire4854
type Wire4853 = string
type Wire4854 = string
type Wire4855 = Wire4856 | Wire4857
type Wire4856 = string
type Wire4857 = string
type Wire4858 = {
  bucket?: Wire4859
  bucket_region?: Wire4862
  credentials?: Wire4865
  files_per_page?: Wire1926
  force_accept?: Wire1380
  force_name?: Wire1385
  host?: Wire4868
  ignore_errors?: Wire1398
  import_on_errors?: Wire1404
  interpolate?: Wire1410
  key?: Wire4871
  output_meta?: Wire1418
  page_number?: Wire1992
  path: Wire1996
  queue?: Wire1429
  recursive?: Wire2001
  result?: Wire1653
  return_file_stubs?: Wire2006
  robot: Wire4874
  secret?: Wire4875
  user_meta?: Wire1442
}
type Wire4859 = Wire4860 | Wire4861
type Wire4860 = string
type Wire4861 = string
type Wire4862 = Wire4863 | Wire4864
type Wire4863 = string
type Wire4864 = string
type Wire4865 = Wire4866 | Wire4867
type Wire4866 = string
type Wire4867 = string
type Wire4868 = Wire4869 | Wire4870
type Wire4869 = string
type Wire4870 = string
type Wire4871 = Wire4872 | Wire4873
type Wire4872 = string
type Wire4873 = string
type Wire4874 = '/wasabi/import'
type Wire4875 = Wire4876 | Wire4877
type Wire4876 = string
type Wire4877 = string
type Wire4878 = {
  acl?: Wire4879
  bucket?: Wire4882
  bucket_region?: Wire4885
  credentials?: Wire4865
  force_accept?: Wire1380
  headers?: Wire4888
  host?: Wire4892
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  key?: Wire4895
  output_meta?: Wire1418
  path?: Wire2035
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4898
  secret?: Wire4899
  sign_urls_for?: Wire2042
  use?: Wire1624
  user_meta?: Wire1442
}
type Wire4879 = Wire4880 | Wire4881
type Wire4880 = string
type Wire4881 = 'private' | 'public-read'
type Wire4882 = Wire4883 | Wire4884
type Wire4883 = string
type Wire4884 = string
type Wire4885 = Wire4886 | Wire4887
type Wire4886 = string
type Wire4887 = string
type Wire4888 = { [key: string]: Wire4889 | undefined }
type Wire4889 = Wire4890 | Wire4891
type Wire4890 = string
type Wire4891 = string
type Wire4892 = Wire4893 | Wire4894
type Wire4893 = string
type Wire4894 = string
type Wire4895 = Wire4896 | Wire4897
type Wire4896 = string
type Wire4897 = string
type Wire4898 = '/wasabi/store'
type Wire4899 = Wire4900 | Wire4901
type Wire4900 = string
type Wire4901 = string
type Wire4902 = {
  category: Wire4903
  credentials: Wire4906
  description: Wire4909
  force_accept?: Wire1380
  ignore_errors?: Wire1611
  interpolate?: Wire1410
  keywords: Wire4912
  output_meta?: Wire1418
  queue?: Wire1429
  result?: Wire1436
  robot: Wire4915
  title: Wire4916
  use?: Wire1624
  user_meta?: Wire1442
  visibility: Wire4919
}
type Wire4903 = Wire4904 | Wire4905
type Wire4904 = string
type Wire4905 = string
type Wire4906 = Wire4907 | Wire4908
type Wire4907 = string
type Wire4908 = string
type Wire4909 = Wire4910 | Wire4911
type Wire4910 = string
type Wire4911 = string
type Wire4912 = Wire4913 | Wire4914
type Wire4913 = string
type Wire4914 = string
type Wire4915 = '/youtube/store'
type Wire4916 = Wire4917 | Wire4918
type Wire4917 = string
type Wire4918 = string
type Wire4919 = Wire4920 | Wire4921
type Wire4920 = string
type Wire4921 = 'private' | 'public' | 'unlisted'
type Wire4922 = string
type Wire4923 = string
type Wire4924 = { max_number_of_files?: Wire4925; max_size?: Wire4926; referer?: Wire4927 }
type Wire4925 = number
type Wire4926 = number
type Wire4927 = string
type Wire4928 = Wire93 | Wire4929
type Wire4929 = Wire4930 | Wire4934
type Wire4930 = {
  error: Wire4931
  http_code?: Wire4932
  message?: Wire4933
  [key: string]: JsonValue | Wire4931 | Wire4932 | Wire4933 | undefined
}
type Wire4931 = 'INVALID_PARAMS_FIELD'
type Wire4932 = 400
type Wire4933 = string
type Wire4934 = Wire67
type Wire4935 = {
  auth_key?: Wire4936
  can_show_auth_secret?: Wire4937
  description?: Wire4941
  is_allowed_for_smartcdn?: Wire4942
  nonce?: Wire4946
  scope: Wire4949
  signature_algo?: Wire4950
}
type Wire4936 = string
type Wire4937 = Wire4938 | Wire4939 | Wire4940
type Wire4938 = boolean
type Wire4939 = 0
type Wire4940 = 1
type Wire4941 = string
type Wire4942 = Wire4943 | Wire4944 | Wire4945
type Wire4943 = boolean
type Wire4944 = 0
type Wire4945 = 1
type Wire4946 = Wire4947 | Wire4948
type Wire4947 = string
type Wire4948 = number
type Wire4949 = string
type Wire4950 = Wire4951 | Wire4952
type Wire4951 = 'sha1' | 'sha256' | 'sha384'
type Wire4952 = null
type Wire4953 = {
  auth_key: Wire4954
  message: Wire4972
  ok: Wire4973
  [key: string]: JsonValue | Wire4954 | Wire4972 | Wire4973 | undefined
}
type Wire4954 = {
  auth_key: Wire4955
  auth_secret: Wire4956
  can_show_auth_secret: Wire4957
  created: Wire4958
  description: Wire4960
  id: Wire4961
  is_active: Wire4962
  is_allowed_for_smartcdn: Wire4963
  last_used: Wire4964
  modified: Wire4966
  scope: Wire4968
  signature_algo: Wire4971
}
type Wire4955 = string
type Wire4956 = string
type Wire4957 = boolean
type Wire4958 = Wire160 | Wire4959
type Wire4959 = null
type Wire4960 = string
type Wire4961 = string
type Wire4962 = boolean
type Wire4963 = boolean
type Wire4964 = Wire160 | Wire4965
type Wire4965 = null
type Wire4966 = Wire160 | Wire4967
type Wire4967 = null
type Wire4968 = Wire4969 | Wire4970
type Wire4969 = string
type Wire4970 = null
type Wire4971 = null | string
type Wire4972 = string
type Wire4973 = 'AUTH_KEY_CREATED'
type Wire4974 = Wire93 | Wire4975
type Wire4975 = Wire4976 | Wire4980
type Wire4976 = {
  error: Wire4977
  http_code?: Wire4978
  message?: Wire4979
  [key: string]: JsonValue | Wire4977 | Wire4978 | Wire4979 | undefined
}
type Wire4977 = 'AUTH_KEY_NOT_CREATED'
type Wire4978 = 400
type Wire4979 = string
type Wire4980 = Wire67
type Wire4981 = {
  assembly_status_expiry?: Wire4982
  name: Wire4983
  nonce?: Wire4984
  require_signature_auth?: Wire4987
  template: Wire4988
  transcoding_result_expiry?: Wire5024
}
type Wire4982 = '1day' | '30days' | '7days' | '90days' | 'NoSave'
type Wire4983 = string
type Wire4984 = Wire4985 | Wire4986
type Wire4985 = string
type Wire4986 = number
type Wire4987 = 0 | 1
type Wire4988 = Wire4989 | Wire5023
type Wire4989 = {
  allow_steps_override?: Wire4990
  auth?: Wire4991
  emit_execution_progress?: Wire4997
  exiftool_stack?: Wire4998
  ffmpeg_stack?: Wire4999
  fields?: Wire5000
  imagemagick_stack?: Wire5002
  mediainfo_stack?: Wire5003
  mplayer_stack?: Wire5004
  notification_payload?: Wire5005
  notify_url?: Wire5007
  quiet?: Wire5008
  redirect_url?: Wire5009
  response_headers?: Wire5010
  steps?: Wire5020
  template_id?: Wire5021
  usage_tags?: Wire5022
}
type Wire4990 = boolean
type Wire4991 = {
  expires?: Wire4992
  key?: Wire4993
  max_number_of_files?: Wire4994
  max_size?: Wire4995
  referer?: Wire4996
}
type Wire4992 = string
type Wire4993 = string
type Wire4994 = number
type Wire4995 = number
type Wire4996 = string
type Wire4997 = boolean
type Wire4998 = string
type Wire4999 = string
type Wire5000 = { [key: string]: Wire5001 | undefined }
type Wire5001 = JsonValue
type Wire5002 = string
type Wire5003 = string
type Wire5004 = string
type Wire5005 = Array<Wire5006>
type Wire5006 =
  | 'without_params'
  | 'without_result_meta_data'
  | 'without_results'
  | 'without_upload_meta_data'
  | 'without_uploads'
type Wire5007 = null | string
type Wire5008 = boolean
type Wire5009 = string
type Wire5010 = { cors?: Wire5011; [key: string]: JsonValue | Wire5011 | undefined }
type Wire5011 = {
  'Access-Control-Allow-Credentials'?: Wire5012
  'Access-Control-Allow-Headers'?: Wire5013
  'Access-Control-Allow-Methods'?: Wire5014
  'Access-Control-Allow-Origin'?: Wire5015
  'Access-Control-Allow-Private-Network'?: Wire5016
  'Access-Control-Allow-Public-Network'?: Wire5017
  'Access-Control-Expose-Headers'?: Wire5018
  'Access-Control-Max-Age'?: Wire5019
  [key: string]:
    | JsonValue
    | Wire5012
    | Wire5013
    | Wire5014
    | Wire5015
    | Wire5016
    | Wire5017
    | Wire5018
    | Wire5019
    | undefined
}
type Wire5012 = boolean
type Wire5013 = string
type Wire5014 = string
type Wire5015 = string
type Wire5016 = boolean
type Wire5017 = boolean
type Wire5018 = string
type Wire5019 = number
type Wire5020 = Wire1376
type Wire5021 = string
type Wire5022 = string
type Wire5023 = string
type Wire5024 = '1day' | 'NoSave'
type Wire5025 = {
  assembly_status_expiry: Wire5026
  content: Wire5027
  id: Wire5036
  message: Wire5039
  name: Wire5040
  ok: Wire5041
  require_signature_auth: Wire5042
  transcoding_result_expiry: Wire5043
}
type Wire5026 = null | string
type Wire5027 = Wire5028 | Wire5030 | Wire5032 | Wire5033 | Wire5034 | Wire5035
type Wire5028 = { [key: string]: Wire5029 | undefined }
type Wire5029 = JsonValue
type Wire5030 = Array<Wire5031>
type Wire5031 = JsonValue
type Wire5032 = string
type Wire5033 = number
type Wire5034 = boolean
type Wire5035 = null
type Wire5036 = Wire5037 | Wire5038
type Wire5037 = string
type Wire5038 = string
type Wire5039 = string
type Wire5040 = string
type Wire5041 = 'TEMPLATE_CREATED'
type Wire5042 = 0 | 1
type Wire5043 = null | string
type Wire5044 = Wire93 | Wire5045
type Wire5045 = Wire5046 | Wire5050
type Wire5046 = {
  error: Wire5047
  http_code?: Wire5048
  message?: Wire5049
  [key: string]: JsonValue | Wire5047 | Wire5048 | Wire5049 | undefined
}
type Wire5047 = 'TEMPLATE_VALIDATION_ERROR'
type Wire5048 = 400
type Wire5049 = string
type Wire5050 = Wire67
type Wire5051 = { content: Wire5052; name: Wire5056; nonce?: Wire5057; type: Wire5060 }
type Wire5052 = Wire5053 | Wire5055
type Wire5053 = { [key: string]: Wire5054 | undefined }
type Wire5054 = JsonValue
type Wire5055 = string
type Wire5056 = string
type Wire5057 = Wire5058 | Wire5059
type Wire5058 = string
type Wire5059 = number
type Wire5060 =
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
type Wire5061 = {
  credential: Wire5062
  message: Wire5092
  ok: Wire5093
  [key: string]: JsonValue | Wire5062 | Wire5092 | Wire5093 | undefined
}
type Wire5062 = {
  account_id: Wire5063
  content: Wire5064
  created: Wire5073
  deleted: Wire5078
  id: Wire5083
  modified: Wire5084
  name: Wire5089
  stringified: Wire5090
  type: Wire5091
}
type Wire5063 = string
type Wire5064 = Wire5065 | Wire5067 | Wire5069 | Wire5070 | Wire5071 | Wire5072
type Wire5065 = { [key: string]: Wire5066 | undefined }
type Wire5066 = JsonValue
type Wire5067 = Array<Wire5068>
type Wire5068 = JsonValue
type Wire5069 = string
type Wire5070 = number
type Wire5071 = boolean
type Wire5072 = null
type Wire5073 = Wire5074 | Wire5077
type Wire5074 = Wire5075 | Wire5076
type Wire5075 = number
type Wire5076 = string
type Wire5077 = null
type Wire5078 = Wire5079 | Wire5082
type Wire5079 = Wire5080 | Wire5081
type Wire5080 = number
type Wire5081 = string
type Wire5082 = null
type Wire5083 = string
type Wire5084 = Wire5085 | Wire5088
type Wire5085 = Wire5086 | Wire5087
type Wire5086 = number
type Wire5087 = string
type Wire5088 = null
type Wire5089 = string
type Wire5090 = string
type Wire5091 = string
type Wire5092 = string
type Wire5093 = 'TEMPLATE_CREDENTIALS_CREATED'
type Wire5094 = Wire93 | Wire5095
type Wire5095 = Wire5096 | Wire5100
type Wire5096 = {
  error: Wire5097
  http_code?: Wire5098
  message?: Wire5099
  [key: string]: JsonValue | Wire5097 | Wire5098 | Wire5099 | undefined
}
type Wire5097 = 'TEMPLATE_CREDENTIALS_NOT_CREATED'
type Wire5098 = 400
type Wire5099 = string
type Wire5100 = Wire67
type Wire5101 = { nonce?: Wire5102 }
type Wire5102 = Wire5103 | Wire5104
type Wire5103 = string
type Wire5104 = number
type Wire5105 = {
  message: Wire5106
  ok: Wire5107
  [key: string]: JsonValue | Wire5106 | Wire5107 | undefined
}
type Wire5106 = string
type Wire5107 = 'AUTH_KEY_DELETED'
type Wire5108 = Wire93 | Wire5109
type Wire5109 = Wire5110 | Wire5114
type Wire5110 = {
  error: Wire5111
  http_code?: Wire5112
  message?: Wire5113
  [key: string]: JsonValue | Wire5111 | Wire5112 | Wire5113 | undefined
}
type Wire5111 = 'AUTH_KEY_NOT_DELETED'
type Wire5112 = 400
type Wire5113 = string
type Wire5114 = Wire67
type Wire5115 = { nonce?: Wire5116 }
type Wire5116 = Wire5117 | Wire5118
type Wire5117 = string
type Wire5118 = number
type Wire5119 = { asset_id: Wire5120; deleted_at: Wire5121; message: Wire5123; ok: Wire5124 }
type Wire5120 = string
type Wire5121 = string & Wire5122
type Wire5122 = JsonValue
type Wire5123 = string
type Wire5124 = 'DAM_ASSET_DELETED'
type Wire5125 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire5126 = { nonce?: Wire5127 }
type Wire5127 = Wire5128 | Wire5129
type Wire5128 = string
type Wire5129 = number
type Wire5130 = { message: Wire5131; ok: Wire5132 }
type Wire5131 = string
type Wire5132 = 'TEMPLATE_DELETED'
type Wire5133 = { nonce?: Wire5134 }
type Wire5134 = Wire5135 | Wire5136
type Wire5135 = string
type Wire5136 = number
type Wire5137 = {
  message: Wire5138
  ok: Wire5139
  [key: string]: JsonValue | Wire5138 | Wire5139 | undefined
}
type Wire5138 = string
type Wire5139 = 'TEMPLATE_CREDENTIALS_DELETED'
type Wire5140 = Wire93 | Wire5141
type Wire5141 = Wire5142 | Wire5146
type Wire5142 = {
  error: Wire5143
  http_code?: Wire5144
  message?: Wire5145
  [key: string]: JsonValue | Wire5143 | Wire5144 | Wire5145 | undefined
}
type Wire5143 = 'TEMPLATE_CREDENTIALS_NOT_DELETED'
type Wire5144 = 400
type Wire5145 = string
type Wire5146 = Wire67
type Wire5147 = { nonce?: Wire5148 }
type Wire5148 = Wire5149 | Wire5150
type Wire5149 = string
type Wire5150 = number
type Wire5151 = Wire5152 | Wire5247 | Wire5327
type Wire5152 = {
  additional_gb?: Wire5153
  additional_gb_fee?: Wire5154
  address_1?: Wire5155
  address_2?: Wire5156
  bill_limit?: Wire5157
  city?: Wire5158
  company?: Wire5159
  country?: Wire5160
  country_id?: Wire5161
  coupon_discount?: Wire5162
  coupon_discount_percent?: Wire5167
  created: Wire5172
  credit: Wire5175
  currency?: Wire5180
  email?: Wire5181
  final_sub_total?: Wire5182
  invoice_id: Wire5183
  is_prorated: Wire5184
  month: Wire5185
  ok: Wire5186
  plan: Wire5187
  po_number?: Wire5211
  reverse_charge_vat?: Wire5212
  reward_discount?: Wire5213
  reward_discount_percent?: Wire5218
  robots: Wire5223
  signup_discount?: Wire5226
  signup_discount_percent?: Wire5231
  state?: Wire5236
  sub_total: Wire5237
  tiers?: Wire5238
  to?: Wire5239
  to_contact_email_address?: Wire5240
  total: Wire5241
  used_gb?: Wire5242
  vat?: Wire5243
  vat_id?: Wire5244
  vat_rate?: Wire5245
  zip?: Wire5246
}
type Wire5153 = number
type Wire5154 = number
type Wire5155 = null | string
type Wire5156 = null | string
type Wire5157 = number
type Wire5158 = null | string
type Wire5159 = null | string
type Wire5160 = null | string
type Wire5161 = null | string
type Wire5162 = Wire5163 | Wire5166
type Wire5163 = Wire5164 | Wire5165
type Wire5164 = number
type Wire5165 = string
type Wire5166 = null
type Wire5167 = Wire5168 | Wire5171
type Wire5168 = Wire5169 | Wire5170
type Wire5169 = number
type Wire5170 = string
type Wire5171 = null
type Wire5172 = Wire5173 | Wire5174
type Wire5173 = string
type Wire5174 = null
type Wire5175 = Wire5176 | Wire5179
type Wire5176 = Wire5177 | Wire5178
type Wire5177 = number
type Wire5178 = string
type Wire5179 = null
type Wire5180 = null | string
type Wire5181 = null | string
type Wire5182 = number
type Wire5183 = null
type Wire5184 = boolean
type Wire5185 = string
type Wire5186 = 'BILL_FOUND'
type Wire5187 = {
  gb_included: Wire5188
  gb_limit: Wire5191
  has_lifetime_limit: Wire5196
  id: Wire5204
  price_per_gb: Wire5205
  price_per_month: Wire5208
  [key: string]:
    JsonValue | Wire5188 | Wire5191 | Wire5196 | Wire5204 | Wire5205 | Wire5208 | undefined
}
type Wire5188 = Wire5189 | Wire5190
type Wire5189 = number
type Wire5190 = string
type Wire5191 = Wire5192 | Wire5195
type Wire5192 = Wire5193 | Wire5194
type Wire5193 = number
type Wire5194 = string
type Wire5195 = null
type Wire5196 = Wire5197 | Wire5203
type Wire5197 = Wire5198 | Wire5199 | Wire5200 | Wire5201 | Wire5202
type Wire5198 = boolean
type Wire5199 = 0
type Wire5200 = 1
type Wire5201 = '0'
type Wire5202 = '1'
type Wire5203 = null
type Wire5204 = null | string
type Wire5205 = Wire5206 | Wire5207
type Wire5206 = number
type Wire5207 = string
type Wire5208 = Wire5209 | Wire5210
type Wire5209 = number
type Wire5210 = string
type Wire5211 = null | string
type Wire5212 = boolean
type Wire5213 = Wire5214 | Wire5217
type Wire5214 = Wire5215 | Wire5216
type Wire5215 = number
type Wire5216 = string
type Wire5217 = null
type Wire5218 = Wire5219 | Wire5222
type Wire5219 = Wire5220 | Wire5221
type Wire5220 = number
type Wire5221 = string
type Wire5222 = null
type Wire5223 = { [key: string]: Wire5224 | undefined }
type Wire5224 = { gb: Wire5225; [key: string]: JsonValue | Wire5225 | undefined }
type Wire5225 = number
type Wire5226 = Wire5227 | Wire5230
type Wire5227 = Wire5228 | Wire5229
type Wire5228 = number
type Wire5229 = string
type Wire5230 = null
type Wire5231 = Wire5232 | Wire5235
type Wire5232 = Wire5233 | Wire5234
type Wire5233 = number
type Wire5234 = string
type Wire5235 = null
type Wire5236 = null | string
type Wire5237 = number
type Wire5238 = JsonValue
type Wire5239 = null | string
type Wire5240 = null | string
type Wire5241 = number
type Wire5242 = number
type Wire5243 = number
type Wire5244 = null | string
type Wire5245 = number
type Wire5246 = null | string
type Wire5247 = {
  additional_gb?: Wire5248
  additional_gb_fee?: Wire5249
  address_1?: Wire5250
  address_2?: Wire5251
  bill_limit?: Wire5252
  city?: Wire5253
  company?: Wire5254
  country?: Wire5255
  country_id?: Wire5256
  coupon_discount?: Wire5257
  coupon_discount_percent?: Wire5262
  created: Wire5267
  credit: Wire5270
  currency?: Wire5275
  custom_expenses?: Wire5276
  email?: Wire5277
  final_sub_total?: Wire5278
  invoice_id: Wire5279
  is_prorated: Wire5282
  month: Wire5283
  ok: Wire5284
  plan: Wire5187
  po_number?: Wire5285
  reverse_charge_vat?: Wire5286
  reward_discount?: Wire5287
  reward_discount_percent?: Wire5292
  robots: Wire5297
  signup_discount?: Wire5306
  signup_discount_percent?: Wire5311
  state?: Wire5316
  sub_total: Wire5317
  tiers?: Wire5318
  to?: Wire5319
  to_contact_email_address?: Wire5320
  total: Wire5321
  used_gb?: Wire5322
  vat?: Wire5323
  vat_id?: Wire5324
  vat_rate?: Wire5325
  zip?: Wire5326
}
type Wire5248 = number
type Wire5249 = number
type Wire5250 = null | string
type Wire5251 = null | string
type Wire5252 = number
type Wire5253 = null | string
type Wire5254 = null | string
type Wire5255 = null | string
type Wire5256 = null | string
type Wire5257 = Wire5258 | Wire5261
type Wire5258 = Wire5259 | Wire5260
type Wire5259 = number
type Wire5260 = string
type Wire5261 = null
type Wire5262 = Wire5263 | Wire5266
type Wire5263 = Wire5264 | Wire5265
type Wire5264 = number
type Wire5265 = string
type Wire5266 = null
type Wire5267 = Wire5268 | Wire5269
type Wire5268 = string
type Wire5269 = null
type Wire5270 = Wire5271 | Wire5274
type Wire5271 = Wire5272 | Wire5273
type Wire5272 = number
type Wire5273 = string
type Wire5274 = null
type Wire5275 = null | string
type Wire5276 = JsonValue
type Wire5277 = null | string
type Wire5278 = number
type Wire5279 = Wire5280 | Wire5281
type Wire5280 = string
type Wire5281 = number
type Wire5282 = boolean
type Wire5283 = string
type Wire5284 = 'BILL_FOUND'
type Wire5285 = null | string
type Wire5286 = boolean
type Wire5287 = Wire5288 | Wire5291
type Wire5288 = Wire5289 | Wire5290
type Wire5289 = number
type Wire5290 = string
type Wire5291 = null
type Wire5292 = Wire5293 | Wire5296
type Wire5293 = Wire5294 | Wire5295
type Wire5294 = number
type Wire5295 = string
type Wire5296 = null
type Wire5297 = Wire5298 | Wire5299 | Wire5300 | Wire5301 | Wire5302 | Wire5304
type Wire5298 = string
type Wire5299 = number
type Wire5300 = boolean
type Wire5301 = null
type Wire5302 = Array<Wire5303>
type Wire5303 = JsonValue
type Wire5304 = { [key: string]: Wire5305 | undefined }
type Wire5305 = JsonValue
type Wire5306 = Wire5307 | Wire5310
type Wire5307 = Wire5308 | Wire5309
type Wire5308 = number
type Wire5309 = string
type Wire5310 = null
type Wire5311 = Wire5312 | Wire5315
type Wire5312 = Wire5313 | Wire5314
type Wire5313 = number
type Wire5314 = string
type Wire5315 = null
type Wire5316 = null | string
type Wire5317 = number
type Wire5318 = JsonValue
type Wire5319 = null | string
type Wire5320 = null | string
type Wire5321 = number
type Wire5322 = number
type Wire5323 = number
type Wire5324 = null | string
type Wire5325 = number
type Wire5326 = null | string
type Wire5327 = { error: Wire5328; http_code: Wire5329; message: Wire5330; reason: Wire5331 }
type Wire5328 = 'BILL_NOT_FOUND'
type Wire5329 = 200
type Wire5330 = string
type Wire5331 = string
type Wire5332 = Wire93 | Wire5333
type Wire5333 = Wire5334 | Wire5338
type Wire5334 = {
  error: Wire5335
  http_code?: Wire5336
  message?: Wire5337
  [key: string]: JsonValue | Wire5335 | Wire5336 | Wire5337 | undefined
}
type Wire5335 = 'SIGNATURE_REUSE_DETECTED'
type Wire5336 = 400
type Wire5337 = string
type Wire5338 = Wire67
type Wire5339 = { nonce?: Wire5340; version_id?: Wire5343 }
type Wire5340 = Wire5341 | Wire5342
type Wire5341 = string
type Wire5342 = number
type Wire5343 = string
type Wire5344 = { asset: Wire5345; message: Wire5358; ok: Wire5359 }
type Wire5345 = {
  asset_id: Wire5346
  has_alpha?: Wire5347
  height?: Wire5348
  md5hash?: Wire5349
  mime: Wire5350
  path: Wire5351
  sha256?: Wire5352
  size: Wire5353
  thumbhash?: Wire5354
  version_id: Wire5355
  width?: Wire5356
  workspace: Wire5357
  [key: string]:
    | JsonValue
    | Wire5346
    | Wire5347
    | Wire5348
    | Wire5349
    | Wire5350
    | Wire5351
    | Wire5352
    | Wire5353
    | Wire5354
    | Wire5355
    | Wire5356
    | Wire5357
    | undefined
}
type Wire5346 = string
type Wire5347 = boolean
type Wire5348 = number
type Wire5349 = string
type Wire5350 = null | string
type Wire5351 = string
type Wire5352 = string
type Wire5353 = number
type Wire5354 = string
type Wire5355 = string
type Wire5356 = number
type Wire5357 = string
type Wire5358 = string
type Wire5359 = 'DAM_ASSET_FOUND'
type Wire5360 = { nonce?: Wire5361 }
type Wire5361 = Wire5362 | Wire5363
type Wire5362 = string
type Wire5363 = number
type Wire5364 = {
  assembly_status_expiry: Wire5365
  content: Wire5366
  id: Wire5375
  message: Wire5378
  name: Wire5379
  ok: Wire5380
  require_signature_auth: Wire5381
  transcoding_result_expiry: Wire5382
}
type Wire5365 = null | string
type Wire5366 = Wire5367 | Wire5369 | Wire5371 | Wire5372 | Wire5373 | Wire5374
type Wire5367 = { [key: string]: Wire5368 | undefined }
type Wire5368 = JsonValue
type Wire5369 = Array<Wire5370>
type Wire5370 = JsonValue
type Wire5371 = string
type Wire5372 = number
type Wire5373 = boolean
type Wire5374 = null
type Wire5375 = Wire5376 | Wire5377
type Wire5376 = string
type Wire5377 = string
type Wire5378 = string
type Wire5379 = string
type Wire5380 = 'TEMPLATE_FOUND'
type Wire5381 = 0 | 1
type Wire5382 = null | string
type Wire5383 = Wire93 | Wire5333
type Wire5384 = { nonce?: Wire5385 }
type Wire5385 = Wire5386 | Wire5387
type Wire5386 = string
type Wire5387 = number
type Wire5388 = {
  credential: Wire5389
  message: Wire5419
  ok: Wire5420
  [key: string]: JsonValue | Wire5389 | Wire5419 | Wire5420 | undefined
}
type Wire5389 = {
  account_id: Wire5390
  content: Wire5391
  created: Wire5400
  deleted: Wire5405
  id: Wire5410
  modified: Wire5411
  name: Wire5416
  stringified: Wire5417
  type: Wire5418
}
type Wire5390 = string
type Wire5391 = Wire5392 | Wire5394 | Wire5396 | Wire5397 | Wire5398 | Wire5399
type Wire5392 = { [key: string]: Wire5393 | undefined }
type Wire5393 = JsonValue
type Wire5394 = Array<Wire5395>
type Wire5395 = JsonValue
type Wire5396 = string
type Wire5397 = number
type Wire5398 = boolean
type Wire5399 = null
type Wire5400 = Wire5401 | Wire5404
type Wire5401 = Wire5402 | Wire5403
type Wire5402 = number
type Wire5403 = string
type Wire5404 = null
type Wire5405 = Wire5406 | Wire5409
type Wire5406 = Wire5407 | Wire5408
type Wire5407 = number
type Wire5408 = string
type Wire5409 = null
type Wire5410 = string
type Wire5411 = Wire5412 | Wire5415
type Wire5412 = Wire5413 | Wire5414
type Wire5413 = number
type Wire5414 = string
type Wire5415 = null
type Wire5416 = string
type Wire5417 = string
type Wire5418 = string
type Wire5419 = string
type Wire5420 = 'TEMPLATE_CREDENTIALS_READ'
type Wire5421 = Wire93 | Wire5422
type Wire5422 = Wire5423 | Wire5427
type Wire5423 = {
  error: Wire5424
  http_code?: Wire5425
  message?: Wire5426
  [key: string]: JsonValue | Wire5424 | Wire5425 | Wire5426 | undefined
}
type Wire5424 = 'TEMPLATE_CREDENTIALS_NOT_READ'
type Wire5425 = 400
type Wire5426 = string
type Wire5427 = Wire67
type Wire5428 = {
  aud?: Wire5429
  grant_type: Wire5430
  scope?: Wire5431
  [key: string]: JsonValue | Wire5429 | Wire5430 | Wire5431 | undefined
}
type Wire5429 = string
type Wire5430 = 'client_credentials'
type Wire5431 = string
type Wire5432 = {
  access_token: Wire5433
  expires_in: Wire5434
  scope: Wire5435
  token_type: Wire5436
}
type Wire5433 = string
type Wire5434 = number
type Wire5435 = string
type Wire5436 = 'Bearer'
type Wire5437 = Wire5438 | Wire5451 | Wire5460 | Wire5469 | Wire5473
type Wire5438 = Wire5439 | Wire5443 | Wire5447
type Wire5439 = {
  error: Wire5440
  http_code?: Wire5441
  message?: Wire5442
  [key: string]: JsonValue | Wire5440 | Wire5441 | Wire5442 | undefined
}
type Wire5440 = 'GET_ACCOUNT_UNKNOWN_AUTH_KEY'
type Wire5441 = 400
type Wire5442 = string
type Wire5443 = {
  error: Wire5444
  http_code?: Wire5445
  message?: Wire5446
  [key: string]: JsonValue | Wire5444 | Wire5445 | Wire5446 | undefined
}
type Wire5444 = 'TOKEN_INVALID_GRANT_TYPE'
type Wire5445 = 400
type Wire5446 = string
type Wire5447 = {
  error: Wire5448
  http_code?: Wire5449
  message?: Wire5450
  [key: string]: JsonValue | Wire5448 | Wire5449 | Wire5450 | undefined
}
type Wire5448 = 'TOKEN_INVALID_REQUEST'
type Wire5449 = 400
type Wire5450 = string
type Wire5451 = Wire5452 | Wire5456
type Wire5452 = {
  error: Wire5453
  http_code?: Wire5454
  message?: Wire5455
  [key: string]: JsonValue | Wire5453 | Wire5454 | Wire5455 | undefined
}
type Wire5453 = 'SERVER_401'
type Wire5454 = 401
type Wire5455 = string
type Wire5456 = {
  error: Wire5457
  http_code?: Wire5458
  message?: Wire5459
  [key: string]: JsonValue | Wire5457 | Wire5458 | Wire5459 | undefined
}
type Wire5457 = 'TOKEN_INVALID_CREDENTIALS'
type Wire5458 = 401
type Wire5459 = string
type Wire5460 = Wire5461 | Wire5465
type Wire5461 = {
  error: Wire5462
  http_code?: Wire5463
  message?: Wire5464
  [key: string]: JsonValue | Wire5462 | Wire5463 | Wire5464 | undefined
}
type Wire5462 = 'TOKEN_INVALID_AUDIENCE'
type Wire5463 = 403
type Wire5464 = string
type Wire5465 = {
  error: Wire5466
  http_code?: Wire5467
  message?: Wire5468
  [key: string]: JsonValue | Wire5466 | Wire5467 | Wire5468 | undefined
}
type Wire5466 = 'TOKEN_INVALID_SCOPE'
type Wire5467 = 403
type Wire5468 = string
type Wire5469 = {
  error: Wire5470
  http_code?: Wire5471
  message?: Wire5472
  [key: string]: JsonValue | Wire5470 | Wire5471 | Wire5472 | undefined
}
type Wire5470 = 'RATE_LIMIT_REACHED'
type Wire5471 = 429
type Wire5472 = string
type Wire5473 = {
  error: Wire5474
  http_code?: Wire5475
  message?: Wire5476
  [key: string]: JsonValue | Wire5474 | Wire5475 | Wire5476 | undefined
}
type Wire5474 = 'SERVER_500'
type Wire5475 = 500
type Wire5476 = string
type Wire5477 = {
  assembly_id?: Wire5478
  fromdate?: Wire5479
  keywords?: Wire5480
  nonce?: Wire5484
  order?: Wire5487
  page?: Wire5488
  pagesize?: Wire5489
  region?: Wire5490
  sort?: Wire5493
  template_id?: Wire5494
  todate?: Wire5495
  type?: Wire5496
}
type Wire5478 = string
type Wire5479 = string
type Wire5480 = Wire5481 | Wire5482
type Wire5481 = string
type Wire5482 = Array<Wire5483>
type Wire5483 = string
type Wire5484 = Wire5485 | Wire5486
type Wire5485 = string
type Wire5486 = number
type Wire5487 = 'asc' | 'desc'
type Wire5488 = number
type Wire5489 = number
type Wire5490 = Wire5491 | Wire5492
type Wire5491 = string
type Wire5492 = string
type Wire5493 = 'created' | 'created_ts' | 'updated'
type Wire5494 = string
type Wire5495 = string
type Wire5496 =
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
type Wire5497 = {
  count: Wire5498
  items: Wire5499
  [key: string]: JsonValue | Wire5498 | Wire5499 | undefined
}
type Wire5498 = number
type Wire5499 = Array<Wire5500>
type Wire5500 = {
  account_id?: Wire5501
  bytes_expected?: Wire5502
  bytes_received?: Wire5503
  bytes_usage?: Wire5504
  created: Wire5507
  created_ts?: Wire5508
  error?: Wire5509
  execution_duration?: Wire5510
  execution_start?: Wire5513
  files?: Wire5514
  id: Wire5515
  instance?: Wire5516
  notify_url?: Wire5517
  num_input_files?: Wire5518
  ok?: Wire5521
  parent_id?: Wire5522
  redirect_url?: Wire5523
  region?: Wire5524
  template_id?: Wire5525
  template_name?: Wire5526
  upload_duration?: Wire5527
  warning_count?: Wire5528
  [key: string]:
    | JsonValue
    | Wire5501
    | Wire5502
    | Wire5503
    | Wire5504
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
    | Wire5521
    | Wire5522
    | Wire5523
    | Wire5524
    | Wire5525
    | Wire5526
    | Wire5527
    | Wire5528
    | undefined
}
type Wire5501 = null | string
type Wire5502 = number
type Wire5503 = number
type Wire5504 = Wire5505 | Wire5506
type Wire5505 = number
type Wire5506 = null
type Wire5507 = string
type Wire5508 = number
type Wire5509 = null | string
type Wire5510 = Wire5511 | Wire5512
type Wire5511 = number
type Wire5512 = null
type Wire5513 = null | string
type Wire5514 = null | string
type Wire5515 = string
type Wire5516 = null | string
type Wire5517 = null | string
type Wire5518 = Wire5519 | Wire5520
type Wire5519 = number
type Wire5520 = null
type Wire5521 = null | string
type Wire5522 = null | string
type Wire5523 = null | string
type Wire5524 = null | string
type Wire5525 = null | string
type Wire5526 = null | string
type Wire5527 = number
type Wire5528 = Wire5529 | Wire5530
type Wire5529 = number
type Wire5530 = null
type Wire5531 = Wire93 | Wire5532
type Wire5532 = Wire5533 | Wire5537
type Wire5533 = {
  error: Wire5534
  http_code?: Wire5535
  message?: Wire5536
  [key: string]: JsonValue | Wire5534 | Wire5535 | Wire5536 | undefined
}
type Wire5534 = 'ASSEMBLY_LIST_ERROR'
type Wire5535 = 400
type Wire5536 = string
type Wire5537 = Wire67
type Wire5538 = { notifications: Wire5539; ok: Wire5556 }
type Wire5539 = Array<Wire5540>
type Wire5540 = {
  app_id?: Wire5541
  assembly_id?: Wire5542
  duration?: Wire5543
  error?: Wire5546
  response_code?: Wire5547
  response_data?: Wire5550
  start?: Wire5551
  status?: Wire5552
  url?: Wire5555
}
type Wire5541 = null | string
type Wire5542 = string
type Wire5543 = Wire5544 | Wire5545
type Wire5544 = number
type Wire5545 = null
type Wire5546 = null | string
type Wire5547 = Wire5548 | Wire5549
type Wire5548 = number
type Wire5549 = null
type Wire5550 = null | string
type Wire5551 = null | string
type Wire5552 = Wire5553 | Wire5554
type Wire5553 = 'error' | 'processing' | 'successful'
type Wire5554 = null
type Wire5555 = null | string
type Wire5556 = 'ASSEMBLY_NOTIFICATIONS_LISTED'
type Wire5557 = { nonce?: Wire5558 }
type Wire5558 = Wire5559 | Wire5560
type Wire5559 = string
type Wire5560 = number
type Wire5561 = {
  message: Wire5562
  ok: Wire5563
  scopes: Wire5564
  [key: string]: JsonValue | Wire5562 | Wire5563 | Wire5564 | undefined
}
type Wire5562 = string
type Wire5563 = 'AUTH_KEY_SCOPES_FOUND'
type Wire5564 = Array<Wire5565>
type Wire5565 =
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
type Wire5566 = { nonce?: Wire5567 }
type Wire5567 = Wire5568 | Wire5569
type Wire5568 = string
type Wire5569 = number
type Wire5570 = {
  auth_keys: Wire5571
  message: Wire5591
  ok: Wire5592
  [key: string]: JsonValue | Wire5571 | Wire5591 | Wire5592 | undefined
}
type Wire5571 = Array<Wire5572>
type Wire5572 = {
  auth_key: Wire5573
  can_show_auth_secret: Wire5576
  created: Wire5577
  description: Wire5579
  id: Wire5580
  is_active: Wire5581
  is_allowed_for_smartcdn: Wire5582
  last_used: Wire5583
  modified: Wire5585
  scope: Wire5587
  signature_algo: Wire5590
}
type Wire5573 = Wire5574 | Wire5575
type Wire5574 = string
type Wire5575 = null
type Wire5576 = boolean
type Wire5577 = Wire160 | Wire5578
type Wire5578 = null
type Wire5579 = string
type Wire5580 = string
type Wire5581 = boolean
type Wire5582 = boolean
type Wire5583 = Wire160 | Wire5584
type Wire5584 = null
type Wire5585 = Wire160 | Wire5586
type Wire5586 = null
type Wire5587 = Wire5588 | Wire5589
type Wire5588 = string
type Wire5589 = null
type Wire5590 = null | string
type Wire5591 = string
type Wire5592 = 'AUTH_KEYS_FOUND'
type Wire5593 = Wire93 | Wire5333
type Wire5594 = { cursor?: Wire5595; limit?: Wire5596; nonce?: Wire5597; prefix?: Wire5600 }
type Wire5595 = string
type Wire5596 = number
type Wire5597 = Wire5598 | Wire5599
type Wire5598 = string
type Wire5599 = number
type Wire5600 = string
type Wire5601 = {
  assets: Wire5602
  message: Wire5616
  next_cursor: Wire5617
  ok: Wire5618
  workspace: Wire5619
}
type Wire5602 = Array<Wire5603>
type Wire5603 = {
  asset_id: Wire5604
  has_alpha?: Wire5605
  height?: Wire5606
  md5hash?: Wire5607
  mime: Wire5608
  path: Wire5609
  sha256?: Wire5610
  size: Wire5611
  thumbhash?: Wire5612
  version_id: Wire5613
  width?: Wire5614
  workspace: Wire5615
  [key: string]:
    | JsonValue
    | Wire5604
    | Wire5605
    | Wire5606
    | Wire5607
    | Wire5608
    | Wire5609
    | Wire5610
    | Wire5611
    | Wire5612
    | Wire5613
    | Wire5614
    | Wire5615
    | undefined
}
type Wire5604 = string
type Wire5605 = boolean
type Wire5606 = number
type Wire5607 = string
type Wire5608 = null | string
type Wire5609 = string
type Wire5610 = string
type Wire5611 = number
type Wire5612 = string
type Wire5613 = string
type Wire5614 = number
type Wire5615 = string
type Wire5616 = string
type Wire5617 = null | string
type Wire5618 = 'DAM_ASSETS_LISTED'
type Wire5619 = string
type Wire5620 = { nonce?: Wire5621 }
type Wire5621 = Wire5622 | Wire5623
type Wire5622 = string
type Wire5623 = number
type Wire5624 = { message: Wire5625; ok: Wire5626; priority_job_slots: Wire5627 }
type Wire5625 = string
type Wire5626 = 'PRIORITY_JOB_SLOTS_FOUND'
type Wire5627 = { count: Wire5628; slots: Wire5629 }
type Wire5628 = number
type Wire5629 = { [key: string]: Wire5630 | undefined }
type Wire5630 = { [key: string]: Wire5631 | undefined }
type Wire5631 = { [key: string]: Wire5632 | undefined }
type Wire5632 = number
type Wire5633 = { nonce?: Wire5634 }
type Wire5634 = Wire5635 | Wire5636
type Wire5635 = string
type Wire5636 = number
type Wire5637 = {
  message: Wire5638
  ok: Wire5639
  types: Wire5640
  [key: string]: JsonValue | Wire5638 | Wire5639 | Wire5640 | undefined
}
type Wire5638 = string
type Wire5639 = 'TEMPLATE_CREDENTIALS_TYPES_FOUND'
type Wire5640 = { [key: string]: Wire5641 | undefined }
type Wire5641 = {
  fields: Wire5642
  providers?: Wire5646
  [key: string]: JsonValue | Wire5642 | Wire5646 | undefined
}
type Wire5642 = { [key: string]: Wire5643 | undefined }
type Wire5643 = {
  requiredOnCreate?: Wire5644
  requiredOnUpdate?: Wire5645
  [key: string]: JsonValue | Wire5644 | Wire5645 | undefined
}
type Wire5644 = boolean
type Wire5645 = boolean
type Wire5646 = Array<Wire5647>
type Wire5647 = string
type Wire5648 = { nonce?: Wire5649 }
type Wire5649 = Wire5650 | Wire5651
type Wire5650 = string
type Wire5651 = number
type Wire5652 = {
  credentials: Wire5653
  message: Wire5684
  ok: Wire5685
  [key: string]: JsonValue | Wire5653 | Wire5684 | Wire5685 | undefined
}
type Wire5653 = Array<Wire5654>
type Wire5654 = {
  account_id: Wire5655
  content: Wire5656
  created: Wire5665
  deleted: Wire5670
  id: Wire5675
  modified: Wire5676
  name: Wire5681
  stringified: Wire5682
  type: Wire5683
}
type Wire5655 = string
type Wire5656 = Wire5657 | Wire5659 | Wire5661 | Wire5662 | Wire5663 | Wire5664
type Wire5657 = { [key: string]: Wire5658 | undefined }
type Wire5658 = JsonValue
type Wire5659 = Array<Wire5660>
type Wire5660 = JsonValue
type Wire5661 = string
type Wire5662 = number
type Wire5663 = boolean
type Wire5664 = null
type Wire5665 = Wire5666 | Wire5669
type Wire5666 = Wire5667 | Wire5668
type Wire5667 = number
type Wire5668 = string
type Wire5669 = null
type Wire5670 = Wire5671 | Wire5674
type Wire5671 = Wire5672 | Wire5673
type Wire5672 = number
type Wire5673 = string
type Wire5674 = null
type Wire5675 = string
type Wire5676 = Wire5677 | Wire5680
type Wire5677 = Wire5678 | Wire5679
type Wire5678 = number
type Wire5679 = string
type Wire5680 = null
type Wire5681 = string
type Wire5682 = string
type Wire5683 = string
type Wire5684 = string
type Wire5685 = 'TEMPLATE_CREDENTIALS_FOUND'
type Wire5686 = Wire93 | Wire5687
type Wire5687 = Wire5688 | Wire5692 | Wire5693
type Wire5688 = {
  error: Wire5689
  http_code?: Wire5690
  message?: Wire5691
  [key: string]: JsonValue | Wire5689 | Wire5690 | Wire5691 | undefined
}
type Wire5689 = 'TEMPLATE_CREDENTIALS_NOT_FOUND'
type Wire5690 = 400
type Wire5691 = string
type Wire5692 = Wire67
type Wire5693 = {
  error: Wire5694
  http_code?: Wire5695
  message?: Wire5696
  [key: string]: JsonValue | Wire5694 | Wire5695 | Wire5696 | undefined
}
type Wire5694 = 'SIGNATURE_REUSE_DETECTED'
type Wire5695 = 400
type Wire5696 = string
type Wire5697 = {
  fromdate?: Wire5698
  include_builtin?: Wire5699
  keywords?: Wire5700
  nonce?: Wire5704
  order?: Wire5707
  page?: Wire5708
  pagesize?: Wire5709
  sort?: Wire5710
  todate?: Wire5711
}
type Wire5698 = string
type Wire5699 = 'all' | 'exclusively-all' | 'exclusively-latest' | 'latest' | 'none'
type Wire5700 = Wire5701 | Wire5702
type Wire5701 = string
type Wire5702 = Array<Wire5703>
type Wire5703 = string
type Wire5704 = Wire5705 | Wire5706
type Wire5705 = string
type Wire5706 = number
type Wire5707 = 'asc' | 'desc'
type Wire5708 = number
type Wire5709 = number
type Wire5710 = 'created' | 'id' | 'last_used' | 'modified' | 'name'
type Wire5711 = string
type Wire5712 = { count: Wire5713; items: Wire5714 }
type Wire5713 = number
type Wire5714 = Array<Wire5715>
type Wire5715 = {
  account_id?: Wire5716
  assembly_status_expiry?: Wire5717
  builtin_version?: Wire5718
  content: Wire5719
  created?: Wire5728
  deleted?: Wire5732
  description?: Wire5733
  encryption_version?: Wire5734
  id?: Wire5737
  json?: Wire5740
  last_used?: Wire5728
  modified?: Wire5728
  name?: Wire5741
  require_signature_auth?: Wire5742
  transcoding_result_expiry?: Wire5743
}
type Wire5716 = null | string
type Wire5717 = null | string
type Wire5718 = string
type Wire5719 = Wire5720 | Wire5722 | Wire5724 | Wire5725 | Wire5726 | Wire5727
type Wire5720 = { [key: string]: Wire5721 | undefined }
type Wire5721 = JsonValue
type Wire5722 = Array<Wire5723>
type Wire5723 = JsonValue
type Wire5724 = string
type Wire5725 = number
type Wire5726 = boolean
type Wire5727 = null
type Wire5728 = Wire5729 | Wire5731
type Wire5729 = string & Wire5730
type Wire5730 = JsonValue
type Wire5731 = null
type Wire5732 = null
type Wire5733 = string
type Wire5734 = Wire5735 | Wire5736
type Wire5735 = number
type Wire5736 = null
type Wire5737 = Wire5738 | Wire5739
type Wire5738 = string
type Wire5739 = string
type Wire5740 = null
type Wire5741 = string
type Wire5742 = 0 | 1
type Wire5743 = null | string
type Wire5744 = Wire93 | Wire5745
type Wire5745 = Wire5746 | Wire5750
type Wire5746 = {
  error: Wire5747
  http_code?: Wire5748
  message?: Wire5749
  [key: string]: JsonValue | Wire5747 | Wire5748 | Wire5749 | undefined
}
type Wire5747 = 'TEMPLATE_LIST_ERROR'
type Wire5748 = 400
type Wire5749 = string
type Wire5750 = Wire67
type Wire5751 = { destination_folder_id?: Wire5752; filename?: Wire5755; nonce?: Wire5756 }
type Wire5752 = Wire5753 | Wire5754
type Wire5753 = string
type Wire5754 = null
type Wire5755 = string
type Wire5756 = Wire5757 | Wire5758
type Wire5757 = string
type Wire5758 = number
type Wire5759 = {
  asset: Wire5760
  asset_id: Wire5773
  deleted_at: Wire5774
  filename: Wire5776
  folder_id: Wire5777
  message: Wire5780
  ok: Wire5781
  path: Wire5782
  updated_at: Wire160
}
type Wire5760 = {
  asset_id: Wire5761
  has_alpha?: Wire5762
  height?: Wire5763
  md5hash?: Wire5764
  mime: Wire5765
  path: Wire5766
  sha256?: Wire5767
  size: Wire5768
  thumbhash?: Wire5769
  version_id: Wire5770
  width?: Wire5771
  workspace: Wire5772
  [key: string]:
    | JsonValue
    | Wire5761
    | Wire5762
    | Wire5763
    | Wire5764
    | Wire5765
    | Wire5766
    | Wire5767
    | Wire5768
    | Wire5769
    | Wire5770
    | Wire5771
    | Wire5772
    | undefined
}
type Wire5761 = string
type Wire5762 = boolean
type Wire5763 = number
type Wire5764 = string
type Wire5765 = null | string
type Wire5766 = string
type Wire5767 = string
type Wire5768 = number
type Wire5769 = string
type Wire5770 = string
type Wire5771 = number
type Wire5772 = string
type Wire5773 = string
type Wire5774 = Wire160 | Wire5775
type Wire5775 = null
type Wire5776 = string
type Wire5777 = Wire5778 | Wire5779
type Wire5778 = string
type Wire5779 = null
type Wire5780 = string
type Wire5781 = 'DAM_ASSET_MOVED'
type Wire5782 = string
type Wire5783 = Wire93 | Wire109 | Wire115 | Wire121 | Wire127
type Wire5784 = { destination: Wire5785; nonce?: Wire5786; source: Wire5789 }
type Wire5785 = string
type Wire5786 = Wire5787 | Wire5788
type Wire5787 = string
type Wire5788 = number
type Wire5789 = string
type Wire5790 = { message: Wire5791; ok: Wire5792; path: Wire5793 }
type Wire5791 = string
type Wire5792 = 'DAM_ENTRY_MOVED'
type Wire5793 = string
type Wire5794 = { aggregation?: Wire5795; nonce?: Wire5798; region: Wire5801; since: Wire5802 }
type Wire5795 = Wire5796 | Wire5797
type Wire5796 = 'avg' | 'max'
type Wire5797 = null
type Wire5798 = Wire5799 | Wire5800
type Wire5799 = string
type Wire5800 = number
type Wire5801 = string
type Wire5802 = string
type Wire5803 = {
  aggregation: Wire5804
  avgSlotCount: Wire5805
  granularity: Wire5806
  maxSlotCount: Wire5807
  ok: Wire5808
  stats: Wire5809
}
type Wire5804 = 'avg' | 'max'
type Wire5805 = number
type Wire5806 = number
type Wire5807 = number
type Wire5808 = 'PRIORITY_JOB_SLOT_STATS_FOUND'
type Wire5809 = Array<Wire5810>
type Wire5810 = {
  avg_slot_count: Wire5811
  data_from_ts: Wire5812
  max_slot_count: Wire5813
  slot_count: Wire5814
}
type Wire5811 = number
type Wire5812 = number
type Wire5813 = number
type Wire5814 = number
type Wire5815 = Wire5816 | Wire5831 | Wire93
type Wire5816 = Wire5817 | Wire5830
type Wire5817 = Wire5818 | Wire5822 | Wire5826
type Wire5818 = {
  error: Wire5819
  http_code?: Wire5820
  message?: Wire5821
  [key: string]: JsonValue | Wire5819 | Wire5820 | Wire5821 | undefined
}
type Wire5819 = 'PRIORITY_JOB_SLOT_STATS_INVALID_AGGREGATION'
type Wire5820 = 400
type Wire5821 = string
type Wire5822 = {
  error: Wire5823
  http_code?: Wire5824
  message?: Wire5825
  [key: string]: JsonValue | Wire5823 | Wire5824 | Wire5825 | undefined
}
type Wire5823 = 'PRIORITY_JOB_SLOT_STATS_INVALID_TIME'
type Wire5824 = 400
type Wire5825 = string
type Wire5826 = {
  error: Wire5827
  http_code?: Wire5828
  message?: Wire5829
  [key: string]: JsonValue | Wire5827 | Wire5828 | Wire5829 | undefined
}
type Wire5827 = 'PRIORITY_JOB_SLOT_STATS_MISSING_REGION'
type Wire5828 = 400
type Wire5829 = string
type Wire5830 = Wire67
type Wire5831 = Wire5832 | Wire5836
type Wire5832 = {
  error: Wire5833
  http_code?: Wire5834
  message?: Wire5835
  [key: string]: JsonValue | Wire5833 | Wire5834 | Wire5835 | undefined
}
type Wire5833 = 'PRIORITY_JOB_SLOT_STATS_ERROR'
type Wire5834 = 500
type Wire5835 = string
type Wire5836 = Wire67
type Wire5837 = Wire5838 | Wire5859
type Wire5838 = {
  emit_execution_progress?: Wire5839
  exiftool_stack?: Wire5840
  ffmpeg_stack?: Wire5841
  fields?: Wire5842
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire5844
  mplayer_stack?: Wire5845
  nonce?: Wire5846
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire5849
  response_headers?: Wire1344
  steps: Wire5850
  template_id: Wire5853
  usage_tags?: Wire5854
  auth?: Wire5855
}
type Wire5839 = boolean
type Wire5840 = string
type Wire5841 = string
type Wire5842 = { [key: string]: Wire5843 | undefined }
type Wire5843 = JsonValue
type Wire5844 = string
type Wire5845 = string
type Wire5846 = Wire5847 | Wire5848
type Wire5847 = string
type Wire5848 = number
type Wire5849 = string
type Wire5850 = { [key: string]: Wire5851 | undefined }
type Wire5851 = { robot?: Wire5852; [key: string]: JsonValue | Wire5852 | undefined }
type Wire5852 =
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
type Wire5853 = string
type Wire5854 = string
type Wire5855 = { max_number_of_files?: Wire5856; max_size?: Wire5857; referer?: Wire5858 }
type Wire5856 = number
type Wire5857 = number
type Wire5858 = string
type Wire5859 = {
  emit_execution_progress?: Wire5860
  exiftool_stack?: Wire5861
  ffmpeg_stack?: Wire5862
  fields?: Wire5863
  imagemagick_stack?: Wire1333
  mediainfo_stack?: Wire5865
  mplayer_stack?: Wire5866
  nonce?: Wire5867
  notification_payload?: Wire1339
  notify_url?: Wire1341
  quiet?: Wire1342
  redirect_url?: Wire5870
  response_headers?: Wire1344
  steps?: Wire5871
  template_id?: Wire5872
  usage_tags?: Wire5873
  auth?: Wire5874
}
type Wire5860 = boolean
type Wire5861 = string
type Wire5862 = string
type Wire5863 = { [key: string]: Wire5864 | undefined }
type Wire5864 = JsonValue
type Wire5865 = string
type Wire5866 = string
type Wire5867 = Wire5868 | Wire5869
type Wire5868 = string
type Wire5869 = number
type Wire5870 = string
type Wire5871 = Wire1376
type Wire5872 = string
type Wire5873 = string
type Wire5874 = { max_number_of_files?: Wire5875; max_size?: Wire5876; referer?: Wire5877 }
type Wire5875 = number
type Wire5876 = number
type Wire5877 = string
type Wire5878 = Wire93 | Wire4929
type Wire5879 = {
  fields?: Wire5880
  nonce?: Wire5882
  notify_url?: Wire5885
  reparse_template?: Wire5886
  steps?: Wire5887
}
type Wire5880 = { [key: string]: Wire5881 | undefined }
type Wire5881 = JsonValue
type Wire5882 = Wire5883 | Wire5884
type Wire5883 = string
type Wire5884 = number
type Wire5885 = null | string
type Wire5886 = 0 | 1
type Wire5887 = Wire5888 | Wire5900
type Wire5888 = { [key: string]: Wire5889 | undefined }
type Wire5889 = {
  field?: Wire5890
  force_name?: Wire5891
  key?: Wire5892
  output_meta?: Wire5893
  password?: Wire5894
  prompt?: Wire5895
  robot?: Wire5896
  secret?: Wire5897
  url?: Wire5898
  use?: Wire5899
  [key: string]:
    | JsonValue
    | Wire5890
    | Wire5891
    | Wire5892
    | Wire5893
    | Wire5894
    | Wire5895
    | Wire5896
    | Wire5897
    | Wire5898
    | Wire5899
    | undefined
}
type Wire5890 = JsonValue
type Wire5891 = JsonValue
type Wire5892 = JsonValue
type Wire5893 = JsonValue
type Wire5894 = JsonValue
type Wire5895 = JsonValue
type Wire5896 = string
type Wire5897 = JsonValue
type Wire5898 = JsonValue
type Wire5899 = JsonValue
type Wire5900 = Array<Wire5889>
type Wire5901 = {
  assembly_id: Wire5902
  assembly_ssl_url: Wire5903
  assembly_url: Wire5904
  message: Wire5905
  notify_url: Wire5906
  ok: Wire5907
  success: Wire5908
  [key: string]:
    | JsonValue
    | Wire5902
    | Wire5903
    | Wire5904
    | Wire5905
    | Wire5906
    | Wire5907
    | Wire5908
    | undefined
}
type Wire5902 = string
type Wire5903 = string
type Wire5904 = string
type Wire5905 = string
type Wire5906 = null | string
type Wire5907 = 'ASSEMBLY_REPLAYING'
type Wire5908 = true
type Wire5909 = { fields?: Wire5910; nonce?: Wire5912; notify_url?: Wire5915; wait?: Wire5916 }
type Wire5910 = { [key: string]: Wire5911 | undefined }
type Wire5911 = JsonValue
type Wire5912 = Wire5913 | Wire5914
type Wire5913 = string
type Wire5914 = number
type Wire5915 = null | string
type Wire5916 = boolean
type Wire5917 = { notification_id: Wire5918; ok: Wire5919; success: Wire5920 }
type Wire5918 = string
type Wire5919 = 'ASSEMBLY_NOTIFICATION_REPLAYED' | 'ASSEMBLY_NOTIFICATION_REPLAYING'
type Wire5920 = true
type Wire5921 = { nonce?: Wire5922 }
type Wire5922 = Wire5923 | Wire5924
type Wire5923 = string
type Wire5924 = number
type Wire5925 = {
  auth_key: Wire5926
  auth_secret: Wire5929
  message: Wire5930
  ok: Wire5931
  [key: string]: JsonValue | Wire5926 | Wire5929 | Wire5930 | Wire5931 | undefined
}
type Wire5926 = Wire5927 | Wire5928
type Wire5927 = string
type Wire5928 = null
type Wire5929 = string
type Wire5930 = string
type Wire5931 = 'AUTH_SECRET_RETRIEVED'
type Wire5932 = Wire93 | Wire5933
type Wire5933 = Wire5934 | Wire5938
type Wire5934 = {
  error: Wire5935
  http_code?: Wire5936
  message?: Wire5937
  [key: string]: JsonValue | Wire5935 | Wire5936 | Wire5937 | undefined
}
type Wire5935 = 'AUTH_SECRET_NOT_RETRIEVED'
type Wire5936 = 400
type Wire5937 = string
type Wire5938 = Wire67
type Wire5939 = {
  description?: Wire5940
  is_active?: Wire5941
  is_allowed_for_smartcdn?: Wire5945
  nonce?: Wire5949
  scope?: Wire5952
  signature_algo?: Wire5953
}
type Wire5940 = string
type Wire5941 = Wire5942 | Wire5943 | Wire5944
type Wire5942 = boolean
type Wire5943 = 0
type Wire5944 = 1
type Wire5945 = Wire5946 | Wire5947 | Wire5948
type Wire5946 = boolean
type Wire5947 = 0
type Wire5948 = 1
type Wire5949 = Wire5950 | Wire5951
type Wire5950 = string
type Wire5951 = number
type Wire5952 = string
type Wire5953 = Wire5954 | Wire5955
type Wire5954 = 'sha1' | 'sha256' | 'sha384'
type Wire5955 = null
type Wire5956 = {
  auth_key: Wire5957
  message: Wire5976
  ok: Wire5977
  [key: string]: JsonValue | Wire5957 | Wire5976 | Wire5977 | undefined
}
type Wire5957 = {
  auth_key: Wire5958
  can_show_auth_secret: Wire5961
  created: Wire5962
  description: Wire5964
  id: Wire5965
  is_active: Wire5966
  is_allowed_for_smartcdn: Wire5967
  last_used: Wire5968
  modified: Wire5970
  scope: Wire5972
  signature_algo: Wire5975
}
type Wire5958 = Wire5959 | Wire5960
type Wire5959 = string
type Wire5960 = null
type Wire5961 = boolean
type Wire5962 = Wire160 | Wire5963
type Wire5963 = null
type Wire5964 = string
type Wire5965 = string
type Wire5966 = boolean
type Wire5967 = boolean
type Wire5968 = Wire160 | Wire5969
type Wire5969 = null
type Wire5970 = Wire160 | Wire5971
type Wire5971 = null
type Wire5972 = Wire5973 | Wire5974
type Wire5973 = string
type Wire5974 = null
type Wire5975 = null | string
type Wire5976 = string
type Wire5977 = 'AUTH_KEY_UPDATED'
type Wire5978 = Wire93 | Wire5979
type Wire5979 = Wire5980 | Wire5984
type Wire5980 = {
  error: Wire5981
  http_code?: Wire5982
  message?: Wire5983
  [key: string]: JsonValue | Wire5981 | Wire5982 | Wire5983 | undefined
}
type Wire5981 = 'AUTH_KEY_NOT_UPDATED'
type Wire5982 = 400
type Wire5983 = string
type Wire5984 = Wire67
type Wire5985 = {
  assembly_status_expiry?: Wire5986
  name?: Wire5987
  nonce?: Wire5988
  require_signature_auth?: Wire5991
  template?: Wire5992
  transcoding_result_expiry?: Wire6028
}
type Wire5986 = '1day' | '30days' | '7days' | '90days' | 'NoSave'
type Wire5987 = string
type Wire5988 = Wire5989 | Wire5990
type Wire5989 = string
type Wire5990 = number
type Wire5991 = 0 | 1
type Wire5992 = Wire5993 | Wire6027
type Wire5993 = {
  allow_steps_override?: Wire5994
  auth?: Wire5995
  emit_execution_progress?: Wire6001
  exiftool_stack?: Wire6002
  ffmpeg_stack?: Wire6003
  fields?: Wire6004
  imagemagick_stack?: Wire6006
  mediainfo_stack?: Wire6007
  mplayer_stack?: Wire6008
  notification_payload?: Wire6009
  notify_url?: Wire6011
  quiet?: Wire6012
  redirect_url?: Wire6013
  response_headers?: Wire6014
  steps?: Wire6024
  template_id?: Wire6025
  usage_tags?: Wire6026
}
type Wire5994 = boolean
type Wire5995 = {
  expires?: Wire5996
  key?: Wire5997
  max_number_of_files?: Wire5998
  max_size?: Wire5999
  referer?: Wire6000
}
type Wire5996 = string
type Wire5997 = string
type Wire5998 = number
type Wire5999 = number
type Wire6000 = string
type Wire6001 = boolean
type Wire6002 = string
type Wire6003 = string
type Wire6004 = { [key: string]: Wire6005 | undefined }
type Wire6005 = JsonValue
type Wire6006 = string
type Wire6007 = string
type Wire6008 = string
type Wire6009 = Array<Wire6010>
type Wire6010 =
  | 'without_params'
  | 'without_result_meta_data'
  | 'without_results'
  | 'without_upload_meta_data'
  | 'without_uploads'
type Wire6011 = null | string
type Wire6012 = boolean
type Wire6013 = string
type Wire6014 = { cors?: Wire6015; [key: string]: JsonValue | Wire6015 | undefined }
type Wire6015 = {
  'Access-Control-Allow-Credentials'?: Wire6016
  'Access-Control-Allow-Headers'?: Wire6017
  'Access-Control-Allow-Methods'?: Wire6018
  'Access-Control-Allow-Origin'?: Wire6019
  'Access-Control-Allow-Private-Network'?: Wire6020
  'Access-Control-Allow-Public-Network'?: Wire6021
  'Access-Control-Expose-Headers'?: Wire6022
  'Access-Control-Max-Age'?: Wire6023
  [key: string]:
    | JsonValue
    | Wire6016
    | Wire6017
    | Wire6018
    | Wire6019
    | Wire6020
    | Wire6021
    | Wire6022
    | Wire6023
    | undefined
}
type Wire6016 = boolean
type Wire6017 = string
type Wire6018 = string
type Wire6019 = string
type Wire6020 = boolean
type Wire6021 = boolean
type Wire6022 = string
type Wire6023 = number
type Wire6024 = Wire1376
type Wire6025 = string
type Wire6026 = string
type Wire6027 = string
type Wire6028 = '1day' | 'NoSave'
type Wire6029 = {
  assembly_status_expiry: Wire6030
  content: Wire6031
  id: Wire6040
  message: Wire6043
  name: Wire6044
  ok: Wire6045
  require_signature_auth: Wire6046
  transcoding_result_expiry: Wire6047
}
type Wire6030 = null | string
type Wire6031 = Wire6032 | Wire6034 | Wire6036 | Wire6037 | Wire6038 | Wire6039
type Wire6032 = { [key: string]: Wire6033 | undefined }
type Wire6033 = JsonValue
type Wire6034 = Array<Wire6035>
type Wire6035 = JsonValue
type Wire6036 = string
type Wire6037 = number
type Wire6038 = boolean
type Wire6039 = null
type Wire6040 = Wire6041 | Wire6042
type Wire6041 = string
type Wire6042 = string
type Wire6043 = string
type Wire6044 = string
type Wire6045 = 'TEMPLATE_UPDATED'
type Wire6046 = 0 | 1
type Wire6047 = null | string
type Wire6048 = Wire93 | Wire5045
type Wire6049 = { content?: Wire6050; name: Wire6056; nonce?: Wire6057; type: Wire6060 }
type Wire6050 = Wire6051 | Wire6055
type Wire6051 = Wire6052 | Wire6054
type Wire6052 = { [key: string]: Wire6053 | undefined }
type Wire6053 = JsonValue
type Wire6054 = string
type Wire6055 = null
type Wire6056 = string
type Wire6057 = Wire6058 | Wire6059
type Wire6058 = string
type Wire6059 = number
type Wire6060 =
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
type Wire6061 = {
  credential: Wire6062
  message: Wire6092
  ok: Wire6093
  [key: string]: JsonValue | Wire6062 | Wire6092 | Wire6093 | undefined
}
type Wire6062 = {
  account_id: Wire6063
  content: Wire6064
  created: Wire6073
  deleted: Wire6078
  id: Wire6083
  modified: Wire6084
  name: Wire6089
  stringified: Wire6090
  type: Wire6091
}
type Wire6063 = string
type Wire6064 = Wire6065 | Wire6067 | Wire6069 | Wire6070 | Wire6071 | Wire6072
type Wire6065 = { [key: string]: Wire6066 | undefined }
type Wire6066 = JsonValue
type Wire6067 = Array<Wire6068>
type Wire6068 = JsonValue
type Wire6069 = string
type Wire6070 = number
type Wire6071 = boolean
type Wire6072 = null
type Wire6073 = Wire6074 | Wire6077
type Wire6074 = Wire6075 | Wire6076
type Wire6075 = number
type Wire6076 = string
type Wire6077 = null
type Wire6078 = Wire6079 | Wire6082
type Wire6079 = Wire6080 | Wire6081
type Wire6080 = number
type Wire6081 = string
type Wire6082 = null
type Wire6083 = string
type Wire6084 = Wire6085 | Wire6088
type Wire6085 = Wire6086 | Wire6087
type Wire6086 = number
type Wire6087 = string
type Wire6088 = null
type Wire6089 = string
type Wire6090 = string
type Wire6091 = string
type Wire6092 = string
type Wire6093 = 'TEMPLATE_CREDENTIALS_UPDATED'
type Wire6094 = Wire93 | Wire6095
type Wire6095 = Wire6096 | Wire6100
type Wire6096 = {
  error: Wire6097
  http_code?: Wire6098
  message?: Wire6099
  [key: string]: JsonValue | Wire6097 | Wire6098 | Wire6099 | undefined
}
type Wire6097 = 'TEMPLATE_CREDENTIALS_NOT_UPDATED'
type Wire6098 = 400
type Wire6099 = string
type Wire6100 = Wire67
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
export type CreateAssemblyError = Wire4928
export type CreateAuthKeyParams = Wire4935
export interface CreateAuthKeyInput {
  params: CreateAuthKeyParams
  signal?: AbortSignal
}
export type CreateAuthKeyResult = Wire4953
export type CreateAuthKeyError = Wire4974
export type CreateTemplateParams = Wire4981
export interface CreateTemplateInput {
  params: CreateTemplateParams
  signal?: AbortSignal
}
export type CreateTemplateResult = Wire5025
export type CreateTemplateError = Wire5044
export type CreateTemplateCredentialParams = Wire5051
export interface CreateTemplateCredentialInput {
  params: CreateTemplateCredentialParams
  signal?: AbortSignal
}
export type CreateTemplateCredentialResult = Wire5061
export type CreateTemplateCredentialError = Wire5094
export type DeleteAuthKeyParams = Wire5101
export interface DeleteAuthKeyInput {
  path: { authKeyId: string }
  params: DeleteAuthKeyParams
  signal?: AbortSignal
}
export type DeleteAuthKeyResult = Wire5105
export type DeleteAuthKeyError = Wire5108
export type DeleteDamAssetParams = Wire5115
export interface DeleteDamAssetInput {
  path: { assetId: string }
  params: DeleteDamAssetParams
  signal?: AbortSignal
}
export type DeleteDamAssetResult = Wire5119
export type DeleteDamAssetError = Wire5125
export type DeleteTemplateParams = Wire5126
export interface DeleteTemplateInput {
  path: { templateIdOrName: string }
  params: DeleteTemplateParams
  signal?: AbortSignal
}
export type DeleteTemplateResult = Wire5130
export type DeleteTemplateError = Wire93
export type DeleteTemplateCredentialParams = Wire5133
export interface DeleteTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: DeleteTemplateCredentialParams
  signal?: AbortSignal
}
export type DeleteTemplateCredentialResult = Wire5137
export type DeleteTemplateCredentialError = Wire5140
export interface GetAssemblyInput {
  path: { assemblyId: string }
  signal?: AbortSignal
}
export type GetAssemblyResult = Wire171
export type GetAssemblyError = Wire93
export type GetBillParams = Wire5147
export interface GetBillInput {
  path: { billYearMonth: string }
  params: GetBillParams
  signal?: AbortSignal
}
export type GetBillResult = Wire5151
export type GetBillError = Wire5332
export type GetDamAssetParams = Wire5339
export interface GetDamAssetInput {
  path: { assetId: string }
  params: GetDamAssetParams
  signal?: AbortSignal
}
export type GetDamAssetResult = Wire5344
export type GetDamAssetError = Wire93
export type GetTemplateParams = Wire5360
export interface GetTemplateInput {
  path: { templateIdOrName: string }
  params: GetTemplateParams
  signal?: AbortSignal
}
export type GetTemplateResult = Wire5364
export type GetTemplateError = Wire5383
export type GetTemplateCredentialParams = Wire5384
export interface GetTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: GetTemplateCredentialParams
  signal?: AbortSignal
}
export type GetTemplateCredentialResult = Wire5388
export type GetTemplateCredentialError = Wire5421
export interface IssueBearerTokenInput {
  body: Wire5428
  signal?: AbortSignal
}
export type IssueBearerTokenResult = Wire5432
export type IssueBearerTokenError = Wire5437
export type ListAssembliesParams = Wire5477
export interface ListAssembliesInput {
  params: ListAssembliesParams
  signal?: AbortSignal
}
export type ListAssembliesResult = Wire5497
export type ListAssembliesError = Wire5531
export interface ListAssemblyNotificationsInput {
  path: { assemblyId: string }
  signal?: AbortSignal
}
export type ListAssemblyNotificationsResult = Wire5538
export type ListAssemblyNotificationsError = Wire93
export type ListAuthKeyScopesParams = Wire5557
export interface ListAuthKeyScopesInput {
  params: ListAuthKeyScopesParams
  signal?: AbortSignal
}
export type ListAuthKeyScopesResult = Wire5561
export type ListAuthKeyScopesError = Wire93
export type ListAuthKeysParams = Wire5566
export interface ListAuthKeysInput {
  params: ListAuthKeysParams
  signal?: AbortSignal
}
export type ListAuthKeysResult = Wire5570
export type ListAuthKeysError = Wire5593
export type ListDamAssetsParams = Wire5594
export interface ListDamAssetsInput {
  params: ListDamAssetsParams
  signal?: AbortSignal
}
export type ListDamAssetsResult = Wire5601
export type ListDamAssetsError = Wire93
export type ListPriorityJobSlotsParams = Wire5620
export interface ListPriorityJobSlotsInput {
  params: ListPriorityJobSlotsParams
  signal?: AbortSignal
}
export type ListPriorityJobSlotsResult = Wire5624
export type ListPriorityJobSlotsError = Wire93
export type ListTemplateCredentialTypesParams = Wire5633
export interface ListTemplateCredentialTypesInput {
  params: ListTemplateCredentialTypesParams
  signal?: AbortSignal
}
export type ListTemplateCredentialTypesResult = Wire5637
export type ListTemplateCredentialTypesError = Wire93
export type ListTemplateCredentialsParams = Wire5648
export interface ListTemplateCredentialsInput {
  params: ListTemplateCredentialsParams
  signal?: AbortSignal
}
export type ListTemplateCredentialsResult = Wire5652
export type ListTemplateCredentialsError = Wire5686
export type ListTemplatesParams = Wire5697
export interface ListTemplatesInput {
  params: ListTemplatesParams
  signal?: AbortSignal
}
export type ListTemplatesResult = Wire5712
export type ListTemplatesError = Wire5744
export type MoveDamAssetParams = Wire5751
export interface MoveDamAssetInput {
  path: { assetId: string }
  params: MoveDamAssetParams
  signal?: AbortSignal
}
export type MoveDamAssetResult = Wire5759
export type MoveDamAssetError = Wire5783
export type MoveDamEntryParams = Wire5784
export interface MoveDamEntryInput {
  params: MoveDamEntryParams
  signal?: AbortSignal
}
export type MoveDamEntryResult = Wire5790
export type MoveDamEntryError = Wire93
export type PriorityJobSlotStatsParams = Wire5794
export interface PriorityJobSlotStatsInput {
  params: PriorityJobSlotStatsParams
  signal?: AbortSignal
}
export type PriorityJobSlotStatsResult = Wire5803
export type PriorityJobSlotStatsError = Wire5815
export type ReplaceAssemblyParams = Wire5837
export interface ReplaceAssemblyInput {
  path: { assemblyId: string }
  params: ReplaceAssemblyParams
  files?: Readonly<Record<string, UploadFile>>
  fields?: Readonly<Record<string, string>>
  signal?: AbortSignal
}
export type ReplaceAssemblyResult = Wire171
export type ReplaceAssemblyError = Wire5878
export type ReplayAssemblyParams = Wire5879
export interface ReplayAssemblyInput {
  path: { assemblyId: string }
  params: ReplayAssemblyParams
  signal?: AbortSignal
}
export type ReplayAssemblyResult = Wire5901
export type ReplayAssemblyError = Wire93
export type ReplayAssemblyNotificationParams = Wire5909
export interface ReplayAssemblyNotificationInput {
  path: { assemblyId: string }
  params: ReplayAssemblyNotificationParams
  signal?: AbortSignal
}
export type ReplayAssemblyNotificationResult = Wire5917
export type ReplayAssemblyNotificationError = Wire93
export type ShowAuthKeySecretParams = Wire5921
export interface ShowAuthKeySecretInput {
  path: { authKeyId: string }
  params: ShowAuthKeySecretParams
  signal?: AbortSignal
}
export type ShowAuthKeySecretResult = Wire5925
export type ShowAuthKeySecretError = Wire5932
export type UpdateAuthKeyParams = Wire5939
export interface UpdateAuthKeyInput {
  path: { authKeyId: string }
  params: UpdateAuthKeyParams
  signal?: AbortSignal
}
export type UpdateAuthKeyResult = Wire5956
export type UpdateAuthKeyError = Wire5978
export type UpdateTemplateParams = Wire5985
export interface UpdateTemplateInput {
  path: { templateIdOrName: string }
  params: UpdateTemplateParams
  signal?: AbortSignal
}
export type UpdateTemplateResult = Wire6029
export type UpdateTemplateError = Wire6048
export type UpdateTemplateCredentialParams = Wire6049
export interface UpdateTemplateCredentialInput {
  path: { templateCredentialId: string }
  params: UpdateTemplateCredentialParams
  signal?: AbortSignal
}
export type UpdateTemplateCredentialResult = Wire6061
export type UpdateTemplateCredentialError = Wire6094
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: { templateIdOrName: '^builtin/[a-z0-9-]+(@[0-9a-z.-]+)?$' },
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
        rawPathPatterns: {},
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
