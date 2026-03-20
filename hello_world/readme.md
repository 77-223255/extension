# Hello World 浏览器插件

一个简单的浏览器插件，点击图标后显示 "Hello World" 消息。

## 安装方法

### Chrome/Edge 浏览器

1. 打开浏览器，访问 `chrome://extensions/`（或 `edge://extensions/`）
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择本文件夹 `hello world`
5. 插件安装完成！

### Firefox 浏览器

1. 打开浏览器，访问 `about:debugging#/runtime/this-firefox`
2. 点击 **"临时载入附加组件"**
3. 选择本文件夹中的 `manifest.json` 文件
4. 插件安装完成！

## 使用方法

1. 安装后，浏览器工具栏会出现插件图标
2. 点击图标打开弹窗
3. 点击 **"点击我"** 按钮，即可看到 "Hello World" 消息

## 文件结构

```
hello world/
├── manifest.json    # 插件配置文件
├── popup.html       # 弹窗页面
├── popup.js         # 弹窗脚本
├── readme.md        # 说明文档
└── icon*.png        # 插件图标（可选）
```
