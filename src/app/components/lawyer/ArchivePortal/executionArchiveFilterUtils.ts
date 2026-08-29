import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import { isLegalEntityDebtorKind } from '@/app/utils/debtorEntityKindUtils';
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';
import {
    normalizeDossierLifecycleStatus,
    type DossierLifecycleStatus,
} from '@/app/types/execution/core';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import type { LooseArchiveFile } from './types';
import { executionArchiveSearchHaystack } from './executionArchiveListLabels';
import {
    EXECUTION_DOSSIER_STATUS_CHIP_DEFS,
    EXECUTION_DOSSIER_STATUS_LABELS,
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_JURISDICTION_TAB_DEFS,
    EXECUTION_PERSPECTIVE_LABELS,
    EXECUTION_PERSPECTIVE_TAB_DEFS,
    type ExecutionArchiveLifecycleMode,
    type ExecutionDossierStatusFilter,
    type ExecutionJurisdictionFilter,
    type ExecutionPerspectiveFilter,
    type ExecutionViewMode,
} from './executionArchiveFilterPresentation';

export type {
    ExecutionArchiveLifecycleMode,
    ExecutionDossierStatusFilter,
    ExecutionJurisdictionFilter,
    ExecutionPerspectiveFilter,
    ExecutionViewMode,
};
export {
    EXECUTION_DOSSIER_STATUS_CHIP_DEFS,
    EXECUTION_DOSSIER_STATUS_LABELS,
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_JURISDICTION_TAB_DEFS,
    EXECUTION_PERSPECTIVE_LABELS,
    EXECUTION_PERSPECTIVE_TAB_DEFS,
};

/** تصنيف سريع من صف الفهرس — بلا قراءة blob الإضبارة */
function isShariaExecutionArchiveIndexHint(file: LooseArchiveFile): boolean {
    const classification = String(file.classification || '').trim();
    if (classification === 'شرعي' || classification === 'أحوال شخصية') return true;

    const category = String((file as { category?: string }).category || '').trim();
    if (category === 'sharia' || category === 'personal') return true;

    const claimType = String(file.claimType || file.docType || '').trim();
    if (!claimType) return false;

    return (
        claimType.includes('نفقة') ||
        claimType.includes('مهر') ||
        claimType.includes('مشاهدة') ||
        claimType.includes('مطاوعة') ||
        claimType.includes('أثاث زوجية') ||
        claimType.includes('استصحاب') ||
        claimType.includes('مبيت') ||
        claimType.includes('تسليم طفل') ||
        claimType.includes('تسليم ولد') ||
        claimType.includes('شرعي') ||
        claimType.includes('أحوال')
    );
}

/** إضبارة شرعية / أحوال شخصية — قائمة المخزن تتبع الفهرس لا البلوب */
export function isShariaExecutionArchive(file: LooseArchiveFile): boolean {
    return isShariaExecutionArchiveIndexHint(file);
}

/** إضبارة مدنية — عكس الشرعي في الفهرس ليطابق عدّ الاختصاص */
export function isCivilExecutionArchive(file: LooseArchiveFile): boolean {
    return !isShariaExecutionArchiveIndexHint(file);
}

function matchesExecutionJurisdictionFilter(
    file: LooseArchiveFile,
    filter: ExecutionJurisdictionFilter,
): boolean {
    if (filter === 'all') return true;
    if (filter === 'sharia') return isShariaExecutionArchive(file);
    return isCivilExecutionArchive(file);
}

/** الشرعي / أحوال شخصية — لا يوجد مدين معنوي */
export function isLegalEntityPerspectiveAllowed(
    jurisdiction: ExecutionJurisdictionFilter,
): boolean {
    return jurisdiction !== 'sharia';
}

function isLegalEntityFromIndex(file: LooseArchiveFile): boolean {
    const rec = file as Record<string, unknown>;
    if (isLegalEntityDebtorKind(rec.debtor_entity_kind as string)) return true;
    if (isLegalEntityDebtorKind(rec.debtor_entity_type as string)) return true;
    const d0 = Array.isArray(file.debtors)
        ? (file.debtors[0] as Record<string, unknown> | undefined)
        : undefined;
    if (!d0) return false;
    return isLegalEntityDebtorKind(
        (d0.entityKind ?? d0.entityType ?? d0.entity_kind) as string,
    );
}

