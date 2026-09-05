import { describe, expect, it } from 'vitest';
import {
    addCreationCommit,
    buildCreationRevealQueue,
    isCreationEnterCommit,
    isCreationStepRevealed,
    pruneCreationCommitsToQueue,
} from '../executionCreationRevealSteps';

describe('execution creation sequential reveal', () => {
    it('starts with directorate then file number then doc type only', () => {
        expect(
            buildCreationRevealQueue({
                docType: '',
                hasAmountStep: false,
                showLawyerFees: false,
            }),
        ).toEqual(['directorate', 'fileNumber', 'docType']);
    });

    it('reveals court-judgment fields one after another, not as a batch', () => {
        const queue = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: true,
            showLawyerFees: true,
        });
        expect(queue).toEqual([
            'directorate',
            'fileNumber',
            'docType',
            'docNumber',
            'judgmentDate',
            'classification',
            'claimType',
            'claimAmounts',
            'creditors',
            'debtors',
        ]);

        const committed = new Set<'directorate'>(['directorate']);
        expect(isCreationStepRevealed('fileNumber', queue, committed)).toBe(true);
        expect(isCreationStepRevealed('docType', queue, committed)).toBe(false);
        expect(isCreationStepRevealed('docNumber', queue, committed)).toBe(false);
    });

    it('keeps claimAmounts step for non-monetary claims so eviction/delivery extras appear', () => {
        const queue = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: false,
            showLawyerFees: false,
        });
        expect(queue).toContain('claimAmounts');
        expect(queue.indexOf('claimAmounts')).toBeGreaterThan(queue.indexOf('claimType'));
        expect(queue.indexOf('creditors')).toBeGreaterThan(queue.indexOf('claimAmounts'));
    });

    it('أتعاب المحاماة لا تحجب أسماء الدائن والمدين', () => {
        const withFees = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: true,
            showLawyerFees: true,
        });
        const withoutFees = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: true,
            showLawyerFees: false,
        });
        expect(withFees).toEqual(withoutFees);
        expect(withFees.indexOf('creditors')).toBeGreaterThan(withFees.indexOf('claimAmounts'));
        expect(withFees).not.toContain('lawyerFees');
    });

    it('does not treat typing as a commit — Enter detection requires the Enter key', () => {
        expect(isCreationEnterCommit({ key: 'a' })).toBe(false);
        expect(isCreationEnterCommit({ key: 'Enter', nativeEvent: { isComposing: true } })).toBe(
            false,
        );
        expect(isCreationEnterCommit({ key: 'Enter' })).toBe(true);
    });

    it('re-committing an earlier step keeps later commits so the user can edit without wiping the form', () => {
        const queue = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: true,
            showLawyerFees: false,
        });
        const committed = new Set(queue);
        const next = addCreationCommit(committed, 'docType', queue);
        expect(next.has('claimAmounts')).toBe(true);
        expect(next.has('creditors')).toBe(true);
        expect(next.has('docType')).toBe(true);
    });

    it('drops commits that left the queue when the instrument type changes', () => {
        const courtQueue = buildCreationRevealQueue({
            docType: 'قرارات وأحكام المحاكم',
            hasAmountStep: true,
            showLawyerFees: false,
        });
        const committed = new Set(courtQueue);
        const shariaQueue = buildCreationRevealQueue({
            docType: 'الحجج الشرعية',
            hasAmountStep: true,
            showLawyerFees: false,
        });
        const next = pruneCreationCommitsToQueue(committed, shariaQueue);
        expect(next.has('judgmentDate')).toBe(false);
        expect(next.has('classification')).toBe(false);
        expect(next.has('claimType')).toBe(true);
        expect(next.has('directorate')).toBe(true);
    });
});
