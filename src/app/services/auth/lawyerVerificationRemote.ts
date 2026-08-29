import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import {
    applyLawyerVerificationStatusFromServer,
    markLawyerVerificationUiReady,
} from '@/app/services/auth/lawyerVerificationStore';
import { compactIdentityPreviewForKv } from '@/app/services/auth/identityImageDataUrl';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

export const LAWYER_VERIFICATION_HQ_RECEIVED_AR =
    'وصل طلبك إلى الإدارة. يمكنك العمل الآن دون انتظار؛ المنتدى والمزامنة بعد الاعتماد.';

export const LAWYER_VERIFICATION_HQ_UNREACHABLE_AR =
    'حُفظ الطلب على جهازك وتعذّر إرساله لمقر القيادة. أعد المحاولة عند استقرار الشبكة — الإدارة لم تستلم الطلب بعد.';

export type SubmitLawyerVerificationInput = {
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    faceAssistOptedIn: boolean;
    idFrontDataUrl: string | null;
    idBackDataUrl: string | null;
    faceSelfieDataUrl: string | null;
};

/** يرفع ملخص طلب التوثيق للخادم (KV) بعد إنشاء الجلسة */
export async function submitLawyerVerificationToServer(
    input: SubmitLawyerVerificationInput,
): Promise<void> {
    await SecureAPIClient.fetchSecure('/api/auth/lawyer-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
            email: input.email,
            fullName: input.fullName,
            familyName: input.familyName,
            phone: input.phone,
            governorate: input.governorate,
            lawyerBarRoom: input.lawyerBarRoom,
            faceAssistOptedIn: input.faceAssistOptedIn,
            hasIdFront: Boolean(input.idFrontDataUrl),
            hasIdBack: Boolean(input.idBackDataUrl),
            hasFaceSelfie: Boolean(input.faceSelfieDataUrl),
            idFrontPreview: compactIdentityPreviewForKv(input.idFrontDataUrl),
            idBackPreview: compactIdentityPreviewForKv(input.idBackDataUrl),
            faceSelfiePreview: compactIdentityPreviewForKv(input.faceSelfieDataUrl),
        }),
    });
}

let verificationSyncInflight: Promise<void> | null = null;
let verificationSyncUserId: string | null = null;

/** يزامن حالة التوثيق من KV إلى التخزين المحلي — مرة لكل مستخدم لكل جلسة */
export async function syncLawyerVerificationFromServer(userId?: string | null): Promise<void> {
    const persisted = readPersistedSupabaseAuth();
    const uid = (userId ?? getLiveAuthUserId() ?? persisted.user?.id ?? '').trim();
    if (!uid) return;
    if (verificationSyncInflight && verificationSyncUserId === uid) {
        await verificationSyncInflight;
        return;
    }
    verificationSyncUserId = uid;
    verificationSyncInflight = (async () => {
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                record?: { status?: string; rejectionReason?: string } | null;
            }>('/api/auth/lawyer-verification?scope=self', {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            const status = data?.record?.status;
            if (status === 'active' || status === 'pending' || status === 'rejected') {
                applyLawyerVerificationStatusFromServer(
                    uid,
                    status,
                    typeof data?.record?.rejectionReason === 'string'
                        ? data.record.rejectionReason
                        : undefined,
                );
            }
        } catch {
            /* صامت — الخادم قد يكون بلا KV */
        } finally {
            markLawyerVerificationUiReady(uid);
        }
    })().finally(() => {
        verificationSyncInflight = null;
    });
    await verificationSyncInflight;
}

export async function fetchLawyerPersonnelDossier(
    userId: string,
    signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
    const id = userId.trim();
    if (!id) return null;
    const data = await SecureAPIClient.fetchSecure<{
        ok?: boolean;
        record?: Record<string, unknown> | null;
    }>(`/api/auth/lawyer-verification?scope=dossier&userId=${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal,
    });
    if (!data?.ok) {
        throw new Error('تعذّر جلب ملف المحامي');
    }
    return data.record ?? null;
}

export async function fetchLawyerVerifications(
    scope: 'pending' | 'all' = 'pending',
    signal?: AbortSignal,
): Promise<Array<Record<string, unknown>> & { capped: boolean }> {
    const data = await SecureAPIClient.fetchSecure<{
        ok?: boolean;
        records?: Array<Record<string, unknown>>;
        capped?: boolean;
    }>(`/api/auth/lawyer-verification?scope=${scope}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal,
    });
    if (!data?.ok) {
        throw new Error('تعذّر جلب طلبات التوثيق');
    }
    const records = Array.isArray(data.records) ? data.records : [];
    return Object.assign(records, { capped: Boolean(data.capped) });
}

export async function fetchPendingLawyerVerifications(): Promise<
    Array<Record<string, unknown>>
> {
    return fetchLawyerVerifications('pending');
}

function patchErrorMessage(error: unknown): string {
    if (error instanceof SecureFetchError) {
        if (error.status === 429) return 'تجاوزت حد عمليات المقر — حاول لاحقاً';
        try {
            const parsed = JSON.parse(error.bodyText) as { error?: unknown };
            const msg = String(parsed.error ?? '').trim();
            if (msg) return msg;
        } catch {
            /* نص غير JSON */
        }
    }
    return 'فشل تحديث حالة التوثيق';
}

export async function patchLawyerVerificationStatus(params: {
    userId: string;
    status: 'active' | 'rejected' | 'pending';
    rejectionReason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const data = await hqMutatingFetch<{ ok?: boolean; error?: string }>(
            '/api/auth/lawyer-verification',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(params),
            },
        );
        if (!data?.ok) {
            return { ok: false, error: String(data?.error ?? '').trim() || 'فشل تحديث حالة التوثيق' };
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, error: patchErrorMessage(error) };
    }
}
