'use strict';
import { normalizeOrder, moveItem } from './order.mjs?v=sort1';
const $=id=>document.getElementById(id), cards=[], states=new Map();
const orderKey='krea14b-sixway-20261025:order:v1';
let defaultOrder=[], dragging=null, pointerDrag=null, dropTarget=null;
const clock=t=>`00:${String(Math.floor(Number.isFinite(t)?t:0)).padStart(2,'0')}`;
const summary=()=>{$('load-summary').textContent=`${cards.filter(c=>c.video.readyState>=2).length} / ${cards.length} 路可播放`;};
function state(c,text,error=false){c.status.textContent=text;c.status.classList.toggle('error',error);c.retry.hidden=!error;summary();}
async function play(c){try{await c.video.play();}catch(e){if(e.name==='NotAllowedError')state(c,'点击播放');else if(e.name!=='AbortError')state(c,'暂未播放 · 可重试',true);}}
function seek(t){cards.forEach(c=>{if(c.video.readyState)c.video.currentTime=Math.min(t,c.video.duration||30);else c.pendingSeek=t;});$('global-time').textContent=`${clock(t)} / 00:30`;}
function makeCard(m,i){
 const card=document.createElement('article');card.className='card';card.id=`card-${m.id}`;card.dataset.method=m.id;card.setAttribute('role','listitem');
 const head=document.createElement('div');head.className='card-head';
 const handle=document.createElement('button');handle.className='drag-handle';handle.type='button';handle.textContent='⠿';handle.title='拖到另一格调整顺序；也可用方向键';handle.setAttribute('aria-label',`拖动或用方向键移动实验 ${String(i+1).padStart(2,'0')} ${m.title}`);handle.setAttribute('aria-describedby','order-help');
 const num=document.createElement('span');num.className='number';num.textContent=String(i+1).padStart(2,'0');
 const titlebox=document.createElement('div'),title=document.createElement('h2'),sub=document.createElement('div');title.id=`title-${m.id}`;title.textContent=m.title;card.setAttribute('aria-labelledby',title.id);sub.className='subtitle';sub.textContent=m.subtitle;titlebox.append(title,sub);
 const tag=document.createElement('span');tag.className=`tag ${m.category}`;tag.textContent=m.categoryLabel;head.append(handle,num,titlebox,tag);
 const slot=document.createElement('div');slot.className='video-slot';const video=document.createElement('video');video.controls=true;video.muted=true;video.autoplay=true;video.playsInline=true;video.preload='metadata';video.poster=m.poster;video.setAttribute('aria-label',`${i+1}. ${m.title} ${m.subtitle}`);video.src=m.url;slot.append(video);
 const foot=document.createElement('div');foot.className='card-foot';const status=document.createElement('span');status.className='status';status.textContent='连接中';const time=document.createElement('time');time.textContent='00:00';
 const retry=document.createElement('button');retry.textContent='重试';retry.hidden=true;
 const focus=document.createElement('button');focus.textContent='放大';focus.setAttribute('aria-label',`放大第${i+1}路`);
 const before=document.createElement('button'),after=document.createElement('button');before.className=after.className='move-button';before.textContent='←';after.textContent='→';before.title='前移一格';after.title='后移一格';before.setAttribute('aria-label',`实验 ${String(i+1).padStart(2,'0')} 前移一格`);after.setAttribute('aria-label',`实验 ${String(i+1).padStart(2,'0')} 后移一格`);
 const original=document.createElement('a');original.className='original';original.textContent='原片 ↗';original.href=m.url;original.target='_blank';original.rel='noopener';
 foot.append(status,time,retry,before,after,focus,original);card.append(head,slot,foot);$('gallery').append(card);
 const c={card,video,slot,status,time,retry,before,after,handle,method:m,number:i+1};cards.push(c);states.set(video,c);
 before.onclick=()=>moveCard(c,cards.indexOf(c)-1);after.onclick=()=>moveCard(c,cards.indexOf(c)+1);
 handle.onkeydown=e=>{const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1};if(e.key in offsets){e.preventDefault();moveCard(c,cards.indexOf(c)+offsets[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();moveCard(c,e.key==='Home'?0:cards.length-1);}};
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;clearDrag();pointerDrag={id:e.pointerId,x:e.clientX,y:e.clientY,handle};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!pointerDrag||pointerDrag.id!==e.pointerId)return;if(!dragging&&Math.hypot(e.clientX-pointerDrag.x,e.clientY-pointerDrag.y)<6)return;dragging=c;card.classList.add('dragging');const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.card');dropTarget=cards.find(x=>x.card===hit)||null;cards.forEach(x=>x.card.classList.toggle('drop-target',x===dropTarget&&x!==c));});
 handle.addEventListener('pointerup',e=>{if(!pointerDrag||pointerDrag.id!==e.pointerId)return;const moved=dragging,target=dropTarget;clearDrag();if(moved&&target){moveCard(moved,cards.indexOf(target));moved.handle.focus({preventScroll:true});}});
 handle.addEventListener('pointercancel',clearDrag);handle.addEventListener('lostpointercapture',clearDrag);
 video.addEventListener('loadedmetadata',()=>{if(c.pendingSeek!==undefined){video.currentTime=c.pendingSeek;delete c.pendingSeek;}summary();});
 video.addEventListener('canplay',()=>state(c,video.paused?'已就绪':'播放中'));video.addEventListener('playing',()=>state(c,'播放中'));video.addEventListener('waiting',()=>state(c,'缓冲中'));video.addEventListener('stalled',()=>state(c,'等待网络'));
 video.addEventListener('pause',()=>{if(!video.ended)state(c,'已暂停');});video.addEventListener('ended',()=>state(c,'播放完成'));video.addEventListener('error',()=>state(c,`载入失败 (${video.error?.code||'网络'})`,true));
 video.addEventListener('timeupdate',()=>{time.textContent=clock(video.currentTime);if(cards[0]===c&&!$('seek-all').matches(':active')){$('seek-all').value=video.currentTime;$('global-time').textContent=`${clock(video.currentTime)} / 00:30`;}});
 retry.onclick=()=>{const t=video.currentTime;c.pendingSeek=t;video.load();play(c);};focus.onclick=()=>openFocus(c);play(c);
}
function clearDrag(){const capture=pointerDrag;pointerDrag=null;dragging=null;dropTarget=null;if(capture&&capture.handle.hasPointerCapture(capture.id))capture.handle.releasePointerCapture(capture.id);cards.forEach(c=>c.card.classList.remove('dragging','drop-target'));}
function applyOrder(ids){
 const byId=new Map(cards.map(c=>[c.method.id,c]));cards.splice(0,cards.length,...ids.map(id=>byId.get(id)));
 const gallery=$('gallery');
 // moveBefore keeps video decoder/playback state intact. Older browsers use CSS
 // order instead of removing/re-inserting playing <video> elements.
 if(typeof gallery.moveBefore==='function'){
  try{cards.forEach((c,i)=>{if(gallery.children[i]!==c.card)gallery.moveBefore(c.card,gallery.children[i]||null);});}catch{/* CSS order below remains safe. */}
 }
 cards.forEach((c,i)=>{c.card.style.order=i;c.card.setAttribute('aria-posinset',i+1);c.card.setAttribute('aria-setsize',cards.length);c.before.disabled=i===0;c.after.disabled=i===cards.length-1;});
 gallery.setAttribute('aria-owns',cards.map(c=>c.card.id).join(' '));
 $('reset-order').disabled=cards.every((c,i)=>c.method.id===defaultOrder[i]);
 if(cards[0]){$('seek-all').value=cards[0].video.currentTime;$('global-time').textContent=`${clock(cards[0].video.currentTime)} / 00:30`;}
}
function saveOrder(){try{localStorage.setItem(orderKey,JSON.stringify(cards.map(c=>c.method.id)));return true;}catch{return false;}}
function moveCard(c,index){
 const ids=cards.map(x=>x.method.id),next=moveItem(ids,c.method.id,index);if(next.every((id,i)=>id===ids[i]))return;
 applyOrder(next);const saved=saveOrder();$('order-status').textContent=`实验 ${String(c.number).padStart(2,'0')} 已移到第 ${cards.indexOf(c)+1} 格。${saved?'顺序已记住。':'浏览器无法保存，刷新后将恢复默认顺序。'}`;
 if(!saved)$('order-feedback').textContent='当前顺序仅本次有效（浏览器未允许保存）';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')clearDrag();});
$('reset-order').onclick=()=>{applyOrder(defaultOrder);const saved=saveOrder();$('order-status').textContent='已恢复默认顺序。'+(saved?'':'刷新后可能恢复旧的本机顺序。');$('order-feedback').textContent=saved?'拖动 ⠿ 排序 · 自动记忆 · 编号不变':'当前顺序仅本次有效（浏览器未允许保存）';};
let focused=null;
function openFocus(c){focused=c;const p=document.createElement('span');p.className='focus-placeholder';p.textContent='正在单路查看';c.slot.append(p);$('focus-title').textContent=c.method.title+' · '+c.method.subtitle;$('focus-slot').append(c.video);$('focus-dialog').showModal();}
$('focus-dialog').addEventListener('close',()=>{if(focused){focused.slot.replaceChildren(focused.video);focused=null;}});
$('focus-close').onclick=()=>$('focus-dialog').close();
$('play-all').onclick=()=>cards.forEach(play);$('pause-all').onclick=()=>cards.forEach(c=>c.video.pause());$('restart-all').onclick=()=>{seek(0);cards.forEach(play);};$('seek-all').oninput=e=>seek(Number(e.target.value));$('speed').onchange=e=>cards.forEach(c=>{c.video.playbackRate=Number(e.target.value);});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='浏览器不支持全屏';}};
$('about-open').onclick=()=>$('about-dialog').showModal();$('about-close').onclick=()=>$('about-dialog').close();$('audit-open').onclick=()=>{$('audit-details').open=true;$('about-dialog').showModal();$('audit-details').scrollIntoView({block:'nearest'});};
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
fetch('./manifest.json', {cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('清单无法读取');return r.json();}).then(data=>{if(data.videos?.length!==8||new Set(data.videos.map(m=>m.id)).size!==8||!data.prompt30s)throw Error('清单不完整');$('gallery').replaceChildren();$('prompt-text').textContent=data.prompt;$('prompt30s-text').textContent=data.prompt30s;defaultOrder=data.videos.map(m=>m.id);data.videos.forEach(makeCard);let saved;try{saved=JSON.parse(localStorage.getItem(orderKey));}catch{/* Missing, malformed or blocked storage uses the default order. */}applyOrder(normalizeOrder(saved,defaultOrder));summary();}).catch(e=>{$('page-error').hidden=false;$('page-error').textContent=`${e.message}，请刷新页面重试。`;$('load-summary').textContent='载入未完成';});
