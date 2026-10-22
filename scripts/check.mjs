import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {BLOCKS,THEMES,TEMPLATES,createBlock,createProject,generateDocument,generateParts,validateProject,normalizeTheme,sandboxDocument,contrastInk} from '../dist/engine.js';
let assertions=0;const check=(condition,message)=>{assert.ok(condition,message);assertions++};
for(const block of BLOCKS){const p=createProject();p.blocks=[createBlock(block.id)];const html=generateDocument(p);check(html.includes('data-block-id='),'generated block: '+block.id);check(!html.includes('undefined'),'no missing value: '+block.id);for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(match[1]);}
for(const t of TEMPLATES){const p=createProject(t.id),q=validateProject(JSON.parse(JSON.stringify(p)));check(q.blocks.length===p.blocks.length,'round-trip block count: '+t.id);check(generateDocument(q).includes('</html>'),'round-trip generation: '+t.id)}
for(const t of THEMES){const p=createProject();p.theme=t;check(generateParts(p).css.includes('--accent:'+t.accent),'theme generation: '+t.id)}
for(const value of [['#ffffff'],{},true,123,null,'#fff','url(https://example.com)']){const p=createProject();p.theme.accent=value;check(typeof validateProject(p).theme.accent==='string','coerce invalid color safely');check(generateDocument(validateProject(p)).length>0,'malformed color does not crash')}
for(const input of [{version:0,blocks:[]},{version:1,blocks:[{type:'unknown',props:{}}]},{version:1,blocks:Array(101).fill({type:'faq',props:{}})}])assert.throws(()=>validateProject(input));assertions+=3;
const p=createProject();p.blocks=[createBlock('contact'),createBlock('contact'),createBlock('newsletter'),createBlock('newsletter'),createBlock('tabs'),createBlock('tabs')];const html=generateDocument(p),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);check(new Set(ids).size===ids.length,'duplicated block IDs must remain unique');
const x=createProject();x.blocks=[createBlock('hero-editorial')];x.blocks[0].props.title='</h2><img src=x onerror=alert(1)>';check(generateDocument(x).includes('&lt;img'),'text escaping must protect markup');
const s=createProject();s.blocks=[createBlock('stats')];check((generateDocument(s).match(/<strong>/g)||[]).length===4,'default stats must contain four metrics');
for(const markup of ['<img src="https://example.com/x">','<html><body>Hello</body></html>','<head><meta http-equiv="Content-Security-Policy" content="default-src *"></head>']){const out=sandboxDocument(markup);check(out.indexOf("default-src 'none'")<out.indexOf(markup),'CSP must precede custom content')}
check(contrastInk('#999999')==='#000000','button text contrast for medium gray');
const hidden=createProject();hidden.blocks[0].hidden=true;check(!generateDocument(hidden).includes(hidden.blocks[0].uid),'hidden blocks absent in export');
const catalog=JSON.parse(await readFile(new URL('../dist/data/catalog.json',import.meta.url),'utf8')),refs=JSON.parse(await readFile(new URL('../dist/data/local-references.json',import.meta.url),'utf8'));
check(catalog.skills.length>0&&refs.length>0&&catalog.resources.length>0,'real catalogs loaded');
for(const [label,items] of [['skills',catalog.skills],['references',refs],['resources',catalog.resources]]){check(new Set(items.map(x=>x.id)).size===items.length,'unique '+label+' IDs');check(items.every(x=>x.name&&x.description),'complete '+label+' metadata')}
check(!JSON.stringify({catalog,refs}).match(/C:\\\\Users|luomo0712|art_v2_|sk-proj-/i),'published index contains no local user path or credential');
const offline=await readFile(new URL('../dist/offline.html',import.meta.url),'utf8');
const inline=[...offline.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
check(inline.length===3,'offline has theme bootstrap, embedded data and application');
for(const [,code] of inline){new Script(code);assertions++}
check(!/<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/.test(offline),'offline does not require external runtime files');
console.log(JSON.stringify({status:'PASS',assertions,blocks:BLOCKS.length,templates:TEMPLATES.length,themes:THEMES.length,skills:catalog.skills.length,references:refs.length,resources:catalog.resources.length,specialLicenses:catalog.resources.filter(x=>x.projectType==='source-available').length},null,2));
