/**
 * طلبات توثيق المحامين في KV — طابور اعتماد الإدارة.
 */
import { kvGet, kvReadHqVerificationQueueByPrefix, kvSet } from '../../security/kvStoreAdmin.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { wifeJsonNoStore, wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import { isHeadquartersProtectedAdminId } from '../../security/headquartersUserMap.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { attachHqQueueLiveNames } from '../../security/headquartersQueueLiveNames.ts';
import { notifyHeadquartersVerificationStatus } from '../../security/headquartersAccountNotify.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';
import { compactIdentityPreviewForKv } from '../../../services/auth/identityImageDataUrl.ts';
import {
    asHqVerificationFlag,
    clipHqVerificationField,
    isHqVerificationQueueStatus,
    toHqDossierRecord,
    toHqQueueRecord,
    toHqSelfStatusRecord,
} from './hqVerificationQueueRecord.ts';

export const runtime = 'nodejs';

const KEY_PREFIX = 'lawyer-verification:';

export type ServerLawyerVerificationRecord = {
    userId: string;
    status: 'pending' | 'active' | 'rejected';
    submittedAt: string;
    updatedAt: string;
    rejectionReason?: string;
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    faceAssistOptedIn: boolean;
    hasIdFront: boolean;
    hasIdBack: boolean;
    hasFaceSelfie: boolean;
    idFrontPreview?: string | null;
    idBackPreview?: string | null;
    faceSelfiePreview?: string | null;
    ocrNameMatch: null;
};

function keyFor(userId: string): string {
    return `${KEY_PREFIX}${userId}`;
}

function isLawyerVerificationStatus(
    value: unknown,
): value is ServerLawyerVerificationRecord['status'] {
    return isHqVerificationQueueStatus(value);
}

function asRecord(value: unknown): ServerLawyerVerificationRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const v = value as Record<string, unknown>;
    const userId = clipHqVerificationField(v.userId, 64);
    if (!userId || !isLawyerVerificationStatus(v.status)) return null;
    const frontPreview = compactIdentityPreviewForKv(
        typeof v.idFrontPreview === 'string' ? v.idFrontPreview : null,
    );
    const backPreview = compactIdentityPreviewForKv(
        typeof v.idBackPreview === 'string' ? v.idBackPreview : null,
    );
    const facePreview = compactIdentityPreviewForKv(
        typeof v.faceSelfiePreview === 'string' ? v.faceSelfiePreview : null,
    );
    const rejectionReason = clipHqVerificationField(v.rejectionReason, 240);
    return {
        userId,
        status: v.status,
        submittedAt: clipHqVerificationField(v.submittedAt, 40),
        updatedAt: clipHqVerificationField(v.updatedAt, 40),
        rejectionReason: rejectionReason || undefined,
        email: clipHqVerificationField(v.email, 120),
        fullName: clipHqVerificationField(v.fullName, 80),
        familyName: clipHqVerificationField(v.familyName, 80),
        phone: clipHqVerificationField(v.phone, 24),
        governorate: clipHqVerificationField(v.governorate, 80),
        lawyerBarRoom: clipHqVerificationField(v.lawyerBarRoom, 80),
        faceAssistOptedIn: asHqVerificationFlag(v.faceAssistOptedIn),
        hasIdFront: asHqVerificationFlag(v.hasIdFront) || Boolean(frontPreview),
        hasIdBack: asHqVerificationFlag(v.hasIdBack) || Boolean(backPreview),
        hasFaceSelfie: asHqVerificationFlag(v.hasFaceSelfie) || Boolean(facePreview),
        idFrontPreview: frontPreview,
        idBackPreview: backPreview,
        faceSelfiePreview: facePreview,
        ocrNameMatch: null,
    };
}

function previewRaw(
    bodyValue: unknown,
    existingValue: string | null | undefined,
): string {
    if (typeof bodyValue === 'string') return bodyValue;
    if (typeof existingValue === 'string') return existingValue;
    return '';
}

