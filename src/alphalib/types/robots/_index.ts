import { z } from 'zod'

import { robotAudioArtworkInstructionsSchema, meta as audioArtworkMeta } from './audio-artwork.ts'
import { robotAudioConcatInstructionsSchema, meta as audioConcatMeta } from './audio-concat.ts'
import { robotAudioEncodeInstructionsSchema, meta as audioEncodeMeta } from './audio-encode.ts'
import { robotAudioLoopInstructionsSchema, meta as audioLoopMeta } from './audio-loop.ts'
import { robotAudioMergeInstructionsSchema, meta as audioMergeMeta } from './audio-merge.ts'
import {
  robotAudioWaveformInstructionsSchema,
  meta as audioWaveformMeta,
} from './audio-waveform.ts'
import { robotAzureImportInstructionsSchema, meta as azureImportMeta } from './azure-import.ts'
import { robotAzureStoreInstructionsSchema, meta as azureStoreMeta } from './azure-store.ts'
import {
  robotBackblazeImportInstructionsSchema,
  meta as backblazeImportMeta,
} from './backblaze-import.ts'
import {
  robotBackblazeStoreInstructionsSchema,
  meta as backblazeStoreMeta,
} from './backblaze-store.ts'
import {
  robotCloudfilesImportInstructionsSchema,
  meta as cloudfilesImportMeta,
} from './cloudfiles-import.ts'
import {
  robotCloudfilesStoreInstructionsSchema,
  meta as cloudfilesStoreMeta,
} from './cloudfiles-store.ts'
import {
  robotCloudflareImportInstructionsSchema,
  meta as cloudflareImportMeta,
} from './cloudflare-import.ts'
import {
  robotCloudflareStoreInstructionsSchema,
  meta as cloudflareStoreMeta,
} from './cloudflare-store.ts'
import {
  robotDigitaloceanImportInstructionsSchema,
  meta as digitaloceanImportMeta,
} from './digitalocean-import.ts'
import {
  robotDigitaloceanStoreInstructionsSchema,
  meta as digitaloceanStoreMeta,
} from './digitalocean-store.ts'
import {
  robotDocumentAutorotateInstructionsSchema,
  meta as documentAutorotateMeta,
} from './document-autorotate.ts'
import {
  robotDocumentConvertInstructionsSchema,
  meta as documentConvertMeta,
} from './document-convert.ts'
import {
  robotDocumentMergeInstructionsSchema,
  meta as documentMergeMeta,
} from './document-merge.ts'
import { robotDocumentOcrInstructionsSchema, meta as documentOcrMeta } from './document-ocr.ts'
import {
  robotDocumentSplitInstructionsSchema,
  meta as documentSplitMeta,
} from './document-split.ts'
import {
  robotDocumentThumbsInstructionsSchema,
  meta as documentThumbsMeta,
} from './document-thumbs.ts'
import {
  robotDropboxImportInstructionsSchema,
  meta as dropboxImportMeta,
} from './dropbox-import.ts'
import { robotDropboxStoreInstructionsSchema, meta as dropboxStoreMeta } from './dropbox-store.ts'
import { robotEdglyDeliverInstructionsSchema, meta as edglyDeliverMeta } from './edgly-deliver.ts'
import { robotFileCompressInstructionsSchema, meta as fileCompressMeta } from './file-compress.ts'
import {
  robotFileDecompressInstructionsSchema,
  meta as fileDecompressMeta,
} from './file-decompress.ts'
import { robotFileFilterInstructionsSchema, meta as fileFilterMeta } from './file-filter.ts'
import { robotFileHashInstructionsSchema, meta as fileHashMeta } from './file-hash.ts'
import { robotFilePreviewInstructionsSchema, meta as filePreviewMeta } from './file-preview.ts'
import { robotFileReadInstructionsSchema, meta as fileReadMeta } from './file-read.ts'
import { robotFileServeInstructionsSchema, meta as fileServeMeta } from './file-serve.ts'
import { robotFileVerifyInstructionsSchema, meta as fileVerifyMeta } from './file-verify.ts'
import {
  robotFileVirusscanInstructionsSchema,
  meta as fileVirusscanMeta,
} from './file-virusscan.ts'
import { robotFileWatermarkInstructionsSchema } from './file-watermark.ts'
import { robotFtpImportInstructionsSchema, meta as ftpImportMeta } from './ftp-import.ts'
import { robotFtpStoreInstructionsSchema, meta as ftpStoreMeta } from './ftp-store.ts'
import { robotGoogleImportInstructionsSchema, meta as googleImportMeta } from './google-import.ts'
import { robotGoogleStoreInstructionsSchema, meta as googleStoreMeta } from './google-store.ts'
import { robotHtmlConvertInstructionsSchema, meta as htmlConvertMeta } from './html-convert.ts'
import { robotHttpImportInstructionsSchema, meta as httpImportMeta } from './http-import.ts'
import {
  robotImageDescribeInstructionsSchema,
  meta as imageDescribeMeta,
} from './image-describe.ts'
import {
  robotImageFacedetectInstructionsSchema,
  meta as imageFacedetectMeta,
} from './image-facedetect.ts'
import {
  robotImageGenerateInstructionsSchema,
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
} from './image-generate.ts'
import { robotImageMergeInstructionsSchema, meta as imageMergeMeta } from './image-merge.ts'
import { robotImageOcrInstructionsSchema, meta as imageOcrMeta } from './image-ocr.ts'
import {
  robotImageOptimizeInstructionsSchema,
  meta as imageOptimizeMeta,
} from './image-optimize.ts'
import { robotImageRemoveBackgroundInstructionsSchema } from './image-remove-background.ts'
import { robotImageResizeInstructionsSchema, meta as imageResizeMeta } from './image-resize.ts'
import {
  robotMediaPlaylistInstructionsSchema,
  meta as mediaPlaylistMeta,
} from './media-playlist.ts'
import { robotMetaWriteInstructionsSchema, meta as metaWriteMeta } from './meta-write.ts'
import { robotMinioImportInstructionsSchema, meta as minioImportMeta } from './minio-import.ts'
import { robotMinioStoreInstructionsSchema, meta as minioStoreMeta } from './minio-store.ts'
import { robotProgressSimulateInstructionsSchema } from './progress-simulate.ts'
import { robotS3ImportInstructionsSchema, meta as s3ImportMeta } from './s3-import.ts'
import { robotS3StoreInstructionsSchema, meta as s3StoreMeta } from './s3-store.ts'
import { robotScriptRunInstructionsSchema, meta as scriptRunMeta } from './script-run.ts'
import { robotSftpImportInstructionsSchema, meta as sftpImportMeta } from './sftp-import.ts'
import { robotSftpStoreInstructionsSchema, meta as sftpStoreMeta } from './sftp-store.ts'
import {
  robotSpeechTranscribeInstructionsSchema,
  robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  meta as speechTranscribeMeta,
} from './speech-transcribe.ts'
import {
  robotSupabaseImportInstructionsSchema,
  meta as supabaseImportMeta,
} from './supabase-import.ts'
import {
  robotSupabaseStoreInstructionsSchema,
  meta as supabaseStoreMeta,
} from './supabase-store.ts'
import { robotSwiftImportInstructionsSchema, meta as swiftImportMeta } from './swift-import.ts'
import { robotSwiftStoreInstructionsSchema, meta as swiftStoreMeta } from './swift-store.ts'
import { robotTextSpeakInstructionsSchema, meta as textSpeakMeta } from './text-speak.ts'
import {
  robotTextTranslateInstructionsSchema,
  meta as textTranslateMeta,
} from './text-translate.ts'
import { robotTigrisImportInstructionsSchema, meta as tigrisImport } from './tigris-import.ts'
import { robotTigrisStoreInstructionsSchema, meta as tigrisStore } from './tigris-store.ts'
import { robotTlcdnDeliverInstructionsSchema, meta as tlcdnDeliverMeta } from './tlcdn-deliver.ts'
import { robotTusStoreInstructionsSchema, meta as tusStoreMeta } from './tus-store.ts'
import { robotUploadHandleInstructionsSchema, meta as uploadHandleMeta } from './upload-handle.ts'
import {
  robotVideoAdaptiveInstructionsSchema,
  meta as videoAdaptiveMeta,
} from './video-adaptive.ts'
import { robotVideoConcatInstructionsSchema, meta as videoConcatMeta } from './video-concat.ts'
import { robotVideoEncodeInstructionsSchema, meta as videoEncodeMeta } from './video-encode.ts'
import { robotVideoMergeInstructionsSchema, meta as videoMergeMeta } from './video-merge.ts'
import {
  robotVideoSubtitleInstructionsSchema,
  meta as videoSubtitleMeta,
} from './video-subtitle.ts'
import { robotVideoThumbsInstructionsSchema, meta as videoThumbsMeta } from './video-thumbs.ts'
import { robotVimeoStoreInstructionsSchema, meta as vimeoStoreMeta } from './vimeo-store.ts'
import { robotWasabiImportInstructionsSchema, meta as wasabiImportMeta } from './wasabi-import.ts'
import { robotWasabiStoreInstructionsSchema, meta as wasabiStoreMeta } from './wasabi-store.ts'
import { robotYoutubeStoreInstructionsSchema, meta as youtubeStoreMeta } from './youtube-store.ts'

