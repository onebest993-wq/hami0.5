import React from 'react';
import { HomeWalletIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

/**
 * غلاف فوري لمركز العمليات المالية داخل بوابة المركز المالي —
 * يطابق هيكل الترويسة الذهبية حتى لا تبقى فجوة نبض فقط أثناء تحميل الـ chunk.
 */
export function FocInstantShell({
    title = 'المركز المالي',
}: {
    title?: string;
}): React.ReactElement {
    return (
        <div
            className="space-y-3 py-1"
            data-testid="foc-instant-shell"
            aria-busy="true"
            aria-label="جاري تحميل المركز المالي"
        >
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#E6C673]/25 bg-[#0B1120]/80 px-3 py-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E6C673]/20 text-[#E6C673]">
                    <HomeWalletIcon size={18} aria-hidden />
                </span>
                <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-[#E6C673]">{title}</p>
                <span className="inline-flex h-9 w-9 shrink-0 rounded-lg border border-white/8 bg-white/[0.03]" aria-hidden />
            </div>
            <div className="h-16 animate-pulse rounded-2xl border border-[#E6C673]/15 bg-white/[0.04]" />
            <div className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
            <div className="h-20 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-12 animate-pulse rounded-xl border border-white/8 bg-white/[0.04]" />
                <div className="h-12 animate-pulse rounded-xl border border-white/8 bg-white/[0.04]" />
            </div>
        </div>
    );
}
