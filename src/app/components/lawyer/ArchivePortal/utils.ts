import {
    formatClaimTypeArabic,
    inferEvictionPremisesUse,
} from '@/app/utils/executionModuleStrategies';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    normalizeDossierLifecycleStatus,
    type DossierLifecycleStatus,
} from '@/app/types/execution';
import {
    dossierLifecycleBadgeAr,
} from '@/app/components/lawyer/ExecutionDashboard/helpers/dossierLifecycleUtils';
import { normalizeExecutionPartyList, resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import {
    DEBTOR_ENTITY_KIND_LABELS,
    resolveDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import { storageCache } from '@/app/utils/storageCache';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { LooseArchiveFile } from './types';
import {
    formatArchiveExecutionStatusLabel,
    resolveExecutionArchiveFinancialDemand,
} from './archiveFinancialSync';
export { executionTotalDemandEstimate, parseLooseAmount } from './archivePortalAmountUtils';

export function executionArchiveLocalStorageKey(file: LooseArchiveFile): string | null {
    const id = (file as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return executionStorageKey(id.trim());
    if (typeof id === 'number' && Number.isFinite(id)) return executionStorageKey(String(id));
    return null;
}

export function mergedPreviewTimelineEvents(
    file: LooseArchiveFile | null
): NonNullable<LooseArchiveFile['timelineEvents']> {
    if (!file) return [];
    const fromFile = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    if (typeof window === 'undefined') return fromFile;

    const lsKey = executionArchiveLocalStorageKey(file);
    if (!lsKey) return fromFile;

    let fromLs: NonNullable<LooseArchiveFile['timelineEvents']> = [];
    try {
        const raw = SecureStoreService.getItemSync(lsKey);
        if (raw) {
            const parsed = JSON.parse(raw) as { timelineEvents?: unknown };
            if (Array.isArray(parsed?.timelineEvents)) {
                fromLs = parsed.timelineEvents as NonNullable<LooseArchiveFile['timelineEvents']>;
            }
        }
    } catch {
        return fromFile.length > 0 ? fromFile : [];
    }

    if (fromLs.length === 0) return fromFile;
    if (fromFile.length === 0) return fromLs;

    const seen = new Set<string>();
    const out: NonNullable<LooseArchiveFile['timelineEvents']> = [];
    const keyOf = (ev: { id?: string; title?: string; date?: string; timestamp?: string }, i: number) =>
        String(ev.id ?? `${ev.title ?? ''}|${ev.date ?? ''}|${ev.timestamp ?? ''}|${i}`);

    for (const ev of [...fromFile, ...fromLs]) {
        const k = keyOf(ev, out.length);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(ev);
    }
    out.sort((a, b) => {
        const ta = Date.parse(String(a.timestamp ?? a.date ?? '')) || 0;
        const tb = Date.parse(String(b.timestamp ?? b.date ?? '')) || 0;
        return tb - ta;
    });
    return out;
}

function splitCaseNoParts(caseNo: string | undefined): { number: string; year: string } {
    const raw = String(caseNo || '').trim();
    if (!raw) return { number: '', year: '' };
    const slash = raw.split('/').map((p) => p.trim()).filter(Boolean);
    if (slash.length >= 2) {
        return { number: slash[0], year: slash[slash.length - 1] };
    }
    return { number: raw, year: '' };
}

/** دمج قائمة الإضابير مع النسخة الحية في تخزين الإضبارة (أحدث بيانات بعد التعديل) */
export function readExecutionFileLiveSnapshot(file: LooseArchiveFile): ExecutionFile {
    const id = String((file as { id?: unknown }).id ?? '').trim();
    let fromStorage: Record<string, unknown> | null = null;
    if (id) {
        try {
            const cached = storageCache.get(executionStorageKey(id));
            if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
                fromStorage = cached as Record<string, unknown>;
            }
        } catch {
            /* ignore */
        }
        if (!fromStorage) {
            try {
                const raw = SecureStoreService.getItemSync(executionStorageKey(id));
                if (raw) {
                    const parsed = JSON.parse(raw) as unknown;
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        fromStorage = parsed as Record<string, unknown>;
                    }
                }
            } catch {
                /* ignore */
            }
        }
    }
    const merged = fromStorage
        ? ({ ...file, ...fromStorage, id: id || fromStorage.id } as LooseArchiveFile)
        : file;
    const rawCreditors = Array.isArray((merged as { creditors?: unknown }).creditors)
        ? (merged as { creditors: unknown[] }).creditors
        : null;
    const rawDebtors = Array.isArray((merged as { debtors?: unknown }).debtors)
        ? (merged as { debtors: unknown[] }).debtors
        : null;
    const snap = normalizeExecutionFileRecord(merged);
    if (rawCreditors && rawCreditors.length > 0) {
        snap.creditors = normalizeExecutionPartyList(rawCreditors, 'الدائن');
    }
    if (rawDebtors && rawDebtors.length > 0) {
        snap.debtors = normalizeExecutionPartyList(rawDebtors, 'المدين');
    }
    return snap;
}

function joinPartyNames(parties: Array<{ role?: string; isClient?: boolean }>, role: 'creditor' | 'debtor'): string {
    const isCreditor = role === 'creditor';
    const filtered = parties.filter((p) => {
        const r = String(p.role || '').trim();
        if (isCreditor) return r === 'الدائن' || r.includes('دائن');
        return r === 'المدين' || r.includes('مدين');
    });
    const names = filtered.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (names.length > 0) return names.join(' · ');
    return 'غير محدد';
}

export function formatExecutionArchiveCreditorLabel(file: ExecutionFile): string {
    const creditors = Array.isArray(file.creditors) ? file.creditors : [];
    const clientNames = creditors
        .filter((p) => p.isClient === true)
        .map((p) => resolvePartyStoredName(p))
        .filter(Boolean);
    if (clientNames.length > 0) return clientNames.join(' · ');
    const all = creditors.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (all.length > 0) return all.join(' · ');
    const fromParties = joinPartyNames(file.parties || [], 'creditor');
    return fromParties !== 'غير محدد'
        ? fromParties
        : resolvePartyStoredName((file as { creditor?: unknown }).creditor) ||
              resolvePartyStoredName((file as { clientName?: unknown }).clientName) ||
              'غير محدد';
}

export function formatExecutionArchiveDebtorLabel(file: ExecutionFile): string {
    const debtors = Array.isArray(file.debtors) ? file.debtors : [];
    const names = debtors.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (names.length > 0) return names.join(' · ');
    const fromParties = joinPartyNames(file.parties || [], 'debtor');
    return fromParties !== 'غير محدد'
        ? fromParties
        : resolvePartyStoredName((file as { debtor?: unknown }).debtor) ||
              resolvePartyStoredName((file as { opponentName?: unknown }).opponentName) ||
              'غير محدد';
}

/** اسم موكل المحامي عند تمثيل المدين */
export function formatExecutionArchiveClientDebtorLabel(file: ExecutionFile): string {
    const debtors = Array.isArray(file.debtors) ? file.debtors : [];
    const clientNames = debtors
        .filter((p) => p.isClient === true)
        .map((p) => resolvePartyStoredName(p))
        .filter(Boolean);
    if (clientNames.length > 0) return clientNames.join(' · ');
    const additional = (
        file as { party_multiplicity?: { additionalDebtors?: Array<{ isClient?: boolean }> } }
    ).party_multiplicity?.additionalDebtors;
    if (Array.isArray(additional)) {
        const extra = additional
            .filter((p) => p.isClient === true)
            .map((p) => resolvePartyStoredName(p))
            .filter(Boolean);
        if (extra.length > 0) return extra.join(' · ');
    }
    return formatExecutionArchiveDebtorLabel(file);
}

export function resolveExecutionArchiveFileNumberYear(file: ExecutionFile): { fileNumber: string; year: string } {
    const split = splitCaseNoParts(typeof file.caseNo === 'string' ? file.caseNo : undefined);
    const fileNumber =
        String(file.fileNumber || '').trim() || split.number || String(file.caseNo || '').trim() || 'غير محدد';
    const year =
        String(file.fileYear || (file as { year?: unknown }).year || '').trim() ||
        split.year ||
        String(new Date().getFullYear());
    return { fileNumber, year };
}

export type ExecutionArchiveCardView = {
    snap: ExecutionFile;
    fileNumber: string;
    year: string;
    court: string;
    directorateLabel: string | null;
    claimLabelAr: string;
    docTypeLabel: string | null;
    creditorLabel: string;
    debtorLabel: string;
    isRepresentingDebtor: boolean;
    clientLabel: string;
    clientRoleLabel: string;
    counterpartyLabel: string;
    counterpartyRoleLabel: string;
    debtorEntityKindLabel: string;
    relationship: string | null;
    linkedDebtorLabel: string | null;
    totalDemand: number;
    remainingDemand: number;
    demandLabel: string;
    secondaryDemandLabel: string | null;
    syncedFromLedger: boolean;
    status: string;
    statusLabel: string;
    dossierLifecycleStatus: DossierLifecycleStatus;
    dossierLifecycleBadge: string;
};

export function resolveExecutionArchiveCardView(
    file: LooseArchiveFile,
    unifiedMeta?: { unifiedCount?: number; unifiedTotalDemand?: number }
): ExecutionArchiveCardView {
    const snap = readExecutionFileLiveSnapshot(file);
    const loose = snap as unknown as LooseArchiveFile;
    const { fileNumber, year } = resolveExecutionArchiveFileNumberYear(snap);
    const directorateLabel = String(snap.directorate || '').trim() || null;
    const courtRaw = String(snap.court || '').trim();
    const court = courtRaw || directorateLabel || 'غير محدد';
    const isRepresentingDebtor = isLawyerRepresentingDebtor(snap);
    const primaryDebtorKey = String(
        (Array.isArray(snap.debtors) && snap.debtors[0]
            ? (snap.debtors[0] as { id?: string }).id
            : '') ?? ''
    ).trim();
    const debtorEntityKind = resolveDebtorEntityKind({
        executionData: snap,
        debtorKey: primaryDebtorKey,
    });
    const debtorEntityKindLabel = DEBTOR_ENTITY_KIND_LABELS[debtorEntityKind];
    const creditorLabel = formatExecutionArchiveCreditorLabel(snap);
    const debtorLabel = formatExecutionArchiveDebtorLabel(snap);
    const clientLabel = isRepresentingDebtor
        ? formatExecutionArchiveClientDebtorLabel(snap)
        : creditorLabel;
    const counterpartyLabel = isRepresentingDebtor ? creditorLabel : debtorLabel;
    const premises = inferEvictionPremisesUse({
        explicit: loose.eviction_premises_use ?? null,
        propertyTypeText: loose.property_type,
    });
    const claimRaw = String(snap.claimType || '').trim();
    const claimAr = formatClaimTypeArabic(claimRaw, premises);
    const claimLabelAr = claimAr && claimAr !== '—' ? claimAr : claimRaw || 'تنفيذ';
    const docTypeRaw = String(snap.docType || '').trim();
    const docTypeLabel =
        docTypeRaw && docTypeRaw !== claimRaw && docTypeRaw !== claimLabelAr ? docTypeRaw : null;
    const financial = resolveExecutionArchiveFinancialDemand(snap, loose, unifiedMeta);
    const relationship = String(loose.relationship || '').trim() || null;
    const linkedDebtorLabel =
        resolvePartyStoredName(loose.linkedDebtor) ||
        (relationship ? formatExecutionArchiveDebtorLabel(snap) : null);
    const dossierLifecycleStatus = normalizeDossierLifecycleStatus(
        (snap as { dossier_lifecycle_status?: string }).dossier_lifecycle_status
    );
    return {
        snap,
        fileNumber,
        year,
        court,
        directorateLabel,
        claimLabelAr,
        docTypeLabel,
        creditorLabel,
        debtorLabel,
        isRepresentingDebtor,
        clientLabel,
        clientRoleLabel: 'موكلي',
        counterpartyLabel,
        counterpartyRoleLabel: isRepresentingDebtor ? 'الدائن' : 'المدين',
        debtorEntityKindLabel,
        relationship,
        linkedDebtorLabel,
        totalDemand: financial.totalDemand,
        remainingDemand: financial.remainingDemand,
        demandLabel: financial.demandLabel,
        secondaryDemandLabel: financial.secondaryDemandLabel,
        syncedFromLedger: financial.syncedFromLedger,
        status: String(snap.status || 'active'),
        statusLabel: formatArchiveExecutionStatusLabel(String(snap.status || 'active')),
        dossierLifecycleStatus,
        dossierLifecycleBadge: dossierLifecycleBadgeAr(dossierLifecycleStatus),
    };
}

export function executionClaimBadgeArabic(file: LooseArchiveFile): string {
    return resolveExecutionArchiveCardView(file).claimLabelAr;
}
