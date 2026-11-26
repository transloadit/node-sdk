---
'@transloadit/viewer': minor
---

Add a shared React Viewer for responsive images, direct thumbnails, video, audio, PDF, Markdown,
plain text and RTF. Export bounded document readers and signed-source media playback with HLS,
MP4 fallback, exact-version grant renewal and cleanup so applications can share one preview
implementation without moving authorization into the renderer.

Markdown parser failures render the caller's error fallback. Playback recovery uses current
callbacks and isolates pending renewals between retries; play and prepare report missing primary
URLs as failures. Image placeholders clear when images finish loading before hydration.
