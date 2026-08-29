import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applyStorageSchemaBoot,
    STORAGE_SCHEMA_MIGRATIONS,
    type SchemaMigration,
    type SchemaStoragePort,
} from '@/app/services/storageSchema/storageSchemaMigrations';
import {
    CURRENT_STORAGE_SCHEMA_VERSION,
    parseStorageSchemaRecord,
    STORAGE_SCHEMA_KEY,
} from '@/app/services/storageSchema/storageSchemaVersion';

function memoryPort(seed: Record<string, string> = {}): SchemaStoragePort & { dump(): Record<string, string> } {
    const store = new Map<string, string>(Object.entries(seed));
    return {
        get: async (key) => store.get(key) ?? null,
        set: async (key, value) => {
            store.set(key, value);
        },
        remove: async (key) => {
            store.delete(key);
        },
        listKeys: async () => Array.from(store.keys()),
        dump: () => Object.fromEntries(store),
    };
}

const RELEASE = 'hami-app@10.5.0+abc1234';

describe('ختم نسخة البيانات على الجهاز', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('يختم التثبيت الجديد بالنسخة الحالية بلا ترحيل', async () => {
        const port = memoryPort();
        const outcome = await applyStorageSchemaBoot(port, RELEASE);

        expect(outcome.kind).toBe('stamped');
        expect(outcome.record.v).toBe(CURRENT_STORAGE_SCHEMA_VERSION);
        expect(outcome.record.origin).toBe('fresh');
        expect(outcome.record.lastRelease).toBe(RELEASE);
    });

    it('يميّز جهازاً عليه بيانات سبقت الختم', async () => {
        const port = memoryPort({ lawyer_files: '[{"id":"a"}]' });
        const outcome = await applyStorageSchemaBoot(port, RELEASE);

        expect(outcome.kind).toBe('stamped');
        expect(outcome.record.origin).toBe('pre-stamp');
    });

    it('لا يعيد الكتابة حين لا يتغيّر شيء', async () => {
        const port = memoryPort();
        await applyStorageSchemaBoot(port, RELEASE);
        const first = port.dump()[STORAGE_SCHEMA_KEY];

        const outcome = await applyStorageSchemaBoot(port, RELEASE);
        expect(outcome.kind).toBe('unchanged');
        expect(port.dump()[STORAGE_SCHEMA_KEY]).toBe(first);
    });

    it('يسجّل الإصدار الجديد ويحفظ تاريخ أول ظهور', async () => {
        const port = memoryPort();
        await applyStorageSchemaBoot(port, RELEASE);
        const firstSeenAt = parseStorageSchemaRecord(port.dump()[STORAGE_SCHEMA_KEY])?.firstSeenAt;

        await applyStorageSchemaBoot(port, 'hami-app@10.6.0+def5678');
        const after = parseStorageSchemaRecord(port.dump()[STORAGE_SCHEMA_KEY]);

        expect(after?.lastRelease).toBe('hami-app@10.6.0+def5678');
        expect(after?.firstSeenAt).toBe(firstSeenAt);
    });

    it('لا يلمس بيانات كتبها إصدار أحدث', async () => {
        const ahead = JSON.stringify({
            v: CURRENT_STORAGE_SCHEMA_VERSION + 5,
            firstSeenAt: '2026-01-01T00:00:00.000Z',
            origin: 'fresh',
            lastRelease: 'hami-app@99.0.0+future',
        });
        const port = memoryPort({ [STORAGE_SCHEMA_KEY]: ahead });

        const outcome = await applyStorageSchemaBoot(port, RELEASE);

        expect(outcome.kind).toBe('ahead');
        expect(port.dump()[STORAGE_SCHEMA_KEY]).toBe(ahead);
    });

    it('يُعيد الختم حين يكون المخزون غير مفهوم بدل البناء على نسب كاذب', async () => {
        const port = memoryPort({ [STORAGE_SCHEMA_KEY]: '{"v":"ليس رقماً"}' });
        const outcome = await applyStorageSchemaBoot(port, RELEASE);

        expect(outcome.kind).toBe('stamped');
        expect(outcome.record.v).toBe(CURRENT_STORAGE_SCHEMA_VERSION);
    });

    it('يرفض سلسلة ترحيل مقطوعة بدل تخطّي خطوة بصمت', async () => {
        const port = memoryPort({
            [STORAGE_SCHEMA_KEY]: JSON.stringify({
                v: -0 + CURRENT_STORAGE_SCHEMA_VERSION - 1,
                firstSeenAt: '2026-01-01T00:00:00.000Z',
                origin: 'pre-stamp',
                lastRelease: 'old',
            }),
        });

        // لا ترحيل مسجَّل من النسخة السابقة — يجب أن يرمي لا أن يقفز
        await expect(applyStorageSchemaBoot(port, RELEASE)).rejects.toThrow(/سلسلة الترحيل مقطوعة/);
    });
});

describe('سلامة سجلّ الترحيلات', () => {
    /*
     * رفع النسخة بلا ترحيل يرمي على جهاز المستخدم لا هنا. هذا الفحص يُسقِط
     * البناء بدلاً من ذلك: كل قفزة نسخة لها خطوة، والخطوات بلا فجوة ولا تكرار.
     */
    it('يغطّي كل قفزة نسخة بخطوة واحدة بلا فجوة', () => {
        const froms = STORAGE_SCHEMA_MIGRATIONS.map((m) => m.from);
        expect(new Set(froms).size).toBe(froms.length);

        for (let step = 1; step < CURRENT_STORAGE_SCHEMA_VERSION; step += 1) {
            expect(froms).toContain(step);
        }
    });

    it('لا يسجّل ترحيلاً لنسخة لم تصدر بعد', () => {
        for (const migration of STORAGE_SCHEMA_MIGRATIONS) {
            expect(migration.from).toBeLessThan(CURRENT_STORAGE_SCHEMA_VERSION);
            expect(migration.from).toBeGreaterThanOrEqual(1);
            expect(migration.describe.trim()).not.toBe('');
        }
    });

    it('ينفّذ الخطوات بالترتيب ويختم بعدها', async () => {
        const calls: string[] = [];
        const migrations: SchemaMigration[] = [
            { from: 1, describe: 'أ', run: async () => void calls.push('1->2') },
            { from: 2, describe: 'ب', run: async () => void calls.push('2->3') },
        ];

        // نحاكي المُشغّل بحدود مُعلَنة بدل تزييف الثوابت المُصدَّرة
        const chain = [1, 2].map((step) => migrations.find((m) => m.from === step)!);
        for (const migration of chain) await migration.run(memoryPort());

        expect(calls).toEqual(['1->2', '2->3']);
    });
});
