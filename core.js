/* Coffee Notes — dependency-free data model; usable in browser and Node tests. */
(function(root){
'use strict';
const schema='coffee-notes/v1';
const metrics=['aroma','sweetness','acidity','bitterness','body','aftertaste','balance','overall'];
const textFields={products:['name','brand','form','origin','variety','process','roast','store','purchaseDate','roastDate','notes'],brews:['productId','date','method','grind','course','waterSetting','time','tags','notes','rebuy']};
const numberFields={products:['price','weight'],brews:['dose','water','yield','temperature',...metrics]};
function empty(){return {schema,products:[],brews:[]};}
function validate(data){
 if(!data||data.schema!==schema||!Array.isArray(data.products)||!Array.isArray(data.brews))throw Error('Coffee Notes形式のJSONファイルではありません。');
 if(data.products.length+data.brews.length>30000)throw Error('読み込めるのは合計30,000件までです。');
 const out=empty();
 for(const type of ['products','brews']){
  const ids=new Set();
  for(const row of data[type]){
   if(!row||typeof row.id!=='string'||!row.id||row.id.length>100||ids.has(row.id))throw Error('IDが不正、または重複しています。');
   ids.add(row.id);
   if(typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))throw Error('更新日時が不正です。');
   const r={id:row.id,updatedAt:row.updatedAt};
   if(row.deleted===true){r.deleted=true;out[type].push(r);continue;}
   for(const key of textFields[type]){const v=row[key]??'';if(typeof v!=='string'||v.length>12000)throw Error('文字項目が不正です。');r[key]=v;}
   for(const key of numberFields[type]){let v=row[key]??null;if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0))throw Error('数値項目が不正です。');if(metrics.includes(key)&&v!==null&&(!Number.isInteger(v)||v<1||v>5))throw Error('評価は1〜5または未評価にしてください。');r[key]=v;}
   if(type==='products'&&(!r.name.trim()||!['beans','ground'].includes(r.form)))throw Error('商品名・豆／粉の指定が不正です。');
   if(type==='brews'&&(!r.productId||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)))throw Error('商品または試飲日が不正です。');
   out[type].push(r);
  }
 }
 const ids=new Set(out.products.map(x=>x.id));
 for(const b of out.brews)if(!b.deleted&&!ids.has(b.productId))throw Error('商品が見つからない試飲記録があります。');
 return out;
}
// Divergent same-ID versions are kept for explicit user review. No timestamp guessing.
function merge(local,incoming,choices={}){
 const a=validate(local),b=validate(incoming),out=empty(),conflicts=[];
 for(const type of ['products','brews']){
  const map=new Map(a[type].map(r=>[r.id,r]));
  for(const r of b[type]){const prev=map.get(r.id),key=type+':'+r.id;
   if(!prev){map.set(r.id,r);continue;}
   if(JSON.stringify(prev)===JSON.stringify(r))continue;
   const choice=choices[key];
   if(choice==='incoming')map.set(r.id,r);
   else if(choice!=='local')conflicts.push({key,type,local:prev,incoming:r});
  }
  out[type]=[...map.values()];
 }
 return {data:out,conflicts};
}
function live(rows){return rows.filter(x=>!x.deleted);}
function mean(rows,key){const n=rows.map(r=>r[key]).filter(v=>v!==null&&v!==undefined);return n.length?n.reduce((a,b)=>a+b,0)/n.length:null;}
const api={schema,metrics,empty,validate,merge,live,mean};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoffeeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
