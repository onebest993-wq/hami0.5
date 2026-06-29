import { describe, it, expect } from 'vitest';

import { removeStaticBootShell, STATIC_BOOT_SHELL_ID } from '@/app/bootstrap/bootStaticShell';

describe('bootStaticShell', () => {
    it('يزيل طبقة الإقلاع الثابتة وتصنيف html', () => {
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        removeStaticBootShell();

        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).toBeNull();
        expect(document.documentElement.classList.contains('hami-boot-static-active')).toBe(false);
    });
});
