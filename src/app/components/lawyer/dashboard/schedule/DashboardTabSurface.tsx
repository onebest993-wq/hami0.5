import React from 'react';

export type DashboardTabSurfaceProps = {
    active: boolean;
    testId?: string;
    className?: string;
    children: React.ReactNode;
};

/** تبويب يبقى mounted — يُخفى بـ CSS بدل unmount */
export function DashboardTabSurface({ active, testId, className = '', children }: DashboardTabSurfaceProps) {
    return (
        <div
            data-testid={testId}
            className={active ? className : `hidden pointer-events-none ${className}`}
            aria-hidden={!active}
        >
            {children}
        </div>
    );
}
