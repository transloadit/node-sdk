import { z } from 'zod'

type RobotSchemaOption = z.ZodObject<{ robot: z.ZodTypeAny } & z.ZodRawShape>
type RobotSchemaOptions = [RobotSchemaOption, ...RobotSchemaOption[]]
import {
  interpolatableRobotAiChatInstructionsSchema,
  interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema,
  meta as aiChatMeta,
} from './ai-chat.ts'
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
  interpolatableRobotAudioSplitInstructionsSchema,
  interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema,
  meta as audioSplitMeta,
} from './audio-split.ts'
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
  interpolatableRobotBoxImportInstructionsSchema,
  interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema,
  meta as boxImportMeta,
} from './box-import.ts'
import {
  interpolatableRobotBoxStoreInstructionsSchema,
  interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema,
  meta as boxStoreMeta,
} from './box-store.ts'
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
  interpolatableRobotDocumentExtractInstructionsSchema,
  interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema,
  meta as documentExtractMeta,
} from './document-extract.ts'
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
  interpolatableRobotDocumentOptimizeInstructionsSchema,
  interpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsSchema,
  meta as documentOptimizeMeta,
} from './document-optimize.ts'
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
  interpolatableRobotHttpRequestInstructionsSchema,
  interpolatableRobotHttpRequestInstructionsWithHiddenFieldsSchema,
  meta as httpRequestMeta,
} from './http-request.ts'
import {
  interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
  meta as imageBgremoveMeta,
} from './image-bgremove.ts'
import {
  interpolatableRobotImageCopyrightdetectInstructionsSchema,
  interpolatableRobotImageCopyrightdetectInstructionsWithHiddenFieldsSchema,
  meta as imageCopyrightdetectMeta,
} from './image-copyrightdetect.ts'
import {
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema,
  meta as imageDescribeMeta,
} from './image-describe.ts'
import {
  interpolatableRobotImageEnhanceInstructionsSchema,
  interpolatableRobotImageEnhanceInstructionsWithHiddenFieldsSchema,
  meta as imageEnhanceMeta,
} from './image-enhance.ts'
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
  interpolatableRobotImageUpscaleInstructionsSchema,
  interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema,
  meta as imageUpscaleMeta,
} from './image-upscale.ts'
import {
  interpolatableRobotMegaImportInstructionsSchema,
  interpolatableRobotMegaImportInstructionsWithHiddenFieldsSchema,
  meta as megaImportMeta,
} from './mega-import.ts'
import {
  interpolatableRobotMegaStoreInstructionsSchema,
  interpolatableRobotMegaStoreInstructionsWithHiddenFieldsSchema,
  meta as megaStoreMeta,
} from './mega-store.ts'
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
import {
  interpolatableRobotProgressSimulateInstructionsSchema,
} from './progress-simulate.ts'
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
  meta as tigrisImportMeta,
} from './tigris-import.ts'
import {
  interpolatableRobotTigrisStoreInstructionsSchema,
  interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema,
  meta as tigrisStoreMeta,
} from './tigris-store.ts'
import {
  interpolatableRobotTlcdnDeliverInstructionsSchema,
  interpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsSchema,
  meta as tlcdnDeliverMeta,
} from './tlcdn-deliver.ts'
import {
  interpolatableRobotTransloaditImportInstructionsSchema,
  interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema,
  meta as transloaditImportMeta,
} from './transloadit-import.ts'
import {
  interpolatableRobotTransloaditStoreInstructionsSchema,
  interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema,
  meta as transloaditStoreMeta,
} from './transloadit-store.ts'
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
  interpolatableRobotVideoArtworkInstructionsSchema,
  interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema,
  meta as videoArtworkMeta,
} from './video-artwork.ts'
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
  interpolatableRobotVideoGenerateInstructionsSchema,
  interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema,
  meta as videoGenerateMeta,
} from './video-generate.ts'
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
  interpolatableRobotVideoSplitInstructionsSchema,
  interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema,
  meta as videoSplitMeta,
} from './video-split.ts'
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

const robotStepsInstructions: RobotSchemaOptions = [
  interpolatableRobotAiChatInstructionsSchema,
  interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableRobotAudioSplitInstructionsSchema,
  interpolatableRobotAudioWaveformInstructionsSchema,
  interpolatableRobotAzureImportInstructionsSchema,
  interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableRobotBoxImportInstructionsSchema,
  interpolatableRobotBoxStoreInstructionsSchema,
  interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableRobotDocumentConvertInstructionsSchema,
  interpolatableRobotDocumentExtractInstructionsSchema,
  interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableRobotDocumentOptimizeInstructionsSchema,
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
  interpolatableRobotFileReadInstructionsSchema,
  interpolatableRobotFileServeInstructionsSchema,
  interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableRobotFtpImportInstructionsSchema,
  interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableRobotGoogleStoreInstructionsSchema,
  interpolatableRobotHtmlConvertInstructionsSchema,
  interpolatableRobotHttpImportInstructionsSchema,
  interpolatableRobotHttpRequestInstructionsSchema,
  interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableRobotImageCopyrightdetectInstructionsSchema,
  interpolatableRobotImageDescribeInstructionsSchema,
  interpolatableRobotImageEnhanceInstructionsSchema,
  interpolatableRobotImageFacedetectInstructionsSchema,
  interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableRobotImageMergeInstructionsSchema,
  interpolatableRobotImageOcrInstructionsSchema,
  interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableRobotImageResizeInstructionsSchema,
  interpolatableRobotImageUpscaleInstructionsSchema,
  interpolatableRobotMegaImportInstructionsSchema,
  interpolatableRobotMegaStoreInstructionsSchema,
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
  interpolatableRobotTransloaditImportInstructionsSchema,
  interpolatableRobotTransloaditStoreInstructionsSchema,
  interpolatableRobotTusStoreInstructionsSchema,
  interpolatableRobotUploadHandleInstructionsSchema,
  interpolatableRobotVideoAdaptiveInstructionsSchema,
  interpolatableRobotVideoArtworkInstructionsSchema,
  interpolatableRobotVideoConcatInstructionsSchema,
  interpolatableRobotVideoEncodeInstructionsSchema,
  interpolatableRobotVideoGenerateInstructionsSchema,
  interpolatableRobotVideoMergeInstructionsSchema,
  interpolatableRobotVideoOndemandInstructionsSchema,
  interpolatableRobotVideoSplitInstructionsSchema,
  interpolatableRobotVideoSubtitleInstructionsSchema,
  interpolatableRobotVideoThumbsInstructionsSchema,
  interpolatableRobotVimeoImportInstructionsSchema,
  interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableRobotYoutubeStoreInstructionsSchema,
]

