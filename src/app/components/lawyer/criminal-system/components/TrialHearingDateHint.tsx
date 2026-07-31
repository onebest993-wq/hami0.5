import React from 'react';
import { CalendarClock } from 'lucide-react';
import { formatTrialSessionIsoDate } from '../trialSessionsEngine';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';

export type TrialHearingDateHintProps = {
    hearingDate: string;
};

/** بطاقة تلميح موعد المحاكمة — ليست جلسة مرافعة */
export function TrialHearingDateHint({ hearingDate }: TrialHearingDateHintProps): React.ReactElement {
    const date = String(hearingDate ?? '').trim();
    const formatted = formatTrialSessionIsoDate(date);

    return (
        <div
            className="flex items-center justify-between gap-3 rounded-xl border border-[#E6C673]/35 bg-gradient-to-r from-[#E6C673]/14 via-[#E6C673]/6 to-transparent px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] print:border-slate-300 print:bg-white"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateHint}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673]"
                    aria-hidden
                >
                    <CalendarClock size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-wide text-[#E6C673]/95">
                        موعد المحاكمة
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/45 print:text-black/60">
                        تلميح لموعد محاكمة الموكل — لم تُسجَّل جلسة مرافعة بعد
                    </p>
                </div>
            </div>
            <span
                className="shrink-0 text-[17px] font-black tabular-nums text-[#F3E4B8] print:text-black"
                dir="ltr"
            >
                {formatted}
            </span>
        </div>
    );
}
