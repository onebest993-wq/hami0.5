/**
 * يتحقق أن تغييرات upvoterIds في sync مقتصرة على toggle معرّف المصوّت الحالي فقط.
 */
export function computeAllowedUpvoterIds(
    existingIds: string[],
    clientIds: string[] | undefined,
    voterId: string,
): { ok: true; upvoterIds: string[]; changed: boolean } | { ok: false; error: string } {
    const existing = [...new Set(existingIds)];
    const client = clientIds ?? existing;
    const existingSet = new Set(existing);
    const clientSet = new Set(client);

    const added = [...clientSet].filter((id) => !existingSet.has(id));
    const removed = [...existingSet].filter((id) => !clientSet.has(id));
    const changed = added.length > 0 || removed.length > 0;

    if (!changed) {
        return { ok: true, upvoterIds: existing, changed: false };
    }

    const mutations = [...added, ...removed];
    if (mutations.length !== 1 || mutations[0] !== voterId) {
        return { ok: false, error: 'غير مصرح بتعديل التصويتات' };
    }

    const next = new Set(existingSet);
    if (next.has(voterId)) next.delete(voterId);
    else next.add(voterId);

    return { ok: true, upvoterIds: [...next], changed: true };
}

export function resolveSyncBestCommentId(
    existingBest: string | null | undefined,
    clientBest: string | null | undefined,
    isOwner: boolean,
    isAdmin: boolean,
): { ok: true; bestCommentId: string | null; changed: boolean } | { ok: false; error: string } {
    const next = clientBest ?? null;
    const prev = existingBest ?? null;
    if (next === prev) {
        return { ok: true, bestCommentId: prev, changed: false };
    }
    if (!isOwner && !isAdmin) {
        return { ok: false, error: 'فقط صاحب المنشور يحدد أفضل إجابة' };
    }
    return { ok: true, bestCommentId: next, changed: true };
}
