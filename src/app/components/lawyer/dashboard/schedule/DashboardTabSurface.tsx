import React, { useLayoutEffect, useRef } from 'react';
import { blurFocusWithin, inertProps } from '@/app/utils/inertProps';
import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';
import { isProfileShellSnappedOpen } from '@/app/services/profile/profileShellSnap';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageEnterFx.css';

function isPreservedSurfaceLive(testId: string | undefined, active: boolean): boolean {
    if (testId !== 'lawyer-dashboard-profile-surface') return active;
    /* تبويب React وحده لا يكفي: live-ready بعد الإغلاق كان يعيد --active فوق الرئيسية */
    return isProfileShellSnappedOpen() || (active && wasProfileOpenedThisPage());
}

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

    useLayoutEffect(() => {
        if (!active || !preserveLayout) return;
        /* عند التفعيل: لا scrollIntoView من focus — يثبت الإطار */
        const node = surfaceRef.current;
        if (!node) return;
        const focused = node.querySelector(':focus');
        if (focused instanceof HTMLElement) focused.blur();
        const shell = node.querySelector('[data-testid="lawyer-profile-tab-shell"]');
        if (shell instanceof HTMLElement) {
            /* ثبّت الموضع الحالي دون قفزة إلى 0 بعد الظهور */
            const y = shell.scrollTop;
            shell.scrollTop = y;
        }
    }, [active, preserveLayout]);

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
        const live = isPreservedSurfaceLive(testId, active);
        return (
            <div
                ref={surfaceRef}
                id={testId}
                data-testid={testId}
                data-hami-tab-preserve={live ? 'active' : 'idle'}
                className={`absolute inset-0 bg-[#020408] hami-dashboard-tab-preserve ${
                    live ? 'hami-dashboard-tab-preserve--active' : ''
                } ${className}`.trim()}
                {...inertProps(!live)}
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
