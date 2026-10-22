import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';
import {BLOCKS,THEMES,createBlock,createProject} from '../dist/engine.js';
import {WORKSPACE_KIND,WORKSPACE_LIMITS,emptyWorkspace,validateWorkspace,saveWorkspaceProject,duplicateWorkspaceProject,removeWorkspaceProject} from '../dist/workspace-model.js';

let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions++;};
const reject=(fn,pattern,message)=>{assert.throws(fn,pattern,message);assertions++;};
const snapshot=value=>JSON.stringify(value);
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const content=project=>({...project,blocks:project.blocks.map(({uid,...block})=>block)});
const entry=(id,project=createProject())=>({id,name:project.name,createdAt:'2026-01-02T03:04:05.000Z',updatedAt:'2026-02-03T04:05:06.000Z',project});
const libraryOf=entries=>({kind:WORKSPACE_KIND,schemaVersion:1,projects:entries});
const one=()=>libraryOf([entry('project-existing')]);

equal(emptyWorkspace(),{kind:'design-atlas.workspace',schemaVersion:1,projects:[]},'exact empty envelope');
check(emptyWorkspace()!==emptyWorkspace()&&emptyWorkspace().projects!==emptyWorkspace().projects,'empty libraries are independent');
equal(WORKSPACE_LIMITS,{projects:24,bytes:6*1024*1024},'documented capacity');
check(Object.isFrozen(WORKSPACE_LIMITS),'capacity cannot be changed by callers');
equal(validateWorkspace(freeze(emptyWorkspace())),emptyWorkspace(),'empty round trip');

const source=createProject('studio');
source.name='我的本地项目 ✨';
source.customCSS='/* 保留样式 */\n.demo { color: #123456; }';
source.blocks[0].props.title='';
source.blocks[1].hidden=true;
source.theme.accent='#123456';
freeze(source);
const empty=freeze(emptyWorkspace());
const saved=saveWorkspaceProject(empty,source);
equal(empty,emptyWorkspace(),'save does not mutate old library');
check(saved.projects.length===1&&saved.projects[0].id.startsWith('project-'),'save allocates prefixed ID');
equal(saved.projects[0].project,source,'save preserves complete valid project including block UIDs');
check(saved.projects[0].createdAt===saved.projects[0].updatedAt,'creation starts with equal timestamps');
check(new Date(saved.projects[0].createdAt).toISOString()===saved.projects[0].createdAt,'new timestamp is canonical ISO 8601');
const round=validateWorkspace(JSON.parse(snapshot(saved)));
equal(round,saved,'JSON export/import is a full round trip');
equal(validateWorkspace(validateWorkspace(saved)),saved,'workspace validation is idempotent');
check(round!==saved&&round.projects!==saved.projects&&round.projects[0]!==saved.projects[0],'envelope and entries are copies');
check(round.projects[0].project!==source&&round.projects[0].project.theme!==source.theme,'project and theme are copied');
check(round.projects[0].project.blocks!==source.blocks&&round.projects[0].project.blocks[0].props!==source.blocks[0].props,'blocks and properties are copied');
round.projects[0].project.theme.accent='#abcdef';
round.projects[0].project.blocks[0].props.title='mutated';
round.projects[0].name='mutated label';
equal(saved.projects[0].project,source,'mutating imported copy cannot change saved project');

const editable=createProject();
const editableBefore=snapshot(editable);
const fromEditable=saveWorkspaceProject(emptyWorkspace(),editable);
equal(snapshot(editable),editableBefore,'save does not alter editable input');
editable.theme.accent='#abcdef';
editable.blocks[0].props.title='input edit';
check(fromEditable.projects[0].project.theme.accent!=='#abcdef'&&fromEditable.projects[0].project.blocks[0].props.title!=='input edit','editing source after save cannot change library');

const shared=createProject();
const aliased=libraryOf([entry('project-one',shared),entry('project-two',shared)]);
const aliasedBefore=snapshot(aliased);
const independent=validateWorkspace(freeze(aliased));
equal(snapshot(aliased),aliasedBefore,'validation does not mutate aliased input');
check(independent.projects[0].project!==independent.projects[1].project,'each project independently copied');
check(independent.projects[0].project.theme!==independent.projects[1].project.theme,'shared themes split into independent copies');
check(independent.projects[0].project.blocks[0].props!==independent.projects[1].project.blocks[0].props,'shared block properties split');
independent.projects[0].project.blocks[0].props.title='only one';
check(independent.projects[1].project.blocks[0].props.title!=='only one','changing one imported project cannot change its sibling');
const sameNames=saveWorkspaceProject(freeze(saved),source);
check(sameNames.projects.length===2&&sameNames.projects.every(item=>item.name===source.name),'same name may be saved twice');
check(sameNames.projects[0].id!==sameNames.projects[1].id,'same name receives distinct IDs');
equal(validateWorkspace(JSON.parse(snapshot(sameNames))),sameNames,'same-name import keeps both projects');

