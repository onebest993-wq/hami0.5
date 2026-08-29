import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonNoStore, wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { emptyHeadquartersStatus } from '../../security/headquartersStatus.ts';
import { loadHeadquartersStatusCached } from '../../security/headquartersStatusCache.ts';
import {
    hqMailerChannel,
    isAdminMailerConfigured,
    maskAdminMailbox,
    resolveAdminMasterEmail,
} from '../../security/adminMailer.ts';

export const runtime = 'nodejs';

function mailPayload() {
    return {
        configured: isAdminMailerConfigured(),
        channel: hqMailerChannel(),
        mailboxMasked: maskAdminMailbox(resolveAdminMasterEmail()),
    };
}

function wantsFreshStatus(request: Request): boolean {
    try {
        return new URL(request.url).searchParams.get('fresh') === '1';
    } catch {
        return false;
    }
}

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-status:${gate.userId}`, {
            maxRequests: 30,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonNoStore(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonNoStore(200, {
                ok: true,
                ...emptyHeadquartersStatus('down'),
                mail: mailPayload(),
            });
        }

        const status = await loadHeadquartersStatusCached(admin, { fresh: wantsFreshStatus(request) });
        return wifeJsonNoStore(200, {
            ok: true,
            ...status,
            mail: mailPayload(),
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin status error' });
    }
}
