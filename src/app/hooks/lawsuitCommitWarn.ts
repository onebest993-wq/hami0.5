import { awaitLawsuitWorkspaceCommit, scheduleLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { finalizeLawsuitDurabilityAfterCommit } from '@/app/domain/lawsuit/lawsuitDurabilityOverlay';
import { SmartToast } from '@/app/components/ui/SmartToast';

/** منع تكرار نفس التنبيه الأحمر عند حفظين متزامنين (تعديل سريع مزدوج). */
const recentPersistToastAt = new Map<string, number>();
const PERSIST_TOAST_DEDUP_MS = 4_000;

function shouldEmitPersistToast(actionLabel: string, fileIds?: readonly (string | number)[]): boolean {
    const key = `${actionLabel}:${(fileIds ?? []).map(String).sort().join(',')}`;
    const now = Date.now();
    const prev = recentPersistToastAt.get(key) ?? 0;
    if (now - prev < PERSIST_TOAST_DEDUP_MS) return false;
    recentPersistToastAt.set(key, now);
    if (recentPersistToastAt.size > 40) {
        for (const [k, ts] of recentPersistToastAt) {
            if (now - ts > PERSIST_TOAST_DEDUP_MS) recentPersistToastAt.delete(k);
        }
    }
    return true;
}

/**
 * انتظار تثبيت القرص بعد طفرة دعوى — تنبيه موحّد عند الفشل الحقيقي فقط.
 * عند تأخر القرص مع وجود البيانات في الذاكرة: إعادة محاولة خلفية بلا إنذار وردي مزعج.
 * للحذف/النقل العمدي: لا نُخفي فشل التثبيت — وإلا تعود الإضبارة بعد إعادة التحميل.
 */
export async function commitLawsuitPersistOrWarn(
    actionLabel: string,
    fileIds?: readonly (string | number)[],
    options?: {
        timeoutMs?: number;
        requireActiveFileId?: string | number;
        /** عمليات تقلّص النشط — timeout يُعامل كفشل ظاهر */
        destructive?: boolean;
    },
): Promise<boolean> {
    const requireId = options?.requireActiveFileId;
    const primaryTimeout = options?.timeoutMs ?? 12_000;
    const destructive = Boolean(options?.destructive);

    let commit = await awaitLawsuitWorkspaceCommit({
        timeoutMs: primaryTimeout,
        requireActiveFileId: requireId,
    });

    if (!commit.ok && commit.reason === 'timeout') {
        commit = await awaitLawsuitWorkspaceCommit({
            timeoutMs: destructive ? 10_000 : 6_000,
            requireActiveFileId: requireId,
        });
    }

    if (!commit.ok) {
        /*
         * التعديل العادي غالباً يثبت في الذاكرة فوراً والقرص يلحق لاحقاً (IndexedDB/تشفير).
         * verify-failed/write-failed هنا كانا يطلقان تنبيهاً أحمر مضلّلاً رغم بقاء البيانات على الشاشة.
         */
        if (!destructive) {
            scheduleLawsuitWorkspaceCommit({
                timeoutMs: 20_000,
                requireActiveFileId: requireId,
                debounceMs: 250,
            });
            if (typeof console !== 'undefined' && typeof console.info === 'function') {
                console.info(
                    `[lawsuit-persist] soft-fail after ${actionLabel} (${commit.reason ?? 'unknown'}); background flush scheduled`,
                );
            }
            return true;
        }
        if (commit.reason === 'timeout') {
            scheduleLawsuitWorkspaceCommit({
                timeoutMs: 20_000,
                requireActiveFileId: requireId,
                debounceMs: 100,
            });
        }
        if (shouldEmitPersistToast(actionLabel, fileIds)) {
            SmartToast.error(`تعذّر تثبيت ${actionLabel} على القرص — أبْقِ الصفحة مفتوحة`);
        }
        return false;
    }

    await finalizeLawsuitDurabilityAfterCommit(commit, fileIds);
    return true;
}
