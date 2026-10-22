# Design Atlas 2.0 · 前端设计工作台

一个可以在浏览器里探索设计、调整主题、拼装页面并带走源代码的工作台。核心交互不依赖外部 CDN，也不需要账号或后端。

源码仓库：[luomo66ccff/design-atlas](https://github.com/luomo66ccff/design-atlas)。

## Vercel 部署

在 Vercel 导入此 GitHub 仓库即可。根目录的 `vercel.json` 已指定静态输出目录 `dist`，构建会依次执行模块检查、案例与导入检查，再生成离线单文件。项目没有 npm 运行时依赖，也不需要环境变量。

Git 集成连接后，推送默认分支会触发线上更新；其他分支可生成预览。网站数据存储在访问者自己的浏览器，部署更新不会同步不同设备里的个人项目。使用「保存项目」和扩展包导出备份或迁移。

## 打开方式

- **直接双击 `dist/offline.html`**：完整的离线单文件，包含界面、组件与资源目录；无需 Node.js。
- **双击 `启动工作台.cmd`**：已安装 Node.js 时运行本地服务器，访问 `http://127.0.0.1:4317`；没有 Node.js 时自动打开离线版。
- 开发时执行 `npm start` 或 `node scripts/serve.mjs`。服务器仅监听 `127.0.0.1`。
- `dist/index.html` 使用 ES modules 和 JSON 文件，请通过 HTTP 打开。不要直接双击此文件；离线使用请选择 `offline.html`。


## v2.0：公开网站案例与可扩充设计配方

本次新增 **80 个独立网站案例**：27 个人网站、11 作品集、36 产品页、6 工作室，包含 Anthony Fu、Brittany Chiang、Steph Ango、Linear、Raycast、Resend 等。80 条均读取了官网内容；其中 5 个站补充桌面与 390px 窄屏的真实浏览器抽样。案例记录来源、阅读范围、借鉴要点与适用边界，不把文字读取当成完整视觉审计。

- 按类型、建议风格、设计模式与关键词组合筛选；分页、收藏优先、个人网站优先。
- 最多并排比较 3 个案例，分别借鉴结构或主题。
- 12 个原创设计配方，支持实时预览、切换主题、只应用主题、追加模块或替换整页，三种修改均可一步撤销。
- 新增 12 个原创模块：分栏个人主页、项目索引、文章搜索、履历、近况、项目叙事、功能演示、桌面应用窗口、对比表、更新日志、评价墙、大字宣言。
- 自定义案例、学习笔记；把当前页面保存为可复用配方。扩展包导入导出包含案例、配方、笔记和网站案例收藏；支持移除与最近一次库修改撤销。
- 完整 HTML、HTML 片段、CSS、JavaScript、项目 JSON 的编辑、预览与复制继续可用。用户项目与扩展包分别管理，v2 能读取旧版 v1 项目。

卡片是**原创布局示意**，详情中的 iframe 是**原创适配预览**；点击「访问原站」查看真实网站。配方与主题是适配建议，不是原站测量结果或源码复制。没有打包原站品牌素材。

可扩充协议、代码结构与新模块注册方法见 [EXTENDING.md](EXTENDING.md)。

## 已整合内容

| 内容 | 数量 | 用途 |
| --- | ---: | --- |
| 公开网站案例 | 80 | 个人网站、作品集、产品与工作室的来源和设计建议 |
| 设计配方 | 12 | 结构与主题可分开应用，自定义配方可继续添加 |
| 原创可玩模块 | 42 | 首屏、导航、Bento、定价、表单、数据、交互组件、动效等 |
| 可编辑整页模板 | 10 | 独立工作室、SaaS、作品集、产品工作空间 |
| 全局主题 | 8 | 森林、深空、编辑式、海盐蓝、粗野主义、霓虹、薰衣草、瑞士网格 |
| 本地设计参考 | 75 | 实际存在的全部 DESIGN.md 的摘要、分类、颜色与来源 |
| 前端相关技能索引 | 45 | 从 189 份技能文件中筛选的设计、搭建与验收能力 |
| 源码资源索引 | 37 | 35 个开源项目，以及 2 个特殊授权参考项目 |

本地技能根目录包括 `CODEX_HOME/skills`、`HOME/.agents/skills` 与 `CODEX_HOME/plugins/cache`。技能索引只记录能力摘要，不执行技能，也不把文件存在等同于连接器可调用。排除了普通后端、账号、聊天记录、备份副本等无关内容。未修改原有技能或参考文件。

参考库的导航索引只列出 44 项，上游 README 列出 73 项，实际目录有 74 份上游参考，加 1 份本地网站研究，共 75 份。本工作台按实际文件扫描。

互联网资源是截至 **2026-10-22** 逐项核对仓库的精选目录，不声称穷尽所有前端设计。内含 React、Vue、Svelte、原生 HTML/CSS、动效、图标、设计系统和模板。每项都附来源、官方文档、核对日期和许可证入口。

## 能做什么

1. 在设计库里按类型、分类、关键词筛选，切换网格/列表，收藏喜欢的条目。
2. 打开原创模块，修改标题、文案、颜色、字体、圆角和章节间距；切换桌面、平板与手机宽度。
3. 将修改后的模块加入页面，组合不同类别；拖动图层排序，也能用上移/下移按钮。支持复制、隐藏、删除、撤销与重做。
4. 套用整页模板或新建空白画布，用检查器修改各个模块，并添加自定义 CSS。
5. 复制完整 HTML、HTML 片段、CSS、JavaScript 或项目 JSON；完整 HTML 可直接保存为 `.html` 运行。片段需要与对应 CSS、JS 一起使用。
6. 在源码编辑器修改完整 HTML 或各代码片段，点击「试运行修改」，在隔离预览里检查结果，然后复制或下载。
7. 项目自动保存在当前浏览器；使用「保存项目」下载 JSON，之后可重新导入继续拼装。导入会校验模块类型、颜色与容量限制，失败时保留当前页面。
8. 在参考详情中复制配色，或将提取的配色应用到原创模块；在技能详情复制可直接使用的任务提示。

原生定价切换、标签页、FAQ、搜索面板、任务推进、步骤、筛选、偏好开关、点赞、表单校验和加载反馈均可交互。商业操作、登录、订阅与联系表单是本地演示，不连接真实支付、邮箱、身份或服务器，不会收集和上传输入。

## 资源与源码边界

- **原创模块和工作台代码**：本项目独立编写，MIT 许可。可复制、修改、组合与用于自己的项目。没有把第三方组件实现伪装为本站源码。
- **设计参考**：展示视觉语言摘要和源文件中可核对的色值。参考文档与品牌资产许可分开记录；不包含品牌 Logo、图片、专有字体、页面拷贝或完整 DESIGN.md。预览是「原创模块 × 参考配色」，不是品牌页面的重现。
- **开源资源**：提供实际官方文档、预览与仓库入口。框架库本身未装进工作台；采用库的真实组件时，应从官方文档复制或安装，并遵循各自许可。
- **React Bits**：当前仓库采用 MIT + Commons Clause，包含组件、工具、独立导出物等再分发限制。标为源码可见项目，仅链接，不打包其实现。[许可原文](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)。
- **Open Landing**：README 的 GPL 声明与附加再分发限制需要进一步澄清；目录标为特殊授权参考，不打包其实现。[上游说明](https://github.com/cruip/tailwind-landing-page-template#terms-and-license)。
- 本地 Awesome Design MD 副本的 README 声明 MIT，但副本缺少许可证正文；目录保留这一证据边界，未附全文。[上游](https://github.com/VoltAgent/awesome-design-md)。

预览 iframe 使用 `sandbox="allow-scripts"`，不开放父页面同源权限，并在自定义源码前放置 CSP。演示不请求外部运行时。源码编辑器的试运行结果可复制、下载；自由改写的 HTML 不自动反向转换为可视化图层。若要保留可继续拼装的项目，使用检查器、自定义 CSS 或项目 JSON。

localStorage 属于当前来源与浏览器；本地服务器、离线文件、在线站点之间不会自动同步。隐私模式、存储空间不足、清理浏览器或换设备可能影响保存；项目 JSON 是可靠的迁移方式。

## 自己扩充

```powershell
# 重新扫描本地技能和 DESIGN.md；不联网、不改原始文件
node scripts/refresh-local-catalog.mjs

# 指定自己的技能目录（可重复传参；指定后替换默认扫描根）
node scripts/refresh-local-catalog.mjs --skills-root D:\my-skills

# 只检查、不写入
node scripts/refresh-local-catalog.mjs --dry-run

# 生成包含最新界面和目录的离线单文件
node scripts/build-offline.mjs

# 检查模块输出、项目往返、导入边界与数据完整性
node scripts/check.mjs
```

开源资源存放在 `dist/data/catalog.json` 的 `resources`；本地参考位于 `dist/data/local-references.json`。刷新会保留已有的 resources 和人工维护的中文摘要。新增模块在 `dist/pattern-engine.js` 注册，案例协议与配方位于 `dist/case-model.js`；新增主题修改 engine 的 THEMES。详情见 EXTENDING.md。修改后重建离线版。

工程使用原生 ES modules，无 npm 运行时依赖。`npm start` 只调用内置 Node HTTP 服务器。将 `dist/` 作为静态目录即可部署。

## 目录

```text
dist/index.html               在线/本地 HTTP 入口
dist/offline.html             无需服务器的完整离线版
dist/app.css                  工作台视觉与响应式布局
dist/app.js                   交互、拼装、编辑器与存储
dist/engine.js                42 个模块的统一接口与源码生成引擎
dist/pattern-engine.js       12 个新增模块的定义、渲染与交互
dist/case-model.js           案例包验证、筛选与配方规划
dist/case-ui.js              案例库、对比、笔记与扩展 UI
dist/cases.css              案例库响应式样式
dist/data/site-cases.json    80 个网站案例与来源
dist/data/catalog.json        本地技能与开源资源索引
dist/data/local-references.json 设计参考、配色与来源
scripts/serve.mjs             本地服务器
scripts/build-offline.mjs     离线打包
scripts/refresh-local-catalog.mjs 本地索引刷新
scripts/check.mjs             核心验证
LICENSE                      原创代码 MIT 许可
```

快捷键：资源库按 `/` 搜索；拼装台用 Ctrl/⌘+Z 撤销，Ctrl/⌘+Shift+Z 重做，Ctrl/⌘+S 导出项目；Esc 关闭弹窗。输入框使用浏览器自己的撤销行为。
