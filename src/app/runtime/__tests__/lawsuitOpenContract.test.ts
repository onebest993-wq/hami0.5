import { describe, expect, it, vi, beforeEach } from 'vitest';

const portalMocks = vi.hoisted(() => ({
    prefetchSmartFileModalPortal: vi.fn(),
}));
const smartFileMocks = vi.hoisted(() => ({
    prefetchSmartFileModalPhased: vi.fn(),
}));
const overlayMocks = vi.hoisted(() => ({
    prefetchSmartFileOverlayEntry: vi.fn(),
}));
const lawsuitWarmMocks = vi.hoisted(() => ({
    warmLawsuitWorkspace: vi.fn(),
}));

vi.mock('@/app/components/lawyer/dashboard/smartFileModalPortalLazy', () => portalMocks);
vi.mock('@/app/runtime/smartFileModalLoader', () => smartFileMocks);
vi.mock('@/app/runtime/smartFileOverlayEntryLoader', () => overlayMocks);
vi.mock('@/app/runtime/lawsuitWorkspaceWarm', () => lawsuitWarmMocks);
vi.mock('@/app/components/lawyer/personal-status/personalStatusDossierLazy', () => ({
    prefetchPersonalStatusDossierSurface: vi.fn(),
}));

import {
    LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT,
    openLawsuitDossierWithContract,
    prepareLawsuitDossierChrome,
    prepareLawsuitDossierChromeOnce,
    prepareLawsuitDossierOpen,
    resetLawsuitDossierChromeArmedForTests,
} from '../lawsuitOpenContract';

describe('lawsuitOpenContract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetLawsuitDossierChromeArmedForTests();
    });

    it('commit فوري ويسخّن البوابة + المحتوى', async () => {
        const commit = vi.fn();
        const suppressListener = vi.fn();
        window.addEventListener(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT, suppressListener);
        openLawsuitDossierWithContract(commit);
        expect(suppressListener).toHaveBeenCalledTimes(1);
        window.removeEventListener(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT, suppressListener);
        expect(commit).toHaveBeenCalledTimes(1);
        expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalled();
        expect(smartFileMocks.prefetchSmartFileModalPhased).toHaveBeenCalled();
        expect(overlayMocks.prefetchSmartFileOverlayEntry).toHaveBeenCalled();
        expect(lawsuitWarmMocks.warmLawsuitWorkspace).not.toHaveBeenCalled();
    });

    it('prepareLawsuitDossierOpen يطلق التسخين فقط', async () => {
        prepareLawsuitDossierOpen();
        expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalled();
        expect(smartFileMocks.prefetchSmartFileModalPhased).toHaveBeenCalled();
        expect(overlayMocks.prefetchSmartFileOverlayEntry).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(lawsuitWarmMocks.warmLawsuitWorkspace).toHaveBeenCalled();
        });
    });

    it('prepareLawsuitDossierChrome يسخّن الإضبارة بلا Prime للمساحة', () => {
        prepareLawsuitDossierChrome();
        expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalled();
        expect(smartFileMocks.prefetchSmartFileModalPhased).toHaveBeenCalled();
        expect(overlayMocks.prefetchSmartFileOverlayEntry).toHaveBeenCalled();
        expect(lawsuitWarmMocks.warmLawsuitWorkspace).not.toHaveBeenCalled();
    });

    it('prepareLawsuitDossierChromeOnce لا يكرر التسخين', () => {
        prepareLawsuitDossierChromeOnce();
        expect(portalMocks.prefetchSmartFileModalPortal).toHaveBeenCalledTimes(1);
        portalMocks.prefetchSmartFileModalPortal.mockClear();
        prepareLawsuitDossierChromeOnce();
        expect(portalMocks.prefetchSmartFileModalPortal).not.toHaveBeenCalled();
    });
});
