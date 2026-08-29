import React from 'react';
import { HqFold } from '@/app/components/admin/HqFold';
import type { HqFoldId } from '@/app/components/admin/useHqFold';
import { hqCountOrDash, type HqLiveOverview } from '@/app/components/admin/hqLiveOverview';

export function HqStatsSection({
    foldId,
    title,
    hint,
    summary,
    alert,
    testId,
    defaultOpen,
    className,
    children,
}: {
    foldId: HqFoldId;
    title: string;
    hint?: string;
    summary?: string;
    alert?: boolean;
    testId?: string;
    defaultOpen?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <HqFold
            id={foldId}
            title={title}
            hint={hint}
            summary={summary}
            alert={alert}
            testId={testId}
            defaultOpen={defaultOpen}
            className={className}
        >
            {children}
        </HqFold>
    );
}

export function hqHealthLabel(ok: boolean, up: string, down: string): string {
    return ok ? up : down;
}

export function hqSystemLabel(system: HqLiveOverview['system']): string {
    if (system === 'connected') return 'متصل';
    if (system === 'degraded') return 'متقطع';
    return 'منقطع';
}

export function hqSystemTone(system: HqLiveOverview['system']): 'ok' | 'warn' | 'danger' {
    if (system === 'connected') return 'ok';
    if (system === 'degraded') return 'warn';
    return 'danger';
}

export function hqHealthSummary(
    live: Pick<HqLiveOverview, 'db' | 'kvOk' | 'system' | 'sessionRequired'>,
): string {
    if (live.sessionRequired) return 'بلا جلسة · لم تُفحص الخدمات';
    return `${hqHealthLabel(live.db, 'تعمل', 'متوقفة')} · ${hqHealthLabel(live.kvOk, 'يعمل', 'متوقف')} · ${hqSystemLabel(live.system)}`;
}

export function hqQueueSummary(actionTotal: number | string): string {
    if (actionTotal === '—') return 'العدّ غير مكتمل';
    if (actionTotal === 0) return 'لا إجراء معلّق';
    return `${actionTotal} يحتاج إجراء`;
}

export function hqAccountsSummary(
    live: Pick<HqLiveOverview, 'usersTotal' | 'usersFrozen' | 'usersLocked' | 'contentGaps'>,
): string {
    const total = hqCountOrDash(live.usersTotal, live.contentGaps, 'usersTotal');
    const frozen = hqCountOrDash(live.usersFrozen, live.contentGaps, 'usersFrozen');
    const locked = hqCountOrDash(live.usersLocked, live.contentGaps, 'usersLocked');
    return `${total} حساب · ${frozen} مجمّد · ${locked} مقفل`;
}

export function hqVerificationSummary(
    live: Pick<HqLiveOverview, 'pendingVerification' | 'verificationApproved' | 'contentGaps'>,
): string {
    const pending = hqCountOrDash(live.pendingVerification, live.contentGaps, 'pendingVerification');
    const approved = hqCountOrDash(live.verificationApproved, live.contentGaps, 'pendingVerification');
    return `${pending} معلّق · ${approved} معتمد`;
}

export function hqForumSummary(
    posts: number | string,
    reports: number | string,
): string {
    return `${posts} منشور · ${reports} بلاغ`;
}

export function hqCourtsSummary(courts: number, lawsuits: number): string {
    return `${courts} محكمة · ${lawsuits} دعوى`;
}
