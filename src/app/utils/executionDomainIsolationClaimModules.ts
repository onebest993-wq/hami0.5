/**
 * Domain isolation — claim module / jurisdiction resolution.
 */
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { resolveDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import {
    isFinancialDebtCollectionClaim,
    isMaritalFurnitureClaim,
    isMatwaaClaim,
    isPersonalStatusCourtDecisionsDossier,
    isVisitationClaim,
} from '@/app/utils/followupSpecializationVisibility';
import {
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import type {
    ExecutionClaimModule,
    ExecutionJurisdictionDomain,
} from './executionDomainIsolationTypes';

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
export const FIELD_PROCEDURE_CLAIM_MODULES: ExecutionClaimModule[] = [
    'eviction',
    'marital_furniture',
    'specific_delivery',
    'encroachment',
];

export function claimTypeToModule(ct: string, data: Record<string, unknown>): ExecutionClaimModule {
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
            resolveDebtorEntityKind({ executionData: data }),
        )
    ) {
        return 'court_decisions_personal';
    }
    if (c.includes('دين') || c.includes('استحصال') || c.includes('استخلاص') || c.includes('مدني')) {
        return 'financial_debt';
    }
    return 'general_civil';
}

export function resolveClaimModules(
    data: Record<string, unknown>,
    fallbackClaimType?: string,
): ExecutionClaimModule[] {
    const types = getEffectiveClaimTypes(data);
    const list =
        types.length > 0
            ? types
            : [String(fallbackClaimType || data.claimType || '').trim()].filter(Boolean);
    if (list.length === 0) return ['unknown'];
    const modules = list.map((ct) => claimTypeToModule(ct, data));
    return [...new Set(modules)];
}

export function resolveJurisdictionDomain(
    modules: ExecutionClaimModule[],
): ExecutionJurisdictionDomain {
    const sharia = modules.some((m) => SHARIA_MODULES.has(m));
    const civil = modules.some((m) => CIVIL_MODULES.has(m));
    if (sharia && civil) return 'mixed';
    if (sharia) return 'sharia';
    return 'civil';
}

export function resolvePrimaryDebtorKey(data: Record<string, unknown>): string {
    const debtors = Array.isArray(data.debtors) ? data.debtors : [];
    const first = debtors[0] as { id?: string } | undefined;
    return String(first?.id || '').trim();
}

export function resolveEmployeeDebtor(data: Record<string, unknown>): boolean {
    const debtors = Array.isArray(data.debtors) ? data.debtors : [];
    for (const d of debtors) {
        if (d && typeof d === 'object' && (d as { isEmployee?: boolean }).isEmployee === true) {
            return true;
        }
    }
    const occ = String((debtors[0] as { occupation?: string } | undefined)?.occupation || '').trim();
    return /موظف|employee/i.test(occ);
}
