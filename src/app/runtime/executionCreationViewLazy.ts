import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { ExecutionArchiveFile, ModalProps } from '@/app/types/common';

export type ExecutionCreationViewLazyProps = ModalProps & {
    onSave: (fileData: ExecutionArchiveFile) => void;
};

export function importExecutionCreationView() {
    return import('@/app/components/lawyer/ExecutionCreationView.tsx').then((m) => ({
        default: m.ExecutionCreationView,
    }));
}

/** نفس الوحدة لكل مسارات التسخين/الفتح — بلا React.lazy ثانٍ يومض BootShell بعد prefetch */
export const LazyExecutionCreationView =
    createPreloadableLazyComponent<ExecutionCreationViewLazyProps>(importExecutionCreationView);
