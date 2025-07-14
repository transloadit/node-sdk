import { z } from 'zod'

import {
  interpolatableRobotAudioArtworkInstructionsSchema,
  meta as audioArtworkMeta,
} from './audio-artwork.ts'
import {
  interpolatableRobotAudioConcatInstructionsSchema,
  meta as audioConcatMeta,
} from './audio-concat.ts'
import {
  interpolatableRobotAudioEncodeInstructionsSchema,
  meta as audioEncodeMeta,
} from './audio-encode.ts'
import {
  interpolatableRobotAudioLoopInstructionsSchema,
  meta as audioLoopMeta,
} from './audio-loop.ts'
import {
  interpolatableRobotAudioMergeInstructionsSchema,
  meta as audioMergeMeta,
} from './audio-merge.ts'
import {
  interpolatableRobotAudioWaveformInstructionsSchema,
  meta as audioWaveformMeta,
} from './audio-waveform.ts'
import {
  interpolatableRobotAzureImportInstructionsSchema,
  meta as azureImportMeta,
} from './azure-import.ts'
import {
  interpolatableRobotAzureStoreInstructionsSchema,
  meta as azureStoreMeta,
} from './azure-store.ts'
import {
  interpolatableRobotBackblazeImportInstructionsSchema,
  meta as backblazeImportMeta,
} from './backblaze-import.ts'
import {
  interpolatableRobotBackblazeStoreInstructionsSchema,
  meta as backblazeStoreMeta,
} from './backblaze-store.ts'
import {
  interpolatableRobotCloudfilesImportInstructionsSchema,
  meta as cloudfilesImportMeta,
} from './cloudfiles-import.ts'
import {
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  meta as cloudfilesStoreMeta,
} from './cloudfiles-store.ts'
import {
  interpolatableRobotCloudflareImportInstructionsSchema,
  meta as cloudflareImportMeta,
} from './cloudflare-import.ts'
import {
  interpolatableRobotCloudflareStoreInstructionsSchema,
  meta as cloudflareStoreMeta,
} from './cloudflare-store.ts'
import {
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  meta as digitaloceanImportMeta,
} from './digitalocean-import.ts'
import {
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  meta as digitaloceanStoreMeta,
} from './digitalocean-store.ts'
import {
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  meta as documentAutorotateMeta,
} from './document-autorotate.ts'
import {
  interpolatableRobotDocumentConvertInstructionsSchema,
  meta as documentConvertMeta,
} from './document-convert.ts'
import {
  interpolatableRobotDocumentMergeInstructionsSchema,
  meta as documentMergeMeta,
} from './document-merge.ts'
import {
  interpolatableRobotDocumentOcrInstructionsSchema,
  meta as documentOcrMeta,
} from './document-ocr.ts'
import {
  interpolatableRobotDocumentSplitInstructionsSchema,
  meta as documentSplitMeta,
} from './document-split.ts'
import {
  interpolatableRobotDocumentThumbsInstructionsSchema,
  meta as documentThumbsMeta,
} from './document-thumbs.ts'
import {
  interpolatableRobotDropboxImportInstructionsSchema,
  meta as dropboxImportMeta,
} from './dropbox-import.ts'
import {
  interpolatableRobotDropboxStoreInstructionsSchema,
  meta as dropboxStoreMeta,
} from './dropbox-store.ts'
import {
  interpolatableRobotEdglyDeliverInstructionsSchema,
  meta as edglyDeliverMeta,
} from './edgly-deliver.ts'
import {
  interpolatableRobotFileCompressInstructionsSchema,
  meta as fileCompressMeta,
} from './file-compress.ts'
import {
  interpolatableRobotFileDecompressInstructionsSchema,
  meta as fileDecompressMeta,
} from './file-decompress.ts'
import {
  interpolatableRobotFileFilterInstructionsSchema,
  meta as fileFilterMeta,
} from './file-filter.ts'
import { interpolatableRobotFileHashInstructionsSchema, meta as fileHashMeta } from './file-hash.ts'
import {
  interpolatableRobotFilePreviewInstructionsSchema,
  meta as filePreviewMeta,
} from './file-preview.ts'
import { interpolatableRobotFileReadInstructionsSchema, meta as fileReadMeta } from './file-read.ts'
import {
  interpolatableRobotFileServeInstructionsSchema,
  meta as fileServeMeta,
} from './file-serve.ts'
import {
  interpolatableRobotFileVerifyInstructionsSchema,
  meta as fileVerifyMeta,
} from './file-verify.ts'
import {
  interpolatableRobotFileVirusscanInstructionsSchema,
  meta as fileVirusscanMeta,
} from './file-virusscan.ts'
import { interpolatableRobotFileWatermarkInstructionsSchema } from './file-watermark.ts'
import {
  interpolatableRobotFtpImportInstructionsSchema,
  meta as ftpImportMeta,
} from './ftp-import.ts'
import { interpolatableRobotFtpStoreInstructionsSchema, meta as ftpStoreMeta } from './ftp-store.ts'
import {
  interpolatableRobotGoogleImportInstructionsSchema,
  meta as googleImportMeta,
} from './google-import.ts'
import {
  interpolatableRobotGoogleStoreInstructionsSchema,
  meta as googleStoreMeta,
} from './google-store.ts'
import {
  interpolatableRobotHtmlConvertInstructionsSchema,
  meta as htmlConvertMeta,
} from './html-convert.ts'
import {
  interpolatableRobotHttpImportInstructionsSchema,
  meta as httpImportMeta,
} from './http-import.ts'
import {
  interpolatableRobotImageBgremoveInstructionsSchema,
  meta as imageBgremoveMeta,
} from './image-bgremove.ts'
import {
  interpolatableRobotImageDescribeInstructionsSchema,
  meta as imageDescribeMeta,
} from './image-describe.ts'
import {
  interpolatableRobotImageFacedetectInstructionsSchema,
  meta as imageFacedetectMeta,
} from './image-facedetect.ts'
import {
  interpolatableRobotImageGenerateInstructionsSchema,
  meta as imageGenerateMeta,
} from './image-generate.ts'
import {
  interpolatableRobotImageMergeInstructionsSchema,
  meta as imageMergeMeta,
} from './image-merge.ts'
import { interpolatableRobotImageOcrInstructionsSchema, meta as imageOcrMeta } from './image-ocr.ts'
import {
  interpolatableRobotImageOptimizeInstructionsSchema,
  meta as imageOptimizeMeta,
} from './image-optimize.ts'
import {
  interpolatableRobotImageResizeInstructionsSchema,
  meta as imageResizeMeta,
} from './image-resize.ts'
import {
  interpolatableRobotMetaWriteInstructionsSchema,
  meta as metaWriteMeta,
} from './meta-write.ts'
import {
  interpolatableRobotMinioImportInstructionsSchema,
  meta as minioImportMeta,
} from './minio-import.ts'
import {
  interpolatableRobotMinioStoreInstructionsSchema,
  meta as minioStoreMeta,
} from './minio-store.ts'
import { interpolatableRobotProgressSimulateInstructionsSchema } from './progress-simulate.ts'
import { interpolatableRobotS3ImportInstructionsSchema, meta as s3ImportMeta } from './s3-import.ts'
import { interpolatableRobotS3StoreInstructionsSchema, meta as s3StoreMeta } from './s3-store.ts'
import {
  interpolatableRobotScriptRunInstructionsSchema,
  meta as scriptRunMeta,
} from './script-run.ts'
import {
  interpolatableRobotSftpImportInstructionsSchema,
  meta as sftpImportMeta,
} from './sftp-import.ts'
import {
  interpolatableRobotSftpStoreInstructionsSchema,
  meta as sftpStoreMeta,
} from './sftp-store.ts'
import {
  interpolatableRobotSpeechTranscribeInstructionsSchema,
  robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  meta as speechTranscribeMeta,
} from './speech-transcribe.ts'
import {
  interpolatableRobotSupabaseImportInstructionsSchema,
  meta as supabaseImportMeta,
} from './supabase-import.ts'
import {
  interpolatableRobotSupabaseStoreInstructionsSchema,
  meta as supabaseStoreMeta,
} from './supabase-store.ts'
import {
  interpolatableRobotSwiftImportInstructionsSchema,
  meta as swiftImportMeta,
} from './swift-import.ts'
import {
  interpolatableRobotSwiftStoreInstructionsSchema,
  meta as swiftStoreMeta,
} from './swift-store.ts'
import {
  interpolatableRobotTextSpeakInstructionsSchema,
  meta as textSpeakMeta,
} from './text-speak.ts'
import {
  interpolatableRobotTextTranslateInstructionsSchema,
  meta as textTranslateMeta,
} from './text-translate.ts'
import {
  interpolatableRobotTigrisImportInstructionsSchema,
  meta as tigrisImport,
} from './tigris-import.ts'
import {
  interpolatableRobotTigrisStoreInstructionsSchema,
  meta as tigrisStore,
} from './tigris-store.ts'
import {
  interpolatableRobotTlcdnDeliverInstructionsSchema,
  meta as tlcdnDeliverMeta,
} from './tlcdn-deliver.ts'
import { interpolatableRobotTusStoreInstructionsSchema, meta as tusStoreMeta } from './tus-store.ts'
import {
  interpolatableRobotUploadHandleInstructionsSchema,
  meta as uploadHandleMeta,
} from './upload-handle.ts'
import {
  interpolatableRobotVideoAdaptiveInstructionsSchema,
  meta as videoAdaptiveMeta,
} from './video-adaptive.ts'
import {
  interpolatableRobotVideoConcatInstructionsSchema,
  meta as videoConcatMeta,
} from './video-concat.ts'
import {
  interpolatableRobotVideoEncodeInstructionsSchema,
  meta as videoEncodeMeta,
} from './video-encode.ts'
import {
  interpolatableRobotVideoMergeInstructionsSchema,
  meta as videoMergeMeta,
} from './video-merge.ts'
import {
  interpolatableRobotVideoOndemandInstructionsSchema,
  robotVideoOndemandInstructionsWithHiddenFieldsSchema,
  meta as videoOndemandMeta,
} from './video-ondemand.ts'
import {
  interpolatableRobotVideoSubtitleInstructionsSchema,
  meta as videoSubtitleMeta,
} from './video-subtitle.ts'
import {
  interpolatableRobotVideoThumbsInstructionsSchema,
  meta as videoThumbsMeta,
} from './video-thumbs.ts'
import {
  interpolatableRobotVimeoImportInstructionsSchema,
  meta as vimeoImportMeta,
} from './vimeo-import.ts'
import {
  interpolatableRobotVimeoStoreInstructionsSchema,
  meta as vimeoStoreMeta,
} from './vimeo-store.ts'
import {
  interpolatableRobotWasabiImportInstructionsSchema,
  meta as wasabiImportMeta,
} from './wasabi-import.ts'
import {
  interpolatableRobotWasabiStoreInstructionsSchema,
  meta as wasabiStoreMeta,
} from './wasabi-store.ts'
import {
  interpolatableRobotYoutubeStoreInstructionsSchema,
  meta as youtubeStoreMeta,
} from './youtube-store.ts'

