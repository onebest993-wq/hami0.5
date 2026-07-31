import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { dossierLifecycleBadgeAr } from '@/app/components/lawyer/ExecutionDashboard/helpers/dossierLifecycleUtils';
import {
    normalizeDossierLifecycleStatus,
    type DossierLifecycleStatus,
} from '@/app/types/execution';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import {
    DEBTOR_ENTITY_KIND_LABELS,
    resolveDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import {
    formatClaimTypeArabic,
    inferEvictionPremisesUse,
} from '@/app/utils/executionModuleStrategies';
import type { LooseArchiveFile } from './types';

function parseLooseAmount(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
}

function executionTotalDemandEstimate(file: LooseArchiveFile): number {
    const f = file as unknown as Record<string, unknown>;
    const principal = parseLooseAmount(f.totalAmount ?? f.amount ?? f.debtAmount);
    const lawyer = parseLooseAmount(f.lawyerFeesAmount);
    const court = parseLooseAmount(f.courtFees);
    const dir = parseLooseAmount(f.directorateFees);
    const evx = Array.isArray(f.eviction_case_expenses)
        ? (f.eviction_case_expenses as { amount?: unknown }[]).reduce(
              (s, x) => s + parseLooseAmount(x?.amount),
              0,
          )
        : 0;
    return principal + lawyer + court + dir + evx;
}

function splitCaseNoParts(caseNo: string | undefined): { number: string; year: string } {
    const raw = String(caseNo || '').trim();
    if (!raw) return { number: '', year: '' };
    const slash = raw
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean);
    if (slash.length >= 2) {
        return { number: slash[0], year: slash[slash.length - 1] };
    }
    return { number: raw, year: '' };
}

function joinPartyNames(
    parties: Array<{ role?: string; isClient?: boolean }>,
    role: 'creditor' | 'debtor',
): string {
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

function formatExecutionArchiveCreditorLabel(file: ExecutionFile): string {
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

function formatExecutionArchiveDebtorLabel(file: ExecutionFile): string {
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

function formatExecutionArchiveClientDebtorLabel(file: ExecutionFile): string {
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

function resolveExecutionArchiveFileNumberYear(file: ExecutionFile): { fileNumber: string; year: string } {
    const split = splitCaseNoParts(typeof file.caseNo === 'string' ? file.caseNo : undefined);
    const fileNumber =
        String(file.fileNumber || '').trim() ||
        split.number ||
        String(file.caseNo || '').trim() ||
        'غير محدد';
    const year =
        String(file.fileYear || (file as { year?: unknown }).year || '').trim() ||
        split.year ||
        String(new Date().getFullYear());
    return { fileNumber, year };
}

function buildExecutionFileSnapshotLite(file: LooseArchiveFile): ExecutionFile {
    return normalizeExecutionFileRecord(file);
}

function formatArchiveExecutionStatusLabel(status: string | undefined): string {
    const s = String(status || '').trim();
    if (!s || s === 'active') return '';
    if (s === 'paused') return 'موقوف';
    if (s === 'archived' || s === 'archived_stage') return 'مؤرشف';
    if (s === 'deleted') return 'محذوف';
    if (s.includes('متلكئ')) return 'متلكئ';
    if (s.includes('بانتظار')) return 'بانتظار';
    if (s.includes('منتهية') || s.includes('منجز')) return 'منتهية';
    return s;
}

export type ExecutionArchiveCardViewLite = {
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

export function resolveExecutionArchiveCardViewLite(
    file: LooseArchiveFile,
    unifiedMeta?: { unifiedCount?: number; unifiedTotalDemand?: number },
): ExecutionArchiveCardViewLite {
    const snap = buildExecutionFileSnapshotLite(file);
    const loose = file;
    const { fileNumber, year } = resolveExecutionArchiveFileNumberYear(snap);
    const directorateLabel = String(snap.directorate || '').trim() || null;
    const courtRaw = String(snap.court || '').trim();
    const court = courtRaw || directorateLabel || 'غير محدد';
    const isRepresentingDebtor = isLawyerRepresentingDebtor(snap);
    const primaryDebtorKey = String(
        (Array.isArray(snap.debtors) && snap.debtors[0]
            ? (snap.debtors[0] as { id?: string }).id
            : '') ?? '',
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
    const unifiedCount = Number(unifiedMeta?.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number(unifiedMeta?.unifiedTotalDemand);
    const totalDemand =
        unifiedCount > 0 && Number.isFinite(unifiedTotalDemandRaw) && unifiedTotalDemandRaw > 0
            ? unifiedTotalDemandRaw
            : executionTotalDemandEstimate(loose);
    const relationship = String(loose.relationship || '').trim() || null;
    const linkedDebtorLabel =
        resolvePartyStoredName(loose.linkedDebtor) ||
        (relationship ? formatExecutionArchiveDebtorLabel(snap) : null);
    const dossierLifecycleStatus = normalizeDossierLifecycleStatus(
        (snap as { dossier_lifecycle_status?: string }).dossier_lifecycle_status,
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
        totalDemand,
        remainingDemand: totalDemand,
        demandLabel:
            unifiedCount > 0 && Number.isFinite(unifiedTotalDemandRaw) && unifiedTotalDemandRaw > 0
                ? 'إجمالي المطلوب (بعد التوحيد)'
                : 'إجمالي المطلوب (تقدير)',
        secondaryDemandLabel: null,
        syncedFromLedger: false,
        status: String(snap.status || 'active'),
        statusLabel: formatArchiveExecutionStatusLabel(String(snap.status || 'active')),
        dossierLifecycleStatus,
        dossierLifecycleBadge: dossierLifecycleBadgeAr(dossierLifecycleStatus),
    };
}