const robotStepsInstructionsWithHiddenFields: RobotSchemaOptions = [
  interpolatableRobotAiChatInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudflareImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentConvertInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema,
  interpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsSchema,
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
  interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileServeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotHtmlConvertInstructionsWithHiddenFieldsSchema,
  interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotHttpRequestInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageCopyrightdetectInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageDescribeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageEnhanceInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageFacedetectInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema,
  interpolatableRobotMegaImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotMegaStoreInstructionsWithHiddenFieldsSchema,
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
  interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoOndemandInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotWasabiImportInstructionsWithHiddenFieldsSchema,
  interpolatableRobotWasabiStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema,
  interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema,
]

const robotsWithHiddenBotOptions: RobotSchemaOptions = [
  ...robotStepsInstructions,
  interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableRobotMetaReadInstructionsSchema,
  interpolatableRobotProgressSimulateInstructionsSchema,
]
const robotsWithHiddenBotAndFieldOptions: RobotSchemaOptions = [
  ...robotStepsInstructionsWithHiddenFields,
  interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema,
  interpolatableRobotProgressSimulateInstructionsSchema,
]

const robotsSchemaInternal = z.discriminatedUnion('robot', robotStepsInstructions)
const robotsWithHiddenFieldsSchemaInternal = z.discriminatedUnion(
  'robot',
  robotStepsInstructionsWithHiddenFields,
)
const robotsWithHiddenBotsSchemaInternal = z.discriminatedUnion(
  'robot',
  robotsWithHiddenBotOptions,
)
const robotsWithHiddenBotsAndFieldsSchemaInternal = z.discriminatedUnion(
  'robot',
  robotsWithHiddenBotAndFieldOptions,
)

export interface PublicRobotInstructions {
  robot: string
  [key: string]: any
}

export interface PublicRobotInstructionsWithHiddenFields extends PublicRobotInstructions {}

export interface HiddenRobotInstructions extends PublicRobotInstructions {}

export interface HiddenRobotInstructionsWithFields extends PublicRobotInstructionsWithHiddenFields {}

/**
 * Public robot instructions
 */
export type RobotsSchema = PublicRobotInstructions
export const robotsSchema: z.ZodType<PublicRobotInstructions> =
  robotsSchemaInternal as unknown as z.ZodType<PublicRobotInstructions>
export const robotsWithHiddenFieldsSchema: z.ZodType<PublicRobotInstructionsWithHiddenFields> =
  robotsWithHiddenFieldsSchemaInternal as unknown as z.ZodType<PublicRobotInstructionsWithHiddenFields>

/**
 * All robot instructions, including private ones.
 */
export const robotsWithHiddenBotsSchema: z.ZodType<HiddenRobotInstructions> =
  robotsWithHiddenBotsSchemaInternal as unknown as z.ZodType<HiddenRobotInstructions>
export const robotsWithHiddenBotsAndFieldsSchema: z.ZodType<HiddenRobotInstructionsWithFields> =
  robotsWithHiddenBotsAndFieldsSchemaInternal as unknown as z.ZodType<HiddenRobotInstructionsWithFields>

export type RobotsWithHiddenBots = HiddenRobotInstructions
export type RobotsWithHiddenBotsAndFields = HiddenRobotInstructionsWithFields

export function getRobotSchemaOptions(): readonly RobotSchemaOption[] {
  return [...robotStepsInstructions]
}

