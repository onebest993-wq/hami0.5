import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardWallpaperLayer } from '@/app/components/lawyer/DashboardWallpaperLayer';

describe('DashboardWallpaperLayer', () => {
    it('يرسم الطبقة ويحقن متغيّر CSS للغطاء الرئيسي', () => {
        const { container } = render(
            <DashboardWallpaperLayer enabled src="data:image/jpeg;base64,/9j/4AAQ" />,
        );
        const layer = container.querySelector('.hami-wallpaper-layer') as HTMLElement | null;
        expect(layer).toBeTruthy();
        expect(layer?.style.backgroundImage).toContain('data:image/jpeg;base64');
        expect(document.documentElement.style.getPropertyValue('--hami-wallpaper-image')).toContain(
            'data:image/jpeg;base64',
        );
        expect(document.documentElement.dataset.hamiWallpaper).toBe('1');
    });

    it('لا يرسم شيئاً عند enabled=false ويمسح المتغيّر', () => {
        document.documentElement.style.setProperty('--hami-wallpaper-image', 'url("x")');
        const { container } = render(
            <DashboardWallpaperLayer enabled={false} src="data:image/jpeg;base64,x" />,
        );
        expect(container.querySelector('.hami-wallpaper-layer')).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--hami-wallpaper-image')).toBe('');
    });
});
