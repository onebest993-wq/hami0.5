import { describe, expect, it } from 'vitest';
import {
    isNonFinancialExecutionClaim,
    isVisitationExecutionClaim,
    mergeFollowupSpecializationFlags,
    resolvePrimaryExecutionClaimType,
} from '../executionClaimIsolation';
import { resolveFollowupFlagsFromExecution } from '../executionDomainIsolation';
import { resolveFollowupSpecializationVisibility } from '../followupSpecializationVisibility';
import { resolveFollowupSpecializationFromExecution } from '../followupSpecializationVisibility';

describe('executionClaimIsolation', () => {
    it('resolves primary claim type by specialization priority', () => {
        expect(
            resolvePrimaryExecutionClaimType({
                claimTypes: ['نفقة', 'مشاهدة'],
            })
        ).toBe('مشاهدة');
        expect(
            resolvePrimaryExecutionClaimType({
                claimTypes: ['استحصال دين مالي', 'إزالة تجاوز'],
            })
        ).toBe('إزالة تجاوز');
    });

    it('detects visitation from claimTypes array', () => {
        expect(
            isVisitationExecutionClaim({ claimTypes: ['نفقة', 'مشاهدة'] }, 'نفقة')
        ).toBe(true);
    });

    it('treats encroachment as non-financial', () => {
        expect(isNonFinancialExecutionClaim({ claimType: 'إزالة تجاوز' })).toBe(true);
    });

    it('merges hide flags across multi-claim dossiers', () => {
        const visitation = resolveFollowupSpecializationVisibility('مشاهدة', false);
        const alimony = resolveFollowupSpecializationVisibility('نفقة', false, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        const merged = mergeFollowupSpecializationFlags([alimony, visitation]);
        expect(merged.hideDossierFinancialTools).toBe(true);
        expect(merged.hideFollowupSeizureRequestsTab).toBe(true);
    });

    it('resolveFollowupSpecializationFromExecution uses claimTypes', () => {
        const data = {
            id: 'exec-claim-types',
            claimTypes: ['نفقة', 'مشاهدة'],
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        };
        const flags = resolveFollowupSpecializationFromExecution(data, false);
        const unified = resolveFollowupFlagsFromExecution(data, 'exec-claim-types');
        expect(flags.hideDossierFinancialTools).toBe(true);
        expect(unified).toEqual(flags);
    });

    it('encroachment flags do not enable field procedures for specific delivery', () => {
        const enc = resolveFollowupSpecializationVisibility('إزالة تجاوز', false);
        expect(enc.showEncroachmentRemovalRequestCards).toBe(true);
        expect(enc.showSpecificDeliveryFieldProcedures).toBe(false);
    });
});