export function matchesExecutionPerspectiveFilter(
    file: LooseArchiveFile,
    filter: ExecutionPerspectiveFilter,
    jurisdiction: ExecutionJurisdictionFilter = 'all',
): boolean {
    if (filter === 'all') return true;
    if (filter === 'legal_entity' && !isLegalEntityPerspectiveAllowed(jurisdiction)) return false;

    if (filter === 'debtor_agent') return isLawyerRepresentingDebtor(file);
    if (filter === 'creditor_agent') return !isLawyerRepresentingDebtor(file);

    if (isShariaExecutionArchive(file)) return false;
    return isLegalEntityFromIndex(file);
}

export function matchesExecutionArchiveFilters(
    file: LooseArchiveFile,
    jurisdiction: ExecutionJurisdictionFilter,
    perspective: ExecutionPerspectiveFilter,
): boolean {
    if (jurisdiction === 'sharia' && perspective === 'legal_entity') return false;
    return (
        matchesExecutionJurisdictionFilter(file, jurisdiction) &&
        matchesExecutionPerspectiveFilter(file, perspective, jurisdiction)
    );
}

function resolveExecutionDossierLifecycleStatus(file: LooseArchiveFile): DossierLifecycleStatus {
    return normalizeDossierLifecycleStatus(
        (file as { dossier_lifecycle_status?: string }).dossier_lifecycle_status,
    );
}

function matchesExecutionDossierStatusFilter(
    file: LooseArchiveFile,
    statusFilter: ExecutionDossierStatusFilter,
): boolean {
    if (statusFilter === 'all') return true;
    return resolveExecutionDossierLifecycleStatus(file) === statusFilter;
}

/** مجموعة أساسية منفصلة — نشطة أو مؤرشفة أو مهملات (بدون دمج بينها) */
export function getExecutionArchiveBasePool(
    files: LooseArchiveFile[] | null | undefined,
    mode: ExecutionArchiveLifecycleMode,
): LooseArchiveFile[] {
    if (!Array.isArray(files)) return [];
    return files.filter((f) => {
        const inTrash = isExecutionInTrash(f);
        const archived = isExecutionArchived(f);
        if (mode === 'trash') return inTrash;
        if (mode === 'archived') return archived;
        if (inTrash || archived) return false;
        if (String((f as { parentId?: string }).parentId || '').trim()) return false;
        return true;
    });
}

export function buildExecutionJurisdictionCounts(
    pool: LooseArchiveFile[],
): Record<ExecutionJurisdictionFilter, number> {
    /* فهرس فقط — لا فك بلوب لكل صف عند أول رسم */
    let sharia = 0;
    for (const file of pool) {
        if (isShariaExecutionArchiveIndexHint(file)) sharia += 1;
    }
    return {
        all: pool.length,
        sharia,
        civil: Math.max(0, pool.length - sharia),
    };
}

/** بحث موحّد — يُستخدم في الأرشيف النشط وسلة المهملات */
export function matchesExecutionArchiveSearch(file: LooseArchiveFile, query: string): boolean {
    const q = clampGlobalSearchQuery(String(query || ''));
    if (!q.trim()) return true;
    return archiveTextMatchesQuery(executionArchiveSearchHaystack(file), q);
}

export function filterExecutionArchiveFiles(
    files: LooseArchiveFile[],
    opts: {
        mode: ExecutionArchiveLifecycleMode;
        jurisdiction?: ExecutionJurisdictionFilter;
        perspective?: ExecutionPerspectiveFilter;
        dossierStatus?: ExecutionDossierStatusFilter;
        searchQuery?: string;
    },
): LooseArchiveFile[] {
    const jurisdiction = opts.jurisdiction ?? 'all';
    const perspective = opts.perspective ?? 'all';
    const dossierStatus = opts.dossierStatus ?? 'all';
    let pool = getExecutionArchiveBasePool(files, opts.mode);

    if (jurisdiction !== 'all' || perspective !== 'all') {
        pool = pool.filter((f) => matchesExecutionArchiveFilters(f, jurisdiction, perspective));
    }

    if (dossierStatus !== 'all') {
        pool = pool.filter((f) => matchesExecutionDossierStatusFilter(f, dossierStatus));
    }

    const q = String(opts.searchQuery || '').trim();
    if (q) {
        pool = pool.filter((f) => matchesExecutionArchiveSearch(f, q));
    }

    return pool;
}
