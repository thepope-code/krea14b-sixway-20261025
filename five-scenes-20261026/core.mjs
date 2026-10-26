export const METHOD_IDS = ['bilinear', 'freeswim_ar_base', 'freeswim_ar_progressive'];
export const SCENE_IDS = ['pottery', 'horse', 'city', 'stream', 'macro'];
export const METHOD_LABELS = {
  bilinear: { title: 'Bilinear', subtitle: '同 Base · 双线性插值' },
  freeswim_ar_base: { title: 'FreeSwim + AR-RoPE', subtitle: 'Base 后加噪 · 全局辅助分支 AR' },
  freeswim_ar_progressive: { title: 'FreeSwim + AR-RoPE', subtitle: '低清 2 步 → 高清 3 步 · HR 反馈' },
};
export const ORDER_KEY = 'krea14b-five-scene-20261026:method-order:v1';

export function normalizeOrder(saved, available = METHOD_IDS) {
  const order = Array.isArray(saved) ? saved.filter((id, index) => available.includes(id) && saved.indexOf(id) === index) : [];
  return [...order, ...available.filter(id => !order.includes(id))];
}

export function moveMethod(order, id, targetIndex) {
  const next = normalizeOrder(order);
  if (!next.includes(id)) return next;
  next.splice(next.indexOf(id), 1);
  next.splice(Math.max(0, Math.min(next.length, targetIndex)), 0, id);
  return next;
}

export function safeMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) return false;
  if (/^(?:data|blob|javascript|file):/i.test(value) || value.startsWith('//') || value.includes('\\')) return false;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
  }
  return !value.split('/').includes('..') && !value.startsWith('#') && !value.startsWith('?');
}

export function isPlayable(method) {
  return method?.status === 'ready' && safeMediaUrl(method.url);
}

export function manifestShapeErrors(manifest) {
  const errors = [];
  if (manifest?.schema_version !== 1) errors.push('schema_version 必须为 1');
  if (manifest?.experiment_id !== 'nm5_krea_five_scene_triple_20261026') errors.push('实验标识不匹配');
  if (!Array.isArray(manifest?.scenes) || manifest.scenes.length !== 5) return [...errors, '必须包含五个场景'];
  if (new Set(manifest.scenes.map(s => s.id)).size !== 5 || !SCENE_IDS.every(id => manifest.scenes.some(s => s.id === id))) errors.push('场景标识缺失或重复');
  for (const scene of manifest.scenes) {
    if (!scene.title || !scene.prompt || !scene.observation || !/^[a-f0-9]{64}$/.test(scene.prompt_sha256 ?? '')) errors.push(`${scene.id}: 场景文案或提示词 SHA 缺失`);
    if (!Array.isArray(scene.methods) || scene.methods.length !== 3 || new Set(scene.methods.map(m => m.id)).size !== 3 || !METHOD_IDS.every(id => scene.methods.some(m => m.id === id))) {
      errors.push(`${scene.id}: 必须恰好包含三个选定方法`); continue;
    }
    for (const method of [...scene.methods, { ...scene.native_audit, id: 'native_base' }]) {
      if (!['pending', 'ready', 'failed'].includes(method.status)) errors.push(`${scene.id}/${method.id}: 不支持的媒体状态`);
      if (method.status === 'ready' && !safeMediaUrl(method.url)) errors.push(`${scene.id}/${method.id}: ready 媒体 URL 无效`);
      if (method.status !== 'ready' && (method.url != null || method.poster != null)) errors.push(`${scene.id}/${method.id}: 未验收媒体必须没有 URL 或海报`);
      if (method.poster && !safeMediaUrl(method.poster)) errors.push(`${scene.id}/${method.id}: 海报 URL 无效`);
    }
  }
  return errors;
}

function videoErrors(record, label, dimensions, promptHash, binding) {
  const errors = [];
  if (!isPlayable(record)) errors.push(`${label}: 尚无 ready 视频`);
  if (!/^[a-f0-9]{64}$/.test(record?.sha256 ?? '')) errors.push(`${label}: 缺少 SHA-256`);
  if (!Number.isSafeInteger(record?.bytes) || record.bytes <= 0) errors.push(`${label}: 缺少原片字节数`);
  const validation = record?.validation;
  if (validation?.full_decode_passed !== true) errors.push(`${label}: 未通过完整解码`);
  if (validation?.width !== dimensions[0] || validation?.height !== dimensions[1] || validation?.frames !== 480 || validation?.fps !== 16 || Math.abs((validation?.duration_seconds ?? 0) - 30) > 0.001) errors.push(`${label}: 视频规格不匹配`);
  if (validation?.sha256 !== record?.sha256) errors.push(`${label}: 验证 SHA 与媒体 SHA 不一致`);
  if (record?.prompt_sha256 !== promptHash) errors.push(`${label}: 提示词来源不匹配`);
  for (const key of ['config_sha256', 'checkpoint_sha256', 'report_sha256']) {
    if (!/^[a-f0-9]{64}$/.test(validation?.[key] ?? '')) errors.push(`${label}: 缺少 ${key} 来源记录`);
  }
  for (const key of ['experiment_id', 'scene_id', 'method_id']) {
    if (validation?.[key] !== binding[key]) errors.push(`${label}: ${key} 未绑定本轮产物`);
  }
  return errors;
}

