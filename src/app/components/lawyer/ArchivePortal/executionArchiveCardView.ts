import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    normalizeDossierLifecycleStatus,
    type DossierLifecycleStatus,
} from '@/app/types/execution/core';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import {
    DEBTOR_ENTITY_KIND_LABELS,
    resolveDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import type { LooseArchiveFile } from './types';
import { resolveExecutionArchiveListDemand } from './archivePortalAmountUtils';
import { formatArchiveExecutionStatusLabel } from './executionArchiveStatusLabel';
import {
    formatArchiveClaimTypeArabic,
    formatExecutionArchiveClassificationDisplay,
    formatExecutionArchiveClientDebtorLabel,
    formatExecutionArchiveCreditorLabel,
    formatExecutionArchiveDebtorLabel,
    inferArchiveEvictionPremisesUse,
    resolveExecutionArchiveFileNumberYear,
} from './executionArchiveListLabels';

export type ExecutionArchiveCardView = {
    snap: ExecutionFile;
    fileNumber: string;
    year: string;
    court: string;
    directorateLabel: string | null;
    claimLabelAr: string;
    docTypeLabel: string | null;
    classificationDisplay: string;
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

function indexClaimTypes(file: LooseArchiveFile): string[] {
    const raw = (file as { claimTypes?: unknown }).claimTypes;
    if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((t) => String(t || '').trim()).filter(Boolean);
    }
    const one = String(file.claimType || '').trim();
    return one ? [one] : [];
}

const DOSSIER_LIFECYCLE_BADGE_AR: Record<DossierLifecycleStatus, string> = {
    active: 'نشطة',
    paused: 'متوقفة',
    suspended: 'مستأخرة',
    finished: 'انتهاء الإضبارة',
};

/**
 * عرض بطاقة المخزن من صف الفهرس فقط — بلا كاش تخزين ولا دفتر موحّد.
 * المبلغ تقدير من الحقول الظاهرة؛ الدفتر يُقرأ عند فتح الإضبارة.
 */
export function resolveExecutionArchiveCardView(
    file: LooseArchiveFile,
    unifiedMeta?: { unifiedCount?: number; unifiedTotalDemand?: number },
): ExecutionArchiveCardView {
    const snap = file as unknown as ExecutionFile;
    const rec = file as unknown as Record<string, unknown>;
    const { fileNumber, year } = resolveExecutionArchiveFileNumberYear(file);
    const directorateLabel = String((file as { directorate?: string }).directorate || '').trim() || null;
    const courtRaw = typeof file.court === 'string' ? file.court.trim() : '';
    const court = courtRaw || directorateLabel || 'غير محدد';
    const isRepresentingDebtor = isLawyerRepresentingDebtor(snap);
    const debtorRows = Array.isArray(rec.debtors)
        ? (rec.debtors as Array<{ id?: string } | null>)
        : [];
    const primaryDebtorKey = String(debtorRows[0]?.id ?? '').trim();
    const debtorEntityKind = resolveDebtorEntityKind({
        executionData: snap,
        debtorKey: primaryDebtorKey,
    });
    const debtorEntityKindLabel = DEBTOR_ENTITY_KIND_LABELS[debtorEntityKind];
    const creditorLabel = formatExecutionArchiveCreditorLabel(file);
    const debtorLabel = formatExecutionArchiveDebtorLabel(file);
    const clientLabel = isRepresentingDebtor
        ? formatExecutionArchiveClientDebtorLabel(file)
        : creditorLabel;
    const counterpartyLabel = isRepresentingDebtor ? creditorLabel : debtorLabel;
    const premises = inferArchiveEvictionPremisesUse({
        explicit: file.eviction_premises_use ?? null,
        propertyTypeText: file.property_type,
    });
    const claimTypes = indexClaimTypes(file);
    const claimLabels = claimTypes
        .map((ct) => formatArchiveClaimTypeArabic(ct, premises))
        .filter((label) => label && label !== '—');
    const claimRaw = claimTypes[0] || '';
    const claimLabelAr =
        claimLabels.length > 0 ? [...new Set(claimLabels)].join(' · ') : claimRaw || 'تنفيذ';
    const docTypeRaw = String(file.docType || '').trim();
    const docTypeLabel =
        docTypeRaw && docTypeRaw !== claimRaw && !claimLabels.includes(docTypeRaw) ? docTypeRaw : null;
    const financial = resolveExecutionArchiveListDemand(file, unifiedMeta);
    const relationship = String(file.relationship || '').trim() || null;
    const linkedDebtorLabel =
        resolvePartyStoredName(file.linkedDebtor) || (relationship ? debtorLabel : null);
    const dossierLifecycleStatus = normalizeDossierLifecycleStatus(
        (file as { dossier_lifecycle_status?: string }).dossier_lifecycle_status,
    );
    return {
        snap,
        fileNumber,
        year,
        court,
        directorateLabel,
        claimLabelAr,
        docTypeLabel,
        classificationDisplay: formatExecutionArchiveClassificationDisplay(file),
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
        status: String((file as { status?: string }).status || 'active'),
        statusLabel: formatArchiveExecutionStatusLabel(String((file as { status?: string }).status || 'active')),
        dossierLifecycleStatus,
        dossierLifecycleBadge: DOSSIER_LIFECYCLE_BADGE_AR[dossierLifecycleStatus],
    };
}

export function executionClaimBadgeArabic(file: LooseArchiveFile): string {
    return resolveExecutionArchiveCardView(file).claimLabelAr;
}
