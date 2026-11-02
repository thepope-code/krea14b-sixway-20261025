import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {METHOD_IDS,NEW_METHOD_IDS,normalizeOrder,moveMethod,manifestShapeErrors,publicationReadiness} from './core.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function readyFixture(){
 const m=fixture();m.publication={mode:'full'};
 m.extension.pipeline={experiment_id:m.extension.experiment_id,status:'completed',execution_succeeded:true,summary_verified:true,summary_sha256:hash('new-summary')};
 for(const s of m.scenes){
  s.new_native_audit=structuredClone(s.native_audit);
  s.new_native_audit.sha256=hash(s.id+'new-native');s.new_native_audit.url='https://example.test/'+s.id+'/new-native.mp4';
  Object.assign(s.new_native_audit.validation,{sha256:s.new_native_audit.sha256,experiment_id:m.extension.experiment_id});
  for(const id of NEW_METHOD_IDS){
   const index=s.methods.findIndex(x=>x.id===id);
   const copy=structuredClone(s.methods.find(x=>x.id===(id==='freeswim_base'?'freeswim_ar_base':'freeswim_ar_progressive')));
   copy.id=id;copy.sha256=hash(s.id+id);copy.url='https://example.test/'+s.id+'/'+id+'.mp4';
   Object.assign(copy.validation,{sha256:copy.sha256,experiment_id:m.extension.experiment_id,method_id:id});
   Object.assign(copy.provenance,{attention:'freeswim',ar_rope:false});
   if(id==='freeswim_base')copy.provenance.native_sha256=s.new_native_audit.sha256;
   s.methods[index]=copy;
  }
 }
 return m;
}
test('saved three-column order retains order and appends new methods',()=>{
 assert.deepEqual(normalizeOrder(['freeswim_ar_progressive','bilinear','freeswim_ar_base']),['freeswim_ar_progressive','bilinear','freeswim_ar_base',...NEW_METHOD_IDS]);
 assert.equal(moveMethod(METHOD_IDS,'bilinear',4).at(-1),'bilinear');
});
test('pending new records have no media and preserve the fifteen actual old records',()=>{
 const m=fixture();
 // Keep this fixture pending even as real accepted clips are published.
 for(const s of m.scenes){
  s.new_native_audit={status:'pending',url:null,poster:null};
  for(const id of NEW_METHOD_IDS){
   const v=s.methods.find(x=>x.id===id);Object.assign(v,{status:'pending',url:null,poster:null});
  }
 }
 assert.deepEqual(manifestShapeErrors(m),[]);
 assert.equal(m.scenes.flatMap(s=>s.methods).filter(x=>x.status==='ready').length,15);
 for(const s of m.scenes)for(const id of NEW_METHOD_IDS){const v=s.methods.find(x=>x.id===id);assert.equal(v.url,null);assert.equal(v.status,'pending');}
 assert.equal(publicationReadiness(m,{allowPartial:true}).ready,true);
 assert.equal(publicationReadiness({...m,publication:{mode:'full'}}).ready,false);
});
test('full synthetic contract covers both independently verified batches',()=>assert.equal(publicationReadiness(readyFixture()).ready,true));
test('new Base-SR cannot borrow old Native provenance',()=>{
 const m=readyFixture();m.scenes[0].methods.find(x=>x.id==='freeswim_base').provenance.native_sha256=m.scenes[0].native_audit.sha256;
 assert.equal(publicationReadiness(m).ready,false);
});
test('new result must bind new experiment and explicitly disable AR',()=>{
 for(const change of [x=>x.validation.experiment_id='nm5_krea_five_scene_triple_20261026',x=>x.provenance.ar_rope=true]){
  const m=readyFixture();change(m.scenes[0].methods.find(x=>x.id==='freeswim_progressive'));assert.equal(publicationReadiness(m).ready,false);
 }
});
test('new Native and summary are mandatory for complete release',()=>{
 const m=readyFixture();m.extension.pipeline.summary_verified=false;assert.equal(publicationReadiness(m).ready,false);
 const n=readyFixture();n.scenes[2].new_native_audit.status='pending';assert.equal(publicationReadiness(n).ready,false);
});
test('private access fields and duplicate media cannot be published',()=>{
 const m=readyFixture();m.extension.hostname='private-host';assert.equal(publicationReadiness(m).ready,false);
 const n=readyFixture();n.scenes[0].methods[4].url=n.scenes[0].methods[3].url;assert.equal(publicationReadiness(n).ready,false);
});
