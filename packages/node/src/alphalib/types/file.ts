import { z } from 'zod'

export const fileAsSchema = z.union([z.string(), z.array(z.string())]).nullable()
export type FileAs = z.infer<typeof fileAsSchema>
