import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const order=['pattern-engine.js','engine.js','case-model.js','case-ui.js','workspace-model.js','studio-model.js','studio-ui.js','app.js'];
const read=p=>readFile(new URL(p,root),'utf8');
const [html,css,casesCSS,studioCSS,catalog,refs,cases]=await Promise.all(['index.html','app.css','cases.css','studio.css','data/catalog.json','data/local-references.json','data/site-cases.json'].map(read));
const complete=new Set();let js='const __atlasModules=Object.create(null);\n';
for(const file of order){let source=await read(file);const exports=[...source.matchAll(/^export (?:const|function) (\w+)/gm)].map(m=>m[1]);source=source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?\s*$/gm,(_,names,from)=>{if(!complete.has(from))throw Error(`Unresolved module dependency ${file} -> ${from}`);if(!/^[\w\s,]+$/.test(names))throw Error('Only explicit named imports supported');return `const {${names}}=__atlasModules[${JSON.stringify(from)}];`}).replace(/^export (const|function) /gm,'$1 ');if(/^\s*(?:import|export)\b/m.test(source))throw Error('Unsupported module syntax in '+file);js+=`__atlasModules[${JSON.stringify(file)}]=(()=>{\n${source}\nreturn {${exports.join(',')}};\n})();\n`;complete.add(file)}
const data={catalog:JSON.parse(catalog),references:JSON.parse(refs),cases:JSON.parse(cases)};
const inlineJSON=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const result=html.replace('<link rel="stylesheet" href="app.css">',()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`).replace('<link rel="stylesheet" href="cases.css">',()=>`<style>${casesCSS.replace(/<\/style/gi,'<\\/style')}</style>`).replace('<link rel="stylesheet" href="studio.css">',()=>`<style>${studioCSS.replace(/<\/style/gi,'<\\/style')}</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script>window.__ATLAS_DATA__=${inlineJSON};</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(new URL('offline.html',root),result);
console.log(JSON.stringify({output:'dist/offline.html',bytes:Buffer.byteLength(result),modules:order.length,cases:data.cases.cases.length}));
