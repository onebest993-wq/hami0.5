import {
    applyStorageSchemaBoot,
    type SchemaBootOutcome,
    type SchemaStoragePort,
} from './storageSchemaMigrations';

/**
 * يُشغَّل مرّة واحدة لكل جلسة، من داخل `ensurePersistedReady` — أي قبل أي قراءة
 * نطاقية، لأن كل قارئ في التطبيق ينتظرها أصلاً. لا حاجة لبوّابة ثانية.
 */
let bootPromise: Promise<SchemaBootOutcome | null> | null = null;

async function reportOutcome(outcome: SchemaBootOutcome, appRelease: string): Promise<void> {
    if (outcome.kind === 'unchanged') return;

    /*
     * الاستيراد ديناميّ: هذه السلسلة تُقلع مع المخزن، وربط عميل الرصد بها
     * ثابتاً يجرّه إلى المسار الحرج لأجل بلاغ يقع مرّة في عمر التثبيت.
     */
    const { sentryCaptureMessage } = await import('@/app/observability/sentryClient');

    if (outcome.kind === 'ahead') {
        await sentryCaptureMessage('storage-schema: data written by a newer build', {
            storedVersion: outcome.record.v,
            runningRelease: appRelease,
            wroteBy: outcome.record.lastRelease,
        });
        return;
    }

    if (outcome.kind === 'migrated') {
        await sentryCaptureMessage('storage-schema: migrated', {
            toVersion: outcome.record.v,
            steps: outcome.applied,
            origin: outcome.record.origin,
        });
    }
}

export async function runStorageSchemaBootOnce(
    port: SchemaStoragePort,
    appRelease: string,
): Promise<SchemaBootOutcome | null> {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
        try {
            const outcome = await applyStorageSchemaBoot(port, appRelease);
            void reportOutcome(outcome, appRelease).catch(() => undefined);
            return outcome;
        } catch {
            /*
             * فشل الختم لا يجوز أن يمنع فتح التطبيق: البيانات تُقرأ بلا ختم كما
             * كانت تُقرأ قبل وجوده. نُعيد `null` ونترك المحاولة للإقلاع التالي.
             */
            return null;
        }
    })();
    return bootPromise;
}

export function __resetStorageSchemaBootForTests(): void {
    bootPromise = null;
}
