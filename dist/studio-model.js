import {BLOCKS,createBlock,validateProject} from './engine.js';

export function writeWorkspaceAtomically(storage,locks,key,expected,text){
  if(!locks?.request)return Promise.reject(Error('当前浏览器暂不支持项目库保存。请下载项目 JSON 备份，或用最新版浏览器打开。'));
  return locks.request(key,{mode:'exclusive'},()=>{
    if(storage.getItem(key)!==expected)throw Error('另一个标签页更新了项目库。请重新打开「我的项目」后再操作。');
    storage.setItem(key,text);
    if(storage.getItem(key)!==text)throw Error('项目库保存校验失败，请导出当前草稿。');
  });
}

export function searchStudio(items,query='',kind='all',limit=60){
  const terms=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.map((item,index)=>{
    const title=String(item.name||'').toLocaleLowerCase();
    const hay=[title,item.id,item.description,item.descriptionZh,item.summary,item.category,...(item.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase();
    const score=terms.reduce((n,t)=>n+(title===t?100:title.startsWith(t)?30:title.includes(t)?15:1),0);
    return {item,index,hay,score};
  }).filter(x=>(kind==='all'||x.item.kind===kind)&&terms.every(t=>x.hay.includes(t)))
    .sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(x=>x.item);
}

export function replacementOptions(type){
  const current=BLOCKS.find(x=>x.id===type);
  return current?BLOCKS.filter(x=>x.category===current.category&&x.id!==type):[];
}

export function replaceProjectBlock(project,blockId,nextType){
  const index=project.blocks.findIndex(b=>b.uid===blockId),next=validateProject(project);
  next.blocks.forEach((block,i)=>block.uid=project.blocks[i].uid);
  if(index<0)throw Error('找不到待替换的图层。');
  const old=next.blocks[index];
  if(!replacementOptions(old.type).some(x=>x.id===nextType))throw Error('请选择同一类别中的其他布局。');
  const block=createBlock(nextType);block.uid=old.uid;block.hidden=old.hidden;
  for(const key of Object.keys(block.props))if(Object.hasOwn(old.props,key))block.props[key]=old.props[key];
  next.blocks[index]=block;return next;
}
