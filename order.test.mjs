import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrder, moveItem } from './order.mjs';
const original=['bilinear','freeswim_base','freeswim_ar_base','freeswim_ar_progressive','freeswim_direct','freeswim_ar_direct'];
test('defaults are complete for absent or malformed storage',()=>{for(const value of [null,{},'bad',23])assert.deepEqual(normalizeOrder(value,original),original);});
test('valid saved order persists exactly',()=>assert.deepEqual(normalizeOrder([...original].reverse(),original),[...original].reverse()));
test('stale IDs and duplicates cannot add/remove videos',()=>assert.deepEqual(normalizeOrder([original[5],'unknown',original[5],null],original),[original[5],...original.slice(0,5)]));
test('move first to last and last to first',()=>{assert.deepEqual(moveItem(original,original[0],5),[...original.slice(1),original[0]]);assert.deepEqual(moveItem(original,original[5],0),[original[5],...original.slice(0,5)]);});
test('arbitrary forward/backward moves',()=>{assert.deepEqual(moveItem(original,original[1],3),[original[0],original[2],original[3],original[1],original[4],original[5]]);assert.deepEqual(moveItem(original,original[4],1),[original[0],original[4],original[1],original[2],original[3],original[5]]);});
test('boundaries, invalid IDs and indices are safe',()=>{assert.deepEqual(moveItem(original,original[0],-1),original);assert.deepEqual(moveItem(original,original[5],999),original);assert.deepEqual(moveItem(original,'missing',2),original);assert.deepEqual(moveItem(original,original[0],NaN),original);});
test('every move is a permutation and inputs are unchanged',()=>{const frozen=Object.freeze([...original]);for(const id of original)for(let to=-2;to<9;to++){const next=moveItem(frozen,id,to);assert.equal(next.length,6);assert.deepEqual([...next].sort(),[...original].sort());}assert.deepEqual(frozen,original);});

const eight=[...original,'bilinear_prompt30s','freeswim_ar_base_prompt30s'];
test('existing six-way order is retained, with the new pair appended',()=>assert.deepEqual(normalizeOrder([...original].reverse(),eight),[...original].reverse().concat(eight.slice(6))));
test('new video can move first, persist and reset without changing stable IDs',()=>{const moved=moveItem(eight,eight[7],0);assert.equal(moved[0],eight[7]);assert.deepEqual(normalizeOrder(JSON.parse(JSON.stringify(moved)),eight),moved);assert.deepEqual(normalizeOrder(null,eight),eight);});
test('all eight-way moves remain complete permutations',()=>{for(const id of eight)for(let index=-2;index<11;index++){const moved=moveItem(eight,id,index);assert.equal(moved.length,8);assert.deepEqual([...moved].sort(),[...eight].sort());}});
