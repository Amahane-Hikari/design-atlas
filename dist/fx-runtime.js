// Section styles, motion effects and the canvas editing bridge. Original code, MIT. No DOM access at module scope.
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const pick=(list,v,d)=>list.some(x=>x[0]===v)?v:d;
const num=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):d};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);

export const FX_OPTIONS={
 tone:[['auto','跟随主题'],['tint','柔和色调'],['invert','反转明暗'],['accent','强调色底'],['dark','深色'],['light','纯白']],
 pattern:[['none','无背景'],['grid','网格'],['dots','圆点'],['lines','斜纹'],['grain','颗粒'],['gradient','柔和渐变'],['aurora','极光'],['mesh','流体渐变'],['spotlight','跟随光斑'],['stars','星点'],['beams','光束'],['rings','同心圆'],['waves','波浪'],['blobs','流体色块'],['retro','复古网格'],['flow','流动渐变']],
 width:[['auto','默认'],['narrow','窄栏'],['wide','加宽'],['full','满版']],
 align:[['auto','默认'],['left','居左'],['center','居中']],
 divider:[['none','无'],['wave','波浪'],['slant','斜切'],['curve','弧形'],['zigzag','锯齿']],
 sticky:[['none','不固定'],['top','吸顶'],['glass','毛玻璃吸顶']],
 hide:[['none','全部设备'],['mobile','手机隐藏'],['desktop','桌面隐藏']],
 enter:[['none','无'],['fade','淡入'],['fade-up','上浮'],['fade-down','下落'],['slide-left','从左滑入'],['slide-right','从右滑入'],['zoom-in','放大出现'],['zoom-out','缩小落定'],['blur','模糊聚焦'],['flip','翻转'],['rotate','旋入'],['clip','幕布揭示'],['bounce','弹跳'],['skew','斜切进入'],['swing','翻页'],['pop','弹出']],
 trigger:[['scroll','滚动到时'],['load','页面加载时']],
 ease:[['smooth','柔和'],['spring','弹性'],['snappy','利落'],['linear','匀速']],
 hover:[['none','无'],['lift','上浮'],['glow','光晕'],['tilt','3D 倾斜'],['scale','放大'],['shine','流光扫过'],['border','描边高亮'],['magnetic','磁吸'],['press','按压'],['follow','光斑跟随']],
 text:[['none','无'],['gradient','渐变'],['shimmer','流光'],['highlight','荧光笔'],['outline','空心描边'],['underline','下划线'],['glow','辉光'],['split','逐字出现'],['scramble','解码'],['wave','波浪'],['neon','霓虹闪烁'],['fill','描边填色']],
 loop:[['none','无'],['float','漂浮'],['pulse','呼吸'],['sway','摇摆']],
 scroll:[['none','无'],['parallax','视差'],['fade','渐隐渐现'],['zoom','缩放推进'],['rise','上浮跟随'],['tilt','透视倾斜'],['blur','景深模糊']],
 imageFit:[['cover','铺满'],['contain','完整'],['tile','平铺']],
 imagePos:[['center','居中'],['top','顶部'],['bottom','底部'],['left','左侧'],['right','右侧']],
 gradType:[['linear','线性'],['radial','径向'],['conic','锥形']],
 cursor:[['none','系统光标'],['glow','柔光跟随'],['dot','圆点光标'],['ring','光圈拖尾'],['spark','星光拖尾']],
 intro:[['none','无'],['fade','淡入'],['curtain','幕布上升'],['mark','品牌标记']]
};
// Text fields that renderers mark with data-f, so they can be selected and styled one by one.
export const EL_FIELDS=[['eyebrow','上方短句'],['title','主标题'],['subtitle','说明文字'],['button','主按钮'],['secondary','次要按钮']];
export const EL_DEFAULTS={color:'',size:100,weight:0,align:'',tracking:0,italic:false,upper:false,hidden:false};
export const STYLE_DEFAULTS={tone:'auto',bg:'',bg2:'',bg3:'',gradType:'linear',gradAngle:135,accent:'',pattern:'none',patternOpacity:60,image:'',imageFit:'cover',imagePos:'center',overlay:0,overlayColor:'',imageBlur:0,padTop:-1,padBottom:-1,width:'auto',align:'auto',radius:-1,zoom:100,divider:'none',sticky:'none',hide:'none',enter:'none',trigger:'scroll',stagger:false,duration:700,delay:0,ease:'smooth',hover:'none',text:'none',loop:'none',scroll:'none',css:'',media:{},els:{},free:{},freeM:{}};
export const EFFECT_DEFAULTS={progress:false,backTop:false,grain:false,scrollbar:false,cursor:'none',intro:'none',reveal:'none'};
export const ASSET_LIMITS={count:24,bytes:1400000,total:4500000};
const assetId=v=>typeof v==='string'&&/^a-[\w-]{4,40}$/.test(v);
const slotId=v=>/^[a-z][\w-]{0,20}$/.test(v);

export function normalizeElementStyle(raw){
 const e=plain(raw)?raw:{},out={};
 const full={color:hex(e.color)?e.color.toLowerCase():'',size:num(e.size,50,240,100),weight:[300,400,500,600,700,800,900].includes(Number(e.weight))?Number(e.weight):0,align:['left','center','right'].includes(e.align)?e.align:'',tracking:num(e.tracking,-10,40,0),italic:e.italic===true,upper:e.upper===true,hidden:e.hidden===true};
 for(const k of Object.keys(EL_DEFAULTS))if(full[k]!==EL_DEFAULTS[k])out[k]=full[k];
 return out;
}
// Free editing: any element inside a block, addressed by its child-index path ("2/1/3"; decor layers are skipped at the top level).
export const FREE_DEFAULTS={x:0,y:0,rotate:0,scale:100,w:0,opacity:100,z:0,color:'',bg:'',size:0,weight:0,align:'',lh:0,tracking:0,radius:-1,pad:-1,border:0,borderColor:'',shadow:'none',blur:0,italic:false,upper:false,hidden:false};
export const FREE_SHADOWS=[['none','无'],['soft','柔和'],['strong','浓重'],['hard','硬投影'],['glow','光晕']];
export const freePath=v=>typeof v==='string'&&/^\d{1,3}(\/\d{1,3}){0,11}$/.test(v)&&v.split('/').every(n=>Number(n)>=1);
const freeFull=e=>({x:num(e.x,-2400,2400,0),y:num(e.y,-2400,2400,0),rotate:num(e.rotate,-180,180,0),scale:num(e.scale,10,400,100),w:num(e.w,0,2400,0),opacity:num(e.opacity,0,100,100),z:num(e.z,-10,50,0),color:hex(e.color)?e.color.toLowerCase():'',bg:hex(e.bg)?e.bg.toLowerCase():'',size:num(e.size,0,240,0),weight:[100,200,300,400,500,600,700,800,900].includes(Number(e.weight))?Number(e.weight):0,align:['left','center','right'].includes(e.align)?e.align:'',lh:Number(e.lh)>0?num(e.lh,80,300,0):0,tracking:num(e.tracking,-10,60,0),radius:e.radius==null||Number(e.radius)<0?-1:num(e.radius,0,200,-1),pad:e.pad==null||Number(e.pad)<0?-1:num(e.pad,0,200,-1),border:num(e.border,0,20,0),borderColor:hex(e.borderColor)?e.borderColor.toLowerCase():'',shadow:pick(FREE_SHADOWS,e.shadow,'none'),blur:num(e.blur,0,40,0),italic:e.italic===true,upper:e.upper===true,hidden:e.hidden===true});
export function normalizeFree(raw){
 const e=plain(raw)?raw:{},full=freeFull(e),out={};
 for(const k of Object.keys(FREE_DEFAULTS))if(full[k]!==FREE_DEFAULTS[k])out[k]=full[k];
 return out;
}
// Phone overrides (≤760px) keep every key that was set, even a default value, so "back to 0 on phones" survives. An empty colour falls back to the desktop value.
export function normalizeFreeM(raw){
 const e=plain(raw)?raw:{},full=freeFull(e),out={};
 for(const k of Object.keys(FREE_DEFAULTS))if(Object.hasOwn(e,k)&&!(['color','bg','borderColor'].includes(k)&&!full[k]))out[k]=full[k];
 return out;
}
const freeSelector=path=>path.split('/').map((n,i)=>i===0?`>:nth-child(${n} of :not(.fx-bg,.fx-img,.fx-divider))`:`>:nth-child(${n})`).join('');
const SHADOW_CSS={soft:'0 12px 30px -12px rgba(0,0,0,.28)',strong:'0 28px 60px -18px rgba(0,0,0,.5)',hard:'6px 6px 0 currentColor',glow:'0 0 0 1px var(--accent),0 0 34px color-mix(in srgb,var(--accent) 55%,transparent)'};
// Declarations are grouped by the key that owns them, so a phone override can move whole groups into media queries.
const FREE_GROUP={y:'x',borderColor:'border'};
function freeDecl(e){const v={...FREE_DEFAULTS,...e},d={},add=(g,...x)=>{d[g]=x};
 if(v.x||v.y)add('x',`translate:${v.x}px ${v.y}px`);if(v.rotate)add('rotate',`rotate:${v.rotate}deg`);if(v.scale!==100)add('scale',`scale:${v.scale/100}`);if(v.w)add('w',`width:${v.w}px`,'max-width:none');if(v.opacity!==100)add('opacity',`opacity:${v.opacity/100}`);if(v.z)add('z','position:relative',`z-index:${v.z}`);
 if(v.color)add('color',`color:${v.color}`,'-webkit-text-fill-color:currentColor');if(v.bg)add('bg',`background:${v.bg}`);if(v.size)add('size',`font-size:${v.size}px`);if(v.weight)add('weight',`font-weight:${v.weight}`);if(v.align)add('align',`text-align:${v.align}`);if(v.lh)add('lh',`line-height:${v.lh/100}`);if(v.tracking)add('tracking',`letter-spacing:${v.tracking/100}em`);
 if(v.radius>=0)add('radius',`border-radius:${v.radius}px`,'overflow:hidden');if(v.pad>=0)add('pad',`padding:${v.pad}px`);if(v.border)add('border',`border:${v.border}px solid ${v.borderColor||'currentColor'}`);if(v.shadow!=='none')add('shadow',`box-shadow:${SHADOW_CSS[v.shadow]}`);if(v.blur)add('blur',`filter:blur(${v.blur}px)`);if(v.italic)add('italic','font-style:italic');if(v.upper)add('upper','text-transform:uppercase');if(v.hidden)add('hidden','display:none!important');
 return d}
