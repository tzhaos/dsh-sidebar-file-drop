/**
 * Zero-dependency verification for dsh-sidebar-file-drop.
 *
 * Run with `node scripts/check.mjs`. The suite loads the real browser module
 * against DOM-shaped fakes and drives the document drag/drop listeners.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')
const manifest = JSON.parse(read('package.json'))
const clientSource = read('client.js')

let checks = 0

async function check(name, body) {
  try {
    await body()
    checks += 1
    console.log('ok ' + name)
  } catch (error) {
    console.error('FAIL ' + name)
    console.error('     ' + (error?.message ?? error))
    process.exitCode = 1
  }
}

function translator(dictionary) {
  return (key) => dictionary[key] ?? key
}

/** Fake owner/card/target chain for a composer. */
function composerFixture(sessionId) {
  const owner = {
    getAttribute(name) { return name === 'data-conversation-session' ? sessionId : null },
    closest(selector) { return selector === '[data-conversation-session]' ? this : null },
  }
  const card = {
    closest(selector) {
      if (selector === '[data-conversation-session]') return owner
      if (selector === '[data-composer-card]') return card
      return null
    },
  }
  const target = {
    closest(selector) { return selector === '[data-composer-card]' ? card : null },
  }
  return { owner, card, target }
}

/** Fake sidebar file row with one absolute path. */
function sidebarFixture(filePath) {
  const sidebar = {
    closest(selector) { return selector.includes('sidebar') || selector.includes('aside') ? sidebar : null },
  }
  const row = {
    draggable: false,
    getAttribute(name) { return name === 'title' ? filePath : null },
    closest(selector) {
      if (selector.includes('sidebar') || selector.includes('aside')) return sidebar
      if (selector.includes('data-file-path') || selector.includes('title')) return row
      return null
    },
  }
  return { row, sidebar }
}

function transfer(text, files = []) {
  return {
    files,
    effectAllowed: '',
    dropEffect: '',
    data: { 'text/plain': text, 'text/uri-list': '' },
    getData(type) { return this.data[type] ?? '' },
    setData(type, value) { this.data[type] = value },
  }
}

function dragEvent(target, dataTransfer) {
  return {
    target,
    dataTransfer,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true },
    stopPropagation() { this.stopped = true },
  }
}

function scenario() {
  const listeners = new Map()
  const cleanups = []
  const added = []
  const notices = []
  const document = {
    addEventListener(type, handler) { listeners.set(type, handler) },
    removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type) },
  }
  const shell = {
    notify(level, text) { notices.push({ level, text }) },
    addFiles(references, ids) {
      added.push({ references, ids })
      return true
    },
  }
  const conversation = { input: { for: () => shell } }
  const sessions = {
    scope: () => ({ get: () => conversation }),
    list: { getSnapshot: () => ({ byId: { 'session-a': { cwd: 'C:\\repo' } } }) },
  }
  const registrations = []
  let locale
  let loaded
  const sandbox = {
    window: { __ModuleLoader__: { load(definition) { loaded = definition } } },
    document,
    console,
  }
  vm.runInNewContext(clientSource, sandbox, { filename: 'client.js' })
  const plugin = loaded.factory((id) => {
    if (id === 'react') {
      return {
        createElement: () => null,
        useEffect(effect) {
          const cleanup = effect()
          if (typeof cleanup === 'function') cleanups.push(cleanup)
        },
      }
    }
    throw new Error('unexpected require ' + id)
  })
  const ctx = {
    effect(factory) { factory(); return () => {} },
    sessions,
    locale: {
      register(ns, dicts) {
        locale = { ns, dicts }
        return () => {}
      },
    },
    slots: {
      register(options, component) { registrations.push({ options, component }); return () => {} },
    },
  }
  plugin.apply(ctx)
  const registration = registrations[0]
  const injected = registration.options.inject('session-a')
  const t = translator(locale.dicts.zh)
  registration.component({ ...injected, t })
  return { listeners, cleanups, added, notices, t, injected }
}

// Static contract
await check('manifest declares a DSH bundle and web client half', () => {
  assert.equal(manifest.name, 'dsh-sidebar-file-drop')
  assert.equal(manifest.version, '1.0.0')
  assert.equal(manifest.license, 'MIT')
  assert.equal(manifest.main, 'index.js')
  assert.equal(manifest.exports['./client'], './client.js')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  assert.equal(manifest.scripts.check, 'node scripts/check.mjs')
})

