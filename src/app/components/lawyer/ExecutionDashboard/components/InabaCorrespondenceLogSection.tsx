import React, { useMemo } from 'react';
import type { InabaCorrespondenceLogEntry } from '../utils/inabaCorrespondenceLog';

const STATUS_LABEL: Record<InabaCorrespondenceLogEntry['status'], string> = {
    pending_executor: 'بانتظار المنفذ',
    sent: 'تم الإرسال',
    rejected: 'مرفوض',
};

export type InabaCorrespondenceLogSectionProps = {
    entries: InabaCorrespondenceLogEntry[];
    /** داخل بطاقة طلب مخاطبة الإنابة */
    embedded?: boolean;
};

export const InabaCorrespondenceLogSection: React.FC<InabaCorrespondenceLogSectionProps> = ({
    entries,
    embedded = false,
}) => {
    const sorted = useMemo(
        () =>
            [...entries].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        [entries]
    );

    if (!sorted.length) return null;

    return (
        <div
            className={
                embedded
                    ? 'border-t border-white/10 px-3 pb-3 pt-2'
                    : 'rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4'
            }
            dir="rtl"
        >
            {!embedded ? (
                <p className="mb-2 text-[10px] font-bold text-amber-100">سجل مخاطبات الإنابة</p>
            ) : (
                <p className="mb-2 text-[10px] font-bold text-amber-200/90">سجل المخاطبات</p>
            )}
            <ul className="max-h-48 space-y-2 overflow-y-auto">
                {sorted.map((entry) => (
                    <li
                        key={entry.id}
                        className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-right"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[9px] font-bold text-amber-300/85">
                                {STATUS_LABEL[entry.status] || entry.status}
                            </span>
                            <span className="text-[9px] text-slate-500">
                                {entry.requestDate || entry.createdAt.slice(0, 10)}
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] font-bold text-slate-300">
                            {entry.directorate || '—'}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{entry.subject}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};
