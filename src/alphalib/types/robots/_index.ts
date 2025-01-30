import { z } from 'zod'

import { robotAudioArtworkInstructionsSchema } from './audio-artwork.ts'
import { robotAudioConcatInstructionsSchema } from './audio-concat.ts'
import { robotAudioEncodeInstructionsSchema } from './audio-encode.ts'
import { robotAudioLoopInstructionsSchema } from './audio-loop.ts'
import { robotAudioMergeInstructionsSchema } from './audio-merge.ts'
import { robotAudioWaveformInstructionsSchema } from './audio-waveform.ts'
import { robotAzureImportInstructionsSchema } from './azure-import.ts'
import { robotAzureStoreInstructionsSchema } from './azure-store.ts'
import { robotBackblazeImportInstructionsSchema } from './backblaze-import.ts'
import { robotBackblazeStoreInstructionsSchema } from './backblaze-store.ts'
import { robotCloudfilesImportInstructionsSchema } from './cloudfiles-import.ts'
import { robotCloudfilesStoreInstructionsSchema } from './cloudfiles-store.ts'
import { robotCloudflareImportInstructionsSchema } from './cloudflare-import.ts'
import { robotCloudflareStoreInstructionsSchema } from './cloudflare-store.ts'
import { robotDigitaloceanImportInstructionsSchema } from './digitalocean-import.ts'
import { robotDigitaloceanStoreInstructionsSchema } from './digitalocean-store.ts'
import { robotDocumentAutorotateInstructionsSchema } from './document-autorotate.ts'
import { robotDocumentConvertInstructionsSchema } from './document-convert.ts'
import { robotDocumentMergeInstructionsSchema } from './document-merge.ts'
import { robotDocumentOcrInstructionsSchema } from './document-ocr.ts'
import { robotDocumentSplitInstructionsSchema } from './document-split.ts'
import { robotDocumentThumbsInstructionsSchema } from './document-thumbs.ts'
import { robotDropboxImportInstructionsSchema } from './dropbox-import.ts'
import { robotDropboxStoreInstructionsSchema } from './dropbox-store.ts'
import { robotEdglyDeliverInstructionsSchema } from './edgly-deliver.ts'
import { robotFileCompressInstructionsSchema } from './file-compress.ts'
import { robotFileDecompressInstructionsSchema } from './file-decompress.ts'
import { robotFileFilterInstructionsSchema } from './file-filter.ts'
import { robotFileHashInstructionsSchema } from './file-hash.ts'
import { robotFilePreviewInstructionsSchema } from './file-preview.ts'
import { robotFileReadInstructionsSchema } from './file-read.ts'
import { robotFileServeInstructionsSchema } from './file-serve.ts'
import { robotFileVerifyInstructionsSchema } from './file-verify.ts'
import { robotFileVirusscanInstructionsSchema } from './file-virusscan.ts'
import { robotFileWatermarkInstructionsSchema } from './file-watermark.ts'
import { robotFtpImportInstructionsSchema } from './ftp-import.ts'
import { robotFtpStoreInstructionsSchema } from './ftp-store.ts'
import { robotGoogleImportInstructionsSchema } from './google-import.ts'
import { robotGoogleStoreInstructionsSchema } from './google-store.ts'
import { robotHtmlConvertInstructionsSchema } from './html-convert.ts'
import { robotHttpImportInstructionsSchema } from './http-import.ts'
import { robotImageDescribeInstructionsSchema } from './image-describe.ts'
import { robotImageFacedetectInstructionsSchema } from './image-facedetect.ts'
import {
  robotImageGenerateInstructionsSchema,
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
} from './image-generate.ts'
import { robotImageMergeInstructionsSchema } from './image-merge.ts'
import { robotImageOcrInstructionsSchema } from './image-ocr.ts'
import { robotImageOptimizeInstructionsSchema } from './image-optimize.ts'
import { robotImageRemoveBackgroundInstructionsSchema } from './image-remove-background.ts'
import { robotImageResizeInstructionsSchema } from './image-resize.ts'
import { robotMediaPlaylistInstructionsSchema } from './media-playlist.ts'
import { robotMetaWriteInstructionsSchema } from './meta-write.ts'
import { robotMinioImportInstructionsSchema } from './minio-import.ts'
import { robotMinioStoreInstructionsSchema } from './minio-store.ts'
import { robotProgressSimulateInstructionsSchema } from './progress-simulate.ts'
import { robotS3ImportInstructionsSchema } from './s3-import.ts'
import { robotS3StoreInstructionsSchema } from './s3-store.ts'
import { robotScriptRunInstructionsSchema } from './script-run.ts'
import { robotSftpImportInstructionsSchema } from './sftp-import.ts'
import { robotSftpStoreInstructionsSchema } from './sftp-store.ts'
import {
  robotSpeechTranscribeInstructionsSchema,
  robotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
} from './speech-transcribe.ts'
import { robotSupabaseImportInstructionsSchema } from './supabase-import.ts'
import { robotSupabaseStoreInstructionsSchema } from './supabase-store.ts'
import { robotSwiftImportInstructionsSchema } from './swift-import.ts'
import { robotSwiftStoreInstructionsSchema } from './swift-store.ts'
import { robotTextSpeakInstructionsSchema } from './text-speak.ts'
import { robotTextTranslateInstructionsSchema } from './text-translate.ts'
import { robotTlcdnDeliverInstructionsSchema } from './tlcdn-deliver.ts'
import { robotTusStoreInstructionsSchema } from './tus-store.ts'
import { robotUploadHandleInstructionsSchema } from './upload-handle.ts'
import { robotVideoAdaptiveInstructionsSchema } from './video-adaptive.ts'
import { robotVideoConcatInstructionsSchema } from './video-concat.ts'
import { robotVideoEncodeInstructionsSchema } from './video-encode.ts'
import { robotVideoMergeInstructionsSchema } from './video-merge.ts'
import { robotVideoSubtitleInstructionsSchema } from './video-subtitle.ts'
import { robotVideoThumbsInstructionsSchema } from './video-thumbs.ts'
import { robotVimeoStoreInstructionsSchema } from './vimeo-store.ts'
import { robotWasabiImportInstructionsSchema } from './wasabi-import.ts'
import { robotWasabiStoreInstructionsSchema } from './wasabi-store.ts'
import { robotYoutubeStoreInstructionsSchema } from './youtube-store.ts'

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
