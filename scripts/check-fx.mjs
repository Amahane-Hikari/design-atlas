import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {BLOCKS,THEMES,TEMPLATES,FONTS,STYLES,createBlock,createProject,validateProject,generateDocument,generateParts,normalizeTheme,editorProps} from '../dist/engine.js';
import {FX_BLOCKS} from '../dist/fx-blocks.js';
import {FX_OPTIONS,STYLE_DEFAULTS,normalizeBlockStyle,normalizeEffects,sectionFx} from '../dist/fx-runtime.js';
import {RECIPES,validateRecipe,recipePlan} from '../dist/case-model.js';
import {replaceProjectBlock,replacementOptions} from '../dist/studio-model.js';
import {createBuilderUI,renderFxLab} from '../dist/builder-ui.js';
let assertions=0;const check=(v,m)=>{assert.ok(v,m);assertions++};
const registry={blocks:BLOCKS,themes:THEMES};
const scripts=html=>[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);

// Every new module renders, escapes, keeps duplicate instances unique and ships parseable JS.
for(const b of FX_BLOCKS){const p=createProject();p.blocks=[createBlock(b.id),createBlock(b.id)];const html=generateDocument(validateProject(p)),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique IDs '+b.id);check(!html.includes('undefined'),'complete output '+b.id);scripts(html).forEach(code=>new Script(code));
 const x=createProject();x.blocks=[createBlock(b.id)];for(const k of Object.keys(x.blocks[0].props))x.blocks[0].props[k]='<img src=x onerror=alert(1)>|<b>|"q"';check(!/<img src=x/.test(generateDocument(x)),'escaped fields '+b.id);}
check(BLOCKS.length>=60&&TEMPLATES.length>=18&&THEMES.length>=16,'expanded registry');
for(const t of TEMPLATES){const p=createProject(t.id),html=generateDocument(p);check(!html.includes('undefined'),'template renders '+t.id);check(validateProject(JSON.parse(JSON.stringify(p))).blocks.every((b,i)=>JSON.stringify(b.style)===JSON.stringify(p.blocks[i].style)),'template styles round-trip '+t.id)}

