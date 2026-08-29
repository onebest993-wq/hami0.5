import { afterEach, describe, expect, it } from 'vitest';

import { removeStaticBootShell, STATIC_BOOT_SHELL_ID } from '@/app/bootstrap/bootStaticShell';

describe('bootStaticShell guard', () => {
    afterEach(() => {
        document.getElementById(STATIC_BOOT_SHELL_ID)?.remove();
        document.documentElement.classList.remove('hami-boot-static-active');
        window.__hamiHomeMainGridPainted__ = false;
        window.__hamiBootRevealDone__ = false;
    });

    it('لا يزيل الطبقة قبل paint الشبكة', () => {
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        removeStaticBootShell({ instant: true });
        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).not.toBeNull();
    });

    it('يزيل الطبقة عند force بعد paint أو قسراً', () => {
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        window.__hamiHomeMainGridPainted__ = true;
        removeStaticBootShell({ instant: true });
        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).toBeNull();

        const layer2 = document.createElement('div');
        layer2.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer2);
        window.__hamiHomeMainGridPainted__ = false;

        removeStaticBootShell({ force: true, instant: true });
        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).toBeNull();
    });

    it('لا يقصّ الطبقة فوراً لأن الجلسة مكتملة', () => {
        window.__hamiBootRevealDone__ = true;
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);
        window.__hamiHomeMainGridPainted__ = true;

        removeStaticBootShell();
        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).not.toBeNull();
        expect(layer.classList.contains('hami-boot-cinematic--exiting')).toBe(true);
    });
});
