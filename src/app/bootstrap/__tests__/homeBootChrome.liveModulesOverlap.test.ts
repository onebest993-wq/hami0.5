import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHomeTabContent = vi.fn(() => Promise.resolve());
const loadCommandHubTiles = vi.fn(() => Promise.resolve());
const loadLawyerHomeHubCardModule = vi.fn(() => Promise.resolve());

vi.mock('@/app/runtime/homeTabContentLoader', () => ({
    loadHomeTabContent: () => loadHomeTabContent(),
}));
vi.mock('@/app/runtime/commandHubTilesLoader', () => ({
    loadCommandHubTiles: () => loadCommandHubTiles(),
}));
vi.mock('@/app/runtime/homeHubCardLoader', () => ({
    loadLawyerHomeHubCardModule: () => loadLawyerHomeHubCardModule(),
}));
vi.mock('@/boot/peekBootSessionUserId', () => ({
    peekBootSessionPeekSync: () => null,
    peekBootSessionUserIdSync: () => null,
}));

describe('homeBootChrome live modules overlap', () => {
    afterEach(async () => {
        const { resetHomeBootChromeForTests } = await import('@/app/bootstrap/homeBootChrome');
        const { resetLawyerProfileBootWarmPendingForTests } = await import(
            '@/app/services/profile/profileBootWarmPending'
        );
        resetHomeBootChromeForTests();
        resetLawyerProfileBootWarmPendingForTests();
        loadHomeTabContent.mockClear();
        loadCommandHubTiles.mockClear();
        loadLawyerHomeHubCardModule.mockReset();
        loadHomeTabContent.mockImplementation(() => Promise.resolve());
        loadCommandHubTiles.mockImplementation(() => Promise.resolve());
        loadLawyerHomeHubCardModule.mockImplementation(() => Promise.resolve());
    });

    it('يبدأ مقاطع المنزل تحت الغطاء بينما تسخين الملف ما زال معلّقاً', async () => {
        const { setLawyerProfileBootWarmPending } = await import(
            '@/app/services/profile/profileBootWarmPending'
        );
        const { prepareHomeBootChrome, isHomeBootChromeReady } = await import(
            '@/app/bootstrap/homeBootChrome'
        );

        setLawyerProfileBootWarmPending(true);
        const chromeDone = prepareHomeBootChrome();
        await Promise.resolve();
        await Promise.resolve();

        expect(loadHomeTabContent).toHaveBeenCalled();
        expect(loadCommandHubTiles).toHaveBeenCalled();
        expect(loadLawyerHomeHubCardModule).toHaveBeenCalled();
        expect(isHomeBootChromeReady()).toBe(false);

        setLawyerProfileBootWarmPending(false);
        await chromeDone;
        expect(isHomeBootChromeReady()).toBe(true);
    });

    it('لا يحجب جاهزية الكروم إن علق مقطع بطاقة المركز', async () => {
        loadLawyerHomeHubCardModule.mockImplementation(() => new Promise(() => {}));
        const { prepareHomeBootChrome, isHomeBootChromeReady } = await import(
            '@/app/bootstrap/homeBootChrome'
        );

        const chromeDone = prepareHomeBootChrome();
        await chromeDone;
        expect(isHomeBootChromeReady()).toBe(true);
        expect(loadLawyerHomeHubCardModule).toHaveBeenCalled();
    });
});
