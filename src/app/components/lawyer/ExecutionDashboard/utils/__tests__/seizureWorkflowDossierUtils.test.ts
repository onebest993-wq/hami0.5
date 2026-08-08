import { describe, expect, it } from 'vitest';
import {
    isInvalidSeizureWorkflowDossierId,
    resolveSeizureWorkflowDossierId,
} from '../seizureWorkflowDossierUtils';

describe('seizureWorkflowDossierUtils', () => {
    it('يرفض معرّفات وهمية', () => {
        expect(isInvalidSeizureWorkflowDossierId('default')).toBe(true);
        expect(isInvalidSeizureWorkflowDossierId('undefined')).toBe(true);
        expect(isInvalidSeizureWorkflowDossierId('')).toBe(true);
        expect(isInvalidSeizureWorkflowDossierId('exec-1')).toBe(false);
    });

    it('يحلّ معرّف التخزين من executionId عند غياب decisionsStorageExecutionId', () => {
        expect(
            resolveSeizureWorkflowDossierId({
                decisionsStorageExecutionId: '',
                executionId: 'exec-child',
                executionDataId: 'exec-child',
            }),
        ).toBe('exec-child');
    });
});
