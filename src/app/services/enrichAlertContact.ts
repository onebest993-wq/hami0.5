import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { normalizeClientPhone } from '@/app/components/lawyer/NeuralAlertsCard/alertContactUtils';

function readStr(o: Record<string, unknown>, key: string): string {
    const v = o[key];
    return typeof v === 'string' ? v.trim() : '';
}

function phoneFromLawsuit(file: FileData): string | null {
    const direct = normalizeClientPhone(file.clientPhone);
    if (direct) return direct;
    for (const p of file.parties ?? []) {
        if (!p.isClient) continue;
        const ph = normalizeClientPhone(p.phone);
        if (ph) return ph;
    }
    for (const p of file.parties ?? []) {
        const ph = normalizeClientPhone(p.phone);
        if (ph) return ph;
    }
    return null;
}

function phoneFromExecution(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const f = raw as Record<string, unknown>;
    const debtors = Array.isArray(f.debtors) ? f.debtors : [];
    for (const d of debtors) {
        if (!d || typeof d !== 'object') continue;
        const ph = normalizeClientPhone(readStr(d as Record<string, unknown>, 'phone'));
        if (ph) return ph;
    }
    return normalizeClientPhone(readStr(f, 'clientPhone'));
}

function phoneFromCriminal(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    for (const d of defendants) {
        if (!d || typeof d !== 'object') continue;
        const o = d as Record<string, unknown>;
        if (o.isOurClient !== true && o.isClient !== true) continue;
        const ph =
            normalizeClientPhone(readStr(o, 'phone')) ||
            normalizeClientPhone(readStr(o, 'mobile'));
        if (ph) return ph;
    }
    return null;
}

function phoneFromUrgent(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    return (
        normalizeClientPhone(readStr(c, 'applicantPhone')) ||
        normalizeClientPhone(readStr(c, 'clientPhone')) ||
        normalizeClientPhone(readStr(c, 'phone'))
    );
}

/** يكمّل رقم الموكل من الإضابيرة إن لم يُمرَّر من التقويم */
export function enrichAlertClientPhone(
    alert: SecretaryAlert,
    ctx: {
        lawsuitFiles?: FileData[];
        executionFiles?: unknown[];
        criminalCases?: unknown[];
        urgentCases?: unknown[];
    },
): SecretaryAlert {
    if (normalizeClientPhone(alert.clientPhone)) return alert;

    const id = alert.entityId ? String(alert.entityId) : '';
    if (!id) return alert;

    let phone: string | null = null;
    const dossier = alert.calendarSource?.dossierModule;
    const dossierId = alert.calendarSource?.dossierId;

    const resolveId = dossierId ?? id;

    if (alert.target === 'lawsuit' || dossier === 'lawsuit') {
        const file = ctx.lawsuitFiles?.find((f) => String(f.id) === resolveId);
        if (file) phone = phoneFromLawsuit(file);
    } else if (alert.target === 'execution' || dossier === 'execution') {
        const file = ctx.executionFiles?.find((f) => String((f as { id?: unknown }).id ?? '') === resolveId);
        if (file) phone = phoneFromExecution(file);
    } else if (alert.target === 'criminal' || dossier === 'criminal') {
        const row = ctx.criminalCases?.find((c) => String((c as { id?: unknown }).id ?? '') === resolveId);
        if (row) phone = phoneFromCriminal(row);
    } else if (alert.target === 'urgent' || dossier === 'urgent') {
        const row = ctx.urgentCases?.find((c) => String((c as { id?: unknown }).id ?? '') === resolveId);
        if (row) phone = phoneFromUrgent(row);
    }

    if (!phone) return alert;
    return { ...alert, clientPhone: phone };
}
