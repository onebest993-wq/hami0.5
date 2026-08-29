import { ModalIsoDateInput } from './ModalIsoDateInput';
import { JUVENILE_INVESTIGATION_DETENTION_AUTHORITY } from '../juvenileInvestigationRules';

export type RequestModalJudicialDetentionFieldsProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    reqDate: string;
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqNeedsDetentionDateRange: boolean;
    hideGlobalDetentionFields?: boolean;
    trialCourtManualOnly?: boolean;
    reqJuvenileDetentionLocked?: boolean;
    onDetentionStartChange: (value: string) => void;
    onDetentionEndChange: (value: string) => void;
};

export function RequestModalJudicialDetentionFields({
    reqEntryLane,
    reqDate,
    reqDetentionStartDate,
    reqDetentionEndDate,
    reqNeedsDetentionDateRange,
    hideGlobalDetentionFields = false,
    trialCourtManualOnly = false,
    reqJuvenileDetentionLocked = false,
    onDetentionStartChange,
    onDetentionEndChange,
}: RequestModalJudicialDetentionFieldsProps) {
    if (trialCourtManualOnly || reqEntryLane !== 'judicial') return null;

    return (
        <>
            {reqJuvenileDetentionLocked ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <div className="text-amber-100 text-xs font-black whitespace-normal break-words">
                        مكان إيداع الحدث (إجباري)
                    </div>
                    <div className="text-white font-black text-sm">{JUVENILE_INVESTIGATION_DETENTION_AUTHORITY}</div>
                    <p className="text-[10px] font-bold text-white/50 whitespace-normal break-words">
                        خيارات التوقيف الاعتيادية (المركز، مكافحة الإجرام، التسفيرات) غير متاحة للمتهم الحدث.
                    </p>
                </div>
            ) : null}
            {reqNeedsDetentionDateRange && !hideGlobalDetentionFields ? (
                <>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            تاريخ بدء التوقيف *
                        </label>
                        <ModalIsoDateInput
                            value={reqDetentionStartDate}
                            onChange={onDetentionStartChange}
                            max={reqDetentionEndDate.trim() || undefined}
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            تاريخ انتهاء التوقيف *
                        </label>
                        <ModalIsoDateInput
                            value={reqDetentionEndDate}
                            onChange={onDetentionEndChange}
                            min={reqDetentionStartDate.trim() || reqDate.trim() || undefined}
                        />
                    </div>
                </>
            ) : null}
        </>
    );
}
