import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const [html,css,engine,app,catalog,references]=await Promise.all(['index.html','app.css','engine.js','app.js','data/catalog.json','data/local-references.json'].map(p=>readFile(new URL(p,root),'utf8')));
const inlineJSON=JSON.stringify({catalog:JSON.parse(catalog),references:JSON.parse(references)}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const names=['BLOCKS','THEMES','TEMPLATES','esc','uid','createBlock','createProject','normalizeTheme','validateProject','generateDocument','generateParts','sandboxDocument','contrastInk','CSP'];
const js=`const {${names.join(',')}}=(()=>{\n${engine.replace(/^export /gm,'')}\nreturn {${names.join(',')}};\n})();\n`+app.replace(/^import[^\n]*\n/,'');
const result=html.replace('<link rel="stylesheet" href="app.css">',()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script>window.__ATLAS_DATA__=${inlineJSON};</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(new URL('offline.html',root),result);
console.log(JSON.stringify({output:'dist/offline.html',bytes:Buffer.byteLength(result),skills:JSON.parse(catalog).skills.length,references:JSON.parse(references).length,resources:JSON.parse(catalog).resources.length}));
