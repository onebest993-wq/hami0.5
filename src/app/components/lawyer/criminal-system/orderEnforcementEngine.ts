import type { JudicialDecision, OrderEnforcementTracking } from '@/app/types/criminal';
import {
    isOrderEnforcementTemplate,
    resolveOrderEnforcementKindFromTemplate,
} from './proceduralRequestTypes';

export type {
    OrderEnforcementKind,
    OrderEnforcementTracking,
} from '@/app/types/criminal';

export function normalizeOrderEnforcementTracking(raw: unknown): OrderEnforcementTracking | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const kind = o.kind === 'arrest' || o.kind === 'summons' ? o.kind : undefined;
    const legalArticleBasis =
        typeof o.legalArticleBasis === 'string' && o.legalArticleBasis.trim()
            ? o.legalArticleBasis.trim()
            : undefined;
    const notificationStatus =
        o.notificationStatus === 'notified' || o.notificationStatus === 'pending'
            ? o.notificationStatus
            : undefined;
    const notifiedAt =
        typeof o.notifiedAt === 'string' && o.notifiedAt.trim() ? o.notifiedAt.trim() : undefined;
    const attendanceStatus =
        o.attendanceStatus === 'attended' ||
        o.attendanceStatus === 'absent' ||
        o.attendanceStatus === 'pending'
            ? o.attendanceStatus
            : undefined;
    const arrestExecuted =
        o.arrestExecuted === 'executed' ||
        o.arrestExecuted === 'not_executed' ||
        o.arrestExecuted === 'pending'
            ? o.arrestExecuted
            : undefined;
    const postArrestOutcome =
        o.postArrestOutcome === 'bailed' || o.postArrestOutcome === 'detained'
            ? o.postArrestOutcome
            : undefined;
    if (
        !kind &&
        !legalArticleBasis &&
        !notificationStatus &&
        !notifiedAt &&
        !attendanceStatus &&
        !arrestExecuted &&
        !postArrestOutcome
    ) {
        return undefined;
    }
    return {
        kind,
        legalArticleBasis,
        notificationStatus,
        notifiedAt,
        attendanceStatus,
        arrestExecuted,
        postArrestOutcome,
    };
}

export function isLiveOrderEnforcementCard(decision: JudicialDecision): boolean {
    if (decision.decisionType === 'dispositive') return false;
    return isOrderEnforcementTemplate(decision.proceduralTemplate ?? decision.title);
}

export function formatOrderNotificationLabel(tracking?: OrderEnforcementTracking): string {
    if (tracking?.notificationStatus === 'notified') {
        const d = String(tracking.notifiedAt ?? '').trim();
        return d ? `تم التبليغ (${d})` : 'تم التبليغ';
    }
    return 'لم يُبلَّغ بعد';
}

export function formatOrderAttendanceLabel(tracking?: OrderEnforcementTracking): string {
    if (tracking?.attendanceStatus === 'attended') return 'حضر';
    if (tracking?.attendanceStatus === 'absent') return 'تخلف عن الحضور';
    return 'بانتظار الحضور';
}

export function requiresLegalArticleBasis(template: string | undefined): boolean {
    return isOrderEnforcementTemplate(template);
}

export function buildInitialOrderEnforcement(
    template: string,
    legalArticleBasis: string,
    legacyKind?: OrderEnforcementTracking['kind'],
): OrderEnforcementTracking | undefined {
    if (!isOrderEnforcementTemplate(template)) return undefined;
    const kind = resolveOrderEnforcementKindFromTemplate(template) ?? legacyKind ?? 'summons';
    const article = String(legalArticleBasis ?? '').trim();
    if (!article) return undefined;
    return {
        kind,
        legalArticleBasis: article,
        notificationStatus: 'pending',
        attendanceStatus: kind === 'summons' ? 'pending' : undefined,
        arrestExecuted: kind === 'arrest' ? 'pending' : undefined,
    };
}
