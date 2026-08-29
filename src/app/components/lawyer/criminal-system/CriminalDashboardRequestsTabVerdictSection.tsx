import React, { Suspense } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant } from './criminalStore';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { VerdictCardsPanelProps } from './components/VerdictCardsPanel';
import type { VerdictCard } from './verdictCardsEngine';
import { LazyVerdictCardsPanel } from './criminalDashboardLazyRegistry';

type VerdictDraft = Parameters<VerdictCardsPanelProps['onUpdateDraft']>[1];
type VerdictOrdinaryAppealPatch = Parameters<VerdictCardsPanelProps['onSaveOrdinaryAppeal']>[1];
type VerdictCassationResultInput = Parameters<VerdictCardsPanelProps['onSaveVerdictCassationResult']>[1];
type VerdictCorrectionAppealPatch = Parameters<VerdictCardsPanelProps['onSaveCorrectionAppeal']>[1];

export type CriminalDashboardRequestsTabVerdictSectionProps = {
    id: string;
    showTrialsTab: boolean;
    decisionsKindFilter: string;
    effectiveDecisionsScope: string;
    currentVerdictCardsForPanel: VerdictCard[];
    defendants: CriminalDefendant[];
    effectiveUiStage: CaseStage;
    caseStage: CaseStage;
    criminalCase: CriminalCase;
    isDecisionsTabMaterialReadOnly: boolean;
    criminalCaseUserRole?: CriminalCaseUserRole;
    sendToCassationOnVerdictCard?: VerdictCardsPanelProps['sendToCassation'];
    updateVerdictCardDraft: (caseId: string, cardId: string, draft: VerdictDraft) => void;
    patchVerdictCardOrdinaryAppeal: (
        caseId: string,
        cardId: string,
        patch: VerdictOrdinaryAppealPatch,
    ) => void;
    recordVerdictCardCassationResult: (
        caseId: string,
        cardId: string,
        input: VerdictCassationResultInput,
    ) => string | null | void;
    patchVerdictCardCorrectionAppeal: (
        caseId: string,
        cardId: string,
        patch: VerdictCorrectionAppealPatch,
    ) => void;
    recordVerdictAbsentiaPublication: (caseId: string, cardId: string, publicationDate: string) => string | null | void;
    recordVerdictAbsentiaObjection: (caseId: string, cardId: string) => string | null | void;
    openVerdictCassationFiling: (cardId: string) => void;
    showLegalToast: (message: string, duration?: number) => void;
};

export function CriminalDashboardRequestsTabVerdictSection(
    props: CriminalDashboardRequestsTabVerdictSectionProps,
) {
    const {
        id,
        showTrialsTab,
        decisionsKindFilter,
        effectiveDecisionsScope,
        currentVerdictCardsForPanel,
        defendants,
        effectiveUiStage,
        caseStage,
        criminalCase,
        isDecisionsTabMaterialReadOnly,
        criminalCaseUserRole,
        sendToCassationOnVerdictCard,
        updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal,
        recordVerdictCardCassationResult,
        patchVerdictCardCorrectionAppeal,
        recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection,
        openVerdictCassationFiling,
        showLegalToast,
    } = props;

    if (
        !(
            showTrialsTab &&
            decisionsKindFilter === 'trial_sessions' &&
            effectiveDecisionsScope === 'current'
        )
    ) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <LazyVerdictCardsPanel
                cards={currentVerdictCardsForPanel}
                defendants={defendants}
                caseStage={
                    effectiveUiStage === 'felony' || effectiveUiStage === 'misdemeanor'
                        ? effectiveUiStage
                        : caseStage
                }
                currentAccusationArticle={
                    criminalCase.currentAccusationArticle ?? criminalCase.basics.legalArticle
                }
                crimeType={criminalCase.basics.crimeType}
                readOnly={isDecisionsTabMaterialReadOnly}
                userRole={criminalCaseUserRole}
                sendToCassation={sendToCassationOnVerdictCard}
                onUpdateDraft={(cardId: string, draft: VerdictDraft) => updateVerdictCardDraft(id, cardId, draft)}
                onSaveOrdinaryAppeal={(cardId: string, patch: VerdictOrdinaryAppealPatch) =>
                    patchVerdictCardOrdinaryAppeal(id, cardId, patch)
                }
                onSaveVerdictCassationResult={(cardId: string, input: VerdictCassationResultInput) => {
                    const err = recordVerdictCardCassationResult(id, cardId, input);
                    if (err) {
                        showLegalToast(err, 4500);
                        return err;
                    }
                    showLegalToast('✓ تم تسجيل قرار التمييز.', 4500);
                    return null;
                }}
                onSaveCorrectionAppeal={(cardId: string, patch: VerdictCorrectionAppealPatch) =>
                    patchVerdictCardCorrectionAppeal(id, cardId, patch)
                }
                onRecordAbsentiaPublication={(cardId: string, publicationDate: string) => {
                    const err = recordVerdictAbsentiaPublication(id, cardId, publicationDate);
                    if (err) {
                        showLegalToast(err, 4500);
                    }
                }}
                onRecordAbsentiaObjection={(cardId: string) => {
                    const err = recordVerdictAbsentiaObjection(id, cardId);
                    if (err) {
                        showLegalToast(err, 4500);
                        return;
                    }
                    showLegalToast('✓ تم تسجيل الاعتراض الغيابي.', 4500);
                }}
                onOpenCassationFiling={openVerdictCassationFiling}
            />
        </Suspense>
    );
}
