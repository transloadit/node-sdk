# @transloadit/notify-url-relay

## 0.3.0

### Minor Changes

- 3b4db64: Correct Assembly response readers to preserve numeric State/XPSubject metadata, repeated date tags and null uploaded-file extensions already emitted by the API. Read nonempty future Assembly error codes without confusing the closed known-code inventory with the public response contract; terminal-error helpers now recognize those responses.

  These corrections widen exported response types. Consumers must handle numeric metadata, arrays of date values, nullable uploaded-file extensions and unknown error strings. The MCP server and notification relay follow the corrected response types in pre-1.0 minor releases; the relay publicly exports its AssemblyResponse alias. See the [Assembly response migration guide](https://github.com/transloadit/node-sdk/blob/main/docs/monorepo-architecture.md#assembly-response-migration) for the affected fields and narrowing rules.

### Patch Changes

- Updated dependencies [3b4db64]
- Updated dependencies [8d768d6]
  - @transloadit/zod@6.0.0

## 0.2.2

### Patch Changes

- Updated dependencies [ba9299f]
  - @transloadit/zod@5.0.0

## 0.2.1

### Patch Changes

- e832510: Refresh runtime dependencies used by the relay and Zod helper packages.
- Updated dependencies [e832510]
  - @transloadit/zod@4.3.1

## 0.2.0

### Minor Changes

- dc0def8: Add a new `@transloadit/notify-url-relay` package for running a local Transloadit
  `notify_url` relay with fetch-based forwarding, assembly polling, retry logic, and a CLI/TUI.

## 0.1.0

### Minor Changes

- Initial release of the notify_url proxy package.
