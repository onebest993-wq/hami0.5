import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assertPcmWav(path: string, minBytes: number) {
    expect(existsSync(path), path).toBe(true);
    const buf = readFileSync(path);
    expect(buf.length).toBeGreaterThan(minBytes);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(buf.subarray(8, 12).toString('ascii')).toBe('WAVE');
    let peak = 0;
    for (let i = 44; i + 1 < buf.length; i += 2) {
        peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    }
    expect(peak).toBeGreaterThan(1000);
}

describe('hami legal alarm wav', () => {
    it('ملف المنبّه القانوني PCM حقيقي في الويب وAndroid', () => {
        assertPcmWav(resolve(process.cwd(), 'public/sounds/hami_legal_alarm.wav'), 80_000);
        assertPcmWav(resolve(process.cwd(), 'android/app/src/main/res/raw/hami_legal_alarm.wav'), 80_000);
        assertPcmWav(resolve(process.cwd(), 'public/sounds/hami_arrival.wav'), 4_000);
        assertPcmWav(resolve(process.cwd(), 'android/app/src/main/res/raw/hami_arrival.wav'), 4_000);
    });
});
