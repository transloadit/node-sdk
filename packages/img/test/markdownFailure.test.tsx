// @vitest-environment happy-dom

import type { ReactNode } from 'react'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'

import { DocumentViewer } from '../src/documentViewer.tsx'

vi.mock('unified', () => ({
  unified: () => ({
    use() {
      return this
    },
    parse() {
      throw new Error('Parser unavailable')
    },
  }),
}))

test('contains parser failures and reports each input once while the host stays mounted', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  const bytes = new TextEncoder().encode('# Notes').buffer
  const onError = vi.fn()
  function content(title: string): ReactNode {
    return (
      <>
        <p>Host content</p>
        <DocumentViewer
          format="markdown"
          bytes={bytes}
          title={title}
          onError={onError}
          errorFallback={<p role="alert">Unavailable</p>}
        />
      </>
    )
  }
  await act(() => root.render(content('Notes')))
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(container.textContent).toContain('Host content')
  expect(onError).toHaveBeenCalledOnce()
  await act(() => root.render(content('Updated title')))
  expect(onError).toHaveBeenCalledOnce()
  await act(() => root.unmount())
  vi.unstubAllGlobals()
})
