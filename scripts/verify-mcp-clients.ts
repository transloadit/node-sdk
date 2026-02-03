import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

type CliCheck = {
  name: string
  command: string
  add: () => void
  run: () => { ok: boolean; output: string }
  cleanup?: () => void
}

const requiredEnv = ['TRANSLOADIT_KEY', 'TRANSLOADIT_SECRET']
const envMissing = requiredEnv.filter((key) => !process.env[key])

if (envMissing.length > 0) {
  console.error(`Missing required env vars: ${envMissing.join(', ')}`)
  process.exit(1)
}

const endpoint = process.env.TRANSLOADIT_ENDPOINT ?? 'https://api2.transloadit.com'
const commandTimeoutMs = Number(process.env.MCP_VERIFY_TIMEOUT_MS ?? 60_000)
const serverName = process.env.MCP_SERVER_NAME ?? 'transloadit'
const allowlistedTools = ['transloadit_list_templates']
const serverCommand = [
  'npm',
  'exec',
  '--yes',
  '--package=@transloadit/mcp-server@latest',
  '--',
  'transloadit-mcp',
  'stdio',
]

const runCommand = (
  command: string,
  args: string[],
): { status: number; stdout: string; stderr: string } => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: commandTimeoutMs,
    env: {
      ...process.env,
      TRANSLOADIT_ENDPOINT: endpoint,
    },
  })

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: `${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`,
  }
}

const commandExists = (command: string): boolean => {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' })
  return result.status === 0
}

const outputLooksSuccessful = (output: string, expectedTemplateId: string): boolean => {
  if (!expectedTemplateId) return false
  return output.includes(expectedTemplateId) && output.includes('transloadit_list_templates')
}

const fetchExpectedTemplateId = async (): Promise<string> => {
  const { Transloadit } = await import('../packages/node/dist/Transloadit.js')
  const client = new Transloadit({
    authKey: process.env.TRANSLOADIT_KEY,
    authSecret: process.env.TRANSLOADIT_SECRET,
    endpoint,
  })
  const response = await client.listTemplates({
    page: 1,
    page_size: 1,
    include_builtin: 'exclusively-latest',
  })
  const template = response.items?.[0]
  if (!template?.id) {
    throw new Error('No templates returned from listTemplates')
  }
  return template.id
}

const runClaude = (prompt: string, expectedTemplateId: string): CliCheck => ({
  name: 'Claude Code',
  command: 'claude',
  add: () => {
    runCommand('claude', ['mcp', 'remove', serverName])
    const args = [
      'mcp',
      'add',
      '--transport',
      'stdio',
      serverName,
      '--env',
      `TRANSLOADIT_KEY=${process.env.TRANSLOADIT_KEY}`,
      '--env',
      `TRANSLOADIT_SECRET=${process.env.TRANSLOADIT_SECRET}`,
      '--env',
      `TRANSLOADIT_ENDPOINT=${endpoint}`,
      '--',
      ...serverCommand,
    ]
    const result = runCommand('claude', args)
    if (result.status !== 0) {
      throw new Error(`claude mcp add failed: ${result.stderr || result.stdout}`)
    }
  },
  cleanup: () => {
    runCommand('claude', ['mcp', 'remove', serverName])
  },
  run: () => {
    const result = runCommand('claude', [
      '-p',
      prompt,
      '--output-format',
      'json',
      '--allowedTools',
      `mcp__${serverName}`,
      '--permission-mode',
      'acceptEdits',
    ])
    const output = `${result.stdout}\n${result.stderr}`
    return { ok: result.status === 0 && outputLooksSuccessful(output, expectedTemplateId), output }
  },
})

const runCodex = (prompt: string, expectedTemplateId: string): CliCheck => ({
  name: 'Codex CLI',
  command: 'codex',
  add: () => {
    runCommand('codex', ['mcp', 'remove', serverName])
    const args = [
      'mcp',
      'add',
      serverName,
      '--env',
      `TRANSLOADIT_KEY=${process.env.TRANSLOADIT_KEY}`,
      '--env',
      `TRANSLOADIT_SECRET=${process.env.TRANSLOADIT_SECRET}`,
      '--env',
      `TRANSLOADIT_ENDPOINT=${endpoint}`,
      '--',
      ...serverCommand,
    ]
    const result = runCommand('codex', args)
    if (result.status !== 0) {
      throw new Error(`codex mcp add failed: ${result.stderr || result.stdout}`)
    }
    updateCodexEnabledTools()
  },
  cleanup: () => {
    runCommand('codex', ['mcp', 'remove', serverName])
  },
  run: () => {
    const result = runCommand('codex', ['exec', '--full-auto', '--json', prompt])
    const output = `${result.stdout}\n${result.stderr}`
    return { ok: result.status === 0 && outputLooksSuccessful(output, expectedTemplateId), output }
  },
})

