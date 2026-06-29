import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { clearDecisionsNamespaceForTests } from '@/app/utils/executionDecisionsNamespace';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import { readDecisionsUnionAcrossCandidates } from '../readDecisionsUnionAcrossCandidates';

const PARENT_ID = 'parent-dossier-001';
const CHILD_ID = 'child-dossier-002';

describe('readDecisionsUnionAcrossCandidates', () => {
    beforeEach(() => {
        clearDecisionsNamespaceForTests(PARENT_ID);
        clearDecisionsNamespaceForTests(CHILD_ID);
    });

    it('يجمع قرارات محفوظة تحت معرّف فرعي عند القراءة بالمعرّف الأب', () => {
        writeExecutorDecisionsArray(
            CHILD_ID,
            [
                {
                    id: 'manual-decision-1',
                    title: 'قرار يدوي',
                    date: '2026-01-15',
                    manualExecutorLedgerEntry: true,
                },
            ],
            { id: CHILD_ID, parentDossierId: PARENT_ID }
        );

        const { canonicalId, rows } = readDecisionsUnionAcrossCandidates(PARENT_ID, {
            id: CHILD_ID,
            parentDossierId: PARENT_ID,
        });

        expect(canonicalId).toBe(PARENT_ID);
        expect(rows.map((r) => r.id)).toContain('manual-decision-1');
    });

    it('لا يفقد قرارات عند تغيّر executionId من default إلى الأب', () => {
        writeExecutorDecisionsArray(
            CHILD_ID,
            [
                {
                    id: 'decision-x',
                    title: 'قرار',
                    date: '2026-02-01',
                    manualExecutorLedgerEntry: true,
                },
            ],
            { id: CHILD_ID }
        );

        const first = readDecisionsUnionAcrossCandidates('default', { id: CHILD_ID });
        const second = readDecisionsUnionAcrossCandidates(PARENT_ID, {
            id: CHILD_ID,
            parentDossierId: PARENT_ID,
        });

        expect(first.rows.map((r) => r.id)).toContain('decision-x');
        expect(second.rows.map((r) => r.id)).toContain('decision-x');
        expect(SecureStoreService.getItemSync(`execution_${CHILD_ID}_decisions`)).toBeTruthy();
    });
});