await check('all manifest files exist on disk', () => {
  for (const relative of [
    manifest.main, 'client.js', manifest.dsh.bundle.patch,
    'locale/en.json', 'locale/zh.json', 'icon.svg', 'README.md', 'README.en.md',
    'CHANGELOG.md', 'LICENSE',
  ]) assert(fs.existsSync(path.join(ROOT, relative)), relative + ' exists')
})

await check('bundle patch inserts exactly one sidebar-file-drop row', () => {
  const patch = read('cordis.patch.yml')
  assert(patch.includes('- insert:'))
  assert(patch.includes('id: sidebar-file-drop'))
  assert(patch.includes("name: 'dsh-sidebar-file-drop'"))
  assert.equal((patch.match(/- insert:/g) ?? []).length, 1)
})

await check('client only requires the frozen React module', () => {
  const requires = [...clientSource.matchAll(/require\('([^']+)'\)/g)].map((match) => match[1])
  assert.deepEqual(requires, ['react'])
})

await check('locale files carry title and description', () => {
  for (const locale of ['zh', 'en']) {
    const value = JSON.parse(read('locale/' + locale + '.json'))
    assert.equal(typeof value.meta.title, 'string')
    assert.equal(typeof value.meta.description, 'string')
  }
})

await check('icon is a valid accent SVG', () => {
  const icon = read('icon.svg')
  assert(icon.includes('<svg'))
  assert(icon.includes('#4D6BFE'))
})

// Behaviour
await check('mousedown on a path-bearing sidebar row makes it draggable', () => {
  const applied = scenario()
  const sidebar = sidebarFixture('C:\\repo\\src\\client.js')
  applied.listeners.get('mousedown')({ target: sidebar.row })
  assert.equal(sidebar.row.draggable, true)
})

await check('dragstart exports the sidebar file path', () => {
  const applied = scenario()
  const sidebar = sidebarFixture('C:\\repo\\src\\client.js')
  const data = transfer('')
  applied.listeners.get('dragstart')(dragEvent(sidebar.row, data))
  assert.equal(data.data['text/plain'], 'C:\\repo\\src\\client.js')
})

await check('drop on the composer inserts a workspace-relative file reference', () => {
  const applied = scenario()
  const composer = composerFixture('session-a')
  const event = dragEvent(composer.target, transfer('C:\\repo\\src\\client.js'))
  applied.listeners.get('drop')(event)
  assert.equal(event.prevented, true)
  assert.equal(applied.added.length, 1)
  assert.deepEqual(JSON.parse(JSON.stringify(applied.added[0].references)), [{
    source: 'reference',
    ref: '@src\\client.js',
    label: 'client.js',
    appearance: 'file',
    clipboardText: '@src\\client.js',
  }])
  assert.deepEqual(JSON.parse(JSON.stringify(applied.added[0].ids)), [])
})

await check('dragover on the composer accepts a path drag', () => {
  const applied = scenario()
  const composer = composerFixture('session-a')
  const data = transfer('C:\\repo\\src\\client.js')
  const event = dragEvent(composer.target, data)
  applied.listeners.get('dragover')(event)
  assert.equal(event.prevented, true)
  assert.equal(data.dropEffect, 'copy')
})

await check('a native file drag is left to the Host upload path', () => {
  const applied = scenario()
  const composer = composerFixture('session-a')
  const data = transfer('C:\\repo\\src\\client.js', [{}])
  const event = dragEvent(composer.target, data)
  applied.listeners.get('drop')(event)
  assert.equal(event.prevented, false)
  assert.equal(applied.added.length, 0)
})

await check('drop from another conversation is ignored', () => {
  const applied = scenario()
  const composer = composerFixture('session-b')
  const event = dragEvent(composer.target, transfer('C:\\repo\\src\\client.js'))
  applied.listeners.get('drop')(event)
  assert.equal(event.prevented, false)
  assert.equal(applied.added.length, 0)
})

await check('cleanup removes all four listeners', () => {
  const applied = scenario()
  applied.cleanups[0]()
  assert.equal(applied.listeners.size, 0)
})

console.log('\n' + (process.exitCode === 1 ? 'some checks failed' : 'all checks passed (' + checks + ')'))
