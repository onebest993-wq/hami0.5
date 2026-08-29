import React from 'react';
import {
    bridgeOpenEditDossierMeta,
    bridgeOpenEditParty,
    bridgeOpenParentDossierMetaEdit,
    buildFallbackDossierMetaDraftFromScope,
} from '../components/executionDashboardPhoneBodyBridges';

export function usePhoneBodySafeOpeners(p: {
    readLatestPhoneBodyScope: () => Record<string, unknown>;
    schedulePhoneBodyScopeBridge: (task: () => void) => void;
    showToast: (message: string, type?: string) => void;
}) {
    const safeOpenEditDossierMeta = React.useCallback(() => {
        if (
            bridgeOpenEditDossierMeta({
                readLatestScope: p.readLatestPhoneBodyScope,
                scheduleBridge: p.schedulePhoneBodyScopeBridge,
                buildFallbackDraft: buildFallbackDossierMetaDraftFromScope,
            })
        ) {
            return;
        }
        p.showToast('تعذر فتح تعديل بيانات الإضبارة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.readLatestPhoneBodyScope, p.schedulePhoneBodyScopeBridge, p.showToast]);

    const safeOpenParentDossierMetaEdit = React.useCallback(() => {
        if (
            bridgeOpenParentDossierMetaEdit({
                readLatestScope: p.readLatestPhoneBodyScope,
                scheduleBridge: p.schedulePhoneBodyScopeBridge,
            })
        ) {
            return;
        }
        p.showToast(
            'تعذر فتح تعديل بيانات الحاوية الأبوية لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
            'error',
        );
    }, [p.readLatestPhoneBodyScope, p.schedulePhoneBodyScopeBridge, p.showToast]);

    const safeOpenEditParty = React.useCallback(
        (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: unknown },
        ) => {
            if (
                bridgeOpenEditParty({
                    kind,
                    index,
                    opts,
                    readLatestScope: p.readLatestPhoneBodyScope,
                    scheduleBridge: p.schedulePhoneBodyScopeBridge,
                })
            ) {
                return;
            }
            p.showToast(
                kind === 'debtor'
                    ? 'تعذر فتح تعديل بيانات المدين لأن الربط الحقيقي لم يصل إلى الواجهة بعد.'
                    : 'تعذر فتح تعديل بيانات الدائن لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
                'error',
            );
        },
        [p.readLatestPhoneBodyScope, p.schedulePhoneBodyScopeBridge, p.showToast],
    );

    return { safeOpenEditDossierMeta, safeOpenParentDossierMetaEdit, safeOpenEditParty };
}