const robotStepsInstructions = [
  interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableRobotAudioWaveformInstructionsSchema,
  interpolatableRobotAzureImportInstructionsSchema,
  interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableRobotDocumentConvertInstructionsSchema,
  interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableRobotFileReadInstructionsSchema,
  interpolatableRobotDocumentSplitInstructionsSchema,
  interpolatableRobotDocumentThumbsInstructionsSchema,
  interpolatableRobotDropboxImportInstructionsSchema,
  interpolatableRobotDropboxStoreInstructionsSchema,
  interpolatableRobotEdglyDeliverInstructionsSchema,
  interpolatableRobotFileCompressInstructionsSchema,
  interpolatableRobotFileDecompressInstructionsSchema,
  interpolatableRobotFileFilterInstructionsSchema,
  interpolatableRobotFileHashInstructionsSchema,
  interpolatableRobotFilePreviewInstructionsSchema,
  interpolatableRobotFileServeInstructionsSchema,
  interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableRobotFtpImportInstructionsSchema,
  interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableRobotGoogleStoreInstructionsSchema,
  interpolatableRobotHtmlConvertInstructionsSchema,
  interpolatableRobotHttpImportInstructionsSchema,
  interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageFacedetectInstructionsSchema,
  interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableRobotImageMergeInstructionsSchema,
  interpolatableRobotImageOcrInstructionsSchema,
  interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableRobotImageResizeInstructionsSchema,
  interpolatableRobotMetaWriteInstructionsSchema,
  interpolatableRobotMinioImportInstructionsSchema,
  interpolatableRobotMinioStoreInstructionsSchema,
  interpolatableRobotS3ImportInstructionsSchema,
  interpolatableRobotS3StoreInstructionsSchema,
  interpolatableRobotScriptRunInstructionsSchema,
  interpolatableRobotSftpImportInstructionsSchema,
  interpolatableRobotSftpStoreInstructionsSchema,
  interpolatableRobotSpeechTranscribeInstructionsSchema,
  interpolatableRobotSupabaseImportInstructionsSchema,
  interpolatableRobotSupabaseStoreInstructionsSchema,
  interpolatableRobotSwiftImportInstructionsSchema,
  interpolatableRobotSwiftStoreInstructionsSchema,
  interpolatableRobotTextSpeakInstructionsSchema,
  interpolatableRobotTextTranslateInstructionsSchema,
  interpolatableRobotTigrisImportInstructionsSchema,
  interpolatableRobotTigrisStoreInstructionsSchema,
  interpolatableRobotTlcdnDeliverInstructionsSchema,
  interpolatableRobotTusStoreInstructionsSchema,
  interpolatableRobotUploadHandleInstructionsSchema,
  interpolatableRobotVideoAdaptiveInstructionsSchema,
  interpolatableRobotVideoConcatInstructionsSchema,
  interpolatableRobotVideoEncodeInstructionsSchema,
  interpolatableRobotVideoMergeInstructionsSchema,
  interpolatableRobotVideoOndemandInstructionsSchema,
  interpolatableRobotVideoSubtitleInstructionsSchema,
  interpolatableRobotVideoThumbsInstructionsSchema,
  interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableRobotYoutubeStoreInstructionsSchema,
] as const

