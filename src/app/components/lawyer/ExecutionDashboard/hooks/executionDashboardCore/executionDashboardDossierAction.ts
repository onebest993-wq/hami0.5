import type { DossierActionPayload, DossierActionType } from '../../components/DossierActionsModal';

export const DOSSIER_ACTION_TITLE_MAP: Record<DossierActionType, string> = {
    delegation: 'طلب الإنابة التنفيذية',
    unify: 'طلب توحيد الأضابير',
    transfer: 'طلب نقل الإضبارة',
    renew: 'طلب تجديد الإضبارة',
    inaba_correspondence: 'طلب مخاطبة مديرية الانابة',
};

export function buildDossierActionContentParts(payload: DossierActionPayload): string[] {
    const contentParts: string[] = [];

    if (payload.actionType === 'delegation') {
        contentParts.push(`الدائرة المناب إليها: ${payload.delegationTargetDirectorate}`);
        contentParts.push(`الغاية من الإنابة: ${payload.delegationPurpose}`);
    } else if (payload.actionType === 'inaba_correspondence') {
        contentParts.push(`مديرية الإنابة: ${payload.inabaCorrespondenceDirectorate}`);
        contentParts.push(`موضوع المخاطبة: ${payload.inabaCorrespondenceSubject}`);
    } else if (payload.actionType === 'unify') {
        contentParts.push(`معرف الإضبارة: ${payload.unificationTargetId}`);
        if (payload.unificationTargetMeta?.fileNumber) {
            contentParts.push(`رقم الإضبارة: ${payload.unificationTargetMeta.fileNumber}`);
        }
        if (payload.unificationTargetMeta?.fileYear) {
            contentParts.push(`السنة: ${payload.unificationTargetMeta.fileYear}`);
        }
        if (payload.unificationTargetMeta?.directorate) {
            contentParts.push(`المديرية: ${payload.unificationTargetMeta.directorate}`);
        }
    } else if (payload.actionType === 'transfer') {
        contentParts.push(`الدائرة المراد النقل إليها: ${payload.transferTargetDirectorate}`);
    } else if (payload.actionType === 'renew') {
        contentParts.push(`سبب التجديد: ${payload.renewalReason}`);
    }

    return contentParts;
}

export function buildDossierActionFullContent(payload: DossierActionPayload): string {
    const title = DOSSIER_ACTION_TITLE_MAP[payload.actionType];
    return `${title}\n${buildDossierActionContentParts(payload).join('\n')}`;
}

export function validateDossierActionPayload(
    payload: DossierActionPayload,
): { ok: true } | { ok: false; message: string } {
    if (payload.actionType === 'inaba_correspondence') {
        if (!String(payload.inabaCorrespondenceSubFileId || '').trim()) {
            return { ok: false, message: 'تعذر إرسال الطلب: لا توجد إنابة نشطة لهذه الإضبارة.' };
        }
        if (!String(payload.inabaCorrespondenceSubject || '').trim()) {
            return { ok: false, message: 'أدخل موضوع المخاطبة' };
        }
    }
    if (payload.actionType === 'transfer') {
        if (!String(payload.transferTargetDirectorate || '').trim()) {
            return { ok: false, message: 'أدخل اسم المديرية المراد نقل الإضبارة إليها' };
        }
    }
    if (payload.actionType === 'unify') {
        if (!String(payload.unificationTargetId || '').trim()) {
            return { ok: false, message: 'اختر الإضبارة المراد دمجها' };
        }
    }
    return { ok: true };
}

export function buildDossierActionPayloadJson(payload: DossierActionPayload): string | undefined {
    if (payload.actionType === 'unify') {
        return JSON.stringify({
            kind: 'unification',
            v: 1,
            targetType: 'own',
            targetId: payload.unificationTargetId,
            targetMeta: payload.unificationTargetMeta,
        });
    }
    if (payload.actionType === 'inaba_correspondence') {
        return JSON.stringify({
            kind: 'inaba_correspondence',
            v: 1,
            inabaSubFileId: payload.inabaCorrespondenceSubFileId,
            directorate: payload.inabaCorrespondenceDirectorate,
            subject: payload.inabaCorrespondenceSubject,
        });
    }
    if (payload.actionType === 'transfer') {
        return JSON.stringify({
            kind: 'transfer',
            v: 1,
            targetDirectorate: payload.transferTargetDirectorate,
        });
    }
    return undefined;
}
