import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {BLOCKS,THEMES,TEMPLATES,FONTS,STYLES,createBlock,createProject,validateProject,generateDocument,generateParts,normalizeTheme,editorProps,mediaSlots} from '../dist/engine.js';
import {MEDIA_BLOCKS} from '../dist/media-blocks.js';
import {FX_BLOCKS} from '../dist/fx-blocks.js';
import {FX_OPTIONS,STYLE_DEFAULTS,ASSET_LIMITS,normalizeBlockStyle,normalizeEffects,normalizeAssets,normalizeElementStyle,normalizeFree,normalizeFreeM,sectionFx,EDITOR_JS,EDITOR_CSS} from '../dist/fx-runtime.js';
import {RECIPES,validateRecipe,recipePlan} from '../dist/case-model.js';
import {replaceProjectBlock,replacementOptions} from '../dist/studio-model.js';
import {createBuilderUI,renderFxLab} from '../dist/builder-ui.js';
let assertions=0;const check=(v,m)=>{assert.ok(v,m);assertions++};
const registry={blocks:BLOCKS,themes:THEMES};
const scripts=html=>[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);

// Every new module renders, escapes, keeps duplicate instances unique and ships parseable JS.
for(const b of FX_BLOCKS){const p=createProject();p.blocks=[createBlock(b.id),createBlock(b.id)];const html=generateDocument(validateProject(p)),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique IDs '+b.id);check(!html.includes('undefined'),'complete output '+b.id);scripts(html).forEach(code=>new Script(code));
 const x=createProject();x.blocks=[createBlock(b.id)];for(const k of Object.keys(x.blocks[0].props))x.blocks[0].props[k]='<img src=x onerror=alert(1)>|<b>|"q"';check(!/<img src=x/.test(generateDocument(x)),'escaped fields '+b.id);}
check(BLOCKS.length>=81&&TEMPLATES.length>=24&&THEMES.length>=16,'expanded registry');
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

// v3.1: image assets, element styles, image slots and the new modules.
const PNG='data:image/png;base64,'+'iVBORw0KGgo'.padEnd(400,'A')+'==';
const assets=normalizeAssets({'a-ok001':{d:PNG,n:'图'.repeat(90),w:99999,h:20},'a-svg01':{d:'data:image/svg+xml;base64,PHN2Zz4=',n:'x'},'a-js0001':{d:'javascript:alert(1)'},'bad id':{d:PNG},'a-big001':{d:'data:image/png;base64,'+'A'.repeat(ASSET_LIMITS.bytes)},'a-url001':{d:'https://example.com/x.png'},'a-inj001':{d:'data:image/png;base64,AAAA")}body{display:none}/*'}});
check(Object.keys(assets).join()==='a-ok001'&&assets['a-ok001'].n.length===60&&assets['a-ok001'].w===8000,'only bounded raster data URLs are kept');
check(Object.keys(normalizeAssets(Object.fromEntries(Array.from({length:40},(_,i)=>[`a-n${String(i).padStart(4,'0')}`,{d:PNG}])))).length===ASSET_LIMITS.count,'asset count capped');
const es=normalizeElementStyle({color:'red',size:999,weight:550,align:'justify',tracking:-50,italic:'yes',upper:true,hidden:true});
check(!('color' in es)&&es.size===240&&!('weight' in es)&&!('align' in es)&&es.tracking===-10&&!('italic' in es)&&es.upper&&es.hidden,'element styles validated');
const st=normalizeBlockStyle({els:{title:{color:'#ABCDEF'},hack:{color:'#000000'}},media:{photo:'a-ok001','Bad Slot':'a-ok001',x:'not-an-id'},image:'a-ok001',scroll:'parallax',gradType:'conic',gradAngle:999,bg3:'#123456'});
check(st.els.title.color==='#abcdef'&&!st.els.hack&&Object.keys(st.media).join()==='photo'&&st.gradAngle===360&&st.scroll==='parallax','block media, element and gradient keys validated');
const mp=createProject('photographer');mp.assets={'a-ok001':{d:PNG,n:'a',w:10,h:10}};mp.blocks[1].style={...mp.blocks[1].style,media:{bg:'a-ok001'},els:{title:{color:'#ff0000',size:120,hidden:false},eyebrow:{hidden:true}},image:'a-missing1'};
const mv=validateProject(JSON.parse(JSON.stringify(mp))),md=generateDocument(mv);
check(Object.keys(mv.assets).length===1,'projects keep validated assets');
check(md.includes(`[data-media="bg"]{background:url("${PNG}")`)&&md.includes('[data-f="title"]{color:#ff0000')&&md.includes('zoom:1.2')&&md.includes('[data-f="eyebrow"]{display:none!important}'),'image slots and element styles become scoped CSS');
check(!md.includes('class="fx-img"'),'missing background asset renders nothing');
const unref=createProject();unref.assets={'a-ok001':{d:PNG,n:'a',w:1,h:1}};check(!generateDocument(unref).includes('iVBORw0KGgo'),'unreferenced assets are not exported');
check(mediaSlots(createBlock('gallery-masonry')).length===6&&mediaSlots(createBlock('hero-split'))[0]==='visual'&&mediaSlots(createBlock('faq')).length===0,'image slots discovered from markup');
for(const b of MEDIA_BLOCKS){const p=createProject();p.blocks=[createBlock(b.id),createBlock(b.id)];const html=generateDocument(validateProject(p)),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size&&!html.includes('undefined'),'media module complete '+b.id);scripts(html).forEach(code=>new Script(code));
 const x=createProject();x.blocks=[createBlock(b.id)];for(const k of Object.keys(x.blocks[0].props))x.blocks[0].props[k]='<img src=x onerror=alert(1)>|<b>|"q"';check(!/<img src=x/.test(generateDocument(x)),'media module escapes '+b.id)}
