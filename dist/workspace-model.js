import {validateProject,createProject,uid} from './engine.js';

// Storage and UI belong to callers. This module only validates and copies JSON data.
export const WORKSPACE_KIND='design-atlas.workspace';
export const WORKSPACE_LIMITS=Object.freeze({projects:24,bytes:6*1024*1024});
const encoder=new TextEncoder();
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const fail=(path,message)=>{throw Error(`${path}：${message}`);};

function fields(value,expected,path){
 if(!isRecord(value)||Object.keys(value).length!==expected.length||expected.some(key=>!Object.hasOwn(value,key)))fail(path,`格式不正确，需要且仅包含 ${expected.join('、')} 字段。`);
}

function assertJSON(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(!Array.isArray(value)&&!isRecord(value))throw Error('非 JSON 数据');
 if(ancestors.has(value))throw Error('循环引用');
 ancestors.add(value);
 if(Array.isArray(value)){
  if(Object.keys(value).length!==value.length)throw Error('无效数组');
  for(let i=0;i<value.length;i++){
   const property=Object.getOwnPropertyDescriptor(value,String(i));
   if(!property||!Object.hasOwn(property,'value'))throw Error('无效数组元素');
   assertJSON(property.value,ancestors);
  }
 }else{
  for(const key of Reflect.ownKeys(value)){
   const property=Object.getOwnPropertyDescriptor(value,key);
   if(typeof key!=='string'||!property.enumerable||!Object.hasOwn(property,'value'))throw Error('无效对象字段');
   assertJSON(property.value,ancestors);
  }
 }
 ancestors.delete(value);
}

function jsonText(value,path){
 let text;
 try{assertJSON(value);text=JSON.stringify(value);}catch{fail(path,'格式不正确，需要可序列化的纯 JSON 数据，不能包含循环引用或非 JSON 值。');}
 if(encoder.encode(text).byteLength>WORKSPACE_LIMITS.bytes)fail('项目库容量','JSON 数据最多 6 MiB（6291456 个 UTF-8 字节），请减少项目或内容后重试。');
 return text;
}

function name(value,path){
 if(typeof value!=='string'||!value.trim()||value.length>100)fail(path,'名称需要 1 至 100 个字符，且不能全为空白。');
 return value;
}

function projectID(value,path){
 if(typeof value!=='string'||!value.trim())fail(path,'项目 ID 需要非空文本。');
 return value;
}

function timestamp(value,path){
 const match=typeof value==='string'&&/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
 if(!match)fail(path,'时间格式不正确，需要带时区的 ISO 8601 时间，如 2026-10-22T08:00:00.000Z。');
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
 const time=Date.parse(value);
 if(month<1||month>12||day<1||day>days[month-1]||!Number.isFinite(time))fail(path,'时间无效，请检查 ISO 8601 日期、时刻和时区。');
 return time;
}

function projectCopy(raw,path){
 const source=JSON.parse(jsonText(raw,path));
 if(!isRecord(source))fail(path,'项目格式不正确，需要项目对象。');
 name(source.name,`${path}.name`);
 let project;
 try{project=validateProject(source);}catch(error){fail(path,`项目格式不正确：${error.message}`);}
 // The engine normalizes all content but allocates random UIDs. Preserve unique
 // input UIDs and derive missing/invalid/duplicate ones from their block position:
 // normalizing the same JSON repeatedly must produce the same conflict checks.
 const validUID=value=>typeof value==='string'&&value.length>0&&!/[\s\u0000-\u001f\u007f]/u.test(value);
 const counts=new Map();
 for(const block of source.blocks)if(validUID(block.uid))counts.set(block.uid,(counts.get(block.uid)||0)+1);
 const used=new Set([...counts].filter(([,count])=>count===1).map(([id])=>id));
 project.blocks.forEach((block,index)=>{
  const original=source.blocks[index].uid;
  if(validUID(original)&&counts.get(original)===1)block.uid=original;
  else{
   const stem=`block-${index+1}`;
   let candidate=stem,suffix=1;
   while(used.has(candidate))candidate=`${stem}-${suffix++}`;
   block.uid=candidate;
  }
  used.add(block.uid);
 });
 return project;
}

