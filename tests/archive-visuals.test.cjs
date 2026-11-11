// node --test tests/archive-visuals.test.cjs (no dependencies)
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../ma_shelf.html'),'utf8');
const oneLine=name=>html.match(new RegExp('(?:  )?function '+name+'\\([^\\n]+'))[0];
const source=[html.match(/const clampInt=[^\n]+/)[0],...['actualDepth','rackWidthAllowances','actualRackWidth','rackSectionWidths'].map(oneLine),html.slice(html.indexOf('  function archiveVisualModel('),html.indexOf('  function planner3dRackMarkup('))].join('\n');
const context=vm.createContext({});vm.runInContext(source,context);
const {archiveVisualModel,archiveTopMarkup}=context;
for(const type of ['mobile','stationary_single','stationary_double'])test(type+' keeps the supplied construction inside existing planning dimensions',()=>{
 for(const depthMm of [250,300,400,500])for(const sectionWidths of [[1000],[700,1000,1200]])for(const heightMm of [1996,2015,2515])for(const shelfCount of [2,6,12]){
  const o={rackType:type,depthMm,sectionWidths,heightMm,shelfCount},m=archiveVisualModel(o);
  assert.equal(m.levels.length,shelfCount);assert.equal(!!m.wheel,type==='mobile');
  assert.equal(m.boxes.filter(b=>b.kind==='shelf').length,sectionWidths.length*shelfCount*(type==='stationary_single'?1:2),'the upper shelf must not be duplicated by an extra roof');
  for(const b of m.boxes){
   assert([b.x,b.y,b.z,b.sx,b.sy,b.sz].every(Number.isFinite));assert(b.sx>0&&b.sy>0&&b.sz>0);
   assert(b.x-b.sx/2>=-m.width/2-.01&&b.x+b.sx/2<=m.width/2+.01,b.kind+' exceeds width');
   assert(b.y-b.sy/2>=-m.depth/2-.01&&b.y+b.sy/2<=m.depth/2+.01,b.kind+' exceeds depth');
   assert(b.z-b.sz/2>=0&&b.z+b.sz/2<=heightMm+.01,b.kind+' exceeds height');
  }
  const top=archiveTopMarkup(o);assert(!/NaN|undefined|Infinity/.test(top));assert.equal(top.includes('rack-wheel-rim'),type==='mobile');
 }
});
test('main and additional bays share their connecting end frame and have one front cover',()=>{
 const m=archiveVisualModel({rackType:'mobile',depthMm:300,sectionWidths:[1000,700,1200],heightMm:2015,shelfCount:6});
 assert.equal(m.boxes.filter(b=>b.kind==='front-panel').length,1);
 assert.equal(m.boxes.filter(b=>b.kind==='end-frame').length,8);
 assert.equal(new Set(m.boxes.filter(b=>b.kind==='end-frame').map(b=>b.x)).size,4);
});
test('all embedded JavaScript parses',()=>{
 for(const [i,match] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].entries())if(match[1].trim())new vm.Script(match[1],{filename:'inline-'+i+'.js'});
});
test('saved camera views preserve pan and old projects default to a centered camera',()=>{
 const definition=html.match(/const normalizePlanner3dView=[^\n]+/)[0];
 const normalize=vm.runInNewContext(definition+';normalizePlanner3dView');
 const old=normalize({azimuth:-90,elevation:35,zoom:1.5});assert.equal(old.panX,0);assert.equal(old.panY,0);
 const saved=normalize({azimuth:-90,elevation:35,zoom:1.5,panX:.2,panY:-.13});assert.equal(saved.panX,.2);assert.equal(saved.panY,-.13);
 for(const bad of [Infinity,'invalid',NaN]){assert.equal(normalize({panX:bad,panY:bad}).panX,0);assert.equal(normalize({panX:bad,panY:bad}).panY,0)}
});
