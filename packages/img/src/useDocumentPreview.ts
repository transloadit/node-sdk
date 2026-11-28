'use client'

import type { DocumentPreviewKind, DocumentPreviewReason } from './document.ts'
import type { PreviewContent } from './readPreviewContent.ts'
import type { PlaybackSource } from './useMediaPlayback.ts'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import {
  DocumentPreviewError,
  MAX_DOCUMENT_PREVIEW_BYTES,
  MAX_RICH_DOCUMENT_PREVIEW_BYTES,
} from './document.ts'
import { readPreviewContent } from './readPreviewContent.ts'

export type DocumentSource = Pick<
  PlaybackSource,
  'asset_id' | 'version_id' | 'mediaUrl' | 'expiresAt'
>

export interface DocumentPreviewOptions {
  source: DocumentSource
  renew?: () => Promise<DocumentSource | undefined>
  size?: number | null
  format: Exclude<DocumentPreviewKind, 'pdf'>
}

interface PreviewState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  bytes: ArrayBuffer | null
  reason: DocumentPreviewReason | null
  truncated: boolean
  mime: string | null
}

export interface DocumentPreview extends PreviewState {
  open: () => Promise<void>
  close: () => void
  retry: () => Promise<void>
}

const idle: PreviewState = {
  status: 'idle',
  bytes: null,
  reason: null,
  truncated: false,
  mime: null,
}

function selectionKey({ source, format }: DocumentPreviewOptions): string {
  return JSON.stringify([source.asset_id, source.version_id, format])
}

function readSource(
  source: DocumentSource,
  signal: AbortSignal,
  rtf: boolean,
): Promise<PreviewContent> {
  if (!source.mediaUrl) throw new DocumentPreviewError('forbidden')
  return readPreviewContent(source.mediaUrl, signal, {
    limit: rtf ? MAX_RICH_DOCUMENT_PREVIEW_BYTES : MAX_DOCUMENT_PREVIEW_BYTES,
    truncate: !rtf,
  })
}

/** Read only on open, bind renewal to the same version, and cancel reads on close or replacement. */
export function useDocumentPreview(options: DocumentPreviewOptions): DocumentPreview {
  const latest = useRef<DocumentPreviewOptions | null>(options)
  useLayoutEffect(() => {
    latest.current = options
    return () => {
      latest.current = null
    }
  }, [options])
  const selection = selectionKey(options)
  const [result, setResult] = useState<{ selection: string; state: PreviewState } | null>(null)
  const state = result?.selection === selection ? result.state : idle
  const active = useRef<AbortController | null>(null)
  const close = useCallback(() => {
    active.current?.abort()
    active.current = null
    setResult(null)
  }, [])
  const {
    source: { asset_id, version_id },
    format,
  } = options
  // biome-ignore lint/correctness/useExhaustiveDependencies: Selection changes end the previous preview, while rotating a grant for the same version preserves it.
  useLayoutEffect(() => {
    setResult(null)
    return () => {
      active.current?.abort()
      active.current = null
    }
  }, [asset_id, version_id, format])

  const open = useCallback(async (): Promise<void> => {
    if (!latest.current) return
    const selection = selectionKey(latest.current)
    const { source, renew, size, format } = latest.current
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const { signal } = controller
    function setState(state: PreviewState): void {
      setResult({ selection, state })
    }
    setState({ ...idle, status: 'loading' })
    async function fresh(missing: DocumentPreviewReason = 'expired'): Promise<DocumentSource> {
      const answer = await renew?.()
      signal.throwIfAborted()
      if (!answer) throw new DocumentPreviewError(missing)
      if (answer.expiresAt <= Date.now() + 5_000) throw new DocumentPreviewError('expired')
      if (answer.asset_id !== source.asset_id || answer.version_id !== source.version_id)
        throw new DocumentPreviewError('forbidden')
      return answer
    }
    try {
      const rtf = format === 'rtf'
      if (rtf && size != null && size > MAX_RICH_DOCUMENT_PREVIEW_BYTES)
        throw new DocumentPreviewError('too-large')
      const expired = source.expiresAt <= Date.now() + 5_000
      const grant = expired ? await fresh() : source
      let content: PreviewContent
      try {
        content = await readSource(grant, signal, rtf)
      } catch (error) {
        if (
          signal.aborted ||
          expired ||
          !renew ||
          !(error instanceof DocumentPreviewError) ||
          (error.reason !== 'expired' && error.reason !== 'forbidden')
        )
          throw error
        const replacement = await fresh(error.reason)
        if (replacement.mediaUrl === grant.mediaUrl) throw error
        content = await readSource(replacement, signal, rtf)
      }
      if (!signal.aborted) setState({ ...content, status: 'ready', reason: null })
    } catch (error) {
      if (signal.aborted) return
      const reason =
        error instanceof DocumentPreviewError && error.reason !== 'unavailable'
          ? error.reason
          : 'network'
      setState({ ...idle, status: 'error', reason })
    }
  }, [])
  return { ...state, open, close, retry: open }
}
