---
'@transloadit/viewer': patch
---

Add an opt-in client ImagePreview with immediate ThumbHash/loading/error feedback and ImagePrefetch
for warming one neighboring photo at low priority. Native React Image now forwards onLoad/onError.
Navigation, authorization and connection/bandwidth policy remain owned by the consuming app.
