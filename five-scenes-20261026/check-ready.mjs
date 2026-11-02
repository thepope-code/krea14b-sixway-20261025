import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { publicationReadiness } from './core.mjs';
const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
const argumentsList = process.argv.slice(2);
if (argumentsList.some(argument => argument !== '--allow-partial')) throw new Error('Only --allow-partial is supported.');
const result = publicationReadiness(manifest, { allowPartial: argumentsList.includes('--allow-partial') });
if (manifest.publication?.draft_only === true) result.errors.push('本地草稿不能发布；必须接入真实新增验收媒体并完成播放验证后解除草稿标记。');
for (const scene of manifest.scenes ?? []) {
  const expected = createHash('sha256').update(`${scene.prompt}\n`, 'utf8').digest('hex');
  if (expected !== scene.prompt_sha256) result.errors.push(`${scene.id}: prompt+LF SHA 不匹配`);
}
result.ready = result.errors.length === 0;
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ready ? 0 : 1;
