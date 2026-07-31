/**
 * طبقة عزل المجال — فصل الإضبارة / نوع المطالبة / التمثيل / القرارات والطلبات.
 * مصدر واحد للبوابات قبل العرض والحفظ.
 */

import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { resolveAppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { resolvePrimaryExecutionClaimType } from '@/app/utils/executionClaimIsolation';
import {
    isLegalEntityDebtorKind,
    resolveDebtorEntityKind,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import {
    isFinancialDebtCollectionClaim,
    isMaritalFurnitureClaim,
    isMatwaaClaim,
    isPersonalStatusCourtDecisionsDossier,
    isVisitationClaim,
    resolveFollowupSpecializationFromExecution,
    type FollowupSpecializationVisibility,
} from '@/app/utils/followupSpecializationVisibility';
import {
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import {
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import SecureStoreService from '@/app/services/SecureStoreService';

type StorageCacheLite = {
    invalidate: (key: string) => void;
    touchCacheEntry: (key: string, record: Record<string, unknown>) => void;
};

function touchStorageCache(
    op: 'invalidate' | 'touch',
    key: string,
    record?: Record<string, unknown>,
): void {
    void import('@/app/utils/storageCache')
        .then((m) => {
            const cache = m.storageCache as StorageCacheLite;
            if (op === 'invalidate') cache.invalidate(key);
            else if (record) cache.touchCacheEntry(key, record);
        })
        .catch(() => undefined);
}

export type ExecutionClaimModule =
    | 'financial_debt'
    | 'visitation_personal'
    | 'matwaa'
    | 'marital_furniture'
    | 'eviction'
    | 'encroachment'
    | 'specific_delivery'
    | 'court_decisions_personal'
    | 'alimony'
    | 'general_civil'
    | 'unknown';

export type ExecutionJurisdictionDomain = 'civil' | 'sharia' | 'mixed';

export type ExecutorRequestKind =
    | 'seizure'
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'trust_disburse'
    | 'unified_collection'
    | 'personal_coercive'
    | 'special_followup'
    | 'guarantor_request'
    | 'creditor_party_death'
    | 'debtor_party_death'
    | 'third_party_funds_received';

export interface ExecutionDomainContext {
    dossierId: string;
    primaryClaimModule: ExecutionClaimModule;
    claimModules: ExecutionClaimModule[];
    jurisdiction: ExecutionJurisdictionDomain;
    perspective: AppealUiPerspective;
    debtorEntityKind: DebtorEntityKind;
    isEmployeeDebtor: boolean;
    flags: FollowupSpecializationVisibility;
}

export interface DomainGateResult {
    allowed: boolean;
    reasonAr?: string;
}

const SHARIA_MODULES = new Set<ExecutionClaimModule>([
    'visitation_personal',
    'matwaa',
    'marital_furniture',
    'court_decisions_personal',
    'alimony',
]);

const CIVIL_MODULES = new Set<ExecutionClaimModule>([
    'financial_debt',
    'eviction',
    'encroachment',
    'specific_delivery',
    'general_civil',
]);

/** مطالبات تستخدم إجراءات ميدانية (تخلية / تسليم / تعدٍ / أثاث زوجي) */
const FIELD_PROCEDURE_CLAIM_MODULES: ExecutionClaimModule[] = [
    'eviction',
    'marital_furniture',
    'specific_delivery',
    'encroachment',
];

function claimTypeToModule(ct: string, data: Record<string, unknown>): ExecutionClaimModule {
    const c = String(ct || '').trim();
    if (!c) return 'unknown';
    if (isFinancialDebtCollectionClaim(c)) return 'financial_debt';
    if (isVisitationClaim(c)) return 'visitation_personal';
    if (isMatwaaClaim(c)) return 'matwaa';
    if (isMaritalFurnitureClaim(c)) return 'marital_furniture';
    if (isEvictionClaim(c)) return 'eviction';
    if (isEncroachmentRemovalClaim(c)) return 'encroachment';
    if (isSpecificDeliveryClaim(c)) return 'specific_delivery';
    if (c.includes('نفقة') || c.includes('مهر')) return 'alimony';
    if (
        isPersonalStatusCourtDecisionsDossier(
            String(data.docType || ''),
            String(data.classification || ''),
            String(data.category || ''),
            resolveDebtorEntityKind({ executionData: data })
        )
    ) {
        return 'court_decisions_personal';
    }
    if (c.includes('دين') || c.includes('استحصال') || c.includes('استخلاص') || c.includes('مدني')) {
        return 'financial_debt';
    }
    return 'general_civil';
}

function resolveClaimModules(data: Record<string, unknown>, fallbackClaimType?: string): ExecutionClaimModule[] {
    const types = getEffectiveClaimTypes(data);
    const list =
        types.length > 0
            ? types
            : [String(fallbackClaimType || data.claimType || '').trim()].filter(Boolean);
    if (list.length === 0) return ['unknown'];
    const modules = list.map((ct) => claimTypeToModule(ct, data));
    return [...new Set(modules)];
}

function resolveJurisdictionDomain(modules: ExecutionClaimModule[]): ExecutionJurisdictionDomain {
    const sharia = modules.some((m) => SHARIA_MODULES.has(m));
    const civil = modules.some((m) => CIVIL_MODULES.has(m));
    if (sharia && civil) return 'mixed';
    if (sharia) return 'sharia';
    return 'civil';
}

function resolvePrimaryDebtorKey(data: Record<string, unknown>): string {
    const debtors = Array.isArray(data.debtors) ? data.debtors : [];
    const first = debtors[0] as { id?: string } | undefined;
    return String(first?.id || '').trim();
}

function resolveEmployeeDebtor(data: Record<string, unknown>): boolean {
    const debtors = Array.isArray(data.debtors) ? data.debtors : [];
    for (const d of debtors) {
        if (d && typeof d === 'object' && (d as { isEmployee?: boolean }).isEmployee === true) {
            return true;
        }
    }
    const occ = String((debtors[0] as { occupation?: string } | undefined)?.occupation || '').trim();
    return /موظف|employee/i.test(occ);
}

/** قراءة بيانات الإضبارة للبوابات — المصدر الموثوق هو SecureStore (لا cache قديم) */
export function readExecutionDataForDomainGate(
    executionId: string | undefined
): Record<string, unknown> | null {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return null;
    const key = executionStorageKey(id);
    try {
        const raw = SecureStoreService.getItemSync(key);
        if (!raw?.trim()) {
            touchStorageCache('invalidate', key);
            return null;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        const record = parsed as Record<string, unknown>;
        touchStorageCache('touch', key, record);
        return record;
    } catch {
        return null;
    }
}

/** يفضّل لقطة الواجهة الحية (إضبارة فرعية) على تخزين الأب عند اختلاف المعرّف */
export function resolveExecutionDataForDomainGate(
    executionId: string | undefined,
    executionDataHint?: Record<string, unknown> | null
): Record<string, unknown> | null {
    if (executionDataHint && typeof executionDataHint === 'object' && !Array.isArray(executionDataHint)) {
        const types = getEffectiveClaimTypes(executionDataHint);
        const single = String(executionDataHint.claimType || '').trim();
        if (types.length > 0 || single) {
            return executionDataHint;
        }
    }
    return readExecutionDataForDomainGate(executionId);
}

export function resolveExecutionDomainContext(
    executionData: Record<string, unknown> | null | undefined,
    executionId?: string
): ExecutionDomainContext {
    const data = executionData ?? readExecutionDataForDomainGate(executionId) ?? {};
    const dossierId = normalizeExecutionStorageId(
        String(data.id || executionId || '').trim() || 'default'
    );
    const debtorKey = resolvePrimaryDebtorKey(data);
    const debtorEntityKind = resolveDebtorEntityKind({ executionData: data, debtorKey });
    const isEmployeeDebtor = resolveEmployeeDebtor(data);
    const claimModules = resolveClaimModules(data);
    const primaryType = resolvePrimaryExecutionClaimType(data);
    const primaryClaimModule = claimTypeToModule(primaryType, data);
    const jurisdiction = resolveJurisdictionDomain(claimModules);
    const perspective = resolveAppealUiPerspective(data);
    const flags = resolveFollowupSpecializationFromExecution(
        {
            claimType: String(data.claimType || ''),
            claimTypes: data.claimTypes as string[] | undefined,
            specificDeliveryItemNature: data.specificDeliveryItemNature as string | undefined,
            specificDeliveryFinancialized: data.specificDeliveryFinancialized as boolean | undefined,
            specificDeliveryItems: data.specificDeliveryItems as
                | import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[]
                | undefined,
            docType: String(data.docType || ''),
            classification: String(data.classification || ''),
            category: String(data.category || ''),
            debtorEntityKind,
        },
        isEmployeeDebtor,
        primaryType,
        debtorEntityKind
    );

    return {
        dossierId,
        primaryClaimModule,
        claimModules,
        jurisdiction,
        perspective,
        debtorEntityKind,
        isEmployeeDebtor,
        flags,
    };
}

function isDebtorAgentCreditorMirrorRow(row: Record<string, unknown>): boolean {
    const payload = String(row.payloadJson || '').trim();
    if (payload.includes('debtor_agent_creditor_mirror')) return true;
    const blob = `${String(row.title || '')} ${String(row.body || '')}`;
    return /طرف\s*آخر\s*—\s*قيد\s*البت|تحرك\s*الطرف\s*الآخر/i.test(blob);
}

function isDecisionAppealPipelineActive(row: Record<string, unknown>): boolean {
    if (row.appealSourceDecisionId) return true;
    if (row.appealStatus === 'tadhallum_filed' || row.appealStatus === 'tamyeez_filed') return true;
    if (row.appealPhase === 'grievance' || row.appealPhase === 'cassation') return true;
    if (row.awaitingCassationEntryBy === 'lawyer' || row.awaitingCassationEntryBy === 'debtor') return true;
    return false;
}

/** هل يُسمح بعرض القرار/الطلب في مركز القرارات لهذا السياق؟ */
export function isDecisionVisibleInDomainContext(
    ctx: ExecutionDomainContext,
    row: Record<string, unknown>
): boolean {
    const taggedNamespace = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
    if (taggedNamespace) {
        return isDecisionAllowedForPerspective(ctx, row);
    }

    if (row.manualExecutorLedgerEntry === true || row.appealRequestOrigin === 'executor_side') {
        return isDecisionAllowedForPerspective(ctx, row);
    }

    const requestKind = String(row.requestKind || '').trim();
    if (requestKind) {
        const gate = canPersistExecutorRequestKind(ctx, requestKind as ExecutorRequestKind, {
            personalCoerciveSubtype: String(row.personalCoerciveSubtype || ''),
        });
        if (!gate.allowed) {
            return false;
        }
    }

    return isDecisionAllowedForPerspective(ctx, row);
}

function isDecisionAllowedForPerspective(
    ctx: ExecutionDomainContext,
    row: Record<string, unknown>
): boolean {
    if (ctx.perspective === 'creditor_agent') return true;

    if (isDebtorAgentCreditorMirrorRow(row)) return true;
    const origin = String(row.appealRequestOrigin || '').trim();
    if (origin === 'executor_side' || row.manualExecutorLedgerEntry === true) return true;
    if (origin === 'debtor_side') return true;
    if (origin === 'creditor_side' && String(row.requestKind || '').trim()) return false;
    return true;
}

export function filterDecisionsForDomainContext<T extends Record<string, unknown>>(
    ctx: ExecutionDomainContext,
    decisions: T[]
): T[] {
    const hubVisibleIds = new Set<string>();
    for (const row of decisions) {
        if (row.appealSourceDecisionId) continue;
        if (isDecisionVisibleInDomainContext(ctx, row)) {
            const id = String(row.id || '').trim();
            if (id) hubVisibleIds.add(id);
        }
    }

    return decisions.filter((row) => {
        const sourceId = String(row.appealSourceDecisionId || '').trim();
        if (sourceId) {
            return hubVisibleIds.has(sourceId) || isDecisionAppealPipelineActive(row);
        }
        return isDecisionVisibleInDomainContext(ctx, row);
    });
}

/** بوابة إنشاء طلب تنفيذ — تمنع التسرب بين أنواع المطالبات */
export function canPersistExecutorRequestKind(
    ctx: ExecutionDomainContext,
    requestKind: ExecutorRequestKind | string,
    meta?: {
        personalCoerciveSubtype?: string;
    }
): DomainGateResult {
    const kind = String(requestKind || '').trim() as ExecutorRequestKind;
    const flags = ctx.flags;

    if (kind === 'creditor_party_death' || kind === 'debtor_party_death' || kind === 'case_expense') {
        return { allowed: true };
    }

    if (kind === 'seizure') {
        if (flags.hideFollowupSeizureRequestsTab && flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'حجز مالي غير مسموح لهذا النوع من المطالبة' };
        }
        if (isLegalEntityDebtorKind(ctx.debtorEntityKind)) {
            if (!flags.isFinancialDebtCollection || flags.hideDossierFinancialTools) {
                return { allowed: false, reasonAr: 'لا حجز مالي لمدين معنوي خارج مسار الدين المالي' };
            }
            return { allowed: true };
        }
        if (flags.hideFollowupSeizureRequestsTab && !flags.isFinancialDebtCollection) {
            return { allowed: false, reasonAr: 'حجز مالي غير مسموح لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'personal_coercive') {
        if (flags.hidePersonalCoerciveFollowupTab || flags.suppressHiddenPersonalCoerciveRequests) {
            return { allowed: false, reasonAr: 'التنفيذ الجبري الشخصي غير مسموح لهذه الإضبارة' };
        }
        if (isLegalEntityDebtorKind(ctx.debtorEntityKind)) {
            return { allowed: false, reasonAr: 'لا إجراءات جبريّة شخصية لمدين معنوي' };
        }
        return { allowed: true };
    }

    if (kind === 'guarantor_request') {
        if (!flags.isFinancialDebtCollection || flags.hideAllGuarantorPresence) {
            return { allowed: false, reasonAr: 'طلب الكفيل غير مسموح لهذا المسار' };
        }
        return { allowed: true };
    }

    if (kind === 'eviction_procedure') {
        if (!ctx.claimModules.some((m) => FIELD_PROCEDURE_CLAIM_MODULES.includes(m))) {
            return { allowed: false, reasonAr: 'إجراءات ميدانية غير مسموحة لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'trust_disburse' || kind === 'unified_collection' || kind === 'lawyer_fee_payout') {
        if (flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'العمليات المالية غير مسموحة لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'third_party_funds_received') {
        if (flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'استلام أموال الغير غير مسموح في هذا المسار' };
        }
        return { allowed: true };
    }

    if (kind === 'special_followup') {
        if (
            ctx.jurisdiction === 'sharia' &&
            flags.hideFollowupCoerciveTab &&
            flags.hideDossierFinancialTools &&
            !flags.showEncroachmentRemovalRequestCards &&
            !flags.showSpecificDeliveryFieldProcedures
        ) {
            return { allowed: false, reasonAr: 'طلب المتابعة الخاص غير متاح لهذا الاختصاص' };
        }
        return { allowed: true };
    }

    return { allowed: true };
}

export function gateExecutorRequestPersist(
    executionId: string | undefined,
    requestKind: ExecutorRequestKind | string,
    meta?: { personalCoerciveSubtype?: string; executionData?: Record<string, unknown> | null }
): DomainGateResult {
    const data = resolveExecutionDataForDomainGate(executionId, meta?.executionData);
    const ctx = resolveExecutionDomainContext(data, executionId);
    return canPersistExecutorRequestKind(ctx, requestKind, meta);
}

export const DOMAIN_ISOLATION_BLOCKED_EVENT = 'hami-domain-isolation-blocked';

/** ربط خيار مرآة الطرف الآخر بنوع الطلب في مركز القرارات */
export type HiddenGuarantorCatalogKey =
    | 'guarantor_request'
    | 'guarantor_seizure_salary'
    | 'guarantor_seizure_property'
    | 'guarantor_seizure_movable';

export function hiddenGuarantorCatalogKeyToRequestKind(
    key: HiddenGuarantorCatalogKey | string
): ExecutorRequestKind {
    if (key === 'guarantor_request') return 'guarantor_request';
    return 'seizure';
}

export function isHiddenGuarantorCatalogItemAllowed(
    ctx: ExecutionDomainContext,
    key: HiddenGuarantorCatalogKey | string
): boolean {
    return canPersistExecutorRequestKind(ctx, hiddenGuarantorCatalogKeyToRequestKind(key)).allowed;
}

export function isHiddenPersonalCoerciveCatalogAllowed(ctx: ExecutionDomainContext): boolean {
    return canPersistExecutorRequestKind(ctx, 'personal_coercive').allowed;
}

export function isHiddenBreakInventoryRequestAllowed(ctx: ExecutionDomainContext): boolean {
    return canPersistExecutorRequestKind(ctx, 'special_followup').allowed;
}

export function otherPartyCatalogIdToRequestKind(optionId: string): ExecutorRequestKind | null {
    const id = String(optionId || '').trim();
    if (id.startsWith('sz-')) return 'seizure';
    if (id.startsWith('pc-')) return 'personal_coercive';
    if (id === 'gu-request') return 'guarantor_request';
    if (id === 'break-inventory') return 'special_followup';
    return null;
}

export function isOtherPartyCatalogOptionAllowed(
    ctx: ExecutionDomainContext,
    optionId: string
): boolean {
    const kind = otherPartyCatalogIdToRequestKind(optionId);
    if (!kind) return true;
    return canPersistExecutorRequestKind(ctx, kind).allowed;
}

export function filterOtherPartyCatalogOptionIds(
    ctx: ExecutionDomainContext,
    optionIds: string[]
): string[] {
    return optionIds.filter((id) => isOtherPartyCatalogOptionAllowed(ctx, id));
}

/** واجهة موحّدة لمحضر المتابعة قبل إظهار زر الطلب */
export function isFollowupRequestKindAllowed(
    executionData: Record<string, unknown> | null | undefined,
    executionId: string | undefined,
    requestKind: ExecutorRequestKind | string,
    meta?: { personalCoerciveSubtype?: string }
): DomainGateResult {
    const ctx = resolveExecutionDomainContext(executionData, executionId);
    return canPersistExecutorRequestKind(ctx, requestKind, meta);
}

export function dispatchDomainIsolationBlocked(reasonAr: string, requestKind?: string): void {
    if (typeof window === 'undefined') return;
    const message = String(reasonAr || 'هذا الإجراء غير متاح في مسار هذه الإضبارة').trim();
    try {
        window.dispatchEvent(
            new CustomEvent(DOMAIN_ISOLATION_BLOCKED_EVENT, {
                detail: { requestKind, reasonAr: message },
            })
        );
        window.dispatchEvent(
            new CustomEvent('hami-toast', {
                detail: { message, type: 'warning' as const },
            })
        );
    } catch {
        /* ignore */
    }
}

/** أعلام محضر المتابعة — من سياق العزل الموحّد (بديل مباشر لـ resolveFollowupSpecializationFromExecution) */
export function resolveFollowupFlagsFromExecution(
    executionData: Record<string, unknown> | null | undefined,
    executionId?: string
): FollowupSpecializationVisibility {
    return resolveExecutionDomainContext(executionData, executionId).flags;
}

export function buildDomainReconcileSignature(ctx: ExecutionDomainContext): string {
    return [
        ctx.dossierId,
        ctx.primaryClaimModule,
        ctx.claimModules.join(','),
        ctx.jurisdiction,
        ctx.perspective,
        ctx.debtorEntityKind,
        String(ctx.isEmployeeDebtor),
    ].join('|');
}
