import type { CaseType, LegalCase } from '@/app/stores/caseStore';
import {
    FOUNDATION_STORE_PERSIST_V1,
    unwrapPersistedSlice,
} from '@/app/infrastructure/persistence/zustandPersistFoundation';

export const CASE_STORE_KEY = 'legal-cases-storage';
export const CASE_STORE_PERSIST_VERSION = FOUNDATION_STORE_PERSIST_V1;

const CASE_TYPES = new Set<CaseType>(['lawsuit', 'transaction', 'execution']);
const CASE_STATUSES = new Set<LegalCase['status']>(['active', 'archived', 'completed', 'deleted']);

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function normalizeLegalCase(raw: unknown): LegalCase | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = asString(o.id).trim();
    if (!id) return null;
    const type = asString(o.type) as CaseType;
    const status = asString(o.status) as LegalCase['status'];
    return {
        id,
        caseNo: asString(o.caseNo).trim() || id,
        title: asString(o.title).trim() || '—',
        type: CASE_TYPES.has(type) ? type : 'lawsuit',
        court: asString(o.court).trim() || undefined,
        clientName: asString(o.clientName).trim() || '—',
        opponentName: asString(o.opponentName).trim() || '—',
        linkedDocuments: Array.isArray(o.linkedDocuments) ? (o.linkedDocuments as LegalCase['linkedDocuments']) : [],
        deadlines: Array.isArray(o.deadlines) ? (o.deadlines as LegalCase['deadlines']) : [],
        timeline: Array.isArray(o.timeline) ? (o.timeline as LegalCase['timeline']) : [],
        checklists: Array.isArray(o.checklists) ? (o.checklists as LegalCase['checklists']) : undefined,
        executionDetails:
            o.executionDetails && typeof o.executionDetails === 'object'
                ? (o.executionDetails as LegalCase['executionDetails'])
                : undefined,
        notes: Array.isArray(o.notes) ? (o.notes as LegalCase['notes']) : undefined,
        createdAt: asString(o.createdAt) || new Date().toISOString(),
        updatedAt: asString(o.updatedAt) || new Date().toISOString(),
        status: CASE_STATUSES.has(status) ? status : 'active',
    };
}

export type CasePersistSlice = {
    cases: LegalCase[];
    selectedCaseId: string | null;
};

export function normalizeCasePersistSlice(persisted: unknown): CasePersistSlice {
    const slice = unwrapPersistedSlice<CasePersistSlice>(persisted);
    const rawCases = Array.isArray(slice.cases) ? slice.cases : [];
    const cases = rawCases
        .map((item) => normalizeLegalCase(item))
        .filter((item): item is LegalCase => Boolean(item));
    const selectedRaw = slice.selectedCaseId;
    const selectedCaseId =
        typeof selectedRaw === 'string' && selectedRaw.trim() ? selectedRaw.trim() : null;
    return { cases, selectedCaseId };
}

export function migrateCasePersistState(persisted: unknown, _version: number): CasePersistSlice {
    void _version;
    return normalizeCasePersistSlice(persisted);
}
