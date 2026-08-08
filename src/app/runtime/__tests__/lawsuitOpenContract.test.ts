import { describe, expect, it, vi, beforeEach } from 'vitest';

const portalMocks = vi.hoisted(() => ({
    prefetchSmartFileModalPortal: vi.fn(),
}));
const smartFileMocks = vi.hoisted(() => ({
    prefetchSmartFileModalPhased: vi.fn(),
}));
const lawsuitWarmMocks = vi.hoisted(() => ({
    warmLawsuitWorkspace: vi.fn(),
}));

vi.mock('@/app/components/lawyer/dashboard/smartFileModalPortalLazy', () => portalMocks);
vi.mock('@/app/runtime/smartFileModalLoader', () => smartFileMocks);
vi.mock('@/app/runtime/lawsuitWorkspaceWarm', () => lawsuitWarmMocks);

import {
    LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT,
    openLawsuitDossierWithContract,
    prepareLawsuitDossierOpen,
} from '../lawsuitOpenContract';

describe('lawsuitOpenContract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commit فوري ويسخّن البوابة + المحتوى', async () => {
        const commit = vi.fn();
        const suppressListener = vi.fn();
        window.addEventListener(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT, suppressListener);
        openLawsuitDossierWithContract(commit);
        expect(suppressListener).toHaveBeenCalledTimes(1);
        window.removeEventListener(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT, suppressListener);
        expect(commit).toHaveBeenCalledTimes(1);

        await vi.waitFor(() => {
            expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalled();
            expect(smartFileMocks.prefetchSmartFileModalPhased).toHaveBeenCalled();
            expect(lawsuitWarmMocks.warmLawsuitWorkspace).toHaveBeenCalledWith({
                includeSecondary: false,
            });
        });
    });

    it('prepareLawsuitDossierOpen يطلق التسخين فقط', async () => {
        prepareLawsuitDossierOpen();
        await vi.waitFor(() => {
            expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalled();
            expect(smartFileMocks.prefetchSmartFileModalPhased).toHaveBeenCalled();
        });
    });
});
