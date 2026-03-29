# AGENTS.md

## 项目概述

基于 **Manifest V3** 的 Chrome 浏览器扩展。使用原生 JavaScript、HTML 和 CSS —— 无构建工具、无框架、无 TypeScript。

## 项目结构

```
hello_world/
├── manifest.json    # 扩展清单文件 (MV3)
├── popup.html       # 弹窗页面
├── popup.js         # 弹窗逻辑
```

## 构建 / 代码检查 / 测试命令

本项目**没有配置构建系统、代码检查工具或测试框架**。修改后通过浏览器的"加载已解压的扩展程序"功能直接加载。

- **Chrome 加载**: `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序 → 选择 `hello_world/` 目录
- **Firefox 加载**: `about:debugging#/runtime/this-firefox` → 临时载入附加组件 → 选择 `manifest.json` 文件
- **修改后重新加载**: 在 `chrome://extensions/` 页面点击扩展卡片上的刷新按钮

如果后续需要添加构建工具，推荐使用 **Vite** + `@crxjs/vite-plugin` 进行 Chrome 扩展开发。

## 代码风格规范

### JavaScript
- 使用**原生 JS** —— 除非项目明确添加框架，否则不使用 React 或其他框架
- 优先使用 `const`，其次 `let`；禁止使用 `var`
- 字符串使用**单引号**
- 使用 `addEventListener` 绑定事件（不要使用内联 `onclick`）
- 回调函数使用箭头函数：`btn.addEventListener('click', () => { ... })`
- 使用 `document.getElementById()` 或 `document.querySelector()` 访问 DOM
- 弹窗脚本保持自包含 —— 假设没有模块打包器

### HTML
- 使用 `<!DOCTYPE html>` 并设置 `<meta charset="UTF-8">`
- 中文界面使用 `lang="zh-CN"`，英文界面使用 `lang="en"`
- 包含 `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- 简单扩展中可以将 `<style>` 内联在 HTML 中

### CSS
- 类名使用 **kebab-case**（短横线命名法）
- 弹窗尺寸保持固定（典型宽度 300px–400px）
- 使用 CSS transition 实现悬停效果

### Manifest 文件
- 始终使用 `manifest_version: 3`
- 基于弹窗的扩展需要声明 `action`
- 使用 `chrome.*` API（MV3），不要使用 `browser.*`（Firefox 旧版）

## Chrome 扩展专项说明

- **权限**: 在 `manifest.json` 的 `permissions` 字段中只声明需要的权限
- **内容安全策略**: MV3 强制执行严格的 CSP —— 禁止内联脚本、禁止 `eval()`
- **后台脚本**: 在 MV3 中使用 `service_worker`（而不是 `background.scripts`）
- **存储**: 使用 `chrome.storage.local` 或 `chrome.storage.sync` 进行数据持久化
- **消息通信**: 使用 `chrome.runtime.sendMessage` 实现弹窗 ↔ 后台通信

## 常用代码模式

```js
// DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('myBtn');
  btn.addEventListener('click', handleClick);
});

// Chrome 存储
chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});

// 向后台发送消息
chrome.runtime.sendMessage({ action: 'doSomething' }, (response) => {
  console.log(response);
});
```

## 添加新扩展

1. 在项目根目录下创建新目录（例如 `my_extension/`）
2. 添加 `manifest.json`，设置 `manifest_version: 3`
3. 包含 `popup.html`、`popup.js` 及其他资源文件
4. 在 `chrome://extensions/` 中加载已解压的扩展程序进行测试
