import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';

export type RequestsEntryModalFooterProps = {
    isRequestModalViewOnly: boolean;
    reqIsJudicialDecisionEntry: boolean;
    reqIsLawyerMotionEntry: boolean;
    isRequestFinalStatus: boolean;
    requestFormBaseValid: boolean;
    requestFormFinalValid: boolean;
    onClose: () => void;
    onSubmit: () => void;
};

export function RequestsEntryModalFooter({
    isRequestModalViewOnly,
    reqIsJudicialDecisionEntry,
    reqIsLawyerMotionEntry,
    isRequestFinalStatus,
    requestFormBaseValid,
    requestFormFinalValid,
    onClose,
    onSubmit,
}: RequestsEntryModalFooterProps) {
    return (
        <div className="flex items-center justify-end gap-2 pt-2">
            {isRequestModalViewOnly ? (
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700/60 transition whitespace-normal break-words"
                >
                    إغلاق
                </button>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestSubmit}
                        onClick={onSubmit}
                        disabled={
                            !requestFormBaseValid ||
                            (reqIsLawyerMotionEntry &&
                                isRequestFinalStatus &&
                                !requestFormFinalValid)
                        }
                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                    >
                        {reqIsJudicialDecisionEntry
                            ? 'توثيق القرار في السجل'
                            : isRequestFinalStatus
                              ? 'حفظ هامش القاضي وقفل'
                              : 'تسجيل الطلب'}
                    </button>
                </>
            )}
        </div>
    );
}
