import { memo } from 'react';

export const DetailCell = memo(function DetailCell({
    label,
    value,
    className = '',
    valueClassName = '',
    /** عند false تُعرض الخلية حتى لو فارغة (رقم/تاريخ الحكم) */
    hideIfEmpty = true,
}: {
    label: string;
    value: string;
    className?: string;
    valueClassName?: string;
    hideIfEmpty?: boolean;
}) {
    const trimmed = String(value || '').trim();
    if (hideIfEmpty && (!trimmed || trimmed === '—')) return null;
    const display = trimmed || '—';
    const empty = !trimmed || trimmed === '—';
    return (
        <div
            className={`rounded-md border border-amber-500/22 bg-[#0B1120]/50 px-2 py-1 text-right leading-snug ${className}`}
            dir="rtl"
        >
            <p className="text-[10px] leading-none text-amber-200/55">{label}</p>
            <p
                className={`mt-0.5 text-[12px] font-semibold whitespace-normal [unicode-bidi:plaintext] [word-break:keep-all] [overflow-wrap:normal] ${
                    empty ? 'text-slate-500' : 'text-white'
                } ${valueClassName}`}
            >
                {display}
            </p>
        </div>
    );
});
