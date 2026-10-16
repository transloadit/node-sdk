---
'@transloadit/viewer': patch
---

Keep image-preview blur and loading feedback visible until native image decoding completes, avoiding a blank frame between download and display. Ignore late decode results after navigation and preserve the error fallback for invalid images.
