import React from 'react';

export type ArchiveBannerProps = {
    isIqrarContext: boolean;
    archiveSummaryText: string;
    archivedAt: unknown;
    formatDateTimeText: (value: unknown) => string;
};

export function ArchiveBanner({ isIqrarContext, archiveSummaryText, archivedAt, formatDateTimeText }: ArchiveBannerProps) {
    return (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <div className="max-w-7xl mx-auto text-center">
                <div className="text-amber-100 text-sm font-extrabold">
                    {isIqrarContext ? 'إقرار مؤرشف — للاطلاع فقط' : 'إضبارة مؤرشفة — للاطلاع فقط'}
                </div>
                {!!archiveSummaryText && <div className="text-amber-100/75 text-xs mt-1">{archiveSummaryText}</div>}
                {!!archivedAt && (
                    <div className="text-amber-100/60 text-[11px] mt-1">
                        تاريخ الأرشفة: {formatDateTimeText(archivedAt)}
                    </div>
                )}
            </div>
        </div>
    );
}