// Block styles accept only known values; anything else falls back to defaults.
const hostile={tone:'evil',bg:'red;}body{display:none',bg2:'#12345g',accent:'#ABCDEF',pattern:'stars',patternOpacity:900,padTop:-50,padBottom:'64',width:'huge',radius:99,zoom:5,enter:'url(x)',duration:'9999',delay:-3,stagger:'yes',hover:'tilt',text:'split',css:'a{color:red}</style><script>alert(1)</script>'.repeat(400)};
const s=normalizeBlockStyle(hostile);
check(!('tone' in s)&&!('bg' in s)&&!('bg2' in s)&&s.accent==='#abcdef','colors and tones validated');
check(s.patternOpacity===100&&!('padTop' in s)&&s.padBottom===64&&s.radius===48&&s.zoom===70&&s.duration===2400&&!('delay' in s),'numbers clamped');
check(!('enter' in s)&&!('stagger' in s)&&s.hover==='tilt'&&s.text==='split'&&s.css.length===8000,'enums and text limits');
check(JSON.stringify(normalizeBlockStyle(null))==='{}'&&JSON.stringify(normalizeBlockStyle([]))==='{}','non-objects normalize to empty');
check(Object.keys(STYLE_DEFAULTS).every(k=>k in STYLE_DEFAULTS),'defaults complete');
const t=normalizeTheme(THEMES[0]);for(const tone of FX_OPTIONS.tone.map(x=>x[0])){const fx=sectionFx({tone,bg:'#101010',pattern:'aurora',divider:'wave',enter:'fade-up',stagger:true},t,{});check(!/"[^"]*"[^ >]/.test(fx.style.slice(8,-1))&&fx.attrs.includes('data-enter="fade-up"'),'section attributes are well formed '+tone)}
check(sectionFx({},t,{reveal:'zoom-in'}).attrs.includes('data-enter="zoom-in"'),'page default reveal applies');
check(sectionFx({enter:'blur'},t,{reveal:'zoom-in'}).attrs.includes('data-enter="blur"'),'block entrance overrides page default');

// Projects keep styles, labels and effects through validation; custom CSS cannot close the style element.
const p=createProject('ai-launch');p.blocks[1].style={...p.blocks[1].style,css:'& h1{color:red}</style><script>alert(1)</script>'};p.blocks[1].label='  我的首屏 '+'x'.repeat(80);p.effects.cursor='laser';
const q=validateProject(JSON.parse(JSON.stringify(p)));
check(q.blocks[1].label.length===60&&q.blocks[1].label.startsWith('我的首屏'),'labels trimmed and capped');
check(q.effects.cursor==='none'&&q.effects.progress===true,'effects normalized');
const doc=generateDocument(q);check(!/<\/style><script>alert/i.test(doc),'block CSS cannot break out of style');check(doc.includes(`#s-${q.blocks[1].uid}{`),'block CSS is scoped');
check(doc.includes('class="fx-progress"')&&doc.includes('class="fx-cursor"')===false,'effect markup follows settings');
const old={version:1,name:'v1',theme:{id:'atelier',accent:'#123456',font:'serif',radius:10,space:60,style:'flat'},blocks:[{type:'faq',props:{title:'旧'},hidden:false}],customCSS:''};const v1=validateProject(old);check(v1.blocks[0].props.title==='旧'&&JSON.stringify(v1.blocks[0].style)==='{}'&&v1.effects.progress===false&&v1.theme.headingFont==='same','v1 projects open with defaults');
for(const f of FONTS){const x=createProject();x.theme={...x.theme,font:f[0],headingFont:f[0]};check(normalizeTheme(x.theme).font===f[0],'font '+f[0])}
for(const st of STYLES){check(generateParts({...createProject(),theme:{...THEMES[0],style:st[0]}}).css.includes('--shadow:'),'surface style '+st[0])}
check(normalizeTheme({id:'atelier',font:'comic',style:'neon',headingScale:999,weight:1}).font==='sans'&&normalizeTheme({id:'atelier',headingScale:999}).headingScale===150,'theme options validated');

// The canvas editor is only present in the builder preview, and its config cannot inject markup.
check(!doc.includes('atlas-insert')&&!doc.includes('atlas-ghost'),'exports contain no editor bridge');
const e=createProject();e.blocks[0].label='</script><script>alert(1)</script>';e.blocks[0].props.title='</script><img src=x>';
const ed=generateDocument(e,{editor:{mode:'edit',selected:e.blocks[0].uid,token:'t',scroll:120}});
check(scripts(ed).length===1&&!ed.includes('</script><script>alert'),'editor config is script-safe');scripts(ed).forEach(code=>new Script(code));
const props=editorProps(createBlock('stats'));check(props.button.t==='list'&&props.button.s==='c'&&props.title.t==='text'&&props.title.m===true,'editable field map');

// Recipes, layout replacement and the studio modules keep v3 data.
const recipe=validateRecipe({id:'user-x',name:'带样式',theme:{...THEMES[9],font:'rounded',style:'glass',accent2:'#123456',headingFont:'kai',weight:500},blocks:[{type:'hero-gradient',props:{},style:{enter:'blur',pattern:'stars'}},{type:'faq',props:{}}]},registry,'recipe',true);
check(recipe.blocks[0].style.enter==='blur'&&!('style' in recipe.blocks[1]),'recipe block styles kept compactly');check(recipe.theme.font==='rounded'&&recipe.theme.style==='glass'&&recipe.theme.headingFont==='kai'&&recipe.theme.weight===500,'recipe accepts v3 theme options');
check(recipePlan(createProject(),recipe,'append',registry).newBlocks[0].style.pattern==='stars','plans carry block styles');
const r=createProject();r.blocks=[createBlock('hero-editorial',{enter:'zoom-in',tone:'dark'}),createBlock('footer')];r.blocks[0].label='首屏';const alt=replacementOptions('hero-editorial')[0];const rr=replaceProjectBlock(r,r.blocks[0].uid,alt.id);check(rr.blocks[0].style.enter==='zoom-in'&&rr.blocks[0].label==='首屏','layout replacement keeps style and label');
check(typeof createBuilderUI==='function'&&typeof renderFxLab==='function','studio modules load without a DOM');

const offline=await readFile(new URL('../dist/offline.html',import.meta.url),'utf8');
check(offline.includes('createBuilderUI')&&offline.includes('FX_BLOCK_JS')&&offline.includes('.studio-bar'),'offline bundle contains v3 studio, effects and styles');
console.log(JSON.stringify({status:'PASS',assertions,blocks:BLOCKS.length,newBlocks:FX_BLOCKS.length,templates:TEMPLATES.length,themes:THEMES.length,effects:Object.fromEntries(Object.entries(FX_OPTIONS).map(([k,v])=>[k,v.length-1]))},null,2));