/** POST — رفع/تحديث طلب التوثيق من المحامي بعد التسجيل */
export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;

        let body: Record<string, unknown> = {};
        try {
            const raw: unknown = await request.json();
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                body = raw as Record<string, unknown>;
            }
        } catch {
            return wifeJsonResponse(400, { ok: false, error: 'invalid json' });
        }

        const now = new Date().toISOString();
        const existing = asRecord(await kvGet(keyFor(userId)));

        /** اعتماد المقر لا يُخفض بإعادة إرسال من العميل */
        if (existing?.status === 'active') {
            return wifeJsonResponse(409, {
                ok: false,
                error: 'حسابك معتمد مسبقاً — لا حاجة لإعادة رفع طلب التوثيق',
                code: 'VERIFICATION_ALREADY_ACTIVE',
            });
        }

        const front = compactIdentityPreviewForKv(previewRaw(body.idFrontPreview, existing?.idFrontPreview));
        const back = compactIdentityPreviewForKv(previewRaw(body.idBackPreview, existing?.idBackPreview));
        if (!front || !back) {
            return wifeJsonResponse(400, {
                ok: false,
                error: 'صورتا وجه وظهر هوية النقابة مطلوبتان لإكمال طلب التوثيق',
                code: 'ID_FRONT_REQUIRED',
            });
        }

        const face = compactIdentityPreviewForKv(previewRaw(body.faceSelfiePreview, existing?.faceSelfiePreview));
        const record: ServerLawyerVerificationRecord = {
            userId,
            status: 'pending',
            submittedAt: existing?.submittedAt || now,
            updatedAt: now,
            email: clipHqVerificationField(body.email ?? existing?.email, 120),
            fullName: clipHqVerificationField(body.fullName ?? existing?.fullName, 80),
            familyName: clipHqVerificationField(body.familyName ?? existing?.familyName, 80),
            phone: clipHqVerificationField(body.phone ?? existing?.phone, 24),
            governorate: clipHqVerificationField(body.governorate ?? existing?.governorate, 80),
            lawyerBarRoom: clipHqVerificationField(body.lawyerBarRoom ?? existing?.lawyerBarRoom, 80),
            faceAssistOptedIn: asHqVerificationFlag(body.faceAssistOptedIn),
            hasIdFront: true,
            hasIdBack: true,
            hasFaceSelfie: Boolean(face),
            idFrontPreview: front,
            idBackPreview: back,
            faceSelfiePreview: face,
            ocrNameMatch: null,
        };

        await kvSet(keyFor(userId), record);

        try {
            const admin = getSupabaseAdminClient();
            if (admin) {
                await getGoTrueAdminApi(admin).updateUserById(userId, {
                    app_metadata: { verification_status: 'pending' },
                    user_metadata: {
                        fullName: record.fullName,
                        familyName: record.familyName,
                        phone: record.phone,
                        governorate: record.governorate,
                        lawyerBarRoom: record.lawyerBarRoom,
                        verificationStatus: 'pending',
                    },
                });
            }
        } catch {
            /* أفضل جهد — الإضبارة في KV هي المصدر للمقر */
        }

        return wifeJsonResponse(200, { ok: true, status: 'pending' });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'verification submit failed' });
    }
}

/** GET — قائمة الطلبات (إدارة + جهاز موثّق) أو حالة الحساب الحالي */
export async function GET(request: Request): Promise<Response> {
    try {
        const url = new URL(request.url);
        const scope = url.searchParams.get('scope') ?? 'self';

        if (scope === 'pending' || scope === 'all' || scope === 'dossier') {
            const gate = await requireTrustedHeadquartersAdmin(request);
            if (!gate.ok) return gate.response;
            if (scope === 'dossier') {
                const targetId = String(url.searchParams.get('userId') ?? '').trim();
                if (!isPostgresUuidSubject(targetId)) {
                    return wifeJsonNoStore(400, { ok: false, error: 'userId required' });
                }
                const record = asRecord(await kvGet(keyFor(targetId)));
                return wifeJsonNoStore(200, { ok: true, record: record ? toHqDossierRecord(record) : null });
            }
            try {
                const { seedMissingPendingLawyerVerifications } = await import(
                    './ensurePendingLawyerVerificationKv.ts'
                );
                await seedMissingPendingLawyerVerifications();
            } catch {
                /* القائمة تبقى من KV القائم */
            }
            const { rows, capped } = await kvReadHqVerificationQueueByPrefix(KEY_PREFIX);
            const queued = rows
                .map(toHqQueueRecord)
                .filter((row): row is NonNullable<typeof row> => Boolean(row))
                .filter((row) => (scope === 'all' ? true : row.status === 'pending'));
            const records = await attachHqQueueLiveNames(queued);
            return wifeJsonNoStore(200, { ok: true, records, capped });
        }

        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const record = asRecord(await kvGet(keyFor(authGate.userId)));
        return wifeJsonResponse(200, { ok: true, record: record ? toHqSelfStatusRecord(record) : null });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'verification list failed' });
    }
}

