export const COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_MODEL = 'openai/gpt-5.5'
export const COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_REASONING_EFFORT = 'medium'
export const COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_MAX_ATTEMPTS = 3

export const COMPILE_ASSEMBLY_INSTRUCTIONS_MCP_ALLOWED_TOOLS = [
  'transloadit_get_robot_help',
  'transloadit_lint_assembly_instructions',
  'transloadit_list_robots',
] as const

export type CompileAssemblyInstructionsMessage = {
  role: 'assistant' | 'user'
  content: string
}

export type CompileAssemblyInstructionsMcpServer =
  | string
  | {
      type: string
      url: string
      headers?: Record<string, string>
      auth?: string
      allowed_tools?: string | string[]
    }

export type CompileAssemblyInstructionsLintIssue = {
  type?: string
  code?: string
  message?: string
  summary?: string
  desc?: string
}

export type CompileAssemblyInstructionsAiStep = {
  robot: '/ai/chat'
  result: true
  model: string
  reasoning_effort: string
  test_credentials: true
  format: 'json'
  schema: string
  system_message: string
  interpolate: {
    system_message: false
  }
  messages: CompileAssemblyInstructionsMessage[]
  mcp_servers?: CompileAssemblyInstructionsMcpServer[]
}

export type CompileAssemblyInstructionsRunInput = {
  aiStep: CompileAssemblyInstructionsAiStep
}

export type CompileAssemblyInstructionsRunResult = {
  response: unknown
  assemblyUrl?: string
  billedChargeUsd?: number
  usageBytes?: number
}

export type CompileAssemblyInstructionsClient = {
  runAssemblyInstructionsCompiler(
    input: CompileAssemblyInstructionsRunInput,
  ): Promise<CompileAssemblyInstructionsRunResult>
  lintAssemblyInstructions(
    instructionsJson: string,
  ): Promise<CompileAssemblyInstructionsLintIssue[]>
}

export type CompileAssemblyInstructionsResponse = {
  message: string
  instructions?: {
    steps: Record<string, unknown>
  }
}

export type CompileAssemblyInstructionsAttempt = {
  attempt: number
  error: string
  generatedInstructions?: string
  lintIssues?: CompileAssemblyInstructionsLintIssue[]
}

export type CompileAssemblyInstructionsResult = {
  assemblyUrl?: string
  billedChargeUsd?: number
  instructions: {
    steps: Record<string, unknown>
  }
  instructionsJson: string
  message: string
  usageBytes?: number
  validationAttempts: CompileAssemblyInstructionsAttempt[]
}

export type CompileAssemblyInstructionsOptions = {
  client: CompileAssemblyInstructionsClient
  docs?: string
  indent?: number
  maxAttempts?: number
  mcpServerUrl?: string
  mcpServers?: CompileAssemblyInstructionsMcpServer[]
  messages?: CompileAssemblyInstructionsMessage[]
  model?: string
  prompt: string
  reasoningEffort?: string
  systemPrompt?: string
}

export class CompileAssemblyInstructionsError extends Error {
  generatedInstructions?: string
  lintIssues?: CompileAssemblyInstructionsLintIssue[]
  validationAttempts: CompileAssemblyInstructionsAttempt[]

  constructor(
    message: string,
    opts: {
      cause?: unknown
      generatedInstructions?: string
      lintIssues?: CompileAssemblyInstructionsLintIssue[]
      validationAttempts?: CompileAssemblyInstructionsAttempt[]
    } = {},
  ) {
    super(message, opts.cause === undefined ? undefined : { cause: opts.cause })
    this.name = 'CompileAssemblyInstructionsError'
    this.generatedInstructions = opts.generatedInstructions
    this.lintIssues = opts.lintIssues
    this.validationAttempts = opts.validationAttempts ?? []
  }
}