const robotStepsInstructionsWithHiddenFields = [
  interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableRobotAudioWaveformInstructionsSchema,
  interpolatableRobotAzureImportInstructionsSchema,
  interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableRobotDocumentConvertInstructionsSchema,
  interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableRobotFileReadInstructionsSchema,
  interpolatableRobotDocumentSplitInstructionsSchema,
  interpolatableRobotDocumentThumbsInstructionsSchema,
  interpolatableRobotDropboxImportInstructionsSchema,
  interpolatableRobotDropboxStoreInstructionsSchema,
  interpolatableRobotEdglyDeliverInstructionsSchema,
  interpolatableRobotFileCompressInstructionsSchema,
  interpolatableRobotFileDecompressInstructionsSchema,
  interpolatableRobotFileFilterInstructionsSchema,
  interpolatableRobotFileHashInstructionsSchema,
  interpolatableRobotFilePreviewInstructionsSchema,
  interpolatableRobotFileServeInstructionsSchema,
  interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableRobotFtpImportInstructionsSchema,
  interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableRobotGoogleStoreInstructionsSchema,
  interpolatableRobotHtmlConvertInstructionsSchema,
  interpolatableRobotHttpImportInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageFacedetectInstructionsSchema,
  interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableRobotImageMergeInstructionsSchema,
  interpolatableRobotImageOcrInstructionsSchema,
  interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableRobotImageResizeInstructionsSchema,
  interpolatableRobotMetaWriteInstructionsSchema,
  interpolatableRobotMinioImportInstructionsSchema,
  interpolatableRobotMinioStoreInstructionsSchema,
  interpolatableRobotS3ImportInstructionsSchema,
  interpolatableRobotS3StoreInstructionsSchema,
  interpolatableRobotScriptRunInstructionsSchema,
  interpolatableRobotSftpImportInstructionsSchema,
  interpolatableRobotSftpStoreInstructionsSchema,
  robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSupabaseImportInstructionsSchema,
  interpolatableRobotSupabaseStoreInstructionsSchema,
  interpolatableRobotSwiftImportInstructionsSchema,
  interpolatableRobotSwiftStoreInstructionsSchema,
  interpolatableRobotTextSpeakInstructionsSchema,
  interpolatableRobotTextTranslateInstructionsSchema,
  interpolatableRobotTigrisImportInstructionsSchema,
  interpolatableRobotTigrisStoreInstructionsSchema,
  interpolatableRobotTlcdnDeliverInstructionsSchema,
  interpolatableRobotTusStoreInstructionsSchema,
  interpolatableRobotUploadHandleInstructionsSchema,
  interpolatableRobotVideoAdaptiveInstructionsSchema,
  interpolatableRobotVideoConcatInstructionsSchema,
  interpolatableRobotVideoEncodeInstructionsSchema,
  interpolatableRobotVideoMergeInstructionsSchema,
  robotVideoOndemandInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoSubtitleInstructionsSchema,
  interpolatableRobotVideoThumbsInstructionsSchema,
  interpolatableRobotVimeoImportInstructionsSchema,
  interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableRobotYoutubeStoreInstructionsSchema,
] as const

/**
 * Public robot instructions
 */
export type RobotsSchema = z.infer<typeof robotsSchema>
export const robotsSchema = z.discriminatedUnion('robot', [...robotStepsInstructions])
export const robotsWithHiddenFieldsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructionsWithHiddenFields,
])

/**
 * All robot instructions, including private ones.
 */
export const robotsWithHiddenBotsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructions,
  interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableRobotProgressSimulateInstructionsSchema,
])
export const robotsWithHiddenBotsAndFieldsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructionsWithHiddenFields,
  interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableRobotProgressSimulateInstructionsSchema,
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
  imageBgremoveMeta,
  imageGenerateMeta,
  imageMergeMeta,
  imageOcrMeta,
  imageOptimizeMeta,
  imageResizeMeta,
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
  videoOndemandMeta,
  videoSubtitleMeta,
  videoThumbsMeta,
  vimeoImportMeta,
  vimeoStoreMeta,
  wasabiImportMeta,
  wasabiStoreMeta,
  youtubeStoreMeta,
}
