import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { DossierActionsModalProps } from './components/DossierActionsModal';

export function importDossierActionsModal() {
    return import('./components/DossierActionsModal').then((m) => ({
        default: m.DossierActionsModal,
    }));
}

export const LazyDossierActionsModal =
    createPreloadableLazyComponent<DossierActionsModalProps>(importDossierActionsModal);
