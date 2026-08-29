import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, CassationType, ProsecutionInterventionBasis } from '@/app/types/criminal';
import { availableCassationTypesForStage } from './cassationEngine';
import type { InitiateCassationPayload } from './cassationEngine';
import { MergeValidationError } from './criminalStore';

type UseCriminalDashboardCassationMergeActionsParams = {
    caseId: string;
    stage: string;
    caseStage: CaseStage;
    defendantIds: string[];
    showCassationCountdownBanner: boolean;
    isDecisionsTabMaterialReadOnly: boolean;
    mandatoryCassationAutoSend: boolean;
    cassationNumber: string;
    cassationSentDate: string;
    cassationPanelName: string;
    cassationType: CassationType;
    cassationInterventionBasis: ProsecutionInterventionBasis;
    cassationAppellantIds: string[];
    cassationFilingDetails: string;
    mergeTargetCaseId: string;
    mergeReason: string;
    setCassationNumber: Dispatch<SetStateAction<string>>;
    setCassationSentDate: Dispatch<SetStateAction<string>>;
    setCassationPanelName: Dispatch<SetStateAction<string>>;
    setCassationFilingDetails: Dispatch<SetStateAction<string>>;
    setCassationType: Dispatch<SetStateAction<CassationType>>;
    setCassationInterventionBasis: Dispatch<SetStateAction<ProsecutionInterventionBasis>>;
    setCassationAppellantIds: Dispatch<SetStateAction<string[]>>;
    setIsSendToCassationOpen: Dispatch<SetStateAction<boolean>>;
    setMergeTargetCaseId: Dispatch<SetStateAction<string>>;
    setMergeReason: Dispatch<SetStateAction<string>>;
    setIsMergeCasesOpen: Dispatch<SetStateAction<boolean>>;
    initiateCassationProceeding: (caseId: string, payload: InitiateCassationPayload) => void;
    mergeCases: (parentCaseId: string, childCaseId: string, reason: string) => void;
    showLegalToast: (message: string, durationMs?: number) => void;
};

/**
 * مُعالِجات فتح/إرسال التمييز وضم الإضبارات — مستخرَجة من الـ runtime.
 * المشتقّات/اللافتات تبقى في useCriminalDashboardCaseBanners.
 */
export function useCriminalDashboardCassationMergeActions({
    caseId,
    stage,
    caseStage,
    defendantIds,
    showCassationCountdownBanner,
    isDecisionsTabMaterialReadOnly,
    mandatoryCassationAutoSend,
    cassationNumber,
    cassationSentDate,
    cassationPanelName,
    cassationType,
    cassationInterventionBasis,
    cassationAppellantIds,
    cassationFilingDetails,
    mergeTargetCaseId,
    mergeReason,
    setCassationNumber,
    setCassationSentDate,
    setCassationPanelName,
    setCassationFilingDetails,
    setCassationType,
    setCassationInterventionBasis,
    setCassationAppellantIds,
    setIsSendToCassationOpen,
    setMergeTargetCaseId,
    setMergeReason,
    setIsMergeCasesOpen,
    initiateCassationProceeding,
    mergeCases,
    showLegalToast,
}: UseCriminalDashboardCassationMergeActionsParams) {
    const openSendToCassation = () => {
        setCassationNumber('');
        setCassationSentDate(new Date().toISOString().slice(0, 10));
        setCassationPanelName('');
        setCassationFilingDetails('');
        const defaultType: CassationType =
            caseStage === 'investigation'
                ? 'investigation_judge_appeal'
                : caseStage === 'felony'
                  ? 'federal_cassation_felony'
                  : 'criminal_cassation_misdemeanor';
        const allowed = availableCassationTypesForStage(stage, caseStage);
        setCassationType(allowed.includes(defaultType) ? defaultType : allowed[0] ?? defaultType);
        setCassationInterventionBasis('prosecutor_general_review');
        setCassationAppellantIds(defendantIds);
        setIsSendToCassationOpen(true);
    };

    const sendToCassationOnVerdictCard =
        showCassationCountdownBanner && !isDecisionsTabMaterialReadOnly
            ? {
                  label: mandatoryCassationAutoSend
                      ? '⚖️ توثيق إرسال الإضبارة للتمييز (10 أيام)'
                      : '⚖️ تسجيل إرسال الإضبارة للتمييز',
                  urgent: mandatoryCassationAutoSend,
                  onClick: openSendToCassation,
              }
            : undefined;

    const submitSendToCassation = () => {
        const cn = cassationNumber.trim();
        const sd = cassationSentDate.trim() || new Date().toISOString().slice(0, 10);
        const pn = cassationPanelName.trim();
        if (!cn) return;
        if (cassationType !== 'prosecution_intervention_264b' && !pn) return;
        const appellants = cassationAppellantIds.length ? cassationAppellantIds : defendantIds;
        initiateCassationProceeding(caseId, {
            cassationType,
            filedAt: sd,
            details: cassationFilingDetails.trim() || 'تقديم طعن/تدخل تمييزي',
            cassationNumber: cn,
            panelName: pn || undefined,
            sentDate: sd,
            interventionBasis:
                cassationType === 'prosecution_intervention_264b' ? cassationInterventionBasis : undefined,
            appellantDefendantIds: appellants,
        });
        setIsSendToCassationOpen(false);
    };

    const openMergeCases = () => {
        setMergeTargetCaseId('');
        setMergeReason('');
        setIsMergeCasesOpen(true);
    };

    const submitMergeCases = () => {
        const targetId = mergeTargetCaseId.trim();
        const reason = mergeReason.trim();
        if (!targetId || !reason) {
            showLegalToast('تعذّر تنفيذ الضم: اختر الإضبارة المُستهدفة واكتب السبب القانوني.', 5500);
            return;
        }
        try {
            mergeCases(caseId, targetId, reason);
        } catch (err) {
            const isValidation = err instanceof MergeValidationError;
            const msg = err instanceof Error && err.message ? err.message : '';
            showLegalToast(msg || 'تعذّر تنفيذ الضم.', isValidation ? 7000 : 5500);
            return;
        }
        setIsMergeCasesOpen(false);
        setMergeTargetCaseId('');
        setMergeReason('');
        // الواجهة الحالية هي الإضبارة الأم بالفِعل — تَحديث الـ store يَتسبَّب بإعادة render تلقائياً
        // فيُعرض الترحيل الجديد (التايم لاين / القرارات / الإفادات / الطلبات) بدون تَدخّل إضافي.
    };

    return {
        openSendToCassation,
        sendToCassationOnVerdictCard,
        submitSendToCassation,
        openMergeCases,
        submitMergeCases,
    };
}
