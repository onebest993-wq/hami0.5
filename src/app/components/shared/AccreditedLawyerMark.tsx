import React from 'react';
import { cn } from '@/app/components/ui/utils';
import '@/app/components/shared/accreditedLawyerMark.css';

export function AccreditedLawyerMark({
    className,
    size = 'default',
}: {
    className?: string;
    size?: 'default' | 'tile' | 'portrait';
}): React.ReactElement {
    return (
        <span
            className={cn(
                'hami-accredited-mark',
                size === 'tile' && 'hami-accredited-mark--tile',
                size === 'portrait' && 'hami-accredited-mark--portrait',
                className,
            )}
            data-testid="accredited-lawyer-mark"
            role="img"
            aria-label="محامٍ معتمد"
        >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                    fill="currentColor"
                    d="M6.2 11.4 3.4 8.6l1.1-1.1 1.7 1.7 4.3-4.3 1.1 1.1z"
                />
            </svg>
        </span>
    );
}