const updateBase=freeze(libraryOf([entry('project-existing',createProject()),entry('project-neighbor',createProject('saas'))]));
const updateBefore=snapshot(updateBase);
const replacement=createProject('portfolio');
replacement.name='改过名字的作品';
freeze(replacement);
const updated=saveWorkspaceProject(updateBase,replacement,'project-existing');
equal(snapshot(updateBase),updateBefore,'updating preserves input');
equal(updated.projects[0].createdAt,updateBase.projects[0].createdAt,'update preserves original creation timestamp exactly');
equal(updated.projects[0].id,'project-existing','update preserves ID');
check(updated.projects.length===2&&updated.projects[0].name===replacement.name&&updated.projects[0].project.name===replacement.name,'update replaces content and keeps names synchronized');
check(Date.parse(updated.projects[0].updatedAt)>=Date.parse(updateBase.projects[0].updatedAt),'update timestamp is monotonic');
equal(updated.projects[1],updateBase.projects[1],'updating leaves neighboring data intact');
check(updated.projects[1].project!==updateBase.projects[1].project,'unchanged neighbors do not alias old library');
updated.projects[1].project.blocks[0].props.title='new library edit';
equal(snapshot(updateBase),updateBefore,'editing returned neighbor cannot change old library');
const future=one();future.projects[0].createdAt='2099-01-01T00:00:00+08:00';future.projects[0].updatedAt='2099-01-02T00:00:00+08:00';
const futureUpdated=saveWorkspaceProject(freeze(future),source,'project-existing');
equal(futureUpdated.projects[0].createdAt,future.projects[0].createdAt,'offset creation timestamp remains exact');
check(Date.parse(futureUpdated.projects[0].updatedAt)>=Date.parse(future.projects[0].updatedAt),'future imports and clock rollback do not produce invalid chronology');
reject(()=>saveWorkspaceProject(updateBase,source,'project-missing'),/找不到.*ID/,'update requires existing ID');
for(const invalid of ['',null,0,false])reject(()=>saveWorkspaceProject(updateBase,source,invalid),/ID.*非空文本/,'invalid update ID cannot silently create');
const defaultProject=saveWorkspaceProject(emptyWorkspace());
equal(content(defaultProject.projects[0].project),content(createProject()),'missing project uses engine createProject');

const duplicateBefore=snapshot(sameNames);
const duplicated=duplicateWorkspaceProject(freeze(sameNames),sameNames.projects[0].id);
equal(snapshot(sameNames),duplicateBefore,'duplicate does not mutate input');
equal(duplicated.projects.slice(0,2),sameNames.projects,'duplicate preserves all originals');
const copy=duplicated.projects[2];
check(copy.id.startsWith('project-')&&!sameNames.projects.some(item=>item.id===copy.id),'duplicate has new prefixed unique ID');
check(copy.name.endsWith(' 副本')&&copy.name===copy.project.name,'duplicate has synchronized copy name');
equal({...copy.project,name:source.name},source,'duplicate keeps project content');
check(copy.createdAt===copy.updatedAt,'duplicate starts fresh timestamps');
check(copy.project!==duplicated.projects[0].project&&copy.project.blocks[0].props!==duplicated.projects[0].project.blocks[0].props,'duplicate content is independent from original');
copy.project.blocks[0].props.title='copy edit';
copy.project.theme.accent='#abcdef';
equal(duplicated.projects[0],sameNames.projects[0],'editing duplicate cannot change original in returned library');
equal(snapshot(sameNames),duplicateBefore,'editing duplicate cannot change old library');
const longName=createProject();longName.name='😀'.repeat(50);
const longDuplicate=duplicateWorkspaceProject(libraryOf([entry('project-long',longName)]),'project-long');
check(longDuplicate.projects[1].name.length<=100,'copy name stays within name limit');
check(longDuplicate.projects[1].name.isWellFormed(),'copy name does not split a surrogate pair');
reject(()=>duplicateWorkspaceProject(sameNames,'missing'),/找不到.*ID/,'cannot duplicate missing project');

