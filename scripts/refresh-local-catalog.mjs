#!/usr/bin/env node
/**
 * Offline, dependency-free metadata indexer. This file never executes skills,
 * follows their operational instructions, copies their full text, or fetches URLs.
 * --skills-root may be repeated; explicit roots replace the three default roots.
 * Every localPath is relative to its scanned root, including plugin-cache paths.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_DATE = '2026-10-22';
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDirectory = path.resolve(scriptDirectory, '../dist/data');
const ignoredDirectories = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'venv']);
const backupDirectory = /^(?:plugin-backup(?:-|$)|\.remote-plugin-install-staging$)/i;
const profiles = new Map();

// Public capability summaries, deliberately independent of private skill bodies.
// The allowlist is editorial: generic backends, account/chat readers, unrelated
// documents, spreadsheets, games, and repository-maintenance skills are excluded.
function profile(names, category, role, description, capabilities, tags = []) {
  for (const name of names.split('|')) profiles.set(name, { category, role, description, capabilities, tags });
}
profile('design-md-library', '设计参考', 'design', '检索本地 DESIGN.md 设计参考，选择视觉方向并提炼可迁移的设计系统。', ['参考选型', '色彩与排版系统', '网站设计研究'], ['DESIGN.md', '设计系统']);
profile('imagegen', '图像与字体', 'design', '根据需求生成或编辑图片、插画、纹理和透明背景素材。', ['图像生成与编辑', '透明背景素材', '视觉方案探索'], ['图像', '素材']);
profile('adobe-fonts', '图像与字体', 'design', '查找和预览 Adobe Fonts 字体，比较语言覆盖、字重与字体搭配。', ['字体检索与预览', '语言与字重检查', '字体搭配'], ['字体', '排版', 'Adobe']);
profile('adobe-batch-edit-photos', '图像与字体', 'design', '批量统一照片的曝光、色调和视觉风格，用于网站图片素材。', ['批量照片调整', '色调一致性', '网站图片素材'], ['图像', 'Adobe']);
profile('adobe-retouch-portraits', '图像与字体', 'design', '批量修饰人像照片，准备可供视觉方案审阅的人像素材。', ['人像修饰', '批量素材处理', '视觉审阅'], ['人像', '图像', 'Adobe']);
profile('adobe-create-mockups', '图像与字体', 'design', '将已有标志或设计放入产品、设备和场景样机，预览展示效果。', ['样机展示', '设计场景化', '视觉效果预览'], ['样机', '品牌展示', 'Adobe']);
profile('adobe-design-from-template', '图像与字体', 'design', '使用 Adobe Express 模板制作海报、缩略图和网站传播视觉素材。', ['模板选型', '宣传视觉素材', '版式适配'], ['模板', '视觉素材', 'Adobe']);
profile('adobe-create-social-variations', '图像与字体', 'build', '为图片和视频制作不同画幅与尺寸的传播版本。', ['裁切与缩放', '多画幅适配', '图像与视频导出'], ['素材适配', 'Adobe']);
profile('adobe-edit-quick-cut', '动画与媒体', 'design', '从原始视频制作重点片段，准备网站宣传和演示素材。', ['重点片段剪辑', '视频视觉素材', '宣传短片'], ['视频', 'Adobe']);
profile('ffmpeg-skill', '动画与媒体', 'build', '使用本地 FFmpeg 转码、裁切、拼接和优化网页所需的音视频素材。', ['音视频转码', '字幕与叠加', '尺寸与体积处理'], ['FFmpeg', '视频', '素材']);
profile('jianying-editor', '动画与媒体', 'build', '制作可编辑剪映工程，支持素材、字幕、录屏与 Web 动效合成。', ['可编辑视频工程', '字幕与素材编排', 'Web 动效合成'], ['剪映', '视频', '动效']);
profile('hatch-pet', '动画与媒体', 'design', '制作和修复带多方向状态的动画精灵图，进行逐帧视觉检查。', ['动画精灵图', '透明素材', '帧序列视觉检查'], ['精灵图', '角色动画']);
profile('live2d-end-to-end', '动画与媒体', 'build', '从角色分层与绑定到动态模型和网页展示验收，形成可追溯的角色动画流程。', ['角色分层与绑定', '动态模型', '网页展示验收'], ['Live2D', '角色动画', 'Web']);
profile('create-pet', '动画与媒体', 'design', '创建和验证用于 ChatGPT Work 的动画角色与精灵图。', ['角色视觉设计', '动画精灵图', '动画预览验证'], ['精灵图', '角色动画', 'ChatGPT Work']);
profile('update-pet', '动画与媒体', 'design', '检查、修复和更新已有动画角色的精灵图、外观与预览。', ['精灵图修复', '动画状态检查', '角色外观更新'], ['精灵图', '角色动画', 'ChatGPT Work']);
profile('hyperframes', '动画与媒体', 'build', '以 HTML 构建动画、视频合成、字幕与场景转场。', ['HTML 视频合成', '字幕与转场', '动画时间编排'], ['HTML', '动画', 'HyperFrames']);
profile('gsap', '动画与媒体', 'build', '在 HyperFrames 中使用 GSAP 的缓动、错峰、时间线和变换动画。', ['GSAP 时间线', '缓动与错峰', '动画性能处理'], ['GSAP', '动画', 'HyperFrames']);
profile('hyperframes-cli', '动画与媒体', 'verify', '使用 HyperFrames CLI 预览、检查和渲染 HTML 动画作品。', ['动画预览', '布局检查', '渲染与诊断'], ['CLI', '动画', 'HyperFrames']);
profile('hyperframes-registry', '动画与媒体', 'build', '安装和接入 HyperFrames 动画组件与可复用区块。', ['动画组件复用', '注册表区块', '合成配置'], ['组件', '动画', 'HyperFrames']);
profile('website-to-hyperframes', '动画与媒体', 'build', '从网站展示内容制作 HTML 视频和产品演示动画。', ['网站画面采集', '产品演示动画', 'HTML 视频'], ['网站演示', '动画', 'HyperFrames']);
profile('watch', '设计参考', 'verify', '分析参考视频的时间轴、关键帧和屏幕文字，支持界面动效研究。', ['关键帧提取', '时间轴转录', '屏幕文字分析'], ['视频参考', 'OCR', '动效研究']);
profile('visualize', '可视化', 'design', '在对话中预览交互示意、图表、模拟和界面草图。', ['交互原型示意', '图表与模拟', '界面方案探索'], ['原型', '可视化']);
profile('visualize-data', '可视化', 'design', '为报告、仪表盘等可交付成果设计并验证数据图表。', ['图表设计', '可视化编码', '图表可读性验证'], ['图表', '仪表盘']);
profile('build-dashboard', '可视化', 'build', '根据可核查的数据构建可编辑、可探索的交互仪表盘。', ['交互仪表盘', '数据来源追溯', '筛选与探索'], ['仪表盘', '交互']);
profile('build-report', '可视化', 'design', '编排具有可核查证据的报告页面，组织图表、结论与阅读层次。', ['报告信息层次', '图表与叙事', '证据关联'], ['报告', '信息设计']);
profile('publish-artifact-to-sites', '部署与交付', 'build', '将已有分析报告或仪表盘发布到 Sites 并核对交付链接。', ['报告页面发布', '仪表盘交付', '发布结果核对'], ['Sites', '仪表盘', '发布']);
profile('sites', '网站构建', 'build', '构建和修改落地页、作品集、仪表盘及交互网站。', ['网站与页面构建', '交互功能实现', '网站预览与发布'], ['网站', '前端']);
profile('sites-remix', '网站构建', 'build', '从已发布的 Sites 网站创建独立副本，再按需求调整设计和功能。', ['网站副本', '视觉与内容适配', '独立交付'], ['Sites', '网站', '复用']);
profile('react-best-practices', 'UI 工程', 'verify', '检查 React 与 TypeScript 组件的结构、状态、可访问性和性能。', ['React 组件检查', 'Hooks 与状态', '可访问性与性能'], ['React', 'TypeScript', '组件']);
profile('ai-sdk', 'UI 工程', 'build', '为 AI 聊天等前端界面接入流式状态、消息和结构化结果。', ['聊天界面接入', '流式交互状态', '结构化结果呈现'], ['AI SDK', '聊天 UI', '流式']);
profile('microfrontends', 'UI 工程', 'build', '组织可独立部署的前端应用，处理跨应用路由与渐进迁移。', ['微前端集成', '跨应用路由', '前端独立部署'], ['微前端', '路由']);
profile('flags-sdk', 'UI 工程', 'build', '通过功能开关与实验控制前端功能的展示和逐步开放。', ['功能开关', '界面实验', '逐步开放'], ['功能开关', '实验']);
profile('routing-middleware', 'UI 工程', 'build', '配置网站请求路由、重写与重定向，支持前端页面导航。', ['页面重写', '导航重定向', '网站请求路由'], ['路由', 'Vercel']);
profile('reverse-engineer-anything', 'UI 工程', 'verify', '依据已交付的 Electron、JavaScript 或浏览器应用，研究可验证的界面行为。', ['已交付应用检查', '浏览器行为证据', '界面实现对照'], ['Electron', '浏览器', '行为验证']);
profile('playwright', '浏览器验收', 'verify', '使用真实浏览器验证页面导航、交互、截图和界面状态。', ['浏览器交互验收', '页面截图', '界面状态检查'], ['Playwright', '浏览器']);
profile('screenshot', '浏览器验收', 'verify', '截取桌面、窗口或指定区域，保留界面视觉验收证据。', ['界面截图', '窗口与区域采集', '视觉证据'], ['截图', '视觉验收']);
profile('computer-use', '浏览器验收', 'verify', '通过受支持的计算机界面执行操作，检查可见界面行为。', ['可见界面检查', '交互操作', '界面证据'], ['界面操作', '视觉验收']);
profile('verification', '浏览器验收', 'verify', '验证网站从浏览器到接口和数据的完整用户流程。', ['端到端流程', '接口与页面联动', '运行结果验证'], ['端到端', 'Vercel']);
profile('access-protected-vercel-deployment', '浏览器验收', 'verify', '在已有授权下访问受 Vercel 保护的预览并完成浏览器验收。', ['受保护预览访问', '浏览器验收', '授权状态检查'], ['Vercel', '预览验收']);
profile('is-agentic', '浏览器验收', 'verify', '检查网站对 AI 代理的可用性，读取评分报告并定位改进项。', ['网站代理可用性', '报告解读', '页面问题定位'], ['网站可用性', '代理']);
profile('web-perf', '性能优化', 'verify', '测量页面加载性能、Core Web Vitals 与 Lighthouse 指标。', ['页面加载性能', 'Core Web Vitals', 'Lighthouse 诊断'], ['性能', 'Lighthouse']);
profile('cdn-caching', '性能优化', 'verify', '分析网站缓存命中、陈旧内容和页面重新验证行为。', ['CDN 缓存诊断', '页面新鲜度', '重新验证行为'], ['CDN', '缓存', '性能']);
profile('vercel-deploy', '部署与交付', 'build', '为前端项目创建 Vercel 预览或生产部署。', ['前端预览部署', '生产部署', '部署结果交付'], ['Vercel', '部署']);
profile('deployments-cicd', '部署与交付', 'build', '组织 Vercel 的前端构建、预览、发布与回退流程。', ['构建与预览', '发布流程', '版本回退'], ['Vercel', 'CI/CD', '部署']);
profile('vercel-cli', '部署与交付', 'build', '通过 Vercel CLI 管理网站部署、预览与运行日志。', ['网站部署', '预览管理', '运行日志检查'], ['Vercel', 'CLI', '部署']);

function slash(value) { return value.split(path.sep).join('/'); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function textOnly(value, limit = 420) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function publicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || /^(?:localhost|127\.|192\.168\.|10\.|\[::1\])/.test(url.hostname)) return null;
    if (/token|secret|api[_-]?key|signature|credential/i.test(url.search)) return null;
    return url.href;
  } catch { return null; }
}
function read(file) { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); }
function exists(file) { return fs.existsSync(file); }
function frontmatter(text) { return text.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1] || ''; }
function yamlScalar(block, key) {
  const lines = block.split('\n');
  const at = lines.findIndex(line => new RegExp(`^${key}:`).test(line));
  if (at < 0) return '';
  let value = lines[at].slice(lines[at].indexOf(':') + 1).trim();
  if (/^[>|][-+]?\s*$/.test(value) || !value) {
    const chunks = [];
    for (let i = at + 1; i < lines.length; i++) {
      if (lines[i].trim() && !/^\s/.test(lines[i])) break;
      chunks.push(lines[i].trim());
    }
    value = chunks.join(' ');
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function inferProfile(name, description) {
  // Conservative support for newly installed frontend skills. Match public
  // frontmatter, never body rules that merely mention a browser incidentally.
  if (/^(?:eve|agents|build-agents|shipping-across-surfaces)$|security|backend|back-end|api-key|platform-api|openai-docs|github|chatlab|wechat|qq-reader|skill-installer|skill-creator|artifact-template|google-(?:docs|sheets|slides)|gmail|cli-creator|mcp-server|releas|ci-pipeline|reproducing-ci|defect-report|concurrent-branches|build-artifacts|git-hygiene/i.test(name)) return null;
  const text = `${name} ${description}`;
  const rules = [
    [/\b(?:lighthouse|core web vitals|web performance|page-load performance)\b|网页性能|页面加载性能/i, '性能优化', 'verify', ['页面性能测量', '性能问题定位']],
    [/\b(?:playwright|browser testing|browser automation|visual regression)\b|浏览器验收|浏览器自动化|视觉回归/i, '浏览器验收', 'verify', ['浏览器交互检查', '界面结果验证']],
    [/\b(?:animation|motion design|sprite|gsap)\b|动效|精灵图|角色动画/i, '动画与媒体', 'build', ['界面动效', '动画素材处理']],
    [/\b(?:image generation|image editing|typography|font pairing)\b|图像生成|图像编辑|字体搭配/i, '图像与字体', 'design', ['视觉素材制作', '设计方案探索']],
    [/\b(?:design system|ui design|ux design|web design|design reference)\b|设计系统|网页设计|视觉参考/i, '设计参考', 'design', ['界面设计参考', '设计系统应用']],
    [/\b(?:frontend|front-end|css|tailwind|react|vue|svelte|storybook|responsive layout|web accessibility)\b|前端|响应式布局|网页无障碍/i, 'UI 工程', 'build', ['前端界面实现', '界面质量检查']],
  ];
  for (const [pattern, category, role, capabilities] of rules) {
    if (pattern.test(text)) return { category, role, description: `支持${category}工作；依据本地技能公开说明自动归类，使用前需核对适用范围。`, capabilities, tags: ['自动归类', category], inferred: true };
  }
  return null;
}

function inventoryRoot(root, statistics) {
  const skillFiles = [], referenceFiles = [];
  const seen = new Set();
  function visit(directory) {
    const real = fs.realpathSync(directory);
    if (seen.has(real)) return;
    seen.add(real);
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      // Never follow junctions/symlinks into personal material or recursive trees.
      if (entry.isSymbolicLink()) { statistics.symlinksSkipped++; continue; }
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue;
        if (backupDirectory.test(entry.name)) {
          // Read only SKILL.md metadata in cache backups for scan accounting;
          // those copies are never candidates for published capability entries.
          const before = skillFiles.length;
          visit(file);
          for (let i = before; i < skillFiles.length; i++) skillFiles[i].backup = true;
        } else visit(file);
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        skillFiles.push({ file, backup: false });
      } else if (entry.isFile() && entry.name === 'DESIGN.md') referenceFiles.push(file);
    }
  }
  if (exists(root.directory)) visit(root.directory);
  else statistics.missingRoots.push(root.label);
  return { skillFiles, referenceFiles };
}

function pluginMetadata(file, root) {
  let current = path.dirname(file);
  while (current.startsWith(root.directory + path.sep)) {
    const manifest = path.join(current, '.codex-plugin/plugin.json');
    if (exists(manifest)) {
      const data = JSON.parse(read(manifest));
      return { name: data.name || path.basename(path.dirname(current)), repository: publicUrl(data.repository), directory: current };
    }
    current = path.dirname(current);
  }
  return null;
}

function skillEntry(file, root) {
  const body = read(file).replace(/\r\n/g, '\n');
  const metadata = frontmatter(body);
  const name = yamlScalar(metadata, 'name') || path.basename(path.dirname(file));
  const definition = profiles.get(name) || inferProfile(name, yamlScalar(metadata, 'description'));
  if (!definition) return null;
  const plugin = pluginMetadata(file, root);
  const owner = plugin ? slug(plugin.name) : root.kind;
  const doc = metadata.match(/https:\/\/[^\s"'<>]+/g)?.map(publicUrl).find(Boolean);
  const source = doc || plugin?.repository || 'local';
  const prerequisites = plugin ? '如需连接器或外部服务，先确认当前会话已连接所需能力。' : '';
  return {
    id: `skill-${owner}-${slug(name)}`,
    name,
    description: definition.description,
    category: definition.category,
    tags: [...new Set([...definition.tags, definition.role])],
    role: definition.role,
    source,
    localPath: slash(path.relative(root.directory, file)),
    capabilities: definition.capabilities,
    prompt: `使用 ${name}，围绕当前项目的目标与现有视觉语言完成${definition.capabilities.join('、')}。先读取对应技能的适用范围，再交付可审阅结果并说明验证证据。${prerequisites}`,
  };
}

const categoryNames = {
  'AI & LLM Platforms': 'AI 品牌', 'Developer Tools & IDEs': '开发工具',
  'Backend, Database & DevOps': '技术产品', 'Productivity & SaaS': '效率与协作',
  'Design & Creative Tools': '设计与创意', 'Fintech & Crypto': '金融科技',
  'E-commerce & Retail': '电商与零售', 'Media & Consumer Tech': '媒体与消费科技',
  Automotive: '汽车与硬件', 'Retro Web · DESIGN.md Nostalgia': '复古网页',
};
function libraryContext(file, root) {
  let directory = path.dirname(file);
  while (directory.startsWith(root.directory + path.sep)) {
    const readme = path.join(directory, 'README.md');
    if (exists(readme)) {
      const body = read(readme);
      if (body.includes('github.com/VoltAgent/awesome-design-md')) {
        const entries = new Map();
        let category = '设计系统';
        for (const line of body.split(/\r?\n/)) {
          if (line.startsWith('### ')) category = categoryNames[line.slice(4).trim()] || '设计系统';
          const match = line.match(/^- \[\*\*(.+?)\*\*\]\((https:\/\/getdesign\.md\/([^/)]+)\/design-md)\)\s*-\s*(.+)/);
          if (match) entries.set(match[3], { name: match[1], source: match[2], description: match[4], category });
        }
        const licenses = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'].map(name => path.join(directory, name)).filter(exists);
        const licenseBody = licenses.map(read).join('\n');
        const licenseDeclared = /MIT License/i.test(body);
        const licenseVerified = /Permission is hereby granted, free of charge/i.test(licenseBody) && /THE SOFTWARE IS PROVIDED/i.test(licenseBody);
        return { directory, readme, body, entries, licenseDeclared, licenseVerified, licenses };
      }
    }
    directory = path.dirname(directory);
  }
  return null;
}
function firstParagraph(body) {
  const withoutFrontmatter = body.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const paragraphs = withoutFrontmatter.split(/\n\s*\n/);
  return paragraphs.find(part => !/^\s*(?:#|[-*]|\||```|<)/.test(part) && part.trim().length > 45) || '';
}
function extractColors(body) {
  const metadata = frontmatter(body);
  const palette = metadata.match(/^colors:\s*\n([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1];
  const raw = (palette || body).match(/(?<![\w/#-])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b/gi) || [];
  return [...new Set(raw.map(color => color.toUpperCase()))];
}
function extractDesignTokens(body) {
  const palette = frontmatter(body).match(/^colors:\s*\n([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1] || '';
  const values = Object.fromEntries([...palette.matchAll(/^\s+([\w-]+):\s*["']?(#[\da-f]{6})["']?\s*$/gmi)].map(([, key, value]) => [key.toLowerCase(), value.toUpperCase()]));
  const aliases = { accent:['primary','accent','brand','brand-primary'], bg:['canvas','background','bg','canvas-primary'], surface:['surface-1','surface-card','surface','canvas-soft','surface-soft'], ink:['ink','foreground','text-primary','text'], muted:['ink-muted','ink-mute','muted','mute','ink-secondary','body'] };
  const tokens = {};
  for (const [target, keys] of Object.entries(aliases)) { const value=keys.map(k=>values[k]).find(Boolean); if(value) tokens[target]=value; }
  const family = body.match(/fontFamily:\s*([^\n]+)/)?.[1] || '';
  tokens.font = /mono/i.test(family) ? 'mono' : /(?<!sans-)\bserif\b/i.test(family) ? 'serif' : 'sans';
  return tokens;
}
function referenceTags(description, category, id) {
  const tags = [category, 'DESIGN.md'];
  const text = description.toLowerCase();
  for (const [pattern, label] of [
    [/dark|near-black|black canvas|midnight|深色|暗色/, '深色'],
    [/white|cream|paper|浅色|白色/, '浅色'], [/minimal|restrain|quiet|极简/, '克制'],
    [/editorial|typograph|杂志|排版/, '编辑式排版'], [/gradient|glow|neon|霓虹|渐变/, '渐变与光效'],
    [/cinema|photo|image|摄影|影像/, '影像主导'], [/dashboard|data-dense|仪表盘/, '数据界面'],
    [/retro|1996|2001|复古/, '复古'], [/playful|illustrat|插画/, '插画与趣味'],
  ]) if (pattern.test(text)) tags.push(label);
  if (id === 'cho-kaguyahime') tags.push('动画官网', '角色专题', '和风', '霓虹', '舞台构图');
  return [...new Set(tags)];
}
function referenceEntry(file, root, cache) {
  const body = read(file).replace(/\r\n/g, '\n');
  const localPath = slash(path.relative(root.directory, file));
  const id = path.basename(path.dirname(file));
  const libraryKey = file.split(`${path.sep}design-md${path.sep}`)[0];
  if (!cache.has(libraryKey)) cache.set(libraryKey, libraryContext(file, root));
  const library = cache.get(libraryKey);
  const item = library?.entries.get(id);
  const metadataDescription = yamlScalar(frontmatter(body), 'description');
  const description = id === 'cho-kaguyahime'
    ? '官方动画电影网站的本地设计研究：贯穿页面的圆形舞台、和风霓虹母题、深浅章节、内容专属组件，以及手机端重新构图。'
    : textOnly(metadataDescription || firstParagraph(body) || item?.description || '本地 DESIGN.md 设计参考；包含可供核对的视觉系统分析。', 360);
  const shortDescription = description.match(/^(.{45,}?)[.!。](?:\s|$)/)?.[1] || description;
  const title = body.match(/^#\s+(.+)$/m)?.[1];
  const name = id === 'cho-kaguyahime' ? '超かぐや姫！' : item?.name || (id === 'slack' ? 'Slack' : textOnly(title?.replace(/^Design System Inspired by\s+/i, '') || id, 90));
  const category = id === 'cho-kaguyahime' ? '动画与音乐企划' : item?.category || (id === 'slack' ? '效率与协作' : '设计系统');
  const pairedReadme = path.join(path.dirname(file), 'README.md');
  const pairedLink = exists(pairedReadme) ? read(pairedReadme).match(/https:\/\/getdesign\.md\/[^\s)]+\/design-md/)?.[0] : null;
  // A subject's homepage is not an upstream URL for the local research document.
  const source = publicUrl(pairedLink) || publicUrl(item?.source) || 'local';
  const documentLicense = library ? {
    id: library.licenseDeclared ? 'MIT' : 'NOASSERTION',
    status: library.licenseVerified ? 'verified-local-license' : library.licenseDeclared ? 'declared-in-readme-license-file-missing' : 'not-established',
    source: library.licenseDeclared ? 'https://github.com/VoltAgent/awesome-design-md#license' : 'local',
    evidence: `${slash(path.relative(root.directory, library.readme))}#License`,
    fullTextRedistributable: library.licenseVerified,
    note: library.licenseVerified ? '本地许可证文本存在；再分发仍需保留版权与许可声明。' : '本地 README 声明 MIT 并链接 LICENSE，但当前副本未包含许可证正文；未进行联网核验。',
  } : {
    id: 'NOASSERTION', status: 'not-established', source: 'local', evidence: localPath,
    fullTextRedistributable: false, note: '本地研究未发现明确的再分发许可；仅提供原创能力摘要与颜色事实，不附全文。',
  };
  const notes = [
    `本地文件：${localPath}`,
    library ? '来源链接仅由本地上游 README/配套 README 核对，未访问网络，也未验证远端当前可用性。' : '本地直接研究，独立于 awesome-design-md；source=local 不代表研究对象网站没有公开来源。',
    'colors 来自原文颜色声明（优先 frontmatter colors），未从品牌印象补造；没有可提取值时为空数组。',
    '仅发布名称、简要说明、分类标签、颜色事实和来源/许可证据；不附 DESIGN.md 全文或品牌资产。',
  ];
  if (id === 'cho-kaguyahime') notes.push('研究对象：https://www.cho-kaguyahime.com/；研究记录日期 2026-09-09；本文不是该站官方设计规范。');
  if (library && !item) notes.push('此本地文件未列入上游 README 的 Collection；保留本地证据，未猜测远端文档地址。');
  return {
    id, name, category, tags: referenceTags(description, category, id), description: shortDescription,
    colors: extractColors(body), designTokens: extractDesignTokens(body), source, kind: 'reference',
    license: {
      document: documentLicense,
      brandAssets: { id: 'NOT-GRANTED', note: '参考文档许可不授予品牌商标、标志、摄影、插画、人物、文案、专有字体或其他品牌素材的使用权；相关素材须单独核实授权。' },
    },
    notes,
  };
}

export function defaultRoots() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return [
    { directory: path.join(codexHome, 'skills'), label: 'CODEX_HOME/skills', kind: 'codex' },
    { directory: path.join(os.homedir(), '.agents/skills'), label: 'HOME/.agents/skills', kind: 'agents' },
    { directory: path.join(codexHome, 'plugins/cache'), label: 'CODEX_HOME/plugins/cache', kind: 'plugin' },
  ];
}

export function scanCatalog(options = {}) {
  const roots = (options.roots || defaultRoots()).map((root, index) => typeof root === 'string'
    ? { directory: path.resolve(root), label: `skills-root-${index + 1}`, kind: `root-${index + 1}` }
    : { ...root, directory: path.resolve(root.directory) });
  const statistics = { roots: [], skillsScanned: 0, backupSkillsExcluded: 0, unrelatedSkillsExcluded: 0, duplicateSkillsExcluded: 0, duplicateReferencesExcluded: 0, symlinksSkipped: 0, missingRoots: [], inferredSkills: [] };
  const skills = new Map(), references = new Map(), contextCache = new Map();
  const realFiles = new Set();
  for (const root of roots) {
    const files = inventoryRoot(root, statistics);
    statistics.roots.push({ root: root.label, skillsScanned: files.skillFiles.length, referencesScanned: files.referenceFiles.length });
    for (const candidate of files.skillFiles) {
      statistics.skillsScanned++;
      // Parse every discovered SKILL.md, including excluded candidates, but
      // export only the curated public summaries above.
      frontmatter(read(candidate.file).replace(/\r\n/g, '\n'));
      if (candidate.backup) { statistics.backupSkillsExcluded++; continue; }
      const real = fs.realpathSync(candidate.file);
      if (realFiles.has(real)) { statistics.duplicateSkillsExcluded++; continue; }
      realFiles.add(real);
      const entry = skillEntry(candidate.file, root);
      if (!entry) { statistics.unrelatedSkillsExcluded++; continue; }
      if (entry.tags.includes('自动归类')) statistics.inferredSkills.push(entry.name);
      if (skills.has(entry.id)) {
        // Natural version ordering selects the latest installed cached copy.
        const previous = skills.get(entry.id);
        if (entry.localPath.localeCompare(previous.localPath, 'en', { numeric: true }) > 0) skills.set(entry.id, entry);
        statistics.duplicateSkillsExcluded++;
      } else skills.set(entry.id, entry);
    }
    for (const file of files.referenceFiles) {
      const real = fs.realpathSync(file);
      if (realFiles.has(real)) { statistics.duplicateReferencesExcluded++; continue; }
      realFiles.add(real);
      const entry = referenceEntry(file, root, contextCache);
      if (references.has(entry.id)) throw new Error(`Duplicate reference id: ${entry.id}; resolve source ownership before refreshing.`);
      references.set(entry.id, entry);
    }
  }
  const referenceList = [...references.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const skillList = [...skills.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  Object.assign(statistics, {
    skillsIncluded: skillList.length, referencesIncluded: referenceList.length,
    upstreamReferences: referenceList.filter(item => item.notes.some(note => note.includes('awesome-design-md/'))).length,
    localSourceReferences: referenceList.filter(item => item.source === 'local').map(item => item.id),
    referencesWithColors: referenceList.filter(item => item.colors.length).length,
    extractedColors: referenceList.reduce((sum, item) => sum + item.colors.length, 0),
  });
  const catalog = {
    generatedAt: options.date || DEFAULT_DATE,
    scope: {
      skills: `扫描 ${roots.map(root => root.label).join('、')} 的 SKILL.md；仅纳入前端设计、图像、动效、网站、UI 工程、浏览器验收、性能与交付的公开能力摘要；localPath 相对各扫描根目录；排除备份与普通后端；新技能按公开元数据保守归类。`,
      references: '完整扫描上述根目录中的 DESIGN.md；颜色取自文件，文档许可与品牌素材限制分列；不附参考全文；来源仅离线核对。',
      openSource: 'resources 由根代理维护；本脚本不联网调研、不改写已有资源。',
    },
    skills: skillList,
    resources: [],
  };
  validateData(catalog, referenceList);
  return { catalog, references: referenceList, statistics };
}

export function validateData(catalog, references) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.generatedAt)) throw new Error('generatedAt must use YYYY-MM-DD.');
  if (!Array.isArray(catalog.skills) || !Array.isArray(catalog.resources) || !Array.isArray(references)) throw new Error('Catalog lists must be arrays.');
  for (const field of ['skills', 'references', 'openSource']) if (typeof catalog.scope?.[field] !== 'string') throw new Error(`Missing scope.${field}`);
  for (const [label, entries] of [['skills', catalog.skills], ['references', references]]) {
    const ids = new Set();
    for (const entry of entries) {
      for (const field of ['id', 'name', 'description', 'category', 'source']) if (typeof entry[field] !== 'string' || !entry[field]) throw new Error(`${label}: missing ${field}`);
      if (ids.has(entry.id)) throw new Error(`${label}: duplicate ${entry.id}`);
      ids.add(entry.id);
      if (!Array.isArray(entry.tags) || !entry.tags.every(tag => typeof tag === 'string')) throw new Error(`${entry.id}: invalid tags`);
      if (entry.source !== 'local' && !publicUrl(entry.source)) throw new Error(`${entry.id}: invalid public source`);
      if (label === 'skills') {
        if (!['design', 'build', 'verify'].includes(entry.role)) throw new Error(`${entry.id}: invalid role`);
        if (!entry.localPath || path.isAbsolute(entry.localPath) || /^[a-z]:/i.test(entry.localPath) || entry.localPath.split('/').includes('..')) throw new Error(`${entry.id}: invalid localPath`);
        if (!Array.isArray(entry.capabilities) || !entry.capabilities.length || typeof entry.prompt !== 'string') throw new Error(`${entry.id}: missing capabilities/prompt`);
      } else {
        if (entry.kind !== 'reference' || !Array.isArray(entry.colors) || !entry.colors.every(color => /^#(?:[\dA-F]{3,4}|[\dA-F]{6}|[\dA-F]{8})$/.test(color))) throw new Error(`${entry.id}: invalid reference/colors`);
        if (!entry.license?.document || !entry.license?.brandAssets || !Array.isArray(entry.notes)) throw new Error(`${entry.id}: missing license split/notes`);
      }
    }
  }
  // resources belong to the root agent and are not copied from the machine;
  // validate privacy only for data produced by this local scanner.
  const generated = JSON.stringify({ skills: catalog.skills, references });
  if (/(?:^|[^a-z])[a-z]:[\\/]|(?:\\\\|\/)Users[\\/]|\/home\/[^/]+|(?:sk-(?:proj-)?[a-z0-9]{16,})|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(generated)) throw new Error('Generated metadata contains a private absolute path or credential-like text.');
  const username = os.userInfo().username;
  if (username.length > 3 && generated.toLowerCase().includes(username.toLowerCase())) throw new Error('Generated metadata contains the local username.');
  return true;
}

function existingCatalog(file) {
  if (!exists(file)) return null;
  const previous = JSON.parse(read(file));
  if (!Array.isArray(previous.resources)) throw new Error('Existing resources must be an array; refusing to overwrite.');
  return previous;
}

export function refreshCatalog(options = {}) {
  const catalogPath = options.catalogPath || path.join(defaultDataDirectory, 'catalog.json');
  const referencesPath = options.referencesPath || path.join(defaultDataDirectory, 'local-references.json');
  const result = scanCatalog(options);
  // Read resources at the last possible moment, so concurrent UI/resource work
  // is preserved. Do not cache an older catalog at scan startup.
  const previous = existingCatalog(catalogPath);
  const resources = previous?.resources || [];
  result.catalog.resources = resources;
  if (previous?.scope?.openSource) result.catalog.scope.openSource = previous.scope.openSource;
  if (exists(referencesPath)) {
    const previousReferences = JSON.parse(read(referencesPath));
    if (Array.isArray(previousReferences)) {
      const summaries = new Map(previousReferences.filter(item=>typeof item.descriptionZh==='string').map(item=>[item.id,item.descriptionZh]));
      for (const item of result.references) if(summaries.has(item.id)) item.descriptionZh=summaries.get(item.id);
    }
  }
  validateData(result.catalog, result.references);
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.mkdirSync(path.dirname(referencesPath), { recursive: true });
    fs.writeFileSync(referencesPath, JSON.stringify(result.references, null, 2) + '\n', 'utf8');
    // Re-read after writing references in case the root agent just saved resources.
    result.catalog.resources = existingCatalog(catalogPath)?.resources || resources;
    fs.writeFileSync(catalogPath, JSON.stringify(result.catalog, null, 2) + '\n', 'utf8');
    const saved = JSON.parse(read(catalogPath));
    validateData(saved, JSON.parse(read(referencesPath)));
    if (JSON.stringify(saved.resources) !== JSON.stringify(result.catalog.resources)) throw new Error('Resource preservation verification failed.');
  }
  result.statistics.resourcesPreserved = result.catalog.resources.length;
  return result;
}

function parseArguments(args) {
  const options = {}, roots = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--dry-run') { options.dryRun = true; continue; }
    if (flag === '--help' || flag === '-h') { options.help = true; continue; }
    if (!['--skills-root', '--catalog', '--references', '--date'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--skills-root') roots.push(path.resolve(value));
    else if (flag === '--date') options.date = value;
    else options[flag === '--catalog' ? 'catalogPath' : 'referencesPath'] = path.resolve(value);
  }
  if (roots.length) options.roots = roots;
  return options;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log('Usage: node refresh-local-catalog.mjs [--skills-root ROOT ...] [--catalog FILE] [--references FILE] [--date YYYY-MM-DD] [--dry-run]\nDefaults: CODEX_HOME or HOME/.codex skills + HOME/.agents/skills + CODEX_HOME/plugins/cache. Explicit --skills-root values replace all defaults. Paths in data are root-relative; backup copies are excluded. No network access.');
    else console.log(JSON.stringify(refreshCatalog(options).statistics, null, 2));
  } catch (error) {
    // Do not leak private filesystem paths in a shareable diagnostic.
    const message = String(error.message).split(os.homedir()).join('[HOME]');
    console.error(`Catalog refresh failed: ${message}`);
    process.exitCode = 1;
  }
}
