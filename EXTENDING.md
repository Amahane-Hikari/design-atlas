# 扩充 Design Atlas

## 直接在网页里扩充

进入「公开网站案例 → 扩充我的库」。新增案例可填写名称、HTTPS 链接、内容分类、风格、设计模式、借鉴要点和适用边界，并选择一个原创配方。自己的案例可以随时编辑、移除；最近一次库修改可撤销。

在拼装台里完成页面后，点击「保存为我的配方」。保存可见模块的顺序、文案和完整主题，最多 40 个模块；自定义 CSS、隐藏模块及临时演示状态不进入配方。整页项目 JSON 仍能保存包括自定义 CSS 在内的项目内容。

导出「我的扩展包」可迁移案例、自定义配方、网站案例收藏和学习笔记。此扩展包与拼装台的「项目 JSON」格式不同。工作台把二者放在不同入口；原有模块、技能和参考收藏仍由旧收藏功能管理。

导入以 ID 去重：本地已有案例、笔记优先；收藏合并。完全相同的配方去重；相同 ID 但内容不同的配方会拒绝整包，要求重命名并同步案例引用，避免案例被悄悄接到别的结构。不会覆盖内置条目。整包校验成功后才写入浏览器，错误不改变已有数据。自动保存属于当前浏览器及来源，建议用 JSON 备份。若已存数据损坏，第一次修改前会创建独立恢复备份并校验；失败不会覆盖原始内容。备份可在「扩充我的库」导出。

## 案例包协议

```json
{
  "kind": "design-atlas.case-pack",
  "schemaVersion": 1,
  "cases": [{
    "id": "user-my-reference",
    "name": "我的参考网站",
    "url": "https://example.com/",
    "type": "个人网站",
    "category": "个人收藏",
    "summary": "解释这个页面怎样组织内容，以及为什么适合自己的项目。",
    "tags": ["写作"],
    "patterns": ["目录导航"],
    "styles": ["极简"],
    "takeaways": ["记录一个具体可迁移的设计决策。"],
    "caution": "说明哪些内容条件不适合这种布局。",
    "recipe": "user-my-recipe",
    "theme": "editorial"
  }],
  "recipes": [{
    "id": "user-my-recipe",
    "name": "我的文章页",
    "description": "以文章目录为中心的简洁结构。",
    "theme": "editorial",
    "blocks": [
      {"type": "intro-index", "props": {"title": "我的小小角落。"}},
      {"type": "article-list", "props": {}},
      {"type": "footer", "props": {}}
    ]
  }],
  "user": {"notes": {}, "favorites": []}
}
```

网站类型是「个人网站」「作品集」「产品页」「工作室」之一。自定义 ID 以 `user-` 开头；案例可引用内置或同包配方，主题使用内置主题 ID。配方 theme 也可为含 `id` 的完整主题对象，颜色为六位十六进制，font 为 sans/serif/mono，radius 为 0–40，space 为 24–120，style 为 soft/flat/brutal。

上限：文件 4 MiB、案例 500 项、配方 100 项、每配方 40 模块、每条笔记 4,000 字符。模块 props 只接收已经注册的文本属性；导入不支持执行脚本或加载远程模块。链接只接受不带凭据的 HTTPS，拒绝可识别的本地和私有地址；本地校验不做 DNS 解析，也不会自动访问这些链接。

用户导入的证据统一标记为「用户整理 · 尚未核实」，不能通过 JSON 伪造内置库的核实状态。

```powershell
node scripts/check-case-pack.mjs .\my-cases.json
```

## 新增一种可玩模块

`dist/pattern-engine.js` 是新增原创模块的注册入口：

1. 给 `EXTRA_BLOCKS` 添加唯一 ID、名称、分类、说明、默认文本 props 与 tags。
2. 在同文件的 `renderers` 增加对应 ID 的函数，返回模块内部 HTML。最外层 section 和唯一 UID 由 engine 创建。
3. 把 CSS 加入 `EXTRA_CSS`，选择器限定新模块根类或专属类。
4. 把交互加入 `EXTRA_JS` 的自包含作用域，使用专属 `data-*`；事件只在所属 section 内查找元素。同类型模块重复加入时也应独立工作。
5. 所有文本插值使用 `escapeHTML`；控件 ID 从块 UID 派生。不要接入品牌资源或隐藏网络请求。

