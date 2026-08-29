import React from 'react';

export type ArchiveBannerProps = {
    isIqrarContext: boolean;
    archiveSummaryText: string;
    archivedAt: unknown;
    formatDateTimeText: (value: unknown) => string;
};

export function ArchiveBanner({ isIqrarContext, archiveSummaryText, archivedAt, formatDateTimeText }: ArchiveBannerProps) {
    return (
        <div className="border-b border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="max-w-7xl mx-auto text-center">
                <div className="text-white text-sm font-bold">
                    {isIqrarContext ? 'إقرار مؤرشف — للاطلاع فقط' : 'إضبارة مؤرشفة — للاطلاع فقط'}
                </div>
                {!!archiveSummaryText && <div className="text-white/55 text-xs mt-0.5">{archiveSummaryText}</div>}
                {!!archivedAt && (
                    <div className="text-white/40 text-[11px] mt-0.5">
                        تاريخ الأرشفة: {formatDateTimeText(archivedAt)}
                    </div>
                )}
            </div>
        </div>
    );
}
