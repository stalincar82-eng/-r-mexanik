const fs=require('fs'),path=require('path');
const buf=fs.readFileSync(path.join(__dirname,'..','car-model.glb'));
if(buf.toString('ascii',0,4)!=='glTF') throw new Error('Not GLB');
const jsonLen=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jsonLen).toString('utf8').trim());
const nodes=json.nodes||[],meshes=json.meshes||[];
const children=new Set();nodes.forEach((n,i)=>(n.children||[]).forEach(c=>children.add(c)));
const roots=nodes.map((n,i)=>({n,i})).filter(x=>!children.has(x.i));
const parent=new Array(nodes.length).fill(-1);nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));
const out={asset:json.asset,nodeCount:nodes.length,meshCount:meshes.length,nodes:[],matches:{disk_l:[],disk_r:[]}};
function walk(i,depth){const n=nodes[i]||{};const item={index:i,name:n.name||'',parent:parent[i]>=0?(nodes[parent[i]].name||''):null,parentIndex:parent[i],children:(n.children||[]).map(c=>({index:c,name:nodes[c].name||''})),mesh:n.mesh??null,depth};out.nodes.push(item);if(/^disk_l$/i.test(n.name||''))out.matches.disk_l.push(item);if(/^disk_r$/i.test(n.name||''))out.matches.disk_r.push(item);(n.children||[]).forEach(c=>walk(c,depth+1))}
roots.forEach(r=>walk(r.i,0));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rows=out.nodes.map(n=>'<div class="row '+(/disk_l|disk_r/i.test(n.name)?'hit':'')+'"><span style="padding-left:'+(n.depth*18)+'px"><b>'+esc(n.name||'(без имени)')+'</b> <small>#'+n.index+'</small></span><span>parent: '+esc(n.parent||'—')+' | children: '+esc(n.children.map(c=>c.name||'#'+c.index).join(', ')||'—')+' | mesh: '+(n.mesh??'—')+'</span></div>').join('');
const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BMW GLB Structure</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:0}.top{position:sticky;top:0;background:#181818;padding:14px;border-bottom:1px solid #333}.row{padding:5px 10px;border-bottom:1px solid #222;display:grid;grid-template-columns:minmax(250px,35%) 1fr;gap:10px}.hit{background:#403500;color:#fff}.good{color:#8f8}.box{margin:12px;padding:12px;border:1px solid #444;border-radius:8px}small{color:#999}@media(max-width:700px){.row{grid-template-columns:1fr;gap:2px}}</style><div class="top"><h2>BMW M3 GTR — car-model.glb</h2><div>Узлов: '+out.nodeCount+' · Mesh: '+out.meshCount+' · Disk_L: '+out.matches.disk_l.length+' · Disk_R: '+out.matches.disk_r.length+'</div></div><div class="box"><b class="good">Это реальное дерево nodes[] из бинарного GLB, а не догадка по геометрии.</b></div>'+rows+'<script>window.BMW_GLTF='+JSON.stringify(out)+'</script>';
fs.mkdirSync(path.join(__dirname,'..','inspector-site'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'..','inspector-site','index.html'),html);