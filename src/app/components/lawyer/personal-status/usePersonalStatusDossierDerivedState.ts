import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    isCassationStageName,
    shouldShowOpponentAppealRegisterButton,
} from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';
import { isAbsentObjectionStageName } from '@/app/components/lawyer/smart-modal/smartFile/absentJudgmentFlow';
import {
    isPersonalStatusCoreStage,
    shouldShowPersonalStatusCassationOutcomePanel,
} from './personalStatusStageDisplay';
import { shouldShowAbsentJudgmentFooter } from '@/app/components/lawyer/smart-modal/smartFile/absentJudgmentFlow';

export type PersonalStatusDossierDerivedInput = {
    status: string;
    isViewingArchived: boolean;
    displayStage?: CaseStage | null;
    viewingStageIndex: number;
    activeStageIndex: number;
    /** من useSmartFileMainPanelLayout — يُمرَّر عند التوفر لتفادي ازدواج منطق petition void */
    showAbsentJudgmentFooterFromLayout?: boolean;
    showPetitionVoidFooterFromLayout?: boolean;
};

export function derivePersonalStatusDossierFlags(input: PersonalStatusDossierDerivedInput) {
    const {
        status,
        isViewingArchived,
        displayStage,
        viewingStageIndex,
        activeStageIndex,
        showAbsentJudgmentFooterFromLayout,
        showPetitionVoidFooterFromLayout,
    } = input;

    const isCassationStage = isCassationStageName(displayStage?.stageName);
    const isWaitingView =
        !isViewingArchived && !isCassationStage && Boolean(displayStage?.isPleadingsClosed);

    const showAbsentJudgmentFooter =
        showAbsentJudgmentFooterFromLayout ?? shouldShowAbsentJudgmentFooter(displayStage);
    const showPetitionVoidFooter = showPetitionVoidFooterFromLayout ?? false;

    const showPersonalOpponentAppeal =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        Boolean(displayStage?.isPleadingsClosed) &&
        isPersonalStatusCoreStage(displayStage?.stageName) &&
        !showAbsentJudgmentFooter &&
        (
            shouldShowOpponentAppealRegisterButton(
                {
                    finalDecision: displayStage?.finalDecision,
                    isPleadingsClosed: displayStage?.isPleadingsClosed,
                    appealDeadline: displayStage?.appealDeadline,
                    wasReopened: displayStage?.wasReopened,
                    awaitingOpponentAppeal: displayStage?.awaitingOpponentAppeal,
                    stageName: displayStage?.stageName,
                    status: displayStage?.status,
                },
                status,
            )
            || (String(status).includes('بانتظار') && Boolean(displayStage?.finalDecision))
        );

    const showWorkSections =
        !isViewingArchived && !isCassationStage && !displayStage?.isPleadingsClosed;
    const showPleadingControls = !isViewingArchived && !isCassationStage;
    const showPersonalPleadingFooter =
        showPleadingControls &&
        !showPersonalOpponentAppeal &&
        !showAbsentJudgmentFooter &&
        !showPetitionVoidFooter;

    const showCloseJudgment =
        showPleadingControls &&
        (!displayStage?.isPleadingsClosed ||
            Boolean(displayStage?.isUnderObjection) ||
            isAbsentObjectionStageName(displayStage?.stageName));

    const showStageFooterBar =
        isViewingArchived || showAbsentJudgmentFooter || showPetitionVoidFooter;

    const showCassationOutcomePanel = shouldShowPersonalStatusCassationOutcomePanel({
        stage: displayStage,
        isViewingArchived,
        viewingStageIndex,
        activeStageIndex,
    });

    return {
        isCassationStage,
        isWaitingView,
        showPersonalOpponentAppeal,
        showWorkSections,
        showPleadingControls,
        showPersonalPleadingFooter,
        showCloseJudgment,
        showAbsentJudgmentFooter,
        showPetitionVoidFooter,
        showStageFooterBar,
        showCassationOutcomePanel,
    };
}
