import React from 'react';
import {
    DEBTOR_ENTITY_KIND_LABELS,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';

export function DebtorEntityKindSegment(props: {
    value: DebtorEntityKind;
    onChange: (next: DebtorEntityKind) => void;
    disabled?: boolean;
    compact?: boolean;
    /** عند موكلي المحامي للمدين — يُخفى خيار الشخص المعنوي */
    allowLegalEntity?: boolean;
}) {
    const { value, onChange, disabled, compact, allowLegalEntity = true } = props;
    const kinds = allowLegalEntity
        ? (['natural_person', 'legal_entity'] as const)
        : (['natural_person'] as const);
    const segWrap =
        'inline-flex items-stretch rounded-xl border border-white/10 bg-white/[0.03] p-0.5 backdrop-blur-sm';
    const segBtn = compact
        ? 'rounded-[10px] px-2 py-1 text-[10px] font-bold transition-all duration-200 min-w-[2.75rem] text-center disabled:opacity-40'
        : 'rounded-[10px] px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 min-w-[3rem] text-center disabled:opacity-40';
    const segIdle = 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]';
    const segActive = 'bg-rose-500/20 text-rose-100 border border-rose-400/25';

    return (
        <div className={segWrap} role="group" aria-label="صفة المدين">
            {kinds.map((kind) => {
                const active = value === kind;
                return (
                    <button
                        key={kind}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            if (disabled || active) return;
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
