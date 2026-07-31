/**
 * مسح تخزين الإضابير بعد الحذف النهائي — دفعةً بعزل كل إضبارة.
 *
 * كانت الحلقة `await` غير محروس داخل `void (async () => …)()`: فشل أول إضبارة
 * يُجهض الدفعة كلها، فتبقى بقية الإضابير بكامل بياناتها على القرص وقد اختفت
 * من الفهرس — بيانات معطّلة فيها معلومات شخصية، لا يراها المستخدم ولا تصل
 * إليها يده، ولا يظهر خطأ لأن `void` يبتلع الرفض.
 *
 * استُخلصت هنا لتكون قابلة للاختبار: الخطّاف المضيف بلا اختبار واحد.
 */

export type PurgeDeletedExecutionDossiersDeps = {
    removeStorageBundle: (id: string) => Promise<void>;
    purgeScopedState: (id: string) => Promise<void>;
    deleteFromCloud: (id: string) => Promise<void>;
};

export type PurgeDeletedExecutionDossiersResult = {
    storageFailures: string[];
    cloudFailures: string[];
};

export async function purgeDeletedExecutionDossiers(
    ids: Iterable<string>,
    deps: PurgeDeletedExecutionDossiersDeps,
): Promise<PurgeDeletedExecutionDossiersResult> {
    const storageFailures: string[] = [];
    const cloudFailures: string[] = [];

    for (const rawId of ids) {
        const id = String(rawId ?? '').trim();
        if (!id) continue;

        try {
            await deps.removeStorageBundle(id);
            await deps.purgeScopedState(id);
        } catch {
            storageFailures.push(id);
        }

        // حذف السحابة مستقل: فشل المسح المحلي لا يجوز أن يُبقي النسخة البعيدة
        try {
            await deps.deleteFromCloud(id);
        } catch {
            cloudFailures.push(id);
        }
    }

    return { storageFailures, cloudFailures };
}
