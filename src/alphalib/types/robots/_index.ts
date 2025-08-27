import { z } from 'zod'

import {
  interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema,
  meta as audioArtworkMeta,
} from './audio-artwork.ts'
import {
  interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema,
  meta as audioConcatMeta,
} from './audio-concat.ts'
import {
  interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema,
  meta as audioEncodeMeta,
} from './audio-encode.ts'
import {
  interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema,
  meta as audioLoopMeta,
} from './audio-loop.ts'
import {
  interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema,
  meta as audioMergeMeta,
} from './audio-merge.ts'
import {
  interpolatableRobotAudioWaveformInstructionsSchema,
  interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema,
  meta as audioWaveformMeta,
} from './audio-waveform.ts'
import {
  interpolatableRobotAzureImportInstructionsSchema,
  interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema,
  meta as azureImportMeta,
} from './azure-import.ts'
import {
  interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema,
  meta as azureStoreMeta,
} from './azure-store.ts'
import {
  interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema,
  meta as backblazeImportMeta,
} from './backblaze-import.ts'
import {
  interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema,
  meta as backblazeStoreMeta,
} from './backblaze-store.ts'
import {
  interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsSchema,
  meta as cloudfilesImportMeta,
} from './cloudfiles-import.ts'
import {
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
  meta as cloudfilesStoreMeta,
} from './cloudfiles-store.ts'
import {
  interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableRobotCloudflareImportInstructionsWithHiddenFieldsSchema,
  meta as cloudflareImportMeta,
} from './cloudflare-import.ts'
import {
  interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsSchema,
  meta as cloudflareStoreMeta,
} from './cloudflare-store.ts'
import {
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
  meta as digitaloceanImportMeta,
} from './digitalocean-import.ts'
import {
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
  meta as digitaloceanStoreMeta,
} from './digitalocean-store.ts'
import {
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
  meta as documentAutorotateMeta,
} from './document-autorotate.ts'
import {
  interpolatableRobotDocumentConvertInstructionsSchema,
  interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema,
  meta as documentConvertMeta,
} from './document-convert.ts'
import {
  interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema,
  meta as documentMergeMeta,
} from './document-merge.ts'
import {
  interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema,
  meta as documentOcrMeta,
} from './document-ocr.ts'
import {
  interpolatableRobotDocumentSplitInstructionsSchema,
  interpolatableRobotDocumentSplitInstructionsWithHiddenFieldsSchema,
  meta as documentSplitMeta,
} from './document-split.ts'
import {
  interpolatableRobotDocumentThumbsInstructionsSchema,
  interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema,
  meta as documentThumbsMeta,
} from './document-thumbs.ts'
import {
  interpolatableRobotDropboxImportInstructionsSchema,
  interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema,
  meta as dropboxImportMeta,
} from './dropbox-import.ts'
import {
  interpolatableRobotDropboxStoreInstructionsSchema,
  interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema,
  meta as dropboxStoreMeta,
} from './dropbox-store.ts'
import {
  interpolatableRobotEdglyDeliverInstructionsSchema,
  interpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsSchema,
  meta as edglyDeliverMeta,
} from './edgly-deliver.ts'
import {
  interpolatableRobotFileCompressInstructionsSchema,
  interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema,
  meta as fileCompressMeta,
} from './file-compress.ts'
import {
  interpolatableRobotFileDecompressInstructionsSchema,
  interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema,
  meta as fileDecompressMeta,
} from './file-decompress.ts'
import {
  interpolatableRobotFileFilterInstructionsSchema,
  interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema,
  meta as fileFilterMeta,
} from './file-filter.ts'
import {
  interpolatableRobotFileHashInstructionsSchema,
  interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema,
  meta as fileHashMeta,
} from './file-hash.ts'
import {
  interpolatableRobotFilePreviewInstructionsSchema,
  interpolatableRobotFilePreviewInstructionsWithHiddenFieldsSchema,
  meta as filePreviewMeta,
} from './file-preview.ts'
import {
  interpolatableRobotFileReadInstructionsSchema,
  interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema,
  meta as fileReadMeta,
} from './file-read.ts'
import {
  interpolatableRobotFileServeInstructionsSchema,
  interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema,
  meta as fileServeMeta,
} from './file-serve.ts'
import {
  interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema,
  meta as fileVerifyMeta,
} from './file-verify.ts'
import {
  interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema,
  meta as fileVirusscanMeta,
} from './file-virusscan.ts'
import {
  interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema,
} from './file-watermark.ts'
import {
  interpolatableRobotFtpImportInstructionsSchema,
  interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema,
  meta as ftpImportMeta,
} from './ftp-import.ts'
import {
  interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema,
  meta as ftpStoreMeta,
} from './ftp-store.ts'
import {
  interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema,
  meta as googleImportMeta,
} from './google-import.ts'
import {
  interpolatableRobotGoogleStoreInstructionsSchema,
  interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema,
  meta as googleStoreMeta,
} from './google-store.ts'
import {
  interpolatableRobotHtmlConvertInstructionsSchema,
  interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema,
  meta as htmlConvertMeta,
} from './html-convert.ts'
import {
  interpolatableRobotHttpImportInstructionsSchema,
  interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema,
  meta as httpImportMeta,
} from './http-import.ts'
import {
  interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
  meta as imageBgremoveMeta,
} from './image-bgremove.ts'
import {
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema,
  meta as imageDescribeMeta,
} from './image-describe.ts'
import {
  interpolatableRobotImageFacedetectInstructionsSchema,
  interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema,
  meta as imageFacedetectMeta,
} from './image-facedetect.ts'
import {
  interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema,
  meta as imageGenerateMeta,
} from './image-generate.ts'
import {
  interpolatableRobotImageMergeInstructionsSchema,
  interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema,
  meta as imageMergeMeta,
} from './image-merge.ts'
import {
  interpolatableRobotImageOcrInstructionsSchema,
  interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema,
  meta as imageOcrMeta,
} from './image-ocr.ts'
import {
  interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema,
  meta as imageOptimizeMeta,
} from './image-optimize.ts'
import {
  interpolatableRobotImageResizeInstructionsSchema,
  interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema,
  meta as imageResizeMeta,
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
