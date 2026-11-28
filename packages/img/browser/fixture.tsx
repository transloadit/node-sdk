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

const params = new URLSearchParams(location.search)

function Fixture() {
  const [missingWorker, setMissingWorker] = useState(params.has('missingWorker'))
  const [loaded, setLoaded] = useState(0)
  const preview = useDocumentPreview({ source, format: 'markdown' })
  const stalled = params.has('stalled')
  const ranged = params.has('ranges')
  const [rotated, setRotated] = useState(false)
  const [version, setVersion] = useState(1)
  const [expiry, setExpiry] = useState(() => Date.now() + 60_000)
  const [renewals, setRenewals] = useState(0)
  if (params.has('frame'))
    return (
      <Viewer
        kind="pdf"
        mode="frame"
        src={`${fileOrigin}/frame`}
        title="Native slides"
        timeoutMs={500}
      />
    )
  return (
    <>
      <Viewer
        kind="pdf"
        mode="pdfjs"
        src={
          params.has('lazy')
            ? undefined
            : `${fileOrigin}/${ranged ? (rotated ? 'ranges/rotated' : 'ranges/old') : stalled ? 'stalled' : 'report'}`
        }
        documentKey={String(version)}
        expiresAt={expiry}
        timeoutMs={stalled ? 150 : undefined}
        filename="slides.pdf"
        renew={(signal) => {
          signal.throwIfAborted()
          setRenewals((count) => count + 1)
          return Promise.resolve({
            mediaUrl: `${fileOrigin}/${ranged ? 'ranges/fresh' : 'report'}`,
          })
        }}
        title="Lecture slides"
        workerSrc={missingWorker ? '/missing-worker.mjs' : undefined}
        onLoad={() => setLoaded((count) => count + 1)}
        renderError={
          params.has('defaultError')
            ? undefined
            : (reason, retry) => (
                <div>
                  <p>{reason}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMissingWorker(false)
                      retry()
                    }}
                  >
                    Retry PDF
                  </button>
                </div>
              )
        }
      />
      <button type="button" onClick={() => setRotated(true)}>
        Rotate URL
      </button>
      <button type="button" onClick={() => setExpiry(Date.now() + 120_000)}>
        Extend expiry
      </button>
      <button type="button" onClick={() => setVersion(2)}>
        Switch version
      </button>
      <output aria-label="Grant renewals">{renewals}</output>
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
