import React from 'react';
import type { ProceduralPlacementContext } from '../proceduralContainersEngine';

export const ProceduralPlacementBreadcrumb = ({
    placement,
}: {
    placement: ProceduralPlacementContext | null | undefined;
}) => {
    if (!placement?.breadcrumb.length) return null;
    const line =
        placement.breadcrumbLine?.trim() ||
        placement.breadcrumb.join(' › ');
    return (
        <div
            className="rounded-lg border border-slate-600/40 bg-slate-950/50 px-3 py-2.5 space-y-1.5"
            dir="rtl"
        >
            <div className="text-[9px] font-black text-slate-500">موقع الإدراج في اللوحة</div>
            <p className="text-[11px] font-bold text-white/70 leading-relaxed whitespace-normal break-words">
                {line}
            </p>
            {placement.numberChain ? (
                <div className="text-[9px] font-bold text-slate-500 tabular-nums" dir="ltr">
                    #{placement.numberChain}
                </div>
            ) : null}
        </div>
    );
};
