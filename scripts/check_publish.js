const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'nogadanews_publish');
if (!fs.existsSync(root)) { console.error('Publish folder not found:', root); process.exit(2); }

function walk(dir){
  const res=[];
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    if(fs.lstatSync(p).isDirectory()) res.push(...walk(p));
    else res.push(p);
  }
  return res;
}

const files = walk(root).filter(f=>f.endsWith('.html'));
console.log('Scanned HTML files:', files.length);

const broken=[];
for(const f of files){
  const text = fs.readFileSync(f,'utf8');
  const hrefs = [];
  const reHref = /href\s*=\s*"([^"]+)"/g;
  const reSrc = /src\s*=\s*"([^"]+)"/g;
  let m;
  while((m=reHref.exec(text))!==null) hrefs.push(m[1]);
  while((m=reSrc.exec(text))!==null) hrefs.push(m[1]);
  const uniq = Array.from(new Set(hrefs));
  for(const link of uniq){
    if(/^(https?:|mailto:|#|\/\/)/.test(link)) continue;
    if(/^data:/.test(link)) continue;
    const resolved = link.startsWith('/') ? path.join(root, link.replace(/^\//, '')) : path.join(path.dirname(f), link);
    const norm = path.resolve(resolved);
    if(!fs.existsSync(norm)) broken.push({page:f, link, resolved: norm});
  }
}
if(broken.length===0) console.log('No broken local links found.'); else { console.log('Broken links found:'); console.table(broken); }

// duplicates
const allFiles = walk(root);
const nameMap = {};
for(const p of allFiles){ const name = path.basename(p); if(!nameMap[name]) nameMap[name]=[]; nameMap[name].push(p); }
const dupes = Object.entries(nameMap).filter(([,arr])=>arr.length>1).map(([name,arr])=>({name,count:arr.length,paths:arr}));
if(dupes.length===0) console.log('No duplicate filenames found.'); else { console.log('Duplicate filenames:'); console.table(dupes.map(d=>({name:d.name,count:d.count}))); }

// check essential
['index.html','style.css','manifest.json'].forEach(n=>{
  const p = path.join(root,n);
  if(!fs.existsSync(p)) console.log('Missing:', n);
});

console.log('\nScan complete.');
