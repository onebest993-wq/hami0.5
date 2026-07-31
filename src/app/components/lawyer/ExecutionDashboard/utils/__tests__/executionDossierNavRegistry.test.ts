import { describe, expect, it, vi } from 'vitest';
import {
    runExecutionDossierBackToArchive,
    runExecutionDossierExitToHome,
    setExecutionDossierNavHandlers,
} from '../executionDossierNavRegistry';

describe('executionDossierNavRegistry', () => {
    it('runs back and exit handlers when registered', () => {
        const backToArchive = vi.fn();
        const exitToHome = vi.fn();
        setExecutionDossierNavHandlers({ backToArchive, exitToHome });

        expect(runExecutionDossierBackToArchive()).toBe(true);
        expect(runExecutionDossierExitToHome()).toBe(true);
        expect(backToArchive).toHaveBeenCalledTimes(1);
        expect(exitToHome).toHaveBeenCalledTimes(1);

        setExecutionDossierNavHandlers(null);
        expect(runExecutionDossierBackToArchive()).toBe(false);
        expect(runExecutionDossierExitToHome()).toBe(false);
    });
});
