import {
    isProtectedStorageKey,
    isTransactionsThreadingStateKey,
    PROTECTED_ARRAY_STORAGE_KEYS,
    PROTECTED_OBJECT_STORAGE_KEYS,
} from './protectedStorageKeys';
import { isCriminalCaseShardRootKey } from '@/app/infrastructure/persistence/storageDomains';
import { areAllStoredNotesTombstoned } from '@/app/services/notes/globalNotesTombstones';
import { areAllStoredVaultDocsTombstoned } from '@/app/services/vault/vaultDocsTombstonesLite';
import { areAllStoredRepositoryDocsTombstoned } from '@/app/services/forum/repositoryDocsTombstonesLite';

const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

/** يعدّ عناصر مصفوفة JSON */
export function countDossierArray(raw: string | null | undefined): number {
    if (!raw?.trim()) return 0;
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
        return 0;
    }
}

function countCasesInCriminalStore(raw: string | null | undefined): number {
    if (!raw?.trim()) return 0;
    try {
        const root = JSON.parse(raw) as {
            state?: { casesById?: Record<string, unknown> };
            casesById?: Record<string, unknown>;
        };
        const cases = root.state?.casesById ?? root.casesById;
        return cases && typeof cases === 'object' ? Object.keys(cases).length : 0;
    } catch {
        return 0;
    }
}

/**
 * عدد عناصر البيانات المحمية، أو `null` حين يتعذّر فهم المحتوى.
 *
 * التمييز بين «صفر عنصر» و«لا أستطيع القراءة» هو الفرق بين حفظ الإضبارة
 * وإتلافها. كانت الحالتان تعودان `0`، فحمولة تالفة — أو نصّ مشفَّر لم يُفكّ —
 * تُقرأ على أنها فراغ، فيأذن الحارس بالكتابة فوقها. وهي بالضبط اللحظة التي
 * وُجد الحارس من أجلها: قراءة فاشلة تُظهر شاشة خالية، فتكتب أول حفظة تلقائية
 * `[]` فوق آخر نسخة كانت قابلة للإنقاذ.
 */
export function readProtectedItemCount(
    storageKey: string,
    raw: string | null | undefined,
): number | null {
    if (!raw?.trim()) return 0;
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed === null) return 0;
    if (typeof parsed === 'object') {
        if (storageKey === 'hami:criminal:store') {
            return countCasesInCriminalStore(raw);
        }
        if (storageKey === QUANTUM_TASKS_STORAGE_KEY) {
            const tasks = (parsed as { tasks?: unknown }).tasks;
            return Array.isArray(tasks) ? tasks.length : 0;
        }
        /*
         * حالة خيوط المعاملات كائن ثابت الحقول: `Object.keys` يعطي ٦ دائماً حتى
         * والمصفوفات خالية، فيرى الحارس «محتوى» في حمولة فرّغت كل شيء. العدّ هنا
         * على السجلات لا على أسماء الحقول.
         */
        if (isTransactionsThreadingStateKey(storageKey)) {
            const state = parsed as {
                transactions?: unknown;
                tasks?: unknown;
                documents?: unknown;
            };
            const len = (value: unknown) => (Array.isArray(value) ? value.length : 0);
            return len(state.transactions) + len(state.tasks) + len(state.documents);
        }
        return Object.keys(parsed as object).length;
    }
    // رقم أو نصّ أو منطقي: ليس شكلاً يكتبه أي مفتاح محمي
    return null;
}

/** يعدّ عناصر البيانات المحمية (مصفوفات أو كائنات) — غير المقروء يُعدّ صفراً */
export function countProtectedItems(storageKey: string, raw: string | null | undefined): number {
    return readProtectedItemCount(storageKey, raw) ?? 0;
}

/**
 * قيمة مخزَّنة لمفتاح محمي لا تُفهَم: تالفة، أو مشفَّرة عجز الفكّ عنها.
 *
 * الحارس يحميها من الكتابة فوقها، لكن الحماية وحدها صمت: المحامي يرى شاشة
 * خالية ولا يعلم أن بياناته ما تزال على الجهاز. هذا هو الشرط الذي يستحقّ بلاغاً.
 */
export function isUnreadableProtectedValue(storageKey: string, raw: string | null | undefined): boolean {
    if (!raw?.trim()) return false;
    if (!isProtectedStorageKey(storageKey)) return false;
    return readProtectedItemCount(storageKey, raw) === null;
}

