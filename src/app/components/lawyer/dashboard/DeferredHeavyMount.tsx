import React from 'react';
import { useDeferHeavyMount } from './useDeferHeavyMount';

type DeferredHeavyMountProps = {
    children: React.ReactNode;
    fallback: React.ReactNode;
    /** عند false يرسم الأطفال فوراً */
    enabled?: boolean;
    className?: string;
    testId?: string;
};

/**
 * يحافظ على هيكل الحاوية (min-h / flex) أثناء تأجيل المحتوى الثقيل —
 * يمنع اهتزاز التخطيط عند فتح مخزن الدعاوى/التنفيذ.
 */
export function DeferredHeavyMount({
    children,
    fallback,
    enabled = true,
    className = 'relative h-full min-h-0 flex-1 flex flex-col',
    testId = 'deferred-heavy-mount',
}: DeferredHeavyMountProps): React.ReactElement {
    const ready = useDeferHeavyMount(enabled);

    return (
        <div
            className={className}
            data-testid={testId}
            data-hami-defer-heavy={ready ? 'ready' : 'pending'}
            aria-busy={!ready}
        >
            {ready ? children : fallback}
        </div>
    );
}
