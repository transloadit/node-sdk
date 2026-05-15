import { z } from 'zod'

export const supportTicketMessageSchema = z
  .object({
    id: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    body: z.string().optional(),
    createdAt: z.string().optional(),
    partType: z.string().optional(),
    type: z.string().optional(),
  })
  .strict()

export const supportTicketSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    ageHours: z.number().optional(),
    assignee: z.string().optional(),
    createdAt: z.string().optional(),
    open: z.boolean().optional(),
    priority: z.string().optional(),
    read: z.boolean().optional(),
    requester: z.string().optional(),
    requesterEmail: z.string().optional(),
    source: z.string().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    teamAssignee: z.string().optional(),
    updatedAt: z.string().optional(),
    url: z.string().optional(),
    waitingHours: z.number().optional(),
    waitingSince: z.string().nullable().optional(),
  })
  .strict()

export const supportTicketListSchema = z
  .object({
    generatedAt: z.string(),
    items: z.array(supportTicketSummarySchema),
    open: z.number(),
    query: z.string().optional(),
    sort: z.string().optional(),
    source: z.string(),
    stale: z.number(),
    summary: z.string(),
    urgent: z.number(),
  })
  .strict()

export const supportTicketDetailSchema = supportTicketSummarySchema
  .extend({
    body: z.string().optional(),
    messages: z.array(supportTicketMessageSchema),
    raw: z.unknown().optional(),
  })
  .strict()

export const supportTicketDetailOutputSchema = z
  .object({
    generatedAt: z.string(),
    source: z.string(),
    ticket: supportTicketDetailSchema,
  })
  .strict()

export type SupportTicketDetail = z.infer<typeof supportTicketDetailSchema>
export type SupportTicketDetailOutput = z.infer<typeof supportTicketDetailOutputSchema>
export type SupportTicketList = z.infer<typeof supportTicketListSchema>
export type SupportTicketMessage = z.infer<typeof supportTicketMessageSchema>
export type SupportTicketSummary = z.infer<typeof supportTicketSummarySchema>
