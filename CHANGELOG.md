# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-19

### Added

- Path-bearing sidebar file rows become draggable.
- Dropping one on the current composer inserts a workspace-relative file reference.
- Native file drags keep DSH's normal upload path; drops on other conversations are ignored.

### Verified

- `node scripts/check.mjs`: 13 checks green.
