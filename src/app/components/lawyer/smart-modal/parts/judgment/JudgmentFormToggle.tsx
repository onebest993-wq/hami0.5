import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

export function JudgmentFormToggle({
    styles: s,
    judgmentForm,
    onChange,
}: {
    styles: JudgmentModalStyles;
    judgmentForm: string;
    onChange: (form: string) => void;
}) {
    return (
        <div className={s.section}>
            <label className={s.label}>شكل الحكم</label>
            <div className="flex gap-2 w-full">
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari}
                    aria-pressed={judgmentForm === 'حضوري'}
                    onClick={() => onChange('حضوري')}
                    className={`${s.toggle} ${
                        judgmentForm === 'حضوري' ? s.toggleActive : s.toggleIdle
                    }`}
                >
                    حكم حضوري
                </button>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi}
                    aria-pressed={judgmentForm === 'غيابي'}
                    onClick={() => onChange('غيابي')}
                    className={`${s.toggle} ${
                        judgmentForm === 'غيابي' ? s.toggleActive : s.toggleIdle
                    }`}
                >
                    حكم غيابي
                </button>
            </div>
        </div>
    );
}
