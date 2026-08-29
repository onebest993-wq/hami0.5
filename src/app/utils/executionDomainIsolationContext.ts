/**
 * Domain isolation — resolveExecutionDomainContext + followup flags.
 */
import { resolveAppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { resolvePrimaryExecutionClaimType } from '@/app/utils/executionClaimIsolation';
import {
    resolveDebtorEntityKind,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import {
    createDefaultFollowupSpecializationFlags,
    resolveFollowupSpecializationFromExecution,
    type FollowupSpecializationVisibility,
} from '@/app/utils/followupSpecializationVisibility';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';
import {
    claimTypeToModule,
    resolveClaimModules,
    resolveEmployeeDebtor,
    resolveJurisdictionDomain,
    resolvePrimaryDebtorKey,
} from './executionDomainIsolationClaimModules';
import { readExecutionDataForDomainGate } from './executionDomainIsolationRead';
import type { ExecutionDomainContext } from './executionDomainIsolationTypes';

/** أعلام محضر المتابعة لمدين محدّد (كاسب/موظف + كيان) — المسار الموحّد للبوابات */
export function resolveFollowupFlagsForDebtorContext(
    executionData: Record<string, unknown> | null | undefined,
    options: {
        isEmployeeDebtor: boolean;
        fallbackClaimType?: string;
        debtorEntityKind?: DebtorEntityKind | string | null;
    },
): FollowupSpecializationVisibility {
    return resolveFollowupSpecializationFromExecution(
        executionData,
        options.isEmployeeDebtor,
        options.fallbackClaimType,
        options.debtorEntityKind,
    );
}

export function resolveExecutionDomainContext(
    executionData: Record<string, unknown> | null | undefined,
    executionId?: string,
): ExecutionDomainContext {
    const data = executionData ?? readExecutionDataForDomainGate(executionId) ?? {};
    const dossierId = normalizeExecutionStorageId(
        String(data.id || executionId || '').trim() || 'default',
    );
    const debtorKey = resolvePrimaryDebtorKey(data);
    const debtorEntityKind = resolveDebtorEntityKind({ executionData: data, debtorKey });
    const isEmployeeDebtor = resolveEmployeeDebtor(data);
    const claimModules = resolveClaimModules(data);
    const primaryType = resolvePrimaryExecutionClaimType(data);
    const primaryClaimModule = claimTypeToModule(primaryType, data);
    const jurisdiction = resolveJurisdictionDomain(claimModules);
    const perspective = resolveAppealUiPerspective(data);
    const flags =
        resolveFollowupFlagsForDebtorContext(data, {
            isEmployeeDebtor: isEmployeeDebtor,
            fallbackClaimType: primaryType,
            debtorEntityKind,
        }) ?? createDefaultFollowupSpecializationFlags();

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

/** أعلام محضر المتابعة — من سياق العزل الموحّد (بديل مباشر لـ resolveFollowupSpecializationFromExecution) */
export function resolveFollowupFlagsFromExecution(
    executionData: Record<string, unknown> | null | undefined,
    executionId?: string,
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