export const robotsMeta = {
  aiChatMeta,
  audioArtworkMeta,
  audioConcatMeta,
  audioEncodeMeta,
  audioLoopMeta,
  audioMergeMeta,
  audioSplitMeta,
  audioWaveformMeta,
  azureImportMeta,
  azureStoreMeta,
  backblazeImportMeta,
  backblazeStoreMeta,
  boxImportMeta,
  boxStoreMeta,
  cloudfilesImportMeta,
  cloudfilesStoreMeta,
  cloudflareImportMeta,
  cloudflareStoreMeta,
  digitaloceanImportMeta,
  digitaloceanStoreMeta,
  documentAutorotateMeta,
  documentConvertMeta,
  documentExtractMeta,
  documentMergeMeta,
  documentOcrMeta,
  documentOptimizeMeta,
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
  httpRequestMeta,
  imageBgremoveMeta,
  imageCopyrightdetectMeta,
  imageDescribeMeta,
  imageEnhanceMeta,
  imageFacedetectMeta,
  imageGenerateMeta,
  imageMergeMeta,
  imageOcrMeta,
  imageOptimizeMeta,
  imageResizeMeta,
  imageUpscaleMeta,
  megaImportMeta,
  megaStoreMeta,
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
  tigrisImportMeta,
  tigrisStoreMeta,
  tlcdnDeliverMeta,
  transloaditImportMeta,
  transloaditStoreMeta,
  tusStoreMeta,
  uploadHandleMeta,
  videoAdaptiveMeta,
  videoArtworkMeta,
  videoConcatMeta,
  videoEncodeMeta,
  videoGenerateMeta,
  videoMergeMeta,
  videoOndemandMeta,
  videoSplitMeta,
  videoSubtitleMeta,
  videoThumbsMeta,
  vimeoImportMeta,
  vimeoStoreMeta,
  wasabiImportMeta,
  wasabiStoreMeta,
  youtubeStoreMeta,
}