export function publicMetadataErrors(value, path = 'manifest') {
  const errors = [];
  if (!value || typeof value !== 'object') return errors;
  for (const [key, child] of Object.entries(value)) {
    const location = `${path}.${key}`;
    if (/^(?:job_ids?|slurm_job_ids?|remote_path|source_path|hostname|ssh_host|ssh_user|identity_file)$/i.test(key)) errors.push(`${location}: 公共清单不得包含作业号或私有访问字段`);
    if (typeof child === 'string' && /(?:\/(?:gpfs|workspace|root|home|Users)\/|[A-Za-z]:[\\/](?:Users|workspace)[\\/]|ssh\s+-p\s)/i.test(child)) errors.push(`${location}: 公共清单不得包含私有路径或连接命令`);
    else if (child && typeof child === 'object') errors.push(...publicMetadataErrors(child, location));
  }
  return errors;
}

export function publicationReadiness(manifest, { allowPartial = false } = {}) {
  const errors = manifestShapeErrors(manifest);
  if (errors.length) return { ready: false, errors };
  errors.push(...publicMetadataErrors(manifest));
  const partialRequested = manifest.publication?.mode === 'partial';
  const partial = partialRequested && allowPartial && manifest.publication?.user_authorized === true;
  if (partialRequested && !allowPartial) errors.push('部分发布必须显式使用 --allow-partial');
  if (partialRequested && manifest.publication?.user_authorized !== true) errors.push('部分发布缺少用户授权记录');
  const allUrls = [], allHashes = [], checkpoints = new Set();
  let readyDisplayCount = 0;
  for (const scene of manifest.scenes) {
    const binding = { experiment_id: manifest.experiment_id, scene_id: scene.id };
    if (!partial || scene.native_audit?.status === 'ready') {
      errors.push(...videoErrors(scene.native_audit, `${scene.id}/Native 审计`, [832, 480], scene.prompt_sha256, { ...binding, method_id: 'native_base' }));
      if (scene.native_audit?.validation?.checkpoint_sha256) checkpoints.add(scene.native_audit.validation.checkpoint_sha256);
    }
    for (const method of scene.methods) {
      if (method.status === 'ready') readyDisplayCount += 1;
      if (partial && method.status !== 'ready') continue;
      const label = `${scene.id}/${method.id}`;
      errors.push(...videoErrors(method, label, [1664, 960], scene.prompt_sha256, { ...binding, method_id: method.id }));
      if (method.validation?.checkpoint_sha256) checkpoints.add(method.validation.checkpoint_sha256);
      if (method.id === 'freeswim_ar_progressive') {
        if (method.provenance?.kind !== 'progressive_hr_feedback') errors.push(`${label}: 必须标记 HR 反馈而非固定 Base`);
      } else if (!isPlayable(scene.native_audit) || method.provenance?.kind !== 'shared_native_base' || method.provenance?.native_sha256 !== scene.native_audit?.sha256) errors.push(`${label}: 新共享 Base 必须已验收且来源一致`);
      if (method.url) allUrls.push(method.url);
      if (method.sha256) allHashes.push(method.sha256);
    }
    if (scene.native_audit?.status === 'ready') {
      if (scene.native_audit.url) allUrls.push(scene.native_audit.url);
      if (scene.native_audit.sha256) allHashes.push(scene.native_audit.sha256);
    }
  }
  if (new Set(allUrls).size !== allUrls.length) errors.push('媒体 URL 重复，不能复用同一片冒充不同方法或场景');
  if (new Set(allHashes).size !== allHashes.length) errors.push('媒体 SHA 重复，需要核查是否误用了旧片或其他场景');
  if (checkpoints.size !== 1) errors.push('必须绑定同一份 Krea checkpoint 来源');
  if (manifest.pipeline?.experiment_id !== manifest.experiment_id) errors.push('流水线未绑定本轮实验');
  if (partial) {
    if (readyDisplayCount < 1) errors.push('部分发布至少需要一份真实且已验收的展示视频');
  } else {
    if (manifest.pipeline?.status !== 'completed' || manifest.pipeline?.jobs_succeeded !== true || manifest.pipeline?.summary_verified !== true) errors.push('尚未绑定成功作业和 SUE 总结');
    if (!/^[a-f0-9]{64}$/.test(manifest.pipeline?.summary_sha256 ?? '')) errors.push('SUE 总结未绑定本轮验证记录');
  }
  return { ready: errors.length === 0, errors };
}
