import { describe, expect, it } from 'vitest';
import {
    collectDecisionsStorageCandidateIds,
    normalizeDecisionsExecutionIdProp,
    resolveDecisionsStorageExecutionId,
} from '../resolveDecisionsStorageExecutionId';

describe('resolveDecisionsStorageExecutionId', () => {
    it('normalizeDecisionsExecutionIdProp يصفّر default', () => {
        expect(normalizeDecisionsExecutionIdProp('default')).toBeUndefined();
        expect(normalizeDecisionsExecutionIdProp('real-id')).toBe('real-id');
    });
    it('يفضّل معرّف الأب حتى عندما executionId هو الإضبارة الفرعية', () => {
        expect(
            resolveDecisionsStorageExecutionId('sub-uuid', {
                id: 'sub-uuid',
                parentDossierId: 'parent-uuid',
            }),
        ).toBe('parent-uuid');
    });

    it('يفضّل معرّف الأب على معرّف الإضبارة الفرعية', () => {
        expect(
            resolveDecisionsStorageExecutionId('parent-uuid', {
                id: 'sub-uuid',
                parentDossierId: 'parent-uuid',
            })
        ).toBe('parent-uuid');
    });

    it('يستخدم id الإضبارة عندما يكون executionId = default', () => {
        expect(
            resolveDecisionsStorageExecutionId('default', {
                id: 'real-dossier-id',
            })
        ).toBe('real-dossier-id');
    });

    it('يعود default عند غياب كل المرشحين', () => {
        expect(resolveDecisionsStorageExecutionId(undefined, null)).toBe('default');
    });

    it('يجمع كل معرّفات التخزين المحتملة', () => {
        const ids = collectDecisionsStorageCandidateIds('parent-uuid', {
            id: 'sub-uuid',
            parentDossierId: 'parent-uuid',
        });
        expect(ids).toContain('parent-uuid');
        expect(ids).toContain('sub-uuid');
    });
});
