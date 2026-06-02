import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { DossierContext } from '@/app/services/alertDossierRegistry';
import { suggestedFutureActionForAlert } from '@/app/services/alertFutureActions';

export function formatAlertTitle(clientName: string, caseNumber: string): string {
    const client = clientName.trim() || 'موكل غير محدد';
    const ref = caseNumber.trim();
    if (ref && ref !== '—') return `${client} — ${ref}`;
    return client;
}

export function formatAlertSubtitle(courtName: string, actionType: string): string {
    const court = courtName.trim();
    const action = actionType.trim();
    if (court && court !== '—' && action) return `${court} — ${action}`;
    if (court && court !== '—') return court;
    return action || '—';
}

export function hasRichAlertMinimumContext(ctx: DossierContext): boolean {
    const hasClient =
        Boolean(ctx.clientName.trim()) &&
        ctx.clientName !== 'موكل غير محدد' &&
        ctx.clientName !== 'مدين غير محدد';
    const hasCase = Boolean(ctx.caseNumber.trim()) && ctx.caseNumber !== '—';
    return hasClient || hasCase;
}

export function composeRichAlert(
    base: Omit<SecretaryAlert, 'title' | 'summary'> & {
        context: DossierContext;
        alertReason?: string;
        suggestedAction?: string;
    },
): SecretaryAlert | null {
    if (!hasRichAlertMinimumContext(base.context)) return null;
    const { context, alertReason, suggestedAction, ...rest } = base;
    const reason = alertReason?.trim();
    return {
        ...rest,
        title: formatAlertTitle(context.clientName, context.caseNumber),
        summary: formatAlertSubtitle(context.courtName, context.actionType),
        clientName: context.clientName,
        caseNumber: context.caseNumber,
        courtName: context.courtName,
        actionType: context.actionType,
        alertReason: reason || undefined,
        suggestedAction:
            suggestedAction ??
            suggestedFutureActionForAlert({
                type: rest.type,
                target: rest.target,
                calendarSource: rest.calendarSource,
            }),
    };
}

export function isSchedulableDossierAlert(alert: SecretaryAlert): boolean {
    return (
        (alert.type === 'HEARING' ||
            alert.type === 'EXECUTION' ||
            alert.type === 'DEADLINE' ||
            alert.type === 'URGENT') &&
        Boolean(alert.entityId)
    );
}
