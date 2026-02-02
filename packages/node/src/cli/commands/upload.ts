import fs from 'node:fs'
import { Command, Option } from 'clipanion'
import type { AssemblyStatus } from '../../alphalib/types/assemblyStatus.ts'
import { sendTusRequest } from '../../tus.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

export interface UploadOptions {
  file: string
  createUploadEndpoint?: string
  resumeUploadEndpoint?: string
  assemblyUrl: string
  field?: string
}

const deriveEndpointFromUploadUrl = (uploadUrl: string): string => {
  const url = new URL(uploadUrl)
  url.pathname = url.pathname.replace(/\/[^/]*$/, '/')
  return url.toString()
}

export async function upload(
  output: IOutputCtl,
  {
    file,
    createUploadEndpoint,
    resumeUploadEndpoint,
    assemblyUrl,
    field = ':original',
  }: UploadOptions,
): Promise<void> {
  const tusEndpoint =
    createUploadEndpoint ??
    (resumeUploadEndpoint ? deriveEndpointFromUploadUrl(resumeUploadEndpoint) : undefined)

  if (!tusEndpoint) {
    throw new Error('Provide --create-upload-endpoint or --resume-upload-endpoint.')
  }

  const stream = fs.createReadStream(file)
  const streamsMap = {
    [field]: { path: file, stream },
  }

  const assembly: AssemblyStatus = {
    tus_url: tusEndpoint,
    assembly_ssl_url: assemblyUrl,
  } as AssemblyStatus

  const { uploadUrls } = await sendTusRequest({
    streamsMap,
    assembly,
    requestedChunkSize: Number.POSITIVE_INFINITY,
    uploadConcurrency: 1,
    onProgress: () => {},
    uploadUrls: resumeUploadEndpoint ? { [field]: resumeUploadEndpoint } : undefined,
  })

  const uploadUrl = uploadUrls[field]

  output.print(`Uploaded ${file}`, {
    status: 'ok',
    file,
    field,
    assembly_url: assemblyUrl,
    tus_endpoint: tusEndpoint,
    resume_upload_endpoint: resumeUploadEndpoint,
    upload_url: uploadUrl,
  })
}

export class UploadCommand extends UnauthenticatedCommand {
  static override paths = [['upload']]

  static override usage = Command.Usage({
    category: 'Uploads',
    description: 'Upload a local file to a tus endpoint for an Assembly',
    details: `
      Upload a local file to a tus endpoint and attach it to an existing Assembly.
      Use --create-upload-endpoint for new uploads or --resume-upload-endpoint to resume.
    `,
    examples: [
      [
        'Upload a file to an Assembly',
        'transloadit upload ./video.mp4 --create-upload-endpoint https://api2.transloadit.com/resumable/files/ --assembly https://api2.transloadit.com/assemblies/ASSEMBLY_ID',
      ],
      [
        'Resume a file upload',
        'transloadit upload ./video.mp4 --resume-upload-endpoint https://api2.transloadit.com/resumable/files/UPLOAD_ID --assembly https://api2.transloadit.com/assemblies/ASSEMBLY_ID',
      ],
    ],
  })

  file = Option.String({ required: true })
  tusEndpoint = Option.String({ required: false })

  assemblyUrl = Option.String('--assembly', {
    description: 'Assembly URL to attach this upload to',
    required: true,
  })

  createUploadEndpoint = Option.String('--create-upload-endpoint', {
    description: 'Tus create endpoint (e.g. https://api2.transloadit.com/resumable/files/)',
  })

  resumeUploadEndpoint = Option.String('--resume-upload-endpoint', {
    description: 'Tus upload URL to resume (e.g. https://.../resumable/files/<id>)',
  })

  field = Option.String('--field', {
    description: 'Field name for the upload (default: :original)',
  })

  protected async run(): Promise<number | undefined> {
    try {
      await upload(this.output, {
        file: this.file,
        createUploadEndpoint: this.createUploadEndpoint ?? this.tusEndpoint,
        resumeUploadEndpoint: this.resumeUploadEndpoint,
        assemblyUrl: this.assemblyUrl,
        field: this.field,
      })
      return undefined
    } catch (err) {
      this.output.error(err instanceof Error ? err.message : String(err))
      return 1
    }
  }
}
