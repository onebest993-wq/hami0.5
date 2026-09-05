import React from 'react';
import { RADAR_TEXT_MUTED } from './radarTheme';

export const EmptyState = React.memo(function EmptyState({
    testId = 'radar-empty-state',
    silent = false,
}: {
    testId?: string;
    silent?: boolean;
}) {
    return (
        <div
            className="hami-radar-empty"
            data-testid={testId}
            aria-busy={silent || undefined}
            aria-label={silent ? 'قائمة اليوم' : undefined}
        >
            {silent ? null : (
                <p className={`text-[13px] font-medium leading-relaxed ${RADAR_TEXT_MUTED}`}>
                    لا توجد مواعيد لهذا اليوم
                </p>
            )}
        </div>
    );
});
