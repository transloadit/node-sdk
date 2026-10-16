---
'@transloadit/viewer': patch
---

Add an opt-in client ImagePreview with immediate ThumbHash/loading/error feedback and ImagePrefetch
for warming one neighboring photo at low priority. Native React Image now forwards onLoad/onError.
Prefetch waits for hydration and skips Save-Data/slow connections. Navigation, neighbor selection,
current-image readiness and authorization remain owned by the consuming app.
