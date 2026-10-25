import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalIds=['bilinear','freeswim_base','freeswim_ar_base','freeswim_ar_progressive','freeswim_direct','freeswim_ar_direct'];
test('eight unique display methods preserve original six IDs',()=>{
  assert.equal(manifest.videos.length,8);
  assert.equal(new Set(manifest.videos.map(v=>v.id)).size,8);
  assert.deepEqual(manifest.videos.slice(0,6).map(v=>v.id),originalIds);
});
test('only the first prompt sentence is modified, with separately bound receipts',()=>{
  assert.equal(manifest.prompt30s,'A 30-second video of a'+manifest.prompt.slice(1));
  assert.equal(sha(manifest.prompt+'\n'),manifest.comparison_groups.original.prompt_sha256);
  assert.equal(sha(manifest.prompt30s+'\n'),manifest.comparison_groups.prompt30s.prompt_sha256);
  assert.deepEqual(manifest.comparison_groups.prompt30s.video_numbers,[7,8]);
  for(const item of manifest.videos.slice(6)) assert.equal(item.prompt_group,'prompt30s');
  assert.notEqual(manifest.native_audit.sha256,manifest.native_prompt30s_audit.sha256);
});
test('all display and audit media match full-decode validated original bytes',()=>{
  const entries=[...manifest.videos,manifest.native_audit,manifest.native_prompt30s_audit];
  assert.equal(new Set(entries.map(v=>v.url)).size,10);
  for(const v of entries){
    assert.match(v.url,/^\.\/media\/[a-z0-9_]+\.mp4$/);
    assert.match(v.poster,/^\.\/posters\/[a-z0-9_]+\.jpg$/);
    const data=readFileSync(new URL(v.url,import.meta.url));
    assert.equal(data.length,v.bytes,v.id+' byte size');
    assert.equal(sha(data),v.sha256,v.id+' SHA256');
    assert.ok(statSync(new URL(v.poster,import.meta.url)).size>0);
    const native=v.category==='audit';
    assert.deepEqual([v.width,v.height,v.frames,v.fps,v.duration,v.codec,v.full_decode_passed],[native?832:1664,native?480:960,480,16,30,'h264',true]);
  }
});
