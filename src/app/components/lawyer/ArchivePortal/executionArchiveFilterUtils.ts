import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    isEncroachmentExecutionClaim,
    isEvictionExecutionClaim,
    isMaritalFurnitureExecutionClaim,
    isVisitationExecutionClaim,
    resolvePrimaryExecutionClaimType,
} from '@/app/utils/executionClaimIsolation';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import {
    isLegalEntityDebtorKind,
    resolveDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import {
    isFinancialDebtCollectionClaim,
    isMatwaaClaim,
    isPersonalStatusCourtDecisionsDossier,
} from '@/app/utils/followupSpecializationVisibility';
import { isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import { isExecutionInTrash } from '@/app/utils/executionTrash';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LooseArchiveFile } from './types';
import {
    formatExecutionArchiveCreditorLabel,
    formatExecutionArchiveDebtorLabel,
    readExecutionFileLiveSnapshot,
} from './utils';

export type ExecutionJurisdictionFilter = 'all' | 'civil' | 'sharia';
export type ExecutionPerspectiveFilter = 'all' | 'creditor_agent' | 'debtor_agent' | 'legal_entity';

export const EXECUTION_JURISDICTION_LABELS: Record<ExecutionJurisdictionFilter, string> = {
    all: 'الكل',
    civil: 'مدني',
    sharia: 'شرعي',
};

export const EXECUTION_PERSPECTIVE_LABELS: Record<ExecutionPerspectiveFilter, string> = {
    all: 'الكل',
    creditor_agent: 'وكيل دائن',
    debtor_agent: 'وكيل مدين',
    legal_entity: 'شخص معنوي',
};

function resolvePrimaryDebtorKey(snap: ReturnType<typeof readExecutionFileLiveSnapshot>): string {
    return String(
        Array.isArray(snap.debtors) && snap.debtors[0]
            ? (snap.debtors[0] as { id?: string }).id
            : ''
    ).trim();
}

/** إضبارة شرعية / أحوال شخصية — لا تُصنَّف مدنياً */
export function isShariaExecutionArchive(file: LooseArchiveFile): boolean {
    const snap = readExecutionFileLiveSnapshot(file);
    const data = snap as Record<string, unknown>;
    const debtorKey = resolvePrimaryDebtorKey(snap);
    const debtorEntityKind = resolveDebtorEntityKind({ executionData: snap, debtorKey });

    if (
        isPersonalStatusCourtDecisionsDossier(
            snap.docType,
            snap.classification,
            (snap as { category?: string }).category,
            debtorEntityKind
        )
    ) {
        return true;
    }

    const classification = String(snap.classification || '').trim();
    if (classification === 'شرعي' || classification === 'أحوال شخصية') return true;

    const category = String((snap as { category?: string }).category || '').trim();
    if (category === 'sharia' || category === 'personal') return true;

    if (isVisitationExecutionClaim(data)) return true;
    if (isMaritalFurnitureExecutionClaim(data)) return true;

    const types = getEffectiveClaimTypes(data);
    const claimList =
        types.length > 0 ? types : [String(snap.claimType || snap.docType || '').trim()].filter(Boolean);

    return claimList.some(
        (ct) =>
            isMatwaaClaim(ct) ||
            ct.includes('نفقة') ||
            ct.includes('مهر') ||
            ct.includes('مشاهدة') ||
            ct.includes('مطاوعة') ||
            ct.includes('أثاث زوجية') ||
            ct.includes('استصحاب') ||
            ct.includes('مبيت') ||
            ct.includes('تسليم طفل') ||
            ct.includes('تسليم ولد') ||
            ct.includes('شرعي') ||
            ct.includes('أحوال')
    );
}

/** إضبارة مدنية — تستبعد الشرعي صراحةً لمنع الازدواج */
export function isCivilExecutionArchive(file: LooseArchiveFile): boolean {
    if (isShariaExecutionArchive(file)) return false;

    const snap = readExecutionFileLiveSnapshot(file);
    const data = snap as Record<string, unknown>;
    const primary = resolvePrimaryExecutionClaimType(data);

    if (isFinancialDebtCollectionClaim(primary)) return true;
    if (isEvictionExecutionClaim(data)) return true;
    if (isEncroachmentExecutionClaim(data)) return true;
    if (isSpecificDeliveryClaim(primary)) return true;

    const classification = String(snap.classification || '').trim();
    if (classification === 'مدني' || classification === 'civil') return true;

    const category = String((snap as { category?: string }).category || '').trim();
    if (category === 'civil') return true;

    const types = getEffectiveClaimTypes(data);
    const claimList =
        types.length > 0 ? types : [String(snap.claimType || snap.docType || '').trim()].filter(Boolean);

    return claimList.some(
        (ct) =>
            ct.includes('دين') ||
            ct.includes('استحصال') ||
            ct.includes('استخلاص') ||
            ct.includes('إخلاء') ||
            ct.includes('تخلية') ||
            ct.includes('إزالة') ||
            ct.includes('تسليم') ||
            ct.includes('مدني')
    );
}

export function matchesExecutionJurisdictionFilter(
    file: LooseArchiveFile,
    filter: ExecutionJurisdictionFilter
): boolean {
    if (filter === 'all') return true;
    if (filter === 'sharia') return isShariaExecutionArchive(file);
    return isCivilExecutionArchive(file);
}

/** الشرعي / أحوال شخصية — لا يوجد مدين معنوي */
export function isLegalEntityPerspectiveAllowed(
    jurisdiction: ExecutionJurisdictionFilter
): boolean {
    return jurisdiction !== 'sharia';
}

export function matchesExecutionPerspectiveFilter(
    file: LooseArchiveFile,
    filter: ExecutionPerspectiveFilter,
    jurisdiction: ExecutionJurisdictionFilter = 'all'
): boolean {
    if (filter === 'all') return true;
    if (filter === 'legal_entity' && !isLegalEntityPerspectiveAllowed(jurisdiction)) return false;

    const snap = readExecutionFileLiveSnapshot(file);
    if (filter === 'debtor_agent') return isLawyerRepresentingDebtor(snap);
    if (filter === 'creditor_agent') return !isLawyerRepresentingDebtor(snap);

    if (isShariaExecutionArchive(file)) return false;

    const debtorKey = resolvePrimaryDebtorKey(snap);
    return isLegalEntityDebtorKind(
        resolveDebtorEntityKind({ executionData: snap, debtorKey })
    );
}

export function matchesExecutionArchiveFilters(
    file: LooseArchiveFile,
    jurisdiction: ExecutionJurisdictionFilter,
    perspective: ExecutionPerspectiveFilter
): boolean {
    if (jurisdiction === 'sharia' && perspective === 'legal_entity') return false;
    return (
        matchesExecutionJurisdictionFilter(file, jurisdiction) &&
        matchesExecutionPerspectiveFilter(file, perspective, jurisdiction)
    );
}

export type ExecutionArchiveLifecycleMode = 'active' | 'trash';

/** مجموعة أساسية منفصلة — نشطة أو مهملات فقط (بدون دمج بينهما) */
export function getExecutionArchiveBasePool(
    files: LooseArchiveFile[],
    mode: ExecutionArchiveLifecycleMode
): LooseArchiveFile[] {
    return files.filter((f) => {
        const inTrash = isExecutionInTrash(f);
        if (mode === 'trash') return inTrash;
        if (inTrash) return false;
        if (String((f as { parentId?: string }).parentId || '').trim()) return false;
        return true;
    });
}

export function countExecutionArchiveByJurisdiction(
    pool: LooseArchiveFile[],
    jurisdiction: ExecutionJurisdictionFilter
): number {
    if (jurisdiction === 'all') return pool.length;
    return pool.filter((f) => matchesExecutionJurisdictionFilter(f, jurisdiction)).length;
}

export function buildExecutionJurisdictionCounts(
    pool: LooseArchiveFile[]
): Record<ExecutionJurisdictionFilter, number> {
    return {
        all: pool.length,
        civil: countExecutionArchiveByJurisdiction(pool, 'civil'),
        sharia: countExecutionArchiveByJurisdiction(pool, 'sharia'),
    };
}

export const EXECUTION_JURISDICTION_TAB_DEFS: { id: ExecutionJurisdictionFilter; label: string }[] = [
    { id: 'all', label: EXECUTION_JURISDICTION_LABELS.all },
    { id: 'civil', label: EXECUTION_JURISDICTION_LABELS.civil },
    { id: 'sharia', label: EXECUTION_JURISDICTION_LABELS.sharia },
];

export const EXECUTION_PERSPECTIVE_TAB_DEFS: { id: ExecutionPerspectiveFilter; label: string }[] = [
    { id: 'all', label: EXECUTION_PERSPECTIVE_LABELS.all },
    { id: 'creditor_agent', label: EXECUTION_PERSPECTIVE_LABELS.creditor_agent },
    { id: 'debtor_agent', label: EXECUTION_PERSPECTIVE_LABELS.debtor_agent },
    { id: 'legal_entity', label: EXECUTION_PERSPECTIVE_LABELS.legal_entity },
];

function resolveArchiveCourtHaystack(file: LooseArchiveFile): string {
    const courtRaw = file.court;
    if (typeof courtRaw === 'string') return courtRaw;
    if (courtRaw && typeof courtRaw === 'object' && 'name' in courtRaw) {
        return String((courtRaw as { name?: string }).name ?? '');
    }
    return '';
}

/** بحث موحّد — يُستخدم في الأرشيف النشط وسلة المهملات */
export function matchesExecutionArchiveSearch(file: LooseArchiveFile, query: string): boolean {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;

    const snap = readExecutionFileLiveSnapshot(file) as ExecutionFile;
    const fileNumber = (file.fileNumber || file.caseNo || '').toString().toLowerCase();
    const creditor = formatExecutionArchiveCreditorLabel(snap).toLowerCase();
    const debtor = formatExecutionArchiveDebtorLabel(snap).toLowerCase();
    const claimType = String(file.claimType || file.docType || '').toLowerCase();
    const court = resolveArchiveCourtHaystack(file).toLowerCase();
    const status = String(file.status || '').toLowerCase();
    const relationship = String(file.relationship || '').toLowerCase();
    const linkedDebtor = String(file.linkedDebtor ?? '').toLowerCase();
    const amount = String(file.amount ?? file.totalAmount ?? 0);

    return (
        fileNumber.includes(q) ||
        creditor.includes(q) ||
        debtor.includes(q) ||
        claimType.includes(q) ||
        court.includes(q) ||
        status.includes(q) ||
        relationship.includes(q) ||
        linkedDebtor.includes(q) ||
        amount.includes(q)
    );
}

export function filterExecutionArchiveFiles(
    files: LooseArchiveFile[],
    opts: {
        mode: ExecutionArchiveLifecycleMode;
        jurisdiction?: ExecutionJurisdictionFilter;
        perspective?: ExecutionPerspectiveFilter;
        searchQuery?: string;
    }
): LooseArchiveFile[] {
    const jurisdiction = opts.jurisdiction ?? 'all';
    const perspective = opts.perspective ?? 'all';
    let pool = getExecutionArchiveBasePool(files, opts.mode);

    if (jurisdiction !== 'all' || perspective !== 'all') {
        pool = pool.filter((f) => matchesExecutionArchiveFilters(f, jurisdiction, perspective));
    }

    const q = String(opts.searchQuery || '').trim();
    if (q) {
        pool = pool.filter((f) => matchesExecutionArchiveSearch(f, q));
    }

    return pool;
}
