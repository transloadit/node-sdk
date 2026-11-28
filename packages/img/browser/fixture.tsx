import { useDocumentPreview, Viewer } from '@transloadit/viewer/react/viewer'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@transloadit/viewer/viewer.css'

declare const fileOrigin: string

const source = {
  asset_id: 'notes',
  version_id: '1',
  mediaUrl: `${fileOrigin}/notes`,
  expiresAt: Date.now() + 60_000,
}

function Fixture() {
  const [missingWorker, setMissingWorker] = useState(
    new URLSearchParams(location.search).has('missingWorker'),
  )
  const [loaded, setLoaded] = useState(0)
  const preview = useDocumentPreview({ source, format: 'markdown' })
  return (
    <>
      <Viewer
        kind="pdf"
        mode="pdfjs"
        src={`${fileOrigin}/report`}
        title="Lecture slides"
        workerSrc={missingWorker ? '/missing-worker.mjs' : undefined}
        onLoad={() => setLoaded((count) => count + 1)}
        errorFallback={
          <button type="button" onClick={() => setMissingWorker(false)}>
            Retry PDF
          </button>
        }
      />
      <output aria-label="PDF loads">{loaded}</output>
      <button type="button" onClick={preview.open}>
        Open notes
      </button>
      {preview.bytes && (
        <Viewer
          kind="document"
          title="Notes"
          format="markdown"
          bytes={preview.bytes}
          mime={preview.mime}
          truncated={preview.truncated}
        />
      )}
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(<Fixture />)