for(const id of ['photographer','boutique','motion-studio','analytics','link-in-bio','travel-journal'])check(TEMPLATES.some(t=>t.id===id)&&!generateDocument(createProject(id)).includes('undefined'),'template '+id);
check(generateDocument(e,{editor:{mode:'edit',field:'title',token:'t'}}).includes('"field":"title"'),'editor receives the selected element');
const shellCSS=(await Promise.all(['app.css','cases.css','studio.css','v3.css'].map(f=>readFile(new URL('../dist/'+f,import.meta.url),'utf8')))).join('\n'),tokens=await readFile(new URL('../dist/tokens.css',import.meta.url),'utf8');
const used=new Set([...shellCSS.matchAll(/var\(--c-([0-9a-f]{6,8})\)/g)].map(m=>m[1])),[lightPart,darkPart]=tokens.split(':root[data-ui=dark]');
check(used.size>400&&[...used].every(h=>lightPart.includes(`--c-${h}:`)&&darkPart.includes(`--c-${h}:`)),'every shell colour token has light and dark values');

// v4: free editing of any element by child path.
const fr=normalizeFree({x:12.6,y:-9999,rotate:400,scale:1,w:-5,opacity:150,z:3,color:'red',bg:'#ABCDEF',size:999,weight:450,align:'justify',lh:20,tracking:99,radius:-3,pad:12,border:3,borderColor:'#000000',shadow:'neon',blur:5,hidden:true,evil:'x'});
check(fr.x===13&&fr.y===-2400&&fr.rotate===180&&fr.scale===10&&!('w' in fr)&&!('opacity' in fr)&&fr.z===3&&!('color' in fr)&&fr.bg==='#abcdef'&&fr.size===240&&!('weight' in fr)&&!('align' in fr)&&fr.lh===80&&fr.tracking===60&&!('radius' in fr)&&fr.pad===12&&!('shadow' in fr)&&fr.hidden&&!('evil' in fr),'free element styles clamped and filtered');
const fs1=normalizeBlockStyle({free:{'2/1':{x:10},'0/1':{x:1},'1/a':{x:1},'1/2}body{display:none':{x:1},'3':{},'1/1/1/1/1/1/1/1/1/1/1/1/1':{x:1}}});
check(Object.keys(fs1.free).join()==='2/1','free paths validated (no zero, letters, injection, empty or too deep)');
const fp=createProject();fp.blocks=[createBlock('hero-editorial',{free:{'2/1':{x:24,y:-8,rotate:-6,scale:120,bg:'#112233',shadow:'soft',hidden:false},'2/2':{hidden:true}}})];
const fd=generateDocument(validateProject(JSON.parse(JSON.stringify(fp))));
check(fd.includes(`>:nth-child(2 of :not(.fx-bg,.fx-img,.fx-divider))>:nth-child(1){translate:24px -8px;rotate:-6deg;scale:1.2;background:#112233;box-shadow:`)&&fd.includes('>:nth-child(2)'+'{display:none!important}'),'free styles become scoped CSS with decor-safe selectors');
check(generateDocument(fp,{editor:{mode:'edit',free:'2/1',token:'t'}}).includes('"free":"2/1"')&&generateDocument(fp,{editor:{mode:'edit',free:'2/1"};alert(1);//',token:'t'}}).includes('"free":""'),'editor keeps a valid selected path only');