const freeRule=(e,keep=()=>true)=>Object.entries(freeDecl(e)).filter(([g])=>keep(g)).flatMap(([,x])=>x).join(';');
// Returns only the keys that differ from defaults, so unchanged blocks stay compact in JSON.
export function normalizeBlockStyle(raw){
 const s=plain(raw)?raw:{},o=FX_OPTIONS,out={};
 const media={},els={},free={},freeM={};
 if(plain(s.free))for(const [k,v] of Object.entries(s.free).slice(0,80))if(freePath(k)){const n=normalizeFree(v);if(Object.keys(n).length)free[k]=n}
 if(plain(s.freeM))for(const [k,v] of Object.entries(s.freeM).slice(0,80))if(freePath(k)){const n=normalizeFreeM(v);if(Object.keys(n).length)freeM[k]=n}
 if(plain(s.media))for(const [k,v] of Object.entries(s.media).slice(0,24))if(slotId(k)&&assetId(v))media[k]=v;
 if(plain(s.els))for(const [k] of EL_FIELDS){const v=normalizeElementStyle(s.els[k]);if(Object.keys(v).length)els[k]=v}
 const full={tone:pick(o.tone,s.tone,'auto'),bg:hex(s.bg)?s.bg.toLowerCase():'',bg2:hex(s.bg2)?s.bg2.toLowerCase():'',bg3:hex(s.bg3)?s.bg3.toLowerCase():'',gradType:pick(o.gradType,s.gradType,'linear'),gradAngle:num(s.gradAngle,0,360,135),accent:hex(s.accent)?s.accent.toLowerCase():'',pattern:pick(o.pattern,s.pattern,'none'),patternOpacity:num(s.patternOpacity,5,100,60),image:assetId(s.image)?s.image:'',imageFit:pick(o.imageFit,s.imageFit,'cover'),imagePos:pick(o.imagePos,s.imagePos,'center'),overlay:num(s.overlay,0,90,0),overlayColor:hex(s.overlayColor)?s.overlayColor.toLowerCase():'',imageBlur:num(s.imageBlur,0,24,0),padTop:s.padTop==null||Number(s.padTop)<0?-1:num(s.padTop,0,240,-1),padBottom:s.padBottom==null||Number(s.padBottom)<0?-1:num(s.padBottom,0,240,-1),width:pick(o.width,s.width,'auto'),align:pick(o.align,s.align,'auto'),radius:s.radius==null||Number(s.radius)<0?-1:num(s.radius,0,48,-1),zoom:num(s.zoom,70,140,100),divider:pick(o.divider,s.divider,'none'),sticky:pick(o.sticky,s.sticky,'none'),hide:pick(o.hide,s.hide,'none'),enter:pick(o.enter,s.enter,'none'),trigger:pick(o.trigger,s.trigger,'scroll'),stagger:s.stagger===true,duration:num(s.duration,150,2400,700),delay:num(s.delay,0,2000,0),ease:pick(o.ease,s.ease,'smooth'),hover:pick(o.hover,s.hover,'none'),text:pick(o.text,s.text,'none'),loop:pick(o.loop,s.loop,'none'),scroll:pick(o.scroll,s.scroll,'none'),css:typeof s.css==='string'?s.css.slice(0,8000):''};
 for(const k of Object.keys(STYLE_DEFAULTS)){if(k==='media'||k==='els'||k==='free'||k==='freeM')continue;if(full[k]!==STYLE_DEFAULTS[k])out[k]=full[k]}
 if(Object.keys(media).length)out.media=media;if(Object.keys(els).length)out.els=els;if(Object.keys(free).length)out.free=free;if(Object.keys(freeM).length)out.freeM=freeM;
 return out;
}
export function normalizeEffects(raw){
 const e=plain(raw)?raw:{},o=FX_OPTIONS;
 return {progress:e.progress===true,backTop:e.backTop===true,grain:e.grain===true,scrollbar:e.scrollbar===true,cursor:pick(o.cursor,e.cursor,'none'),intro:pick(o.intro,e.intro,'none'),reveal:pick(o.enter,e.reveal,'none')};
}
// Uploaded images live in project.assets as compressed raster data URLs. SVG and remote URLs are never accepted.
export function normalizeAssets(raw){
 const out={};let total=0;if(!plain(raw))return out;
 for(const [id,a] of Object.entries(raw)){if(Object.keys(out).length>=ASSET_LIMITS.count)break;if(!assetId(id)||!plain(a))continue;const d=a.d;if(typeof d!=='string'||d.length>ASSET_LIMITS.bytes||!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(d))continue;if(total+d.length>ASSET_LIMITS.total)break;total+=d.length;out[id]={d,n:typeof a.n==='string'?a.n.slice(0,60):'图片',w:num(a.w,1,8000,0),h:num(a.h,1,8000,0)}}
 return out;
}
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const inkFor=h=>lum(h)>.36?'#141414':'#ffffff';
const palette=(bg,ink,surface)=>`--bg:${bg};--surface:${surface};--ink:${ink};--muted:color-mix(in srgb,${ink} 62%,${bg});--line:color-mix(in srgb,${ink} 14%,transparent);--tint:color-mix(in srgb,var(--accent) 10%,${surface});background:var(--bg);color:var(--ink);`;

// Attributes, inline variables and decorative layers for one section. `theme` is the normalized project theme.
export function sectionFx(style,theme,effects={},assets={}){
 const s={...STYLE_DEFAULTS,...style},t=theme,attrs=[],css=[];let pre='';
 const enter=s.enter!=='none'?s.enter:(effects.reveal&&effects.reveal!=='none'?effects.reveal:'none');
 if(s.accent){css.push(`--accent:${s.accent};--button-ink:${inkFor(s.accent)};`)}
 const accent=s.accent||t.accent;
 if(s.tone==='invert')css.push(palette(t.ink,t.bg,`color-mix(in srgb,${t.ink} 86%,${t.bg})`));
 else if(s.tone==='tint')css.push(palette(`color-mix(in srgb,${accent} 9%,${t.bg})`,t.ink,t.surface));
 else if(s.tone==='accent')css.push(palette(accent,inkFor(accent),`color-mix(in srgb,${inkFor(accent)} 10%,${accent})`)+`--accent:${inkFor(accent)};--button-ink:${accent};`);
 else if(s.tone==='dark')css.push(palette('#111214','#f3f3f0','#1c1d21'));
 else if(s.tone==='light')css.push(palette('#ffffff','#161616','#f6f6f3'));
 if(s.bg){const ink=s.tone==='auto'?(lum(s.bg)<.3&&lum(t.ink)<.3?'#f4f4f1':lum(s.bg)>.45&&lum(t.ink)>.45?'#161616':t.ink):null;css.push(ink?palette(s.bg,ink,`color-mix(in srgb,${ink} 7%,${s.bg})`):`--bg:${s.bg};background:var(--bg);`)}
 if(s.bg2){const stops=`var(--bg) 0%,${s.bg3?`${s.bg2} 50%,${s.bg3} 100%`:`${s.bg2} 100%`}`;css.push(`background:${s.gradType==='radial'?`radial-gradient(circle at 30% 20%,${stops})`:s.gradType==='conic'?`conic-gradient(from ${s.gradAngle}deg at 50% 50%,${stops.replace(' 100%','')},var(--bg))`:`linear-gradient(${s.gradAngle}deg,${stops})`};`)}
 if(s.image&&assets[s.image]){pre+='<div class="fx-img" aria-hidden="true"></div>';css.push(`--img-fit:${s.imageFit==='tile'?'auto':s.imageFit};--img-repeat:${s.imageFit==='tile'?'repeat':'no-repeat'};--img-pos:${s.imagePos};--img-blur:${s.imageBlur}px;--overlay:${s.overlay/100};--overlay-color:${s.overlayColor||'#000000'};`)}
 if(s.padTop>=0)css.push(`padding-top:${s.padTop}px;`);
 if(s.padBottom>=0)css.push(`padding-bottom:${s.padBottom}px;`);
 if(s.radius>=0)css.push(`--radius:${s.radius}px;`);
 if(s.zoom!==100)css.push(`zoom:${s.zoom/100};`);
 if(s.pattern!=='none'){css.push(`--fx-po:${s.patternOpacity};`);pre+=`<div class="fx-bg" data-fx-bg="${s.pattern}" aria-hidden="true">${['aurora','stars','waves','beams','blobs'].includes(s.pattern)?'<i></i><i></i><i></i>':''}</div>`}
 if(s.divider!=='none')pre+=`<div class="fx-divider" data-shape="${s.divider}" aria-hidden="true"></div>`;
 for(const k of ['width','align','sticky','hide','hover','text','loop','scroll'])if(s[k]!==STYLE_DEFAULTS[k])attrs.push(`data-${k}="${s[k]}"`);
 if(enter!=='none'){attrs.push(`data-enter="${enter}"`);if(s.trigger==='load')attrs.push('data-trigger="load"');if(s.stagger)attrs.push('data-stagger');css.push(`--fx-d:${s.duration}ms;--fx-delay:${s.delay}ms;`);if(s.ease!=='smooth')attrs.push(`data-ease="${s.ease}"`)}
 return {attrs:attrs.length?' '+attrs.join(' '):'',style:css.length?` style="${css.join('').replace(/"/g,'&quot;')}"`:'',pre};
}
// Per-block stylesheet rules: images, replaced media slots, element styles and the block's own CSS.
export function scopedCSS(blocks,assets={}){return blocks.filter(b=>!b.hidden).map(b=>{const id=`#s-${String(b.uid).replace(/[^\w-]/g,'')}`,s=b.style||{},rules=[];
 if(s.image&&assets[s.image])rules.push(`${id}>.fx-img{background-image:url("${assets[s.image].d}")}`);
 for(const [slot,a] of Object.entries(s.media||{}))if(assets[a])rules.push(`${id} [data-media="${slot}"]{background:url("${assets[a].d}") center/cover no-repeat}${id} [data-media="${slot}"]>*{visibility:hidden}${id} [data-media="${slot}"]::before{display:none}`);
 for(const [f,e] of Object.entries(s.els||{})){const d=[];if(e.color)d.push(`color:${e.color}`,'-webkit-text-fill-color:currentColor');if(e.size&&e.size!==100)d.push(`zoom:${e.size/100}`);if(e.weight)d.push(`font-weight:${e.weight}`);if(e.align)d.push(`text-align:${e.align}`);if(e.tracking)d.push(`letter-spacing:${e.tracking/100}em`);if(e.italic)d.push('font-style:italic');if(e.upper)d.push('text-transform:uppercase');if(e.hidden)d.push('display:none!important');if(d.length)rules.push(`${id} [data-f="${f}"]{${d.join(';')}}`)}
 // Groups a phone override touches move into min-width/max-width queries; the rest apply everywhere.
 const fm=s.freeM||{};for(const p of new Set([...Object.keys(s.free||{}),...Object.keys(fm)])){if(!freePath(p))continue;const sel=id+freeSelector(p),e=(s.free||{})[p]||{},m=fm[p],g=new Set(Object.keys(m||{}).map(k=>FREE_GROUP[k]||k)),all=freeRule(e,k=>!g.has(k));if(all)rules.push(`${sel}{${all}}`);if(m){const desk=freeRule(e,k=>g.has(k)),phone=freeRule({...e,...m},k=>g.has(k));if(desk)rules.push(`@media(min-width:761px){${sel}{${desk}}}`);if(phone)rules.push(`@media(max-width:760px){${sel}{${phone}}}`)}}
 if(s.css)rules.push(`${id}{\n${String(s.css).replace(/<\/style/gi,'')}\n}`);
 return rules.join('\n')}).filter(Boolean).join('\n');}

