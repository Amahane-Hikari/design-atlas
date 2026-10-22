import {readFile} from 'node:fs/promises';
import {BLOCKS,THEMES} from '../dist/engine.js';
import {validateCasePack,CASE_LIMITS} from '../dist/case-model.js';
const path=process.argv[2];
if(!path){console.error('用法：node scripts/check-case-pack.mjs <案例包.json>');process.exitCode=1}else{try{const data=await readFile(path);if(data.length>CASE_LIMITS.bytes)throw Error('案例包超过 4 MiB');const pack=validateCasePack(JSON.parse(data),{blocks:BLOCKS,themes:THEMES});console.log(JSON.stringify({status:'PASS',cases:pack.cases.length,recipes:pack.recipes.length,notes:Object.keys(pack.user.notes).length},null,2))}catch(e){console.error('验证失败：'+e.message);process.exitCode=1}}
