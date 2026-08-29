import { requireWifeCloudWrite, requireWifeUser, unwrapWifeUser } from '../security/bffAuth.ts';
import { sanitizePayload } from '../security/sanitizer.ts';
import { CaseShareRepository } from '../../services/caseShare/caseShareRepository.ts';
import { assertRecipientInNetwork } from '../../services/caseShare/caseShareNetworkGuard.ts';
import {
    assertShareSourceOwnedByUser,
    isServerShareCreateAllowed,
    ShareSourceOwnershipError,
} from '../../services/caseShare/caseShareDossierOwnership.ts';
import type { CaseShareVisibleFields, DossierShareSource } from '../../services/caseShare/caseShareTypes.ts';
import { DEFAULT_CASE_SHARE_VISIBLE_FIELDS } from '../../services/caseShare/caseShareTypes.ts';
import { clampCaseShareSessionMinutes } from '../../services/caseShare/caseShareSession.ts';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object';
}

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

async function auth(request: Request, write = false): Promise<{ userId: string } | Response> {
    const unwrapped = unwrapWifeUser(
        await (write ? requireWifeCloudWrite(request) : requireWifeUser(request)),
    );
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}

export async function GET(request: Request): Promise<Response> {
    try {
        const authResult = await auth(request);
        if (authResult instanceof Response) return authResult;
        const shares = await CaseShareRepository.listForUser(authResult.userId, { summary: true });
        return json(200, { ok: true, shares });
    } catch {
        return json(500, { ok: false, error: 'Internal server error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const authResult = await auth(request, true);
        if (authResult instanceof Response) return authResult;
        const { userId } = authResult;

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return json(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'create') {
            if (typeof payload.recipientId !== 'string' || !payload.recipientId.trim()) {
                return json(400, { ok: false, error: 'recipientId مطلوب' });
            }
            const source = payload.source as DossierShareSource | undefined;
            if (!source?.dossierId || !source.module) {
                return json(400, { ok: false, error: 'source غير صالح' });
            }
            const visibleFields = {
                ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS,
                ...(payload.visibleFields as CaseShareVisibleFields | undefined),
            };
            const ownerName =
                typeof payload.ownerName === 'string' && payload.ownerName.trim()
                    ? payload.ownerName.trim()
                    : 'محامٍ';
            const recipientName =
                typeof payload.recipientName === 'string' && payload.recipientName.trim()
                    ? payload.recipientName.trim()
                    : 'محامٍ';
            if (payload.recipientId === userId) {
                return json(400, { ok: false, error: 'لا يمكن إرسال الإضبارة لنفسك' });
            }
            const inNetwork = await assertRecipientInNetwork(userId, payload.recipientId);
            if (!inNetwork) {
                return json(403, { ok: false, error: 'المستلم ليس ضمن شبكة المتابعة' });
            }
            // criminal: يتطلب صفاً في criminal_case_ownership (register قبل create)
            if (!isServerShareCreateAllowed(source)) {
                return json(403, {
                    ok: false,
                    error: 'وحدة الإضبارة غير مدعومة للمشاركة من الخادم',
                });
            }
            try {
                await assertShareSourceOwnedByUser(userId, source);
            } catch (err) {
                if (err instanceof ShareSourceOwnershipError) {
                    return json(403, { ok: false, error: 'الإضبارة غير مملوكة لك أو غير موجودة' });
                }
                throw err;
            }
            const share = await CaseShareRepository.createShare({
                ownerId: userId,
                ownerName,
                recipientId: payload.recipientId,
                recipientName,
                source,
                visibleFields,
                sessionDurationMinutes:
                    typeof payload.sessionDurationMinutes === 'number'
                        ? clampCaseShareSessionMinutes(payload.sessionDurationMinutes)
                        : undefined,
            });
            return json(200, { ok: true, share });
        }

        if (payload.action === 'accept' || payload.action === 'decline') {
            if (typeof payload.shareId !== 'string' || !payload.shareId.trim()) {
                return json(400, { ok: false, error: 'shareId مطلوب' });
            }
            const updated = await CaseShareRepository.updateStatus(
                payload.shareId,
                userId,
                payload.action === 'accept' ? 'accepted' : 'declined',
            );
            if (!updated) return json(404, { ok: false, error: 'الطلب غير موجود' });
            return json(200, { ok: true, share: updated });
        }

        if (payload.action === 'end') {
            if (typeof payload.shareId !== 'string' || !payload.shareId.trim()) {
                return json(400, { ok: false, error: 'shareId مطلوب' });
            }
            const updated = await CaseShareRepository.endSession(payload.shareId, userId);
            if (!updated) return json(404, { ok: false, error: 'الجلسة غير نشطة أو غير موجودة' });
            return json(200, { ok: true, share: updated });
        }

        return json(400, { ok: false, error: 'إجراء غير معروف' });
    } catch {
        return json(500, { ok: false, error: 'Internal server error' });
    }
}
