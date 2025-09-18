# Changelog

You may also want to refer to [GitHub releases](https://github.com/transloadit/node-sdk/releases).

## v4.0.1

Released: 2025-09-18.

[Diff](https://github.com/transloadit/node-sdk/compare/v4.0.0...v4.0.1).

- [x] Re-published v4.0.0 under v4.0.1 to fix release metadata. No functional changes.

## v4.0.0

Released: 2025-09-18.

[Diff](https://github.com/transloadit/node-sdk/compare/v3.0.2...v4.0.0).

- [x] **Breaking:** Package is now pure ESM, requires Node.js 20+, and exports `{ Transloadit }` instead of a default client.
- [x] **Breaking:** Assembly inputs are validated against rich schemas; migrate to the new `AssemblyInstructionsInput` types and expect `listAssemblies()` to return `{ items, count }`.
- [x] Added end-to-end TypeScript typings for robots, assemblies, templates, and responses, so assembly instructions now autocomplete every robot and its supported parameters.
- [x] Introduced structured error classes (`ApiError`, `InconsistentResponseError`, `PollingTimeoutError`) that preserve assembly IDs and server metadata.
- [x] Added opt-in `validateResponses` safeguard and a `getSignedSmartCDNUrl` helper for generating signed Smart CDN URLs.
- [x] Modernized tooling, tests, and examples (Vitest, Biome, TypeScript examples). See [MIGRATION.md](./MIGRATION.md) for a guided upgrade path.

## v3.0.2

Released: 2021-04-06.

[Diff](https://github.com/transloadit/node-sdk/compare/v3.0.1...v3.0.2).

- [x] Generate assembly IDs on the client to avoid relying on server timing.
- [x] Completed TypeScript surface for assembly responses by adding missing output properties.

## v3.0.1

Released: 2021-03-31.

[Diff](https://github.com/transloadit/node-sdk/compare/v3.0.0...v3.0.1).

- [x] Fixed the published default export to match the actual runtime client.

## v3.0.0

Released: 2021-03-16.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.10...v3.0.0).

- [x] Finalized the promise-based client by removing legacy wrappers and tightening trailing-slash validation.
- [x] Expanded continuous testing, linting, and documentation coverage ahead of the stable v3 release.
- [x] Improved `createAssembly` diagnostics by logging assembly IDs and exposing replayed assembly URLs.

## v2.0.10

Released: 2020-02-25.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.9...v2.0.10).

- [x] Update dependencies, thank you @dagreatbrendino

## v2.0.9

Released: 2018-12-06.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.5...v2.0.9).

- [x] Add more helpful message to assembly error (#73)
- [x] Add Assembly ID to unknown errors
- [x] Upgrade linting and fix newly found errors

## v2.0.7

Released: 2018-12-06.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.5...v2.0.7).

- [x] Fix Transloadit-Client header test for once and all (#62)
- [x] Fix bug causing progressCb to only be fired once

## v2.0.5

Released: 2018-12-06.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.4...v2.0.5).

- [x] Make resize image example more usable irl
- [x] Update Readme to include example for progressCb.
- [x] Fix failing test due to version increase (#61)
- [x] Update npm-run-all to lose event-stream dependency

## v2.0.4

Released: 2018-11-05.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.3...v2.0.4).

- [x] Send transloadit-client header (#59)

## v2.0.3

Released: 2018-10-29.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.2...v2.0.3).

- [x] When adding a stream that throws an error, do not send it to Transloadit

## v2.0.2

Released: 2018-10-24.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.1...v2.0.2).

- [x] Fix bug: invoke callback when there are no tus files to upload

## v2.0.1

Released: 2018-06-18.

[Diff](https://github.com/transloadit/node-sdk/compare/v2.0.0...v2.0.1).

- [x] Fix bug: invoke callback when waitforcompmletion is false

## v2.0.0

Released: 2018-06-08.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.11.0...v2.0.0).

- [x] (MAJOR) Use of **tus** client to enable resumable uploads. (not strictly speaking breaking the api, but big enough of an implementation change to warant a major so you can take extra care things work well)
- [x] Support Assembly Progress Callback (this supports progress during file uploads and assemby execution).

## v1.11.0

Released: 2018-05-23.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.2...v1.11.0).

- [x] Add Assembly URL to error console logs for easier debugging. (Q: should the node sdk log to console at all? should it not just work with callbacks and the caller decides what to write to what medium?)

## v1.10.3

Released: 2018-01-09.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.1...v1.10.3).

- [x] Remove unused region parameter (@tim-kos)

## v1.10.2

Released: 2017-10-15.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.0...v1.10.2).

- [x] Update lib files (@ifedapoolarewaju)

## v1.10.1

Released: 2017-10-02.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.0...v1.10.1).

- [x] fix: check path for only direct Readable instances (@ifedapoolarewaju)

## v1.10.0

Released: 2017-09-28.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.9.6...v1.10.0).

- [x] Do not retry infinitely if there is an unrecoverable error. Fixes #47. (@tim-kos)
- [x] Add the ability to wait for the encoding results of an assembly before the callback to createAssembly() is called (@tim-kos)

## v1.9.6

Released: 2017-09-26.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.9.5...v1.9.6).

- [x] Fix bug that threw `TypeError: Cannot read property 'body' of undefined` (https://github.com/transloadit/node-sdk/issues/48) (@kvz)
- [x] Fix linting issues (@kvz)
- [x] Refactor via invig.io (@kvz)
- [x] Upgrade dependencies (@kvz)

## v1.9.5

Released: 2017-09-26.

[Diff](https://github.com/transloadit/node-sdk/compare/v0.0.22...1.9.5).

- [x] Start tracking CHANGELOG.md
