import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/app/services/settings/wallpaperPaintReady', () => ({
    ensureWallpaperDecoded: vi.fn(async () => undefined),
}));

import { DashboardWallpaperLayer } from '@/app/components/lawyer/DashboardWallpaperLayer';

describe('DashboardWallpaperLayer', () => {
    afterEach(() => {
        document.documentElement.style.removeProperty('--hami-wallpaper-image');
        delete document.documentElement.dataset.hamiWallpaper;
    });

    it('يحقن متغيّر CSS للغطاء الرئيسي دون طبقة fixed', async () => {
        const { container } = render(
            <DashboardWallpaperLayer enabled src="data:image/jpeg;base64,/9j/4AAQ" />,
        );
        expect(container.querySelector('.hami-wallpaper-layer')).toBeNull();
        await waitFor(() => {
            expect(document.documentElement.style.getPropertyValue('--hami-wallpaper-image')).toContain(
                'data:image/jpeg;base64',
            );
        });
        expect(document.documentElement.dataset.hamiWallpaper).toBe('1');
    });

    it('يمسح المتغيّر عند enabled=false', () => {
        document.documentElement.style.setProperty('--hami-wallpaper-image', 'url("x")');
        const { container } = render(
            <DashboardWallpaperLayer enabled={false} src="data:image/jpeg;base64,x" />,
        );
        expect(container.firstChild).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--hami-wallpaper-image')).toBe('');
    });
});
