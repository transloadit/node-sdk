import { describe, expect, it } from 'vitest'

import { robotAiChatInstructionsSchema } from '../../src/alphalib/types/robots/ai-chat.ts'

const messagesSchema = robotAiChatInstructionsSchema.shape.messages

describe('/ai/chat message schema', () => {
  it('normalizes persisted AI SDK 5 tool history', () => {
    const messages = messagesSchema.parse([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'lookup',
            args: { query: 'docs' },
            experimental_providerMetadata: { anthropic: { cacheControl: 'ephemeral' } },
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'lookup',
            result: { found: true },
          },
        ],
      },
    ])

    expect(messages).toEqual([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'lookup',
            input: { query: 'docs' },
            providerOptions: { anthropic: { cacheControl: 'ephemeral' } },
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'lookup',
            output: { type: 'json', value: { found: true } },
          },
        ],
      },
    ])
  })

  it('preserves complete AI SDK 7 message histories', () => {
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: 'data:image/png;base64,AA==',
            mediaType: 'image/png',
          },
        ],
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'file',
            data: 'data:text/plain;base64,SGk=',
            filename: 'answer.txt',
            mediaType: 'text/plain',
          },
          { type: 'reasoning', text: 'Checked the source.' },
          {
            type: 'tool-result',
            toolCallId: 'call-2',
            toolName: 'lookup',
            output: { type: 'json', value: { found: true } },
          },
          {
            type: 'tool-approval-request',
            approvalId: 'approval-1',
            toolCallId: 'call-3',
            isAutomatic: true,
            signature: 'signed-approval',
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId: 'approval-1',
            approved: true,
            providerExecuted: true,
          },
        ],
      },
    ]

    expect(messagesSchema.parse(messages)).toEqual(messages)
  })

  it('normalizes persisted AI SDK 5 rich media tool content', () => {
    const message = messagesSchema.parse([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'screenshot',
            result: 'legacy fallback',
            experimental_content: [{ type: 'media', data: 'iVBORw0KGgo=', mediaType: 'image/png' }],
          },
        ],
      },
    ])

    expect(message).toEqual([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'screenshot',
            output: {
              type: 'content',
              value: [{ type: 'file-data', data: 'iVBORw0KGgo=', mediaType: 'image/png' }],
            },
          },
        ],
      },
    ])
  })

  it('normalizes legacy tool results whose optional result was omitted', () => {
    const messages = messagesSchema.parse([
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: 'call-1', toolName: 'lookup' }],
      },
    ])

    expect(messages).toMatchObject([
      {
        content: [{ output: { type: 'text', value: 'undefined' } }],
      },
    ])
  })

  it('normalizes legacy image tool content without a specific media type', () => {
    const messages = messagesSchema.parse([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'screenshot',
            experimental_content: [{ type: 'image', data: 'iVBORw0KGgo=' }],
          },
        ],
      },
    ])

    expect(messages).toMatchObject([
      {
        content: [
          {
            output: {
              type: 'content',
              value: [{ type: 'image-data', data: 'iVBORw0KGgo=', mediaType: 'image' }],
            },
          },
        ],
      },
    ])
  })

  it('normalizes legacy media nested in an existing content output', () => {
    const messages = messagesSchema.parse([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'screenshot',
            output: {
              type: 'content',
              value: [{ type: 'media', data: 'iVBORw0KGgo=', mediaType: 'image/png' }],
            },
          },
        ],
      },
    ])

    expect(messages).toMatchObject([
      {
        content: [
          {
            output: {
              type: 'content',
              value: [{ type: 'file-data', data: 'iVBORw0KGgo=', mediaType: 'image/png' }],
            },
          },
        ],
      },
    ])
  })

  it('serializes non-JSON legacy tool results before using a lossy string fallback', () => {
    const messages = messagesSchema.parse([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'clock',
            result: new Date('2026-07-10T00:00:00.000Z'),
          },
        ],
      },
    ])

    expect(messages).toMatchObject([
      {
        content: [
          {
            output: { type: 'text', value: '"2026-07-10T00:00:00.000Z"' },
          },
        ],
      },
    ])
  })

  it('falls back safely when a legacy tool result contains a circular value', () => {
    const circularResult: Record<string, unknown> = {}
    circularResult.self = circularResult

    const messages = messagesSchema.parse([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'circular',
            result: circularResult,
          },
        ],
      },
    ])

    expect(messages).toMatchObject([
      {
        content: [{ output: { type: 'text', value: '[object Object]' } }],
      },
    ])
  })

  it('accepts AI SDK 7 tool-call inputs that are not JSON values', () => {
    const input = new Date('2026-07-10T00:00:00.000Z')

    expect(
      messagesSchema.parse([
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call-1',
              toolName: 'schedule',
              input,
            },
          ],
        },
      ]),
    ).toMatchObject([{ content: [{ input }] }])
  })
})
