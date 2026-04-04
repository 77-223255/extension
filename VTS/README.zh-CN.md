<p align="center">
  <a href="README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  <img src="icons/icon128.png" width="96" height="96">
</p>

<h1 align="center">VTS</h1>

<p align="center">竖直标签切换器 - Chrome 快速标签切换，支持缩略图预览</p>

---

<p align="center">
  <img src="README_IMAGE/VTS_long.PNG" alt="VTS 截图">
</p>

## 功能特点

- 每个标签页显示缩略图预览
- 自动适配深色/浅色模式

## 安装方法

1. 下载或克隆本仓库
2. 在 Chrome 中打开 `chrome://extensions/`（或 Edge 中打开 `edge://extensions/`）
3. 启用右上角的**开发者模式**
4. 点击**加载已解压的扩展程序** → 选择 `VTS` 文件夹

## 使用方法

| 按键 | 操作 |
| ---- | ---- |
| `Alt+Q` | 打开切换器 / 向下导航 |
| `Alt+Shift+Q` | 向上导航 |
| `↑` / `↓` | 浏览标签 |
| `Enter` | 切换到选中标签 |
| `Delete` / `Backspace` | 关闭选中标签 |
| `Esc` | 关闭切换器 |
| 点击背景 | 关闭切换器 |
| 点击 `×` | 关闭标签 |

## 设置说明

点击扩展图标切换设置：

| 选项 | 描述 |
| ---- | ---- |
| 预览 | 在列表中显示缩略图 |
| 特写 | 显示侧边预览面板 |

## 常见问题

**问：为什么有些标签没有缩略图？**  
答：Chrome 限制了对内部页面（chrome://、edge:// 等）的截图。

**问：可以修改快捷键吗？**  
答：可以，访问 `chrome://extensions/shortcuts`。

**问：隐身模式下能用吗？**  
答：可以，在扩展详情页启用"在隐身模式下启用"。

**问：快捷键有时不生效怎么办？**  
答：部分快捷键在浏览器输入框焦点时会被拦截，建议使用默认快捷键，也可自行尝试其他组合。

## 开源协议

MIT License - 详见 [LICENSE](../LICENSE)。