const robotStepsInstructions = [
  robotAudioArtworkInstructionsSchema,
  robotAudioConcatInstructionsSchema,
  robotAudioEncodeInstructionsSchema,
  robotAudioLoopInstructionsSchema,
  robotAudioMergeInstructionsSchema,
  robotAudioWaveformInstructionsSchema,
  robotAzureImportInstructionsSchema,
  robotAzureStoreInstructionsSchema,
  robotBackblazeImportInstructionsSchema,
  robotBackblazeStoreInstructionsSchema,
  robotCloudfilesImportInstructionsSchema,
  robotCloudfilesStoreInstructionsSchema,
  robotCloudflareImportInstructionsSchema,
  robotCloudflareStoreInstructionsSchema,
  robotDigitaloceanImportInstructionsSchema,
  robotDigitaloceanStoreInstructionsSchema,
  robotDocumentAutorotateInstructionsSchema,
  robotDocumentConvertInstructionsSchema,
  robotDocumentMergeInstructionsSchema,
  robotDocumentOcrInstructionsSchema,
  robotFileReadInstructionsSchema,
  robotDocumentSplitInstructionsSchema,
  robotDocumentThumbsInstructionsSchema,
  robotDropboxImportInstructionsSchema,
  robotDropboxStoreInstructionsSchema,
  robotEdglyDeliverInstructionsSchema,
  robotFileCompressInstructionsSchema,
  robotFileDecompressInstructionsSchema,
  robotFileFilterInstructionsSchema,
  robotFileHashInstructionsSchema,
  robotFilePreviewInstructionsSchema,
  robotFileServeInstructionsSchema,
  robotFileVerifyInstructionsSchema,
  robotFileVirusscanInstructionsSchema,
  robotFtpImportInstructionsSchema,
  robotFtpStoreInstructionsSchema,
  robotGoogleImportInstructionsSchema,
  robotGoogleStoreInstructionsSchema,
  robotHtmlConvertInstructionsSchema,
  robotHttpImportInstructionsSchema,
  robotImageDescribeInstructionsSchema,
  robotImageFacedetectInstructionsSchema,
  robotImageMergeInstructionsSchema,
  robotImageOcrInstructionsSchema,
  robotImageOptimizeInstructionsSchema,
  robotImageResizeInstructionsSchema,
  robotMediaPlaylistInstructionsSchema,
  robotMetaWriteInstructionsSchema,
  robotMinioImportInstructionsSchema,
  robotMinioStoreInstructionsSchema,
  robotS3ImportInstructionsSchema,
  robotS3StoreInstructionsSchema,
  robotScriptRunInstructionsSchema,
  robotSftpImportInstructionsSchema,
  robotSftpStoreInstructionsSchema,
  robotSpeechTranscribeInstructionsSchema,
  robotSupabaseImportInstructionsSchema,
  robotSupabaseStoreInstructionsSchema,
  robotSwiftImportInstructionsSchema,
  robotSwiftStoreInstructionsSchema,
  robotTextSpeakInstructionsSchema,
  robotTextTranslateInstructionsSchema,
  robotTigrisImportInstructionsSchema,
  robotTigrisStoreInstructionsSchema,
  robotTlcdnDeliverInstructionsSchema,
  robotTusStoreInstructionsSchema,
  robotUploadHandleInstructionsSchema,
  robotVideoAdaptiveInstructionsSchema,
  robotVideoConcatInstructionsSchema,
  robotVideoEncodeInstructionsSchema,
  robotVideoMergeInstructionsSchema,
  robotVideoSubtitleInstructionsSchema,
  robotVideoThumbsInstructionsSchema,
  robotVimeoStoreInstructionsSchema,
  robotWasabiImportInstructionsSchema,
  robotWasabiStoreInstructionsSchema,
  robotYoutubeStoreInstructionsSchema,
] as const

