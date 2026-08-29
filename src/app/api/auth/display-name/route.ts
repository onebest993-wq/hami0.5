import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { correctDisplayNameOnce, readDisplayNamePolicy } from '../../security/displayNameCorrection.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { kvGet } from '../../security/kvStoreAdmin.ts';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';

export const runtime = 'nodejs';

function parseNameBody(raw: unknown): string {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
    const rec = raw as Record<string, unknown>;
    return String(rec.fullName ?? rec.name ?? '');
}

export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;
        const allowed = await consumeRateLimitSlot(`display-name-get:${userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
        }
        const policy = await readDisplayNamePolicy(userId);
        if (!policy) {
            return wifeJsonResponse(503, { ok: false, error: 'تعذّر قراءة الاسم' });
        }
        return wifeJsonResponse(200, { ok: true, ...policy });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'تعذّر قراءة الاسم' });
    }
}

export async function PATCH(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;
        const allowed = await consumeRateLimitSlot(`display-name-patch:${userId}`, {
            maxRequests: 8,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
        }
        const body = await request.json().catch(() => null);
        const result = await correctDisplayNameOnce(userId, parseNameBody(body));
        if (!result.ok) {
            return wifeJsonResponse(result.status, { ok: false, error: result.error });
        }
        let kycName = '';
        try {
            const raw = await kvGet(`lawyer-verification:${userId}`);
            if (raw && typeof raw === 'object') {
                kycName = String((raw as { fullName?: unknown }).fullName ?? '').trim();
            }
        } catch {
            kycName = '';
        }
        const from = String(result.policy.previousFullName ?? '').trim();
        const to = result.policy.fullName;
        const details: Record<string, string> = {};
        if (from) details.from = from;
        if (to) details.to = to;
        if (hqLiveNameDivergesFromKyc(to, kycName)) details.kycName = kycName.slice(0, 80);
        await recordHeadquartersAudit({
            actorId: userId,
            action: 'user.display_name_correct',
            targetId: userId,
            details,
        });
        return wifeJsonResponse(200, { ok: true, ...result.policy });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'تعذّر حفظ الاسم' });
    }
}
