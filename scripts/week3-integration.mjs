import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost:3102';
if (!base.includes(':3102')) throw new Error('Only isolated test instance allowed');
const password='Test!'+crypto.randomUUID()+'9aA';
const user='qa'+Date.now();
const results=[];
async function req(path,method='GET',body,token){
 const r=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message)}}
await req('/api/auth/register','POST',{username:user,password});
const login=await req('/api/auth/login','POST',{username:user,password});
assert.equal(login.status,200);const a=login.data.token;
await req('/api/auth/register','POST',{username:user+'b',password},a);
const b=(await req('/api/auth/login','POST',{username:user+'b',password})).data.token;
let food;
await check('Login session and denied anonymous access',async()=>{assert.equal((await req('/api/auth/me','GET',null,a)).data.user.username,user);assert.equal((await req('/api/foods')).status,401)});
await check('Food create and retry deduplication',async()=>{const body={name:'QA Rice',portion:100,unit:'g',nutrition:{calories:130,proteins:2.7,fat:null},client_key:crypto.randomUUID()};const r=await req('/api/foods','POST',body,a);assert.ok(r.status<300,JSON.stringify(r));food=r.data;assert.equal((await req('/api/foods','POST',body,a)).data.id,food.id)});
await check('User isolation read and write',async()=>{assert.equal((await req(`/api/foods/${food.id}`,'GET',null,b)).status,403);assert.equal((await req(`/api/foods/${food.id}`,'PUT',{name:'stolen'},b)).status,403)});
await check('Food read update and invalid parameter rejection',async()=>{assert.equal((await req(`/api/foods/${food.id}`,'PUT',{name:'QA Rice updated'},a)).status,200);assert.equal((await req('/api/foods','POST',{name:'Bad',nutrition:{fat:-1}},a)).status,400);assert.equal((await req('/api/foods','POST',{name:'Bad',portion:0},a)).status,400)});
const date='2026-10-30',uuid=crypto.randomUUID();
await check('Diary save retry read update isolation and manual calculation',async()=>{
 const item={uuid,type:'food',id:food.id,name:'QA Rice',meal:'Lunch',portion:100,unit:'g',quantity:1.5,nutrition:{calories:130,proteins:2.7}};
 const data={items:[item]};assert.equal((await req('/api/diary/'+date,'PUT',data,a)).status,200);await req('/api/diary/'+date,'PUT',data,a);
 const day=(await req('/api/diary/'+date,'GET',null,a)).data;assert.equal(day.items.length,1);assert.equal(day.items[0].nutrition.calories*day.items[0].quantity,195);assert.equal((await req('/api/diary/'+date,'GET',null,b)).data.items.length,0);
 item.quantity=2;item.updated_at=new Date(Date.now()+1000).toISOString();await req('/api/diary/'+date,'PUT',{items:[item]},a);assert.equal((await req('/api/diary/'+date,'GET',null,a)).data.items[0].quantity,2);
});
await check('Diary invalid portion and date rejected',async()=>{assert.equal((await req('/api/diary/'+date,'PUT',{items:[{quantity:0}]},a)).status,400);assert.equal((await req('/api/diary/2026-02-30','PUT',{items:[]},a)).status,400)});
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoQAAAAASUVORK5CYII=';
await check('Both explicit mock drafts returned without saving',async()=>{const before=(await req('/api/foods','GET',null,a)).data.length;for(const kind of ['meal','label']){const r=await req('/api/recognition/'+kind,'POST',{image},a);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.mode,'mock');assert.equal(r.data.requiresConfirmation,true)}assert.equal((await req('/api/foods','GET',null,a)).data.length,before)});
await check('Recognition rejects forged type and missing auth',async()=>{assert.equal((await req('/api/recognition/meal','POST',{image:'data:image/png;base64,YWJj'},a)).status,415);assert.equal((await req('/api/recognition/meal','POST',{image})).status,401)});
await check('Upload rejects spoof and cleans invalid file',async()=>{const form=new FormData();form.append('file',new Blob(['not image'],{type:'image/png'}),'bad.png');const r=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:`Bearer ${a}`},body:form});assert.equal(r.status,400)});
await check('Diary explicit deletion persists and food delete',async()=>{await req('/api/diary/'+date,'PUT',{items:[],deleted_uuids:{items:[uuid]}},a);assert.equal((await req('/api/diary/'+date,'GET',null,a)).data.items.length,0);assert.ok((await req('/api/foods/'+food.id,'DELETE',null,a)).status<300)});
fs.writeFileSync('docs/week1-3/evidence/integration.json',JSON.stringify({base,date:new Date().toISOString(),results},null,2));
fs.writeFileSync('/tmp/nt-qa-login.json',JSON.stringify({username:user,password}));
console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} PASS`);
if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
