# dsh-sidebar-file-drop

简体中文 | [English](README.en.md)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 客户端插件：从侧边栏
文件列表把任意文件拖进对话输入框，作为文件引用附件。

## 为什么

文件树里已经能看到工作区文件，但把文件拖到输入框时 DSH 不知道该把它变成什么。这个插件把侧边栏
文件行的绝对路径接到 composer 的文件引用能力上，拖一下就能把文件放进消息。

## 行为

- 在带绝对路径的侧边栏文件行上按下鼠标时，把该行设为可拖拽
- 拖动时把文件绝对路径写入 `text/plain` / `text/uri-list`
- 拖到当前会话的 composer 上时：
  - 阻止浏览器默认行为
  - 优先转换为相对于会话工作区的路径
  - 通过 `shell.addFiles()` 插入文件引用 chip
- 原生文件拖拽（`dataTransfer.files`）交给 DSH 原有上传路径，不拦截
- **DSH Desktop** 会把 preload 的 `__DSH_DESKTOP_FILE_PATH__.getPathForFile` 接到 composer 的
  `__DSH_HOST_PATHS__.pathFor`；官方 `addFiles` 因此能把拖入的非图片文件写成 `@路径`，而不是上传副本
- 拖到其他会话的 composer 不处理

## 实现

插件在 `conversation.input.right` 注册一个不渲染内容的会话层：

1. `mousedown` 捕获阶段检查侧栏文件行的 `title` / `aria-label` / `data-path` 等属性；
2. 找到绝对路径后把行设为 `draggable`；
3. `dragstart` 写入文件路径；
4. composer 的 `dragover` / `drop` 校验会话身份，调用 `shell.addFiles()` 插入引用。

不复制文件内容，不上传字节；引用的是原文件路径。

## 安装

```text
plugin_manager(action="install_bundle", target="<monorepo>/packages/dsh-sidebar-file-drop")
```

或安装整个 monorepo：

```powershell
git clone --recurse-submodules https://github.com/tzhaos/dsh-plugins.git
cd dsh-plugins
node scripts/install-all.mjs
```

安装后完全退出 DSH 再启动。

## 已知限制

- 侧边栏文件行必须能提供绝对路径（`title`、`aria-label` 或 `data-path`）
- 如果侧边栏文件树不是 HTML 元素或没有可读路径，插件无法推断路径
- 生成的是文件引用，不是浏览器重新上传的附件副本
- 依赖 DSH 的 composer 和 `shell.addFiles()` 契约

## 开发与测试

```sh
node scripts/check.mjs
```

零依赖测试覆盖清单/patch/locale/icon、侧栏行可拖拽化、路径导出、相对路径引用、原生文件放行、
跨会话保护、dragover 和监听清理，共 15 项检查。

## 许可证

[MIT](LICENSE)
