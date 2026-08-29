import SecureStoreService from '@/app/services/SecureStoreService';

function isEmptyJsonCollection(raw: string): boolean {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '[]' || trimmed === '{}') return true;
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.length === 0;
        if (parsed && typeof parsed === 'object') return Object.keys(parsed as object).length === 0;
    } catch {
        return false;
    }
    return false;
}

/** يمحو مرآة localStorage على نفس مفتاح SecureStore — لا تُكتب بعد اليوم. */
export function clearLegacyPlaintextMirror(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}

/**
 * كتابة متزامنة في SecureStore ثم محو مرآة localStorage على نفس المفتاح.
 * حارس المسح قد يرفض التفريغ — عندها يبقى الأصل في الكاش.
 */
export function writeSecureAndClearLegacySync(key: string, payload: string): void {
    try {
        SecureStoreService.setItemSync(key, payload);
    } catch {
        /* الحارس قد يرفض — الأصل يبقى */
    }
    clearLegacyPlaintextMirror(key);
}

/**
 * كتابة القرص بعد أن يفتح IndexedDB هذا المفتاح — بلا مهلة تُحسب نجاحاً
 * وبلا انتظار تسخين كل المفاتيح المحمية (`ensurePersistedReady`).
 * `getItem`/`setItem` ينتظران البنية التحتية فقط.
 * `skipIfUnchanged: false` بعد `setItemSync` — وإلا تُتخطى كتابة IndexedDB.
 */
export async function persistSecurePayloadWhenReady(
    key: string,
    payload: string,
    options?: { skipIfUnchanged?: boolean },
): Promise<void> {
    if (options?.skipIfUnchanged !== false) {
        const existing = await SecureStoreService.getItem(key);
        if (existing === payload) {
            clearLegacyPlaintextMirror(key);
            return;
        }
    }
    await SecureStoreService.setItem(key, payload);
    clearLegacyPlaintextMirror(key);
}

/**
 * قراءة بعد فشل المرآة المتزامنة. `getItem` يفتح البنية ويفكّ هذا المفتاح فقط.
 */
export async function readSecurePayloadWhenReady(key: string): Promise<string | null> {
    const drained = readSecureOrDrainLegacySync(key);
    if (drained != null) return drained;
    const raw = await SecureStoreService.getItem(key);
    if (raw != null) clearLegacyPlaintextMirror(key);
    return raw;
}

/**
 * قراءة أول طلاء: كاش SecureStore ثم leftover في localStorage.
 * لا ترحيل ولا setItemSync — التشفير على مسار الجرس/الشبكة يجمّد الإطار الأول.
 * أصل unread لا يُسمَّم leftover.
 */
export function peekSecureOrLegacySync(key: string): string | null {
    try {
        const fromSecure = SecureStoreService.getItemSync(key);
        if (fromSecure != null) return fromSecure;
    } catch {
        /* fall through */
    }
    try {
        if (SecureStoreService.isUnreadSync(key)) return null;
    } catch {
        /* fall through to leftover peek */
    }
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * قراءة متزامنة: الكاش المشفّر أولاً، ثم ترحيل مرآة صريحة قديمة ومَحوها.
 *
 * إن وُجد الأصل في SecureStore تُمحى المرآة أيضاً — بذرة E2E أو نسخة قديمة
 * لا تُترك نصاً صريحاً بعد أن صار المخزن المعياري مشفَّراً.
 *
 * مصفوفة/كائن فارغ في المرآة لا يُرحَّل — كان ذلك مسار تظليل حارس المسح.
 *
 * أصل مشفَّر لم يُفكّ بعد: لا تُرحَّل المرآة فوقه. بعد التسخين تُمحى المرآة
 * لأن getItemSync يصيب الكاش.
 *
 * لا تُستدعَ على مسار أول طلاء (جرس/شارة/ملف شخصي للكاش الدافئ) — استخدم
 * `peekSecureOrLegacySync`. الترحيل للتحميل غير المتزامن بعد التفاعل.
 */
export function readSecureOrDrainLegacySync(key: string): string | null {
    try {
        const fromSecure = SecureStoreService.getItemSync(key);
        if (fromSecure != null) {
            clearLegacyPlaintextMirror(key);
            return fromSecure;
        }
    } catch {
        /* fall through */
    }
    try {
        if (SecureStoreService.isUnreadSync(key)) return null;
    } catch {
        /* fall through to leftover drain */
    }
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        localStorage.removeItem(key);
        if (isEmptyJsonCollection(raw)) return null;
        try {
            SecureStoreService.setItemSync(key, raw);
        } catch {
            /* القيمة المُعادة تكفي هذه القراءة */
        }
        return raw;
    } catch {
        return null;
    }
}
