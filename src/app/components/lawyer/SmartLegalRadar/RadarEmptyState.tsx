import React from 'react';
import { RADAR_TEXT_MUTED } from './radarTheme';

export const EmptyState = React.memo(function EmptyState() {
    return (
        <div className="hami-radar-empty" data-testid="radar-empty-state">
            <p className={`text-[13px] font-medium leading-relaxed ${RADAR_TEXT_MUTED}`}>
                لا توجد مواعيد لهذا اليوم
            </p>
        </div>
    );
});
