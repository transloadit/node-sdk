# Changelog

Here's is a combined todo/done list. You can see what todos are planned for the upcoming release, as well as ideas that may/may not make into a release in `Ideas`.

## Ideas

- [ ] 

## master

Released: TBA.

[Diff](https://github.com/transloadit/node-sdk/compare/1.11.0...master).

- [x] Support the use of Tus client for resumable uploads.
- [x] Support Assembly Progress Callback (this supports progress during file uploads and assemby execution).

## 1.11.0

Released: 2018-05-23.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.2...v1.11.0).

- [x] Add Assembly URL to error console logs for easier debugging. (Q: should the node sdk log to console at all? should it not just work with callbacks and the caller decides what to write to what medium?)


## 1.10.3

Released: 2018-01-09.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.1...v1.10.3).

- [x] Remove unused region parameter (@tim-kos)

## 1.10.2

Released: 2017-10-15.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.0...v1.10.2).

- [x] Update lib files (@ifedapoolarewaju)

## 1.10.1

Released: 2017-10-02.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.10.0...v1.10.1).

- [x] fix: check path for only direct Readable instances (@ifedapoolarewaju)

## 1.10.0

Released: 2017-09-28.

[Diff](https://github.com/transloadit/node-sdk/compare/v1.9.6...v1.10.0).

- [x] Do not retry infinitely if there is an unrecoverable error. Fixes #47. (@tim-kos)
- [x] Add the ability to wait for the encoding results of an assembly before the callback to createAssembly() is called (@tim-kos)

## 1.9.6

Released: 2017-09-26. 

[Diff](https://github.com/transloadit/node-sdk/compare/v1.9.5...v1.9.6).

- [x] Fix bug that threw `TypeError: Cannot read property 'body' of undefined` (https://github.com/transloadit/node-sdk/issues/48) (@kvz)
- [x] Fix linting issues (@kvz)
- [x] Refactor via invig.io (@kvz)
- [x] Upgrade dependencies (@kvz)

## 1.9.5

Released: 2017-09-26. 

[Diff](https://github.com/transloadit/node-sdk/compare/v0.0.22...1.9.5).

- [x] Start tracking CHANGELOG.md
