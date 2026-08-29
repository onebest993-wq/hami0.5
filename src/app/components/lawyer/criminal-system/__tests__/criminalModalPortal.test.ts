import { describe, expect, it } from 'vitest';
import { CRIMINAL_MODAL_Z } from '../criminalModalPortal';

describe('criminalModalPortal', () => {
    it('defines layered z-index constants above hub shell', () => {
        expect(CRIMINAL_MODAL_Z.shell).toBe(235);
        expect(CRIMINAL_MODAL_Z.shell).toBeGreaterThan(220);
        expect(CRIMINAL_MODAL_Z.request).toBeGreaterThan(CRIMINAL_MODAL_Z.shell);
        expect(CRIMINAL_MODAL_Z.trial).toBeGreaterThan(CRIMINAL_MODAL_Z.shell);
        expect(CRIMINAL_MODAL_Z.trialPostpone).toBeGreaterThan(CRIMINAL_MODAL_Z.trial);
        expect(CRIMINAL_MODAL_Z.stageCloser).toBeGreaterThan(CRIMINAL_MODAL_Z.request);
    });
});
