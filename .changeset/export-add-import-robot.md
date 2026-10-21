---
'@transloadit/node': minor
'transloadit': minor
---

Export `addImportRobot`, which replaces the upload Step of Assembly Instructions with an `/http/import` Step and points the Steps that used it at the import. `prepareInputFiles()` accepts a `signal` that stops URL downloads; the call then rejects and removes the files it wrote.