const robotStepsInstructionsWithHiddenFields = [
  robotAudioArtworkInstructionsSchema,
  robotAudioConcatInstructionsSchema,
  robotAudioEncodeInstructionsSchema,
  robotAudioLoopInstructionsSchema,
  robotAudioMergeInstructionsSchema,
  robotAudioWaveformInstructionsSchema,
  robotAzureImportInstructionsSchema,
  robotAzureStoreInstructionsSchema,
  robotBackblazeImportInstructionsSchema,
  robotBackblazeStoreInstructionsSchema,
  robotCloudfilesImportInstructionsSchema,
  robotCloudfilesStoreInstructionsSchema,
  robotCloudflareImportInstructionsSchema,
  robotCloudflareStoreInstructionsSchema,
  robotDigitaloceanImportInstructionsSchema,
  robotDigitaloceanStoreInstructionsSchema,
  robotDocumentAutorotateInstructionsSchema,
  robotDocumentConvertInstructionsSchema,
  robotDocumentMergeInstructionsSchema,
  robotDocumentOcrInstructionsSchema,
  robotFileReadInstructionsSchema,
  robotDocumentSplitInstructionsSchema,
  robotDocumentThumbsInstructionsSchema,
  robotDropboxImportInstructionsSchema,
  robotDropboxStoreInstructionsSchema,
  robotEdglyDeliverInstructionsSchema,
  robotFileCompressInstructionsSchema,
  robotFileDecompressInstructionsSchema,
  robotFileFilterInstructionsSchema,
  robotFileHashInstructionsSchema,
  robotFilePreviewInstructionsSchema,
  robotFileServeInstructionsSchema,
  robotFileVerifyInstructionsSchema,
  robotFileVirusscanInstructionsSchema,
  robotFtpImportInstructionsSchema,
  robotFtpStoreInstructionsSchema,
  robotGoogleImportInstructionsSchema,
  robotGoogleStoreInstructionsSchema,
  robotHtmlConvertInstructionsSchema,
  robotHttpImportInstructionsSchema,
  robotImageDescribeInstructionsSchema,
  robotImageFacedetectInstructionsSchema,
  robotImageMergeInstructionsSchema,
  robotImageOcrInstructionsSchema,
  robotImageOptimizeInstructionsSchema,
  robotImageResizeInstructionsSchema,
  robotMediaPlaylistInstructionsSchema,
  robotMetaWriteInstructionsSchema,
  robotMinioImportInstructionsSchema,
  robotMinioStoreInstructionsSchema,
  robotS3ImportInstructionsSchema,
  robotS3StoreInstructionsSchema,
  robotScriptRunInstructionsSchema,
  robotSftpImportInstructionsSchema,
  robotSftpStoreInstructionsSchema,
  robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  robotSupabaseImportInstructionsSchema,
  robotSupabaseStoreInstructionsSchema,
  robotSwiftImportInstructionsSchema,
  robotSwiftStoreInstructionsSchema,
  robotTextSpeakInstructionsSchema,
  robotTextTranslateInstructionsSchema,
  robotTigrisImportInstructionsSchema,
  robotTigrisStoreInstructionsSchema,
  robotTlcdnDeliverInstructionsSchema,
  robotTusStoreInstructionsSchema,
  robotUploadHandleInstructionsSchema,
  robotVideoAdaptiveInstructionsSchema,
  robotVideoConcatInstructionsSchema,
  robotVideoEncodeInstructionsSchema,
  robotVideoMergeInstructionsSchema,
  robotVideoSubtitleInstructionsSchema,
  robotVideoThumbsInstructionsSchema,
  robotVimeoStoreInstructionsSchema,
  robotWasabiImportInstructionsSchema,
  robotWasabiStoreInstructionsSchema,
  robotYoutubeStoreInstructionsSchema,
] as const