export const COMPILE_ASSEMBLY_INSTRUCTIONS_RESPONSE_JSON_SCHEMA = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: {
      type: 'string',
      description:
        'A brief explanation or conversational reply. Mention assumptions, missing credentials, or placeholders when relevant.',
    },
    instructions: {
      type: 'object',
      additionalProperties: false,
      required: ['steps'],
      properties: {
        steps: {
          type: 'object',
          additionalProperties: true,
          description:
            'The complete Transloadit Assembly Instructions steps object. Always include every step, not just changed parts.',
        },
      },
    },
  },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function buildCompileAssemblyInstructionsSystemPrompt({
  docs,
}: {
  docs?: string
} = {}): string {
  const docsSuffix = docs?.trim() ? `\n\n${docs.trim()}` : ''

  return `You are a Transloadit Assembly Instructions generator. Your sole purpose is to help users create and modify valid Transloadit Assembly Instructions JSON.

IMPORTANT CONSTRAINTS:
- You MUST only discuss Transloadit Assembly Instructions. Politely decline any other requests.
- Return Assembly Instructions, not Templates. A Template is only a possible place where these instructions may later be saved.
- The instructions must have a top-level "steps" object where each step has a "robot" field referencing a valid Transloadit Robot (for example, "/image/resize", "/s3/store", "/video/encode").
- Steps that process output from other steps must include a "use" field referencing the source step name prefixed with ":" (for example, "use": ":resized").
- The first step that handles direct uploads should use "robot": "/upload/handle".
- Do not send, request, or infer file contents unless the user explicitly asks for content-aware processing.

WORKFLOW:
1. Understand what the user wants to achieve.
2. Use the bundled Transloadit documentation and MCP tools to choose the right Robots and parameters.
3. Use the transloadit_list_robots tool to find relevant Robots if unsure which Robot to use.
4. Use the transloadit_get_robot_help tool to get parameter details for specific Robots.
5. Generate the Assembly Instructions JSON.
6. Use the transloadit_lint_assembly_instructions tool to validate your output. Pass the full JSON including the "steps" wrapper.
7. If linting reports errors, fix them and lint again until it passes.
8. Return the final validated JSON with a brief explanation.

WHEN ADAPTING EXISTING INSTRUCTIONS:
- The user's current Assembly Instructions JSON may be included as context.
- The user's current lint issues may be included when relevant.
- Preserve existing steps unless the user explicitly asks to remove or replace them.
- Preserve all template expressions (\`\${...}\`) and field names exactly as written.
- Never resolve existing template expressions like \`\${fields.input}\` or \`\${file.url_name}\` to concrete values or empty strings.
- If the user asks for a default or fallback for an existing field-driven expression, preserve the dynamic expression and prefer JavaScript fallback syntax such as \`\${fields.w || 400}\` over replacing it with a fixed number.${docsSuffix}`
}

export function parseCompileAssemblyInstructionsResponse(
  value: unknown,
): CompileAssemblyInstructionsResponse {
  if (!isRecord(value)) {
    throw new CompileAssemblyInstructionsError('AI response was not a JSON object.')
  }

  if (typeof value.message !== 'string') {
    throw new CompileAssemblyInstructionsError('AI response was missing a string message.')
  }

  if (value.instructions === undefined) {
    return { message: value.message }
  }

  if (!isRecord(value.instructions)) {
    throw new CompileAssemblyInstructionsError('AI response instructions must be an object.')
  }

  const { steps } = value.instructions
  if (!isRecord(steps)) {
    throw new CompileAssemblyInstructionsError(
      'AI response instructions must include a steps object.',
    )
  }

  return {
    message: value.message,
    instructions: { steps },
  }
}

function getIssueMessage(issue: CompileAssemblyInstructionsLintIssue): string {
  return issue.summary ?? issue.message ?? issue.desc ?? issue.code ?? 'Unknown lint issue'
}

function getBlockingLintIssues(
  lintIssues: CompileAssemblyInstructionsLintIssue[],
): CompileAssemblyInstructionsLintIssue[] {
  return lintIssues.filter((lintIssue) => lintIssue.type === 'error')
}

function createMcpServers(
  options: CompileAssemblyInstructionsOptions,
): CompileAssemblyInstructionsMcpServer[] {
  if (options.mcpServers) {
    return options.mcpServers
  }

  if (!options.mcpServerUrl) {
    return []
  }

  return [
    {
      type: 'http',
      url: options.mcpServerUrl,
      auth: 'transloadit',
      allowed_tools: [...COMPILE_ASSEMBLY_INSTRUCTIONS_MCP_ALLOWED_TOOLS],
    },
  ]
}

