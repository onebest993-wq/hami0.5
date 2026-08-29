import { describe, expect, it } from 'vitest';
import { derivePersonalStatusDossierFlags } from './usePersonalStatusDossierDerivedState';

describe('derivePersonalStatusDossierFlags', () => {
    it('hides work sections when viewing archived stage', () => {
        const flags = derivePersonalStatusDossierFlags({
            status: 'active',
            isViewingArchived: true,
            displayStage: {
                id: 's1',
                stageName: 'أحوال شخصية',
                status: 'completed',
                isPleadingsClosed: false,
            },
            viewingStageIndex: 0,
            activeStageIndex: 1,
        });
        expect(flags.showWorkSections).toBe(false);
        expect(flags.showStageFooterBar).toBe(true);
    });

    it('shows work sections on active personal core stage', () => {
        const flags = derivePersonalStatusDossierFlags({
            status: 'active',
            isViewingArchived: false,
            displayStage: {
                id: 's1',
                stageName: 'أحوال شخصية',
                status: 'active',
                isPleadingsClosed: false,
            },
            viewingStageIndex: 0,
            activeStageIndex: 0,
        });
        expect(flags.showWorkSections).toBe(true);
        expect(flags.isCassationStage).toBe(false);
    });

    it('shows opponent appeal panel when layout flags opponent registration', () => {
        const flags = derivePersonalStatusDossierFlags({
            status: 'بانتظار الطعن',
            isViewingArchived: false,
            displayStage: {
                id: 's1',
                stageName: 'أحوال شخصية',
                status: 'active',
                isPleadingsClosed: true,
                awaitingOpponentAppeal: true,
                finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
            },
            viewingStageIndex: 0,
            activeStageIndex: 0,
            showOpponentAppealBtnEffectiveFromLayout: true,
        });
        expect(flags.showPersonalOpponentAppeal).toBe(true);
        expect(flags.showPersonalPleadingFooter).toBe(false);
    });

    it('hides pleading reopen after judgment decision (e.g. absent-objection outcome)', () => {
        const flags = derivePersonalStatusDossierFlags({
            status: 'بانتظار الطعن',
            isViewingArchived: false,
            displayStage: {
                id: 's1',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                isPleadingsClosed: true,
                finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
            },
            viewingStageIndex: 0,
            activeStageIndex: 0,
        });
        expect(flags.isWaitingView).toBe(true);
        expect(flags.showPersonalPleadingFooter).toBe(false);
        expect(flags.showCloseJudgment).toBe(false);
    });

    it('forces mutation sections/footers off when case-link view-only', () => {
        const flags = derivePersonalStatusDossierFlags({
            status: 'بانتظار الطعن',
            isViewingArchived: false,
            isCaseLinkViewOnly: true,
            displayStage: {
                id: 's1',
                stageName: 'أحوال شخصية',
                status: 'active',
                isPleadingsClosed: false,
            },
            viewingStageIndex: 0,
            activeStageIndex: 0,
            showOpponentAppealBtnEffectiveFromLayout: true,
            showAbsentJudgmentFooterFromLayout: true,
            showPetitionVoidFooterFromLayout: true,
        });
        expect(flags.showWorkSections).toBe(false);
        expect(flags.showPleadingControls).toBe(false);
        expect(flags.showPersonalPleadingFooter).toBe(false);
        expect(flags.showPersonalOpponentAppeal).toBe(false);
        expect(flags.showAbsentJudgmentFooter).toBe(false);
        expect(flags.showPetitionVoidFooter).toBe(false);
        expect(flags.showStageFooterBar).toBe(false);
        expect(flags.isWaitingView).toBe(false);
    });
});
