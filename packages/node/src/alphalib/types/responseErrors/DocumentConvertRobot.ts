/** Public reason when diagnostics identify a service-side document-loading failure. */
export const documentConvertLoadInternalErrorReason =
  'LibreOffice could not load the document. Please contact support.'

/** Public reason for a load refusal without evidence of a service-side failure. */
export const documentConvertLoadUserErrorReason =
  'LibreOffice could not load the document. It may be damaged, password-protected, or in an unsupported format. If it opens elsewhere, please contact support.'

/** DocumentConvertRobot error payloads shared by runtime and the Assembly Status contract. */
export const documentConvertRobotErrors = {
  DOCUMENT_CONVERT_VALIDATION: {
    error: 'DOCUMENT_CONVERT_VALIDATION',
    http_code: 400,
  },
  DOCUMENT_CONVERT_UNSUPPORTED_CONVERSION: {
    error: 'DOCUMENT_CONVERT_UNSUPPORTED_CONVERSION',
    http_code: 400,
    message:
      "The conversion from the input file's format to the desired output format is not supported.",
  },
} as const