function appendRetryInstruction(
  messages: CompileAssemblyInstructionsMessage[],
  lastError: string | null,
): CompileAssemblyInstructionsMessage[] {
  if (!lastError) {
    return messages
  }

  return [
    ...messages,
    {
      role: 'user',
      content: `The previous response failed validation: ${lastError}\n\nPlease fix the Assembly Instructions and try again.`,
    },
  ]
}

function createAiStep(
  options: CompileAssemblyInstructionsOptions,
  messages: CompileAssemblyInstructionsMessage[],
): CompileAssemblyInstructionsAiStep {
  const mcpServers = createMcpServers(options)
  const aiStep: CompileAssemblyInstructionsAiStep = {
    robot: '/ai/chat',
    result: true,
    model: options.model ?? COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_MODEL,
    reasoning_effort:
      options.reasoningEffort ?? COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_REASONING_EFFORT,
    test_credentials: true,
    format: 'json',
    schema: COMPILE_ASSEMBLY_INSTRUCTIONS_RESPONSE_JSON_SCHEMA,
    system_message:
      options.systemPrompt ?? buildCompileAssemblyInstructionsSystemPrompt({ docs: options.docs }),
    interpolate: {
      system_message: false,
    },
    messages,
  }

  if (mcpServers.length > 0) {
    aiStep.mcp_servers = mcpServers
  }

  return aiStep
}

export async function compileAssemblyInstructionsFromPrompt(
  options: CompileAssemblyInstructionsOptions,
): Promise<CompileAssemblyInstructionsResult> {
  const baseMessages: CompileAssemblyInstructionsMessage[] = [
    ...(options.messages ?? []),
    { role: 'user', content: options.prompt },
  ]
  const maxAttempts = options.maxAttempts ?? COMPILE_ASSEMBLY_INSTRUCTIONS_DEFAULT_MAX_ATTEMPTS
  const validationAttempts: CompileAssemblyInstructionsAttempt[] = []
  let lastError: string | null = null
  let lastGeneratedInstructions: string | undefined
  let lastLintIssues: CompileAssemblyInstructionsLintIssue[] | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const messages = appendRetryInstruction(baseMessages, lastError)
    const runResult = await options.client.runAssemblyInstructionsCompiler({
      aiStep: createAiStep(options, messages),
    })
    let response: CompileAssemblyInstructionsResponse
    try {
      response = parseCompileAssemblyInstructionsResponse(runResult.response)
    } catch (error) {
      if (!(error instanceof CompileAssemblyInstructionsError)) {
        throw error
      }

      lastError = error.message
      validationAttempts.push({ attempt, error: lastError })
      continue
    }

    if (!response.instructions) {
      lastError = 'AI response did not include Assembly Instructions.'
      validationAttempts.push({ attempt, error: lastError })
      continue
    }

    const instructionsJson = JSON.stringify(response.instructions, null, options.indent ?? 2)
    const lintIssues = await options.client.lintAssemblyInstructions(instructionsJson)
    const blockingLintIssues = getBlockingLintIssues(lintIssues)

    if (blockingLintIssues.length === 0) {
      return {
        assemblyUrl: runResult.assemblyUrl,
        billedChargeUsd: runResult.billedChargeUsd,
        instructions: response.instructions,
        instructionsJson,
        message: response.message,
        usageBytes: runResult.usageBytes,
        validationAttempts,
      }
    }

    lastGeneratedInstructions = instructionsJson
    lastLintIssues = blockingLintIssues
    lastError = `Assembly Instructions failed linting: ${blockingLintIssues
      .map(getIssueMessage)
      .join('; ')}`
    validationAttempts.push({
      attempt,
      error: lastError,
      generatedInstructions: instructionsJson,
      lintIssues: blockingLintIssues,
    })
  }

  throw new CompileAssemblyInstructionsError(`Failed after ${maxAttempts} attempts.`, {
    generatedInstructions: lastGeneratedInstructions,
    lintIssues: lastLintIssues,
    validationAttempts,
  })
}