/** الحمولة الواردة تُفرِّغ المفتاح: لا عناصر فيها بعد الكتابة */
export function isEmptyingPayload(storageKey: string, incomingRaw: string): boolean {
    const trimmed = incomingRaw.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === '{}' || trimmed === '[]') return true;
    return readProtectedItemCount(storageKey, incomingRaw) === 0;
}

/** يمنع استبدال بيانات محمية غير فارغة بقائمة/كائن فارغ أو حمولة تالفة */
export function shouldRejectDossierWipe(
    storageKey: string,
    incomingRaw: string,
    existingRaw: string | null | undefined,
): boolean {
    if (!existingRaw?.trim()) return false;

    const trimmed = incomingRaw.trim();
    if (trimmed === '' || trimmed === 'null') return true;

    if (!isProtectedStorageKey(storageKey)) {
        if (trimmed === '{}') return true;
        return false;
    }

    const existingCount = readProtectedItemCount(storageKey, existingRaw);

    /*
     * الموجود لا يُقرأ — تالف، أو مشفَّر لم يُفكّ. لا سبيل للجزم أنه كان فارغاً،
     * والكتابة المُفرِّغة فوقه تحسم الأمر بلا رجعة. نرفض ونُبقي البايتات كما هي:
     * حمولة تالفة قد تُنقَذ، والمكتوب فوقها لا يُنقَذ.
     *
     * للدعاوى: نرفض أيضاً الكتابة غير الفارغة فوق مشفّر/تالف — كانت تمسح N إضبارة
     * بقائمة إنشاء جزئية قبل فكّ التشفير.
     */
    if (existingCount === null) {
        if (storageKey.includes('lawyer_files')) return true;
        return isEmptyingPayload(storageKey, incomingRaw);
    }

    if (trimmed === '{}' && existingCount > 0) return true;

    const isArrayKey =
        PROTECTED_ARRAY_STORAGE_KEYS.has(storageKey) ||
        storageKey.includes('lawyer_files') ||
        storageKey.startsWith('executionFiles:');
    /*
     * جذر شظيّة القضية الجنائية كائن حقول القضية. إدراجه هنا هو ما يُفعّل فحص
     * العدّ أدناه؛ بدونه لا يُرفض إلا `{}` الحرفي، وقضية فُرِّغت إلى كائن بلا
     * حقول تمرّ وتُكتب فوق الأصل.
     */
    /*
     * خيوط المعاملات عمداً خارج فحص العدّ: «احذف كل المعاملات» طريق مشروع يكتب
     * حالة بمصفوفات خالية، ولا يوجد نظام tombstone هنا يميّزه عن التفريغ العرضي.
     * الحماية المطلوبة تأتي من فرع `existingCount === null` أعلاه — رفض التفريغ
     * فوق ciphertext بارد أو حمولة تالفة، وهو مسار فقدان البيانات الفعلي.
     */
    const isObjectKey = PROTECTED_OBJECT_STORAGE_KEYS.has(storageKey) || isCriminalCaseShardRootKey(storageKey);

    if (isArrayKey || isObjectKey) {
        const incomingCount = countProtectedItems(storageKey, incomingRaw);
        if (incomingCount === 0 && existingCount > 0) {
            // حذف كل الملاحظات عمداً + tombstones — لا ترفض [] وإلا تُبعثَر المحذوفات عند reload
            if (storageKey === 'lawyer_notes' && areAllStoredNotesTombstoned(existingRaw)) {
                return false;
            }
            if (storageKey === 'hami:smartvault:docs:v1' && areAllStoredVaultDocsTombstoned(existingRaw)) {
                return false;
            }
            if (
                storageKey === 'hami:repository:docs:v1' &&
                areAllStoredRepositoryDocsTombstoned(existingRaw)
            ) {
                return false;
            }
            return true;
        }
        /*
         * دعاوى: قائمة أقصر غير فارغة فوق قائمة أغنى = مسح صامت عند إنشاء/hydrate.
         * الأرشفة/السلة تمرّ عبر allowShrink في setItemSync/setItem.
         */
        if (
            storageKey.includes('lawyer_files') &&
            existingCount > 0 &&
            incomingCount > 0 &&
            incomingCount < existingCount
        ) {
            return true;
        }
    }

    return false;
}
