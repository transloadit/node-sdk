---
'@transloadit/viewer': minor
---

Add a shared React Viewer for responsive images, direct thumbnails, video, audio, PDF, Markdown,
plain text and RTF. Export bounded document readers and signed-source media playback with HLS,
MP4 fallback, exact-version grant renewal and cleanup so applications can reuse the DAM's
preview behavior without moving authorization into the renderer.

Contain Markdown parser failures in the caller's error fallback. Playback recovery uses current
callbacks and isolates pending renewals between retries; play and prepare report missing primary
URLs as failures. Clear image placeholders when images finish loading before hydration.
