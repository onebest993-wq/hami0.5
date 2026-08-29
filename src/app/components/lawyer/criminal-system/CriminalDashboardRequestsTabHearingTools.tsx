import React from 'react';
import { TrialHearingDateHint } from './components/TrialHearingDateHint';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

export type CriminalDashboardRequestsTabHearingToolsProps = {
    showInitialTrialHearingCta: boolean;
    showTrialHearingDateHint: boolean;
    scheduledHearingDate: string;
    onOpenTrialHearingDateModal: () => void;
};

export function CriminalDashboardRequestsTabHearingTools(
    props: CriminalDashboardRequestsTabHearingToolsProps,
) {
    const {
        showInitialTrialHearingCta,
        showTrialHearingDateHint,
        scheduledHearingDate,
        onOpenTrialHearingDateModal,
    } = props;

    return (
        <>
            {showInitialTrialHearingCta ? (
                <div className="flex justify-center print:hidden">
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateOpen}
                        onClick={onOpenTrialHearingDateModal}
                        className="min-h-[44px] rounded-xl border border-[#E6C673]/50 bg-[#E6C673] px-5 text-sm font-black text-[#0B1021] hover:brightness-110 active:brightness-95 transition touch-manipulation"
                    >
                        تسجيل موعد المحاكمة
                    </button>
                </div>
            ) : null}

            {showTrialHearingDateHint ? (
                <div className="print:hidden">
                    <TrialHearingDateHint hearingDate={scheduledHearingDate} />
                </div>
            ) : null}
        </>
    );
}