// v4.1: phone overrides keep explicit defaults, and only the groups they touch move into media queries.
const fm=normalizeFreeM({x:0,y:-9999,color:'',bg:'#ABCDEF',hidden:false,evil:1});
check(fm.x===0&&fm.y===-2400&&!('color' in fm)&&fm.bg==='#abcdef'&&fm.hidden===false&&!('evil' in fm)&&!('rotate' in fm),'phone overrides keep set keys (even defaults), clamp and drop empty colours');
const fs2=normalizeBlockStyle({freeM:{'2/1':{x:0},'0/1':{x:1},'1/x':{y:2},'3':{}}});
check(Object.keys(fs2.freeM).join()==='2/1'&&fs2.freeM['2/1'].x===0&&!('free' in fs2),'phone override paths validated like desktop paths');
const mpj=createProject();mpj.blocks=[createBlock('hero-editorial',{free:{'2/1':{x:200,y:10,rotate:5,hidden:true}},freeM:{'2/1':{x:0,hidden:false},'2/2':{size:18}}})];
const mdoc=generateDocument(validateProject(JSON.parse(JSON.stringify(mpj)))),mSel='>:nth-child(2 of :not(.fx-bg,.fx-img,.fx-divider))>:nth-child(1)';
const mq=(q,sel,body)=>mdoc.split('@media('+q+'){#s-').slice(1).some(x=>x.slice(x.indexOf('>')).startsWith(sel+'{'+body+'}}'));
check(mdoc.includes(mSel+'{rotate:5deg}')&&mq('min-width:761px',mSel,'translate:200px 10px;display:none!important')&&mq('max-width:760px',mSel,'translate:0px 10px'),'untouched groups stay global; overridden groups split into desktop and phone queries');
check(mq('max-width:760px','>:nth-child(2 of :not(.fx-bg,.fx-img,.fx-divider))>:nth-child(2)','font-size:18px'),'phone-only element styles need no desktop rule');
check(EDITOR_JS.includes('snapTargets')&&EDITOR_JS.includes('ev.altKey')&&EDITOR_CSS.includes('.atlas-guide')&&EDITOR_CSS.includes('touch-action:none'),'editor ships smart guides, Alt to bypass and touch-safe handles');

// v4.2: editor chrome is counter-scaled by 1 / canvas zoom; the factor is clamped.
const kDoc=k=>generateDocument(createProject(),{editor:{mode:'edit',k,token:'t'}});
check(kDoc(1/0.5).includes('"k":2')&&kDoc(99).includes('"k":2.5')&&kDoc('x').includes('"k":1')&&kDoc(0.2).includes('"k":1'),'editor zoom factor is clamped to 1–2.5');
check(EDITOR_JS.includes("m.type==='ui-scale'")&&EDITOR_CSS.includes('scale:var(--k,1)')&&EDITOR_CSS.includes('calc(2px*var(--k,1))'),'canvas labels, toolbar, handles and outlines follow the zoom factor');
const offline=await readFile(new URL('../dist/offline.html',import.meta.url),'utf8');
check(offline.includes('MEDIA_BLOCK_JS')&&offline.includes('--c-3d6655')&&offline.includes('data-ui'),'offline bundle contains 3.1 modules, tokens and theme bootstrap');
check(offline.includes('createBuilderUI')&&offline.includes('FX_BLOCK_JS')&&offline.includes('.studio-bar'),'offline bundle contains v3 studio, effects and styles');
console.log(JSON.stringify({status:'PASS',assertions,blocks:BLOCKS.length,newBlocks:FX_BLOCKS.length+MEDIA_BLOCKS.length,templates:TEMPLATES.length,themes:THEMES.length,effects:Object.fromEntries(Object.entries(FX_OPTIONS).map(([k,v])=>[k,v.length-1]))},null,2));
