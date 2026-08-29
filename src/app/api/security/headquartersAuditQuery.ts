const ACTION_LIKE = 'hq:%';
const LIST_CAP = 80;
const DETAIL_KEY_MAX = 48;
const DETAIL_VALUE_MAX = 240;
const BLOCKED_DETAIL = /password|secret|token|otp|code|hash|pepper|cookie|fingerprint/i;

export type HeadquartersAuditRow = {
    id: string;
    action: string;
    actorId: string;
    targetId: string | null;
    createdAt: string;
    details: Record<string, string | number | boolean | null>;
};

function sanitizeDetails(raw: unknown): Record<string, string | number | boolean | null> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(raw).slice(0, 8)) {
        const clippedKey = key.slice(0, DETAIL_KEY_MAX);
        if (!clippedKey || BLOCKED_DETAIL.test(clippedKey)) continue;
        if (typeof value === 'string') {
            if (BLOCKED_DETAIL.test(value)) continue;
            out[clippedKey] = value.slice(0, DETAIL_VALUE_MAX);
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            out[clippedKey] = value;
        }
    }
    return out;
}

export async function listHeadquartersAudit(
    admin: {
        from: (table: string) => {
            select: (cols: string) => {
                like: (col: string, pattern: string) => {
                    order: (
                        col: string,
                        opts: { ascending: boolean },
                    ) => { limit: (n: number) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };
                };
            };
        };
    },
): Promise<HeadquartersAuditRow[]> {
    const { data, error } = await admin
        .from('audit_logs')
        .select('id, user_id, action, details, created_at')
        .like('action', ACTION_LIKE)
        .order('created_at', { ascending: false })
        .limit(LIST_CAP);
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        throw new Error(detail || 'Failed to list headquarters audit');
    }
    const rows: HeadquartersAuditRow[] = [];
    for (const raw of Array.isArray(data) ? data : []) {
        const rec = raw as {
            id?: unknown;
            user_id?: unknown;
            action?: unknown;
            details?: unknown;
            created_at?: unknown;
        };
        const id = String(rec.id ?? '').trim();
        const action = String(rec.action ?? '').trim();
        if (!id || !action.startsWith('hq:')) continue;
        const details = sanitizeDetails(rec.details);
        const targetRaw = details.targetId;
        rows.push({
            id,
            action,
            actorId: String(rec.user_id ?? '').trim(),
            targetId: typeof targetRaw === 'string' && targetRaw.trim() ? targetRaw.trim() : null,
            createdAt: String(rec.created_at ?? ''),
            details,
        });
    }
    return rows;
}