const deleteBefore=snapshot(sameNames);
const removed=removeWorkspaceProject(sameNames,sameNames.projects[0].id);
equal(snapshot(sameNames),deleteBefore,'remove does not mutate input');
equal(removed.projects,[sameNames.projects[1]],'remove keeps exact remaining content');
check(removed.projects[0].project!==sameNames.projects[1].project,'remaining project is a deep copy');
removed.projects[0].project.blocks[0].props.title='remaining edit';
equal(snapshot(sameNames),deleteBefore,'editing remaining project cannot change old library');
equal(removeWorkspaceProject(saved,saved.projects[0].id),emptyWorkspace(),'removing last project produces empty library');
reject(()=>removeWorkspaceProject(saved,'missing'),/找不到.*ID/,'cannot remove missing project');

for(const invalid of [null,[],{},'{}',123,{...emptyWorkspace(),kind:'design-atlas.project'},{...emptyWorkspace(),schemaVersion:2},{...emptyWorkspace(),projects:{}},{...emptyWorkspace(),extra:true}]){
 reject(()=>validateWorkspace(invalid),/格式|JSON/,'invalid envelope is rejected');
}
for(const mutate of [
 item=>delete item.id,item=>{item.id='';},item=>{item.id=' \t';},item=>{item.id=2;},
 item=>{item.name='';},item=>{item.name=' \t';},item=>{item.name='x'.repeat(101);},item=>{item.name=123;},
 item=>{item.name+='不同';},item=>{item.project.name='';},item=>{item.project.name='x'.repeat(101);},item=>{delete item.project.name;},
 item=>{item.extra='unknown';},item=>{delete item.project;},item=>{item.project=null;},
 item=>{item.project.blocks[0].type='unknown-module';},item=>{item.project.blocks[0].props=null;},item=>{item.project.version=2;},
 item=>{item.project.blocks=Array.from({length:101},()=>createBlock('quote'));}
]){
 const invalid=one();mutate(invalid.projects[0]);
 const before=snapshot(invalid);
 reject(()=>validateWorkspace(invalid),/格式|ID|名称|name|project|未知|模块/,'invalid entry is rejected');
 equal(snapshot(invalid),before,'rejected validation keeps raw data');
}
const unknown=one();unknown.projects.push(entry('project-unknown'));unknown.projects[1].project.blocks[0].type='unknown-module';
reject(()=>validateWorkspace(unknown),/projects\[1\].*未知模块/,'one invalid project rejects entire import with its location');
for(const operation of [
 ()=>saveWorkspaceProject(unknown,source),
 ()=>duplicateWorkspaceProject(unknown,'project-existing'),
 ()=>removeWorkspaceProject(unknown,'project-unknown')
])reject(operation,/未知模块/,'operations cannot silently discard invalid projects');
const repeated=libraryOf([entry('same-id'),entry('same-id')]);
reject(()=>validateWorkspace(repeated),/重复项目 ID/,'duplicate IDs reject entire import');
const sparse=emptyWorkspace();sparse.projects.length=1;
reject(()=>validateWorkspace(sparse),/JSON/,'array holes cannot silently disappear');

for(const invalidTime of [null,0,'','yesterday','2026-10-22','10/22/2026','2026-10-22T08:00:00','2026-10-22T24:00:00Z','2026-10-22T08:00:60Z','2026-10-22T08:00:00+24:00','2026-10-22T08:00:00+08:60','2026-02-29T08:00:00Z','2026-02-30T08:00:00Z','2026-04-31T08:00:00Z','2026-13-01T08:00:00Z','2026-00-01T08:00:00Z','2026-01-00T08:00:00Z','2026-10-22T08:00:00Zjunk']){
 for(const key of ['createdAt','updatedAt']){
  const invalid=one();invalid.projects[0][key]=invalidTime;
  reject(()=>validateWorkspace(invalid),/时间|日期/,'reject illegal '+key+' '+invalidTime);
 }
}
for(const validTime of ['2024-02-29T08:00:00Z','2000-02-29T08:00:00.123Z','2026-10-22T08:00:00+08:00','2026-10-22T08:00:00.123456789-05:30']){
 const valid=one();valid.projects[0].createdAt=validTime;valid.projects[0].updatedAt=validTime;
 equal(validateWorkspace(valid).projects[0].createdAt,validTime,'valid ISO timestamp is retained');
}
const reversed=one();reversed.projects[0].updatedAt='2025-01-01T00:00:00Z';
reject(()=>validateWorkspace(reversed),/更新时间不能早于创建时间/,'reject reversed timestamps');

