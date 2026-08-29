import type { TrialSession } from '../trialSessionsEngine';
import { sanitizeTrialSessionIsoDateInput } from '../trialSessionsEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';

export type TrialsPostponeModalProps = {
    postponeSession: TrialSession;
    nextDate: string;
    setNextDate: (v: string) => void;
    postponeReason: string;
    setPostponeReason: (v: string) => void;
    prepNote: string;
    setPrepNote: (v: string) => void;
    onClose: () => void;
    onConfirm: () => void;
};

export function TrialsPostponeModal({
    postponeSession,
    nextDate,
    setNextDate,
    postponeReason,
    setPostponeReason,
    prepNote,
    setPrepNote,
    onClose,
    onConfirm,
}: TrialsPostponeModalProps) {
    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.trialPostpone}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div className="text-white font-black text-sm">
                        تأجيل الجلسة {postponeSession.sessionNumber}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 text-xs font-bold"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <input
                        type="date"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white unicode-bidi-plaintext"
                        dir="ltr"
                        value={nextDate}
                        onChange={(e) =>
                            setNextDate(sanitizeTrialSessionIsoDateInput(e.target.value))
                        }
                    />
                    <textarea
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[72px] resize-none"
                        placeholder="سبب التأجيل"
                        value={postponeReason}
                        onChange={(e) => setPostponeReason(e.target.value)}
                    />
                    <textarea
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-amber-50 min-h-[72px] resize-none"
                        placeholder="الواجب التحضيري للمحامي"
                        value={prepNote}
                        onChange={(e) => setPrepNote(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-white/70"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-xl bg-amber-600/80 px-4 py-2 text-sm font-black text-white"
                        >
                            تأكيد التأجيل
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
}
