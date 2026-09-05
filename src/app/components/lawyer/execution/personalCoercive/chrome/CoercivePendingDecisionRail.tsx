import React from 'react';

/**
 * شريط قرار خفيف لمسارات الإجراءات المستمرة (إحضار / عرض إضبارة / قاضي)
 * — عنوان + بتّ سريع إن وُجد (بدون اختصار مكرر لمركز القرارات).
 */
export function CoercivePendingDecisionRail(props: {
    title: string;
    children?: React.ReactNode;
    tone?: 'executor' | 'judge';
}) {
    const { title, children = null, tone = 'executor' } = props;
    const shell =
        tone === 'judge'
            ? 'border-violet-400/20 bg-violet-500/[0.06]'
            : 'border-[#E6C673]/22 bg-[#E6C673]/[0.05]';
    const titleTone = tone === 'judge' ? 'text-violet-100/95' : 'text-amber-100/95';

    return (
        <div
            data-testid="coercive-pending-decision-rail"
            className={`rounded-xl border p-2 text-right ${shell}`}
            dir="rtl"
            role="group"
            aria-label={title}
        >
            <p className={`mb-1.5 text-[11px] font-bold leading-snug ${titleTone}`}>{title}</p>
            {children ? <div className="space-y-1.5">{children}</div> : null}
        </div>
    );
}
