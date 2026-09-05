import React, { useMemo, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { SMART_FILE_FOOTER_CHIP_ACCENT } from './smartFileFooterChip';

export type PleadingCloseDecisionFlowProps = {
    /** زر البداية — ختام المرافعة / تحديد نتيجة… */
    primaryLabel: string;
    /** عرض فرع فتح باب المرافعة مقابل قرار الحكم (البداءة وما يعادلها) */
    showAdjournFork: boolean;
    onAdjournPleading?: () => void;
    onOpenJudgment: (decisionDate: string) => void;
    /** مظهر الشريط: مدني (ذهبي) أو أحوال (محايد) */
    tone?: 'civil' | 'personal';
    primaryTestId?: string;
    compactRow?: boolean;
};

type Phase = 'idle' | 'date' | 'fork' | 'early_gate';

const BTN =
    'w-full rounded-xl py-3 text-[13px] font-bold transition-colors touch-manipulation min-h-[44px]';

/**
 * ختام المرافعة → تاريخ القرار → (فتح باب المرافعة | قرار الحكم)
 * مع بوابة «موعد القرار لم يحن» قبل فتح نافذة الحكم.
 */
export function PleadingCloseDecisionFlow({
    primaryLabel,
    showAdjournFork,
    onAdjournPleading,
    onOpenJudgment,
    tone = 'civil',
    primaryTestId = CIVIL_LAWSUIT_TEST_IDS.pleadingClosePrimary,
    compactRow = false,
}: PleadingCloseDecisionFlowProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [decisionDate, setDecisionDate] = useState('');
    const today = useMemo(() => getLocalTodayYmd(), []);

    const primaryClass =
        tone === 'personal'
            ? `${BTN} border border-white/[0.16] bg-white/[0.08] text-white/90 hover:bg-white/[0.12]`
            : compactRow
              ? SMART_FILE_FOOTER_CHIP_ACCENT
              : `${BTN} border border-[#E6C673]/30 bg-[#E6C673]/12 text-[#E6C673] hover:border-[#E6C673]/45 hover:bg-[#E6C673]/18`;

    const expandedWrap = compactRow ? 'basis-full w-full space-y-2' : 'space-y-2';
    const secondaryClass = `${BTN} border border-white/[0.12] bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:border-white/[0.18]`;

    const reset = () => {
        setPhase('idle');
        setDecisionDate('');
    };

    const tryOpenJudgment = (date: string) => {
        if (date > today) {
            setPhase('early_gate');
            return;
        }
        onOpenJudgment(date);
        // لا نُصفّر المرحلة — إلغاء نافذة الحكم يُبقي الفرع/التاريخ ظاهرين
    };

    const afterDateContinue = () => {
        if (!decisionDate) return;
        if (showAdjournFork) {
            setPhase('fork');
            return;
        }
        tryOpenJudgment(decisionDate);
    };

    if (phase === 'idle') {
        return (
            <button
                type="button"
                data-testid={primaryTestId}
                onClick={() => setPhase('date')}
                className={`${primaryClass}${compactRow ? ' flex-1 min-w-[7.5rem]' : ''}`}
                title="ختام المرافعة وإدخال تاريخ القرار"
            >
                {primaryLabel}
            </button>
        );
    }

    if (phase === 'date') {
        return (
            <div className={expandedWrap} dir="rtl">
                <label className="block text-[11px] font-bold text-white/55 text-right px-0.5">
                    تاريخ صدور القرار
                    <span className="text-rose-300/80 mr-1">*</span>
                </label>
                <HamiDateInput
                    value={decisionDate}
                    onValueChange={setDecisionDate}
                    className="w-full min-h-[44px] rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 text-sm text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={reset} className={`${secondaryClass} text-sm py-2.5`}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        disabled={!decisionDate}
                        onClick={afterDateContinue}
                        className={`${primaryClass} text-sm py-2.5 disabled:opacity-40`}
                    >
                        متابعة
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'early_gate') {
        return (
            <div
                className={`${expandedWrap} rounded-xl border border-amber-400/30 bg-amber-500/[0.09] p-3`}
                dir="rtl"
                role="alertdialog"
                aria-label="موعد القرار لم يحن"
            >
                <p className="text-sm font-bold text-amber-50/95 text-right leading-relaxed">
                    موعد القرار لم يحن بعد
                    {decisionDate ? (
                        <>
                            {' '}
                            (مقرّر في{' '}
                            <span className="tabular-nums text-amber-100" dir="ltr">
                                {decisionDate}
                            </span>
                            )
                        </>
                    ) : null}
                    . هل تريد الاستمرار رغم ذلك؟
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" onClick={reset} className={`${secondaryClass} text-sm py-2.5`}>
                        الانتظار والمغادرة
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onOpenJudgment(decisionDate);
                            // لا reset — نفس سبب tryOpenJudgment
                        }}
                        className={`${BTN} border border-amber-400/40 bg-amber-500/18 text-amber-50 text-sm py-2.5`}
                    >
                        الاستمرار
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={expandedWrap} dir="rtl">
            <p className="text-[11px] text-white/45 text-right px-0.5">
                تاريخ القرار:{' '}
                <span className="text-[#E6C673]/90 tabular-nums font-bold" dir="ltr">
                    {decisionDate}
                </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {showAdjournFork && onAdjournPleading ? (
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentAdjournPleading}
                        onClick={() => {
                            onAdjournPleading();
                            reset();
                        }}
                        className={secondaryClass}
                    >
                        فتح باب المرافعة
                    </button>
                ) : null}
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentEnterDecision}
                    onClick={() => tryOpenJudgment(decisionDate)}
                    className={`${primaryClass} ${showAdjournFork ? '' : 'sm:col-span-2'}`}
                >
                    قرار الحكم
                </button>
            </div>
        </div>
    );
}
