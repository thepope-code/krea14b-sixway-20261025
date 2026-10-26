import { METHOD_IDS, METHOD_LABELS, ORDER_KEY, normalizeOrder, moveMethod, isPlayable, manifestShapeErrors, publicationReadiness } from './core.mjs';

const $ = selector => document.querySelector(selector);
const state = { manifest: null, activeScene: 'pottery', showAll: false, order: readOrder(), groups: new Map(), dragging: null };
function readOrder() {
  try { return normalizeOrder(JSON.parse(localStorage.getItem(ORDER_KEY))); } catch { return [...METHOD_IDS]; }
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text, label, action, className = '') {
  const node = element('button', className, text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.addEventListener('click', action);
  return node;
}
function announce(text) { $('#announcement').textContent = text; }
function stamp(seconds) { return `${Number.isFinite(seconds) ? seconds.toFixed(1) : '0.0'} / 30 s`; }
function videos(group) { return [...group.grid.querySelectorAll('video')]; }
function startVideo(video) {
  const result = video.play();
  if (result?.catch) result.catch(() => {
    const status = video.closest('.video-card').querySelector('.media-status');
    if (!video.error) status.textContent = '点击视频原生播放键继续';
  });
}
function attachVisibleMedia(group) {
  for (const [id, entry] of group.cards) {
    if (!entry.video || entry.video.hasAttribute('src')) continue;
    const method = group.scene.methods.find(item => item.id === id);
    // Pending records never create video elements or assign src; real MP4s stream directly.
    if (!isPlayable(method)) continue;
    entry.video.preload = 'metadata';
    entry.video.src = method.url;
    if (method.poster) entry.video.poster = method.poster;
  }
}
function updateViews() {
  for (const [id, group] of state.groups) {
    group.section.hidden = !state.showAll && id !== state.activeScene;
    if (group.section.hidden) videos(group).forEach(video => video.pause());
    else attachVisibleMedia(group);
  }
  for (const tab of document.querySelectorAll('.scene-tab')) {
    tab.setAttribute('aria-current', String(tab.dataset.scene === state.activeScene));
  }
}
function changeOrder(next, focusKey) {
  state.order = normalizeOrder(next);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(state.order)); } catch { announce('浏览器禁止本地存储，本次顺序仍可使用。'); }
  for (const group of state.groups.values()) {
    const playing = new Set(videos(group).filter(video => !video.paused));
    for (const id of state.order) group.grid.append(group.cards.get(id).card);
    for (const [id, entry] of group.cards) {
      const position = state.order.indexOf(id);
      entry.left.disabled = position === 0;
      entry.right.disabled = position === state.order.length - 1;
      entry.header.setAttribute('aria-label', `${METHOD_LABELS[id].title}，${METHOD_LABELS[id].subtitle}；第 ${position + 1} 列。用左右方向键移动，Home 或 End 移到首尾。`);
    }
    playing.forEach(startVideo);
  }
  if (focusKey) {
    const entry = state.groups.get(focusKey.scene)?.cards.get(focusKey.method);
    (entry?.[focusKey.control] && !entry[focusKey.control].disabled ? entry[focusKey.control] : entry?.header)?.focus();
  }
  announce(`方法顺序已调整：${state.order.map(id => METHOD_LABELS[id].subtitle).join('；')}`);
}
function seekGroup(group, seconds) {
  group.seek.value = String(seconds);
  group.time.textContent = stamp(seconds);
  for (const video of videos(group)) {
    if (video.readyState < 1) {
      const applyOnce = () => { video.currentTime = Math.min(seconds, Number.isFinite(video.duration) ? video.duration : 30); };
      video.addEventListener('loadedmetadata', applyOnce, { once: true });
    } else video.currentTime = Math.min(seconds, Number.isFinite(video.duration) ? video.duration : 30);
  }
}
function makeCard(scene, method, group) {
  const card = element('article', 'video-card');
  card.dataset.method = method.id;
  const header = element('div', 'card-header');
  header.draggable = true;
  header.tabIndex = 0;
  const label = element('div', 'method-label');
  label.append(element('span', 'method-number', `METHOD ${String(METHOD_IDS.indexOf(method.id) + 1).padStart(2, '0')}`), element('h3', '', method.title), element('p', 'subtitle', method.subtitle));
  const movement = element('div', 'move-controls');
  const move = delta => changeOrder(moveMethod(state.order, method.id, state.order.indexOf(method.id) + delta), { scene: scene.id, method: method.id, control: delta < 0 ? 'left' : 'right' });
  const left = button('←', `${scene.title}：将 ${method.subtitle} 左移`, () => move(-1));
  const right = button('→', `${scene.title}：将 ${method.subtitle} 右移`, () => move(1));
  movement.append(left, right); header.append(label, movement);
  header.addEventListener('keydown', event => {
    if (event.target !== header || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const position = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : state.order.indexOf(method.id) + (event.key === 'ArrowLeft' ? -1 : 1);
    changeOrder(moveMethod(state.order, method.id, position), { scene: scene.id, method: method.id, control: 'header' });
  });
  header.addEventListener('dragstart', event => { state.dragging = method.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', method.id); });
  header.addEventListener('dragend', () => { state.dragging = null; document.querySelectorAll('.drag-over').forEach(node => node.classList.remove('drag-over')); });
  card.addEventListener('dragover', event => { if (state.dragging && state.dragging !== method.id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); } });
  card.addEventListener('dragleave', event => { if (!card.contains(event.relatedTarget)) card.classList.remove('drag-over'); });
  card.addEventListener('drop', event => {
    if (!state.dragging || state.dragging === method.id) return;
    event.preventDefault(); card.classList.remove('drag-over');
    const movedId = state.dragging;
    state.dragging = null;
    changeOrder(moveMethod(state.order, movedId, state.order.indexOf(method.id)), { scene: scene.id, method: movedId, control: 'header' });
  });
  const frame = element('div', 'media-frame');
  const footer = element('div', 'card-footer');
  const status = element('span', 'media-status', method.status === 'failed' ? '生成未完成' : '生成中／待验收');
  footer.append(status);
  let video = null;
  if (isPlayable(method)) {
    video = element('video');
    video.controls = true; video.muted = true; video.playsInline = true; video.preload = 'none';
    video.setAttribute('aria-label', `${scene.title} — ${method.title}，${method.subtitle}`);
    // No src until this scene is shown. No fetch(), Blob URL, or whole-file preload.
    frame.append(video);
    status.textContent = '选择场景后加载';
    video.addEventListener('loadedmetadata', () => { status.textContent = `${video.videoWidth} × ${video.videoHeight} · ${video.duration.toFixed(1)} s`; });
    video.addEventListener('waiting', () => { status.textContent = '本路缓冲中'; });
    video.addEventListener('playing', () => { status.textContent = '正在播放'; status.classList.remove('error'); });
    video.addEventListener('pause', () => { if (!video.error) status.textContent = video.ended ? '播放结束' : '已暂停'; });
    video.addEventListener('ended', () => { status.textContent = '播放结束'; });
    video.addEventListener('error', () => { status.textContent = `媒体错误（${video.error?.code ?? '未知'}），其他视频不受影响`; status.classList.add('error'); });
    video.addEventListener('timeupdate', () => {
      // The first visible column is only a progress readout, not a continuous sync master.
      if (videos(group)[0] === video && !group.seeking) { group.seek.value = String(video.currentTime); group.time.textContent = stamp(video.currentTime); }
    });
    const original = element('a', '', '打开原片 ↗'); original.href = method.url; original.target = '_blank'; original.rel = 'noopener';
    footer.append(original);
  } else {
    const pending = element('div', 'pending');
    pending.append(element('span', 'pending-icon', '◷'), element('strong', '', method.status === 'failed' ? '本路生成尚未完成' : '生成中／待验收'), element('span', '', '本路尚无已验收原片，不使用占位视频'));
    frame.append(pending);
  }
  card.append(header, frame, footer);
  return { card, header, left, right, video };
}
function makeGroup(scene, index) {
  const section = element('section', 'scene-group'); section.id = `scene-${scene.id}`;
  section.setAttribute('aria-labelledby', `heading-${scene.id}`);
  const heading = element('div', 'scene-heading');
  const copy = element('div');
  const title = element('h2'); title.id = `heading-${scene.id}`;
  title.append(element('span', 'scene-index', `${String(index + 1).padStart(2, '0')} / 05`), document.createTextNode(scene.title));
  copy.append(title, element('p', 'observation', `观察重点：${scene.observation}`));
  const controls = element('div', 'group-controls');
  const grid = element('div', 'video-grid');
  const seek = element('input'); seek.type = 'range'; seek.min = '0'; seek.max = '30'; seek.step = '0.0625'; seek.value = '0'; seek.setAttribute('aria-label', `${scene.title}：三路跳转至同一时间`);
  const time = element('span', 'time-label', stamp(0));
  const group = { scene, section, grid, seek, time, cards: new Map(), seeking: false };
  const play = button('播放本组', `播放 ${scene.title} 三路视频`, () => { attachVisibleMedia(group); videos(group).forEach(startVideo); }, 'primary');
  const pause = button('暂停', `暂停 ${scene.title} 三路视频`, () => videos(group).forEach(video => video.pause()));
  const restart = button('重播', `重播 ${scene.title} 三路视频`, () => { seekGroup(group, 0); videos(group).forEach(startVideo); });
  const seekLabel = element('label', '', '跳转'); seekLabel.append(seek);
  const canPlay = scene.methods.some(isPlayable);
  [play, pause, restart, seek].forEach(control => { control.disabled = !canPlay; });
  seek.addEventListener('pointerdown', () => { group.seeking = true; });
  seek.addEventListener('input', () => { group.seeking = true; time.textContent = stamp(Number(seek.value)); });
  seek.addEventListener('change', () => { seekGroup(group, Number(seek.value)); group.seeking = false; });
  seek.addEventListener('blur', () => { group.seeking = false; });
  controls.append(play, pause, restart, seekLabel, time); heading.append(copy, controls);
  for (const method of scene.methods) { const entry = makeCard(scene, method, group); group.cards.set(method.id, entry); grid.append(entry.card); }
  const details = element('details', 'prompt-details');
  details.append(element('summary', '', '查看本组完整英文提示词与来源标识'), element('p', 'prompt-body', scene.prompt), element('p', 'prompt-hash', `Prompt SHA-256（UTF-8 + LF）：${scene.prompt_sha256}`));
  if (isPlayable(scene.native_audit)) {
    const audit = element('a', '', '打开本组 Native Base（审计原片）↗');
    audit.href = scene.native_audit.url; audit.target = '_blank'; audit.rel = 'noopener';
    details.append(audit);
  }
  section.append(heading, grid, details);
  return group;
}
async function initialize() {
  const response = await fetch('./manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`实验清单请求失败（HTTP ${response.status}）`);
  const manifest = await response.json();
  const errors = manifestShapeErrors(manifest);
  if (errors.length) throw new Error(`实验清单不完整：${errors.join('；')}`);
  state.manifest = manifest;
  const available = manifest.scenes.flatMap(scene => scene.methods).filter(isPlayable).length;
  const partial = manifest.publication?.mode === 'partial';
  const release = publicationReadiness(manifest, { allowPartial: partial });
  if (available && !release.ready) throw new Error(`媒体清单尚未通过发布门禁：${release.errors.join('；')}`);
  $('#page-status').textContent = release.ready ? `${available} / 15 已验收${partial ? ' · 部分结果更新中' : ' · 完整结果'}` : '本地模板 · 0 / 15 已验收';
  $('#footer-status').textContent = release.ready ? partial ? '仅展示已验收原片；其余结果仍在生成或验收中' : '十五路展示视频与五份 Native 审计均已验证' : '本地准备状态，不代表已生成或已发布';
  if (release.ready && partial) {
    $('#preparation-notice').hidden = false;
    $('#preparation-notice').textContent = `部分结果更新中：当前 ${available} / 15 路展示视频已完成来源、规格、完整解码和 SHA 验收。其余卡片仅标记“生成中／待验收”，不会加载其他视频；这不表示整个实验或流水线已完成。`;
  } else if (!release.ready) {
    $('#preparation-notice').hidden = false;
    $('#preparation-notice').textContent = '这是本地实验展示模板，目前尚未接入已验收的本轮视频。下方是待生成或待验收位置，不是实验结果。';
  }
  manifest.scenes.forEach((scene, index) => {
    const tab = button('', `查看 ${scene.title}`, () => { state.activeScene = scene.id; state.showAll = false; $('#show-all').checked = false; updateViews(); });
    tab.className = 'scene-tab'; tab.dataset.scene = scene.id; tab.setAttribute('aria-controls', `scene-${scene.id}`);
    tab.append(element('span', 'tab-number', String(index + 1).padStart(2, '0')), document.createTextNode(scene.title.split(' · ').at(-1)));
    $('#scene-tabs').append(tab);
    const group = makeGroup(scene, index); state.groups.set(scene.id, group); $('#scene-groups').append(group.section);
  });
  $('#show-all').addEventListener('change', event => { state.showAll = event.target.checked; updateViews(); });
  $('#reset-order').addEventListener('click', () => changeOrder(METHOD_IDS));
  changeOrder(state.order); updateViews();
}
initialize().catch(error => {
  $('#page-status').textContent = '清单读取失败';
  $('#preparation-notice').hidden = false;
  $('#preparation-notice').textContent = `${error.message}。为避免显示错误实验，本页不会加载视频。`;
  $('#reset-order').disabled = true; $('#show-all').disabled = true;
});