新模块会自动进入资源库、检查器、项目验证和可保存配方。props 是字符串；多行内容可以用 `items`，每行一项、以 `|` 分隔字段。显示器最多展示 20 行。若需要数组等新类型，应显式升级协议和检查器，不能静默改变 v1。

`dist/engine.js` 保留原来的 30 个模块与 v1 项目接口，合并新增模块注册表；重复 ID 会报错。新增整页模板在 TEMPLATES 中注册，新增内置设计配方在 `dist/case-model.js` 的 RECIPES 中注册。

## v3 模块样式与动效协议

每个图层可带可选的 `style` 对象与 `label`（≤60 字符）；项目可带 `effects`。三者都由 `dist/fx-runtime.js` 的 `normalizeBlockStyle` / `normalizeEffects` 校验：只接受登记过的选项、六位十六进制颜色与限定范围的数值，其余回落到默认值，并且只保存与默认不同的键。

```json
{"type":"hero-gradient","props":{},"label":"首屏","style":{"tone":"dark","pattern":"stars","patternOpacity":70,"enter":"blur","trigger":"load","stagger":true,"hover":"lift","text":"gradient","css":"& h1 { letter-spacing: -3px; }"}}
```

- 新增选项：在 `FX_OPTIONS` 登记 ID 与中文名，在 `FX_CSS` 写对应规则（入场动效需同名 `@keyframes fx-<id>`，使用 `translate`/`scale`/`rotate` 等独立变换属性，避免覆盖模块自身的 `transform`）。检查器与特效实验室会自动出现新选项。
- 区块渲染时 `sectionFx` 把样式转换为 `data-*` 属性、内联 CSS 变量和装饰层；模块 CSS 统一作用于 `#s-<uid>`，并移除 `</style`。
- v3 原创模块在 `dist/fx-blocks.js` 注册：`FX_BLOCKS` 定义（可选 `fields` 给列表编辑器提供字段名），`R` 中的渲染函数，`FX_BLOCK_CSS` 与 `FX_BLOCK_JS`。需要按模块初始化的脚本推入 `window.__atlasHooks`，签名为 `(section,{edit})`；滚动驱动的效果给钩子加 `scroll` 方法。所有交互用事件委托或钩子，以便画布局部刷新后继续工作。
- 画布编辑桥 `EDITOR_JS` 只在拼装台预览中注入：它通过带一次性 token 的 postMessage 提出「选择、改字、移动、插入、操作」请求，工作台校验图层、字段与模块类型后才写入项目。导出与详情预览不包含编辑桥。
- 画布双击改字按「元素自身文本 = 某个文本字段 / 列表单元」匹配，所以渲染时请直接输出转义后的字段值；拼接了其他文字的元素只能在检查器中修改。

## v4 自由编辑协议

- `block.style.free` 以「子元素路径」为键：`"3/2"` 表示模块的第 3 个内容子元素中的第 2 个子元素（顶层计数会跳过 `.fx-bg`、`.fx-img`、`.fx-divider` 装饰层）。路径最多 12 层、每层 1–999，最多 80 条。
- 每条只接受 `x`、`y`、`rotate`、`scale`、`w`、`opacity`、`z`、`color`、`bg`、`size`、`weight`、`align`、`lh`、`tracking`、`radius`、`pad`、`border`、`borderColor`、`shadow`、`blur`、`italic`、`upper`、`hidden`，由 `normalizeFree` 限定范围；编译为 `#s-<uid>>:nth-child(n of :not(装饰层))>…` 规则，位移、旋转、缩放使用独立的 `translate` / `rotate` / `scale` 属性，不覆盖模块自身的 `transform`。
- 路径依赖模块的 DOM 结构：给列表增删条目后，后面元素的路径会顺延。自定义模块时尽量保持结构稳定；需要长期稳定的文本字段优先使用 `data-f`。
- 外壳样式：新组件样式写进 `atlas.css` 并使用 `--a-*` 设计变量；改动旧样式文件后运行 `npm run tokenize` 重新生成颜色变量。

## v3.1 素材、元素样式与图片位

