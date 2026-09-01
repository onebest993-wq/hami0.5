import React from 'react';
import { isSulhJudgmentType } from '../../smartFile/judgmentTypes';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { Info } from '@/app/components/ui/icons/Info';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

/** حقل اسم المحكمة (تاريخ القرار يُلتقط قبل فتح نافذة الحكم). */
export function JudgmentDateField({
    styles: s,
    judgmentDate: _judgmentDate,
    onChange: _onChange,
    judgmentType = '',
    label = 'المحكمة المختصة',
    courtName = '',
    onCourtChange,
    mode = 'court',
    showCourtField = true,
}: {
    styles: JudgmentModalStyles;
    judgmentDate: string;
    onChange: (date: string) => void;
    judgmentType?: string;
    label?: string;
    courtName?: string;
    onCourtChange?: (court: string) => void;
    mode?: 'court' | 'date';
    /** مراحل بلا ترافع (تمييز/تصحيح) — لا حقل محكمة */
    showCourtField?: boolean;
}) {
    if (mode === 'date') {
        return (
            <>
                <div className={s.section}>
                    <label className={s.label}>
                        {label === 'المحكمة المختصة' ? 'تاريخ الحكم' : label}
                        <span className="text-rose-300/80 mr-1">*</span>
                    </label>
                    <input
                        type="date"
                        required
                        aria-required="true"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentDate}
                        value={_judgmentDate}
                        onChange={(e) => _onChange(e.target.value)}
                        className={s.field}
                    />
                </div>
                {isSulhJudgmentType(judgmentType) && (
                    <div className={`${s.hint} text-emerald-300/90 border-emerald-500/15 bg-emerald-500/[0.04]`}>
                        <Info size={14} className="shrink-0 mt-0.5 text-emerald-400/80" />
                        <span>يعتبر الصلح بمثابة حكم مكتسب الدرجة القطعية.</span>
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            {String(_judgmentDate ?? '').trim() ? (
                <p className={`${s.hint} text-white/55 border-white/[0.08] bg-white/[0.02]`} dir="rtl">
                    <span>
                        تاريخ القرار المحدَّد:{' '}
                        <span className="tabular-nums font-bold text-white/80" dir="ltr">
                            {_judgmentDate}
                        </span>
                    </span>
                </p>
            ) : null}
            {showCourtField ? (
                <div className={s.section}>
                    <label className={s.label}>{label}</label>
                    <input
                        type="text"
                        data-testid="smart-judgment-court"
                        value={courtName}
                        onChange={(e) => onCourtChange?.(e.target.value)}
                        placeholder="اسم المحكمة (اختياري — لمرحلة الطعن)"
                        className={s.field}
                        autoComplete="off"
                    />
                </div>
            ) : null}

            {isSulhJudgmentType(judgmentType) && (
                <div className={`${s.hint} text-emerald-300/90 border-emerald-500/15 bg-emerald-500/[0.04]`}>
                    <Info size={14} className="shrink-0 mt-0.5 text-emerald-400/80" />
                    <span>يعتبر الصلح بمثابة حكم مكتسب الدرجة القطعية.</span>
                </div>
            )}
        </>
    );
}
