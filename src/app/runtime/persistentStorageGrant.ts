/**
 * تخزين دائم — الحاجز الوحيد بين إضابير المحامي وإخلاءٍ صامت.
 *
 * كل ما يملكه التطبيق محلياً يعيش في IndexedDB: `hami-crypto-keystore` و
 * `hami-secure-store` و`hami-vault-blobs` و`hami-dossier-backups` وملفات الدعاوى
 * والتنفيذ والملاحظات الصوتية. وأصلٌ لم يطلب الدوام يبقى في فئة «أفضل جهد»، وهي
 * الفئة التي يُخليها Chromium أولاً حين يضيق تخزين الجهاز — بلا إذن ولا إشعار.
 *
 * والخسارة هنا ليست كاشاً يُعاد بناؤه. `hami-crypto-keystore` يحمل **المفتاح
 * الوحيد** الذي يفكّ الأرشيف السحابي المشفَّر؛ فإخلاؤه يعني أن ما في السحابة
 * يصير غير قابل للقراءة إلى الأبد، ودخولٌ جديد يولّد مفتاحاً آخر لا يفتح القديم.
 * وهي الكارثة نفسها التي أُغلق مسارها في تسجيل الخروج (commit 279fa88c) — وكان
 * بابها الثاني، الإخلاء، ما يزال مفتوحاً.
 *
 * الخطورة أعلى على الهاتف: ذاكرة أصغر، وضغط تخزين أكثر، ودورات تنظيف أعنف.
 *
 * الطلب رخيص ولا يُرفض بضرر: الرفض يترك الحال كما هو تماماً، والقبول يمنع
 * الإخلاء. لذلك يُطلب دائماً، ويُسجَّل الرفض كي لا يمرّ صامتاً.
 */

/* غير مُصدَّرين: لا مستهلك خارجهما، وقاعدة حارس التصديرات الميتة صريحة — صِل
   بمستهلك أو لا تُصدّر. والاستدلال البنيوي يكفي المستدعي بلا تسمية. */
type PersistentStorageOutcome =
    | 'already-persistent'
    | 'granted'
    | 'denied'
    | 'unsupported'
    | 'error';

type PersistentStorageReport = {
    outcome: PersistentStorageOutcome;
    /** بالبايت — للتشخيص حين يُرفض الدوام */
    usageBytes?: number;
    quotaBytes?: number;
};

declare global {
    interface Window {
        /** يُقرأ من تنقيح WebView عن بعد لمعرفة حال الأصل على جهاز حقيقي */
        __hamiStoragePersistence__?: PersistentStorageReport;
    }
}

let inFlight: Promise<PersistentStorageReport> | null = null;

function storageManager(): StorageManager | null {
    if (typeof navigator === 'undefined') return null;
    const manager = navigator.storage;
    if (!manager || typeof manager.persist !== 'function') return null;
    return manager;
}

async function readEstimate(manager: StorageManager): Promise<Partial<PersistentStorageReport>> {
    if (typeof manager.estimate !== 'function') return {};
    try {
        const { usage, quota } = await manager.estimate();
        return { usageBytes: usage, quotaBytes: quota };
    } catch {
        return {};
    }
}

function publish(report: PersistentStorageReport): PersistentStorageReport {
    if (typeof window !== 'undefined') {
        window.__hamiStoragePersistence__ = report;
    }
    return report;
}

/**
 * يُطلب مرة واحدة لكل جلسة صفحة. لا يرمي أبداً — مسار إقلاع.
 *
 * `persist()` في WebView لا يعرض حواراً للمستخدم؛ يمنحه المحرّك أو يرفضه بمعاييره.
 * فالنتيجة تُسجَّل ولا يُعاد الطلب: إعادته لا تغيّر الحكم وتستهلك دورة.
 */
export function ensurePersistentStorage(): Promise<PersistentStorageReport> {
    if (inFlight) return inFlight;

    inFlight = (async (): Promise<PersistentStorageReport> => {
        const manager = storageManager();
        if (!manager) return publish({ outcome: 'unsupported' });

        try {
            /* أصل مُنح الدوام سابقاً — لا يُعاد الطلب */
            if (typeof manager.persisted === 'function' && (await manager.persisted())) {
                return publish({ outcome: 'already-persistent' });
            }

            const granted = await manager.persist();
            if (granted) return publish({ outcome: 'granted' });

            /*
             * رُفض. البيانات قابلة للإخلاء تحت ضغط التخزين — وفيها المفتاح.
             * تُقاس الحصّة هنا لأن الرفض وحده لا يقول كم بقي من هامش.
             */
            const estimate = await readEstimate(manager);
            const report = publish({ outcome: 'denied', ...estimate });
            const used = report.usageBytes;
            const quota = report.quotaBytes;
            console.warn(
                '[hami:storage] التخزين الدائم مرفوض — قواعد IndexedDB قابلة للإخلاء تحت ضغط التخزين، ومنها مفتاح فكّ الأرشيف.' +
                    (typeof used === 'number' && typeof quota === 'number'
                        ? ` (المستعمَل ${Math.round(used / 1048576)}MB من ${Math.round(quota / 1048576)}MB)`
                        : ''),
            );
            return report;
        } catch {
            return publish({ outcome: 'error' });
        }
    })();

    return inFlight;
}

/** للاختبارات — يُعيد ضبط الطلب الوحيد */
export function resetPersistentStorageGrantForTests(): void {
    inFlight = null;
    if (typeof window !== 'undefined') {
        delete window.__hamiStoragePersistence__;
    }
}
