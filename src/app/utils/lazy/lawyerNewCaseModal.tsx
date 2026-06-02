/**
 * تحميل كسول لإنشاء دعوى/معاملة — ملف منفصل لتفادي تعارض HMR مع lazyComponents.
 */
import { lazyWithRetry, type LazyComponent } from './lazyWithRetry';

export const LazyLawyerNewCase = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawyerNewCase').then((m) => ({
        default: m.LawyerNewCase as unknown as LazyComponent,
    })),
);

/** توافق مع الاستيرادات القديمة — نفس المكوّن */
export const LazyCompleteLawsuitSystem = LazyLawyerNewCase;
