import { describe, expect, it } from 'vitest';
import { CRIMINAL_MODAL_Z } from '../criminalModalPortal';

describe('criminalModalPortal', () => {
    it('defines layered z-index constants', () => {
        expect(CRIMINAL_MODAL_Z.shell).toBe(220);
        expect(CRIMINAL_MODAL_Z.trial).toBe(235);
        expect(CRIMINAL_MODAL_Z.trialPostpone).toBe(236);
        expect(CRIMINAL_MODAL_Z.stageCloser).toBeGreaterThan(CRIMINAL_MODAL_Z.request);
    });
});
