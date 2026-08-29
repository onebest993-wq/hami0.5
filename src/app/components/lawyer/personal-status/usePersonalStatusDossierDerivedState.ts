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

type PersonalStatusDossierDerivedInput = {
    status: string;
    isViewingArchived: boolean;
    /** اطّلاع على إضبارة مربوطة — يقفل التعديل مثل الأرشيف مع إخفاء تذييلات الحكم/الطعن */
    isCaseLinkViewOnly?: boolean;
    displayStage?: CaseStage | null;
    viewingStageIndex: number;
    activeStageIndex: number;
    representedParty?: string | null;
    /** من useSmartFileMainPanelLayout — يُمرَّر عند التوفر لتفادي ازدواج منطق petition void */
    showAbsentJudgmentFooterFromLayout?: boolean;
    showPetitionVoidFooterFromLayout?: boolean;
    showOpponentAppealBtnEffectiveFromLayout?: boolean;
};

export function derivePersonalStatusDossierFlags(input: PersonalStatusDossierDerivedInput) {
    const {
        status,
        isViewingArchived,
        isCaseLinkViewOnly = false,
        displayStage,
        viewingStageIndex,
        activeStageIndex,
        representedParty,
        showAbsentJudgmentFooterFromLayout,
        showPetitionVoidFooterFromLayout,
        showOpponentAppealBtnEffectiveFromLayout,
    } = input;

    const interactionLocked = isViewingArchived || isCaseLinkViewOnly;

    const isCassationStage = isCassationStageName(displayStage?.stageName);
    const isWaitingView =
        !interactionLocked && !isCassationStage && Boolean(displayStage?.isPleadingsClosed);

    // case-link view-only: force judgment/appeal/void footers off (mirror civil SmartFileMainPanel)
    const showAbsentJudgmentFooter = isCaseLinkViewOnly
        ? false
        : (showAbsentJudgmentFooterFromLayout ?? shouldShowAbsentJudgmentFooter(displayStage));
    const showPetitionVoidFooter = isCaseLinkViewOnly
        ? false
        : (showPetitionVoidFooterFromLayout ?? false);

    const showPersonalOpponentAppeal =
        !interactionLocked &&
        viewingStageIndex === activeStageIndex &&
        (
            showOpponentAppealBtnEffectiveFromLayout
            || (
                Boolean(displayStage?.isPleadingsClosed)
                && isPersonalStatusCoreStage(displayStage?.stageName)
                && !showAbsentJudgmentFooter
                && (
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
                        representedParty,
                    )
                    || (String(status).includes('بانتظار') && Boolean(displayStage?.finalDecision))
                )
            )
        );

    const hasJudgmentDecision = Boolean(String(displayStage?.finalDecision ?? '').trim());

    const showWorkSections =
        !interactionLocked && !isCassationStage && !displayStage?.isPleadingsClosed;
    const showPleadingControls = !interactionLocked && !isCassationStage;
    /*
     * بعد إدخال نتيجة الحكم (بما فيها الاعتراض الغيابي) لا تُعرض «محجوزة/فتح المرافعة» —
     * إما لوحة طعن الخصم أو انتظار، لا إعادة فتح المرافعة.
     */
    const showPersonalPleadingFooter =
        showPleadingControls &&
        !(displayStage?.isPleadingsClosed && hasJudgmentDecision) &&
        !showPersonalOpponentAppeal &&
        !showAbsentJudgmentFooter &&
        !showPetitionVoidFooter;

    const showCloseJudgment =
        showPleadingControls &&
        !hasJudgmentDecision &&
        (!displayStage?.isPleadingsClosed ||
            Boolean(displayStage?.isUnderObjection) ||
            isAbsentObjectionStageName(displayStage?.stageName));

    // archived still shows stage footer shell; case-link view-only does not (footers forced off)
    const showStageFooterBar =
        isViewingArchived || showAbsentJudgmentFooter || showPetitionVoidFooter;

    const showCassationOutcomePanel = shouldShowPersonalStatusCassationOutcomePanel({
        stage: displayStage,
        isViewingArchived: interactionLocked,
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