const full=freeze(libraryOf(Array.from({length:24},(_,index)=>entry(`project-${index}`))));
equal(validateWorkspace(full).projects.length,24,'24 projects accepted');
const fullBefore=snapshot(full);
reject(()=>saveWorkspaceProject(full,source),/容量.*24/,'new save rejects full library');
reject(()=>duplicateWorkspaceProject(full,'project-0'),/容量.*24/,'copy rejects full library');
equal(saveWorkspaceProject(full,source,'project-0').projects.length,24,'update at capacity is allowed');
equal(removeWorkspaceProject(full,'project-0').projects.length,23,'remove at capacity is allowed');
equal(snapshot(full),fullBefore,'capacity failures and operations preserve full input');
reject(()=>validateWorkspace(libraryOf([...full.projects,entry('project-25')])),/容量.*24/,'25 projects reject entire import');

// A valid maximum-content project keeps each field within the engine's limits.
const largeProject=()=>{
 const project=createProject();
 const definition=BLOCKS.find(block=>Object.keys(block.props).length===5);
 check(Boolean(definition),'multi-property block available for byte boundaries');
 project.blocks=Array.from({length:100},()=>{
  const block=createBlock(definition.id);
  for(const key of Object.keys(block.props))block.props[key]='界'.repeat(3000);
  return block;
 });
 return project;
};
const large=largeProject();
const capacity=libraryOf([entry('project-large',large)]);
const bytes=value=>Buffer.byteLength(snapshot(value),'utf8');
check(bytes(capacity)>capacity.projects[0].project.blocks.length*4000,'capacity uses UTF-8 bytes');
check(bytes(capacity)<WORKSPACE_LIMITS.bytes,'large single project is under byte limit');
const byteFull=libraryOf([entry('project-large-one',large),entry('project-large-two',large)]);
check(bytes(byteFull)>WORKSPACE_LIMITS.bytes&&snapshot(byteFull).length<WORKSPACE_LIMITS.bytes,'UTF-8 can exceed limit while JS character count is below it');
reject(()=>validateWorkspace(byteFull),/容量.*6 MiB.*UTF-8/,'raw UTF-8 byte overflow rejected');
const validLarge=freeze(validateWorkspace(capacity));
const largeBefore=snapshot(validLarge);
reject(()=>saveWorkspaceProject(validLarge,large),/容量.*6 MiB/,'save checks resulting byte size');
reject(()=>duplicateWorkspaceProject(validLarge,'project-large'),/容量.*6 MiB/,'copy checks resulting byte size');
equal(snapshot(validLarge),largeBefore,'byte failures cannot mutate old library');
const shrunk=saveWorkspaceProject(validLarge,source,'project-large');
check(bytes(shrunk)<bytes(validLarge),'updating to smaller content succeeds');
const oversized=one();oversized.projects[0].project.customCSS='x'.repeat(WORKSPACE_LIMITS.bytes);
reject(()=>validateWorkspace(oversized),/容量.*6 MiB/,'raw size is checked before engine truncation');

// Unknown JSON fields inside projects still pass through the engine, but cannot
// hide an oversized input. Fill one exactly to exercise the inclusive byte cap.
const exact=one();exact.projects[0].project.padding='';
const baseBytes=bytes(exact);
exact.projects[0].project.padding='x'.repeat(WORKSPACE_LIMITS.bytes-baseBytes);
equal(bytes(exact),WORKSPACE_LIMITS.bytes,'exact 6 MiB fixture');
equal(validateWorkspace(exact).projects.length,1,'exact byte cap accepted');
exact.projects[0].project.padding+='x';
reject(()=>validateWorkspace(exact),/容量.*6 MiB/,'one byte above cap rejected');
for(const bad of [undefined,NaN,Infinity,1n,()=>{},Symbol('value')]){
 const invalid=one();invalid.projects[0].project.extra=bad;
 reject(()=>validateWorkspace(invalid),/JSON/,'non-JSON input rejected');
}
const circular=one();circular.projects[0].project.self=circular;
reject(()=>validateWorkspace(circular),/JSON.*循环引用/,'circular input receives Chinese format error');
let invoked=false;
const accessor=one();Object.defineProperty(accessor.projects[0].project,'accessor',{enumerable:true,get(){invoked=true;return 'side effect';}});
reject(()=>validateWorkspace(accessor),/JSON/,'accessors rejected without execution');
check(!invoked,'validation did not invoke accessor');
const coercion=one();coercion.projects[0].project.toJSON=()=>{invoked=true;return {};};
reject(()=>validateWorkspace(coercion),/JSON/,'toJSON functions rejected without execution');
check(!invoked,'validation did not invoke toJSON');

