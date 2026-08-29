import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { UrgentCase } from '@/app/components/lawyer/Component_Urgent_Card';
import { isUrgentCaseClosed } from '@/app/components/lawyer/Component_Urgent_Card';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import type { ExecutionFile } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';

export type DossierContext = {
    clientName: string;
    caseNumber: string;
    courtName: string;
    actionType: string;
};

export type DossierRegistry = {
    isActive: (module: string | undefined, entityId: string | undefined) => boolean;
    resolve: (module: string | undefined, entityId: string | undefined) => DossierContext | null;
};

function safeText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim();
}

export function isActiveLawsuitFile(file: FileData): boolean {
    if (
        file.status === 'deleted' ||
        file.status === 'archived' ||
        file.status === 'archived_stage' ||
        file.status === 'paused'
    ) {
        return false;
    }
    return true;
}

export function isActiveExecutionFile(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const f = raw as ExecutionFile & { executionTrashDeletedAt?: string | null; deleted?: boolean };
    if (f.deleted === true) return false;
    if (isExecutionInTrash(f)) return false;
    if (isExecutionArchived(f)) return false;
    if (normalizeDossierLifecycleStatus(f.dossier_lifecycle_status) === 'finished') return false;
    return true;
}

export function isActiveUrgentCaseRecord(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const c = raw as UrgentCase;
    if (c.deleted || c.archived) return false;
    if (c.phase === 'completed' || c.status === 'completed') return false;
    if (isUrgentCaseClosed(c)) return false;
    return true;
}

export function isActiveCriminalCase(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const c = raw as CriminalCase;
    if (c.isArchived === true) return false;
    if (c.dossierStatus === 'merged') return false;
    return true;
}

function clientNameFromParties(file: FileData): string {
    const p = file.parties?.find((x) => x.isClient);
    return p?.name?.trim() || '';
}

function contextFromLawsuit(file: FileData): DossierContext {
    return {
        clientName: clientNameFromParties(file) || 'موكل غير محدد',
        caseNumber: safeText(file.caseNo) || '—',
        courtName: safeText(file.court) || '—',
        actionType: safeText(file.currentStage) || safeText(file.docType) || 'دعوى مدنية',
    };
}

function contextFromExecution(file: ExecutionFile): DossierContext {
    const debtor = file.debtors?.[0]?.name?.trim();
    const court =
        safeText((file as { court_name?: string }).court_name) ||
        safeText(file.directorate) ||
        '—';
    const fileNo = safeText(file.fileNumber) || '—';
    const year = safeText(file.fileYear);
    const caseNumber = year && fileNo !== '—' ? `${fileNo}/${year}` : fileNo;
    return {
        clientName: debtor || 'مدين غير محدد',
        caseNumber,
        courtName: court,
        actionType: safeText(file.claimType) || safeText(file.docType) || 'إضبارة تنفيذ',
    };
}

function contextFromUrgent(c: UrgentCase): DossierContext {
    return {
        clientName: safeText(c.applicantName) || 'موكل غير محدد',
        caseNumber: safeText(c.requestNumber) || '—',
        courtName: safeText(c.court) || safeText(c.courtName) || '—',
        actionType:
            safeText(c.actionType) || safeText(c.specificActionType) || 'طلب مستعجل',
    };
}

function contextFromCriminal(c: CriminalCase): DossierContext {
    const defendant = c.defendants?.[0]?.fullName?.trim();
    const complainant = c.complainants?.[0]?.fullName?.trim();
    const clientName = defendant || complainant || 'موكل غير محدد';
    const caseNumber =
        safeText(c.location?.caseNumber) ||
        safeText(c.location?.investigationDossierNumber) ||
        safeText(c.location?.baseRegisterNumberAndDate) ||
        '—';
    const courtName =
        safeText(c.location?.courtName) ||
        safeText(c.location?.investigationCourtName) ||
        '—';
    const stage = safeText(c.basics?.stage);
    return {
        clientName,
        caseNumber,
        courtName,
        actionType: stage ? `جزائي — ${stage}` : 'قضية جزائية',
    };
}

export function buildDossierRegistry(params: {
    lawsuitFiles: FileData[];
    executionFiles: unknown[];
    urgentCases: unknown[];
    criminalCases?: unknown[];
}): DossierRegistry {
    const byKey = new Map<string, DossierContext>();
    const activeKeys = new Set<string>();

    for (const f of params.lawsuitFiles) {
        if (!isActiveLawsuitFile(f)) continue;
        const id = String(f.id);
        activeKeys.add(`lawsuit:${id}`);
        byKey.set(`lawsuit:${id}`, contextFromLawsuit(f));
        if (f.type === 'transaction') {
            activeKeys.add(`transaction:${id}`);
            byKey.set(`transaction:${id}`, contextFromLawsuit(f));
        }
    }

    for (const raw of params.executionFiles) {
        if (!isActiveExecutionFile(raw)) continue;
        const f = raw as ExecutionFile;
        const id = String(f.id);
        activeKeys.add(`execution:${id}`);
        byKey.set(`execution:${id}`, contextFromExecution(f));
    }

    for (const raw of params.urgentCases) {
        if (!isActiveUrgentCaseRecord(raw)) continue;
        const c = raw as UrgentCase;
        const id = String(c.id);
        activeKeys.add(`urgent:${id}`);
        byKey.set(`urgent:${id}`, contextFromUrgent(c));
    }

    for (const raw of params.criminalCases ?? []) {
        if (!isActiveCriminalCase(raw)) continue;
        const c = raw as CriminalCase;
        const id = String(c.id);
        activeKeys.add(`criminal:${id}`);
        byKey.set(`criminal:${id}`, contextFromCriminal(c));
    }

    return {
        isActive(module, entityId) {
            if (!entityId?.trim()) return true;
            const mod = (module ?? 'manual') as CalendarSourceModule;
            // التقويم مصدر الحقيقة لمهل Threading والمهام/الملاحظات — ليست في سجل الإضابير.
            if (mod === 'manual' || mod === 'task' || mod === 'note' || mod === 'threading') {
                return true;
            }
            return activeKeys.has(`${mod}:${entityId}`);
        },
        resolve(module, entityId) {
            if (!entityId?.trim()) return null;
            const mod = module ?? 'lawsuit';
            return byKey.get(`${mod}:${entityId}`) ?? null;
        },
    };
}

export function contextFromCalendarEvent(ev: {
    title: string;
    caseNo?: string;
    clientName?: string;
    court?: string;
    sourceLabel?: string;
    partiesSummary?: string;
}): DossierContext {
    const session = ev.title.replace(/^جلسة(?:\s*قادمة)?\s*[—–-]\s*/u, '').trim();
    return {
        clientName: safeText(ev.clientName) || safeText(ev.partiesSummary) || 'موكل غير محدد',
        caseNumber: safeText(ev.caseNo) || '—',
        courtName: safeText(ev.court) || '—',
        actionType: session || safeText(ev.sourceLabel) || safeText(ev.title) || 'موعد',
    };
}

export function mergeDossierContext(
    primary: DossierContext | null,
    fallback: DossierContext,
): DossierContext {
    if (!primary) return fallback;
    return {
        clientName:
            primary.clientName !== 'موكل غير محدد' && primary.clientName !== 'مدين غير محدد'
                ? primary.clientName
                : fallback.clientName,
        caseNumber: primary.caseNumber !== '—' ? primary.caseNumber : fallback.caseNumber,
        courtName: primary.courtName !== '—' ? primary.courtName : fallback.courtName,
        actionType: primary.actionType || fallback.actionType,
    };
}
