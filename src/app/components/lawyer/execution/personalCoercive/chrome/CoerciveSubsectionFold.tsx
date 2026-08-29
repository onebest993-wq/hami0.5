import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';

/** طي داخلي مسطح — بدون إطار مزدوج داخل الحاوية البنفسجية */
export function CoerciveSubsectionFold({
    title,
    defaultOpen = true,
    flat = false,
    titleClassName = 'text-rose-200',
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    /** عرض مسطح دون سهم طي إضافي داخل الحاوية المفتوحة */
    flat?: boolean;
    titleClassName?: string;
    children: React.ReactNode;
}) {
    if (flat) {
        return (
            <div className="border-t border-white/10 text-right first:border-t-0">
                <p className={`px-1 py-2.5 text-[11px] font-black text-right ${titleClassName}`}>{title}</p>
                <div className="space-y-2 px-1 pb-2">{children}</div>
            </div>
        );
    }
    return (
        <details className="group/sub border-t border-white/10 text-right first:border-t-0" open={defaultOpen}>
            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-1 py-2.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                <span className={`text-[11px] font-black text-right ${titleClassName}`}>{title}</span>
                <ChevronDown
                    size={16}
                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open/sub:rotate-180"
                    aria-hidden
                />
            </summary>
            <div className="space-y-2 px-1 pb-2">{children}</div>
        </details>
    );
}
