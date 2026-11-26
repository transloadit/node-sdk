---
'@transloadit/viewer': minor
---

Add a shared React Viewer for responsive images, direct thumbnails, video, audio, PDF, Markdown,
plain text and RTF. Export bounded document readers and signed-source media playback with HLS,
MP4 fallback, exact-version grant renewal and cleanup so applications can share one preview
implementation without moving authorization into the renderer.

Markdown parser failures stay inside the preview and render the caller's error fallback.
Playback recovery calls the latest `refresh` and `onPlaybackChange` callbacks. `play()` and
`prepare()` report failure when the mounted media element's source has no primary `mediaUrl`.
Direct image URL placeholders clear when the image finished loading before hydration.
