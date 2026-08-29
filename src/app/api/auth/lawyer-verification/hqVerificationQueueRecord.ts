import { compactIdentityPreviewForKv } from '../../../services/auth/identityImageDataUrl.ts';

export type HqVerificationQueueStatus = 'pending' | 'active' | 'rejected';

/** قائمة المقر — بلا معاينات هوية. الوثائق تُجلب عند الطلب عبر scope=dossier. */
export type HqVerificationQueueRecord = {
    userId: string;
    status: HqVerificationQueueStatus;
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
    /** الاسم الحي من profiles — للمقارنة مع fullName المقدَّم، لا بديل عنه */
    liveFullName?: string;
};

/** حالة المحامي لنفسه — بلا صور. المزامنة تحتاج status + سبب الرفض فقط. */
export type HqVerificationSelfRecord = {
    userId: string;
    status: HqVerificationQueueStatus;
    rejectionReason?: string;
    submittedAt: string;
    updatedAt: string;
    hasIdFront: boolean;
    hasIdBack: boolean;
    hasFaceSelfie: boolean;
};

/** إضبارة وثائق المقر — معاينات مُعقَّمة فقط. */
export type HqVerificationDossierRecord = HqVerificationQueueRecord & {
    idFrontPreview: string | null;
    idBackPreview: string | null;
    faceSelfiePreview: string | null;
};

type QueueSource = {
    userId: unknown;
    status: unknown;
    submittedAt?: unknown;
    updatedAt?: unknown;
    rejectionReason?: unknown;
    email?: unknown;
    fullName?: unknown;
    familyName?: unknown;
    phone?: unknown;
    governorate?: unknown;
    lawyerBarRoom?: unknown;
    faceAssistOptedIn?: unknown;
    hasIdFront?: unknown;
    hasIdBack?: unknown;
    hasFaceSelfie?: unknown;
    liveFullName?: unknown;
    idFrontPreview?: unknown;
    idBackPreview?: unknown;
    faceSelfiePreview?: unknown;
};

export function isHqVerificationQueueStatus(value: unknown): value is HqVerificationQueueStatus {
    return value === 'pending' || value === 'active' || value === 'rejected';
}

/**
 * jsonb `->>` يعيد نصاً. `Boolean("false") === true` كان يُظهر مرفقاً وهمياً.
 */
export function asHqVerificationFlag(value: unknown): boolean {
    return value === true || value === 1 || value === 'true' || value === 't' || value === '1';
}

export function clipHqVerificationField(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, Math.max(0, max));
}

function previewPresent(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const raw = value.trim();
    return raw.length > 0 && raw !== 'null' && raw !== 'undefined';
}

function attachmentFlag(explicit: unknown, preview: unknown): boolean {
    return asHqVerificationFlag(explicit) || previewPresent(preview);
}

export function hqVerificationHasIdentityPair(
    record: Pick<HqVerificationQueueRecord, 'hasIdFront' | 'hasIdBack'>,
): boolean {
    return record.hasIdFront && record.hasIdBack;
}

export function toHqQueueRecord(record: QueueSource): HqVerificationQueueRecord | null {
    const userId = clipHqVerificationField(record.userId, 64);
    if (!userId || !isHqVerificationQueueStatus(record.status)) return null;
    const rejectionReason = clipHqVerificationField(record.rejectionReason, 240);
    return {
        userId,
        status: record.status,
        submittedAt: clipHqVerificationField(record.submittedAt, 40),
        updatedAt: clipHqVerificationField(record.updatedAt, 40),
        rejectionReason: rejectionReason || undefined,
        email: clipHqVerificationField(record.email, 120),
        fullName: clipHqVerificationField(record.fullName, 80),
        familyName: clipHqVerificationField(record.familyName, 80),
        phone: clipHqVerificationField(record.phone, 24),
        governorate: clipHqVerificationField(record.governorate, 80),
        lawyerBarRoom: clipHqVerificationField(record.lawyerBarRoom, 80),
        faceAssistOptedIn: asHqVerificationFlag(record.faceAssistOptedIn),
        hasIdFront: attachmentFlag(record.hasIdFront, record.idFrontPreview),
        hasIdBack: attachmentFlag(record.hasIdBack, record.idBackPreview),
        hasFaceSelfie: attachmentFlag(record.hasFaceSelfie, record.faceSelfiePreview),
        liveFullName: clipHqVerificationField(record.liveFullName, 80) || undefined,
    };
}

export function toHqSelfStatusRecord(record: QueueSource): HqVerificationSelfRecord | null {
    const queued = toHqQueueRecord(record);
    if (!queued) return null;
    return {
        userId: queued.userId,
        status: queued.status,
        rejectionReason: queued.rejectionReason,
        submittedAt: queued.submittedAt,
        updatedAt: queued.updatedAt,
        hasIdFront: queued.hasIdFront,
        hasIdBack: queued.hasIdBack,
        hasFaceSelfie: queued.hasFaceSelfie,
    };
}

export type PendingLawyerVerificationSeedInput = {
    userId: string;
    email?: string;
    fullName?: string;
    familyName?: string;
    phone?: string;
    governorate?: string;
    lawyerBarRoom?: string;
    submittedAt?: string;
    /** إن كان active لا يُزرع صف معلّق فوق قرار المقر في app_metadata */
    appVerificationStatus?: unknown;
};

/** صف طابور بلا وثائق — حساب سُجّل ولم يُرفع طلب هوية بعد. */
export function buildPendingLawyerVerificationSeed(
    input: PendingLawyerVerificationSeedInput,
    nowIso = new Date().toISOString(),
): Record<string, unknown> {
    const userId = clipHqVerificationField(input.userId, 64);
    const submittedAt = clipHqVerificationField(input.submittedAt, 40) || nowIso;
    return {
        userId,
        status: 'pending',
        submittedAt,
        updatedAt: nowIso,
        email: clipHqVerificationField(input.email, 120),
        fullName: clipHqVerificationField(input.fullName, 80),
        familyName: clipHqVerificationField(input.familyName, 80),
        phone: clipHqVerificationField(input.phone, 24),
        governorate: clipHqVerificationField(input.governorate, 80),
        lawyerBarRoom: clipHqVerificationField(input.lawyerBarRoom, 80),
        faceAssistOptedIn: false,
        hasIdFront: false,
        hasIdBack: false,
        hasFaceSelfie: false,
        idFrontPreview: null,
        idBackPreview: null,
        faceSelfiePreview: null,
        ocrNameMatch: null,
    };
}

export function toHqDossierRecord(record: QueueSource): HqVerificationDossierRecord | null {
    const queued = toHqQueueRecord(record);
    if (!queued) return null;
    const idFrontPreview = compactIdentityPreviewForKv(
        typeof record.idFrontPreview === 'string' ? record.idFrontPreview : null,
    );
    const idBackPreview = compactIdentityPreviewForKv(
        typeof record.idBackPreview === 'string' ? record.idBackPreview : null,
    );
    const faceSelfiePreview = compactIdentityPreviewForKv(
        typeof record.faceSelfiePreview === 'string' ? record.faceSelfiePreview : null,
    );
    return {
        ...queued,
        hasIdFront: Boolean(idFrontPreview),
        hasIdBack: Boolean(idBackPreview),
        hasFaceSelfie: Boolean(faceSelfiePreview),
        idFrontPreview,
        idBackPreview,
        faceSelfiePreview,
    };
}
