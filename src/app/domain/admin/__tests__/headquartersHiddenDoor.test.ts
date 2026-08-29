import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    HEADQUARTERS_DOOR_DIGEST,
    headquartersDoorPhraseMatches,
    resetHeadquartersDoorLockForTests,
    sha256HexUtf8,
} from '../headquartersHiddenDoor';

describe('headquartersHiddenDoor', () => {
    afterEach(() => {
        resetHeadquartersDoorLockForTests();
    });

    it('يقبل العبارة الصحيحة فقط', async () => {
        expect(await sha256HexUtf8('mortal shell2')).toBe(HEADQUARTERS_DOOR_DIGEST);
        expect(await headquartersDoorPhraseMatches('mortal shell2')).toBe(true);
        expect(await headquartersDoorPhraseMatches('Mortal  Shell2')).toBe(true);
        expect(await headquartersDoorPhraseMatches('mortal')).toBe(false);
        expect(await headquartersDoorPhraseMatches('xxxxxxxxxxxxx')).toBe(false);
        expect(await headquartersDoorPhraseMatches('mort\u0430l shell2')).toBe(false);
        expect(await headquartersDoorPhraseMatches('1')).toBe(false);
    });

    it('يقبل الرمز المختصر للتطوير فقط عند تفعيله صراحة', async () => {
        expect(await headquartersDoorPhraseMatches('1')).toBe(false);
        expect(await headquartersDoorPhraseMatches('1', Date.now(), { allowDevShortcut: true })).toBe(true);
        expect(await headquartersDoorPhraseMatches('١', Date.now(), { allowDevShortcut: true })).toBe(true);
        expect(await headquartersDoorPhraseMatches('12', Date.now(), { allowDevShortcut: true })).toBe(false);
        for (let i = 0; i < 8; i += 1) {
            expect(await headquartersDoorPhraseMatches('xxxxxxxxxxxxx', 8_000_000)).toBe(false);
        }
        expect(await headquartersDoorPhraseMatches('1', 8_000_001, { allowDevShortcut: true })).toBe(true);
        const door = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersHiddenDoor.tsx'),
            'utf8',
        );
        expect(door).toContain('allowDevShortcut');
        expect(door).toContain('import.meta.env.DEV');
    });

    it('يقفل بعد ثماني محاولات ثم يُفتح بعد نافذة القفل', async () => {
        const t0 = 5_000_000;
        for (let i = 0; i < 8; i += 1) {
            expect(await headquartersDoorPhraseMatches('xxxxxxxxxxxxx', t0)).toBe(false);
        }
        expect(await headquartersDoorPhraseMatches('mortal shell2', t0 + 1)).toBe(false);
        expect(await headquartersDoorPhraseMatches('mortal shell2', t0 + 20_001)).toBe(true);
    });

    it('سطح /admin فارغ في المصدر بلا شعار إقلاع وبلا بصمة data-plain', () => {
        const surface = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/blankDocumentSurface.tsx'),
            'utf8',
        );
        expect(surface).toContain('#ffffff');
        expect(surface).toContain('createPortal');
        expect(surface).not.toContain('hami-splash-logo');
        expect(surface).not.toContain('410 Gone');
        expect(surface).not.toContain('#E6C673');
        const boot = fs.readFileSync(path.join(process.cwd(), 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain('#hami-static-boot *{visibility:hidden');
        expect(boot).not.toContain("setAttribute('data-plain'");
        expect(boot).not.toContain('data-plain');
        const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
        expect(html).not.toContain('data-plain');
        expect(html).not.toMatch(/rel=["']preload["'][^>]*hami-splash-logo/);
        const door = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersHiddenDoor.tsx'),
            'utf8',
        );
        expect(door).not.toContain('type="password"');
        expect(door).not.toContain('id="doc-q"');
        const shell = fs.readFileSync(path.join(process.cwd(), 'src/app/HqRuntimeShell.tsx'), 'utf8');
        expect(shell).toContain("import('@/app/surface/inner')");
        expect(shell).toContain("import('@/app/surface/host')");
        expect(shell).not.toContain('AdminHeadquartersLoginGate');
        expect(shell).not.toContain("from '@/app/components/admin/AdminHeadquartersAccess'");
        expect(shell).not.toContain("from '@/app/components/admin/HeadquartersHiddenDoor'");
    });
});
