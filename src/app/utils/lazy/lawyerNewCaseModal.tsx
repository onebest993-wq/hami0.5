/**
 * تحميل كسول لإنشاء دعوى/معاملة — ملف منفصل لتفادي تعارض HMR مع lazyComponents.
 */
import { lazyWithRetry, type LazyComponent } from './lazyWithRetry';
import {
    loadLawyerNewCaseModule,
    prefetchLawyerNewCaseModule,
} from '@/app/runtime/lawyerNewCaseLoader';

export function prefetchLawyerNewCase(): void {
    prefetchLawyerNewCaseModule();
}

export const LazyLawyerNewCase = lazyWithRetry(() =>
    loadLawyerNewCaseModule().then((m) => ({
        default: m.LawyerNewCase as unknown as LazyComponent,
    })),
);
