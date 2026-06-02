import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

export type UrgencyTone = 'critical' | 'new' | 'normal';

export function parseAlertDate(value?: string): number | null {
    if (!value) return null;
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
}

export function inferUrgencyTone(alert: SecretaryAlert): UrgencyTone {
    if (alert.type === 'REQUEST' && alert.request?.ai_metadata?.urgency === 'CRITICAL') return 'critical';
    const due = parseAlertDate(alert.dueAt);
    if (due !== null) {
        const h = (due - Date.now()) / (60 * 60 * 1000);
        if (h <= 6) return 'critical';
    }
    if (alert.type === 'REQUEST') return 'new';
    return 'normal';
}

export function urgencyToneStyles(tone: UrgencyTone): {
    border: string;
    glow: string;
    chip: string;
    iconBg: string;
} {
    if (tone === 'critical') {
        return {
            border: 'border-red-500/40',
            glow: 'rgba(239,68,68,0.45)',
            chip: 'bg-red-900/45 text-red-200',
            iconBg: 'bg-red-500/10 border-red-500/20',
        };
    }
    if (tone === 'new') {
        return {
            border: 'border-amber-500/35',
            glow: 'rgba(245,158,11,0.35)',
            chip: 'bg-amber-900/35 text-amber-200',
            iconBg: 'bg-amber-500/10 border-amber-500/20',
        };
    }
    return {
        border: 'border-sky-500/25',
        glow: 'rgba(56,189,248,0.22)',
        chip: 'bg-sky-900/35 text-sky-200',
        iconBg: 'bg-sky-500/10 border-sky-500/20',
    };
}

export function extractCaseRef(alert: SecretaryAlert): string | undefined {
    const dash = alert.title.lastIndexOf('—');
    if (dash >= 0) {
        const ref = alert.title.slice(dash + 1).trim();
        if (ref) return ref;
    }
    return alert.entityId ? String(alert.entityId) : undefined;
}
