import { describe, expect, it } from 'vitest';
import {
    computeSeizureMatrix,
    computeSeizureProgressiveDisclosure,
    resolveSeizureDebtorType,
    resolveSeizureMatrixFromExecution,
} from '../seizureMatrix';

describe('seizureMatrix', () => {
    it('rule 0: government entity hides tab', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 20_000_000,
            debtorJob: 'kasib',
            debtorType: 'government',
        });
        expect(r.hideSeizureTab).toBe(true);
        expect(r.buttons.property).toBe(false);
    });

    it('rule 1: zero remaining hides tab', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 0,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(r.ruleId).toBe('rule_1_zero');
        expect(r.hideSeizureTab).toBe(true);
    });

    it('rule 2: small balance requires lawyer soft opt-in before buttons', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 222_233,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(r.ruleId).toBe('rule_2_soft');
        expect(r.hideSeizureTab).toBe(false);
        expect(r.requiresSoftActivationModal).toBe(true);
        expect(r.showTabContentButtons).toBe(false);
        expect(r.buttons.salary).toBe(false);
        expect(r.buttons.movable).toBe(false);
    });

    it('rule 2: after lawyer soft opt-in shows the first-tier button', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 222_233,
            debtorJob: 'employee',
            debtorType: 'natural_person',
            lawyerSoftOptIn: true,
        });
        expect(r.requiresSoftActivationModal).toBe(false);
        expect(r.showTabContentButtons).toBe(true);
        expect(r.buttons.salary).toBe(true);
        expect(r.buttons.movable).toBe(false);
    });

    it('rule 3: 2M–5M opens salary+movable for employee', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 3_000_000,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(r.ruleId).toBe('rule_3_tier1');
        expect(r.buttons.salary).toBe(true);
        expect(r.buttons.movable).toBe(true);
        expect(r.buttons.third_party).toBe(false);
    });

    it('rule 4: 5M–15M adds third party', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 10_000_000,
            debtorJob: 'kasib',
            debtorType: 'natural_person',
        });
        expect(r.buttons.movable).toBe(true);
        expect(r.buttons.third_party).toBe(true);
        expect(r.buttons.property).toBe(false);
    });

    it('rule 5: above 15M adds property for all', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 16_000_000,
            debtorJob: 'kasib',
            debtorType: 'natural_person',
        });
        expect(r.buttons.property).toBe(true);
    });

    it('reactivity: payment drops tier from full to tier2', () => {
        const full = computeSeizureMatrix({
            remainingBalanceIqd: 16_000_000,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(full.buttons.property).toBe(true);

        const afterPayment = computeSeizureMatrix({
            remainingBalanceIqd: 14_000_000,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(afterPayment.buttons.property).toBe(false);
        expect(afterPayment.buttons.third_party).toBe(true);
    });

    it('detects government debtor from occupation', () => {
        expect(
            resolveSeizureDebtorType({ occupation: 'وزارة المالية' } as any, null)
        ).toBe('government');
    });

    it('resolveSeizureMatrixFromExecution reads soft opt-in flag', () => {
        const r = resolveSeizureMatrixFromExecution({
            remainingBalanceIqd: 1_500_000,
            executionData: { seizure_matrix_soft_opt_in: true } as any,
            activeDebtorIsEmployee: false,
        });
        expect(r.showTabContentButtons).toBe(true);
        expect(r.buttons.movable).toBe(true);
    });

    it('progressive disclosure: employee soft tier reveals movable then max tier', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 1_000_000,
            debtorJob: 'employee',
            debtorType: 'natural_person',
            lawyerSoftOptIn: true,
        });
        expect(r.progressiveDisclosure.showAdditionalExpand).toBe(true);
        expect(r.progressiveDisclosure.additionalButtons).toEqual(['movable']);
        expect(r.progressiveDisclosure.showMaximumExpand).toBe(true);
        expect(r.progressiveDisclosure.maximumButtons).toEqual(['third_party', 'property']);
    });

    it('progressive disclosure: tier1 employee hides third_party and property', () => {
        const r = computeSeizureMatrix({
            remainingBalanceIqd: 3_000_000,
            debtorJob: 'employee',
            debtorType: 'natural_person',
        });
        expect(r.progressiveDisclosure.showAdditionalExpand).toBe(true);
        expect(r.progressiveDisclosure.additionalButtons).toEqual(['third_party']);
        expect(r.progressiveDisclosure.showMaximumExpand).toBe(true);
        expect(r.progressiveDisclosure.maximumButtons).toEqual(['property']);
    });

    it('computeSeizureProgressiveDisclosure: no hidden buttons', () => {
        const d = computeSeizureProgressiveDisclosure(
            { salary: true, movable: true, third_party: true, property: true },
            'employee'
        );
        expect(d.showAdditionalExpand).toBe(false);
        expect(d.additionalButtons).toEqual([]);
    });
});
