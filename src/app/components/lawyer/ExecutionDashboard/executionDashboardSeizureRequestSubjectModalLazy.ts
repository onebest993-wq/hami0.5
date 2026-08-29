/** مصنع مشترك لنافذة موضوع الحجز — نفس الـ instance للـ hover والتركيب. */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { SeizureRequestSubjectModalProps } from './components/SeizureRequestSubjectModal';

export function importSeizureRequestSubjectModal() {
    return import('./components/SeizureRequestSubjectModal').then((m) => ({
        default: m.SeizureRequestSubjectModal,
    }));
}

export const LazySeizureRequestSubjectModal =
    createPreloadableLazyComponent<SeizureRequestSubjectModalProps>(
        importSeizureRequestSubjectModal,
    );
