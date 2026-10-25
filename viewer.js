'use strict';
const $=id=>document.getElementById(id), cards=[], states=new Map();
const clock=t=>`00:${String(Math.floor(Number.isFinite(t)?t:0)).padStart(2,'0')}`;
const summary=()=>{$('load-summary').textContent=`${cards.filter(c=>c.video.readyState>=2).length} / 6 路可播放`;};
function state(c,text,error=false){c.status.textContent=text;c.status.classList.toggle('error',error);c.retry.hidden=!error;summary();}
async function play(c){try{await c.video.play();}catch(e){if(e.name==='NotAllowedError')state(c,'点击播放');else if(e.name!=='AbortError')state(c,'暂未播放 · 可重试',true);}}
function seek(t){cards.forEach(c=>{if(c.video.readyState)c.video.currentTime=Math.min(t,c.video.duration||30);else c.pendingSeek=t;});$('global-time').textContent=`${clock(t)} / 00:30`;}
function makeCard(m,i){
 const card=document.createElement('article');card.className='card';
 const head=document.createElement('div');head.className='card-head';
 const num=document.createElement('span');num.className='number';num.textContent=String(i+1).padStart(2,'0');
 const titlebox=document.createElement('div'),title=document.createElement('h2'),sub=document.createElement('div');title.textContent=m.title;sub.className='subtitle';sub.textContent=m.subtitle;titlebox.append(title,sub);
 const tag=document.createElement('span');tag.className=`tag ${m.category}`;tag.textContent=m.categoryLabel;head.append(num,titlebox,tag);
 const slot=document.createElement('div');slot.className='video-slot';const video=document.createElement('video');video.controls=true;video.muted=true;video.autoplay=true;video.playsInline=true;video.preload='metadata';video.poster=m.poster;video.setAttribute('aria-label',`${i+1}. ${m.title} ${m.subtitle}`);video.src=m.url;slot.append(video);
 const foot=document.createElement('div');foot.className='card-foot';const status=document.createElement('span');status.className='status';status.textContent='连接中';const time=document.createElement('time');time.textContent='00:00';
 const retry=document.createElement('button');retry.textContent='重试';retry.hidden=true;
 const focus=document.createElement('button');focus.textContent='放大';focus.setAttribute('aria-label',`放大第${i+1}路`);
 const original=document.createElement('a');original.className='original';original.textContent='原片 ↗';original.href=m.url;original.target='_blank';original.rel='noopener';
 foot.append(status,time,retry,focus,original);card.append(head,slot,foot);$('gallery').append(card);
 const c={card,video,slot,status,time,retry,method:m};cards.push(c);states.set(video,c);
 video.addEventListener('loadedmetadata',()=>{if(c.pendingSeek!==undefined){video.currentTime=c.pendingSeek;delete c.pendingSeek;}summary();});
 video.addEventListener('canplay',()=>state(c,video.paused?'已就绪':'播放中'));video.addEventListener('playing',()=>state(c,'播放中'));video.addEventListener('waiting',()=>state(c,'缓冲中'));video.addEventListener('stalled',()=>state(c,'等待网络'));
 video.addEventListener('pause',()=>{if(!video.ended)state(c,'已暂停');});video.addEventListener('ended',()=>state(c,'播放完成'));video.addEventListener('error',()=>state(c,`载入失败 (${video.error?.code||'网络'})`,true));
 video.addEventListener('timeupdate',()=>{time.textContent=clock(video.currentTime);if(i===0&&!$('seek-all').matches(':active')){$('seek-all').value=video.currentTime;$('global-time').textContent=`${clock(video.currentTime)} / 00:30`;}});
 retry.onclick=()=>{const t=video.currentTime;c.pendingSeek=t;video.load();play(c);};focus.onclick=()=>openFocus(c);play(c);
}
let focused=null;
function openFocus(c){focused=c;const p=document.createElement('span');p.className='focus-placeholder';p.textContent='正在单路查看';c.slot.append(p);$('focus-title').textContent=c.method.title+' · '+c.method.subtitle;$('focus-slot').append(c.video);$('focus-dialog').showModal();}
$('focus-dialog').addEventListener('close',()=>{if(focused){focused.slot.replaceChildren(focused.video);focused=null;}});
$('focus-close').onclick=()=>$('focus-dialog').close();
$('play-all').onclick=()=>cards.forEach(play);$('pause-all').onclick=()=>cards.forEach(c=>c.video.pause());$('restart-all').onclick=()=>{seek(0);cards.forEach(play);};$('seek-all').oninput=e=>seek(Number(e.target.value));$('speed').onchange=e=>cards.forEach(c=>{c.video.playbackRate=Number(e.target.value);});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='浏览器不支持全屏';}};
$('about-open').onclick=()=>$('about-dialog').showModal();$('about-close').onclick=()=>$('about-dialog').close();$('audit-open').onclick=()=>{$('audit-details').open=true;$('about-dialog').showModal();$('audit-details').scrollIntoView({block:'nearest'});};
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
fetch('./manifest.json').then(r=>{if(!r.ok)throw Error('清单无法读取');return r.json();}).then(data=>{if(data.videos?.length!==6)throw Error('清单不完整');$('gallery').replaceChildren();$('prompt-text').textContent=data.prompt;data.videos.forEach(makeCard);}).catch(e=>{$('page-error').hidden=false;$('page-error').textContent=`${e.message}，请刷新页面重试。`;$('load-summary').textContent='载入未完成';});
