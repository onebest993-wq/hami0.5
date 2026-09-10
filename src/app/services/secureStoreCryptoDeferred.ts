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
    /**
     * يُرجع ما يُلغي الجولة إن جُدولت فعلاً، و`null` إن لم تُجدوَل (الاختبار يقود بنفسه).
     * والإلغاء لازم لأن الجولة الأطول يجب أن تُزيح الأقصر — انظر `scheduleFlush`.
     */
    schedule(run: () => void, delayMs: number): (() => void) | null;
    reportError(message: string, error: unknown): void;
    /** نفدت المحاولات وهذه الحمولة لم تُكتب — أبلغ ولا تبتلع */
    reportGivingUp(key: string, reason: string): void;
}

/** انتظار وصول المفتاح: حالٌ عامّة (لا مفتاح أصلاً) فميزانيتها عامّة */
const MAX_KEY_WAIT_ATTEMPTS = 24;
/** فشل الكتابة نفسها والمفتاح حاضر — أقصر، فالسبب لا يُرجى زواله بمجرّد الانتظار */
const MAX_WRITE_FAILURE_ATTEMPTS = 8;
/**
 * الفاصل بين الجولات — **وقد صار هو الفاصل الفعليّ فعلاً.**
 *
 * كان ليس كذلك لمفاتيح ليست `encrypt-or-fail`. قِيس على مسار `setItem` الحقيقي:
 *
 *     قبل:  lawyer_notes  →  [400 × 13]  ·  صفر بلاغ استسلام
 *     بعد:  الوتيرة ١٢٠٠  ·  الاستسلام عند المحاولة الثامنة
 *
 * لأن `setItem` تُعيد إدراج ما ليس `encrypt-or-fail` بنفسها من داخل `catch` الخاص بها
 * ثم تعود بنجاح، فكانت تطلب ٤٠٠ قبل أن يطلب هذا الطابور ١٢٠٠، و`flushScheduled` يجعل
 * الثاني بلا أثر — ولا يُعدّ إخفاقٌ أصلاً فلا تنفد ميزانية ولا يقع بلاغ.
 *
 * فأُصلح الأمران حيث وقعا، بلا مسٍّ بـ`setItem`: **عدُّ الإعادة إخفاقاً** في حلقة
 * التنفيذ، و**الأطولُ يُزيح الأقصر** في `scheduleFlush`.
 */
const RETRY_DELAY_MS = 1_200;
const FIRST_FLUSH_DELAY_MS = 400;

const deferredWrites = new Map<string, string>();
/**
 * محاولات فشل الكتابة — **لكل مفتاح**، وكان عدّاداً واحداً للجلسة كلّها.
 *
 * العدّاد العام كان يخطئ في اتجاهين، وكلاهما مقيس:
 *
 *   - **يُجوّع اللاحق:** مفتاحٌ عالق يستنفد الثمانية، فأوّل فشلٍ لمفتاحٍ جديد
 *     بعده يُستسلم عنه فوراً — محاولة واحدة حيث يَعِد الثابت بثمانٍ.
 *   - **ولا يحدّ العالق:** الثمانية كانت تحدّ **إعادة الجدولة الذاتية** لا
 *     المحاولات؛ فحمولةٌ عالقة تُعاد محاولتها في كل جولة يُطلقها أيّ مفتاحٍ آخر.
 *     قِيس: عشرون محاولة لمفتاحٍ واحد عبر عشرين جولة — كلفةُ تشفيرٍ مهدورة في
 *     كل حفظة لاحقة، وهي على هاتف استنزافُ بطارية.
 *
 * فالميزانية الآن ملكُ صاحبها: تُصفَّر بنجاح كتابته، وتنفد عليه وحده.
 */
const writeFailureAttempts = new Map<string, number>();
/** استُنفدت ميزانيته وأُبلغ عنه — يُحفظ ولا يُحاوَل حتى يصل wrap فيُصفَّر */
const givenUpKeys = new Set<string>();
let flushScheduled = false;
let cancelPendingFlush: (() => void) | null = null;
let pendingFlushDelayMs = 0;
let keyWaitAttempts = 0;
let host: CryptoDeferredHost | null = null;

export function configureCryptoDeferred(next: CryptoDeferredHost): void {
    host = next;
}

/**
 * **الأطول يُزيح الأقصر، والأقصر لا يُزيح الأطول.**
 *
 * كان أيّ طلبٍ يسقط إن كانت جولةٌ مجدولة — فحكمت أوّلُ مدّةٍ تُطلب الوتيرةَ كلّها. و
 * `setItem` تُعيد إدراج ما ليس `encrypt-or-fail` بنفسها فتطلب ٤٠٠ قبل أن يطلب هذا
 * الطابور ١٢٠٠، فيصير الثاني بلا أثر: الوتيرة ٤٠٠ وميزانية الثماني جولات تنقضي في
 * ~٣٫٢ث لا ~٩٫٦ث، والثابت `RETRY_DELAY_MS` يَعِد بما لا يملك.
 */
function scheduleFlush(delayMs: number): void {
    if (!host) return;
    if (flushScheduled) {
        /* بالمدّة لا بالساعة: فمدّةٌ مساوية تُطلب لاحقاً لا تُزيح شيئاً ولا تُؤجّل الجولة */
        if (delayMs <= pendingFlushDelayMs) return;
        cancelPendingFlush?.();
        flushScheduled = false;
        cancelPendingFlush = null;
    }
    const cancel = host.schedule(() => {
        flushScheduled = false;
        cancelPendingFlush = null;
        void flushCryptoDeferredWrites();
    }, delayMs);
    if (!cancel) return;
    flushScheduled = true;
    cancelPendingFlush = cancel;
    pendingFlushDelayMs = delayMs;
}

