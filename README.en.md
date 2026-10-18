# dsh-sidebar-file-drop

[简体中文](README.md) | English

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web client plugin that lets you
drag any file from a sidebar file tree into the composer as a file reference.

## Why

A file tree already knows the files in the workspace, but dropping one on the composer has no meaning
to DSH. This plugin connects the sidebar file row's absolute path to the composer's file-reference
capability, so one drag puts the file into the message.

## Behaviour

- on mousedown over a path-bearing sidebar row, makes that row draggable
- writes the absolute file path into `text/plain` / `text/uri-list` during drag
- when dropped on the current conversation's composer:
  - prevents the browser default
  - prefers a path relative to the conversation workspace
  - inserts a file-reference chip through `shell.addFiles()`
- native file drags (`dataTransfer.files`) keep DSH's existing upload path
- drops on another conversation's composer are ignored

## Implementation

The plugin registers an invisible per-session layer in `conversation.input.right`:

1. the `mousedown` capture phase inspects sidebar file rows' `title` / `aria-label` / `data-path`;
2. once an absolute path is found, the row becomes `draggable`;
3. `dragstart` writes the path;
4. composer `dragover` / `drop` checks the session identity and calls `shell.addFiles()`.

It does not copy file bytes or upload a duplicate; the reference points at the original file.

## Install

```text
plugin_manager(action="install_bundle", target="<monorepo>/packages/dsh-sidebar-file-drop")
```

Or install the whole monorepo:

```powershell
git clone --recurse-submodules https://github.com/tzhaos/dsh-plugins.git
cd dsh-plugins
node scripts/install-all.mjs
```

Fully quit and relaunch DSH after installing.

## Known limitations

- the sidebar file row must expose an absolute path (via `title`, `aria-label` or `data-path`)
- if the file tree is not HTML or has no readable path, the plugin cannot infer one
- the result is a file reference, not a re-uploaded attachment copy
- depends on DSH's composer and `shell.addFiles()` contracts

## Development and tests

```sh
node scripts/check.mjs
```

The zero-dependency suite covers manifest/patch/locale/icon, draggable sidebar rows, path export,
relative reference insertion, native file pass-through, cross-session protection, dragover and
listener cleanup — 13 checks.

## License

[MIT](LICENSE)
