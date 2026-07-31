import React from 'react';
import {
    DEBTOR_ENTITY_KIND_LABELS,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';

export function DebtorEntityKindSegment(props: {
    value: DebtorEntityKind;
    /** عند تعدد المدينين — يُقفل على صفة المدين الأول (طبيعي/معنوي) */
    lockedEntityKind?: DebtorEntityKind | null;
    onChange: (next: DebtorEntityKind) => void;
    disabled?: boolean;
    compact?: boolean;
    /** عند موكلي المحامي للمدين — يُخفى خيار الشخص المعنوي */
    allowLegalEntity?: boolean;
}) {
    const { value, onChange, disabled, compact, allowLegalEntity = true, lockedEntityKind = null } = props;
    const kinds = allowLegalEntity
        ? (['natural_person', 'legal_entity'] as const)
        : (['natural_person'] as const);
    const segWrap =
        'inline-flex items-stretch rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';
    const segBtn = compact
        ? 'rounded-[10px] px-2 py-1 text-[10px] font-bold transition-all duration-200 min-w-[2.75rem] text-center disabled:opacity-40'
        : 'rounded-[10px] px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 min-w-[3.15rem] text-center disabled:opacity-40';
    const segIdle = 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]';
    const segActive = 'bg-rose-500/20 text-rose-100 border border-rose-400/25';

    return (
        <div className={segWrap} role="group" aria-label="صفة المدين">
            {kinds.map((kind) => {
                const active = value === kind;
                return (
                    <button
                        key={kind}
                        type="button"
                        disabled={
                            disabled ||
                            (lockedEntityKind != null && kind !== lockedEntityKind)
                        }
                        onClick={() => {
                            if (
                                disabled ||
                                active ||
                                (lockedEntityKind != null && kind !== lockedEntityKind)
                            ) {
                                return;
                            }
                            onChange(kind);
                        }}
                        className={`${segBtn} ${active ? segActive : segIdle}`}
                    >
                        {DEBTOR_ENTITY_KIND_LABELS[kind]}
                    </button>
                );
            })}
        </div>
    );
}
