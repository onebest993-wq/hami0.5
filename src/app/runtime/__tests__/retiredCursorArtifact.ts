/**
 * أدوات صدق لمسارات Wave/Phase التي كانت تقرأ ملفات تحت `.cursor/`
 * (معظمها gitignored) أو عيّنات أداء لم تعد في المستودع.
 *
 * الغياب ليس ختماً عالمياً — إن وُجد الملف يُفحص محتواه؛ إن غاب يُعدّ المتتبّع متقاعداً.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';

const root = process.cwd();

export function readRepoTextIfPresent(relFromRepo: string): string | null {
    const abs = path.join(root, relFromRepo);
    try {
        if (!fs.existsSync(abs)) return null;
        return fs.readFileSync(abs, 'utf8');
    } catch {
        return null;
    }
}

export function expectJsonOrRetired<T>(
    relFromRepo: string,
    assertLive: (parsed: T) => void,
): void {
    const text = readRepoTextIfPresent(relFromRepo);
    if (text == null) {
        expect(text, `${relFromRepo} retired (gitignored or removed) — no silent seal`).toBeNull();
        return;
    }
    assertLive(JSON.parse(text) as T);
}

export function expectTextOrRetired(
    relFromRepo: string,
    assertLive: (text: string) => void,
): void {
    const text = readRepoTextIfPresent(relFromRepo);
    if (text == null) {
        expect(text, `${relFromRepo} retired (gitignored or removed) — no silent seal`).toBeNull();
        return;
    }
    assertLive(text);
}
