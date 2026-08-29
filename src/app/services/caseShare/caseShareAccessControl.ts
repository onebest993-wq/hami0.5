import type { CaseShareRecord, CaseShareVisibleFields } from './caseShareTypes';
import { isCaseShareSessionActive, isCaseShareSessionExpired } from './caseShareSession';

/** ملخص فقط — قبل موافقة المستقبل */
export function buildPendingRecipientPreview(share: CaseShareRecord): CaseShareRecord['maskedView'] {
    return {
        module: share.dossierModule,
        dossierId: '',
        title: share.maskedView.title,
        caseNumbers: [],
        parties: [],
        court: '—',
        narrative: 'تفاصيل الإضبارة متاحة بعد الموافقة على طلب الاستشارة.',
        documentsIncluded: false,
        ownerDisplayName: share.ownerName,
        visibleCatalog: [],
        sessionDurationMinutes: share.sessionDurationMinutes ?? share.maskedView.sessionDurationMinutes,
    };
}

const EMPTY_VISIBLE_FIELDS: CaseShareVisibleFields = {
    documents: false,
    case_numbers: false,
    parties_names: 'hidden',
    court_details: 'hidden',
    hiddenItemIds: [],
};

/** بعد انتهاء/رفض الجلسة — للمستقبل فقط */
function buildEndedRecipientPreview(share: CaseShareRecord): CaseShareRecord['maskedView'] {
    return {
        module: share.dossierModule,
        dossierId: '',
        title: share.maskedView.title,
        caseNumbers: [],
        parties: [],
        court: '—',
        narrative: 'انتهت الجلسة — لم يعد بإمكانك عرض تفاصيل الإضبارة.',
        documentsIncluded: false,
        ownerDisplayName: share.maskedView.ownerDisplayName ?? share.ownerName,
        visibleCatalog: [],
        sessionDurationMinutes: share.sessionDurationMinutes ?? share.maskedView.sessionDurationMinutes,
    };
}

function stripRecipientSensitiveView(share: CaseShareRecord, viewerId: string): CaseShareRecord {
    if (share.ownerId === viewerId) return share;
    return {
        ...share,
        dossierId: '',
        visibleFields: EMPTY_VISIBLE_FIELDS,
        maskedView: buildEndedRecipientPreview(share),
    };
}

/** يمنع تسريب maskedView قبل الموافقة وبعد إنهاء الجلسة */
export function applyShareAccessPolicy(share: CaseShareRecord, viewerId: string): CaseShareRecord {
    let next = share;

    if (next.status === 'accepted' && isCaseShareSessionExpired(next)) {
        next = {
            ...next,
            status: 'ended',
            sessionEndedAt: next.sessionEndedAt ?? new Date().toISOString(),
            endedByUserId: next.endedByUserId ?? 'system:expired',
        };
    }

    if (next.status === 'pending' && next.recipientId === viewerId) {
        return {
            ...next,
            dossierId: '',
            visibleFields: EMPTY_VISIBLE_FIELDS,
            maskedView: buildPendingRecipientPreview(next),
        };
    }

    if (next.recipientId === viewerId && next.status === 'declined') {
        return stripRecipientSensitiveView(next, viewerId);
    }

    if (next.recipientId === viewerId && next.status === 'ended') {
        return stripRecipientSensitiveView(next, viewerId);
    }

    if (next.status === 'accepted' && next.recipientId === viewerId && !isCaseShareSessionActive(next)) {
        return stripRecipientSensitiveView(next, viewerId);
    }

    return next;
}

export function applyShareListAccessPolicy(shares: CaseShareRecord[], viewerId: string): CaseShareRecord[] {
    return shares.map((s) => applyShareAccessPolicy(s, viewerId));
}

const LIST_SUMMARY_VISIBLE_FIELDS: CaseShareVisibleFields = {
    documents: false,
    case_numbers: false,
    parties_names: 'hidden',
    court_details: 'hidden',
    hiddenItemIds: [],
};

/** قائمة الإشعارات — بدون محتوى حساس (defense in depth) */
export function toShareListSummary(share: CaseShareRecord, viewerId: string): CaseShareRecord {
    const policy = applyShareAccessPolicy(share, viewerId);
    const ownerPreview = policy.ownerId === viewerId && policy.status !== 'declined';

    return {
        ...policy,
        dossierId: ownerPreview ? policy.dossierId : '',
        visibleFields: LIST_SUMMARY_VISIBLE_FIELDS,
        maskedView: {
            module: policy.maskedView.module,
            dossierId: '',
            title: policy.maskedView.title,
            caseNumbers: [],
            parties: [],
            court: '—',
            narrative:
                policy.status === 'pending' && policy.recipientId === viewerId
                    ? policy.maskedView.narrative
                    : '',
            documentsIncluded: policy.maskedView.documentsIncluded,
            ownerDisplayName: policy.maskedView.ownerDisplayName ?? policy.ownerName,
            visibleCatalog: [],
            sessionDurationMinutes: policy.sessionDurationMinutes ?? policy.maskedView.sessionDurationMinutes,
        },
    };
}

/** تفاصيل كاملة — فقط أثناء جلسة نشطة للمستقبل، أو للمرسل */
export function canFetchShareDetail(share: CaseShareRecord, viewerId: string): boolean {
    if (share.ownerId !== viewerId && share.recipientId !== viewerId) return false;
    if (share.recipientId === viewerId && share.status === 'pending') return false;
    if (share.recipientId === viewerId && (share.status === 'ended' || share.status === 'declined')) {
        return false;
    }
    if (
        share.recipientId === viewerId &&
        share.status === 'accepted' &&
        !isCaseShareSessionActive(share)
    ) {
        return false;
    }
    return true;
}