export function queueCryptoDeferredWrite(key: string, value: string): void {
    deferredWrites.set(key, value);
    scheduleFlush(FIRST_FLUSH_DELAY_MS);
}

/** يُسقط كتابةً مؤجَّلة بطلت — حذفٌ للمفتاح أو معاملة ذرّية أحدث */
export function dropCryptoDeferredWrite(key: string): void {
    deferredWrites.delete(key);
    writeFailureAttempts.delete(key);
    givenUpKeys.delete(key);
}

/** وصل wrap الجلسة: ابدأ الميزانيتين من جديد فتُعاد محاولةُ ما استُسلم عنه */
export function resetCryptoDeferredAttempts(): void {
    keyWaitAttempts = 0;
    writeFailureAttempts.clear();
    givenUpKeys.clear();
}

/** يزيد ميزانية المفتاح، ويُبلغ عند نفادها. يُرجع: هل بقيت محاولة؟ */
function countWriteFailure(active: CryptoDeferredHost, key: string): boolean {
    const attempts = (writeFailureAttempts.get(key) ?? 0) + 1;
    writeFailureAttempts.set(key, attempts);
    if (attempts < MAX_WRITE_FAILURE_ATTEMPTS) return true;
    givenUpKeys.add(key);
    active.reportGivingUp(key, 'encryption kept failing while the key was present');
    return false;
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
    let anyRetryable = false;
    for (const [key, value] of batch) {
        if (active.shouldDropStaleWrite(key)) {
            writeFailureAttempts.delete(key);
            continue;
        }
        /* استُنفدت ميزانيته: تُحفظ حمولته ولا تُستهلك دورة تشفيرٍ أخرى عليها */
        if (givenUpKeys.has(key)) {
            deferredWrites.set(key, value);
            continue;
        }
        try {
            await active.persist(key, value);
            /*
             * `setItem` **لا ترمي** لمفتاحٍ ليس `encrypt-or-fail`: تُعيد إدراجه في هذا
             * الطابور من داخل `catch` الخاص بها ثم تعود بنجاح. فكان النداء يُعدّ ناجحاً،
             * وتُمحى ميزانيته، ولا يُعدّ إخفاق — أي أن `MAX_WRITE_FAILURE_ATTEMPTS`
             * و`reportGivingUp` **لا تسريان على ذلك الصنف إطلاقاً**. قِيس على
             * `lawyer_notes`: ثلاث عشرة جولة متتالية بلا بلاغٍ واحد، وهو الصمت نفسه
             * الذي أُضيف `reportGivingUp` في `fac77eac` ليكسره.
             *
             * فوجودُ المفتاح في الطابور بعد عودة `persist` هو إخفاقٌ ظاهر، ويُعدّ.
             */
            if (deferredWrites.has(key)) {
                if (countWriteFailure(active, key)) anyRetryable = true;
                continue;
            }
            writeFailureAttempts.delete(key);
        } catch (error) {
            if (error instanceof StorageEncryptionError) {
                deferredWrites.set(key, value);
                if (countWriteFailure(active, key)) anyRetryable = true;
                continue;
            }
            active.reportError(`Deferred persist failed for "${key}":`, error);
        }
    }

    if (anyRetryable) scheduleFlush(RETRY_DELAY_MS);
}

/**
 * نفدت ميزانية **انتظار المفتاح** — وهي حالٌ عامّة تخصّ الطابور كلّه، فلا مفتاح
 * أصلاً. يُبلَّغ عن كل حمولة — **ولا تُمسح واحدة**.
 *
 * فالإبقاء عليها هو ما يجعل `rewarmSensitiveAfterWrapChange` قادراً على إنقاذها
 * حين يصل wrap الجلسة متأخراً. ومسحُها هنا كان سيحوّل تأخّراً إلى فقدان — وهو
 * الخطأ نفسه المُصلَح في `CryptoService` (FINDING-015): لا تُتلف ما عجزتَ عن
 * كتابته الآن، فقد تكتبه بعد قليل.
 *
 * أمّا فشل الكتابة والمفتاح حاضر فحالٌ خاصّة بكل مفتاح، ويُبلَّغ عنها في موضعها.
 *
 * ولا يُوسَم شيء هنا بـ`givenUpKeys`: غياب المفتاح حالٌ تزول من تلقائها، فمتى وصل
 * وأطلق مفتاحٌ آخر جولةً وجب أن تُحاوَل هذه الحمولات — ووسمُها كان يمنع ذلك.
 */
function giveUp(active: CryptoDeferredHost, reason: string): void {
    for (const key of deferredWrites.keys()) active.reportGivingUp(key, reason);
}

/** للاختبار وحده: يعيد الوحدة إلى حالتها الأولى بين الحالات */
export function resetCryptoDeferredForTests(): void {
    deferredWrites.clear();
    cancelPendingFlush?.();
    cancelPendingFlush = null;
    pendingFlushDelayMs = 0;
    flushScheduled = false;
    keyWaitAttempts = 0;
    writeFailureAttempts.clear();
    givenUpKeys.clear();
}
