import React, { useEffect, useState } from 'react';
import { CalendarClock } from '@/app/components/ui/icons/CalendarClock';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../../criminalDossierTestIds';
import {
    formatTrialSessionIsoDate,
    sanitizeTrialSessionIsoDateInput,
} from '../../trialSessionsDisplay';

export type TrialHearingDateModalProps = {
    open: boolean;
    currentDate?: string;
    onClose: () => void;
    onSave: (date: string) => string | null;
};

export function TrialHearingDateModal({
    open,
    currentDate = '',
    onClose,
    onSave,
}: TrialHearingDateModalProps): React.ReactElement | null {
    const [date, setDate] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setDate(String(currentDate ?? '').trim());
        setError('');
    }, [open, currentDate]);

    if (!open) return null;

    const handleSubmit = () => {
        const err = onSave(date.trim());
        if (err) {
            setError(err);
            return;
        }
        onClose();
    };

    const displayDate = formatTrialSessionIsoDate(String(currentDate ?? '').trim());

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.trial}>
            <div
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-lg overflow-hidden"
                data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="trial-hearing-date-title"
            >
                <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-[#E6C673]" aria-hidden />
                    <h3
                        id="trial-hearing-date-title"
                        className="text-sm font-black text-white"
                    >
                        تسجيل موعد المحاكمة
                    </h3>
                </div>

                <div className="px-4 py-4 space-y-3">
                    <p className="text-[11px] leading-relaxed text-white/50">
                        يُسجَّل موعد المرافعة كتلميح للمحامي — دون إنشاء جلسة في سجل المحاكمة.
                    </p>
                    {displayDate ? (
                        <p className="text-xs text-white/65">
                            الموعد الحالي:{' '}
                            <span className="font-bold text-[#F3E4B8] tabular-nums">{displayDate}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-amber-200/80 font-bold">لم يُسجَّل موعد محاكمة بعد.</p>
                    )}
                    <div>
                        <label
                            className="block text-white/60 text-xs mb-1 font-bold"
                            htmlFor="trial-hearing-date-input"
                        >
                            موعد المحاكمة
                        </label>
                        <input
                            id="trial-hearing-date-input"
                            type="date"
                            data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateInput}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white tabular-nums"
                            dir="ltr"
                            value={date}
                            onChange={(e) => {
                                setDate(sanitizeTrialSessionIsoDateInput(e.target.value));
                                setError('');
                            }}
                        />
                    </div>
                    {error ? (
                        <p className="text-xs font-bold text-rose-300" role="alert">{error}</p>
                    ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 bg-black/20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 rounded-xl border border-white/15 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition touch-manipulation"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateSave}
                        onClick={handleSubmit}
                        className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-black hover:brightness-110 active:brightness-95 transition touch-manipulation"
                    >
                        حفظ الموعد
                    </button>
                </div>
            </div>
        </CriminalModalPortal>
    );
}
