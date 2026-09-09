/**
 * طابور الكتابات المؤجَّلة بانتظار مفتاح التشفير.
 *
 * حين يفشل التشفير لأن المفتاح لم يصل بعد، لا تُرمى كتابة المستخدم: تُحفظ هنا
 * وتُعاد المحاولة. وهو آخر ما يقف بين تعديلٍ كتبه المحامي وبين ضياعه.
 *
 * ## لماذا وحدة مستقلّة
 *
 * كانت داخل `SecureStoreService`، وتقرأ `import.meta.env.VITEST` بنفسها لتمتنع عن
 * جدولة مؤقتات في الاختبار — فصارت **لا تُختبَر بحال**: كل مساراتها وراء ذلك الشرط.
 * وهذا وحده سببٌ كافٍ للاستخراج؛ آليةٌ تحرس بيانات المستخدم ولا يمكن تشغيلها في
 * اختبار هي آليةٌ تُصدَّق ولا تُفحص.
 *
 * فالجدولة الآن يوفّرها المضيف: الإنتاج يمرّرها `setTimeout` (ممتنعاً تحت
 * الاختبار كما كان)، والاختبار يمرّر مشغّلاً يدوياً فيقودها خطوةً خطوة بلا
 * مؤقتات مُسرَّبة.
 *
 * **هذا الاستخراج لا يغيّر سلوكاً** — المنطق منقول كما هو، بما فيه ما اكتُشف فيه.
 * الإصلاح يليه في commit مستقلّ كي يبقى الأثر قابلاً للتنصيف.
 */
import { CryptoService } from '@/app/services/CryptoService';
import { StorageEncryptionError } from '@/app/services/storage/storageEncryptionError';

/** ما تحتاجه هذه الآلية من `SecureStoreService` — مُمرَّراً لا مستورَداً، فلا دورة استيراد */
export interface CryptoDeferredHost {
    /** يكتب فعلاً — `SecureStoreService.setItem` */
    persist(key: string, value: string): Promise<void>;
    /** المفتاح داخل معاملة ذرّية جارية، فالكتابة المؤجَّلة قديمة وتُسقَط */
    shouldDropStaleWrite(key: string): boolean;
    /** بوّابة الكتابة الذرّية ممسوكة — لا تُهيّئ التشفير الآن */
    atomicGateHeld(): boolean;
    /** يُرجع true إن جُدولت فعلاً؛ الاختبار يقود بنفسه فيُرجع false */
    schedule(run: () => void, delayMs: number): boolean;
    reportError(message: string, error: unknown): void;
    /** نفدت المحاولات وهذه الحمولة لم تُكتب — أبلغ ولا تبتلع */
    reportGivingUp(key: string, reason: string): void;
}

/** انتظار وصول المفتاح: ٢٤ × ١٫٢ث ≈ ٢٩ ثانية */
const MAX_KEY_WAIT_ATTEMPTS = 24;
/** فشل الكتابة نفسها والمفتاح حاضر — أقصر، فالسبب لا يُرجى زواله بمجرّد الانتظار */
const MAX_WRITE_FAILURE_ATTEMPTS = 8;
const RETRY_DELAY_MS = 1_200;
const FIRST_FLUSH_DELAY_MS = 400;

const deferredWrites = new Map<string, string>();
let flushScheduled = false;
let keyWaitAttempts = 0;
let writeFailureAttempts = 0;
let host: CryptoDeferredHost | null = null;

export function configureCryptoDeferred(next: CryptoDeferredHost): void {
    host = next;
}

function scheduleFlush(delayMs: number): void {
    if (flushScheduled || !host) return;
    const started = host.schedule(() => {
        flushScheduled = false;
        void flushCryptoDeferredWrites();
    }, delayMs);
    if (started) flushScheduled = true;
}

export function queueCryptoDeferredWrite(key: string, value: string): void {
    deferredWrites.set(key, value);
    scheduleFlush(FIRST_FLUSH_DELAY_MS);
}

/** يُسقط كتابةً مؤجَّلة بطلت — حذفٌ للمفتاح أو معاملة ذرّية أحدث */
export function dropCryptoDeferredWrite(key: string): void {
    deferredWrites.delete(key);
}

/** وصل wrap الجلسة: ابدأ الميزانيتين من جديد فتُعاد محاولةُ ما استُسلم عنه */
export function resetCryptoDeferredAttempts(): void {
    keyWaitAttempts = 0;
    writeFailureAttempts = 0;
}

export async function flushCryptoDeferredWrites(): Promise<void> {
    if (deferredWrites.size === 0 || !host) return;
    const active = host;

    try {
        if (!CryptoService.hasMasterKey() && !active.atomicGateHeld()) {
            await CryptoService.initialize();
        }
    } catch {
        /* wrap قد يصل مع الجلسة */
    }

    if (!CryptoService.hasMasterKey()) {
        if (keyWaitAttempts < MAX_KEY_WAIT_ATTEMPTS) {
            keyWaitAttempts += 1;
            scheduleFlush(RETRY_DELAY_MS);
            return;
        }
        giveUp(active, 'master key never arrived');
        return;
    }

    /* وصل المفتاح فانتهى انتظاره — ولا شأن لذلك بميزانية فشل الكتابة */
    keyWaitAttempts = 0;
    const batch = [...deferredWrites.entries()];
    deferredWrites.clear();
    for (const [key, value] of batch) {
        if (active.shouldDropStaleWrite(key)) continue;
        try {
            await active.persist(key, value);
        } catch (error) {
            if (error instanceof StorageEncryptionError) {
                deferredWrites.set(key, value);
                continue;
            }
            active.reportError(`Deferred persist failed for "${key}":`, error);
        }
    }

    if (deferredWrites.size === 0) {
        writeFailureAttempts = 0;
        return;
    }
    if (writeFailureAttempts < MAX_WRITE_FAILURE_ATTEMPTS) {
        writeFailureAttempts += 1;
        scheduleFlush(RETRY_DELAY_MS);
        return;
    }
    giveUp(active, 'encryption kept failing while the key was present');
}

/**
 * نفدت الميزانية. يُبلَّغ صاحب الشأن — **ولا تُمسح الحمولة**.
 *
 * فالإبقاء عليها هو ما يجعل `rewarmSensitiveAfterWrapChange` قادراً على إنقاذها
 * حين يصل wrap الجلسة متأخراً. ومسحُها هنا كان سيحوّل تأخّراً إلى فقدان — وهو
 * الخطأ نفسه المُصلَح في `CryptoService` (FINDING-015): لا تُتلف ما عجزتَ عن
 * كتابته الآن، فقد تكتبه بعد قليل.
 */
function giveUp(active: CryptoDeferredHost, reason: string): void {
    for (const key of deferredWrites.keys()) active.reportGivingUp(key, reason);
}

/** للاختبار وحده: يعيد الوحدة إلى حالتها الأولى بين الحالات */
export function resetCryptoDeferredForTests(): void {
    deferredWrites.clear();
    flushScheduled = false;
    keyWaitAttempts = 0;
    writeFailureAttempts = 0;
}
