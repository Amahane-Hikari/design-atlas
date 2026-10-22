// Declarative catalog protocol. This module never fetches URLs or executes imported code.
export const CASE_PACK_KIND='design-atlas.case-pack';
export const CASE_LIMITS={bytes:4*1024*1024,cases:500,recipes:100,blocks:40,note:4000};
const recipe=(id,name,description,theme,blocks)=>({id,name,description,theme,blocks:blocks.map(type=>({type,props:{}}))});
export const RECIPES=[
 recipe('portfolio-index','作品索引','用自我介绍、项目目录和项目叙事建立可信度。','editorial',['navbar','intro-index','project-index','case-story','contact','footer']),
 recipe('developer-home','开发者主页','以经历、作品和文章连接技术能力与个人观点。','precision',['intro-index','resume','project-index','article-list','footer']),
 recipe('digital-garden','数字花园','以文章目录和近况为中心，给持续生长的内容一个家。','atelier',['navbar','hero-editorial','article-list','now-board','newsletter','footer']),
 recipe('editorial-story','编辑式叙事','大字、引言与分步叙事交替，控制阅读节奏。','editorial',['navbar','split-manifesto','quote','case-story','project-index','contact','footer']),
 recipe('creative-studio','创意工作室','从明确立场进入作品，再解释方法与合作入口。','brutal',['navbar','split-manifesto','gallery','case-story','testimonial-wall','contact','footer']),
 recipe('product-launch','新品发布','让用户先看到产品，再看功能与下一步。','lavender',['navbar','app-window','stats','feature-demo','testimonial-wall','cta','footer']),
 recipe('saas-conversion','SaaS 转化页','价值、试用、方案和疑问逐层展开。','precision',['navbar','hero-aurora','feature-demo','comparison','pricing','faq','cta','footer']),
 recipe('tool-demo','工具演示页','把产品交互放在中心，辅以功能与持续更新。','ocean',['navbar','app-window','feature-demo','release-log','faq','footer']),
 recipe('app-showcase','应用介绍','让真实任务与界面关系成为页面的叙事。','swiss',['navbar','hero-split','feature-demo','bento','testimonial-wall','cta','footer']),
 recipe('commerce-story','物件与故事','通过产品细节、设计原则与简洁对比讲述价值。','atelier',['navbar','product','split-manifesto','features','comparison','faq','footer']),
 recipe('community-hub','社区与内容','把观点、成员声音和新进展放在一起。','lavender',['navbar','hero-editorial','article-list','testimonial-wall','release-log','newsletter','footer']),
 recipe('minimal-profile','极简名片','一个人、一些作品、此刻近况，保留最重要的内容。','swiss',['profile','project-index','now-board','contact','footer'])
];
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(path,message)=>{throw Error(`${path}：${message}`)};
function str(v,path,max=300,required=false){if(typeof v!=='string')return required?fail(path,'需要文本'):'';if(v.length>max)fail(path,`最多 ${max} 字符`);const s=v.trim();if(required&&!s)fail(path,'不能为空');return s;}
function list(v,path,max=12){if(v==null)return [];if(!Array.isArray(v)||v.length>max)fail(path,`需要不超过 ${max} 项的数组`);return [...new Set(v.map((s,i)=>str(s,`${path}[${i}]`,300,true)))];}
const validID=(v,path)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(v))fail(path,'ID 只能包含字母、数字、短横线与下划线，最长 100 字符');return v;};
export function publicURL(value,path='url'){
 const text=str(value,path,2048,true);let u;try{u=new URL(text)}catch{fail(path,'需要有效网址')}
 if(u.protocol!=='https:'||u.username||u.password)fail(path,'仅支持不含用户名和密码的 HTTPS 链接');
 const h=u.hostname.toLowerCase().replace(/\.$/,'');
 if(!h.includes('.')||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.startsWith('['))fail(path,'请使用公开网站域名');
 if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){const n=h.split('.').map(Number);if(n[0]===0||n[0]===10||n[0]===127||n[0]>=224||(n[0]===169&&n[1]===254)||(n[0]===172&&n[1]>=16&&n[1]<=31)||(n[0]===192&&n[1]===168)||(n[0]===100&&n[1]>=64&&n[1]<=127))fail(path,'不支持本地或私有 IP 地址');}
 return u.href;
}
export function validateRecipe(raw,registry,path='recipe',user=false){
 if(!obj(raw))fail(path,'需要对象');const id=validID(raw.id,`${path}.id`);if(user&&!id.startsWith('user-'))fail(`${path}.id`,'自定义配方 ID 需以 user- 开头');
 if(!Array.isArray(raw.blocks)||raw.blocks.length<1||raw.blocks.length>CASE_LIMITS.blocks)fail(`${path}.blocks`,`需要 1–${CASE_LIMITS.blocks} 个模块`);
 const blocks=raw.blocks.map((b,i)=>{const p=`${path}.blocks[${i}]`;if(!obj(b))fail(p,'需要模块对象');const def=registry.blocks.find(x=>x.id===b.type);if(!def)fail(p+'.type','未注册的模块');if(b.props!=null&&!obj(b.props))fail(p+'.props','需要属性对象');const props={};for(const k of Object.keys(def.props)){if(b.props?.[k]!=null){if(typeof b.props[k]!=='string')fail(p+'.props.'+k,'需要文本');props[k]=str(b.props[k],p+'.props.'+k,4000)}}return {type:def.id,props};});
 let theme;if(typeof raw.theme==='string'){if(!registry.themes.some(t=>t.id===raw.theme))fail(path+'.theme','未知主题');theme=raw.theme}else if(obj(raw.theme)){const base=registry.themes.find(t=>t.id===raw.theme.id);if(!base)fail(path+'.theme.id','未知主题');theme={...base};for(const key of ['accent','bg','surface','ink','muted'])if(raw.theme[key]!=null){if(typeof raw.theme[key]!=='string'||!/^#[a-f0-9]{6}$/i.test(raw.theme[key]))fail(path+'.theme.'+key,'需要六位十六进制色值');theme[key]=raw.theme[key]}for(const key of ['radius','space'])if(raw.theme[key]!=null){const value=raw.theme[key];if(typeof value!=='number'||!Number.isFinite(value)||value<(key==='radius'?0:24)||value>(key==='radius'?40:120))fail(path+'.theme.'+key,'数值超出范围');theme[key]=value}for(const [key,allow] of [['font',['sans','serif','mono']],['style',['soft','flat','brutal']]])if(raw.theme[key]!=null){if(!allow.includes(raw.theme[key]))fail(path+'.theme.'+key,'不支持的选项');theme[key]=raw.theme[key]}}else fail(path+'.theme','需要主题 ID 或主题对象');
 return {id,name:str(raw.name,path+'.name',100,true),description:str(raw.description,path+'.description',500),theme,blocks};
}
export function validateCase(raw,registry,recipes,path='case',user=false){
 if(!obj(raw))fail(path,'需要对象');const id=validID(raw.id,path+'.id');if(user&&!id.startsWith('user-'))fail(path+'.id','自定义案例 ID 需以 user- 开头');
 if(!['个人网站','作品集','产品页','工作室'].includes(raw.type))fail(path+'.type','类型应为个人网站、作品集、产品页或工作室');
 if(!recipes.some(r=>r.id===raw.recipe))fail(path+'.recipe','引用的配方不存在');if(!registry.themes.some(t=>t.id===raw.theme))fail(path+'.theme','引用的主题不存在');
 const evidence=user?{level:'user-added',checkedAt:'',title:'用户添加',notes:'由使用者整理，工作台未核实原站。'}:obj(raw.evidence)?{level:['content-reviewed','browser-sampled'].includes(raw.evidence.level)?raw.evidence.level:'content-reviewed',checkedAt:str(raw.evidence.checkedAt,path+'.evidence.checkedAt',30,true),title:str(raw.evidence.title,path+'.evidence.title',300),notes:str(raw.evidence.notes,path+'.evidence.notes',1200),...(raw.evidence.observations?{observations:list(raw.evidence.observations,path+'.evidence.observations',12)}:{})}:fail(path+'.evidence','需要来源核对信息');
 return {id,name:str(raw.name,path+'.name',100,true),url:publicURL(raw.url,path+'.url'),type:raw.type,category:str(raw.category,path+'.category',60,true),summary:str(raw.summary,path+'.summary',1200,true),tags:list(raw.tags,path+'.tags'),patterns:list(raw.patterns,path+'.patterns'),styles:list(raw.styles,path+'.styles'),takeaways:list(raw.takeaways,path+'.takeaways',8),caution:str(raw.caution,path+'.caution',1000),recipe:raw.recipe,theme:raw.theme,evidence,rights:{type:'reference-only',note:'公开网站设计参考；未获得页面源码与品牌资产再分发授权。'},kind:'site'};
}
export function validateCasePack(raw,registry){
 if(!obj(raw)||raw.kind!==CASE_PACK_KIND||raw.schemaVersion!==1)fail('文件','需要 design-atlas.case-pack / schemaVersion:1 案例包');
 if(!Array.isArray(raw.cases)||raw.cases.length>CASE_LIMITS.cases)fail('cases','案例最多 500 项');
 if(!Array.isArray(raw.recipes)||raw.recipes.length>CASE_LIMITS.recipes)fail('recipes','配方最多 100 项');
 const recipes=raw.recipes.map((r,i)=>validateRecipe(r,registry,`recipes[${i}]`,true));
 if(new Set(recipes.map(r=>r.id)).size!==recipes.length)fail('recipes','含重复 ID');
 const cases=raw.cases.map((c,i)=>validateCase(c,registry,[...RECIPES,...recipes],`cases[${i}]`,true));
 if(new Set(cases.map(c=>c.id)).size!==cases.length)fail('cases','含重复 ID');
 const notes={};if(raw.user?.notes!=null){if(!obj(raw.user.notes)||Object.keys(raw.user.notes).length>1000)fail('user.notes','备注过多或格式错误');for(const [k,v] of Object.entries(raw.user.notes)){validID(k,'user.notes ID');Object.defineProperty(notes,k,{value:str(v,'user.notes.'+k,CASE_LIMITS.note),enumerable:true,writable:true,configurable:true})}}
 const favorites=list(raw.user?.favorites,'user.favorites',1000).map(x=>validID(x,'favorite'));
 return {kind:CASE_PACK_KIND,schemaVersion:1,cases,recipes,user:{notes,favorites}};
}
export function emptyCasePack(){return {kind:CASE_PACK_KIND,schemaVersion:1,cases:[],recipes:[],user:{notes:{},favorites:[]}}}
export function mergeCasePacks(current,incoming,registry){
 const base=validateCasePack(current,registry),next=validateCasePack(incoming,registry);let skipped=0;
 for(const recipe of next.recipes){const existing=base.recipes.find(r=>r.id===recipe.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(recipe))fail('recipes.'+recipe.id,'相同 ID 的配方内容不同。请为导入配方换一个 ID，并同步案例的 recipe 引用；本次没有导入任何内容。');}
 for(const key of ['cases','recipes']){const ids=new Set(base[key].map(x=>x.id));for(const item of next[key]){if(ids.has(item.id)){skipped++;continue}base[key].push(item);ids.add(item.id)}}
 base.user.notes={...next.user.notes,...base.user.notes};base.user.favorites=[...new Set([...base.user.favorites,...next.user.favorites])];
 return {pack:validateCasePack(base,registry),skipped};
}
export function filterCases(items,{q='',type='',style='',pattern='',favoriteOnly=false,sort='recommended'}={},favorites=[]){
 const words=q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),fav=new Set(favorites);
 const found=items.filter(c=>(!type||c.type===type)&&(!style||c.styles.includes(style))&&(!pattern||c.patterns.includes(pattern))&&(!favoriteOnly||fav.has(c.id))&&words.every(w=>[c.name,c.url,c.summary,c.category,...c.tags,...c.styles,...c.patterns,...c.takeaways].join(' ').toLocaleLowerCase().includes(w)));
 if(sort==='name')found.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));else if(sort==='favorites')found.sort((a,b)=>Number(fav.has(b.id))-Number(fav.has(a.id)));else if(sort==='personal')found.sort((a,b)=>Number(['个人网站','作品集'].includes(b.type))-Number(['个人网站','作品集'].includes(a.type)));
 return found;
}
export function recipePlan(project,rawRecipe,mode,registry){
 const r=validateRecipe(rawRecipe,registry);if(!['theme','append','replace'].includes(mode))fail('应用方式','不支持');
 if(mode==='append'&&project.blocks.length+r.blocks.length>100)fail('页面','追加后超过 100 个模块');
 const t=typeof r.theme==='string'?registry.themes.find(t=>t.id===r.theme):r.theme;
 return {mode,name:mode==='replace'?r.name:project.name,theme:mode==='append'?{...project.theme}:{...t},customCSS:mode==='replace'?'':project.customCSS,existingBlocks:mode==='replace'?[]:project.blocks.map(b=>({...b,props:{...b.props}})),newBlocks:mode==='theme'?[]:r.blocks.map(b=>({...b,props:{...b.props}}))};
}
