import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    listCapacitorSplashPngs,
    removeCapacitorSplashPngs,
} from '../../../../scripts/lib/android-splash-png-hygiene.mjs';

describe('android splash PNG hygiene', () => {
    it('lists splash.png under drawable* and removes empty density folders', () => {
        const resDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hami-splash-res-'));
        try {
            const drawable = path.join(resDir, 'drawable');
            const land = path.join(resDir, 'drawable-land-xxhdpi');
            const nodpi = path.join(resDir, 'drawable-nodpi');
            fs.mkdirSync(drawable, { recursive: true });
            fs.mkdirSync(land, { recursive: true });
            fs.mkdirSync(nodpi, { recursive: true });
            fs.writeFileSync(path.join(drawable, 'splash.xml'), '<layer-list />');
            fs.writeFileSync(path.join(drawable, 'splash.png'), 'png');
            fs.writeFileSync(path.join(land, 'splash.png'), 'png');
            fs.writeFileSync(path.join(nodpi, 'hami_splash_logo.webp'), 'webp');

            const listed = listCapacitorSplashPngs(resDir);
            expect(listed).toHaveLength(2);
            expect(listed.every((p) => p.endsWith(`${path.sep}splash.png`))).toBe(true);

            const removed = removeCapacitorSplashPngs(resDir);
            expect(removed).toHaveLength(2);
            expect(fs.existsSync(path.join(drawable, 'splash.png'))).toBe(false);
            expect(fs.existsSync(path.join(drawable, 'splash.xml'))).toBe(true);
            expect(fs.existsSync(land)).toBe(false);
            expect(fs.existsSync(path.join(nodpi, 'hami_splash_logo.webp'))).toBe(true);
            expect(listCapacitorSplashPngs(resDir)).toEqual([]);
        } finally {
            fs.rmSync(resDir, { recursive: true, force: true });
        }
    });

    it('returns empty when res dir is missing', () => {
        expect(listCapacitorSplashPngs(path.join(os.tmpdir(), 'hami-missing-res-dir'))).toEqual([]);
        expect(removeCapacitorSplashPngs(path.join(os.tmpdir(), 'hami-missing-res-dir'))).toEqual([]);
    });
});