const legacy=one();legacy.projects[0].project.theme=null;delete legacy.projects[0].project.blocks[0].uid;
const legacyValidated=validateWorkspace(legacy);
check(legacyValidated.projects[0].project.blocks[0].uid&&legacyValidated.projects[0].project.theme.id===THEMES[0].id,'engine normalizes legacy themes and missing module UIDs');
const duplicateBlockIDs=one();duplicateBlockIDs.projects[0].project.blocks[1].uid=duplicateBlockIDs.projects[0].project.blocks[0].uid;
const blockIDs=validateWorkspace(duplicateBlockIDs).projects[0].project.blocks.map(block=>block.uid);
equal(new Set(blockIDs).size,blockIDs.length,'stable block UIDs repair duplicate editor IDs');
const unstableUIDs=one();
unstableUIDs.projects[0].project.blocks[0].uid='block-2';
delete unstableUIDs.projects[0].project.blocks[1].uid;
unstableUIDs.projects[0].project.blocks[2].uid='';
unstableUIDs.projects[0].project.blocks[3].uid='contains whitespace';
unstableUIDs.projects[0].project.blocks[4].uid=7;
unstableUIDs.projects[0].project.blocks[5].uid='repeated-block';
unstableUIDs.projects[0].project.blocks[6].uid='repeated-block';
freeze(unstableUIDs);
const stable=validateWorkspace(unstableUIDs);
equal(validateWorkspace(unstableUIDs),stable,'same raw legacy/invalid UIDs normalize deterministically');
equal(validateWorkspace(validateWorkspace(unstableUIDs)),stable,'double validation is deeply equal for legacy/invalid UIDs');
equal(stable.projects[0].project.blocks[0].uid,'block-2','derived IDs cannot replace a valid unique UID');
const stableIDs=stable.projects[0].project.blocks.map(block=>block.uid);
equal(new Set(stableIDs).size,stableIDs.length,'derived IDs avoid collisions with retained input IDs');
equal(validateWorkspace(duplicateBlockIDs),validateWorkspace(duplicateBlockIDs),'duplicate input UIDs normalize deterministically');
equal(validateWorkspace(legacy),validateWorkspace(legacy),'missing input UIDs normalize deterministically');
const resaved=saveWorkspaceProject(saved,source,saved.projects[0].id);
equal(validateWorkspace(resaved),resaved,'save survives root UI revalidation without content changes');
const recopied=duplicateWorkspaceProject(saved,saved.projects[0].id);
equal(validateWorkspace(recopied),recopied,'copy survives root UI revalidation without content changes');

// Exercise the actual offline builder's supported named-import/export subset
// in memory only; no app/build/package file is changed or build artifact written.
const moduleSource=await readFile(new URL('../dist/workspace-model.js',import.meta.url),'utf8');
check(!/^\s*export\s+(?!const\b|function\b)/m.test(moduleSource),'exports use only const/function');
const exported=[...moduleSource.matchAll(/^export (?:const|function) (\w+)/gm)].map(match=>match[1]);
const transformed=moduleSource.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/engine\.js['"];?\s*$/gm,'const {$1}=__engine;').replace(/^export (const|function) /gm,'$1 ');
check(!/^\s*(?:import|export)\b/m.test(transformed),'named imports are compatible with offline transformation');
new Script(transformed);assertions++;
const dependencyNames=['fx-runtime.js','fx-blocks.js','pattern-engine.js','engine.js'];
const dependencySources=await Promise.all(dependencyNames.map(file=>readFile(new URL(`../dist/${file}`,import.meta.url),'utf8')));
let bundle='const __atlasModules=Object.create(null);\n';
for(const [index,file] of [...dependencyNames,'workspace-model.js'].entries()){
 const source=index<dependencySources.length?dependencySources[index]:moduleSource;
 const names=[...source.matchAll(/^export (?:const|function) (\w+)/gm)].map(match=>match[1]);
 const code=source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?\s*$/gm,(_,imports,from)=>`const {${imports}}=__atlasModules[${JSON.stringify(from)}];`).replace(/^export (const|function) /gm,'$1 ');
 bundle+=`__atlasModules[${JSON.stringify(file)}]=(()=>{${code}\nreturn {${names.join(',')}};})();\n`;
}
const bundled=runInNewContext(`${bundle}\n__atlasModules['workspace-model.js'];`,{TextEncoder});
equal(JSON.parse(JSON.stringify(bundled.emptyWorkspace())),emptyWorkspace(),'offline module evaluates without DOM, storage, or network globals');
equal(bundled.saveWorkspaceProject(bundled.emptyWorkspace()).projects.length,1,'offline module can create a project through engine');

console.log(JSON.stringify({status:'PASS',assertions,api:exported,capacity:WORKSPACE_LIMITS},null,2));
