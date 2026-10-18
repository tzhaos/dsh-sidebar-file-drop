## [1.1.1] - 2026-10-19

### Fixed

- Register the composer slot through `ctx.slots.inject`; a sessionless fresh boot no longer fails
  activation before the host declares `conversation.input.right`.

### Verified

- `node scripts/check.mjs`: 15 checks green.

# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-19

### Added

- On DSH Desktop, bridge `__DSH_DESKTOP_FILE_PATH__.getPathForFile` to the composer's
  `__DSH_HOST_PATHS__.pathFor` seam. The Host's own `addFiles` path now produces `@path` references for
  dropped non-image files instead of uploading a copy. The bridge yields to any existing seam.

### Verified

- `node scripts/check.mjs`: 15 checks green.

## [1.0.0] - 2026-10-19

### Added

- Path-bearing sidebar file rows become draggable.
- Dropping one on the current composer inserts a workspace-relative file reference.
- Native file drags keep DSH's normal upload path; drops on other conversations are ignored.

### Verified

- `node scripts/check.mjs`: 13 checks green.