- **素材**：项目可带 `assets`：`{"a-<id>":{"d":"data:image/webp;base64,…","n":"名称","w":1600,"h":900}}`。`normalizeAssets` 只接受 PNG / JPEG / WebP / GIF 的 base64 data URL，单张约 1.4M 字符、最多 24 张、合计约 4.5M 字符；SVG、远程地址和其他格式都会被丢弃。导出页面只包含被模块引用的图片。
- **图片位**：渲染器给任意元素加 `data-media="slot"` 就成为可替换的图片位，`block.style.media` 把槽名映射到素材 ID，渲染为作用于 `#s-<uid>` 的背景图规则，并隐藏原有的占位图形。新模块建议用 `media-blocks.js` 里的 `ph(slot,i)` 占位，槽名用小写字母、数字和连字符。
- **元素样式**：给文本元素加 `data-f="eyebrow|title|subtitle|button|secondary"`，即可在画布里点选并在「元素」面板单独设置；`block.style.els` 只接受颜色、字号（50–240%）、字重、对齐、字距、斜体、大写、隐藏。
- **背景图**：`block.style.image` 指向素材，配合 `imageFit`、`imagePos`、`overlay`、`overlayColor`、`imageBlur`；渐变用 `bg2`、`bg3`、`gradType`、`gradAngle`；滚动特效为 `scroll`。
- **外壳颜色**：修改 `app.css`、`cases.css`、`studio.css`、`v3.css` 后运行 `node scripts/tokenize-colors.mjs`，新写的颜色会变成变量并自动生成深色值；只在 `[data-ui=dark]` 规则里写的颜色保持原样。

## 案例数据与来源

内置网站案例位于 `dist/data/site-cases.json`。每条包含来源、核对日期、实际阅读范围、借鉴建议与配方关联。新增内置案例必须读过原站内容，使用 `content-reviewed`；只有完成真实浏览器观察的范围才记录为 `browser-sampled`，并写明页面与动作。

风格、布局、主题及配方是适配建议；不要用内容读取冒充完整视觉审计，也不要从公开访问推导源码再分发许可。详情预览由本站原创模块生成，不是原站截图或拷贝。

## 模块和离线构建

依赖顺序为 `fx-runtime → fx-blocks → media-blocks → pattern-engine → engine → case-model → case-ui → workspace-model → studio-model → studio-ui → builder-ui → app`。`case-model` 和 `workspace-model` 本身无网络、DOM 或存储依赖。`case-ui` 通过 app 提供的桥接接口提交整页修改；主题、追加、替换都是一次项目事务，可一步撤销。

`studio-model.js` 提供全局检索、同类布局替换及独占锁下的项目库写入。`studio-ui.js` 负责项目库、命令搜索与持久化，调用 app 桥接接口打开资源或提交项目事务；不要直接持有和修改 app 的草稿对象。新增可搜索资源时补充 `getItems()` 和对应打开行为。

项目库使用 `design-atlas.workspace` / `schemaVersion:1` 封包和独立存储键 `design-atlas.workspace.v1`。这与当前草稿 `design-atlas.project.v1`、案例扩展包分别管理。项目库校验保留合法唯一图层 UID，保证重复校验结果稳定；导入先完整验证，再整体写入。保存动作必须 await `writeWorkspaceAtomically`，比较、写入与读回都位于 Web Locks 独占锁内。不支持 Web Locks 时拒写库并引导下载项目，不使用会丢数据的跨标签页降级。

源码分屏在 `app.js` 的 `renderCode` / `runCode` 中实现。完整 HTML、项目 JSON 与组合片段是三种独立预览来源，不自动相互改写；关闭窗口会取消更新定时器并清空 iframe。预览保持 `sandbox="allow-scripts"` 和原有 CSP。

离线打包采用固定模块清单、独立作用域与显式命名导入；新增文件时更新 `scripts/build-offline.mjs` 的 order。构建遇到未知依赖或不支持的 import/export 语法会报错。

```powershell
node scripts/build-offline.mjs
node scripts/check.mjs
node scripts/check-cases.mjs
node scripts/serve.mjs
```

浏览器验收至少覆盖新模块重复实例、键盘和窄屏、配方应用与撤销、导出源码交互、扩展包往返、单文件初始化。v2 能读取原有 v1 项目；带新增模块的项目不保证能被旧版工作台读取。
