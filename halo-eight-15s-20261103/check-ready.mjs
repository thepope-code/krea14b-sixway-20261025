// Read-only release gate. No network, model invocation, writes, or publication.
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { EXPERIMENT_ID, manifestShapeErrors, publicationReadiness, publicMetadataErrors } from './core.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i++) {
  if (['--online', '--draft', '--review'].includes(args[i])) options[args[i].slice(2)] = true;
  else if (args[i] === '--local-media' && args[i + 1]) options.localMedia = args[++i];
  else throw new Error('Usage: node check-ready.mjs [--draft | --local-media PRIVATE_RECEIPT.json [--online | --review]]');
}
if (options.draft && (options.online || options.localMedia || options.review)) throw new Error('--draft cannot be combined with release checks.');
if (options.online && options.review) throw new Error('--review cannot substitute for --online.');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const result = options.draft
  ? { ready: false, draft_valid: false, phase: 'draft_structure_only', counts: { display: 40, native: 5 }, errors: manifestShapeErrors(manifest) }
  : publicationReadiness(manifest, { requireOnline: !!options.online, forLocalReview: !!options.review });
for (const scene of manifest.scenes ?? []) {
  const expected = createHash('sha256').update(`${scene.prompt}\n`, 'utf8').digest('hex');
  if (expected !== scene.prompt_sha256) result.errors.push(`${scene.id}: prompt+LF SHA 不匹配`);
}
if (options.draft) {
  if (manifest.publication?.draft_only !== true || manifest.scenes.some(s => [...s.methods, s.native_audit].some(v => v.status !== 'pending'))) result.errors.push('草稿检查要求全部 pending，draft_only=true');
  result.draft_valid = result.errors.length === 0;
} else if (!options.localMedia) result.errors.push('发布检查需 --local-media 指向真实本地原片清单；清单不可放入公开站点。');
else {
  const receiptPath = resolve(options.localMedia);
  if (!relative(root, receiptPath).startsWith('..')) result.errors.push('包含本机路径的 local-media 清单不能位于公开 site 目录内');
  const local = JSON.parse(await readFile(receiptPath, 'utf8'));
  if (local.experiment_id !== EXPERIMENT_ID || local.schema_version !== 1 || !Array.isArray(local.files)) result.errors.push('本地原片清单格式/实验不符');
  const files = local.files ?? [];
  if (files.length !== 45 || new Set(files.map(f => f.sha256)).size !== 45) result.errors.push('本地原片清单必须含45个不同 SHA');
  async function shaFile(path) {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(path)) digest.update(chunk);
    return digest.digest('hex');
  }
  async function report(url, sha, label) {
    if (typeof url !== 'string' || /^[a-z]+:/i.test(url) || url.startsWith('/')) throw new Error(`${label}: 报告必须是 site 内相对路径`);
    const path = resolve(root, url), rel = relative(root, path);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${label}: 报告路径越界`);
    const bytes = await readFile(path);
    if (createHash('sha256').update(bytes).digest('hex') !== sha) throw new Error(`${label}: 报告 SHA 不符`);
    const data = JSON.parse(bytes.toString('utf8'));
    result.errors.push(...publicMetadataErrors(data, label));
    return data;
  }
  for (const scene of manifest.scenes ?? []) for (const video of [...scene.methods, scene.native_audit]) {
    if (video.status !== 'ready') continue;
    const label = `${scene.id}/${video.id}`;
    try {
      const matches = files.filter(file => file.sha256 === video.sha256);
      if (matches.length !== 1 || typeof matches[0].path !== 'string' || !isAbsolute(matches[0].path)) throw new Error(`${label}: 本地原片唯一绝对路径缺失`);
      const file = matches[0];
      if ((await stat(file.path)).size !== video.bytes || file.bytes !== video.bytes || await shaFile(file.path) !== video.sha256) throw new Error(`${label}: 原片实际字节/SHA不符`);
      const data = await report(video.report.url, video.report.sha256, label);
      for (const [key, value] of Object.entries({ experiment_id: EXPERIMENT_ID, scene_id: scene.id, method_id: video.id, sha256: video.sha256, bytes: video.bytes, validation: video.validation, provenance: video.provenance })) {
        if (!isDeepStrictEqual(data[key], value)) result.errors.push(`${label}: 报告与清单的 ${key} 不匹配`);
      }
      if (options.online) {
        const data = await report(video.online.report_url, video.online.report_sha256, `${label}/online`);
        for (const [key, value] of Object.entries({ experiment_id: EXPERIMENT_ID, scene_id: scene.id, method_id: video.id, sha256: video.sha256, url: video.url, head_ok: true, range_ok: true, full_sha256_verified: true })) if (data[key] !== value) result.errors.push(`${label}: 线上报告 ${key} 不匹配`);
        if (video.id !== 'native' && !isDeepStrictEqual(data.browser, video.online.browser)) result.errors.push(`${label}: 线上浏览器报告不匹配`);
      }
    } catch (error) { result.errors.push(error.code ? `${label}: 本地文件读取失败 (${error.code})` : error.message); }
  }
  try {
    const summary = await report(manifest.pipeline.summary_url, manifest.pipeline.summary_sha256, 'pipeline');
    for (const [key, value] of Object.entries({ experiment_id: EXPERIMENT_ID, display_verified: 40, native_verified: 5, source_manifest_sha256: manifest.pipeline.source_manifest_sha256, weights_sha_verified: true, cpu_tests_passed: true, native_parity_passed: true, full_resolution_dryrun_passed: true, execution_succeeded: true })) if (summary[key] !== value) result.errors.push(`pipeline: 总结中的 ${key} 不匹配`);
  } catch (error) { result.errors.push(error.code ? `pipeline: 总结读取失败 (${error.code})` : error.message); }
}
if (!options.draft) {
  result.ready = !options.review && result.errors.length === 0;
  if (options.review) result.review_ready = result.errors.length === 0;
}
console.log(JSON.stringify(result, null, 2));
process.exitCode = (options.draft ? result.draft_valid : options.review ? result.review_ready : result.ready) ? 0 : 1;