export type {
  InterpolatableRobotAiChatInstructions,
  InterpolatableRobotAiChatInstructionsInput,
  InterpolatableRobotAiChatInstructionsWithHiddenFields,
  InterpolatableRobotAiChatInstructionsWithHiddenFieldsInput,
} from './ai-chat.ts'
export type {
  InterpolatableRobotAssemblySavejsonInstructions,
  InterpolatableRobotAssemblySavejsonInstructionsInput,
  InterpolatableRobotAssemblySavejsonInstructionsWithHiddenFields,
  InterpolatableRobotAssemblySavejsonInstructionsWithHiddenFieldsInput,
} from './assembly-savejson.ts'
export type {
  InterpolatableRobotAudioArtworkInstructions,
  InterpolatableRobotAudioArtworkInstructionsInput,
  InterpolatableRobotAudioArtworkInstructionsWithHiddenFields,
  InterpolatableRobotAudioArtworkInstructionsWithHiddenFieldsInput,
} from './audio-artwork.ts'
export type {
  InterpolatableRobotAudioConcatInstructions,
  InterpolatableRobotAudioConcatInstructionsInput,
  InterpolatableRobotAudioConcatInstructionsWithHiddenFields,
  InterpolatableRobotAudioConcatInstructionsWithHiddenFieldsInput,
} from './audio-concat.ts'
export type {
  InterpolatableRobotAudioEncodeInstructions,
  InterpolatableRobotAudioEncodeInstructionsInput,
  InterpolatableRobotAudioEncodeInstructionsWithHiddenFields,
  InterpolatableRobotAudioEncodeInstructionsWithHiddenFieldsInput,
} from './audio-encode.ts'
export type {
  InterpolatableRobotAudioLoopInstructions,
  InterpolatableRobotAudioLoopInstructionsInput,
  InterpolatableRobotAudioLoopInstructionsWithHiddenFields,
  InterpolatableRobotAudioLoopInstructionsWithHiddenFieldsInput,
} from './audio-loop.ts'
export type {
  InterpolatableRobotAudioMergeInstructions,
  InterpolatableRobotAudioMergeInstructionsInput,
  InterpolatableRobotAudioMergeInstructionsWithHiddenFields,
  InterpolatableRobotAudioMergeInstructionsWithHiddenFieldsInput,
} from './audio-merge.ts'
export type {
  InterpolatableRobotAudioSplitInstructions,
  InterpolatableRobotAudioSplitInstructionsInput,
  InterpolatableRobotAudioSplitInstructionsWithHiddenFields,
  InterpolatableRobotAudioSplitInstructionsWithHiddenFieldsInput,
} from './audio-split.ts'
export type {
  InterpolatableRobotAudioWaveformInstructions,
  InterpolatableRobotAudioWaveformInstructionsInput,
  InterpolatableRobotAudioWaveformInstructionsWithHiddenFields,
  InterpolatableRobotAudioWaveformInstructionsWithHiddenFieldsInput,
} from './audio-waveform.ts'
export type {
  InterpolatableRobotAzureImportInstructions,
  InterpolatableRobotAzureImportInstructionsInput,
  InterpolatableRobotAzureImportInstructionsWithHiddenFields,
  InterpolatableRobotAzureImportInstructionsWithHiddenFieldsInput,
} from './azure-import.ts'
export type {
  InterpolatableRobotAzureStoreInstructions,
  InterpolatableRobotAzureStoreInstructionsInput,
  InterpolatableRobotAzureStoreInstructionsWithHiddenFields,
  InterpolatableRobotAzureStoreInstructionsWithHiddenFieldsInput,
} from './azure-store.ts'
export type {
  InterpolatableRobotBackblazeImportInstructions,
  InterpolatableRobotBackblazeImportInstructionsInput,
  InterpolatableRobotBackblazeImportInstructionsWithHiddenFields,
  InterpolatableRobotBackblazeImportInstructionsWithHiddenFieldsInput,
} from './backblaze-import.ts'
export type {
  InterpolatableRobotBackblazeStoreInstructions,
  InterpolatableRobotBackblazeStoreInstructionsInput,
  InterpolatableRobotBackblazeStoreInstructionsWithHiddenFields,
  InterpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsInput,
} from './backblaze-store.ts'
export type {
  InterpolatableRobotBoxImportInstructions,
  InterpolatableRobotBoxImportInstructionsInput,
  InterpolatableRobotBoxImportInstructionsWithHiddenFields,
  InterpolatableRobotBoxImportInstructionsWithHiddenFieldsInput,
} from './box-import.ts'
export type {
  InterpolatableRobotBoxStoreInstructions,
  InterpolatableRobotBoxStoreInstructionsInput,
  InterpolatableRobotBoxStoreInstructionsWithHiddenFields,
  InterpolatableRobotBoxStoreInstructionsWithHiddenFieldsInput,
} from './box-store.ts'
export type {
  InterpolatableRobotCloudfilesImportInstructions,
  InterpolatableRobotCloudfilesImportInstructionsInput,
  InterpolatableRobotCloudfilesImportInstructionsWithHiddenFields,
  InterpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsInput,
} from './cloudfiles-import.ts'
export type {
  InterpolatableRobotCloudfilesStoreInstructions,
  InterpolatableRobotCloudfilesStoreInstructionsInput,
  InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFields,
  InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsInput,
} from './cloudfiles-store.ts'
export type {
  InterpolatableRobotCloudflareImportInstructions,
  InterpolatableRobotCloudflareImportInstructionsInput,
  InterpolatableRobotCloudflareImportInstructionsWithHiddenFields,
  InterpolatableRobotCloudflareImportInstructionsWithHiddenFieldsInput,
} from './cloudflare-import.ts'
export type {
  InterpolatableRobotCloudflareStoreInstructions,
  InterpolatableRobotCloudflareStoreInstructionsInput,
  InterpolatableRobotCloudflareStoreInstructionsWithHiddenFields,
  InterpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsInput,
} from './cloudflare-store.ts'
export type {
  InterpolatableRobotDigitaloceanImportInstructions,
  InterpolatableRobotDigitaloceanImportInstructionsInput,
  InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFields,
  InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsInput,
} from './digitalocean-import.ts'
export type {
  InterpolatableRobotDigitaloceanStoreInstructions,
  InterpolatableRobotDigitaloceanStoreInstructionsInput,
  InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFields,
  InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsInput,
} from './digitalocean-store.ts'
export type {
  InterpolatableRobotDocumentAutorotateInstructions,
  InterpolatableRobotDocumentAutorotateInstructionsInput,
  InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFields,
  InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsInput,
} from './document-autorotate.ts'
export type {
  InterpolatableRobotDocumentConvertInstructions,
  InterpolatableRobotDocumentConvertInstructionsInput,
  InterpolatableRobotDocumentConvertInstructionsWithHiddenFields,
  InterpolatableRobotDocumentConvertInstructionsWithHiddenFieldsInput,
} from './document-convert.ts'
export type {
  InterpolatableRobotDocumentExtractInstructions,
  InterpolatableRobotDocumentExtractInstructionsInput,
  InterpolatableRobotDocumentExtractInstructionsWithHiddenFields,
  InterpolatableRobotDocumentExtractInstructionsWithHiddenFieldsInput,
} from './document-extract.ts'
export type {
  InterpolatableRobotDocumentMergeInstructions,
  InterpolatableRobotDocumentMergeInstructionsInput,
  InterpolatableRobotDocumentMergeInstructionsWithHiddenFields,
  InterpolatableRobotDocumentMergeInstructionsWithHiddenFieldsInput,
} from './document-merge.ts'
export type {
  InterpolatableRobotDocumentOcrInstructions,
  InterpolatableRobotDocumentOcrInstructionsInput,
  InterpolatableRobotDocumentOcrInstructionsWithHiddenFields,
  InterpolatableRobotDocumentOcrInstructionsWithHiddenFieldsInput,
} from './document-ocr.ts'
export type {
  InterpolatableRobotDocumentOptimizeInstructions,
  InterpolatableRobotDocumentOptimizeInstructionsInput,
  InterpolatableRobotDocumentOptimizeInstructionsWithHiddenFields,
  InterpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsInput,
} from './document-optimize.ts'
export type {
  InterpolatableRobotDocumentSplitInstructions,
  InterpolatableRobotDocumentSplitInstructionsInput,
  InterpolatableRobotDocumentSplitInstructionsWithHiddenFields,
  InterpolatableRobotDocumentSplitInstructionsWithHiddenFieldsInput,
} from './document-split.ts'
export type {
  InterpolatableRobotDocumentThumbsInstructions,
  InterpolatableRobotDocumentThumbsInstructionsInput,
  InterpolatableRobotDocumentThumbsInstructionsWithHiddenFields,
  InterpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsInput,
} from './document-thumbs.ts'
export type {
  InterpolatableRobotDropboxImportInstructions,
  InterpolatableRobotDropboxImportInstructionsInput,
  InterpolatableRobotDropboxImportInstructionsWithHiddenFields,
  InterpolatableRobotDropboxImportInstructionsWithHiddenFieldsInput,
} from './dropbox-import.ts'
export type {
  InterpolatableRobotDropboxStoreInstructions,
  InterpolatableRobotDropboxStoreInstructionsInput,
  InterpolatableRobotDropboxStoreInstructionsWithHiddenFields,
  InterpolatableRobotDropboxStoreInstructionsWithHiddenFieldsInput,
} from './dropbox-store.ts'
export type {
  InterpolatableRobotEdglyDeliverInstructions,
  InterpolatableRobotEdglyDeliverInstructionsInput,
  InterpolatableRobotEdglyDeliverInstructionsWithHiddenFields,
  InterpolatableRobotEdglyDeliverInstructionsWithHiddenFieldsInput,
} from './edgly-deliver.ts'
export type {
  InterpolatableRobotFileCompressInstructions,
  InterpolatableRobotFileCompressInstructionsInput,
  InterpolatableRobotFileCompressInstructionsWithHiddenFields,
  InterpolatableRobotFileCompressInstructionsWithHiddenFieldsInput,
} from './file-compress.ts'
export type {
  InterpolatableRobotFileDecompressInstructions,
  InterpolatableRobotFileDecompressInstructionsInput,
  InterpolatableRobotFileDecompressInstructionsWithHiddenFields,
  InterpolatableRobotFileDecompressInstructionsWithHiddenFieldsInput,
} from './file-decompress.ts'
export type {
  InterpolatableRobotFileFilterInstructions,
  InterpolatableRobotFileFilterInstructionsInput,
  InterpolatableRobotFileFilterInstructionsWithHiddenFields,
  InterpolatableRobotFileFilterInstructionsWithHiddenFieldsInput,
} from './file-filter.ts'
export type {
  InterpolatableRobotFileHashInstructions,
  InterpolatableRobotFileHashInstructionsInput,
  InterpolatableRobotFileHashInstructionsWithHiddenFields,
  InterpolatableRobotFileHashInstructionsWithHiddenFieldsInput,
} from './file-hash.ts'
export type {
  InterpolatableRobotFilePreviewInstructions,
  InterpolatableRobotFilePreviewInstructionsInput,
  InterpolatableRobotFilePreviewInstructionsWithHiddenFields,
  InterpolatableRobotFilePreviewInstructionsWithHiddenFieldsInput,
} from './file-preview.ts'
export type {
  InterpolatableRobotFileReadInstructions,
  InterpolatableRobotFileReadInstructionsInput,
  InterpolatableRobotFileReadInstructionsWithHiddenFields,
  InterpolatableRobotFileReadInstructionsWithHiddenFieldsInput,
} from './file-read.ts'
export type {
  InterpolatableRobotFileServeInstructions,
  InterpolatableRobotFileServeInstructionsInput,
  InterpolatableRobotFileServeInstructionsWithHiddenFields,
  InterpolatableRobotFileServeInstructionsWithHiddenFieldsInput,
} from './file-serve.ts'
export type {
  InterpolatableRobotFileVerifyInstructions,
  InterpolatableRobotFileVerifyInstructionsInput,
  InterpolatableRobotFileVerifyInstructionsWithHiddenFields,
  InterpolatableRobotFileVerifyInstructionsWithHiddenFieldsInput,
} from './file-verify.ts'
export type {
  InterpolatableRobotFileVirusscanInstructions,
  InterpolatableRobotFileVirusscanInstructionsInput,
  InterpolatableRobotFileVirusscanInstructionsWithHiddenFields,
  InterpolatableRobotFileVirusscanInstructionsWithHiddenFieldsInput,
} from './file-virusscan.ts'
export type {
  InterpolatableRobotFileWatermarkInstructions,
  InterpolatableRobotFileWatermarkInstructionsInput,
  InterpolatableRobotFileWatermarkInstructionsWithHiddenFields,
  InterpolatableRobotFileWatermarkInstructionsWithHiddenFieldsInput,
} from './file-watermark.ts'
export type {
  InterpolatableRobotFtpImportInstructions,
  InterpolatableRobotFtpImportInstructionsInput,
  InterpolatableRobotFtpImportInstructionsWithHiddenFields,
  InterpolatableRobotFtpImportInstructionsWithHiddenFieldsInput,
} from './ftp-import.ts'
export type {
  InterpolatableRobotFtpStoreInstructions,
  InterpolatableRobotFtpStoreInstructionsInput,
  InterpolatableRobotFtpStoreInstructionsWithHiddenFields,
  InterpolatableRobotFtpStoreInstructionsWithHiddenFieldsInput,
} from './ftp-store.ts'
export type {
  InterpolatableRobotGoogleImportInstructions,
  InterpolatableRobotGoogleImportInstructionsInput,
  InterpolatableRobotGoogleImportInstructionsWithHiddenFields,
  InterpolatableRobotGoogleImportInstructionsWithHiddenFieldsInput,
} from './google-import.ts'
export type {
  InterpolatableRobotGoogleStoreInstructions,
  InterpolatableRobotGoogleStoreInstructionsInput,
  InterpolatableRobotGoogleStoreInstructionsWithHiddenFields,
  InterpolatableRobotGoogleStoreInstructionsWithHiddenFieldsInput,
} from './google-store.ts'
export type {
  InterpolatableRobotHtmlConvertInstructions,
  InterpolatableRobotHtmlConvertInstructionsInput,
  InterpolatableRobotHtmlConvertInstructionsWithHiddenFields,
  InterpolatableRobotHtmlConvertInstructionsWithHiddenFieldsInput,
} from './html-convert.ts'
export type {
  InterpolatableRobotHttpImportInstructions,
  InterpolatableRobotHttpImportInstructionsInput,
  InterpolatableRobotHttpImportInstructionsWithHiddenFields,
  InterpolatableRobotHttpImportInstructionsWithHiddenFieldsInput,
} from './http-import.ts'
export type {
  InterpolatableRobotHttpRequestInstructions,
  InterpolatableRobotHttpRequestInstructionsInput,
  InterpolatableRobotHttpRequestInstructionsWithHiddenFields,
  InterpolatableRobotHttpRequestInstructionsWithHiddenFieldsInput,
} from './http-request.ts'
export type {
  InterpolatableRobotImageBgremoveInstructions,
  InterpolatableRobotImageBgremoveInstructionsInput,
  InterpolatableRobotImageBgremoveInstructionsWithHiddenFields,
  InterpolatableRobotImageBgremoveInstructionsWithHiddenFieldsInput,
} from './image-bgremove.ts'
export type {
  InterpolatableRobotImageCopyrightdetectInstructions,
  InterpolatableRobotImageCopyrightdetectInstructionsInput,
  InterpolatableRobotImageCopyrightdetectInstructionsWithHiddenFields,
  InterpolatableRobotImageCopyrightdetectInstructionsWithHiddenFieldsInput,
} from './image-copyrightdetect.ts'
export type {
  InterpolatableRobotImageDescribeInstructions,
  InterpolatableRobotImageDescribeInstructionsInput,
  InterpolatableRobotImageDescribeInstructionsWithHiddenFields,
  InterpolatableRobotImageDescribeInstructionsWithHiddenFieldsInput,
} from './image-describe.ts'
export type {
  InterpolatableRobotImageEnhanceInstructions,
  InterpolatableRobotImageEnhanceInstructionsInput,
  InterpolatableRobotImageEnhanceInstructionsWithHiddenFields,
  InterpolatableRobotImageEnhanceInstructionsWithHiddenFieldsInput,
} from './image-enhance.ts'
export type {
  InterpolatableRobotImageFacedetectInstructions,
  InterpolatableRobotImageFacedetectInstructionsInput,
  InterpolatableRobotImageFacedetectInstructionsWithHiddenFields,
  InterpolatableRobotImageFacedetectInstructionsWithHiddenFieldsInput,
} from './image-facedetect.ts'
export type {
  InterpolatableRobotImageGenerateInstructions,
  InterpolatableRobotImageGenerateInstructionsInput,
  InterpolatableRobotImageGenerateInstructionsWithHiddenFields,
  InterpolatableRobotImageGenerateInstructionsWithHiddenFieldsInput,
} from './image-generate.ts'
export type {
  InterpolatableRobotImageMergeInstructions,
  InterpolatableRobotImageMergeInstructionsInput,
  InterpolatableRobotImageMergeInstructionsWithHiddenFields,
  InterpolatableRobotImageMergeInstructionsWithHiddenFieldsInput,
} from './image-merge.ts'
export type {
  InterpolatableRobotImageOcrInstructions,
  InterpolatableRobotImageOcrInstructionsInput,
  InterpolatableRobotImageOcrInstructionsWithHiddenFields,
  InterpolatableRobotImageOcrInstructionsWithHiddenFieldsInput,
} from './image-ocr.ts'
export type {
  InterpolatableRobotImageOptimizeInstructions,
  InterpolatableRobotImageOptimizeInstructionsInput,
  InterpolatableRobotImageOptimizeInstructionsWithHiddenFields,
  InterpolatableRobotImageOptimizeInstructionsWithHiddenFieldsInput,
} from './image-optimize.ts'
export type {
  InterpolatableRobotImageResizeInstructions,
  InterpolatableRobotImageResizeInstructionsInput,
  InterpolatableRobotImageResizeInstructionsWithHiddenFields,
  InterpolatableRobotImageResizeInstructionsWithHiddenFieldsInput,
} from './image-resize.ts'
export type {
  InterpolatableRobotImageUpscaleInstructions,
  InterpolatableRobotImageUpscaleInstructionsInput,
  InterpolatableRobotImageUpscaleInstructionsWithHiddenFields,
  InterpolatableRobotImageUpscaleInstructionsWithHiddenFieldsInput,
} from './image-upscale.ts'
export type {
  InterpolatableRobotMegaImportInstructions,
  InterpolatableRobotMegaImportInstructionsInput,
  InterpolatableRobotMegaImportInstructionsWithHiddenFields,
  InterpolatableRobotMegaImportInstructionsWithHiddenFieldsInput,
} from './mega-import.ts'
export type {
  InterpolatableRobotMegaStoreInstructions,
  InterpolatableRobotMegaStoreInstructionsInput,
  InterpolatableRobotMegaStoreInstructionsWithHiddenFields,
  InterpolatableRobotMegaStoreInstructionsWithHiddenFieldsInput,
} from './mega-store.ts'
export type {
  InterpolatableRobotMetaReadInstructions,
  InterpolatableRobotMetaReadInstructionsInput,
  InterpolatableRobotMetaReadInstructionsWithHiddenFields,
} from './meta-read.ts'
export type {
  InterpolatableRobotMetaWriteInstructions,
  InterpolatableRobotMetaWriteInstructionsInput,
  InterpolatableRobotMetaWriteInstructionsWithHiddenFields,
  InterpolatableRobotMetaWriteInstructionsWithHiddenFieldsInput,
} from './meta-write.ts'
export type {
  InterpolatableRobotMinioImportInstructions,
  InterpolatableRobotMinioImportInstructionsInput,
  InterpolatableRobotMinioImportInstructionsWithHiddenFields,
  InterpolatableRobotMinioImportInstructionsWithHiddenFieldsInput,
} from './minio-import.ts'
export type {
  InterpolatableRobotMinioStoreInstructions,
  InterpolatableRobotMinioStoreInstructionsInput,
  InterpolatableRobotMinioStoreInstructionsWithHiddenFields,
  InterpolatableRobotMinioStoreInstructionsWithHiddenFieldsInput,
} from './minio-store.ts'
export type {
  InterpolatableRobotProgressSimulateInstructions,
  InterpolatableRobotProgressSimulateInstructionsInput,
} from './progress-simulate.ts'
export type {
  InterpolatableRobotS3ImportInstructions,
  InterpolatableRobotS3ImportInstructionsInput,
  InterpolatableRobotS3ImportInstructionsWithHiddenFields,
  InterpolatableRobotS3ImportInstructionsWithHiddenFieldsInput,
} from './s3-import.ts'
export type {
  InterpolatableRobotS3StoreInstructions,
  InterpolatableRobotS3StoreInstructionsInput,
  InterpolatableRobotS3StoreInstructionsWithHiddenFields,
  InterpolatableRobotS3StoreInstructionsWithHiddenFieldsInput,
} from './s3-store.ts'
export type {
  InterpolatableRobotScriptRunInstructions,
  InterpolatableRobotScriptRunInstructionsInput,
  InterpolatableRobotScriptRunInstructionsWithHiddenFields,
  InterpolatableRobotScriptRunInstructionsWithHiddenFieldsInput,
} from './script-run.ts'
export type {
  InterpolatableRobotSftpImportInstructions,
  InterpolatableRobotSftpImportInstructionsInput,
  InterpolatableRobotSftpImportInstructionsWithHiddenFields,
  InterpolatableRobotSftpImportInstructionsWithHiddenFieldsInput,
} from './sftp-import.ts'
export type {
  InterpolatableRobotSftpStoreInstructions,
  InterpolatableRobotSftpStoreInstructionsInput,
  InterpolatableRobotSftpStoreInstructionsWithHiddenFields,
  InterpolatableRobotSftpStoreInstructionsWithHiddenFieldsInput,
} from './sftp-store.ts'
export type {
  InterpolatableRobotSpeechTranscribeInstructions,
  InterpolatableRobotSpeechTranscribeInstructionsInput,
  InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFields,
  InterpolatableRobotSpeechTranscribeInstructionsWithHiddenFieldsInput,
} from './speech-transcribe.ts'
export type {
  InterpolatableRobotSupabaseImportInstructions,
  InterpolatableRobotSupabaseImportInstructionsInput,
  InterpolatableRobotSupabaseImportInstructionsWithHiddenFields,
  InterpolatableRobotSupabaseImportInstructionsWithHiddenFieldsInput,
} from './supabase-import.ts'
export type {
  InterpolatableRobotSupabaseStoreInstructions,
  InterpolatableRobotSupabaseStoreInstructionsInput,
  InterpolatableRobotSupabaseStoreInstructionsWithHiddenFields,
  InterpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsInput,
} from './supabase-store.ts'
export type {
  InterpolatableRobotSwiftImportInstructions,
  InterpolatableRobotSwiftImportInstructionsInput,
  InterpolatableRobotSwiftImportInstructionsWithHiddenFields,
  InterpolatableRobotSwiftImportInstructionsWithHiddenFieldsInput,
} from './swift-import.ts'
export type {
  InterpolatableRobotSwiftStoreInstructions,
  InterpolatableRobotSwiftStoreInstructionsInput,
  InterpolatableRobotSwiftStoreInstructionsWithHiddenFields,
  InterpolatableRobotSwiftStoreInstructionsWithHiddenFieldsInput,
} from './swift-store.ts'
export type {
  InterpolatableRobotTextSpeakInstructions,
  InterpolatableRobotTextSpeakInstructionsInput,
  InterpolatableRobotTextSpeakInstructionsWithHiddenFields,
  InterpolatableRobotTextSpeakInstructionsWithHiddenFieldsInput,
} from './text-speak.ts'
export type {
  InterpolatableRobotTextTranslateInstructions,
  InterpolatableRobotTextTranslateInstructionsInput,
  InterpolatableRobotTextTranslateInstructionsWithHiddenFields,
  InterpolatableRobotTextTranslateInstructionsWithHiddenFieldsInput,
} from './text-translate.ts'
export type {
  InterpolatableRobotTigrisImportInstructions,
  InterpolatableRobotTigrisImportInstructionsInput,
  InterpolatableRobotTigrisImportInstructionsWithHiddenFields,
  InterpolatableRobotTigrisImportInstructionsWithHiddenFieldsInput,
} from './tigris-import.ts'
export type {
  InterpolatableRobotTigrisStoreInstructions,
  InterpolatableRobotTigrisStoreInstructionsInput,
  InterpolatableRobotTigrisStoreInstructionsWithHiddenFields,
  InterpolatableRobotTigrisStoreInstructionsWithHiddenFieldsInput,
} from './tigris-store.ts'
export type {
  InterpolatableRobotTlcdnDeliverInstructions,
  InterpolatableRobotTlcdnDeliverInstructionsInput,
  InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFields,
  InterpolatableRobotTlcdnDeliverInstructionsWithHiddenFieldsInput,
} from './tlcdn-deliver.ts'
export type {
  InterpolatableRobotTransloaditImportInstructions,
  InterpolatableRobotTransloaditImportInstructionsInput,
  InterpolatableRobotTransloaditImportInstructionsWithHiddenFields,
  InterpolatableRobotTransloaditImportInstructionsWithHiddenFieldsInput,
} from './transloadit-import.ts'
export type {
  InterpolatableRobotTransloaditStoreInstructions,
  InterpolatableRobotTransloaditStoreInstructionsInput,
  InterpolatableRobotTransloaditStoreInstructionsWithHiddenFields,
  InterpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsInput,
} from './transloadit-store.ts'
export type {
  InterpolatableRobotTusStoreInstructions,
  InterpolatableRobotTusStoreInstructionsInput,
  InterpolatableRobotTusStoreInstructionsWithHiddenFields,
  InterpolatableRobotTusStoreInstructionsWithHiddenFieldsInput,
} from './tus-store.ts'
export type {
  InterpolatableRobotUploadHandleInstructions,
  InterpolatableRobotUploadHandleInstructionsInput,
  InterpolatableRobotUploadHandleInstructionsWithHiddenFields,
  InterpolatableRobotUploadHandleInstructionsWithHiddenFieldsInput,
} from './upload-handle.ts'
export type {
  InterpolatableRobotVideoAdaptiveInstructions,
  InterpolatableRobotVideoAdaptiveInstructionsInput,
  InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFields,
  InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsInput,
} from './video-adaptive.ts'
export type {
  InterpolatableRobotVideoArtworkInstructions,
  InterpolatableRobotVideoArtworkInstructionsInput,
  InterpolatableRobotVideoArtworkInstructionsWithHiddenFields,
  InterpolatableRobotVideoArtworkInstructionsWithHiddenFieldsInput,
} from './video-artwork.ts'
export type {
  InterpolatableRobotVideoConcatInstructions,
  InterpolatableRobotVideoConcatInstructionsInput,
  InterpolatableRobotVideoConcatInstructionsWithHiddenFields,
  InterpolatableRobotVideoConcatInstructionsWithHiddenFieldsInput,
} from './video-concat.ts'
export type {
  InterpolatableRobotVideoEncodeInstructions,
  InterpolatableRobotVideoEncodeInstructionsInput,
  InterpolatableRobotVideoEncodeInstructionsWithHiddenFields,
  InterpolatableRobotVideoEncodeInstructionsWithHiddenFieldsInput,
} from './video-encode.ts'
export type {
  InterpolatableRobotVideoGenerateInstructions,
  InterpolatableRobotVideoGenerateInstructionsInput,
  InterpolatableRobotVideoGenerateInstructionsWithHiddenFields,
  InterpolatableRobotVideoGenerateInstructionsWithHiddenFieldsInput,
} from './video-generate.ts'
export type {
  InterpolatableRobotVideoMergeInstructions,
  InterpolatableRobotVideoMergeInstructionsInput,
  InterpolatableRobotVideoMergeInstructionsWithHiddenFields,
  InterpolatableRobotVideoMergeInstructionsWithHiddenFieldsInput,
} from './video-merge.ts'
export type {
  InterpolatableRobotVideoOndemandInstructions,
  InterpolatableRobotVideoOndemandInstructionsInput,
  InterpolatableRobotVideoOndemandInstructionsWithHiddenFields,
  InterpolatableRobotVideoOndemandInstructionsWithHiddenFieldsInput,
} from './video-ondemand.ts'
export type {
  InterpolatableRobotVideoSplitInstructions,
  InterpolatableRobotVideoSplitInstructionsInput,
  InterpolatableRobotVideoSplitInstructionsWithHiddenFields,
  InterpolatableRobotVideoSplitInstructionsWithHiddenFieldsInput,
} from './video-split.ts'
export type {
  InterpolatableRobotVideoSubtitleInstructions,
  InterpolatableRobotVideoSubtitleInstructionsInput,
  InterpolatableRobotVideoSubtitleInstructionsWithHiddenFields,
  InterpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsInput,
} from './video-subtitle.ts'
export type {
  InterpolatableRobotVideoThumbsInstructions,
  InterpolatableRobotVideoThumbsInstructionsInput,
  InterpolatableRobotVideoThumbsInstructionsWithHiddenFields,
  InterpolatableRobotVideoThumbsInstructionsWithHiddenFieldsInput,
} from './video-thumbs.ts'
export type {
  InterpolatableRobotVimeoImportInstructions,
  InterpolatableRobotVimeoImportInstructionsInput,
  InterpolatableRobotVimeoImportInstructionsWithHiddenFields,
  InterpolatableRobotVimeoImportInstructionsWithHiddenFieldsInput,
} from './vimeo-import.ts'
export type {
  InterpolatableRobotVimeoStoreInstructions,
  InterpolatableRobotVimeoStoreInstructionsInput,
  InterpolatableRobotVimeoStoreInstructionsWithHiddenFields,
  InterpolatableRobotVimeoStoreInstructionsWithHiddenFieldsInput,
} from './vimeo-store.ts'
export type {
  InterpolatableRobotWasabiImportInstructions,
  InterpolatableRobotWasabiImportInstructionsInput,
  InterpolatableRobotWasabiImportInstructionsWithHiddenFields,
  InterpolatableRobotWasabiImportInstructionsWithHiddenFieldsInput,
} from './wasabi-import.ts'
export type {
  InterpolatableRobotWasabiStoreInstructions,
  InterpolatableRobotWasabiStoreInstructionsInput,
  InterpolatableRobotWasabiStoreInstructionsWithHiddenFields,
  InterpolatableRobotWasabiStoreInstructionsWithHiddenFieldsInput,
} from './wasabi-store.ts'
export type {
  InterpolatableRobotYoutubeStoreInstructions,
  InterpolatableRobotYoutubeStoreInstructionsInput,
  InterpolatableRobotYoutubeStoreInstructionsWithHiddenFields,
  InterpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsInput,
} from './youtube-store.ts'
