import { useState } from 'react';
import {
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
} from '../../smartFile/caseConsolidationLinking';
import { readIncidentalLink, readLinkedChildIncidentalCases } from '../../smartFile/incidentalCaseLinking';
import { readCaseLinks, resolveCaseLinkBrowseUi } from '../../smartFile/caseLinking';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import { resolveDisplayParties } from '../../smartFile/resolveDisplayParties';
import { resolvePleadingStageLabel } from '../../smartFile/pleadingStageClassification';
import { pickNonemptyString } from './smartFileMainPanelUtils';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';
import { resolveSmartFileMainPanelFooterFlags } from './resolveSmartFileMainPanelFooterFlags';
import { buildSmartFileMainPanelFooterPanels } from './buildSmartFileMainPanelFooterPanels';

export function useSmartFileMainPanelLayout(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        onAbsentJudgmentNotification,
        setShowAppealModal,
        isPaused,
        isInterrupted,
        setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal,
        setShowPauseResumeModal,
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handleOpponentAppealWaived,
        handleReopenPleadings,
    } = p;

    const incidentalParentLink = readIncidentalLink(file);
    const linkedChildIncidentalCases = incidentalParentLink
        ? []
        : readLinkedChildIncidentalCases(displayStage?.incidentalCases);
    const caseLinks = (() => {
        const seen = new Set<string>();
        const merged = [...readCaseLinks(file), ...(parentData.caseLinks ?? [])];
        return merged.filter((link) => {
            if (!link?.id || seen.has(link.id)) return false;
            seen.add(link.id);
            return true;
        });
    })();
    const externalCaseLinks = caseLinks.filter((l) => l.isExternal);
    const internalCaseLink = resolveCaseLinkBrowseUi(
        file,
        parentData as Record<string, unknown> | null | undefined,
        p.lawsuitFiles ?? [],
    );
    const consolidationRefs = readConsolidationSecondaryRefs(
        { ...file, consolidationSecondaryRefs: parentData.consolidationSecondaryRefs },
        displayStage,
    );
    const consolidatedSecondaryLabel = formatConsolidatedChipLabel(consolidationRefs);
    const externalConsolidationRefs = consolidationRefs.filter((r) => r.isExternal);
    const primaryCaseNo = pickNonemptyString(displayStage?.caseNo, file?.caseNo, parentData.caseNo);
    const primaryDocType = pickNonemptyString(
        displayStage?.docType,
        (displayStage as { type?: string } | undefined)?.type,
        parentData.docType,
        file?.docType,
    );
    const headerParties = resolveDisplayParties({
        displayStage,
        file,
        parentData,
        allStages: stages,
    });
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
    const timelineEventCount = displayTimeline.length;
    const crossAppealEligibility = resolveCrossAppealEligibility({
        appealStage: displayStage,
        stages,
        appealStageIndex: viewingStageIndex,
    });
    const displayStageLabel = resolvePleadingStageLabel(displayStage);
    const currentStageLabel = resolvePleadingStageLabel(currentStage);

    const footerFlags = resolveSmartFileMainPanelFooterFlags({
        status,
        isViewingArchived,
        parentData,
        displayStage,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isPaused,
        isInterrupted,
        displayStageLabel,
        currentStageLabel,
    });

    const footerPanels = buildSmartFileMainPanelFooterPanels({
        displayStage,
        currentStage,
        stages,
        parentData,
        onAbsentJudgmentNotification,
        setShowAppealModal,
        setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal,
        setShowPauseResumeModal,
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handleOpponentAppealWaived,
        handleReopenPleadings,
        showAbsentJudgmentFooter: footerFlags.showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective: footerFlags.showOpponentAppealBtnEffective,
        showAppealStageFooter: footerFlags.showAppealStageFooter,
        appealStageFooter: footerFlags.appealStageFooter,
        showPetitionVoidFooter: footerFlags.showPetitionVoidFooter,
        showPostJudgmentAppealFooter: footerFlags.showPostJudgmentAppealFooter,
        showFlowStatusFooter: footerFlags.showFlowStatusFooter,
        showFlowAbandonmentFooter: footerFlags.showFlowAbandonmentFooter,
        showFlowPauseFooter: footerFlags.showFlowPauseFooter,
    });

    return {
        incidentalParentLink,
        linkedChildIncidentalCases,
        externalCaseLinks,
        internalCaseLink,
        consolidatedSecondaryLabel,
        externalConsolidationRefs,
        primaryCaseNo,
        primaryDocType,
        headerParties,
        isTimelineExpanded,
        setIsTimelineExpanded,
        timelineEventCount,
        crossAppealEligibility,
        showOpponentAppealBtn: footerFlags.showOpponentAppealBtn,
        showFirstInstanceIncidentalUi: footerFlags.showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter: footerFlags.showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective: footerFlags.showOpponentAppealBtnEffective,
        showPostJudgmentAppealFooter: footerFlags.showPostJudgmentAppealFooter,
        appealStageFooter: footerFlags.appealStageFooter,
        showAppealStageFooter: footerFlags.showAppealStageFooter,
        showPetitionVoidFooter: footerFlags.showPetitionVoidFooter,
        showPleadingCloseFooter: footerFlags.showPleadingCloseFooter,
        showFlowStatusFooter: footerFlags.showFlowStatusFooter,
        quickActionsVariant: footerFlags.quickActionsVariant,
        ...footerPanels,
    };
}
