import { z } from 'zod'

import {
  meta as audioArtworkMeta,
  interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema,
} from './audio-artwork.ts'
import {
  meta as audioConcatMeta,
  interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema,
} from './audio-concat.ts'
import {
  meta as audioEncodeMeta,
  interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema,
} from './audio-encode.ts'
import {
  meta as audioLoopMeta,
  interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema,
} from './audio-loop.ts'
import {
  meta as audioMergeMeta,
  interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema,
} from './audio-merge.ts'
import {
  meta as audioWaveformMeta,
  interpolatableRobotAudioWaveformInstructionsSchema,
  interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema,
} from './audio-waveform.ts'
import {
  meta as azureImportMeta,
  interpolatableRobotAzureImportInstructionsSchema,
  interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema,
} from './azure-import.ts'
import {
  meta as azureStoreMeta,
  interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema,
} from './azure-store.ts'
import {
  meta as backblazeImportMeta,
  interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema,
} from './backblaze-import.ts'
import {
  meta as backblazeStoreMeta,
  interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema,
} from './backblaze-store.ts'
import {
  meta as cloudfilesImportMeta,
  interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsSchema,
} from './cloudfiles-import.ts'
import {
  meta as cloudfilesStoreMeta,
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
} from './cloudfiles-store.ts'
import {
  meta as cloudflareImportMeta,
  interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableRobotCloudflareImportInstructionsWithHiddenFieldsSchema,
} from './cloudflare-import.ts'
import {
  meta as cloudflareStoreMeta,
  interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsSchema,
} from './cloudflare-store.ts'
import {
  meta as digitaloceanImportMeta,
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
} from './digitalocean-import.ts'
import {
  meta as digitaloceanStoreMeta,
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
} from './digitalocean-store.ts'
import {
  meta as documentAutorotateMeta,
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
} from './document-autorotate.ts'
import {
  meta as documentConvertMeta,
  interpolatableRobotDocumentConvertInstructionsSchema,
  interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema,
} from './document-convert.ts'
import {
  meta as documentMergeMeta,
  interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema,
} from './document-merge.ts'
import {
  meta as documentOcrMeta,
  interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema,
} from './document-ocr.ts'
import {
  meta as documentSplitMeta,
  interpolatableRobotDocumentSplitInstructionsSchema,
  interpolatableRobotDocumentSplitInstructionsWithHiddenFieldsSchema,
} from './document-split.ts'
import {
  meta as documentThumbsMeta,
  interpolatableRobotDocumentThumbsInstructionsSchema,
  interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema,
} from './document-thumbs.ts'
import {
  meta as dropboxImportMeta,
  interpolatableRobotDropboxImportInstructionsSchema,
  interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema,
} from './dropbox-import.ts'
import {
  meta as dropboxStoreMeta,
  interpolatableRobotDropboxStoreInstructionsSchema,
  interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema,
} from './dropbox-store.ts'
import {
  meta as edglyDeliverMeta,
  interpolatableRobotEdglyDeliverInstructionsSchema,
  interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema,
} from './edgly-deliver.ts'
import {
  meta as fileCompressMeta,
  interpolatableRobotFileCompressInstructionsSchema,
  interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema,
} from './file-compress.ts'
import {
  meta as fileDecompressMeta,
  interpolatableRobotFileDecompressInstructionsSchema,
  interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema,
} from './file-decompress.ts'
import {
  meta as fileFilterMeta,
  interpolatableRobotFileFilterInstructionsSchema,
  interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema,
} from './file-filter.ts'
import {
  meta as fileHashMeta,
  interpolatableRobotFileHashInstructionsSchema,
  interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema,
} from './file-hash.ts'
import {
  meta as filePreviewMeta,
  interpolatableRobotFilePreviewInstructionsSchema,
  interpolatableRobotFilePreviewInstructionsWithHiddenFieldsSchema,
} from './file-preview.ts'
import {
  meta as fileReadMeta,
  interpolatableRobotFileReadInstructionsSchema,
  interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema,
} from './file-read.ts'
import {
  meta as fileServeMeta,
  interpolatableRobotFileServeInstructionsSchema,
  interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema,
} from './file-serve.ts'
import {
  meta as fileVerifyMeta,
  interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema,
} from './file-verify.ts'
import {
  meta as fileVirusscanMeta,
  interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema,
} from './file-virusscan.ts'
import {
  interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema,
} from './file-watermark.ts'
import {
  meta as ftpImportMeta,
  interpolatableRobotFtpImportInstructionsSchema,
  interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema,
} from './ftp-import.ts'
import {
  meta as ftpStoreMeta,
  interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema,
} from './ftp-store.ts'
import {
  meta as googleImportMeta,
  interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema,
} from './google-import.ts'
import {
  meta as googleStoreMeta,
  interpolatableRobotGoogleStoreInstructionsSchema,
  interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema,
} from './google-store.ts'
import {
  meta as htmlConvertMeta,
  interpolatableRobotHtmlConvertInstructionsSchema,
  interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema,
} from './html-convert.ts'
import {
  meta as httpImportMeta,
  interpolatableRobotHttpImportInstructionsSchema,
  interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema,
} from './http-import.ts'
import {
  meta as imageBgremoveMeta,
  interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
} from './image-bgremove.ts'
import {
  meta as imageDescribeMeta,
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema,
} from './image-describe.ts'
import {
  meta as imageFacedetectMeta,
  interpolatableRobotImageFacedetectInstructionsSchema,
  interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema,
} from './image-facedetect.ts'
import {
  meta as imageGenerateMeta,
  interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema,
} from './image-generate.ts'
import {
  meta as imageMergeMeta,
  interpolatableRobotImageMergeInstructionsSchema,
  interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema,
} from './image-merge.ts'
import {
  meta as imageOcrMeta,
  interpolatableRobotImageOcrInstructionsSchema,
  interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema,
} from './image-ocr.ts'
import {
  meta as imageOptimizeMeta,
  interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema,
} from './image-optimize.ts'
import {
  meta as imageResizeMeta,
  interpolatableRobotImageResizeInstructionsSchema,
  interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema,
} from './image-resize.ts'
import {
  interpolatableRobotMetaReadInstructionsSchema,
  interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema,
} from './meta-read.ts'
import {
  interpolatableRobotMetaWriteInstructionsSchema,
  interpolatableRobotMetaWriteInstructionsWithHiddenFieldsSchema,
  meta as metaWriteMeta,
} from './meta-write.ts'
import {
  interpolatableRobotMinioImportInstructionsSchema,
  interpolatableRobotMinioImportInstructionsWithHiddenFieldsSchema,
  meta as minioImportMeta,
} from './minio-import.ts'
import {
  interpolatableRobotMinioStoreInstructionsSchema,
  interpolatableRobotMinioStoreInstructionsWithHiddenFieldsSchema,
  meta as minioStoreMeta,
} from './minio-store.ts'
import { interpolatableRobotProgressSimulateInstructionsSchema } from './progress-simulate.ts'
import {
  interpolatableRobotS3ImportInstructionsSchema,
  interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema,
  meta as s3ImportMeta,
} from './s3-import.ts'
import {
  interpolatableRobotS3StoreInstructionsSchema,
  interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema,
  meta as s3StoreMeta,
} from './s3-store.ts'
import {
  interpolatableRobotScriptRunInstructionsSchema,
  interpolatableRobotScriptRunInstructionsWithHiddenFieldsSchema,
  meta as scriptRunMeta,
} from './script-run.ts'
import {
  interpolatableRobotSftpImportInstructionsSchema,
  interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema,
  meta as sftpImportMeta,
} from './sftp-import.ts'
import {
  interpolatableRobotSftpStoreInstructionsSchema,
  interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema,
  meta as sftpStoreMeta,
} from './sftp-store.ts'
import {
  interpolatableRobotSpeechTranscribeInstructionsSchema,
  interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  meta as speechTranscribeMeta,
} from './speech-transcribe.ts'
import {
  interpolatableRobotSupabaseImportInstructionsSchema,
  interpolatableRobotSupabaseImportInstructionsWithHiddenFieldsSchema,
  meta as supabaseImportMeta,
} from './supabase-import.ts'
import {
  interpolatableRobotSupabaseStoreInstructionsSchema,
  interpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsSchema,
  meta as supabaseStoreMeta,
} from './supabase-store.ts'
import {
  interpolatableRobotSwiftImportInstructionsSchema,
  interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema,
  meta as swiftImportMeta,
} from './swift-import.ts'
import {
  interpolatableRobotSwiftStoreInstructionsSchema,
  interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema,
  meta as swiftStoreMeta,
} from './swift-store.ts'
import {
  interpolatableRobotTextSpeakInstructionsSchema,
  interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema,
  meta as textSpeakMeta,
} from './text-speak.ts'
import {
  interpolatableRobotTextTranslateInstructionsSchema,
  interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema,
  meta as textTranslateMeta,
} from './text-translate.ts'
import {
  interpolatableRobotTigrisImportInstructionsSchema,
  interpolatableRobotTigrisImportInstructionsWithHiddenFieldsSchema,
  meta as tigrisImport,
} from './tigris-import.ts'
import {
  interpolatableRobotTigrisStoreInstructionsSchema,
  interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema,
  meta as tigrisStore,
} from './tigris-store.ts'
import {
  interpolatableRobotTlcdnDeliverInstructionsSchema,
  interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
  meta as tlcdnDeliverMeta,
} from './tlcdn-deliver.ts'
import {
  interpolatableRobotTusStoreInstructionsSchema,
  interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema,
  meta as tusStoreMeta,
} from './tus-store.ts'
import {
  interpolatableRobotUploadHandleInstructionsSchema,
  interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema,
  meta as uploadHandleMeta,
} from './upload-handle.ts'
import {
  interpolatableRobotVideoAdaptiveInstructionsSchema,
  interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
  meta as videoAdaptiveMeta,
} from './video-adaptive.ts'
import {
  interpolatableRobotVideoConcatInstructionsSchema,
  interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema,
  meta as videoConcatMeta,
} from './video-concat.ts'
import {
  interpolatableRobotVideoEncodeInstructionsSchema,
  interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema,
  meta as videoEncodeMeta,
} from './video-encode.ts'
import {
  interpolatableRobotVideoMergeInstructionsSchema,
  interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema,
  meta as videoMergeMeta,
} from './video-merge.ts'
import {
  interpolatableRobotVideoOndemandInstructionsSchema,
  interpolatableRobotVideoOndemandInstructionsWithHiddenFieldsSchema,
  meta as videoOndemandMeta,
} from './video-ondemand.ts'
import {
  interpolatableRobotVideoSubtitleInstructionsSchema,
  interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema,
  meta as videoSubtitleMeta,
} from './video-subtitle.ts'
import {
  interpolatableRobotVideoThumbsInstructionsSchema,
  interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema,
  meta as videoThumbsMeta,
} from './video-thumbs.ts'
import {
  interpolatableRobotVimeoImportInstructionsSchema,
  interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema,
  meta as vimeoImportMeta,
} from './vimeo-import.ts'
import {
  interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema,
  meta as vimeoStoreMeta,
} from './vimeo-store.ts'
import {
  interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableRobotWasabiImportInstructionsWithHiddenFieldsSchema,
  meta as wasabiImportMeta,
} from './wasabi-import.ts'
import {
  interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableRobotWasabiStoreInstructionsWithHiddenFieldsSchema,
  meta as wasabiStoreMeta,
} from './wasabi-store.ts'
import {
  interpolatableRobotYoutubeStoreInstructionsSchema,
  interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema,
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
  interpolatableRobotVimeoImportInstructionsSchema,
  interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableRobotYoutubeStoreInstructionsSchema,
] as const

