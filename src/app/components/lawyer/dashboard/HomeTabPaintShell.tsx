import React from 'react';
import { HomeLayoutScrollRoot } from './HomeLayoutScrollRoot';

/** هندسة تبويب المنزل — إزاحة الهيدر + جذر التمرير. ثابتة من أول هيكل حتى المحتوى الحي. */
export function HomeTabPaintShell({
    visible = true,
    children,
}: {
    visible?: boolean;
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <div
            className="absolute inset-x-0 hami-below-lawyer-header z-[1]"
            data-testid="lawyer-home-tab"
            aria-hidden={!visible}
        >
            <HomeLayoutScrollRoot>{children}</HomeLayoutScrollRoot>
        </div>
    );
}
