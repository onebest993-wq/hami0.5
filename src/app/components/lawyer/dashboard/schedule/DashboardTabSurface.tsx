import React, { useLayoutEffect, useRef } from 'react';
import { blurFocusWithin, inertProps } from '@/app/utils/inertProps';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageEnterFx.css';

export type DashboardTabSurfaceProps = {
    active: boolean;
    testId?: string;
    className?: string;
    /** كشف بتلاشي خفيف بدل hidden الفوري — لملف المهني */
    softReveal?: boolean;
    /**
     * إبقاء الشجرة مركّبة (keepAlive) مع إخفاء حقيقي للنقر —
     * الطبقة تبقى مرسومة تحت غطاء الرئيسية (z-index).
     */
    preserveLayout?: boolean;
    /** غطاء الرئيسية المعتم فوق keepAlive */
    homeStackCover?: boolean;
    children: React.ReactNode;
};

/** تبويب يبقى mounted — يُخفى بـ CSS بدل unmount */
export function DashboardTabSurface({
    active,
    testId,
    className = '',
    softReveal = false,
    preserveLayout = false,
    /** الرئيسية كغطاء معتم فوق keepAlive — كشف فوري بلا translate */
    homeStackCover = false,
    children,
}: DashboardTabSurfaceProps) {
    const surfaceRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (active) return;
        blurFocusWithin(surfaceRef.current);
    }, [active]);

    if (softReveal) {
        return (
            <div
                ref={surfaceRef}
                id={testId}
                data-testid={testId}
                className={`hami-dashboard-tab-reveal ${active ? 'is-active' : ''} ${className}`.trim()}
                aria-hidden={!active}
            >
                {children}
            </div>
        );
    }

    if (homeStackCover) {
        return (
            <div
                ref={surfaceRef}
                id={testId}
                data-testid={testId}
                className={`hami-dashboard-home-stack-cover ${active ? 'is-active' : ''} ${className}`.trim()}
                {...inertProps(!active)}
            >
                {children}
            </div>
        );
    }

    if (preserveLayout) {
        return (
            <div
                ref={surfaceRef}
                id={testId}
                data-testid={testId}
                data-hami-tab-preserve={active ? 'active' : 'idle'}
                className={`absolute inset-0 bg-[#020408] hami-dashboard-tab-preserve ${
                    active ? 'hami-dashboard-tab-preserve--active' : ''
                } ${className}`.trim()}
                {...inertProps(!active)}
            >
                {children}
            </div>
        );
    }

    return (
        <div
            ref={surfaceRef}
            id={testId}
            data-testid={testId}
            className={active ? className : `hidden pointer-events-none ${className}`}
            aria-hidden={!active}
        >
            {children}
        </div>
    );
}
