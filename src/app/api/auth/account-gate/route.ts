import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { getWifeUserRestrictionLive } from '../../security/wifeUserStatus.ts';
import {
    ACCOUNT_FROZEN_CODE,
    FORUM_BANNED_CODE,
    accountFrozenUserMessage,
    accountLoginDeniedPayload,
    forumBannedUserMessage,
} from '../../security/accountRestrictionCopy.ts';
import { isPlatformAdminUserId } from '../../security/roleResolver.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';

export const runtime = 'nodejs';

function formatUntil(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch {
        return date.toLocaleString('ar');
    }
}

/**
 * حالة الشبكة للحساب الحيّ — لا تمر عبر بوابة المنتدى حتى يراها المجمَّد.
 * GET /api/auth/account-gate
 */
export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request, { allowLoginLocked: true }));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;

        if (await isPlatformAdminUserId(userId)) {
            return wifeJsonResponse(200, {
                ok: true,
                frozen: false,
                forumBanned: false,
                freezeUntil: null,
                code: null,
                message: null,
            });
        }

        const restriction = await getWifeUserRestrictionLive(userId);
        if (!restriction.loginAllowed) {
            const denied = accountLoginDeniedPayload(restriction);
            return wifeJsonResponse(200, {
                ok: true,
                frozen: restriction.frozen,
                forumBanned: false,
                freezeUntil: restriction.freezeUntil,
                loginAllowed: false,
                code: denied.code,
                message: denied.error,
            });
        }
        if (restriction.frozen) {
            const until = formatUntil(restriction.freezeUntil);
            return wifeJsonResponse(200, {
                ok: true,
                frozen: true,
                forumBanned: false,
                freezeUntil: restriction.freezeUntil,
                code: ACCOUNT_FROZEN_CODE,
                message: accountFrozenUserMessage(until || undefined),
            });
        }

        const forumBanned = Boolean(await ForumRepository.isBanned(userId));
        return wifeJsonResponse(200, {
            ok: true,
            frozen: false,
            forumBanned,
            freezeUntil: null,
            code: forumBanned ? FORUM_BANNED_CODE : null,
            message: forumBanned ? forumBannedUserMessage() : null,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal account gate error' });
    }
}
