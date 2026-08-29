import { getSupabaseAdminClient } from './supabaseAdminClient.ts';

const ACTION_MAX = 96;

/**
 * سجل تدقيق من الخادم فقط — لا يعتمد على /api/audit/log من المتصفح.
 * فشل الكتابة لا يوقف عملية المقر، لكن يُعاد صراحة حتى لا يُبتلع.
 */
export async function recordHeadquartersAudit(input: {
    actorId: string;
    action: string;
    targetId?: string;
    details?: Record<string, unknown>;
}): Promise<boolean> {
    const actorId = String(input.actorId ?? '').trim();
    const action = String(input.action ?? '').trim().slice(0, ACTION_MAX);
    if (!actorId || !action) return false;
    try {
        const admin = getSupabaseAdminClient();
        if (!admin) {
            console.error('[hq-audit] admin client missing');
            return false;
        }
        const details: Record<string, unknown> = {
            targetId: input.targetId ?? null,
        };
        if (input.details) {
            for (const [key, value] of Object.entries(input.details).slice(0, 8)) {
                const clippedKey = key.slice(0, 48);
                if (typeof value === 'string') details[clippedKey] = value.slice(0, 240);
                else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
                    details[clippedKey] = value;
                }
            }
        }
        const { error } = await admin.from('audit_logs').insert({
            user_id: actorId,
            action: `hq:${action}`,
            details,
        });
        if (error) {
            const code = typeof error.code === 'string' ? error.code : '';
            console.error('[hq-audit] insert failed', code);
            return false;
        }
        return true;
    } catch {
        console.error('[hq-audit] insert threw');
        return false;
    }
}
