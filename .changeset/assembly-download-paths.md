---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Fix CLI downloads to use Assembly result names and extensions, including bundled outputs and type-changing Steps. Preserve the existing input-relative directories and `<input>/<step>/…` layout for ordinary multi-result downloads, along with time-based skipping for directory reruns. Use `--reprocess-stale` to process unchanged inputs again.

Fix HLS downloads by retaining the result directories referenced by playlists, keeping independent source bundles separate, and publishing linked watch updates together. Reserve download paths using the destination root’s case and Unicode naming rules, and avoid file/directory collisions and descendant symlinks.

Add public HTTP(S) URL inputs to `assemblies create` and `run` using temporary uploads that are cleaned up afterward. Each download has a five-minute deadline, configurable in milliseconds with `--url-download-timeout`. Watch mode requires local inputs.
