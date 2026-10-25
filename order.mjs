// Stored preferences are untrusted and may come from an older set of videos.
export function normalizeOrder(saved, available) {
  const allowed = new Set(available), seen = new Set(), result = [];
  for (const id of [...(Array.isArray(saved) ? saved : []), ...available]) {
    if (allowed.has(id) && !seen.has(id)) { result.push(id); seen.add(id); }
  }
  return result;
}

export function moveItem(ids, id, targetIndex) {
  const next = [...ids], source = next.indexOf(id);
  if (source < 0 || !Number.isInteger(targetIndex)) return next;
  const target = Math.max(0, Math.min(next.length - 1, targetIndex));
  next.splice(source, 1);
  next.splice(target, 0, id);
  return next;
}
