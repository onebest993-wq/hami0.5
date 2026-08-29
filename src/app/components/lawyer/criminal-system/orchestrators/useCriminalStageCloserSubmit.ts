import type { Dispatch, SetStateAction } from 'react';
import type { CriminalDefendant, CriminalCaseStage } from '../criminalCaseModel';
import type { StageConclusion } from '../criminalStore';
import { stageTypeFromStage } from '../criminalStageRuntimeCore';
import { isPrivateRightWaiverDecisionValue } from '../criminalStageUtils';
import { isReferralStageValue, isStageDecisionType } from '../components/StageCloserModal';
import { validateExpirationReasonSelection } from '../stageExpirationReasons';
import { isCassationClosureQuashDecision } from '../cassationEngine';
import {
    decisionRequiresDefendantScope,
    resolveEffectiveDefendantScopeIds,
    shouldShowDefendantDecisionScopePicker,
} from '../partyPersonalStage';
import type { CriminalStageCloserOrchestratorSlice } from './criminalOrchestratorSliceTypes';

type UseCriminalStageCloserSubmitParams = {
    caseId: string;
    stage: string;
    defendants: CriminalDefendant[];
    juvenileDefendants: CriminalDefendant[];
    isJuvenileTrial: boolean;
    isPrivateRightWaived: boolean;
    closer: CriminalStageCloserOrchestratorSlice;
    setInvestigationDecisionError: Dispatch<SetStateAction<string>>;
    showLegalError: (message?: string) => void;
    waivePrivateRight: (caseId: string, waiverDate: string) => void;
    severJuvenileDefendantToJuvenileCourt: (
        caseId: string,
        defendantId: string,
        date: string,
        details: string,
    ) => string | null;
    referAndGenerateCase: (
        currentCaseId: string,
        targetCourt: string,
        decisionDetails: StageConclusion,
        referralMeta?: { courtName: string; caseNumber: string },
    ) => string | null;
    issueStageDecision: (
        caseId: string,
        conclusion: StageConclusion,
        referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
};

type UseCriminalStageCloserSubmitResult = {
    submitPrivateRightWaiverDecision: (date: string) => boolean;
    submitStageCloser: () => void;
};

/** منطق إرسال (submit) مودال الغلق الختامي للمرحلة — مستخرَج من الـ runtime، الحالة تبقى في الـ orchestrator. */
export function useCriminalStageCloserSubmit(
    params: UseCriminalStageCloserSubmitParams,
): UseCriminalStageCloserSubmitResult {
    const {
        caseId,
        stage,
        defendants,
        juvenileDefendants,
        isJuvenileTrial,
        isPrivateRightWaived,
        closer,
        setInvestigationDecisionError,
        showLegalError,
        waivePrivateRight,
        severJuvenileDefendantToJuvenileCourt,
        referAndGenerateCase,
        issueStageDecision,
    } = params;

    const submitPrivateRightWaiverDecision = (date: string): boolean => {
        if (isPrivateRightWaived) {
            closer.setStageCloserError('تم تسجيل التنازل عن الحق الشخصي مسبقاً.');
            setInvestigationDecisionError('تم تسجيل التنازل عن الحق الشخصي مسبقاً.');
            return false;
        }
        try {
            waivePrivateRight(caseId, date);
        } catch {
            showLegalError();
            return false;
        }
        return true;
    };

    const submitStageCloser = () => {
        const stageType = stageTypeFromStage(stage);
        if (!stageType) return;

        closer.setStageCloserError('');
        const decisionType = closer.closureDecisionType;
        const date = closer.closureDate.trim();
        const detailsRaw = closer.closureDetails.trim();
        if (!decisionType || !date || !detailsRaw) return;

        if (isPrivateRightWaiverDecisionValue(decisionType)) {
            if (!submitPrivateRightWaiverDecision(date)) return;
            closer.setIsStageCloserOpen(false);
            return;
        }
        if (!isStageDecisionType(decisionType)) return;

        if (decisionType === 'juvenile_severance_referral') {
            const defId = String(closer.closureJuvenileSeverDefendantId ?? '').trim();
            if (!defId) return;
            severJuvenileDefendantToJuvenileCourt(caseId, defId, date, detailsRaw);
            closer.setIsStageCloserOpen(false);
            return;
        }

        if (isJuvenileTrial) {
            const needsReport = [
                'juvenile_deliver_guardian',
                'juvenile_behavioral_surveillance',
                'juvenile_reform_boys',
            ].includes(decisionType);
            if (needsReport) {
                const hasMissing = juvenileDefendants.some((d) => {
                    const ws = String(d.socialInquiryReport?.workflowStatus ?? '').trim();
                    if (ws === 'submitted') return false;
                    return !d.socialInquiryReport?.isAttached;
                });
                if (hasMissing) {
                    closer.setStageCloserError(
                        'ℹ️ تنبيه استرشادي: يفضّل إرفاق تقرير الباحث الاجتماعي وتدوين توصياته قبل إصدار هذا التدبير (م 57). يمكنك المتابعة بالتوثيق وتعديل التفاصيل لاحقاً.',
                    );
                }
            }
        }

        const isExpiration = decisionType === 'expiration';
        const expirationReason = closer.closureExpirationReason;
        const expirationDefendantIds = Array.isArray(closer.closureExpirationDefendantIds)
            ? closer.closureExpirationDefendantIds
                  .map((x) => String(x ?? '').trim())
                  .filter((x) => x.length > 0)
            : [];
        if (isExpiration) {
            const expirationValidation = validateExpirationReasonSelection(
                expirationReason,
                closer.closureExpirationCustomDetail,
            );
            if (expirationValidation || !expirationDefendantIds.length) {
                closer.setStageCloserError(
                    expirationValidation || 'حدّد متهماً واحداً على الأقل مشمولاً بالانقضاء.',
                );
                return;
            }
        }
        const expirationReasonValue: StageConclusion['expirationReason'] | undefined =
            isExpiration && expirationReason ? expirationReason : undefined;
        const expirationDetailsValue =
            isExpiration && expirationReason === 'custom_manual'
                ? closer.closureExpirationCustomDetail.trim() || closer.closureDetails.trim()
                : closer.closureDetails.trim();

        const isReferral = decisionType === 'referral';
        const isCaseSplit = decisionType === 'case_split_fugitive_referral';
        const referralStage = closer.closureReferralStage;
        const referralCourtName = closer.closureReferralCourtName.trim();
        const referralCaseNumber = closer.closureReferralCaseNumber.trim();
        if ((isReferral || isCaseSplit) && (!referralStage || !referralCourtName || !referralCaseNumber)) return;
        if ((isReferral || isCaseSplit) && !isReferralStageValue(referralStage)) return;

        const needsRouteCourt =
            decisionType === 'misdemeanor_to_felony_jurisdiction' ||
            decisionType === 'felony_to_misdemeanor_jurisdiction';

        const referralArg =
            (isReferral || isCaseSplit) && isReferralStageValue(referralStage)
                ? {
                      stage: referralStage,
                      courtName: referralCourtName,
                      caseNumber: referralCaseNumber,
                  }
                : needsRouteCourt
                  ? {
                        stage:
                            decisionType === 'misdemeanor_to_felony_jurisdiction'
                                ? ('محكمة الجنايات' as const)
                                : ('محكمة الجنح' as const),
                        courtName: referralCourtName,
                        caseNumber: referralCaseNumber,
                    }
                  : undefined;

        const detailsBase =
            isExpiration && expirationReason === 'custom_manual'
                ? expirationDetailsValue || detailsRaw
                : detailsRaw;
        const details = closer.closureSuspendedExecution ? `إيقاف تنفيذ: ${detailsBase}` : detailsBase;
        const punishmentType = closer.closurePunishmentType;
        if (
            decisionType === 'conviction' &&
            punishmentType !== 'death' &&
            punishmentType !== 'life' &&
            punishmentType !== 'other'
        )
            return;

        const isClosureQuash = isCassationClosureQuashDecision(decisionType);
        const needsPersonalBeneficiaries = isClosureQuash && !closer.closureSharedObjective269b;
        const scopeIds = isExpiration
            ? expirationDefendantIds
            : isClosureQuash && closer.closureSharedObjective269b
              ? defendants.map((d) => d.id)
              : decisionRequiresDefendantScope(decisionType)
                ? resolveEffectiveDefendantScopeIds(defendants, closer.closureScopedDefendantIds)
                : undefined;
        if (needsPersonalBeneficiaries && !(scopeIds?.length ?? 0)) {
            closer.setStageCloserError('حدّد الطاعن/المستفيدين من النقض (أسباب شخصية — م 269/ب).');
            return;
        }
        if (
            decisionRequiresDefendantScope(decisionType) &&
            shouldShowDefendantDecisionScopePicker(defendants) &&
            !isClosureQuash &&
            !(scopeIds?.length ?? 0)
        ) {
            closer.setStageCloserError('حدّد متهماً واحداً على الأقل مشمولاً بالقرار.');
            return;
        }

        const conclusion: StageConclusion = {
            id:
                globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
                    ? globalThis.crypto.randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            stageType,
            decisionType,
            date,
            details,
            defendantStatusAtDecision: closer.closureDefendantStatus,
            defendantIds: scopeIds?.length ? scopeIds : undefined,
            targetDefendantIds: scopeIds?.length ? scopeIds : undefined,
            sharedObjectiveGrounds269b: isClosureQuash ? closer.closureSharedObjective269b : undefined,
            punishmentType: decisionType === 'conviction' ? punishmentType : undefined,
            expirationReason: expirationReasonValue,
        };

        if (decisionType === 'referral' && referralArg) {
            referAndGenerateCase(caseId, referralArg.stage, conclusion, {
                courtName: referralArg.courtName,
                caseNumber: referralArg.caseNumber,
            });
        } else {
            const err = issueStageDecision(caseId, conclusion, referralArg);
            if (err) {
                closer.setStageCloserError(err);
                return;
            }
        }

        closer.setStageCloserReferralOnly(false);
        closer.setIsStageCloserOpen(false);
    };

    return { submitPrivateRightWaiverDecision, submitStageCloser };
}
