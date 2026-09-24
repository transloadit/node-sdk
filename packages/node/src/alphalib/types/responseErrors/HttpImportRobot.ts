/** HttpImportRobot error payloads shared by runtime and the Assembly Status contract. */
export const httpImportRobotErrors = {
  HTTP_IMPORT_VALIDATION: {
    error: 'HTTP_IMPORT_VALIDATION',
    http_code: 400,
  },
  HTTP_IMPORT_FAILURE: {
    error: 'HTTP_IMPORT_FAILURE',
    http_code: 500,
    message: 'One of our internal tools failed to import your file, please try again.',
  },
  HTTP_IMPORT_NOT_FOUND: {
    error: 'HTTP_IMPORT_NOT_FOUND',
    http_code: 404,
    message: 'We could not find the object that you asked for.',
  },
  HTTP_IMPORT_ACCESS_DENIED: {
    error: 'HTTP_IMPORT_ACCESS_DENIED',
    http_code: 403,
    message: 'You do not have permission to import this file.',
  },
} as const