/**
 * Public robot instructions
 */
export const robotsSchema = z.discriminatedUnion('robot', [...robotStepsInstructions])
export const robotsWithHiddenFieldsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructionsWithHiddenFields,
])

/**
 * All robot instructions, including private ones.
 */
export const robotsWithHiddenBotsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructions,
  robotFileWatermarkInstructionsSchema,
  robotImageGenerateInstructionsSchema,
  robotImageRemoveBackgroundInstructionsSchema,
  robotProgressSimulateInstructionsSchema,
])
export const robotsWithHiddenBotsAndFieldsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructionsWithHiddenFields,
  robotFileWatermarkInstructionsSchema,
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
  robotImageRemoveBackgroundInstructionsSchema,
  robotProgressSimulateInstructionsSchema,
])

export type RobotsWithHiddenBots = z.infer<typeof robotsWithHiddenBotsSchema>
export type RobotsWithHiddenBotsAndFields = z.infer<typeof robotsWithHiddenBotsAndFieldsSchema>

export const robotsMeta = {
  audioArtworkMeta,
  audioConcatMeta,
  audioEncodeMeta,
  audioLoopMeta,
  audioMergeMeta,
  audioWaveformMeta,
  azureImportMeta,
  azureStoreMeta,
  backblazeImportMeta,
  backblazeStoreMeta,
  cloudfilesImportMeta,
  cloudfilesStoreMeta,
  cloudflareImportMeta,
  cloudflareStoreMeta,
  digitaloceanImportMeta,
  digitaloceanStoreMeta,
  documentAutorotateMeta,
  documentConvertMeta,
  documentMergeMeta,
  documentOcrMeta,
  documentSplitMeta,
  documentThumbsMeta,
  dropboxImportMeta,
  dropboxStoreMeta,
  edglyDeliverMeta,
  fileCompressMeta,
  fileDecompressMeta,
  fileFilterMeta,
  fileHashMeta,
  filePreviewMeta,
  fileReadMeta,
  fileServeMeta,
  fileVerifyMeta,
  fileVirusscanMeta,
  ftpImportMeta,
  ftpStoreMeta,
  googleImportMeta,
  googleStoreMeta,
  htmlConvertMeta,
  httpImportMeta,
  imageDescribeMeta,
  imageFacedetectMeta,
  imageMergeMeta,
  imageOcrMeta,
  imageOptimizeMeta,
  imageResizeMeta,
  mediaPlaylistMeta,
  metaWriteMeta,
  minioImportMeta,
  minioStoreMeta,
  s3ImportMeta,
  s3StoreMeta,
  scriptRunMeta,
  sftpImportMeta,
  sftpStoreMeta,
  speechTranscribeMeta,
  supabaseImportMeta,
  supabaseStoreMeta,
  swiftImportMeta,
  swiftStoreMeta,
  textSpeakMeta,
  textTranslateMeta,
  tigrisImport,
  tigrisStore,
  tlcdnDeliverMeta,
  tusStoreMeta,
  uploadHandleMeta,
  videoAdaptiveMeta,
  videoConcatMeta,
  videoEncodeMeta,
  videoMergeMeta,
  videoSubtitleMeta,
  videoThumbsMeta,
  vimeoStoreMeta,
  wasabiImportMeta,
  wasabiStoreMeta,
  youtubeStoreMeta,
}
