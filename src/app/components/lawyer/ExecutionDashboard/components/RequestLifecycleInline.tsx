import React, { useState } from 'react';
import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';
import { RequestLifecycleBadge, RequestLifecyclePanel } from './RequestLifecycleBadge';

export interface RequestLifecycleInlineProps {
    summary: ExecutorRequestLifecycleSummary | null | undefined;
    className?: string;
}

/** شعار + لوحة سجل دورة الحياة — للاستخدام أسفل أي بطاقة طلب */
export const RequestLifecycleInline: React.FC<RequestLifecycleInlineProps> = ({
    summary,
    className = '',
}) => {
    const [open, setOpen] = useState(false);
    if (!summary || summary.submissions <= 0) return null;

    return (
        <div className={className}>
            <div className="flex justify-end px-1 pt-1">
                <RequestLifecycleBadge
                    summary={summary}
                    expanded={open}
                    onToggle={() => setOpen((v) => !v)}
                />
            </div>
            {open ? <RequestLifecyclePanel summary={summary} /> : null}
        </div>
    );
};

export { RequestLifecycleBadgeSlot } from './RequestLifecycleBadge';
