---
'@transloadit/viewer': patch
---

Add an optional `rotationIntervalMs` to `createStorageRoute` for longer reuse of signed CDN URLs.
The default interval, maximum grant lifetime, and per-request authorization remain unchanged.
The interval cannot exceed half the lifetime, keeping newly issued URLs usable for at least
half their maximum lifetime. Viewer remains alpha.
