---
"@transloadit/mcp-server": patch
---

Prepare the plugin manifests, the MCP Registry entry and the result widget for the ChatGPT and
Claude directories.

- `plugin.json` and `.codex-plugin/plugin.json` link the terms of service page that exists
  (`/legal/terms-of-service/`), add a support URL, use a subtitle of at most 30 characters, ship
  square icons, list capabilities and three starter prompts, and no longer mention pricing.
  `plugin.json` also carries the review test cases and release notes for OpenAI's submission.
- `server.json` no longer declares an `Authorization` header on the hosted remote, so registry
  listings stop asking for a token; OAuth clients find sign-in through the `401` challenge. It adds
  a square icon and says the server connects with OAuth.
- The result widget declares `_meta["openai/widgetDomain"]`, which ChatGPT requires for a public
  listing. It defaults to `https://transloadit.com` and is set with `TRANSLOADIT_MCP_WIDGET_DOMAIN`
  or `widgetDomain`. `ui.domain` stays unset, so Claude keeps rendering the widget.
- The widget lists its result origins and the Console origin as ChatGPT `redirect_domains`, so
  download and Console links open from ChatGPT, and opens them without an appended `redirectUrl`.
- `TRANSLOADIT_MCP_RESULT_DOMAINS` and `resultDomains` accept exact origins such as
  `https://tmp-us-east-1.transloadit.net` and drop a trailing slash or path. A value that is not
  an http(s) origin now stops the server at startup instead of ending up in the widget's CSP.
