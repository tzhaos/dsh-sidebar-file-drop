/**
 * Host half of the sidebar-file-drop bundle.
 *
 * The plugin is pure browser UI: it turns a sidebar file row into a drag
 * source and accepts its path on the composer as a reference chip. The Host
 * process has nothing to install, but this entry exists so the Client module
 * registry discovers the browser bundle from an active Loader row.
 */
export function apply() {}
