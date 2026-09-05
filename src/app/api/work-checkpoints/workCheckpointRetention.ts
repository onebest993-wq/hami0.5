/**
 * احتفاظ نقاط العمل: أحدث N صفوف + أحدث صف معلَّم keep_anchor.
 * الخادم أعمى عن المحتوى؛ العلم يأتي من العميل خارج ciphertext.
 */
export const WORK_CHECKPOINT_KEEP_LATEST = 3;

export type WorkCheckpointRetentionRow = {
    id: string;
    keep_anchor?: boolean | null;
};

export type WorkCheckpointReadRow = {
    id: string;
    encrypted_data: unknown;
    data_signature: unknown;
    created_at: unknown;
};

export function idsToDropWorkCheckpoints(
    rowsNewestFirst: WorkCheckpointRetentionRow[],
    keepLatest: number = WORK_CHECKPOINT_KEEP_LATEST,
): string[] {
    const keep = new Set<string>();
    for (const row of rowsNewestFirst.slice(0, Math.max(0, keepLatest))) {
        if (typeof row.id === 'string' && row.id) keep.add(row.id);
    }
    const anchor = rowsNewestFirst.find((row) => row.keep_anchor === true);
    if (anchor && typeof anchor.id === 'string' && anchor.id) keep.add(anchor.id);
    return rowsNewestFirst
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && !keep.has(id));
}

export function mergeWorkCheckpointReads(
    latest: WorkCheckpointReadRow[],
    anchor: WorkCheckpointReadRow | null,
): WorkCheckpointReadRow[] {
    const byId = new Map<string, WorkCheckpointReadRow>();
    for (const row of latest) {
        if (row.id) byId.set(row.id, row);
    }
    if (anchor?.id) byId.set(anchor.id, anchor);
    return [...byId.values()].sort((a, b) => {
        const left = String(a.created_at ?? '');
        const right = String(b.created_at ?? '');
        return left < right ? 1 : left > right ? -1 : 0;
    });
}

export function toPublicWorkCheckpoint(row: WorkCheckpointReadRow): {
    encrypted_data: unknown;
    data_signature: unknown;
    created_at: unknown;
} {
    return {
        encrypted_data: row.encrypted_data,
        data_signature: row.data_signature,
        created_at: row.created_at,
    };
}
