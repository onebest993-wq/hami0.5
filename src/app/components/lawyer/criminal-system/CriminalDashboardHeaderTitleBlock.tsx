import React, { Fragment } from 'react';

export type CriminalDashboardHeaderTitleSegment = {
    text: string;
    prominent?: boolean;
    compact?: boolean;
};

export type CriminalDashboardHeaderTitleBlockProps = {
    titleText: string;
    titleLineSegments: CriminalDashboardHeaderTitleSegment[];
    isMutualComplaint: boolean;
};

function titleLineClass(segment: CriminalDashboardHeaderTitleSegment): string {
    return segment.prominent
        ? 'text-xl md:text-2xl font-bold leading-tight whitespace-normal break-words bg-gradient-to-b from-white to-white/85 bg-clip-text text-transparent [text-shadow:0_0_14px_rgba(255,255,255,0.12)] print:text-black print:bg-none print:text-black'
        : segment.compact
          ? 'text-sm font-semibold text-gray-300/90 whitespace-normal break-words min-w-0 print:text-black/70'
          : 'text-sm md:text-base font-medium text-gray-300 whitespace-normal break-words print:text-black/70';
}

/**
 * كتلة عنوان ترويسة الإضبارة — العنوان الرئيسي + أسطر المادة/المراجع + شارة الشكوى المتقابلة.
 * مستخرَج حرفياً من CriminalDashboardHeader (صفر تغيير بصري).
 */
export function CriminalDashboardHeaderTitleBlock({
    titleText,
    titleLineSegments,
    isMutualComplaint,
}: CriminalDashboardHeaderTitleBlockProps) {
    return (
        <div className="flex flex-col gap-1.5 w-full min-w-0">
            <h1
                className="text-xl md:text-2xl font-bold leading-tight whitespace-normal break-words min-w-0 w-full bg-gradient-to-b from-white to-white/85 bg-clip-text text-transparent [text-shadow:0_0_14px_rgba(255,255,255,0.12)] print:text-black print:bg-none"
            >
                {titleText}
            </h1>
            {titleLineSegments.length > 1 || isMutualComplaint ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 w-full min-w-0">
                    {titleLineSegments.slice(1).map((segment, i) => (
                        <Fragment key={`${segment.text}-${i}`}>
                            {i > 0 ? (
                                <span
                                    className="text-[#E6C673]/45 text-xs shrink-0 select-none"
                                    aria-hidden
                                >
                                    ·
                                </span>
                            ) : null}
                            <span className={`${titleLineClass(segment)} min-w-0`}>
                                {segment.text}
                            </span>
                        </Fragment>
                    ))}
                    {isMutualComplaint ? (
                        <>
                            {titleLineSegments.length > 1 ? (
                                <span
                                    className="text-[#E6C673]/45 text-xs shrink-0 select-none"
                                    aria-hidden
                                >
                                    ·
                                </span>
                            ) : null}
                            <span
                                className="inline-flex shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] md:text-[11px] font-black text-amber-100 whitespace-nowrap print:border-amber-500/40 print:text-amber-700"
                                title="إضبارة جزائية ناشئة عن شكوى متقابلة (ازدواجية الصفة)"
                            >
                                شكوى متقابلة
                            </span>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
