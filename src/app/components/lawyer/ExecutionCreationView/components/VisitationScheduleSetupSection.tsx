import React, { useMemo } from 'react';
import { Clock, MapPin, Sparkles } from 'lucide-react';
import type { VisitationDecisionMode, VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    ARABIC_WEEKDAY_LABELS,
    MONTH_WEEK_OPTIONS,
    VISITATION_DECISION_OPTIONS,
    applyAutoResolvedAnchor,
    formatSmartFirstAppointmentMessage,
    getVisitationFieldLabels,
    resolveFirstMatchingAppointmentDate,
} from '@/app/utils/visitationScheduleEngine';
import { ecg } from './executionCreationGlassUi';

export function createEmptyVisitationScheduleDraft(
    includesSleepover = false
): Partial<VisitationScheduleConfig> {
    return {
        decisionMode: includesSleepover ? 'viewing_pickup_sleepover' : 'viewing_pickup',
        location: '',
        startTime: '',
        endTime: '',
        sleepoverNights: includesSleepover ? 1 : undefined,
        returnTime: '',
        executionStartDate: getLocalTodayYmd(),
        anchorDate: '',
        weekDays: [],
        monthWeeks: [],
    };
}

export interface VisitationScheduleSetupSectionProps {
    draft: Partial<VisitationScheduleConfig>;
    onChange: (next: Partial<VisitationScheduleConfig>) => void;
    showGenerateButton?: boolean;
    onGenerate?: () => void;
    generateButtonLabel?: string;
}

export const VisitationScheduleSetupSection: React.FC<VisitationScheduleSetupSectionProps> = ({
    draft,
    onChange,
    showGenerateButton = false,
    onGenerate,
    generateButtonLabel = 'حفظ وتوليد الجدول',
}) => {
    const fieldLabels = useMemo(
        () => getVisitationFieldLabels((draft.decisionMode ?? 'viewing_pickup') as VisitationDecisionMode),
        [draft.decisionMode]
    );

    const resolvedPreview = useMemo(() => {
        const start = String(draft.executionStartDate || getLocalTodayYmd()).trim();
        const weekDays = draft.weekDays ?? [];
        const monthWeeks = draft.monthWeeks ?? [];
        if (weekDays.length === 0 || monthWeeks.length === 0) return null;
        return resolveFirstMatchingAppointmentDate(start, weekDays, monthWeeks);
    }, [draft.executionStartDate, draft.weekDays, draft.monthWeeks]);

    const patchDraft = (patch: Partial<VisitationScheduleConfig>) => {
        onChange(applyAutoResolvedAnchor({ ...draft, ...patch }));
    };

    const toggleWeekDay = (dow: number) => {
        const set = new Set(draft.weekDays ?? []);
        if (set.has(dow)) set.delete(dow);
        else set.add(dow);
        patchDraft({ weekDays: [...set].sort((a, b) => a - b) });
    };

    const toggleMonthWeek = (w: number) => {
        const set = new Set(draft.monthWeeks ?? []);
        if (set.has(w)) set.delete(w);
        else set.add(w);
        patchDraft({ monthWeeks: [...set].sort((a, b) => a - b) });
    };

    return (
        <div className={`${ecg.subCard} space-y-4`}>
            <p className={`${ecg.subCardTitle} text-[#E6C673]`}>تأسيس الجدولة التفاعلية</p>

            <div className="space-y-2">
                <p className={ecg.labelGold}>نوع القرار</p>
                <div className="flex flex-col gap-2">
                    {VISITATION_DECISION_OPTIONS.map((opt) => (
                        <label
                            key={opt.value}
                            className={`${ecg.radioRow} ${
                                draft.decisionMode === opt.value ? ecg.radioRowActive : ecg.radioRowIdle
                            }`}
                        >
                            <input
                                type="radio"
                                name="visitationDecisionModeCreation"
                                checked={draft.decisionMode === opt.value}
                                onChange={() => patchDraft({ decisionMode: opt.value })}
                                className="accent-[#E6C673]"
                            />
                            <span className="text-sm text-slate-100">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label className={ecg.labelGold}>{fieldLabels.location}</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-slate-500" size={16} />
                    <input
                        type="text"
                        value={draft.location ?? ''}
                        onChange={(e) => patchDraft({ location: e.target.value })}
                        className={`${ecg.field} text-sm pl-10`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={ecg.labelGold}>{fieldLabels.startTime}</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-3.5 text-slate-500" size={16} />
                        <input
                            type="time"
                            value={draft.startTime ?? ''}
                            onChange={(e) => patchDraft({ startTime: e.target.value })}
                            className={`${ecg.field} text-sm pl-10`}
                        />
                    </div>
                </div>
                {fieldLabels.endTime && (
                    <div>
                        <label className={ecg.labelGold}>{fieldLabels.endTime}</label>
                        <input
                            type="time"
                            value={draft.endTime ?? ''}
                            onChange={(e) => patchDraft({ endTime: e.target.value })}
                            className={`${ecg.field} text-sm`}
                        />
                    </div>
                )}
                {fieldLabels.sleepoverNights && (
                    <div>
                        <label className={ecg.labelGold}>{fieldLabels.sleepoverNights}</label>
                        <input
                            type="number"
                            min={1}
                            max={30}
                            value={draft.sleepoverNights ?? 1}
                            onChange={(e) =>
                                patchDraft({
                                    sleepoverNights: Math.max(1, Number(e.target.value) || 1),
                                })
                            }
                            className={`${ecg.field} text-sm`}
                        />
                    </div>
                )}
                {fieldLabels.returnTime && (
                    <div>
                        <label className={ecg.labelGold}>{fieldLabels.returnTime}</label>
                        <input
                            type="time"
                            value={draft.returnTime ?? ''}
                            onChange={(e) => patchDraft({ returnTime: e.target.value })}
                            className={`${ecg.field} text-sm`}
                        />
                    </div>
                )}
            </div>

            <div>
                <label className={ecg.labelGold}>تاريخ المباشرة بالتنفيذ</label>
                <input
                    type="date"
                    value={draft.executionStartDate ?? getLocalTodayYmd()}
                    onChange={(e) => patchDraft({ executionStartDate: e.target.value })}
                    className={`${ecg.field} text-sm`}
                />
            </div>

            <div>
                <p className={ecg.labelGold}>أيام التنفيذ في الأسبوع</p>
                <div className="flex flex-wrap gap-2 justify-end">
                    {ARABIC_WEEKDAY_LABELS.map((label, dow) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => toggleWeekDay(dow)}
                            className={`${ecg.chipToggle} ${
                                (draft.weekDays ?? []).includes(dow)
                                    ? ecg.chipToggleActive
                                    : ecg.chipToggleIdle
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className={ecg.labelGold}>تكرار التنفيذ في الشهر</p>
                <div className="flex flex-wrap gap-2 justify-end">
                    {MONTH_WEEK_OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => toggleMonthWeek(value)}
                            className={`${ecg.chipToggle} ${
                                (draft.monthWeeks ?? []).includes(value)
                                    ? ecg.chipToggleActive
                                    : ecg.chipToggleIdle
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {resolvedPreview && (
                <div className={`${ecg.resultCard} flex gap-2 flex-row-reverse items-start`}>
                    <Sparkles className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-emerald-200 font-bold leading-relaxed text-right">
                        ✨ {formatSmartFirstAppointmentMessage(resolvedPreview)}
                    </p>
                </div>
            )}

            {showGenerateButton && onGenerate && (
                <button type="button" onClick={onGenerate} className={ecg.saveBtn}>
                    {generateButtonLabel}
                </button>
            )}
        </div>
    );
};
