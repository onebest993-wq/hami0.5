import {
    CURRENT_STORAGE_SCHEMA_VERSION,
    parseStorageSchemaRecord,
    serializeStorageSchemaRecord,
    STORAGE_SCHEMA_KEY,
    type StorageSchemaRecord,
} from './storageSchemaVersion';

/**
 * منفذ تخزين ضيّق عمداً.
 *
 * المُشغّل يعمل **داخل** `ensurePersistedReady`، فأي ترحيل يستدعيها يقف على
 * وعدٍ ينتظر نفسه. تمرير `get/set/remove/listKeys` وحدها يجعل هذا القفل
 * مستحيلاً بالبناء لا بالتذكير في تعليق.
 */
export interface SchemaStoragePort {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    listKeys(): Promise<string[]>;
}

export interface SchemaMigration {
    /** يُرحّل من `from` إلى `from + 1` */
    from: number;
    /** وصف قصير يظهر في السجل والبلاغ */
    describe: string;
    run(port: SchemaStoragePort): Promise<void>;
}

/**
 * لا ترحيلات بعد — وهذا هو الصدق: شكل البيانات لم يتغيّر منذ بدء الترقيم.
 *
 * أول تغيير في شكل مُخزَّن يضيف مُدخلاً هنا ويرفع
 * `CURRENT_STORAGE_SCHEMA_VERSION` بواحد. الترتيب تصاعديّ ولا فجوات.
 */
export const STORAGE_SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [];

export type SchemaBootOutcome =
    | { kind: 'stamped'; record: StorageSchemaRecord }
    | { kind: 'unchanged'; record: StorageSchemaRecord }
    | { kind: 'migrated'; record: StorageSchemaRecord; applied: number }
    | { kind: 'ahead'; record: StorageSchemaRecord };

/** مفاتيح تكفي للحكم بأن الجهاز ليس تثبيتاً جديداً */
const DATA_PRESENCE_PREFIXES = [
    'lawyer_',
    'execution',
    'lawsuit',
    'hami:criminal:',
    'hami:calendar:',
    'hami:smartvault:',
    'hami:community:',
    'hami_quantum_legal_tasks',
];

async function deviceHasExistingData(port: SchemaStoragePort): Promise<boolean> {
    const keys = await port.listKeys();
    return keys.some(
        (key) => key !== STORAGE_SCHEMA_KEY && DATA_PRESENCE_PREFIXES.some((p) => key.startsWith(p)),
    );
}

function orderedMigrationsFrom(version: number): SchemaMigration[] {
    const chain: SchemaMigration[] = [];
    for (let step = version; step < CURRENT_STORAGE_SCHEMA_VERSION; step += 1) {
        const migration = STORAGE_SCHEMA_MIGRATIONS.find((m) => m.from === step);
        if (!migration) {
            throw new Error(
                `[storage-schema] لا ترحيل من ${step} إلى ${step + 1} — سلسلة الترحيل مقطوعة`,
            );
        }
        chain.push(migration);
    }
    return chain;
}

/**
 * يقرأ الختم، ويُطبّق ما يلزم، ويُعيد الكتابة.
 *
 * البيانات القادمة من إصدار **أحدث** لا تُلمس ولا تُنزَّل: الكود الحالي لا يعرف
 * شكلها، وكتابة أي شيء فوقها قد تُسقِط حقولاً لا يفهمها. نُبلِغ ونمضي بالقراءة
 * كما هي — والتحمّل أسلم من الإصلاح المُتوهَّم.
 */
export async function applyStorageSchemaBoot(
    port: SchemaStoragePort,
    appRelease: string,
): Promise<SchemaBootOutcome> {
    const stored = parseStorageSchemaRecord(await port.get(STORAGE_SCHEMA_KEY));
    const now = new Date().toISOString();

    if (!stored) {
        const origin = (await deviceHasExistingData(port)) ? 'pre-stamp' : 'fresh';
        const record: StorageSchemaRecord = {
            v: CURRENT_STORAGE_SCHEMA_VERSION,
            firstSeenAt: now,
            origin,
            lastRelease: appRelease,
        };
        await port.set(STORAGE_SCHEMA_KEY, serializeStorageSchemaRecord(record));
        return { kind: 'stamped', record };
    }

    if (stored.v > CURRENT_STORAGE_SCHEMA_VERSION) {
        return { kind: 'ahead', record: stored };
    }

    if (stored.v === CURRENT_STORAGE_SCHEMA_VERSION) {
        if (stored.lastRelease === appRelease) return { kind: 'unchanged', record: stored };
        const record: StorageSchemaRecord = { ...stored, lastRelease: appRelease };
        await port.set(STORAGE_SCHEMA_KEY, serializeStorageSchemaRecord(record));
        return { kind: 'unchanged', record };
    }

    const chain = orderedMigrationsFrom(stored.v);
    for (const migration of chain) {
        await migration.run(port);
    }
    const record: StorageSchemaRecord = {
        ...stored,
        v: CURRENT_STORAGE_SCHEMA_VERSION,
        lastRelease: appRelease,
        lastMigratedAt: now,
    };
    await port.set(STORAGE_SCHEMA_KEY, serializeStorageSchemaRecord(record));
    return { kind: 'migrated', record, applied: chain.length };
}
