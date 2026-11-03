export const EXPERIMENT_ID = 'gpuhome_krea_halo_eight_15s_20261103';
export const CHECKPOINT_SHA256 = '792f6042a645e227f5d71851845dc4098a7338fec9ec55279f88ebbc3527eec7';
export const SCENE_IDS = ['pottery', 'horse', 'city', 'stream', 'macro'];
export const PROMPT_SHA256 = {
  pottery: '1a487f49afb9e36a65c12fbaa871fbf0adea87b74357e90ece6f89819df16fb6',
  horse: '0bb4e3a1b51d109f7786872ca32982fe6d61f60b30eac63020c8124a79f5cf14',
  city: '464b7151e9c04890b4941d36ad60246494dec3f71071c6ec8c915fd26acc43b6',
  stream: '139e2be8675be11427cecfdf044383f6da0a20ad4c1ba51b75d69d826381a5f7',
  macro: '7878b241013ce89c2863255c36732b1cc2bb9de8479f44633a32f7f767b9df2e',
};
export const METHOD_IDS = ['bilinear', 'halo_g0_ca', 'halo_g1_ca', 'halo_g2_ca', 'halo_g2_lf_fixed', 'halo_g2_lf_decay', 'halo_g1_lf_fixed', 'halo_g1_lf_decay'];
export const ORDER_KEY = 'krea-halo-eight-15s-20261103-method-order-v1';
export const METHOD_LABELS = {
  bilinear: { title: 'Bilinear', subtitle: '同一新 Base · 双线性插值', global_branch: null, ca_lambda: null, output_lowpass_weights: null },
  halo_g0_ca: { title: 'Halo G0 + CA', subtitle: '原版完整全局分支 · CA 替换', global_branch: 'g0', ca_lambda: 1, output_lowpass_weights: null },
  halo_g1_ca: { title: 'Halo G1 + CA', subtitle: '完整全局 AR-RoPE · CA 替换', global_branch: 'g1', ca_lambda: 1, output_lowpass_weights: null },
  halo_g2_ca: { title: 'Halo G2 + CA', subtitle: '高清 Q / 2×2 粗 KV · CA 替换', global_branch: 'g2', ca_lambda: 1, output_lowpass_weights: null },
  halo_g2_lf_fixed: { title: 'Halo G2 + 低频融合', subtitle: '保留本地 CA · 权重 0.5 / 0.5 / 0.5', global_branch: 'g2', ca_lambda: 0, output_lowpass_weights: [0.5, 0.5, 0.5] },
  halo_g2_lf_decay: { title: 'Halo G2 + 低频衰减', subtitle: '保留本地 CA · 权重 0.833 / 0.625 / 0', global_branch: 'g2', ca_lambda: 0, output_lowpass_weights: [0.833, 0.625, 0] },
  halo_g1_lf_fixed: { title: 'Halo G1 + 低频融合', subtitle: '保留本地 CA · 权重 0.5 / 0.5 / 0.5', global_branch: 'g1', ca_lambda: 0, output_lowpass_weights: [0.5, 0.5, 0.5] },
  halo_g1_lf_decay: { title: 'Halo G1 + 低频衰减', subtitle: '保留本地 CA · 权重 0.833 / 0.625 / 0', global_branch: 'g1', ca_lambda: 0, output_lowpass_weights: [0.833, 0.625, 0] },
};
export const SCIENCE = {
  model: 'official Krea14B', checkpoint_sha256: CHECKPOINT_SHA256,
  seed: 12, native_wh: [832, 480], display_wh: [1664, 960],
  frames: 240, fps: 16, duration_seconds: 15, blocks: 21,
  block_latents: 3, history_latents: 3,
  native_model_calls: [1000, 937.5, 833.3333333333, 625, 0],
  hr_model_calls: [833.3333333333, 625, 0], clean_history_refresh: true,
  shared_base: 'new_native_per_scene', pathway: 'base_rgb_resize_vae_renoise_hr_suffix3',
  local_attention: 'halo', halo_query_tile: [10, 13], halo_kv_window: [30, 52],
  lowpass: 'orthonormal_spatial_dct_ii_binary_mask', lowpass_fraction: 0.25,
  beta_base: 1, parameters_confirmed: true, cross_step_feature_cache: false,
  global_g2: 'hr_q_spatial_2x2_mean_hidden_then_kv_projection_knorm_cell_center_rope_no_temporal_pool',
};
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactIds = (items, ids) => Array.isArray(items) && items.length === ids.length && new Set(items.map(x => x?.id)).size === ids.length && ids.every(id => items.some(x => x?.id === id));
export function normalizeOrder(order, available = METHOD_IDS) {
  return [...new Set([...(Array.isArray(order) ? order : []), ...available])].filter(id => available.includes(id));
}
export function moveMethod(order, id, position) {
  const next = normalizeOrder(order);
  if (!next.includes(id)) return next;
  next.splice(next.indexOf(id), 1);
  next.splice(Math.max(0, Math.min(next.length, position)), 0, id);
  return next;
}
export function safeMediaUrl(value) {
  if (typeof value !== 'string' || !value || /[\\\s]/.test(value) || value.startsWith('//')) return false;
  try {
    const url = new URL(value, 'https://local.invalid/');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    if (url.search || url.hash) return false; // No signed URLs or token-bearing queries in public metadata.
    const decoded = decodeURIComponent(value);
    if (/(^|\/)\.\.(\/|$)/.test(decoded) || /[\\\r\n]/.test(decoded)) return false;
    return true;
  } catch { return false; }
}
export function isPlayable(video) { return video?.status === 'ready' && safeMediaUrl(video.url); }
export function publicMetadataErrors(value, at = 'manifest') {
  const errors = [];
  if (typeof value === 'string' && /(?:\/root\/|\/home\/|\/gpfs\/|\/workspace\/|[A-Z]:[\\/]Users[\\/]|ssh\s+-p\s|Bearer\s)/i.test(value)) errors.push(`${at}: 私有路径或访问信息`);
  if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
    if (/^(?:hostname|ssh_host|ssh_user|identity_file|remote_path|local_path|source_path|job_id|job_ids|password|token|secret|proxy)$/i.test(key)) errors.push(`${at}.${key}: 非公开字段`);
    errors.push(...publicMetadataErrors(entry, `${at}.${key}`));
  }
  return errors;
}
export function manifestShapeErrors(manifest) {
  const errors = [];
  if (manifest?.schema_version !== 1 || manifest?.experiment_id !== EXPERIMENT_ID) errors.push('实验或 schema 不匹配');
  if (manifest?.expected?.display !== 40 || manifest?.expected?.native !== 5) errors.push('必须为 40 展示 + 5 Native');
  for (const [key, expected] of Object.entries(SCIENCE)) if (!same(manifest?.science?.[key], expected)) errors.push(`science.${key}: 与本轮已确认参数不符`);
  if (!exactIds(manifest?.scenes, SCENE_IDS)) errors.push('需要五个唯一场景');
  for (const scene of Array.isArray(manifest?.scenes) ? manifest.scenes : []) {
    if (!scene || typeof scene !== 'object') { errors.push('场景记录非法'); continue; }
    if (typeof scene.prompt !== 'string' || !scene.prompt.startsWith('A 15-second ') || /[\r\n]/.test(scene.prompt) || !hash(scene.prompt_sha256)) errors.push(`${scene.id}: 15 秒提示词或 SHA 缺失`);
    if (scene.prompt_sha256 !== PROMPT_SHA256[scene.id]) errors.push(`${scene.id}: 提示词不是本轮已确认文本`);
    if (!exactIds(scene.methods, METHOD_IDS)) errors.push(`${scene.id}: 需要八个唯一方法`);
    if (scene.native_audit?.id !== 'native') errors.push(`${scene.id}: Native 审计记录缺失`);
    for (const video of [...(Array.isArray(scene.methods) ? scene.methods : []), scene.native_audit].filter(Boolean)) {
      if (!['pending', 'ready', 'failed'].includes(video.status)) errors.push(`${scene.id}/${video.id}: 非法状态`);
      if (video.status !== 'ready' && ['url', 'poster', 'sha256', 'bytes', 'report', 'validation', 'provenance', 'online'].some(key => video[key] !== null)) errors.push(`${scene.id}/${video.id}: 未验收位置只能保留空媒体字段`);
      if (video.status === 'ready' && (!safeMediaUrl(video.url) || (video.poster !== null && !safeMediaUrl(video.poster)))) errors.push(`${scene.id}/${video.id}: 媒体地址不安全`);
      const definition = METHOD_LABELS[video.id];
      if (definition) for (const key of ['global_branch', 'ca_lambda', 'output_lowpass_weights']) if (!same(video[key], definition[key])) errors.push(`${scene.id}/${video.id}: ${key} 与八组定义不符`);
    }
  }
  errors.push(...publicMetadataErrors(manifest));
  return errors;
}
const BROWSER_FLAGS = ['passed', 'playback_advanced', 'seek_completed', 'replay_advanced', 'zero_media_errors'];
function videoErrors(video, scene, manifest, online, forLocalReview) {
  const prefix = `${scene.id}/${video.id}`, errors = [];
  const native = video.id === 'native', dimensions = native ? SCIENCE.native_wh : SCIENCE.display_wh;
  const validation = video.validation ?? {}, provenance = video.provenance ?? {};
  if (!hash(video.sha256) || !Number.isSafeInteger(video.bytes) || video.bytes <= 0) errors.push(`${prefix}: 原片 SHA/字节数缺失`);
  if (!video.report || !safeMediaUrl(video.report.url) || !hash(video.report.sha256)) errors.push(`${prefix}: 真实验收报告缺失`);
  const expected = { full_decode: true, local_sha256_verified: true, width: dimensions[0], height: dimensions[1], frames: 240, fps: 16, duration_seconds: 15 };
  for (const [key, value] of Object.entries(expected)) if (validation[key] !== value) errors.push(`${prefix}: ${key} 未通过`);
  if (!native && !forLocalReview && BROWSER_FLAGS.some(key => validation.local_browser?.[key] !== true)) errors.push(`${prefix}: 真实本地播放/跳转/重播未通过`);
  for (const [key, value] of Object.entries({ experiment_id: EXPERIMENT_ID, scene_id: scene.id, method_id: video.id, prompt_sha256: scene.prompt_sha256, checkpoint_sha256: CHECKPOINT_SHA256, source_manifest_sha256: manifest.pipeline?.source_manifest_sha256 })) {
    if (provenance[key] !== value || value == null) errors.push(`${prefix}: ${key} 来源绑定不符`);
  }
  for (const key of ['config_sha256', 'source_manifest_sha256', 'base_manifest_sha256']) if (!hash(provenance[key])) errors.push(`${prefix}: ${key} 缺失`);
  const base = native ? video : scene.native_audit;
  if (base?.status !== 'ready' || provenance.native_sha256 !== base.sha256 || !hash(provenance.native_sha256) || provenance.base_manifest_sha256 !== base.provenance?.base_manifest_sha256 || provenance.base_source_verified !== true) errors.push(`${prefix}: 同场景新 Native Base 来源未完整核实`);
  if (provenance.pathway !== (native ? 'native' : video.id === 'bilinear' ? 'bilinear' : SCIENCE.pathway)) errors.push(`${prefix}: 推理路径不符`);
  if (provenance.method_contract_verified !== true) errors.push(`${prefix}: 实际方法参数校验缺失`);
  if (!native) for (const key of ['global_branch', 'ca_lambda', 'output_lowpass_weights']) if (!same(provenance.method_contract?.[key], METHOD_LABELS[video.id]?.[key])) errors.push(`${prefix}: 实际输出 ${key} 不匹配`);
  if (online) {
    if (!video.online || ['head_ok', 'range_ok', 'full_sha256_verified'].some(key => video.online[key] !== true) || video.online.sha256 !== video.sha256 || !hash(video.online.report_sha256) || !safeMediaUrl(video.online.report_url)) errors.push(`${prefix}: 匿名线上 HTTP/Range/完整 SHA 未验收`);
    if (!native && BROWSER_FLAGS.some(key => video.online?.browser?.[key] !== true)) errors.push(`${prefix}: 真实线上播放/跳转/重播未通过`);
  }
  return errors;
}
function readyVideoErrors(scenes, manifest, requireOnline, forLocalReview) {
  const errors = [];
  const urls = new Set(), hashes = new Set(), baseHashes = new Set();
  for (const scene of scenes) {
    if (scene.native_audit?.status === 'ready') {
      if (baseHashes.has(scene.native_audit.sha256)) errors.push(`${scene.id}: 不同场景不能复用同一 Native 原片`);
      baseHashes.add(scene.native_audit.sha256);
    }
    for (const video of [...(Array.isArray(scene.methods) ? scene.methods : []), scene.native_audit].filter(Boolean)) {
      if (video.status !== 'ready') continue;
      if (urls.has(video.url) || hashes.has(video.sha256)) errors.push(`${scene.id}/${video.id}: 原片重复`);
      urls.add(video.url); hashes.add(video.sha256);
      errors.push(...videoErrors(video, scene, manifest, requireOnline, forLocalReview));
    }
  }
  return errors;
}
export function isLoopbackPartialReview(location) {
  if (!location || !['http:', 'https:'].includes(location.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return false;
  const query = new URLSearchParams(location.search);
  return query.getAll('partial-review').length === 1 && query.get('partial-review') === '1' && !query.has('review');
}
// This separate gate is only for first browser QA of individually verified
// originals. It never returns publish-ready and does not replace the full gate.
export function partialLocalReviewReadiness(manifest, { location } = {}) {
  const errors = manifestShapeErrors(manifest);
  const scenes = Array.isArray(manifest?.scenes) ? manifest.scenes.filter(scene => scene && typeof scene === 'object') : [];
  const videos = scenes.flatMap(scene => [...(Array.isArray(scene.methods) ? scene.methods : []), scene.native_audit].filter(Boolean));
  const counts = { display: videos.filter(video => video.id !== 'native' && isPlayable(video)).length, native: videos.filter(video => video.id === 'native' && isPlayable(video)).length, expected_display: 40, expected_native: 5 };
  if (!isLoopbackPartialReview(location)) errors.push('部分媒体审查仅允许回环 HTTP(S) 地址及唯一显式参数 partial-review=1');
  if (manifest?.publication?.draft_only !== true || manifest?.publication?.local_review_only !== true || manifest?.publication?.mode !== 'full') errors.push('部分审查必须标记 draft_only=true、local_review_only=true，正式发布模式仍为 full');
  if (!counts.display && !counts.native) errors.push('部分审查需要至少一份真实已验收原片');
  if (!hash(manifest?.pipeline?.source_manifest_sha256)) errors.push('本地部分审查缺少冻结源码 SHA');
  for (const scene of scenes) for (const video of [...(Array.isArray(scene.methods) ? scene.methods : []), scene.native_audit].filter(Boolean)) {
    if (video.status !== 'ready') continue;
    if (video.url !== `./review-media/${video.sha256}.mp4` || video.poster !== null) errors.push(`${scene.id}/${video.id}: 部分审查只能使用按原片 SHA 绑定的本机媒体映射`);
    if (video.report?.url !== `./reports/${scene.id}-${video.id}.json`) errors.push(`${scene.id}/${video.id}: 部分审查报告必须使用本机候选报告映射`);
  }
  errors.push(...readyVideoErrors(scenes, manifest, false, true));
  return { ready: false, review_ready: errors.length === 0, phase: 'local_partial_media_review_only', counts, errors };
}
export function publicationReadiness(manifest, { requireOnline = false, forLocalReview = false } = {}) {
  const errors = manifestShapeErrors(manifest);
  const scenes = Array.isArray(manifest?.scenes) ? manifest.scenes.filter(scene => scene && typeof scene === 'object') : [];
  const display = scenes.flatMap(scene => Array.isArray(scene.methods) ? scene.methods : []);
  const natives = scenes.map(scene => scene.native_audit).filter(Boolean);
  const counts = { display: display.filter(isPlayable).length, native: natives.filter(isPlayable).length, expected_display: 40, expected_native: 5 };
  if (requireOnline && forLocalReview) errors.push('本地审查不能替代线上验收');
  if (!forLocalReview && manifest?.publication?.draft_only !== false) errors.push('本地待生成草稿不能发布');
  if (manifest?.publication?.local_review_only === true) errors.push('部分媒体候选仅供本地审查，不能用于正式发布');
  if (manifest?.publication?.mode !== 'full') errors.push('本轮完整发布模式必须为 full');
  if (counts.display !== 40 || counts.native !== 5) errors.push('需全部 40 展示 + 5 Native 验收齐全');
  const pipeline = manifest?.pipeline ?? {};
  for (const key of ['weights_sha_verified', 'cpu_tests_passed', 'native_parity_passed', 'full_resolution_dryrun_passed', 'execution_succeeded', 'summary_verified']) if (pipeline[key] !== true) errors.push(`pipeline.${key}: 未通过`);
  if (!hash(pipeline.source_manifest_sha256) || !hash(pipeline.summary_sha256) || !safeMediaUrl(pipeline.summary_url)) errors.push('冻结源码或最终总结证据缺失');
  errors.push(...readyVideoErrors(scenes, manifest, requireOnline, forLocalReview));
  return { ready: !forLocalReview && errors.length === 0, ...(forLocalReview ? { review_ready: errors.length === 0 } : {}), phase: forLocalReview ? 'local_media_review_only' : requireOnline ? 'final_online' : 'prepublish', counts, errors };
}

export function partialPublicMetadataErrors(value, at = 'manifest') {
  const errors = publicMetadataErrors(value, at);
  function visit(entry, path) {
    if (typeof entry === 'string' && /(?:(?:^|[\s"'(<])[a-z]:[\\/]|file:\/\/|(?:^|[\s/])root@|gpuhome\.cc|seetacloud\.com)/i.test(entry)) errors.push(`${path}: 私有磁盘、服务器或账户信息`);
    if (entry && typeof entry === 'object') for (const [key, child] of Object.entries(entry)) {
      if (/^(?:storage_file|logical_file|local_directory|remote_output|gpu_uuid|gpu_uuids|username|account|storage_registry)$/i.test(key)) errors.push(`${path}.${key}: 私有存储或账户字段`);
      visit(child, `${path}.${key}`);
    }
  }
  visit(value, at);
  return errors;
}

// Explicitly authorized partial publication. The original full gate above stays
// unchanged; this gate never claims whole-experiment completion or shutdown.
export function partialPublicationReadiness(manifest, { requireOnline = false } = {}) {
  const errors = manifestShapeErrors(manifest);
  const scenes = Array.isArray(manifest?.scenes) ? manifest.scenes.filter(scene => scene && typeof scene === 'object') : [];
  const counts = {
    display: scenes.flatMap(scene => Array.isArray(scene.methods) ? scene.methods : []).filter(isPlayable).length,
    native: scenes.map(scene => scene.native_audit).filter(isPlayable).length,
    expected_display: 40, expected_native: 5,
  };
  const publication = manifest?.publication ?? {}, pipeline = manifest?.pipeline ?? {};
  if (publication.mode !== 'partial' || publication.draft_only !== false || publication.local_review_only !== false) errors.push('部分发布必须明确 mode=partial、draft_only=false、local_review_only=false');
  if (publication.path !== 'halo-eight-15s-20261103/') errors.push('部分发布路径与本轮实验不符');
  for (const key of ['whole_experiment_complete', 'shutdown_allowed']) if (publication[key] !== false) errors.push(`publication.${key}: 部分发布不得声明完成或允许关机`);
  if (publication.online_verified !== undefined && publication.online_verified !== false) errors.push('线上验收只能从每份真实 online 证据核验，不能由全局标记声明');
  if (typeof publication.updated_utc !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(publication.updated_utc) || !Number.isFinite(Date.parse(publication.updated_utc))) errors.push('部分发布需要带时区的真实更新时间');
  if (!publication.partial_summary || !safeMediaUrl(publication.partial_summary.url) || !hash(publication.partial_summary.sha256)) errors.push('部分发布汇总报告及 SHA 缺失');
  if (!counts.display) errors.push('部分发布至少需要一份已通过本地浏览器验收的展示原片');
  for (const key of ['weights_sha_verified', 'cpu_tests_passed', 'native_parity_passed', 'full_resolution_dryrun_passed']) if (pipeline[key] !== true) errors.push(`pipeline.${key}: 真实前置门槛未通过`);
  if (!hash(pipeline.source_manifest_sha256)) errors.push('部分发布缺少冻结源码 SHA');
  if (pipeline.execution_succeeded !== false || pipeline.summary_verified !== false || pipeline.summary_url !== null || pipeline.summary_sha256 !== null) errors.push('部分发布不得把执行完成或最终汇总门槛标为通过；使用独立 partial_summary');
  for (const scene of scenes) for (const video of [...(Array.isArray(scene.methods) ? scene.methods : []), scene.native_audit].filter(Boolean)) {
    if (video.status !== 'ready' || !safeMediaUrl(video.url)) continue;
    const url = new URL(video.url, 'https://relative-site.invalid/');
    if (url.protocol !== 'https:' || /^(?:localhost|127(?:\.[0-9]+){3}|\[::1\])$/i.test(url.hostname) || /(?:^|\/)review-media\//.test(url.pathname)) errors.push(`${scene.id}/${video.id}: 部分公开结果不能使用本机审查地址或非 HTTPS 地址`);
  }
  errors.push(...partialPublicMetadataErrors(manifest));
  errors.push(...readyVideoErrors(scenes, manifest, requireOnline, false));
  return {
    ready: false, partial_ready: errors.length === 0,
    online_verified: requireOnline && errors.length === 0,
    whole_experiment_complete: false, shutdown_allowed: false,
    phase: requireOnline ? 'partial_online' : 'partial_prepublish', counts, errors,
  };
}
