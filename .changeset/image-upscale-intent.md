---
'@transloadit/node': minor
'@transloadit/mcp-server': patch
'transloadit': minor
---

Add an `image upscale` intent command that wires up the `/image/upscale` Robot for AI image
upscaling. Flags `--model` (`nightmareai/real-esrgan` by default, plus `tencentarc/gfpgan` and
`sczhou/codeformer`), `--scale` (2 or 4), and `--face-enhance` are derived from the robot schema.
