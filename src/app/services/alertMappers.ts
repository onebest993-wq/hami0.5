import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Hammer } from '@/app/components/ui/icons/Hammer';
import { Scale } from '@/app/components/ui/icons/Scale';
import { FileText } from '@/app/components/ui/icons/FileText';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { isInjectedFieldTaskAlert } from '@/app/services/fieldTaskAlerts';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import {
    buildAlertDisplayMeta,
    buildFutureTimeLabel,
    extractValidCaseRef,
} from '@/app/services/alertDisplayMeta';
import type { SmartAlert, AlertPriority } from '@/app/components/lawyer/NeuralAlertsCard/types';

function priorityFromSecretary(p: number): AlertPriority {
    if (p <= 1) return 'critical';
    if (p <= 2) return 'high';
    if (p <= 3) return 'medium';
    return 'low';
}

function actionForAlert(alert: SecretaryAlert): SmartAlert['actionType'] {
    if (
        alert.target === 'lawsuit' ||
        alert.target === 'execution' ||
        alert.target === 'urgent' ||
        alert.target === 'criminal'
    ) {
        return 'openChecklist';
    }
    if (alert.target === 'notepad') return 'openNotepad';
    if (alert.target === 'transactions' || alert.target === 'threading') return 'openScanner';
    if (alert.calendarSource?.module === 'task') return 'openChecklist';
    return 'openChecklist';
}

function iconForAlert(alert: SecretaryAlert) {
    if (isInjectedFieldTaskAlert(alert)) {
        return ClipboardList;
    }
    switch (alert.type) {
        case 'HEARING':
            return Scale;
        case 'NOTE':
            return FileText;
        case 'EXECUTION':
            return Hammer;
        case 'URGENT':
            return AlertTriangle;
        default:
            return Clock;
    }
}

function colorForPriority(p: AlertPriority): SmartAlert['colorTheme'] {
    if (p === 'critical') return 'amber';
    if (p === 'high') return 'blue';
    return 'purple';
}

export function secretaryAlertToSmartAlert(alert: SecretaryAlert): SmartAlert {
    const priority = priorityFromSecretary(alert.priority);
    const meta = buildAlertDisplayMeta(alert);
    const dueMs = alert.dueAt ? Date.parse(alert.dueAt) : NaN;
    const timeLabel = buildFutureTimeLabel(alert.dueAt) ?? (Number.isFinite(dueMs) ? 'قريباً' : undefined);

    return {
        id: alert.id,
        title: meta.headline,
        description: meta.sectionPhaseLine ?? meta.subtitle ?? '',
        priority,
        actionType: actionForAlert(alert),
        actionLabel: alert.suggestedAction ?? 'فتح',
        payload: {
            caseId: alert.entityId,
            entityId: alert.entityId,
            target: alert.target,
            secretaryType: alert.type,
        },
        timestamp: Number.isFinite(dueMs) ? dueMs : Date.now(),
        clientName: meta.clientName,
        caseNo: meta.caseRef ?? extractValidCaseRef(alert),
        timeLabel,
        colorTheme: colorForPriority(priority),
        icon: iconForAlert(alert),
        sectionLabel: meta.sectionLabel,
        sectionIcon: meta.sectionIcon,
        dueFormatted: meta.dueFormatted,
        courtName: meta.courtName,
        courtSubtitle: meta.courtSubtitle,
        sectionPhaseLine: meta.sectionPhaseLine,
        clientPhone: alert.clientPhone,
    };
}

/** أقصى أولوية تُحسب في شارة الجرس وتبويب «عاجل» الموحّد */
export const HEADER_BADGE_MAX_PRIORITY = 2;

export function isHeaderBadgePriority(priority: number): boolean {
    return priority <= HEADER_BADGE_MAX_PRIORITY;
}

export function countHighPriorityAlerts(alerts: SecretaryAlert[]): number {
    return alerts.filter((a) => isHeaderBadgePriority(a.priority)).length;
}

export function combineHeaderUnreadCount(
    notificationUnread: number,
    secretaryAlerts: SecretaryAlert[],
    dismissedIds?: string[],
): number {
    const visible = filterVisibleAlerts(secretaryAlerts, dismissedIds);
    return notificationUnread + countHighPriorityAlerts(visible);
}
