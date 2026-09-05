import { useRef, useState } from 'react';
import { getLegalRole } from '../../lawyerShared/legalRoleLabels';
import { resolveHeaderPartyColumnLabel } from '../smartFile/partyRoleClassification';
import type { CaseStage, IncidentalCase } from '../../LawyerShared';
import { filterHeaderIncidentalCases, groupPartiesForHeader } from '../smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';
import { resolveCrossAppealEligibility } from '../smartFile/crossAppealEngine';
import {
    shouldShowOpponentAppealRegisterButton,
    isAppealStageName,
    isCassationStageName,
} from '../smartFile/judgmentTypes';
import { isCassationCorrectionStageName } from '../smartFile/extraordinaryAppealGateway';
import { isLockedPriorStage, shouldShowFirstInstancePleadingLockUi } from '../smartFile/stageInit';
import {
    resolveLawsuitTypeLabel,
    formatClaimValueDisplay,
} from './smartHeaderPresentation';
import type { SmartHeaderProps } from './smartHeaderTypes';
import { resolveCourtReferralDisplay } from '@/app/domain/lawsuit/courtReferral';

export function useSmartHeaderDerivedState(props: SmartHeaderProps) {
    const {
        formData,
        isPaused,
        incidentalCases = [],
        stages = [],
        status = 'نشطة',
        isReadOnly = false,
        isPleadingsClosed = false,
        pleadingDoorReopened = false,
        thirdParties = [],
        crossAppealEligibility: crossAppealEligibilityProp,
        onAddCrossAppeal,
        onCancelCrossAppeal,
    } = props;

    const partiesSectionRef = useRef<HTMLDivElement>(null);
    const [showClaimValue, setShowClaimValue] = useState(false);
    const [showPreviousCourt, setShowPreviousCourt] = useState(false);

    const partiesList = Array.isArray(formData?.parties) && formData.parties.length > 0
        ? formData.parties
        : resolveDisplayParties({
            displayStage: formData,
            allStages: Array.isArray(stages) ? (stages as CaseStage[]) : [],
        });
    const { plaintiffs, defendants, interpleaders } = groupPartiesForHeader(partiesList);

    const crossAppealEligibility = crossAppealEligibilityProp ?? resolveCrossAppealEligibility({
        appealStage: formData as CaseStage,
        stages: [],
        appealStageIndex: -1,
    });

    const activeStage = formData.extraordinaryType || formData.stageName;
    const p1Role =
        resolveHeaderPartyColumnLabel(plaintiffs, plaintiffs.length)
        ?? getLegalRole(activeStage, 1, plaintiffs.length, formData.extraordinaryType);
    const p2Role =
        resolveHeaderPartyColumnLabel(defendants, defendants.length)
        ?? getLegalRole(activeStage, 2, defendants.length, formData.extraordinaryType);

    const hasAppealContext =
        isAppealStageName(formData?.stageName) ||
        isCassationStageName(formData?.stageName) ||
        formData?.extraordinaryType ||
        formData?.extraordinaryAppealType;
    const hasFirstInstanceData = formData?.firstInstanceCaseNumber && formData?.firstInstanceCourt;

    const isCassation = isCassationStageName(formData?.stageName);
    const isCorrectionStage = isCassationCorrectionStageName(formData?.stageName);
    const isAppealStage = isAppealStageName(formData?.stageName);
    const rawCourtName = String(formData?.court || '').trim();
    const courtReferralView = resolveCourtReferralDisplay(formData ?? {});
    const rawJudgeName = String(
        formData?.judge ??
            formData?.judgeName ??
            (formData as Record<string, unknown> | undefined)?.judge_name ??
            (formData as Record<string, unknown> | undefined)?.judgeName_ar ??
            ((formData as Record<string, unknown> | undefined)?.details as Record<string, unknown> | undefined)?.judge ??
            ((formData as Record<string, unknown> | undefined)?.details as Record<string, unknown> | undefined)?.judgeName ??
            '',
    ).trim();
    const courtName =
        courtReferralView.displayCourt ||
        rawCourtName ||
        (isCassation ? 'محكمة التمييز الاتحادية' : isAppealStage ? '' : 'المحكمة المختصة');
    const showJudgeChip =
        !isCassation
        && !isCorrectionStage
        && !isAppealStageName(formData?.stageName);
    /** التمييز/التصحيح دائماً محكمة التمييز الاتحادية — لا حاجة لعرض الحقل */
    const showCourtChip = !isCassation && !isCorrectionStage;
    const judgeChipValue = rawJudgeName;
    const lawsuitTypeLabel = resolveLawsuitTypeLabel(formData);
    const claimValueLabel = formatClaimValueDisplay(formData?.claimValue);
    const awaitingOpponentAppeal = shouldShowOpponentAppealRegisterButton(
        {
            finalDecision: formData?.finalDecision,
            isPleadingsClosed,
            appealDeadline: formData?.appealDeadline,
            pleadingDoorReopened: pleadingDoorReopened || formData?.pleadingDoorReopened,
            awaitingOpponentAppeal: formData?.awaitingOpponentAppeal,
            stageName: formData?.stageName,
            status: formData?.status,
        },
        status,
    );
    const showPleadingLockChrome = shouldShowFirstInstancePleadingLockUi(
        formData as { isPleadingsClosed?: boolean; status?: string; stageName?: string; awaitingOpponentAppeal?: boolean },
    );
    const isLockedArchive = isLockedPriorStage(
        formData as { status?: string },
    );

    const activeThirdPartyCases = filterHeaderIncidentalCases(
        Array.isArray(incidentalCases) ? incidentalCases : [],
    ).filter(
        (c): c is IncidentalCase =>
            Boolean(
                c &&
                    typeof c === 'object' &&
                    c.type === 'thirdParty' &&
                    c.status === 'active',
            ),
    );
    const affiliativeThirdParties = activeThirdPartyCases.filter((c) => c.thirdPartyEntryMode === 'affiliative');
    const selfClaimThirdParties = activeThirdPartyCases.filter(
        (c) => c.thirdPartyEntryMode === 'selfClaim' || !c.thirdPartyEntryMode,
    );
    const hasHeaderActions =
        Boolean(
            !isCassation &&
                !isReadOnly &&
                (!isPleadingsClosed || isAppealStageName(formData?.stageName)) &&
                ((isAppealStageName(formData?.stageName) && crossAppealEligibility.showButton && onAddCrossAppeal) ||
                    (isAppealStageName(formData?.stageName) &&
                        crossAppealEligibility.filedCrossAppellants.length > 0 &&
                        onCancelCrossAppeal)),
        );

    const containerStyle = isPaused
        ? 'rounded-xl mb-1.5 relative border border-rose-500/16 bg-rose-500/[0.03]'
        : 'rounded-xl mb-1.5 relative border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12]';

    const hasPartiesSection =
        plaintiffs.length > 0 || defendants.length > 0 || interpleaders.length > 0
        || (thirdParties && thirdParties.length > 0)
        || activeThirdPartyCases.length > 0;

    return {
        partiesSectionRef,
        showClaimValue,
        setShowClaimValue,
        showPreviousCourt,
        setShowPreviousCourt,
        plaintiffs,
        defendants,
        interpleaders,
        crossAppealEligibility,
        p1Role,
        p2Role,
        hasAppealContext,
        hasFirstInstanceData,
        isCassation,
        isAppealStage,
        courtReferralView,
        courtName,
        showCourtChip,
        showJudgeChip,
        judgeChipValue,
        lawsuitTypeLabel,
        claimValueLabel,
        awaitingOpponentAppeal,
        showPleadingLockChrome,
        isLockedArchive,
        activeThirdPartyCases,
        affiliativeThirdParties,
        selfClaimThirdParties,
        hasHeaderActions,
        containerStyle,
        hasPartiesSection,
    };
}