const robotStepsInstructionsWithHiddenFields = [
  interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudflareImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentSplitInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFilePreviewInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema,
  interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotMetaWriteInstructionsWithHiddenFieldsSchema,
  interpolatableRobotMinioImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotMinioStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotS3ImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotScriptRunInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSupabaseImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTextSpeakInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTextTranslateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTigrisImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoOndemandInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotWasabiImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotWasabiStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema,
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
  interpolatableRobotMetaReadInstructionsSchema,
  interpolatableRobotProgressSimulateInstructionsSchema,
])
export const robotsWithHiddenBotsAndFieldsSchema = z.discriminatedUnion('robot', [
  ...robotStepsInstructionsWithHiddenFields,
  interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema,
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

export type { InterpolatableRobotAssemblySavejsonInstructions } from './assembly-savejson.ts'
export type {
  InterpolatableRobotAudioArtworkInstructions,
  InterpolatableRobotAudioArtworkInstructionsWithHiddenFields,
  InterpolatableRobotAudioArtworkInstructionsWithHiddenFieldsInput,
} from './audio-artwork.ts'
export type {
  InterpolatableRobotAudioConcatInstructions,
  InterpolatableRobotAudioConcatInstructionsWithHiddenFields,
  InterpolatableRobotAudioConcatInstructionsWithHiddenFieldsInput,
} from './audio-concat.ts'
export type {
  InterpolatableRobotAudioEncodeInstructions,
  InterpolatableRobotAudioEncodeInstructionsWithHiddenFields,
  InterpolatableRobotAudioEncodeInstructionsWithHiddenFieldsInput,
} from './audio-encode.ts'
export type {
  InterpolatableRobotAudioLoopInstructions,
  InterpolatableRobotAudioLoopInstructionsWithHiddenFields,
  InterpolatableRobotAudioLoopInstructionsWithHiddenFieldsInput,
} from './audio-loop.ts'
export type {
  InterpolatableRobotAudioMergeInstructions,
  InterpolatableRobotAudioMergeInstructionsWithHiddenFields,
  InterpolatableRobotAudioMergeInstructionsWithHiddenFieldsInput,
} from './audio-merge.ts'
export type {
  InterpolatableRobotAudioWaveformInstructions,
  InterpolatableRobotAudioWaveformInstructionsWithHiddenFields,
  InterpolatableRobotAudioWaveformInstructionsWithHiddenFieldsInput,
} from './audio-waveform.ts'
export type {
  InterpolatableRobotAzureImportInstructions,
  InterpolatableRobotAzureImportInstructionsWithHiddenFields,
  InterpolatableRobotAzureImportInstructionsWithHiddenFieldsInput,
} from './azure-import.ts'
export type {
  InterpolatableRobotAzureStoreInstructions,
  InterpolatableRobotAzureStoreInstructionsWithHiddenFields,
  InterpolatableRobotAzureStoreInstructionsWithHiddenFieldsInput,
} from './azure-store.ts'
export type {
  InterpolatableRobotBackblazeImportInstructions,
  InterpolatableRobotBackblazeImportInstructionsWithHiddenFields,
  InterpolatableRobotBackblazeImportInstructionsWithHiddenFieldsInput,
} from './backblaze-import.ts'
export type {
  InterpolatableRobotBackblazeStoreInstructions,
  InterpolatableRobotBackblazeStoreInstructionsWithHiddenFields,
  InterpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsInput,
} from './backblaze-store.ts'
export type {
  InterpolatableRobotCloudfilesImportInstructions,
  InterpolatableRobotCloudfilesImportInstructionsWithHiddenFields,
  InterpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsInput,
} from './cloudfiles-import.ts'
export type {
  InterpolatableRobotCloudfilesStoreInstructions,
  InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFields,
  InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsInput,
} from './cloudfiles-store.ts'
export type {
  InterpolatableRobotCloudflareImportInstructions,
  InterpolatableRobotCloudflareImportInstructionsWithHiddenFields,
  InterpolatableRobotCloudflareImportInstructionsWithHiddenFieldsInput,
} from './cloudflare-import.ts'
export type {
  InterpolatableRobotCloudflareStoreInstructions,
  InterpolatableRobotCloudflareStoreInstructionsWithHiddenFields,
  InterpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsInput,
} from './cloudflare-store.ts'
export type {
  InterpolatableRobotDigitaloceanImportInstructions,
  InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFields,
  InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsInput,
} from './digitalocean-import.ts'
export type {
  InterpolatableRobotDigitaloceanStoreInstructions,
  InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFields,
  InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsInput,
} from './digitalocean-store.ts'
export type {
  InterpolatableRobotDocumentAutorotateInstructions,
  InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFields,
  InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsInput,
} from './document-autorotate.ts'
export type {
  InterpolatableRobotDocumentConvertInstructions,
  InterpolatableRobotDocumentConvertInstructionsWithHiddenFields,
  InterpolatableRobotDocumentConvertInstructionsWithHiddenFieldsInput,
} from './document-convert.ts'
export type {
  InterpolatableRobotDocumentMergeInstructions,
  InterpolatableRobotDocumentMergeInstructionsWithHiddenFields,
  InterpolatableRobotDocumentMergeInstructionsWithHiddenFieldsInput,
} from './document-merge.ts'
export type {
  InterpolatableRobotDocumentOcrInstructions,
  InterpolatableRobotDocumentOcrInstructionsWithHiddenFields,
  InterpolatableRobotDocumentOcrInstructionsWithHiddenFieldsInput,
} from './document-ocr.ts'
export type {
  InterpolatableRobotDocumentSplitInstructions,
  InterpolatableRobotDocumentSplitInstructionsWithHiddenFields,
  InterpolatableRobotDocumentSplitInstructionsWithHiddenFieldsInput,
} from './document-split.ts'
export type {
  InterpolatableRobotDocumentThumbsInstructions,
  InterpolatableRobotDocumentThumbsInstructionsWithHiddenFields,
  InterpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsInput,
} from './document-thumbs.ts'
export type {
  InterpolatableRobotDropboxImportInstructions,
  InterpolatableRobotDropboxImportInstructionsWithHiddenFields,
  InterpolatableRobotDropboxImportInstructionsWithHiddenFieldsInput,
} from './dropbox-import.ts'
export type {
  InterpolatableRobotDropboxStoreInstructions,
  InterpolatableRobotDropboxStoreInstructionsWithHiddenFields,
  InterpolatableRobotDropboxStoreInstructionsWithHiddenFieldsInput,
} from './dropbox-store.ts'
export type {
  InterpolatableRobotEdglyDeliverInstructions,
  InterpolatableRobotEdglyDeliverInstructionsWithHiddenFields,
  InterpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsInput,
} from './edgly-deliver.ts'
export type {
  InterpolatableRobotFileCompressInstructions,
  InterpolatableRobotFileCompressInstructionsWithHiddenFields,
  InterpolatableRobotFileCompressInstructionsWithHiddenFieldsInput,
} from './file-compress.ts'
export type {
  InterpolatableRobotFileDecompressInstructions,
  InterpolatableRobotFileDecompressInstructionsWithHiddenFields,
  InterpolatableRobotFileDecompressInstructionsWithHiddenFieldsInput,
} from './file-decompress.ts'
export type {
  InterpolatableRobotFileFilterInstructions,
  InterpolatableRobotFileFilterInstructionsWithHiddenFields,
  InterpolatableRobotFileFilterInstructionsWithHiddenFieldsInput,
} from './file-filter.ts'
export type {
  InterpolatableRobotFileHashInstructions,
  InterpolatableRobotFileHashInstructionsWithHiddenFields,
  InterpolatableRobotFileHashInstructionsWithHiddenFieldsInput,
} from './file-hash.ts'
export type {
  InterpolatableRobotFilePreviewInstructions,
  InterpolatableRobotFilePreviewInstructionsWithHiddenFields,
  InterpolatableRobotFilePreviewInstructionsWithHiddenFieldsInput,
} from './file-preview.ts'
export type {
  InterpolatableRobotFileReadInstructions,
  InterpolatableRobotFileReadInstructionsWithHiddenFields,
  InterpolatableRobotFileReadInstructionsWithHiddenFieldsInput,
} from './file-read.ts'
export type {
  InterpolatableRobotFileServeInstructions,
  InterpolatableRobotFileServeInstructionsWithHiddenFields,
  InterpolatableRobotFileServeInstructionsWithHiddenFieldsInput,
} from './file-serve.ts'
export type {
  InterpolatableRobotFileVerifyInstructions,
  InterpolatableRobotFileVerifyInstructionsWithHiddenFields,
  InterpolatableRobotFileVerifyInstructionsWithHiddenFieldsInput,
} from './file-verify.ts'
export type {
  InterpolatableRobotFileVirusscanInstructions,
  InterpolatableRobotFileVirusscanInstructionsWithHiddenFields,
  InterpolatableRobotFileVirusscanInstructionsWithHiddenFieldsInput,
} from './file-virusscan.ts'
export type {
  InterpolatableRobotFileWatermarkInstructions,
  InterpolatableRobotFileWatermarkInstructionsWithHiddenFields,
  InterpolatableRobotFileWatermarkInstructionsWithHiddenFieldsInput,
} from './file-watermark.ts'
export type {
  InterpolatableRobotFtpImportInstructions,
  InterpolatableRobotFtpImportInstructionsWithHiddenFields,
  InterpolatableRobotFtpImportInstructionsWithHiddenFieldsInput,
} from './ftp-import.ts'
export type {
  InterpolatableRobotFtpStoreInstructions,
  InterpolatableRobotFtpStoreInstructionsWithHiddenFields,
  InterpolatableRobotFtpStoreInstructionsWithHiddenFieldsInput,
} from './ftp-store.ts'
export type {
  InterpolatableRobotGoogleImportInstructions,
  InterpolatableRobotGoogleImportInstructionsWithHiddenFields,
  InterpolatableRobotGoogleImportInstructionsWithHiddenFieldsInput,
} from './google-import.ts'
export type {
  InterpolatableRobotGoogleStoreInstructions,
  InterpolatableRobotGoogleStoreInstructionsWithHiddenFields,
  InterpolatableRobotGoogleStoreInstructionsWithHiddenFieldsInput,
} from './google-store.ts'
export type {
  InterpolatableRobotHtmlConvertInstructions,
  InterpolatableRobotHtmlConvertInstructionsWithHiddenFields,
  InterpolatableRobotHtmlConvertInstructionsWithHiddenFieldsInput,
} from './html-convert.ts'
export type {
  InterpolatableRobotHttpImportInstructions,
  InterpolatableRobotHttpImportInstructionsWithHiddenFields,
  InterpolatableRobotHttpImportInstructionsWithHiddenFieldsInput,
} from './http-import.ts'
export type {
  InterpolatableRobotImageBgremoveInstructions,
  InterpolatableRobotImageBgremoveInstructionsWithHiddenFields,
  InterpolatableRobotImageBgremoveInstructionsWithHiddenFieldsInput,
} from './image-bgremove.ts'
export type {
  InterpolatableRobotImageDescribeInstructions,
  InterpolatableRobotImageDescribeInstructionsWithHiddenFields,
  InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput,
} from './image-describe.ts'
export type {
  InterpolatableRobotImageFacedetectInstructions,
  InterpolatableRobotImageFacedetectInstructionsWithHiddenFields,
  InterpolatableRobotImageFacedetectInstructionsWithHiddenFieldsInput,
} from './image-facedetect.ts'
export type {
  InterpolatableRobotImageGenerateInstructions,
  InterpolatableRobotImageGenerateInstructionsWithHiddenFields,
  InterpolatableRobotImageGenerateInstructionsWithHiddenFieldsInput,
} from './image-generate.ts'
export type {
  InterpolatableRobotImageMergeInstructions,
  InterpolatableRobotImageMergeInstructionsWithHiddenFields,
  InterpolatableRobotImageMergeInstructionsWithHiddenFieldsInput,
} from './image-merge.ts'
export type {
  InterpolatableRobotImageOcrInstructions,
  InterpolatableRobotImageOcrInstructionsWithHiddenFields,
  InterpolatableRobotImageOcrInstructionsWithHiddenFieldsInput,
} from './image-ocr.ts'
export type {
  InterpolatableRobotImageOptimizeInstructions,
  InterpolatableRobotImageOptimizeInstructionsWithHiddenFields,
  InterpolatableRobotImageOptimizeInstructionsWithHiddenFieldsInput,
} from './image-optimize.ts'
export type {
  InterpolatableRobotImageResizeInstructions,
  InterpolatableRobotImageResizeInstructionsWithHiddenFields,
  InterpolatableRobotImageResizeInstructionsWithHiddenFieldsInput,
} from './image-resize.ts'
export type {
  InterpolatableRobotMetaReadInstructions,
  InterpolatableRobotMetaReadInstructionsWithHiddenFields,
} from './meta-read.ts'
export type {
  InterpolatableRobotMetaWriteInstructions,
  InterpolatableRobotMetaWriteInstructionsWithHiddenFields,
  InterpolatableRobotMetaWriteInstructionsWithHiddenFieldsInput,
} from './meta-write.ts'
export type {
  InterpolatableRobotMinioImportInstructions,
  InterpolatableRobotMinioImportInstructionsWithHiddenFields,
  InterpolatableRobotMinioImportInstructionsWithHiddenFieldsInput,
} from './minio-import.ts'
export type {
  InterpolatableRobotMinioStoreInstructions,
  InterpolatableRobotMinioStoreInstructionsWithHiddenFields,
  InterpolatableRobotMinioStoreInstructionsWithHiddenFieldsInput,
} from './minio-store.ts'
export type { InterpolatableRobotProgressSimulateInstructions } from './progress-simulate.ts'
export type {
  InterpolatableRobotS3ImportInstructions,
  InterpolatableRobotS3ImportInstructionsWithHiddenFields,
  InterpolatableRobotS3ImportInstructionsWithHiddenFieldsInput,
} from './s3-import.ts'
export type {
  InterpolatableRobotS3StoreInstructions,
  InterpolatableRobotS3StoreInstructionsWithHiddenFields,
  InterpolatableRobotS3StoreInstructionsWithHiddenFieldsInput,
} from './s3-store.ts'
export type {
  InterpolatableRobotScriptRunInstructions,
  InterpolatableRobotScriptRunInstructionsWithHiddenFields,
  InterpolatableRobotScriptRunInstructionsWithHiddenFieldsInput,
} from './script-run.ts'
export type {
  InterpolatableRobotSftpImportInstructions,
  InterpolatableRobotSftpImportInstructionsWithHiddenFields,
  InterpolatableRobotSftpImportInstructionsWithHiddenFieldsInput,
} from './sftp-import.ts'
export type {
  InterpolatableRobotSftpStoreInstructions,
  InterpolatableRobotSftpStoreInstructionsWithHiddenFields,
  InterpolatableRobotSftpStoreInstructionsWithHiddenFieldsInput,
} from './sftp-store.ts'
export type {
  InterpolatableRobotSpeechTranscribeInstructions,
  InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFields,
  InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsInput,
} from './speech-transcribe.ts'
export type {
  InterpolatableRobotSupabaseImportInstructions,
  InterpolatableRobotSupabaseImportInstructionsWithHiddenFields,
  InterpolatableRobotSupabaseImportInstructionsWithHiddenFieldsInput,
} from './supabase-import.ts'
export type {
  InterpolatableRobotSupabaseStoreInstructions,
  InterpolatableRobotSupabaseStoreInstructionsWithHiddenFields,
  InterpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsInput,
} from './supabase-store.ts'
export type {
  InterpolatableRobotSwiftImportInstructions,
  InterpolatableRobotSwiftImportInstructionsWithHiddenFields,
  InterpolatableRobotSwiftImportInstructionsWithHiddenFieldsInput,
} from './swift-import.ts'
export type {
  InterpolatableRobotSwiftStoreInstructions,
  InterpolatableRobotSwiftStoreInstructionsWithHiddenFields,
  InterpolatableRobotSwiftStoreInstructionsWithHiddenFieldsInput,
} from './swift-store.ts'
export type {
  InterpolatableRobotTextSpeakInstructions,
  InterpolatableRobotTextSpeakInstructionsWithHiddenFields,
  InterpolatableRobotTextSpeakInstructionsWithHiddenFieldsInput,
} from './text-speak.ts'
export type {
  InterpolatableRobotTextTranslateInstructions,
  InterpolatableRobotTextTranslateInstructionsWithHiddenFields,
  InterpolatableRobotTextTranslateInstructionsWithHiddenFieldsInput,
} from './text-translate.ts'
export type {
  InterpolatableRobotTigrisImportInstructions,
  InterpolatableRobotTigrisImportInstructionsWithHiddenFields,
  InterpolatableRobotTigrisImportInstructionsWithHiddenFieldsInput,
} from './tigris-import.ts'
export type {
  InterpolatableRobotTigrisStoreInstructions,
  InterpolatableRobotTigrisStoreInstructionsWithHiddenFields,
  InterpolatableRobotTigrisStoreInstructionsWithHiddenFieldsInput,
} from './tigris-store.ts'
export type {
  InterpolatableRobotTlcdnDeliverInstructions,
  InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFields,
  InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsInput,
} from './tlcdn-deliver.ts'
export type {
  InterpolatableRobotTusStoreInstructions,
  InterpolatableRobotTusStoreInstructionsWithHiddenFields,
  InterpolatableRobotTusStoreInstructionsWithHiddenFieldsInput,
} from './tus-store.ts'
export type {
  InterpolatableRobotUploadHandleInstructions,
  InterpolatableRobotUploadHandleInstructionsWithHiddenFields,
  InterpolatableRobotUploadHandleInstructionsWithHiddenFieldsInput,
} from './upload-handle.ts'
export type {
  InterpolatableRobotVideoAdaptiveInstructions,
  InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFields,
  InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsInput,
} from './video-adaptive.ts'
export type {
  InterpolatableRobotVideoConcatInstructions,
  InterpolatableRobotVideoConcatInstructionsWithHiddenFields,
  InterpolatableRobotVideoConcatInstructionsWithHiddenFieldsInput,
} from './video-concat.ts'
export type {
  InterpolatableRobotVideoEncodeInstructions,
  InterpolatableRobotVideoEncodeInstructionsWithHiddenFields,
  InterpolatableRobotVideoEncodeInstructionsWithHiddenFieldsInput,
} from './video-encode.ts'
export type {
  InterpolatableRobotVideoMergeInstructions,
  InterpolatableRobotVideoMergeInstructionsWithHiddenFields,
  InterpolatableRobotVideoMergeInstructionsWithHiddenFieldsInput,
} from './video-merge.ts'
export type {
  InterpolatableRobotVideoOndemandInstructions,
  InterpolatableRobotVideoOndemandInstructionsWithHiddenFields,
  InterpolatableRobotVideoOndemandInstructionsWithHiddenFieldsInput,
} from './video-ondemand.ts'
export type {
  InterpolatableRobotVideoSubtitleInstructions,
  InterpolatableRobotVideoSubtitleInstructionsWithHiddenFields,
  InterpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsInput,
} from './video-subtitle.ts'
export type {
  InterpolatableRobotVideoThumbsInstructions,
  InterpolatableRobotVideoThumbsInstructionsWithHiddenFields,
  InterpolatableRobotVideoThumbsInstructionsWithHiddenFieldsInput,
} from './video-thumbs.ts'
export type {
  InterpolatableRobotVimeoImportInstructions,
  InterpolatableRobotVimeoImportInstructionsWithHiddenFields,
  InterpolatableRobotVimeoImportInstructionsWithHiddenFieldsInput,
} from './vimeo-import.ts'
export type {
  InterpolatableRobotVimeoStoreInstructions,
  InterpolatableRobotVimeoStoreInstructionsWithHiddenFields,
  InterpolatableRobotVimeoStoreInstructionsWithHiddenFieldsInput,
} from './vimeo-store.ts'
export type {
  InterpolatableRobotWasabiImportInstructions,
  InterpolatableRobotWasabiImportInstructionsWithHiddenFields,
  InterpolatableRobotWasabiImportInstructionsWithHiddenFieldsInput,
} from './wasabi-import.ts'
export type {
  InterpolatableRobotWasabiStoreInstructions,
  InterpolatableRobotWasabiStoreInstructionsWithHiddenFields,
  InterpolatableRobotWasabiStoreInstructionsWithHiddenFieldsInput,
} from './wasabi-store.ts'
export type {
  InterpolatableRobotYoutubeStoreInstructions,
  InterpolatableRobotYoutubeStoreInstructionsWithHiddenFields,
  InterpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsInput,
} from './youtube-store.ts'
