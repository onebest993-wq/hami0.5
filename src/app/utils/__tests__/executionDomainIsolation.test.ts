import { describe, expect, it } from 'vitest';
import {
    canPersistExecutorRequestKind,
    filterDecisionsForDomainContext,
    filterOtherPartyCatalogOptionIds,
    gateExecutorRequestPersist,
    isFollowupRequestKindAllowed,
    otherPartyCatalogIdToRequestKind,
    resolveExecutionDomainContext,
} from '../executionDomainIsolation';

describe('executionDomainIsolation', () => {
    it('1) financial civil dossier allows seizure blocks personal coercive for legal entity', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-fin',
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'شركة', entityKind: 'legal_entity' }],
            debtor_entity_kind: 'legal_entity',
        });
        expect(ctx.primaryClaimModule).toBe('financial_debt');
        expect(ctx.jurisdiction).toBe('civil');
        expect(canPersistExecutorRequestKind(ctx, 'seizure').allowed).toBe(true);
        expect(canPersistExecutorRequestKind(ctx, 'personal_coercive').allowed).toBe(false);
    });

    it('2) visitation sharia blocks seizure and financial tools', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-vis',
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        });
        expect(ctx.jurisdiction).toBe('sharia');
        expect(canPersistExecutorRequestKind(ctx, 'seizure').allowed).toBe(false);
        expect(canPersistExecutorRequestKind(ctx, 'unified_collection').allowed).toBe(false);
    });

    it('2b) communication journal bypasses sharia special_followup gate', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-vis',
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        });
        expect(canPersistExecutorRequestKind(ctx, 'special_followup').allowed).toBe(false);
        expect(
            canPersistExecutorRequestKind(ctx, 'special_followup', { communicationJournal: true }).allowed,
        ).toBe(true);
        expect(
            canPersistExecutorRequestKind(ctx, 'special_followup', {
                decisionTitle: 'إرسال كتاب / مخاطبة جهة — محكمة',
            }).allowed,
        ).toBe(true);
        expect(
            canPersistExecutorRequestKind(ctx, 'special_followup', {
                adminRequestsTab: true,
            }).allowed,
        ).toBe(true);
        expect(
            canPersistExecutorRequestKind(ctx, 'special_followup', {
                payloadJson: JSON.stringify({ kind: 'manual_followup', v: 1 }),
            }).allowed,
        ).toBe(true);
        const rows = [
            {
                id: 'comm-1',
                requestKind: 'special_followup',
                title: 'إرسال كتاب / مخاطبة جهة — محكمة',
                executorOutcome: 'approved',
            },
        ];
        expect(filterDecisionsForDomainContext(ctx, rows).map((r) => r.id)).toEqual(['comm-1']);
    });

    it('3) debtor agent hides creditor_side queue requests', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-debtor-agent',
            claimType: 'استحصال دين مالي',
            representedParty: 'debtor',
            debtors: [{ name: 'موكل', isClient: true }],
            creditors: [{ name: 'دائن' }],
        });
        expect(ctx.perspective).toBe('debtor_agent');
        const rows = [
            { id: 'c1', requestKind: 'seizure', appealRequestOrigin: 'creditor_side' },
            { id: 'm1', requestKind: 'seizure', appealRequestOrigin: 'creditor_side', payloadJson: '{"source":"debtor_agent_creditor_mirror"}' },
            { id: 'e1', appealRequestOrigin: 'executor_side', manualExecutorLedgerEntry: true, title: 'قرار منفذ' },
        ];
        const visible = filterDecisionsForDomainContext(ctx, rows);
        expect(visible.map((r) => r.id)).toEqual(['m1', 'e1']);
    });

    it('4) creditor agent sees creditor requests', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-cred',
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'موكل', isClient: true }],
            debtors: [{ name: 'مدين' }],
        });
        const rows = [{ id: 'c1', requestKind: 'seizure', appealRequestOrigin: 'creditor_side' }];
        expect(filterDecisionsForDomainContext(ctx, rows)).toHaveLength(1);
    });

    it('5) matwaa blocks personal coercive and seizure', () => {
        const ctx = resolveExecutionDomainContext({ id: 'exec-mat', claimType: 'مطاوعة' });
        expect(canPersistExecutorRequestKind(ctx, 'personal_coercive').allowed).toBe(false);
        expect(canPersistExecutorRequestKind(ctx, 'seizure').allowed).toBe(false);
    });

    it('6) eviction allows eviction_procedure not seizure when financial hidden', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-ev',
            claimType: 'إخلاء',
            creditors: [{ name: 'مالك', isClient: true }],
            debtors: [{ name: 'مستأجر' }],
        });
        expect(canPersistExecutorRequestKind(ctx, 'eviction_procedure').allowed).toBe(true);
    });

    it('6b) marital furniture allows eviction_procedure for delivery workflow', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-mf',
            claimType: 'أثاث زوجية',
            creditors: [{ name: 'زوجة', isClient: true }],
            debtors: [{ name: 'زوج' }],
        });
        expect(ctx.claimModules).toContain('marital_furniture');
        expect(canPersistExecutorRequestKind(ctx, 'eviction_procedure').allowed).toBe(true);
    });

    it('6c) gate uses live child dossier data when parent storage id differs', () => {
        const gate = gateExecutorRequestPersist('parent-exec', 'eviction_procedure', {
            executionData: {
                id: 'child-exec',
                parentDossierId: 'parent-exec',
                claimType: 'أثاث زوجية',
            },
        });
        expect(gate.allowed).toBe(true);
    });

    it('6d) eviction_procedure hub rows stay visible in decisions center for field-procedure paths', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-sd',
            claimType: 'تسليم شيء معين',
            representedParty: 'debtor',
            creditors: [{ name: 'دائن' }],
            debtors: [{ name: 'مدين', isClient: true }],
        });
        expect(ctx.perspective).toBe('debtor_agent');
        const rows = [
            {
                id: 'ev-1',
                requestKind: 'eviction_procedure',
                appealRequestOrigin: 'creditor_side',
                domainNamespace: 'financial_debt__creditor_agent',
                title: 'طلب تحديد موعد الخروج الميداني',
                executorOutcome: 'pending',
            },
        ];
        expect(filterDecisionsForDomainContext(ctx, rows).map((r) => r.id)).toEqual(['ev-1']);
    });

    it('7) guarantor request only on financial path', () => {
        const financial = resolveExecutionDomainContext({
            id: 'exec-g1',
            claimType: 'استحصال دين مالي',
            debtors: [{ name: 'كاسب', occupation: 'تاجر' }],
        });
        const visitation = resolveExecutionDomainContext({ id: 'exec-g2', claimType: 'مشاهدة' });
        expect(canPersistExecutorRequestKind(financial, 'guarantor_request').allowed).toBe(true);
        expect(canPersistExecutorRequestKind(visitation, 'guarantor_request').allowed).toBe(false);
    });

    it('8) appeal copy visible when hub visible', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-appeal',
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
        });
        const rows = [
            { id: 'hub', requestKind: 'seizure', appealRequestOrigin: 'creditor_side' },
            { id: 'copy', appealSourceDecisionId: 'hub', appealStatus: 'tadhallum_filed' },
        ];
        expect(filterDecisionsForDomainContext(ctx, rows).map((r) => r.id)).toEqual(['hub', 'copy']);
    });

    it('9) party death requests always allowed', () => {
        const ctx = resolveExecutionDomainContext({ id: 'exec-death', claimType: 'مشاهدة' });
        expect(canPersistExecutorRequestKind(ctx, 'creditor_party_death').allowed).toBe(true);
        expect(canPersistExecutorRequestKind(ctx, 'debtor_party_death').allowed).toBe(true);
    });

    it('10) mixed claim modules resolve mixed jurisdiction', () => {
        const ctx = resolveExecutionDomainContext({
            id: 'exec-mix',
            claimTypes: ['نفقة', 'استحصال دين مالي'],
        });
        expect(ctx.jurisdiction).toBe('mixed');
        expect(ctx.claimModules).toContain('financial_debt');
        expect(ctx.claimModules).toContain('alimony');
    });

    it('11) other-party catalog maps seizure and filters on visitation', () => {
        expect(otherPartyCatalogIdToRequestKind('sz-debtor-salary')).toBe('seizure');
        const ctx = resolveExecutionDomainContext({ id: 'exec-op', claimType: 'مشاهدة' });
        const filtered = filterOtherPartyCatalogOptionIds(ctx, [
            'sz-debtor-salary',
            'pc-travel_ban',
        ]);
        expect(filtered).toEqual([]);
    });

    it('12) isFollowupRequestKindAllowed wraps execution context', () => {
        const gate = isFollowupRequestKindAllowed(
            { id: 'exec-fu', claimType: 'مطاوعة' },
            'exec-fu',
            'personal_coercive'
        );
        expect(gate.allowed).toBe(false);
        expect(gate.reasonAr).toBeTruthy();
    });
});