const ensureGeminiSettings = (): void => {
  const cwd = process.cwd()
  const settingsDir = join(homedir(), '.gemini')
  const settingsPath = join(settingsDir, 'settings.json')
  if (settingsPath.startsWith(`${cwd}/`)) {
    console.log(`Skipping Gemini settings write inside repo: ${settingsPath}`)
    return
  }
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true })
  }

  let settings: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    } catch {
      settings = {}
    }
  }

  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {}
  mcpServers[serverName] = {
    command: serverCommand[0],
    args: serverCommand.slice(1),
    env: {
      TRANSLOADIT_KEY: process.env.TRANSLOADIT_KEY ?? '',
      TRANSLOADIT_SECRET: process.env.TRANSLOADIT_SECRET ?? '',
      TRANSLOADIT_ENDPOINT: endpoint,
    },
    includeTools: allowlistedTools,
  }

  settings.mcpServers = mcpServers
  console.log(`Writing Gemini MCP config to ${settingsPath} using current env credentials.`)
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
}

const cleanupGeminiSettings = (): void => {
  const cwd = process.cwd()
  const settingsPath = join(homedir(), '.gemini', 'settings.json')
  if (settingsPath.startsWith(`${cwd}/`)) {
    return
  }
  if (!existsSync(settingsPath)) {
    return
  }
  let settings: Record<string, unknown> = {}
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
  } catch {
    return
  }
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {}
  if (!(serverName in mcpServers)) {
    return
  }
  delete mcpServers[serverName]
  settings.mcpServers = mcpServers
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
}

const updateCodexEnabledTools = (): void => {
  const configPath = join(homedir(), '.codex', 'config.toml')
  if (!existsSync(configPath)) {
    return
  }
  const content = readFileSync(configPath, 'utf8')
  const header = `[mcp_servers.${serverName}]`
  const lines = content.split('\n')
  const headerIndex = lines.findIndex((line) => line.trim() === header)
  if (headerIndex === -1) {
    return
  }
  let endIndex = lines.length
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('[')) {
      endIndex = i
      break
    }
  }

  const enabledLine = `enabled_tools = [${allowlistedTools
    .map((tool) => `"${tool}"`)
    .join(', ')}]`
  let replaced = false
  for (let i = headerIndex + 1; i < endIndex; i += 1) {
    if (lines[i].trim().startsWith('enabled_tools')) {
      lines[i] = enabledLine
      replaced = true
      break
    }
  }
  if (!replaced) {
    lines.splice(headerIndex + 1, 0, enabledLine)
  }

  writeFileSync(configPath, `${lines.join('\n')}\n`)
}

const runGemini = (prompt: string, expectedTemplateId: string): CliCheck => ({
  name: 'Gemini CLI',
  command: 'gemini',
  add: () => {
    runCommand('gemini', ['mcp', 'remove', serverName])
    const result = runCommand('gemini', [
      'mcp',
      'add',
      '--scope',
      'user',
      '--timeout',
      String(commandTimeoutMs),
      '--trust',
      '--env',
      `TRANSLOADIT_KEY=${process.env.TRANSLOADIT_KEY}`,
      '--env',
      `TRANSLOADIT_SECRET=${process.env.TRANSLOADIT_SECRET}`,
      '--env',
      `TRANSLOADIT_ENDPOINT=${endpoint}`,
      serverName,
      serverCommand[0],
      ...serverCommand.slice(1),
    ])

    if (result.status !== 0) {
      ensureGeminiSettings()
      return
    }
  },
  cleanup: () => {
    runCommand('gemini', ['mcp', 'remove', serverName])
    cleanupGeminiSettings()
  },
  run: () => {
    const result = runCommand('gemini', [
      '--prompt',
      prompt,
      '--output-format',
      'json',
      '--approval-mode',
      'yolo',
    ])
    const output = `${result.stdout}\n${result.stderr}`
    return { ok: result.status === 0 && outputLooksSuccessful(output, expectedTemplateId), output }
  },
})

const main = async (): Promise<void> => {
  const expectedTemplateId = await fetchExpectedTemplateId()
  const prompt =
    'Call transloadit_list_templates with {"page":1,"page_size":1,"include_builtin":"exclusively-latest"} ' +
    'and reply with only this JSON: {"template_id":"<id>","source":"transloadit_list_templates"}'

  const checks: CliCheck[] = [
    runClaude(prompt, expectedTemplateId),
    runCodex(prompt, expectedTemplateId),
    runGemini(prompt, expectedTemplateId),
  ]

  const results: Array<{ name: string; ok: boolean; output: string }> = []

  for (const check of checks) {
    if (!commandExists(check.command)) {
      console.log(`${check.name}: skipped (missing '${check.command}')`)
      continue
    }

    try {
      check.add()
      const result = check.run()
      results.push({ name: check.name, ...result })
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        output: error instanceof Error ? error.message : String(error),
      })
    } finally {
      check.cleanup?.()
    }
  }

  const failed = results.filter((result) => !result.ok)
  for (const result of results) {
    const status = result.ok ? 'ok' : 'failed'
    console.log(`${result.name}: ${status}`)
    if (!result.ok) {
      console.log(result.output)
    }
  }

  if (failed.length > 0) {
    process.exit(1)
  }
}

await main()