const uri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const NOISE=uri(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
const zig=Array.from({length:30},(_,i)=>`L${i*40+20} 46 L${i*40+40} 18`).join(' ');
const SHAPES={wave:'M0 0H1200V26C1050 58 900 58 750 32S450 0 300 22 90 56 0 30Z',slant:'M0 0H1200V0L0 60Z',curve:'M0 0H1200V6Q600 116 0 6Z',zigzag:`M0 0H1200V18 ${zig.replace(/^L/,'L')} L0 18Z`};
const shape=d=>uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 60' preserveAspectRatio='none'><path d='${d}'/></svg>`);
const WAVE=uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 80' preserveAspectRatio='none'><path d='M0 40C100 10 200 10 300 40S500 70 600 40V80H0Z'/></svg>`);
const CARDS=':is(.panel,.fx-card,.work-grid>article,.task,.price-card)';
const HEADS=':is(.section-heading h2,.block-quote blockquote,.fx-title)';
const LOOPS='.panel,.window,.split-visual,.product-art,.editorial-orbit,.paper-card,.fx-card,.work-art,.orbital,.lamp,.fx-float';

export const FX_CSS=String.raw`
/* Design Atlas FX runtime · original · MIT */
::selection{background:color-mix(in srgb,var(--accent) 32%,transparent)}
.section-heading h2{font-size:calc(clamp(26px,4vw,46px)*var(--hs,1))}.hero-copy .section-heading h2{font-size:calc(clamp(36px,6vw,72px)*var(--hs,1))}
.section-heading h2,.panel h3,.block-quote blockquote,.fx-title{font-family:var(--font-heading,var(--font))}.section-heading h2,.fx-title{font-weight:var(--heading-weight,600)}
.block{background-clip:padding-box}
.block[data-width=narrow]{padding-left:max(6%,calc((100% - 760px)/2));padding-right:max(6%,calc((100% - 760px)/2))}
.block[data-width=wide]{padding-left:max(4%,calc((100% - 1360px)/2));padding-right:max(4%,calc((100% - 1360px)/2))}
.block[data-width=full]{padding-left:3.5%;padding-right:3.5%}
.block[data-align=center]{text-align:center}.block[data-align=center] .section-heading p{margin-left:auto;margin-right:auto}.block[data-align=center] .actions{justify-content:center}
.block[data-align=left]{text-align:left}.block[data-align=left] .actions{justify-content:flex-start}.block[data-align=left] .section-heading p{margin-left:0}
.block[data-sticky]{position:sticky;top:0;z-index:40;background:var(--bg)}
.block[data-sticky=glass]{background:color-mix(in srgb,var(--bg) 70%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.5);backdrop-filter:blur(16px) saturate(1.5)}
@media(max-width:760px){.block[data-hide=mobile]{display:none!important}}@media(min-width:761px){.block[data-hide=desktop]{display:none!important}}

.fx-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;opacity:calc(var(--fx-po,60)/100)}
.fx-bg[data-fx-bg=grid]{background-image:linear-gradient(color-mix(in srgb,var(--ink) 16%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--ink) 16%,transparent) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%)}
.fx-bg[data-fx-bg=dots]{background-image:radial-gradient(color-mix(in srgb,var(--ink) 40%,transparent) 1.2px,transparent 1.7px);background-size:22px 22px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 85%);mask-image:linear-gradient(180deg,#000,transparent 85%)}
.fx-bg[data-fx-bg=lines]{background-image:repeating-linear-gradient(135deg,color-mix(in srgb,var(--ink) 12%,transparent) 0 1px,transparent 1px 15px)}
.fx-bg[data-fx-bg=grain]{background-image:${NOISE};background-size:180px;mix-blend-mode:multiply}
.fx-bg[data-fx-bg=gradient]{background:radial-gradient(ellipse at 0% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 55%),radial-gradient(ellipse at 100% 100%,color-mix(in srgb,var(--accent-2,var(--accent)) 28%,transparent),transparent 55%)}
.fx-bg[data-fx-bg=aurora] i{position:absolute;width:62%;height:120%;top:-35%;left:-12%;border-radius:50%;background:var(--accent);filter:blur(70px);opacity:.42;animation:fx-aurora 16s ease-in-out infinite alternate}
.fx-bg[data-fx-bg=aurora] i:nth-child(2){left:45%;top:-10%;background:var(--accent-2,#d6a1ff);animation-delay:-6s}.fx-bg[data-fx-bg=aurora] i:nth-child(3){left:15%;top:40%;background:color-mix(in srgb,var(--accent) 50%,#7dd3fc);animation-delay:-11s}
@keyframes fx-aurora{50%{translate:12% 14%;scale:1.15}to{translate:-8% 22%;scale:.9;rotate:25deg}}
.fx-bg[data-fx-bg=mesh]{inset:-40%;background:conic-gradient(from 0deg at 50% 50%,color-mix(in srgb,var(--accent) 45%,transparent),color-mix(in srgb,var(--accent-2,var(--accent)) 40%,transparent),transparent,color-mix(in srgb,var(--accent) 35%,transparent));filter:blur(70px);animation:fx-spin 24s linear infinite}
@keyframes fx-spin{to{rotate:360deg}}
.fx-bg[data-fx-bg=spotlight]{background:radial-gradient(520px circle at var(--px,50%) var(--py,35%),color-mix(in srgb,var(--accent) 30%,transparent),transparent 62%)}
.fx-bg[data-fx-bg=stars] i{position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 22%,var(--ink),transparent),radial-gradient(1px 1px at 32% 78%,var(--ink),transparent),radial-gradient(1.6px 1.6px at 58% 34%,var(--accent),transparent),radial-gradient(1px 1px at 76% 64%,var(--ink),transparent),radial-gradient(1.3px 1.3px at 88% 16%,var(--accent),transparent),radial-gradient(1px 1px at 44% 52%,var(--ink),transparent);background-size:340px 300px;animation:fx-twinkle 4s ease-in-out infinite alternate}
.fx-bg[data-fx-bg=stars] i:nth-child(2){background-size:260px 230px;background-position:60px 40px;animation-delay:-2s}.fx-bg[data-fx-bg=stars] i:nth-child(3){background-size:420px 380px;background-position:130px 90px;animation-duration:6s}
@keyframes fx-twinkle{from{opacity:.25}to{opacity:1}}
.fx-bg[data-fx-bg=beams] i{position:absolute;top:-20%;bottom:-20%;width:18%;left:12%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--accent) 40%,transparent),transparent);filter:blur(18px);rotate:14deg;animation:fx-beam 9s ease-in-out infinite alternate}
.fx-bg[data-fx-bg=beams] i:nth-child(2){left:46%;width:10%;animation-delay:-3s}.fx-bg[data-fx-bg=beams] i:nth-child(3){left:72%;width:14%;animation-delay:-6s}
@keyframes fx-beam{to{translate:40% 0;opacity:.4}}
.fx-bg[data-fx-bg=rings]{background:repeating-radial-gradient(circle at 80% 30%,transparent 0 38px,color-mix(in srgb,var(--ink) 11%,transparent) 38px 39px);-webkit-mask-image:radial-gradient(circle at 80% 30%,#000,transparent 70%);mask-image:radial-gradient(circle at 80% 30%,#000,transparent 70%)}
.fx-bg[data-fx-bg=waves] i{position:absolute;left:0;bottom:-2px;width:200%;height:46%;background:color-mix(in srgb,var(--accent) 22%,transparent);-webkit-mask:${WAVE} 0 100%/50% 100% repeat-x;mask:${WAVE} 0 100%/50% 100% repeat-x;animation:fx-wave 14s linear infinite}
.fx-bg[data-fx-bg=waves] i:nth-child(2){height:34%;opacity:.7;animation-duration:9s;animation-direction:reverse}.fx-bg[data-fx-bg=waves] i:nth-child(3){height:22%;opacity:.5;animation-duration:20s}
@keyframes fx-wave{to{translate:-50% 0}}
.fx-divider{position:absolute;left:0;right:0;top:-1px;height:clamp(28px,5vw,64px);background:var(--page-bg,var(--bg));pointer-events:none;z-index:0}
${Object.entries(SHAPES).map(([k,d])=>`.fx-divider[data-shape=${k}]{-webkit-mask:${shape(d)} 0 0/100% 100% no-repeat;mask:${shape(d)} 0 0/100% 100% no-repeat}`).join('\n')}

[data-enter]{--fx-ease:cubic-bezier(.22,.8,.24,1);--fx-anim:fx-fade-up}
[data-ease=spring]{--fx-ease:cubic-bezier(.34,1.56,.64,1)}[data-ease=snappy]{--fx-ease:cubic-bezier(.16,1,.3,1)}[data-ease=linear]{--fx-ease:linear}
[data-stagger]{--fx-step:95ms}
${FX_OPTIONS.enter.slice(1).map(([k])=>`[data-enter=${k}]{--fx-anim:fx-${k}}`).join('')}
[data-enter=flip]{perspective:1200px}
.fx-ready [data-enter]:not(.fx-in):not(.fx-replay) .fx-t{opacity:0}
.fx-ready [data-enter].fx-in .fx-t,[data-enter].fx-replay .fx-t{animation:var(--fx-anim) var(--fx-d,700ms) var(--fx-ease) calc(var(--fx-delay,0ms) + var(--fx-i,0) * var(--fx-step,0ms)) backwards}
@keyframes fx-fade{from{opacity:0}}
@keyframes fx-fade-up{from{opacity:0;translate:0 44px}}
@keyframes fx-fade-down{from{opacity:0;translate:0 -44px}}
@keyframes fx-slide-left{from{opacity:0;translate:-72px 0}}
@keyframes fx-slide-right{from{opacity:0;translate:72px 0}}
@keyframes fx-zoom-in{from{opacity:0;scale:.84}}
@keyframes fx-zoom-out{from{opacity:0;scale:1.14}}
@keyframes fx-blur{from{opacity:0;filter:blur(16px);scale:1.03}}
@keyframes fx-flip{from{opacity:0;rotate:x -38deg;translate:0 30px}}
@keyframes fx-rotate{from{opacity:0;rotate:-7deg;translate:0 46px;scale:.95}}
@keyframes fx-clip{from{clip-path:inset(0 0 100% 0);translate:0 28px}to{clip-path:inset(0 0 0 0)}}
@keyframes fx-bounce{0%{opacity:0;translate:0 70px;scale:.9}55%{opacity:1;translate:0 -12px;scale:1.02}78%{translate:0 5px}to{translate:0 0;scale:1}}

[data-hover] ${CARDS}{transition:translate .4s cubic-bezier(.22,.8,.24,1),scale .4s cubic-bezier(.22,.8,.24,1),box-shadow .4s,outline-offset .3s,outline-color .3s,transform .25s}
[data-hover=lift] ${CARDS}:hover{translate:0 -8px;box-shadow:0 26px 50px -22px color-mix(in srgb,var(--ink) 45%,transparent)}
[data-hover=glow] ${CARDS}:hover{box-shadow:0 0 0 1px var(--accent),0 18px 60px -12px color-mix(in srgb,var(--accent) 60%,transparent)}
[data-hover=scale] ${CARDS}:hover{scale:1.035}
[data-hover=border] ${CARDS}{outline:2px solid transparent;outline-offset:10px}[data-hover=border] ${CARDS}:hover{outline-color:var(--accent);outline-offset:4px}
[data-hover=tilt] ${CARDS}{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transform-style:preserve-3d}
[data-hover=tilt] ${CARDS}::after,[data-hover=shine] ${CARDS}::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s}
[data-hover=tilt] ${CARDS}{position:relative}[data-hover=tilt] ${CARDS}::after{background:radial-gradient(420px circle at var(--gx,50%) var(--gy,50%),color-mix(in srgb,#fff 32%,transparent),transparent 45%)}[data-hover=tilt] ${CARDS}:hover::after{opacity:1}
[data-hover=shine] ${CARDS}{position:relative;overflow:hidden}[data-hover=shine] ${CARDS}::after{opacity:1;background:linear-gradient(115deg,transparent 30%,color-mix(in srgb,#fff 45%,transparent) 48%,transparent 66%);translate:-110% 0;transition:translate .9s cubic-bezier(.22,.8,.24,1)}[data-hover=shine] ${CARDS}:hover::after{translate:110% 0}

[data-text=gradient] ${HEADS}{background:linear-gradient(100deg,var(--accent),var(--accent-2,var(--ink)));-webkit-background-clip:text;background-clip:text;color:transparent}
[data-text=shimmer] ${HEADS}{background:linear-gradient(110deg,var(--ink) 38%,var(--accent) 50%,var(--ink) 62%) 0 0/260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fx-shimmer 4s linear infinite}
@keyframes fx-shimmer{from{background-position:100% 0}to{background-position:-160% 0}}
[data-text=highlight] ${HEADS}{text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 48%,transparent);text-decoration-thickness:.36em;text-underline-offset:-.2em;text-decoration-skip-ink:none}
[data-text=outline] ${HEADS}{color:transparent;-webkit-text-stroke:1.4px var(--ink)}
[data-text=underline] ${HEADS}{text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:3px;text-underline-offset:.22em}
[data-text=glow] ${HEADS}{text-shadow:0 0 28px color-mix(in srgb,var(--accent) 75%,transparent),0 0 6px color-mix(in srgb,var(--accent) 45%,transparent)}
.fx-ch{display:inline-block;white-space:pre}
.fx-ready [data-text=split]:not(.fx-in):not(.fx-replay) .fx-ch{opacity:0}
.fx-ready [data-text=split].fx-in .fx-ch,[data-text=split].fx-replay .fx-ch{animation:fx-char .7s cubic-bezier(.22,.8,.24,1) calc(var(--fx-delay,0ms) + var(--c,0) * 28ms) backwards}
@keyframes fx-char{from{opacity:0;translate:0 .45em;filter:blur(8px)}}

[data-loop] .fx-l{animation:var(--fx-loop) 6s ease-in-out calc(var(--fx-li,0) * -1.1s) infinite}
[data-loop=float]{--fx-loop:fx-float}[data-loop=pulse]{--fx-loop:fx-pulse}[data-loop=sway]{--fx-loop:fx-sway}
.fx-ready [data-enter].fx-in .fx-t.fx-l,[data-enter].fx-replay .fx-t.fx-l{animation:var(--fx-anim) var(--fx-d,700ms) var(--fx-ease) calc(var(--fx-delay,0ms) + var(--fx-i,0) * var(--fx-step,0ms)) backwards,var(--fx-loop) 6s ease-in-out calc(var(--fx-li,0) * -1.1s) infinite}
@keyframes fx-float{50%{translate:0 -12px}}@keyframes fx-pulse{50%{scale:1.035}}@keyframes fx-sway{25%{rotate:1.6deg}75%{rotate:-1.6deg}}

.fx-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:1000;background:linear-gradient(90deg,var(--accent),var(--accent-2,var(--accent)));transform-origin:0 50%;scale:var(--fx-p,0) 1;pointer-events:none}
.fx-grain{position:fixed;inset:-60%;z-index:998;pointer-events:none;opacity:.08;background-image:${NOISE};animation:fx-grain 1.2s steps(5) infinite}
@keyframes fx-grain{20%{translate:-6% 4%}40%{translate:5% -6%}60%{translate:-3% 7%}80%{translate:7% 2%}}
.fx-top{position:fixed;right:22px;bottom:22px;z-index:997;width:46px;height:46px;border-radius:50%;background:var(--accent);color:var(--button-ink);font-size:18px;box-shadow:0 10px 30px -10px color-mix(in srgb,var(--ink) 50%,transparent);opacity:0;translate:0 14px;pointer-events:none;transition:opacity .3s,translate .3s}
.fx-top.show{opacity:1;translate:0 0;pointer-events:auto}
.fx-cursor{position:fixed;left:0;top:0;z-index:1001;pointer-events:none;translate:var(--cx,-100px) var(--cy,-100px)}
.fx-cursor[data-kind=glow]{width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,transparent),transparent 65%);z-index:-1;position:fixed}
.fx-cursor[data-kind=dot]{width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--accent);mix-blend-mode:difference}
.fx-cursor[data-kind=ring]{width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:1.5px solid var(--accent);transition:translate .18s cubic-bezier(.22,.8,.24,1),scale .2s}
.fx-cursor.press{scale:.7}
@media(hover:none){.fx-cursor{display:none}}
.fx-intro{position:fixed;inset:0;z-index:1002;display:grid;place-items:center;background:var(--accent);color:var(--button-ink);font-size:clamp(28px,6vw,64px);font-weight:600;letter-spacing:-2px;pointer-events:none}
.fx-intro[data-kind=fade]{background:var(--bg);color:var(--ink);animation:fx-intro-fade .9s .25s ease forwards}.fx-intro[data-kind=fade] span{display:none}
.fx-intro[data-kind=curtain]{animation:fx-curtain 1s .45s cubic-bezier(.76,0,.24,1) forwards}.fx-intro[data-kind=curtain] span{animation:fx-intro-fade .4s .35s ease forwards}
.fx-intro[data-kind=mark]{background:var(--bg);color:var(--accent);animation:fx-intro-fade .6s 1.1s ease forwards}.fx-intro[data-kind=mark] span{animation:fx-mark 1.2s cubic-bezier(.22,.8,.24,1) both}
@keyframes fx-intro-fade{to{opacity:0;visibility:hidden}}@keyframes fx-curtain{to{translate:0 -100%;visibility:hidden}}@keyframes fx-mark{from{opacity:0;scale:.6;rotate:-90deg}60%{opacity:1;scale:1.1;rotate:0deg}to{scale:1}}
main[data-scrollbar]{scrollbar-color:color-mix(in srgb,var(--accent) 70%,transparent) transparent}
html:has(main[data-scrollbar]){scrollbar-color:color-mix(in srgb,var(--accent) 70%,transparent) var(--bg);scrollbar-width:thin}
.fx-img{position:absolute;inset:calc(var(--img-blur,0px) * -2);z-index:-2;background-size:var(--img-fit,cover);background-repeat:var(--img-repeat,no-repeat);background-position:var(--img-pos,center);filter:blur(var(--img-blur,0px));pointer-events:none}
.fx-img::after{content:'';position:absolute;inset:0;background:var(--overlay-color,#000);opacity:var(--overlay,0)}
.block:has(>.fx-img){overflow:hidden}
.fx-bg[data-fx-bg=blobs] i{position:absolute;width:42%;aspect-ratio:1;left:4%;top:6%;background:var(--accent);opacity:.5;filter:blur(28px);border-radius:42% 58% 63% 37%/41% 44% 56% 59%;animation:fx-blob 18s ease-in-out infinite alternate}.fx-bg[data-fx-bg=blobs] i:nth-child(2){left:52%;top:26%;width:34%;background:var(--accent-2,var(--accent));animation-delay:-6s}.fx-bg[data-fx-bg=blobs] i:nth-child(3){left:26%;top:50%;width:30%;background:color-mix(in srgb,var(--accent) 45%,#fde68a);animation-delay:-11s}
@keyframes fx-blob{33%{border-radius:70% 30% 46% 54%/30% 39% 61% 70%;translate:10% 8%;rotate:60deg}66%{border-radius:28% 72% 44% 56%/49% 40% 60% 51%;translate:-6% 14%;rotate:-30deg}to{border-radius:53% 47% 34% 66%/63% 46% 54% 37%;translate:4% -6%;rotate:120deg}}
.fx-bg[data-fx-bg=retro]{top:42%;bottom:-10%;background-image:linear-gradient(color-mix(in srgb,var(--accent) 60%,transparent) 1.5px,transparent 1.5px),linear-gradient(90deg,color-mix(in srgb,var(--accent) 60%,transparent) 1.5px,transparent 1.5px);background-size:64px 64px;transform:perspective(420px) rotateX(64deg);transform-origin:50% 0;-webkit-mask-image:linear-gradient(transparent,#000 45%);mask-image:linear-gradient(transparent,#000 45%);animation:fx-retro 2.6s linear infinite}@keyframes fx-retro{to{background-position:0 64px}}
.fx-bg[data-fx-bg=flow]{background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 34%,transparent),color-mix(in srgb,var(--accent-2,var(--accent)) 34%,transparent),transparent 60%,color-mix(in srgb,var(--accent) 28%,transparent)) 0 0/300% 300%;animation:fx-flow 14s ease-in-out infinite alternate}@keyframes fx-flow{to{background-position:100% 100%}}
[data-enter=swing]{perspective:1200px}
@keyframes fx-skew{from{opacity:0;translate:0 50px;transform:skewY(7deg)}}@keyframes fx-swing{from{opacity:0;rotate:x -75deg;transform-origin:50% 0}to{transform-origin:50% 0}}@keyframes fx-pop{0%{opacity:0;scale:.6}65%{opacity:1;scale:1.06}to{scale:1}}
[data-hover=magnetic] :is(${CARDS},.btn){translate:var(--mgx,0) var(--mgy,0);transition:translate .35s cubic-bezier(.22,.8,.24,1),box-shadow .35s}
[data-hover=press] ${CARDS}:hover{scale:.975;box-shadow:inset 0 2px 12px color-mix(in srgb,var(--ink) 16%,transparent)}[data-hover=press] ${CARDS}:active{scale:.95}
[data-hover=follow] ${CARDS}{position:relative;overflow:hidden}[data-hover=follow] ${CARDS}::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(280px circle at var(--gx,50%) var(--gy,50%),color-mix(in srgb,var(--accent) 30%,transparent),transparent 62%);opacity:0;transition:opacity .3s}[data-hover=follow] ${CARDS}:hover::before{opacity:1}
[data-text=neon] ${HEADS}{color:color-mix(in srgb,var(--accent) 25%,#fff);text-shadow:0 0 6px var(--accent),0 0 22px var(--accent),0 0 48px color-mix(in srgb,var(--accent) 70%,transparent);animation:fx-neon 5s linear infinite}@keyframes fx-neon{0%,17%,21%,24%,52%,56%,to{opacity:1}19%,23%,54%{opacity:.55}}
[data-text=wave] .fx-ch{animation:fx-wave 2.4s ease-in-out calc(var(--c,0) * .07s) infinite}@keyframes fx-wave{0%,60%,to{translate:0 0}30%{translate:0 -.2em}}
[data-text=fill] ${HEADS}{color:transparent;-webkit-text-stroke:1.2px var(--ink);background:linear-gradient(var(--accent),var(--accent)) 0 0/100% 100% no-repeat;-webkit-background-clip:text;background-clip:text}
.fx-ready [data-text=fill]:not(.fx-in):not(.fx-replay) ${HEADS}{background-size:0 100%}.fx-ready [data-text=fill].fx-in ${HEADS},[data-text=fill].fx-replay ${HEADS}{animation:fx-fill 1.6s cubic-bezier(.65,0,.35,1) .2s backwards}@keyframes fx-fill{from{background-size:0 100%}}
[data-scroll=parallax]>:is(.fx-img,.fx-bg){inset:-14% 0;translate:0 calc((var(--sp,.5) - .5) * 24%)}
[data-scroll=parallax]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){translate:0 calc((var(--sp,.5) - .5) * -56px)}
[data-scroll=fade]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){opacity:calc(.12 + var(--sv,1) * .88)}
[data-scroll=zoom]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){scale:calc(.86 + var(--sv,1) * .14)}
[data-scroll=rise]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){translate:0 calc((1 - var(--sv,1)) * 70px);opacity:calc(.3 + var(--sv,1) * .7)}
[data-scroll=tilt]{perspective:1400px}[data-scroll=tilt]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){rotate:x calc((var(--sp,.5) - .5) * 18deg)}
[data-scroll=blur]>:not(.fx-img,.fx-bg,.fx-divider,[aria-hidden=true]){filter:blur(calc((1 - var(--sv,1)) * 10px))}
.fx-spark{position:fixed;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);pointer-events:none;z-index:1001;animation:fx-spark .75s ease-out forwards}@keyframes fx-spark{to{opacity:0;scale:.2;translate:var(--dx,0) var(--dy,14px)}}
@media(prefers-reduced-motion:reduce){.fx-bg *,.fx-bg,.fx-grain,.fx-intro{animation:none!important}.fx-intro{display:none}[data-scroll]>*{translate:none!important;scale:none!important;rotate:none!important;filter:none!important;opacity:1!important}}
`;

export const FX_JS=String.raw`
(()=>{const root=document.documentElement,ED=window.__ATLAS_EDITOR__,edit=!!ED&&ED.mode==='edit',reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hooks=window.__atlasHooks=window.__atlasHooks||[];if(!edit&&!reduce)root.classList.add('fx-ready');
const io='IntersectionObserver' in window?new IntersectionObserver(list=>list.forEach(x=>{if(x.isIntersecting){x.target.classList.add('fx-in');if(x.target.dataset.text==='scramble')heads(x.target).forEach(scramble);io.unobserve(x.target)}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'}):null;
const LOOPS='${LOOPS}';
const CH='▓▒░█◆◇✳#%&@ABCDEFGHJKLMNPQRSTUVWXYZ';
const scramble=el=>{if(el.dataset.fxScr)return;el.dataset.fxScr='1';const nodes=[];const walk=n=>n.childNodes.forEach(k=>{if(k.nodeType===3&&k.textContent.trim())nodes.push([k,k.textContent]);else if(k.nodeType===1)walk(k)});walk(el);const t0=performance.now(),dur=1200;const tick=t=>{const p=Math.min(1,(t-t0)/dur);nodes.forEach(([n,o])=>{const keep=Math.floor(o.length*p);n.textContent=o.slice(0,keep)+[...o.slice(keep)].map(c=>/\s/.test(c)?c:CH[Math.random()*CH.length|0]).join('')});if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};
const heads=sec=>sec.querySelectorAll('.section-heading h2,.block-quote blockquote,.fx-title');
const split=el=>{if(el.dataset.fxSplit)return;el.dataset.fxSplit='1';let c=0;const walk=n=>{[...n.childNodes].forEach(k=>{if(k.nodeType===3){const f=document.createDocumentFragment();[...k.textContent].forEach(ch=>{const s=document.createElement('span');s.className='fx-ch';s.textContent=ch;s.style.setProperty('--c',c++);f.append(s)});k.replaceWith(f)}else if(k.nodeType===1&&k.tagName!=='BR')walk(k)})};walk(el)};
function init(sec){if(!sec||!sec.matches||!sec.matches('main>section'))return;sec.querySelectorAll('.fx-t,.fx-l').forEach(x=>{x.classList.remove('fx-t','fx-l')});
 if(sec.dataset.enter){let t=[...sec.children].filter(x=>!x.matches('.fx-bg,.fx-divider,[aria-hidden=true]'));if(sec.hasAttribute('data-stagger'))t=t.flatMap(x=>{const d=getComputedStyle(x).display;return x.children.length>1&&/grid|flex/.test(d)?[...x.children]:[x]});t.slice(0,40).forEach((x,i)=>{x.classList.add('fx-t');x.style.setProperty('--fx-i',i)})}
 if(sec.dataset.loop)[...sec.querySelectorAll(LOOPS)].slice(0,12).forEach((x,i)=>{x.classList.add('fx-l');x.style.setProperty('--fx-li',i)});
 if(['split','wave'].includes(sec.dataset.text)&&!edit)heads(sec).forEach(split);
 if((sec.dataset.enter||['split','scramble','fill'].includes(sec.dataset.text))&&root.classList.contains('fx-ready')){if(sec.dataset.trigger==='load'||!io){sec.classList.add('fx-in');if(sec.dataset.text==='scramble')heads(sec).forEach(scramble)}else io.observe(sec)}
 hooks.forEach(fn=>{try{fn(sec,{edit})}catch{}})}
document.querySelectorAll('main>section').forEach(init);
window.__atlasFx={init,replay(sec){const d=parseFloat(getComputedStyle(sec).getPropertyValue('--fx-d'))||700;sec.classList.remove('fx-replay');void sec.offsetWidth;sec.classList.add('fx-replay');clearTimeout(sec.__fxT);sec.__fxT=setTimeout(()=>sec.classList.remove('fx-replay'),d+(parseFloat(getComputedStyle(sec).getPropertyValue('--fx-delay'))||0)+1600)}};
const progress=document.querySelector('.fx-progress'),top=document.querySelector('.fx-top'),cursor=edit?null:document.querySelector('.fx-cursor');let ticking=false;
const onScroll=()=>{ticking=false;if(!edit&&!reduce)document.querySelectorAll('main>section[data-scroll]').forEach(sec=>{const r=sec.getBoundingClientRect();if(r.bottom<-200||r.top>innerHeight+200)return;const sp=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));sec.style.setProperty('--sp',sp.toFixed(3));sec.style.setProperty('--sv',(1-Math.min(1,Math.abs(sp-.5)*2)).toFixed(3))});const h=document.documentElement.scrollHeight-innerHeight;if(progress)progress.style.setProperty('--fx-p',h>0?Math.min(1,scrollY/h):0);if(top)top.classList.toggle('show',scrollY>innerHeight*.6);hooks.forEach(fn=>{if(fn.scroll)try{fn.scroll()}catch{}})};
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});onScroll();
if(top)top.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));
const card=t=>t.closest&&t.closest(':is([data-hover=tilt],[data-hover=follow]) :is(.panel,.fx-card,.work-grid>article,.task,.price-card),[data-hover=magnetic] :is(.panel,.fx-card,.work-grid>article,.task,.price-card,.btn),.fx-tilt');
let sparkAt=0;
document.addEventListener('pointermove',e=>{const t=e.target;if(cursor){cursor.style.setProperty('--cx',e.clientX+'px');cursor.style.setProperty('--cy',e.clientY+'px')}if(reduce||!t.closest)return;
 const sec=t.closest('main>section');if(sec){const bg=sec.querySelector(':scope>.fx-bg[data-fx-bg=spotlight]');if(bg){const r=sec.getBoundingClientRect();sec.style.setProperty('--px',(e.clientX-r.left)+'px');sec.style.setProperty('--py',(e.clientY-r.top)+'px')}}
 const sp=t.closest('[data-spotlight]');if(sp){const r=sp.getBoundingClientRect();sp.style.setProperty('--mx',(e.clientX-r.left)+'px');sp.style.setProperty('--my',(e.clientY-r.top)+'px')}
 if(cursor&&cursor.dataset.kind==='spark'&&e.timeStamp-sparkAt>28&&document.querySelectorAll('.fx-spark').length<36){sparkAt=e.timeStamp;const p=document.createElement('i');p.className='fx-spark';p.style.left=e.clientX+'px';p.style.top=e.clientY+'px';p.style.setProperty('--dx',((Math.random()-.5)*30).toFixed(0)+'px');p.style.setProperty('--dy',(8+Math.random()*22).toFixed(0)+'px');document.body.append(p);setTimeout(()=>p.remove(),800)}
 const c=card(t);if(c){const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(c.closest('[data-hover=magnetic]')){c.style.setProperty('--mgx',((x-.5)*14).toFixed(1)+'px');c.style.setProperty('--mgy',((y-.5)*10).toFixed(1)+'px')}if(c.closest('[data-hover=tilt]')||c.matches('.fx-tilt')){c.style.setProperty('--rx',((.5-y)*10).toFixed(2)+'deg');c.style.setProperty('--ry',((x-.5)*12).toFixed(2)+'deg')}c.style.setProperty('--gx',(x*100).toFixed(1)+'%');c.style.setProperty('--gy',(y*100).toFixed(1)+'%')}},{passive:true});
document.addEventListener('pointerout',e=>{const c=card(e.target);if(c&&!c.contains(e.relatedTarget)){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg');c.style.setProperty('--mgx','0px');c.style.setProperty('--mgy','0px')}});
if(cursor){addEventListener('pointerdown',()=>cursor.classList.add('press'));addEventListener('pointerup',()=>cursor.classList.remove('press'))}
})();`;

// Injected only into the builder canvas. The canvas is a sandboxed iframe; all edits are proposals that the workbench validates.
export const EDITOR_CSS=String.raw`
html[data-atlas-mode=edit] main>section{cursor:default}
html[data-atlas-mode=edit] main>section:hover{outline:calc(1.5px*var(--k,1)) dashed color-mix(in srgb,#5b8cff 70%,transparent);outline-offset:calc(-1.5px*var(--k,1))}
html[data-atlas-mode=edit] main>section.atlas-selected{outline:calc(2px*var(--k,1)) solid #4f7cff;outline-offset:calc(-2px*var(--k,1))}
html[data-atlas-mode=edit] .fx-intro,html[data-atlas-mode=edit] .fx-cursor{display:none!important}
.atlas-ui{all:initial;position:fixed;z-index:2147483000;font:500 12px/1.2 "Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#fff;pointer-events:none}
.atlas-tag{background:#4f7cff;padding:5px 9px;border-radius:7px 7px 7px 0;box-shadow:0 6px 18px -6px #1d3a8a88;white-space:nowrap;display:flex;gap:6px;align-items:center}
.atlas-tag.hover{background:#1f2430e6}
.atlas-bar{display:flex;gap:2px;padding:4px;border-radius:11px;background:#14171ff2;box-shadow:0 12px 30px -8px #0009,0 0 0 1px #ffffff14;pointer-events:auto}
.atlas-bar button{all:unset;cursor:pointer;color:#e9ecf5;width:30px;height:28px;display:grid;place-items:center;border-radius:7px;font-size:14px}
.atlas-bar button:hover{background:#ffffff1f}.atlas-bar button[data-a=remove]:hover{background:#ff5d5d33;color:#ffb4b4}
.atlas-bar button[data-a=drag]{cursor:grab;font-size:15px;letter-spacing:-2px}
.atlas-bar i{width:1px;margin:5px 3px;background:#ffffff22}
.atlas-line{height:calc(4px*var(--k,1));border-radius:4px;background:#4f7cff;box-shadow:0 0 0 3px #4f7cff40}
.atlas-line::before,.atlas-line::after{content:'';position:absolute;top:-4px;width:12px;height:12px;border-radius:50%;background:#4f7cff}.atlas-line::before{left:-6px}.atlas-line::after{right:-6px}
.atlas-line span{position:absolute;left:50%;top:-30px;translate:-50% 0;background:#4f7cff;padding:5px 10px;border-radius:20px;white-space:nowrap}
.atlas-ghost{background:#4f7cff;padding:9px 14px;border-radius:10px;box-shadow:0 18px 40px -10px #1d3a8a99;rotate:-2deg}
main>section.atlas-dragging{opacity:.35}
[data-atlas-editing]{outline:2px solid #4f7cff!important;outline-offset:4px;border-radius:3px;cursor:text;background-clip:padding-box;caret-color:#4f7cff}
[data-atlas-editing]:focus{outline-color:#4f7cff}
.atlas-empty{min-height:70vh;display:grid;place-items:center;text-align:center;margin:24px;border:2px dashed color-mix(in srgb,var(--ink) 22%,transparent);border-radius:22px;color:var(--muted);font-size:14px;line-height:1.8}
.atlas-empty b{display:block;font-size:44px;color:var(--accent);font-weight:400}
html[data-atlas-mode=edit] .atlas-text-hit{cursor:text}

.atlas-el-on{outline:none}
.atlas-ff{border:calc(1.5px*var(--k,1)) solid #ff6a3d;border-radius:3px;box-shadow:0 0 0 calc(4px*var(--k,1)) #ff6a3d22;pointer-events:none}
.atlas-ff i{position:absolute;width:12px;height:12px;background:#fff;border:2px solid #ff6a3d;border-radius:3px;pointer-events:auto;box-sizing:border-box}
.atlas-ff .ff-r{right:-7px;top:50%;height:24px;margin-top:-12px;border-radius:6px;cursor:ew-resize}
.atlas-ff .ff-s{right:-8px;bottom:-8px;cursor:nwse-resize}
.atlas-ff .ff-rot{left:50%;top:calc(-32px*var(--k,1));margin-left:-6px;border-radius:50%;cursor:grab}
.atlas-ff .ff-rot::after{content:'';position:absolute;left:3px;top:10px;width:1.5px;height:20px;background:#ff6a3d}
.atlas-ff .ff-tag{position:absolute;left:-1.5px;bottom:calc(100% + 6px);background:#ff6a3d;color:#fff;padding:3px 8px;border-radius:6px;white-space:nowrap;font-size:11px}
.atlas-ff.top .ff-tag{bottom:auto;top:calc(100% + 6px)}
.atlas-fh{border:calc(1.5px*var(--k,1)) dashed #ff6a3d;border-radius:3px;pointer-events:none;opacity:.8}
.atlas-guide{background:#ff2d92;box-shadow:0 0 0 .5px #ff2d9255}.atlas-guide.v{width:calc(1px*var(--k,1))}.atlas-guide.h{height:calc(1px*var(--k,1))}
.atlas-guide::before,.atlas-guide::after{content:'';position:absolute;width:5px;height:5px;border-radius:50%;background:#ff2d92}.atlas-guide.v::before,.atlas-guide.v::after{left:-2px}.atlas-guide.v::before{top:-2px}.atlas-guide.v::after{bottom:-2px}.atlas-guide.h::before,.atlas-guide.h::after{top:-2px}.atlas-guide.h::before{left:-2px}.atlas-guide.h::after{right:-2px}
html[data-atlas-mode=edit] .atlas-free-on,.atlas-ff i,.atlas-pad,.atlas-bar button[data-a=drag]{touch-action:none}
.atlas-tag,.atlas-bar,.atlas-ghost,.atlas-pad,.atlas-ff i,.atlas-ff .ff-tag,.atlas-line span{scale:var(--k,1)}
.atlas-tag,.atlas-ff .ff-tag{transform-origin:0 100%}.atlas-ff.top .ff-tag{transform-origin:0 0}.atlas-bar{transform-origin:100% 100%}.atlas-ghost{transform-origin:0 0}.atlas-line span{transform-origin:50% 100%}
html[data-atlas-mode=edit] .atlas-free-on{cursor:move}
.atlas-drop-target{outline:3px solid #4f7cff!important;outline-offset:-3px;box-shadow:inset 0 0 0 9999px #4f7cff22!important}
.atlas-pad{pointer-events:auto;cursor:ns-resize;width:46px;height:12px;border-radius:10px;background:#4f7cff;border:2px solid #fff;box-shadow:0 4px 12px #1d3a8a55;display:flex;justify-content:center}
.atlas-pad span{position:absolute;top:16px;background:#14171ff2;padding:4px 8px;border-radius:7px;white-space:nowrap;display:none}
.atlas-pad.on span{display:block}
html[data-atlas-mode=edit] main>section.atlas-selected [data-media]:hover{outline:1.5px dashed #4f7cff;outline-offset:-2px;cursor:copy}
`;

export const EDITOR_JS=String.raw`
(()=>{const ED=window.__ATLAS_EDITOR__;if(!ED)return;const root=document.documentElement;root.dataset.atlasMode=ED.mode;const edit=ED.mode==='edit';
const post=m=>parent.postMessage(Object.assign({atlas:ED.token},m),'*');
// K is 1 / canvas zoom: editor chrome is scaled by it so handles and labels keep their real size on screen.
let K=ED.k||1;root.style.setProperty('--k',K);
const ui=(cls,html='')=>{const el=document.createElement('div');el.className='atlas-ui '+cls;el.innerHTML=html;el.hidden=true;document.body.append(el);return el};
const tag=ui('atlas-tag hover'),sel=ui('atlas-tag'),bar=ui('atlas-bar','<button data-a="drag" title="拖动排序">⋮⋮</button><i></i><button data-a="up" title="上移 Alt+↑">↑</button><button data-a="down" title="下移 Alt+↓">↓</button><button data-a="duplicate" title="复制 Ctrl+D">⧉</button><button data-a="add" title="在下方添加模块">＋</button><button data-a="replay" title="重播动效">▶</button><button data-a="hide" title="隐藏">◐</button><i></i><button data-a="remove" title="删除 Delete">✕</button>'),line=ui('atlas-line','<span>放到这里</span>'),ghost=ui('atlas-ghost');
const padT=ui('atlas-pad','<span></span>'),padB=ui('atlas-pad','<span></span>');
let selEl=ED.field||'',padDrag=null,dropEl=null,selFree=ED.free||'',fdrag=null,swallow=false,hoverEl=null;
const ff=ui('atlas-ff','<span class="ff-tag"></span><i class="ff-r" data-h="w" title="拖动改宽度"></i><i class="ff-s" data-h="s" title="拖动缩放"></i><i class="ff-rot" data-h="r" title="拖动旋转"></i>'),fh=ui('atlas-fh');
const DECOR='.fx-bg,.fx-img,.fx-divider';
// Smart guides: while moving, the element's edges and centre snap to its ancestors and siblings. Alt turns snapping off.
const gv=ui('atlas-guide v'),gh=ui('atlas-guide h'),SNAP=7;
const snapTargets=fe=>{const s=byId(selected),out=[];if(!s)return out;for(let n=fe.parentElement;n&&s.contains(n);n=n.parentElement){out.push(n.getBoundingClientRect());if(n===s)break}const p=fe.parentElement;if(p)for(const k of [...p.children].slice(0,60))if(k!==fe&&!k.matches(DECOR)&&k.getClientRects().length)out.push(k.getBoundingClientRect());return out};
const edges=(r,axis)=>axis==='x'?[r.left,r.left+r.width/2,r.right]:[r.top,r.top+r.height/2,r.bottom];
function snapTo(r,targets,axis,d){let best=null;for(const t of targets)for(const v of edges(t,axis))for(const m of edges(r,axis)){const diff=v-(m+d);if(Math.abs(diff)<=SNAP&&(!best||Math.abs(diff)<Math.abs(best.diff)))best={diff,v,t}}return best}
function showGuide(g,hit,m,axis){if(!hit){g.hidden=true;return}const t=hit.t;g.hidden=false;if(axis==='x'){const a=Math.min(m.top,t.top)-8,b=Math.max(m.bottom,t.bottom)+8;g.style.left=hit.v+'px';g.style.top=a+'px';g.style.height=(b-a)+'px'}else{const a=Math.min(m.left,t.left)-8,b=Math.max(m.right,t.right)+8;g.style.top=hit.v+'px';g.style.left=a+'px';g.style.width=(b-a)+'px'}}
const pathOf=(s,el)=>{const parts=[];let n=el;while(n&&n!==s){const p=n.parentElement;if(!p)return '';const kids=[...p.children].filter(k=>p!==s||!k.matches(DECOR));parts.unshift(kids.indexOf(n)+1);n=p}return n===s&&parts.length<=12?parts.join('/'):''};
const byPath=(s,path)=>{if(!s||!path)return null;let n=s;for(const [i,k] of path.split('/').entries()){const kids=[...n.children].filter(c=>i>0||!c.matches(DECOR));n=kids[Number(k)-1];if(!n)return null}return n};
const PICK='[data-f],[data-media],button,a,h1,h2,h3,h4,h5,p,li,figure,article,img,svg,blockquote,label,small,strong,time,dd,dt,.panel,.fx-card,.btn,.eyebrow,.tag';
const pickEl=(s,t)=>{if(!t||!t.closest)return null;let el=t.closest(PICK);if(!el||!s.contains(el)||el===s)el=t;if(el.closest('svg')&&el.tagName.toLowerCase()!=='svg')el=el.closest('svg');return el===s||!s.contains(el)?null:el};
const FIELD_NAMES={eyebrow:'上方短句',title:'主标题',subtitle:'说明文字',button:'主按钮',secondary:'次要按钮'};
const TAG_NAMES={h1:'大标题',h2:'标题',h3:'小标题',h4:'小标题',p:'段落',a:'链接',button:'按钮',img:'图片',svg:'图形',li:'列表项',figure:'图块',article:'卡片',blockquote:'引言',label:'表单项',small:'小字',strong:'强调',span:'文字',div:'容器',section:'模块'};
const describe=el=>({field:el.dataset.f||'',tag:el.tagName.toLowerCase(),label:FIELD_NAMES[el.dataset.f]||(el.dataset.media?'图片位':'')||TAG_NAMES[el.tagName.toLowerCase()]||el.tagName.toLowerCase(),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,30)});
const freeEl=()=>selFree?byPath(byId(selected),selFree):null;
function selectFree(s,el,notify=true){selFree=el?pathOf(s,el):'';schedule();if(notify)post(el&&selFree?{type:'atlas-select-free',uid:s.dataset.blockId,path:selFree,...describe(el)}:{type:'atlas-select',uid:s.dataset.blockId})}
const cur=el=>{const cs=getComputedStyle(el),t=(cs.translate||'').split(' ').map(parseFloat);return {x:t[0]||0,y:t[1]||0,rotate:parseFloat(cs.rotate)||0,scale:Math.round((parseFloat(cs.scale)||1)*100),w:el.offsetWidth}};
const live=el=>{if(!el.dataset.atlasLive){el.dataset.atlasLive='1';el.dataset.atlasOrig=el.getAttribute('style')||''}};
const unlive=()=>document.querySelectorAll('[data-atlas-live]').forEach(el=>{const o=el.dataset.atlasOrig;if(o)el.setAttribute('style',o);else el.removeAttribute('style');delete el.dataset.atlasLive;delete el.dataset.atlasOrig});
const sendFree=patch=>post({type:'atlas-free',uid:selected,path:selFree,patch});
let selected=ED.selected||'',hover=null,editing=null,drag=null,dropBefore=void 0,raf=0;
const sections=()=>[...document.querySelectorAll('main>section[data-block-id]')];
const byId=id=>id?document.querySelector('main>section[data-block-id="'+CSS.escape(id)+'"]'):null;
const name=s=>ED.names[s.dataset.blockId]||'模块';
function place(){raf=0;const s=byId(selected);sections().forEach(x=>x.classList.toggle('atlas-selected',x===s));document.querySelectorAll('.atlas-free-on').forEach(x=>x.classList.remove('atlas-free-on'));const fe=edit&&s?byPath(s,selFree):null;if(fe&&!drag){fe.classList.add('atlas-free-on');const r=fe.getBoundingClientRect();ff.hidden=false;ff.style.left=r.left+'px';ff.style.top=r.top+'px';ff.style.width=Math.max(4,r.width)+'px';ff.style.height=Math.max(4,r.height)+'px';ff.classList.toggle('top',r.top<34*K);const d=describe(fe);ff.querySelector('.ff-tag').textContent=d.label+(fdrag&&fdrag.info?' · '+fdrag.info:'')}else ff.hidden=true;
 if(edit&&s&&hoverEl&&hoverEl!==fe&&!drag&&!fdrag&&s.contains(hoverEl)){const r=hoverEl.getBoundingClientRect();fh.hidden=false;fh.style.left=r.left+'px';fh.style.top=r.top+'px';fh.style.width=r.width+'px';fh.style.height=r.height+'px'}else fh.hidden=true;
 const pr=s&&s.getBoundingClientRect();if(edit&&s&&!drag&&pr.bottom>30&&pr.top<innerHeight-30){padT.hidden=pr.top<-4&&!padDrag;padB.hidden=pr.bottom>innerHeight+4&&!padDrag;const cx=pr.left+pr.width/2-23;padT.style.left=padB.style.left=cx+'px';padT.style.top=Math.max(2,pr.top-6)+'px';padB.style.top=Math.min(innerHeight-14,pr.bottom-6)+'px'}else{padT.hidden=padB.hidden=true}
 const vr=s&&s.getBoundingClientRect();if(edit&&s&&!drag&&vr.bottom>30&&vr.top<innerHeight-30){const r=vr;sel.hidden=false;sel.textContent=name(s);label(sel,r);bar.hidden=false;bar.querySelector('[data-a=replay]').hidden=!s.dataset.enter&&s.dataset.text!=='split';
  // Toolbar: above the block if there is room; below a short block (e.g. a nav at the very top); otherwise inside its top edge.
  const bw=bar.offsetWidth,bh=bar.offsetHeight,room=(bh+12)*K;let y,o='100% 100%';if(r.top>room)y=r.top-6-bh;else if(r.height<260&&r.bottom+room<innerHeight){y=r.bottom+6;o='100% 0'}else{y=Math.min(Math.max(8,r.top+8),innerHeight-bh*K-8);o='100% 0'}
  bar.style.transformOrigin=o;bar.style.left=Math.max(8+bw*(K-1),r.right-bw-6)+'px';bar.style.top=(r.bottom<60?-100:y)+'px'}else{sel.hidden=true;bar.hidden=true}
 if(edit&&hover&&hover!==s&&!drag){const r=hover.getBoundingClientRect();tag.hidden=false;tag.textContent=name(hover);label(tag,r)}else tag.hidden=true}
function label(el,r){const h=el.offsetHeight;el.style.left=Math.max(4,r.left)+'px';if(r.top>(h+4)*K){el.style.transformOrigin='0 100%';el.style.top=(r.top-2-h)+'px'}else if(r.height<260&&r.bottom+(h+8)*K<innerHeight){el.style.transformOrigin='0 0';el.style.top=(r.bottom+2)+'px'}else{el.style.transformOrigin='0 0';el.style.top=Math.max(4,r.top+4)+'px'}}
const schedule=()=>{if(!raf)raf=requestAnimationFrame(place)};
function select(id,scroll,instant,field){if(field!==void 0)selEl=field;else if(id!==selected)selEl='';selected=id||'';schedule();const s=byId(selected);if(scroll&&s){const r=s.getBoundingClientRect();if(r.bottom<80||r.top>innerHeight-80)s.scrollIntoView({block:r.height>innerHeight*.8?'start':'center',behavior:instant?'auto':'smooth'})}}
addEventListener('scroll',()=>{schedule();clearTimeout(window.__atlasScrollT);window.__atlasScrollT=setTimeout(()=>post({type:'atlas-scroll',y:scrollY}),120)},{passive:true});addEventListener('resize',schedule);
document.addEventListener('pointerover',e=>{const s=e.target.closest&&e.target.closest('main>section[data-block-id]');if(s!==hover){hover=s;schedule()}const h=s&&s.dataset.blockId===selected?pickEl(s,e.target):null;if(h!==hoverEl){hoverEl=h;schedule()}});
document.addEventListener('pointerleave',()=>{hover=null;schedule()});
// Text editing: match an element's own text with a known text field of its block.
const own=el=>{let t='';for(const n of el.childNodes){if(n.nodeType===3)t+=n.textContent;else if(n.nodeName==='BR')t+='\n'}return t.replace(/[ \t]+\n/g,'\n').trim()};
function field(el,uid){const t=own(el);if(!t)return null;const props=ED.props[uid]||{};for(const [k,p] of Object.entries(props)){if(p.t==='text'&&String(p.v).trim()===t)return {key:k,multi:p.m}}
 for(const [k,p] of Object.entries(props)){if(p.t!=='list')continue;const rows=String(p.v).split(p.s==='c'?',':'\n');for(let r=0;r<rows.length;r++){const f=rows[r].split('|');for(let i=0;i<f.length;i++)if(f[i].trim()&&f[i].trim()===t)return {key:k,row:r,col:i}}}return null}
function startEdit(target){const s=target.closest('main>section[data-block-id]');if(!s)return false;const df=target.closest('[data-f]');if(df&&s.contains(df)&&own(df)&&(ED.props[s.dataset.blockId]||{})[df.dataset.f]){begin(df,s,{key:df.dataset.f,multi:df.dataset.f==='title'});return true}let el=target;while(el&&el!==s){const f=field(el,s.dataset.blockId);if(f){begin(el,s,f);return true}el=el.parentElement}return false}
function begin(el,s,f){finish(true);const span=document.createElement('span');span.dataset.atlasEditing='';const nodes=[...el.childNodes].filter(n=>n.nodeType===3||n.nodeName==='BR');const first=nodes.find(n=>n.textContent.trim()||n.nodeName==='BR');if(!first)return;el.insertBefore(span,first);let started=false;nodes.forEach(n=>{if(n===first)started=true;if(started||n.nodeType===3&&n.textContent.trim())span.append(n)});
 const before=own(span);span.contentEditable='plaintext-only';if(span.contentEditable!=='plaintext-only')span.contentEditable='true';editing={span,uid:s.dataset.blockId,f,before};span.focus();const r=document.createRange();r.selectNodeContents(span);const g=getSelection();g.removeAllRanges();g.addRange(r)}
function finish(commit){if(!editing)return;const {span,uid,f,before}=editing;editing=null;let v=span.innerText.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').trim();if(!f.multi&&f.row==null)v=v.replace(/\s*\n\s*/g,' ');if(f.row!=null)v=v.replace(/[\n|,]/g,' ');span.removeAttribute('contenteditable');delete span.dataset.atlasEditing;if(commit&&v!==before)post({type:'atlas-edit',uid,key:f.key,row:f.row,col:f.col,value:v});else if(!commit){span.textContent='';before.split('\n').forEach((l,i)=>{if(i)span.append(document.createElement('br'));span.append(l)})}}
document.addEventListener('focusout',e=>{if(editing&&e.target===editing.span)finish(true)});
document.addEventListener('dblclick',e=>{if(!edit)return;if(startEdit(e.target))e.preventDefault()});
document.addEventListener('click',e=>{if(e.target.closest('.atlas-ui'))return;if(editing&&editing.span.contains(e.target))return;const s=e.target.closest('main>section[data-block-id]');
 if(edit){if(!e.target.matches('input,textarea,select,label,option')){e.preventDefault();e.stopPropagation()}if(swallow){swallow=false;return}if(s){if(s.dataset.blockId===selected){selectFree(s,pickEl(s,e.target))}else{selFree='';select(s.dataset.blockId,false,false,'');post({type:'atlas-select',uid:s.dataset.blockId})}}}},true);
// Drag the selected element to move it; handles resize, scale and rotate. Values are proposals; the workbench stores them.
document.addEventListener('pointerdown',e=>{if(!edit||editing||e.button!==0)return;const fe=freeEl();if(!fe)return;const h=e.target.closest&&e.target.closest('.atlas-ff i');const onEl=fe===e.target||fe.contains(e.target);if(!h&&!onEl)return;if(!h&&e.target.matches('input,textarea,select'))return;e.preventDefault();
 const mode=h?h.dataset.h:'move',start=cur(fe),r=fe.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,x0=e.clientX,y0=e.clientY,a0=Math.atan2(y0-cy,x0-cx),snaps=h?[]:snapTargets(fe);let moved=false,patch={};const cap=h||fe;try{cap.setPointerCapture(e.pointerId)}catch{}
 const move=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;if(!moved&&Math.hypot(dx,dy)<3)return;moved=true;live(fe);fdrag={mode};
  if(mode==='move'){let ddx=dx,ddy=dy,lock='';if(ev.shiftKey){lock=Math.abs(dx)>Math.abs(dy)?'y':'x';lock==='y'?ddy=0:ddx=0}const sx=!ev.altKey&&lock!=='x'?snapTo(r,snaps,'x',ddx):null,sy=!ev.altKey&&lock!=='y'?snapTo(r,snaps,'y',ddy):null;if(sx)ddx+=sx.diff;if(sy)ddy+=sy.diff;
   let x=Math.round(start.x+ddx),y=Math.round(start.y+ddy);if(!sx&&Math.abs(x)<6)x=0;if(!sy&&Math.abs(y)<6)y=0;fe.style.translate=x+'px '+y+'px';patch={x,y};const m={left:r.left+x-start.x,top:r.top+y-start.y};m.right=m.left+r.width;m.bottom=m.top+r.height;showGuide(gv,sx,m,'x');showGuide(gh,sy,m,'y');fdrag.info=x+', '+y+(sx||sy?' · 对齐':'')}
  else if(mode==='w'){const w=Math.max(16,Math.round(start.w+dx/((start.scale||100)/100)));fe.style.width=w+'px';fe.style.maxWidth='none';patch={w};fdrag.info='宽 '+w+'px'}
  else if(mode==='s'){const k=Math.max(10,Math.min(400,Math.round(start.scale*(1+dx/Math.max(40,r.width)))));fe.style.scale=k/100;patch={scale:k};fdrag.info=k+'%'}
  else if(mode==='r'){let a=Math.round(start.rotate+(Math.atan2(ev.clientY-cy,ev.clientX-cx)-a0)*180/Math.PI);a=((a+540)%360)-180;if(ev.shiftKey)a=Math.round(a/15)*15;fe.style.rotate=a+'deg';patch={rotate:a};fdrag.info=a+'°'}
  schedule()};
 const up=()=>{cap.removeEventListener('pointermove',move);cap.removeEventListener('pointerup',up);cap.removeEventListener('pointercancel',up);fdrag=null;gv.hidden=gh.hidden=true;if(moved){swallow=true;setTimeout(()=>{swallow=false},350);sendFree(patch)}schedule()};
 cap.addEventListener('pointermove',move);cap.addEventListener('pointerup',up);cap.addEventListener('pointercancel',up)},true);
document.addEventListener('submit',e=>{if(edit){e.preventDefault();e.stopImmediatePropagation()}},true);
bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!selected)return;const a=b.dataset.a;if(a==='drag')return;if(a==='replay'){const s=byId(selected);if(s&&window.__atlasFx)window.__atlasFx.replay(s);return}post({type:'atlas-action',uid:selected,action:a})});
// Drag sorting and drop targets. Hidden blocks are never rendered, so positions are expressed as "before this visible block".
function gap(y){const list=sections().filter(s=>!drag||s.dataset.blockId!==drag.uid);for(const s of list){const r=s.getBoundingClientRect();if(y<r.top+r.height/2)return {before:s.dataset.blockId,y:r.top}}const last=list[list.length-1];return {before:null,y:last?last.getBoundingClientRect().bottom:Math.min(innerHeight-40,120)}}
function showLine(y,label){const g=gap(y);dropBefore=g.before;line.hidden=false;line.style.left='16px';line.style.width=(innerWidth-32)+'px';line.style.top=Math.max(6,Math.min(innerHeight-8,g.y-2))+'px';line.querySelector('span').textContent=label||'放到这里'}
function hideLine(){line.hidden=true;dropBefore=void 0}
let auto=0;const autoScroll=y=>{cancelAnimationFrame(auto);const v=y<70?-(70-y)/3:y>innerHeight-70?(y-innerHeight+70)/3:0;if(v){auto=requestAnimationFrame(()=>{scrollBy(0,v);if(drag)showLine(drag.y,drag.label);autoScroll(y)})}};
bar.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a=drag]');if(!b||!selected||e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);drag={uid:selected,y:e.clientY,label:'移动「'+name(byId(selected))+'」'};byId(selected).classList.add('atlas-dragging');ghost.hidden=false;ghost.textContent='⋮⋮ '+name(byId(selected));schedule();
 const move=ev=>{drag.y=ev.clientY;ghost.style.left=(ev.clientX+14)+'px';ghost.style.top=(ev.clientY+10)+'px';showLine(ev.clientY,drag.label);autoScroll(ev.clientY)};move(e);
 const end=ev=>{b.removeEventListener('pointermove',move);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',end);cancelAnimationFrame(auto);const s=byId(drag.uid);if(s)s.classList.remove('atlas-dragging');ghost.hidden=true;const target=dropBefore;const uid=drag.uid;drag=null;hideLine();schedule();if(ev.type==='pointerup'&&target!==void 0&&target!==uid)post({type:'atlas-move',uid,before:target})};
 b.addEventListener('pointermove',move);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end)});
[[padT,'padTop'],[padB,'padBottom']].forEach(([h,key])=>h.addEventListener('pointerdown',e=>{const s=byId(selected);if(!s||e.button!==0)return;e.preventDefault();h.setPointerCapture(e.pointerId);const prop=key==='padTop'?'paddingTop':'paddingBottom',start=parseFloat(getComputedStyle(s)[prop])||0,y0=e.clientY;padDrag={key,v:Math.round(start)};h.classList.add('on');
 const move=ev=>{const v=Math.max(0,Math.min(240,Math.round((start+ev.clientY-y0)/4)*4));padDrag.v=v;s.style[prop]=v+'px';h.querySelector('span').textContent=(key==='padTop'?'上边距 ':'下边距 ')+v+'px';schedule()};
 const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);h.classList.remove('on');const d=padDrag;padDrag=null;if(d&&d.v!==Math.round(start))post({type:'atlas-style',uid:selected,patch:{[d.key]:d.v}});schedule()};
 h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)}));
const clearDrop=()=>{if(dropEl)dropEl.classList.remove('atlas-drop-target');dropEl=null};
addEventListener('message',e=>{if(e.source!==parent)return;const m=e.data||{};if(m.atlas!==ED.token)return;
 if(m.type==='select'){select(m.uid,m.scroll,false,'');selFree=typeof m.path==='string'?m.path:'';schedule()}
 else if(m.type==='select-field'){const s=byId(selected),el=s&&s.querySelector('[data-f="'+String(m.field).replace(/[^a-z]/g,'')+'"]');if(el)selectFree(s,el)}
 else if(m.type==='select-parent'){const s=byId(selected),fe=freeEl(),p=fe&&fe.parentElement;if(s)selectFree(s,p&&p!==s&&s.contains(p)?p:null)}
 else if(m.type==='hit'){const all=document.elementsFromPoint(m.x,m.y).filter(x=>!x.closest('.atlas-ui')),s=all.map(x=>x.closest('main>section[data-block-id]')).find(Boolean)||null,md=s&&all.find(x=>x.matches('[data-media]')&&s.contains(x))||null;const target=md||s;if(target!==dropEl){clearDrop();if(target&&!m.drop){dropEl=target;target.classList.add('atlas-drop-target')}}if(m.drop)clearDrop();post({type:'atlas-hit',id:m.id,drop:!!m.drop,uid:s?s.dataset.blockId:'',slot:md?md.dataset.media:''})}
 else if(m.type==='hit-clear'){clearDrop()}
 else if(m.type==='dragover'){showLine(m.y,m.label);autoScroll(m.y)}else if(m.type==='dragleave'){hideLine();cancelAnimationFrame(auto)}
 else if(m.type==='drop'){const b=dropBefore;hideLine();cancelAnimationFrame(auto);if(b!==void 0)post({type:'atlas-insert',blockType:m.blockType,before:b})}
 else if(m.type==='patch'){if(m.names)Object.assign(ED.names,m.names);if(m.props)Object.assign(ED.props,m.props);if(typeof m.css==='string'){const st=document.querySelector('style');if(st&&st.textContent!==m.css)st.textContent=m.css}unlive();(m.blocks||[]).forEach(p=>{const old=byId(p.uid);if(!old)return;const t=document.createElement('template');t.innerHTML=p.html;const s=t.content.firstElementChild;if(!s)return;old.replaceWith(s);if(window.__atlasFx)window.__atlasFx.init(s)});schedule()}
 else if(m.type==='replay'){const s=byId(m.uid);if(s&&window.__atlasFx)window.__atlasFx.replay(s)}
 else if(m.type==='scroll'){scrollTo(0,m.y)}
 else if(m.type==='ui-scale'){K=Math.max(1,Math.min(2.5,Number(m.k)||1));root.style.setProperty('--k',K);schedule()}});
document.addEventListener('keydown',e=>{if(editing){if(e.key==='Escape'){e.preventDefault();finish(false);editing=null}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finish(true)}return}
 if(e.target.matches('input,textarea,select,[contenteditable]'))return;const k=e.key,mod=e.ctrlKey||e.metaKey;const fe=edit&&freeEl();
 if(fe&&!mod&&!e.altKey){if(/^Arrow/.test(k)){e.preventDefault();const c=cur(fe),st=e.shiftKey?10:1,x=c.x+(k==='ArrowLeft'?-st:k==='ArrowRight'?st:0),y=c.y+(k==='ArrowUp'?-st:k==='ArrowDown'?st:0);live(fe);fe.style.translate=x+'px '+y+'px';schedule();sendFree({x,y});return}if(k==='Delete'||k==='Backspace'){e.preventDefault();sendFree({hidden:true});return}if(k==='Escape'){e.preventDefault();const s=byId(selected),p=fe.parentElement;selectFree(s,p&&p!==s&&s.contains(p)?p:null);return}}if(edit&&!mod&&!e.altKey&&/^Arrow(Up|Down)$/.test(k)){const list=sections(),i=list.indexOf(byId(selected)),n=list[Math.max(0,Math.min(list.length-1,i+(k==='ArrowUp'?-1:1)))];if(n){e.preventDefault();select(n.dataset.blockId,true,false,'');post({type:'atlas-select',uid:n.dataset.blockId})}return}if(['Delete','Backspace','Escape'].includes(k)||mod&&/^[zydcvse]$/i.test(k)||e.altKey&&/^Arrow(Up|Down)$/.test(k)){e.preventDefault();post({type:'atlas-key',key:k,mod,shift:e.shiftKey,alt:e.altKey})}});
if(!sections().length&&edit){const m=document.querySelector('main');if(m)m.insertAdjacentHTML('beforeend','<div class="atlas-empty"><div><b>✳</b>画布还空着。<br>从左侧把组件拖到这里，或点击组件直接加入。</div></div>')}
const go=()=>{if(ED.scroll)scrollTo(0,ED.scroll);select(selected,!!ED.reveal,true);post({type:'atlas-ready',y:scrollY})};if(document.readyState==='complete')go();else addEventListener('load',go);
})();`;
