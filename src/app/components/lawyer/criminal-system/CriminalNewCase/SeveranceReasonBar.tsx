import { isSeveranceReasonValue, SEVERANCE_REASON_SELECT_OPTIONS } from '../caseSeveranceView';
import type { CriminalStoreState } from '../criminalStore';
import { FIELD_LABEL, INPUT_BASE } from './helpers';

type SeveranceReason = NonNullable<
    NonNullable<CriminalStoreState['pendingSeveranceContext']>['severanceReason']
>;

export function SeveranceReasonBar({
    pendingSeveranceReason,
    pendingSeveranceReasonDetail,
    setPendingSeveranceReason,
}: {
    pendingSeveranceReason?: SeveranceReason;
    pendingSeveranceReasonDetail: string;
    setPendingSeveranceReason: CriminalStoreState['setPendingSeveranceReason'];
}) {
    return (
        <div className="px-4 pt-3" dir="rtl">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 space-y-2.5">
                <label className={FIELD_LABEL}>سبب التفريق (اختياري)</label>
                <select
                    className={INPUT_BASE}
                    value={pendingSeveranceReason ?? ''}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (isSeveranceReasonValue(v)) {
                            setPendingSeveranceReason(
                                v,
                                v === 'other' ? pendingSeveranceReasonDetail : undefined,
                            );
                            return;
                        }
                        setPendingSeveranceReason(undefined, undefined);
                    }}
                >
                    <option value="" className="bg-[#0B1021] text-white">
                        اختر سبب التفريق...
                    </option>
                    {SEVERANCE_REASON_SELECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0B1021] text-white">
                            {opt.label}
                        </option>
                    ))}
                </select>
                {pendingSeveranceReason === 'other' ? (
                    <div>
                        <label className={FIELD_LABEL}>يرجى كتابة سبب التفريق</label>
                        <input
                            className={INPUT_BASE}
                            value={pendingSeveranceReasonDetail}
                            onChange={(e) => setPendingSeveranceReason('other', e.target.value)}
                            placeholder="اكتب سبب التفريق..."
                            required
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
