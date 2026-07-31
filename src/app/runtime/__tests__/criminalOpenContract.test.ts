import { describe, expect, it, vi, beforeEach } from 'vitest';

const bridgeMocks = vi.hoisted(() => ({
    requestCriminalDashboardBridgeActivate: vi.fn(),
}));
const loaderMocks = vi.hoisted(() => ({
    prefetchCriminalDashboardChromeWarm: vi.fn(),
}));
const primeMocks = vi.hoisted(() => ({
    primeCriminalDossierForOpen: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/slices/criminal/bridgeEvent', () => bridgeMocks);
vi.mock('@/app/runtime/criminalDashboardLoader', () => loaderMocks);
vi.mock('@/app/runtime/primeCriminalDossierForOpen', () => primeMocks);

import {
    openCriminalDossierWithContract,
    prepareCriminalDossierOpen,
} from '../criminalOpenContract';

describe('criminalOpenContract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commit فوري ثم تهيئة بالخلفية', async () => {
        const commit = vi.fn();
        openCriminalDossierWithContract('cr-42', commit);

        expect(bridgeMocks.requestCriminalDashboardBridgeActivate).toHaveBeenCalled();
        expect(commit).toHaveBeenCalledWith('cr-42');

        await vi.waitFor(() => {
            expect(loaderMocks.prefetchCriminalDashboardChromeWarm).toHaveBeenCalled();
            expect(primeMocks.primeCriminalDossierForOpen).toHaveBeenCalledWith('cr-42');
        });
    });

    it('يتجاهل معرّف فارغ', () => {
        const commit = vi.fn();
        openCriminalDossierWithContract('  ', commit);
        expect(commit).not.toHaveBeenCalled();
        expect(bridgeMocks.requestCriminalDashboardBridgeActivate).not.toHaveBeenCalled();
    });

    it('prepareCriminalDossierOpen يطلق التسخين فقط', async () => {
        prepareCriminalDossierOpen('cr-9');
        await vi.waitFor(() => {
            expect(loaderMocks.prefetchCriminalDashboardChromeWarm).toHaveBeenCalled();
            expect(primeMocks.primeCriminalDossierForOpen).toHaveBeenCalledWith('cr-9');
        });
    });
});