function requireIndex(library,id){
 projectID(id,'项目 ID');
 const index=library.projects.findIndex(project=>project.id===id);
 if(index<0)fail('项目库','找不到该项目 ID，无法执行操作。');
 return index;
}

function requireSpace(library){
 if(library.projects.length>=WORKSPACE_LIMITS.projects)fail('项目库容量','最多保存 24 个项目，请先删除项目再新建或复制。');
}

function freshID(library){
 let id;
 do{id=`project-${uid()}`;}while(library.projects.some(project=>project.id===id));
 return id;
}

export function emptyWorkspace(){
 return {kind:WORKSPACE_KIND,schemaVersion:1,projects:[]};
}

export function validateWorkspace(raw){
 // Snapshot first: do not invoke accessors/toJSON, and check bytes before the
 // engine can shorten text or discard fields it does not use.
 const source=JSON.parse(jsonText(raw,'项目库'));
 fields(source,['kind','schemaVersion','projects'],'项目库');
 if(source.kind!==WORKSPACE_KIND||source.schemaVersion!==1)fail('项目库','格式不正确，需要 design-atlas.workspace / schemaVersion:1 封包。');
 if(!Array.isArray(source.projects))fail('项目库.projects','格式不正确，需要项目数组。');
 if(source.projects.length>WORKSPACE_LIMITS.projects)fail('项目库容量','最多保存 24 个项目，不能导入超额项目库。');
 const ids=new Set();
 const projects=source.projects.map((entry,index)=>{
  const path=`项目库.projects[${index}]`;
  fields(entry,['id','name','createdAt','updatedAt','project'],path);
  const id=projectID(entry.id,`${path}.id`);
  if(ids.has(id))fail(`${path}.id`,'存在重复项目 ID，整包未导入。');
  ids.add(id);
  const label=name(entry.name,`${path}.name`);
  const created=timestamp(entry.createdAt,`${path}.createdAt`),updated=timestamp(entry.updatedAt,`${path}.updatedAt`);
  if(updated<created)fail(`${path}.updatedAt`,'更新时间不能早于创建时间。');
  const project=projectCopy(entry.project,`${path}.project`);
  if(label!==project.name)fail(`${path}.name`,'项目库名称必须与 project.name 一致。');
  return {id,name:label,createdAt:entry.createdAt,updatedAt:entry.updatedAt,project};
 });
 const library={kind:WORKSPACE_KIND,schemaVersion:1,projects};
 jsonText(library,'项目库');
 return library;
}

export function saveWorkspaceProject(library,project=createProject(),existingId){
 const next=validateWorkspace(library);
 const index=existingId===undefined?-1:requireIndex(next,existingId);
 if(index<0)requireSpace(next);
 const copy=projectCopy(project,'项目');
 const previous=index<0?null:next.projects[index];
 const now=new Date(Math.max(Date.now(),previous?Date.parse(previous.updatedAt):0)).toISOString();
 const entry={id:previous?previous.id:freshID(next),name:copy.name,createdAt:previous?previous.createdAt:now,updatedAt:now,project:copy};
 if(index<0)next.projects.push(entry);else next.projects[index]=entry;
 jsonText(next,'项目库');
 return next;
}

export function duplicateWorkspaceProject(library,id){
 const next=validateWorkspace(library);
 const index=requireIndex(next,id);
 requireSpace(next);
 const source=next.projects[index].project;
 const suffix=' 副本';
 // Array.from avoids cutting an astral character in half at the name limit.
 let label='';
 for(const char of source.name){if(label.length+char.length>100-suffix.length)break;label+=char;}
 const project={...source,name:label+suffix};
 return saveWorkspaceProject(next,project);
}

export function removeWorkspaceProject(library,id){
 const next=validateWorkspace(library);
 next.projects.splice(requireIndex(next,id),1);
 return next;
}
