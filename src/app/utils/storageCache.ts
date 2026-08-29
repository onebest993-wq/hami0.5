/**
 * كاش قراءة/كتابة لإضابير التنفيذ — لا «طبقة تخزين مؤقت عامّة».
 *
 * كان العنوان يقول «طبقة تخزين مؤقت لتحسين أداء LocalStorage»، وهو تضليل: الملفّ
 * يعرف صيغة كتلة إضبارة التنفيذ ويستورد أربع دوالّ من طبقة تثبيتها، فيسير كل من
 * يمسّه على إغلاق ثابت من ٥٥ وحدة و٤٠٨ كيلوبايت. ومن قرأ الاسم والعنوان حسبه
 * بدائية عامّة رخيصة صالحة لأي مفتاح، فأدخلها حيث لا تصلح.
 *
 * والقياس يُنصف التصميم القائم: مستورديه ٤٤، وكلّهم — بلا استثناء واحد — من نطاق
 * التنفيذ والمالية، ومنهم `alimonyPaymentEngine` الذي يبدو خارجاً باسمه وهو يقرأ
 * إضبارة تنفيذ بمفتاحها. فالوزن لا يدفعه غريب، ولا موجب لعكس الاعتماد ولا لمخاطرة
 * إعادة هيكلة في طبقة تخزين حسّاسة.
 *
 * الحدّ المعلوم: هذا الملفّ طرفٌ في دائرة استيراد من خمسة ملفّات
 * (`executionDossierBlobPersistence` ← `executionDossierTombstones` ←
 * `executionStorageKeys` ← هنا). والدائرة تُخضِع ترتيب التهيئة لمن حُمِّل أوّلاً،
 * وقد أنتجت عطل TDZ حقيقياً في هذه الطبقة — دالّة سهم `const` استُدعيت قبل
 * تعريفها. فكل دالّة تُستدعى هنا لحظةَ تهيئة الوحدة يجب أن تكون `function` مرفوعة
 * لا `const`، وذلك شرطٌ قائم لا تفصيل أسلوبيّ.
 *
 * (لا تأثير على التصميم — قراءة وكتابة فقط.)
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import { startBackgroundInterval } from '@/app/runtime/backgroundInterval';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
  applyExecutionDossierBlobSetWithOutcome,
  isExecutionDossierMainBlobKey,
  readExecutionDossierBlob,
  registerExecutionBlobCacheTouch,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionDossierIdFromStorageKey } from '@/app/utils/executionStorageKeysLite';

function readExecutionDossierCacheValue(key: string): Record<string, unknown> | null {
  if (!isExecutionDossierMainBlobKey(key)) return null;
  const dossierId = executionDossierIdFromStorageKey(key);
  if (!dossierId) return null;
  const blob = readExecutionDossierBlob(dossierId);
  return blob && typeof blob === 'object' ? blob : null;
}

interface CacheEntry {
  value: any;
  timestamp: number;
}

class StorageCacheClass {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 دقائق

  /**
   * قراءة من الـ Cache أو LocalStorage
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (cached) {
      if (Date.now() - cached.timestamp > this.TTL) {
        this.cache.delete(key);
        return this.get(key);
      }
      /*
       * إصابة الذاكرة: أعد القيمة بلا قراءة قرص.
       * كان مسار الإضبارة يستدعي readExecutionDossierBlob لمجرد «هل المفتاح
       * ما زال موجوداً؟» فيُفكّ تشفير البلوب كاملاً في كل get — بما فيها قائمة
       * المخزن. والحذف الحقيقي يمرّ purgeExecutionStorageCache.
       * TTL يسقط المدخل بعد خمس دقائق.
       */
      return cached.value;
    }

    const value = this.readFromLocalStorage(key);
    if (value !== null) {
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
      });
    }
    return value;
  }

  /**
   * ذاكرة فقط — بلا قرص ولا فك تشفير. لقائمة المخزن حتى لا تُفكّ كل إضبارة عند الرسم.
   */
  peekMemory(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }

  /** تحديث الذاكرة المؤقتة فقط — بعد كتابة SecureStore مباشرة */
  touchCacheEntry(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * الكتابة إلى الـ Cache و LocalStorage
   *
   * @returns هل ثُبّتت القيمة فعلاً. كانت `void` فكان كل فشل صامتاً،
   * وهو ما يجعل الواجهة تُظهر «حُفِظ» والقرص خالياً.
   */
  set(key: string, value: any): boolean {
    const executionOutcome = applyExecutionDossierBlobSetWithOutcome(key, value, (k, v) =>
      this.touchCacheEntry(k, v),
    );
    if (executionOutcome === 'persisted') {
      clearLegacyPlaintextMirror(key);
      return true;
    }
    if (executionOutcome === 'rejected-wipe') return false;
    // 'not-execution-key' | 'invalid-payload' — يُكمل بالمسار العام
    try {
      SecureStoreService.setItemSync(key, JSON.stringify(value));
      clearLegacyPlaintextMirror(key);
    } catch (e) {
      console.error('[StorageCache] فشل الحفظ في localStorage:', e);
      return false;
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    return true;
  }

  /**
   * حذف من الـ Cache و LocalStorage
   */
  remove(key: string): void {
    this.cache.delete(key);
    try {
      SecureStoreService.deleteItemSync(key);
    } catch (e) {
      console.error('[StorageCache] فشل الحذف من localStorage:', e);
    }
    clearLegacyPlaintextMirror(key);
  }

  /**
   * إلغاء صلاحية key معين من الـ Cache فقط
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * مسح الـ Cache بالكامل (بدون تأثير على localStorage)
   */
  clear(): void {
    this.cache.clear();
  }

  /*
   * `clearAll` حُذفت — ولم يكن لها مستدعٍ واحد في الشيفرة الحيّة.
   *
   * كانت تمرّ على كل مفاتيح المخزن وتحذف ما بدأ بـ`hami_`/`hami:`/`lawyer_`/
   * `execution_`/`lawsuit_`/`client_`/`notes_` عبر `deleteItemSync` مباشرةً — أي
   * بيانات المحامي كلّها، بتجاوز حارس المسح وشواهد القبر جميعاً. زرٌّ واحد يُوصَل
   * بها يوماً باسم «تفريغ الذاكرة المؤقتة» يمحو الخزنة والمستودع والإضابير معاً،
   * والاسم يوحي بأنه يمسّ ذاكرةً مؤقتة لا قرصاً.
   *
   * `getCacheSize` و`getStats` و`setEnabled` حُذفن كذلك: صفر مستدعٍ. و`setEnabled`
   * خاصّةً كانت تُخفي فرعاً ميتاً في كل قراءة وكتابة — رايةٌ لا تُطفأ أبداً.
   */

  /**
   * قراءة من LocalStorage مع معالجة الأخطاء
   */
  private readFromLocalStorage(key: string): any | null {
    try {
      const dossierBlob = readExecutionDossierCacheValue(key);
      if (dossierBlob) {
        clearLegacyPlaintextMirror(key);
        return dossierBlob;
      }

      const drained = readSecureOrDrainLegacySync(key);
      if (drained == null) return null;
      try {
        return JSON.parse(drained);
      } catch {
        return drained;
      }
    } catch (e) {
      console.error('[StorageCache] فشل القراءة من localStorage:', e);
      return null;
    }
  }

  /**
   * تنظيف الـ entries القديمة
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    });

    if (removed > 0 && import.meta.env.DEV) {
      console.log(`🧹 [StorageCache] تم تنظيف ${removed} إدخال قديم`);
    }

    return removed;
  }
}

// Singleton Instance
export const storageCache = new StorageCacheClass();

registerExecutionBlobCacheTouch((key, value) => storageCache.touchCacheEntry(key, value));

/*
 * كان المؤقّت يُكتب هنا بيده: `pagehide` بـ`{ once: true }` يُزيله ولا يُعيده، فالعودة
 * من ذاكرة الصفحة تجد التنظيف موقوفاً لبقيّة الجلسة وتنمو الخريطة بلا حدّ. وكان
 * يعمل أيضاً والتطبيق مُخفى في الخلفية على الهاتف لأن `pagehide` لا يُطلَق هناك.
 */
const stopStorageCacheCleanup = startBackgroundInterval({
  globalKey: '__hamiStorageCacheCleanupStop',
  intervalMs: 10 * 60 * 1000,
  tick: () => storageCache.cleanup(),
  /* ما انتهت مدّته أثناء الخفاء يُنظَّف مرّة عند العودة قبل استئناف الدورية */
  runOnResume: true,
});

import.meta.hot?.dispose(() => stopStorageCacheCleanup());

/*
 * أربع مساعدات مُصدَّرة حُذفت — `getCachedItem` و`setCachedItem` و`removeCachedItem`
 * و`invalidateCache`. صفر مستدعٍ لكلٍّ منها: كل مواضع الاستعمال في الشيفرة تنادي
 * `storageCache.get/set/remove/invalidate` مباشرةً. وغلافٌ بلا مستهلك يُضاعف سطح
 * الوحدة ويُوهم قارئها بأن للوصول طريقين مقصودين.
 */
