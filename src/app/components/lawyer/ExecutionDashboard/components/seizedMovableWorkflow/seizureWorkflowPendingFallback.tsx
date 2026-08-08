import React from 'react';

/** بطاقة احتياط عند وجود طلب معلّق دون صف مرآة كامل */
export function SeizureWorkflowPendingFallback({
    title,
    subtitle = 'قيد البت لدى المنفذ — يظهر الاختصار في «القرارات والطعون».',
}: {
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2.5 text-right space-y-1">
            <p className="text-[10px] font-black text-amber-100">{title}</p>
            <p className="text-[9px] leading-relaxed text-amber-100/75">{subtitle}</p>
        </div>
    );
}