/** PATCH — اعتماد / رفض (مقر القيادة عن بعد فقط) */
export async function PATCH(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request, { stepUp: true });
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-verification:${gate.userId}`, {
            maxRequests: 20,
            windowMs: 15 * 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

        const targetId = String(body.userId ?? '').trim();
        const status = body.status;
        if (!isPostgresUuidSubject(targetId) || !isLawyerVerificationStatus(status)) {
            return wifeJsonResponse(400, { ok: false, error: 'userId and status required' });
        }
        if (status !== 'active' && status !== 'rejected') {
            return wifeJsonResponse(400, { ok: false, error: 'status غير صالح' });
        }
        if (isHeadquartersProtectedAdminId(targetId)) {
            return wifeJsonResponse(403, { ok: false, error: 'لا يمكن تعديل توثيق مدير المنصّة' });
        }

        const rejectionReason =
            status === 'rejected' ? clipHqVerificationField(body.rejectionReason, 240) : undefined;
        if (status === 'rejected' && (!rejectionReason || rejectionReason.length < 4)) {
            return wifeJsonResponse(400, { ok: false, error: 'سبب الرفض مطلوب' });
        }

        const existing = asRecord(await kvGet(keyFor(targetId)));
        if (!existing) {
            return wifeJsonResponse(404, { ok: false, error: 'Verification request not found' });
        }

        if (status === 'active' && (!existing.idFrontPreview || !existing.idBackPreview)) {
            return wifeJsonResponse(400, {
                ok: false,
                error: 'لا يمكن اعتماد محامٍ بلا وجه وظهر هوية النقابة',
                code: 'ID_DOCUMENTS_REQUIRED',
            });
        }

        const next: ServerLawyerVerificationRecord = {
            ...existing,
            status,
            updatedAt: new Date().toISOString(),
            rejectionReason,
            ocrNameMatch: null,
        };
        await kvSet(keyFor(targetId), next);

        const admin = getSupabaseAdminClient();
        if (admin) {
            try {
                await getGoTrueAdminApi(admin).updateUserById(targetId, {
                    app_metadata: { verification_status: status },
                });
            } catch {
                /* best effort */
            }
        }

        let liveName = '';
        if (admin) {
            try {
                const { data } = await admin
                    .from('profiles')
                    .select('legal_display_name')
                    .eq('id', targetId)
                    .maybeSingle();
                liveName = String((data as { legal_display_name?: unknown } | null)?.legal_display_name ?? '').trim();
            } catch {
                liveName = '';
            }
        }
        const decideDetails: Record<string, string> = { status };
        if (hqLiveNameDivergesFromKyc(liveName, existing.fullName)) {
            decideDetails.liveName = liveName.slice(0, 80);
            decideDetails.kycName = existing.fullName.slice(0, 80);
        }
        const auditRecorded = await recordHeadquartersAudit({
            actorId: gate.userId,
            action: 'verification.decide',
            targetId: targetId,
            details: decideDetails,
        });
        void notifyHeadquartersVerificationStatus({
            userId: targetId,
            status,
            rejectionReason,
        });
        return wifeJsonResponse(200, { ok: true, auditRecorded, record: toHqQueueRecord(next) });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'verification patch failed' });
    }
}
