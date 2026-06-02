/**
 * Lazy modals for LegalCommandCenterDock only — isolated from lazyComponents.tsx
 * to avoid circular chunk: lazyComponents → LegalCommandCenterDock → lazyComponents.
 */
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export const LazyScannerModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ActionModals/ScannerModal').then((m) => ({
        default: m.ScannerModal as unknown as LazyComponent,
    })),
);

export const LazyVoiceRecorderModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').then((m) => ({
        default: m.VoiceRecorderModal as unknown as LazyComponent,
    })),
);

export const LazySmartVaultModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartVaultModal').then((m) => ({
        default: m.SmartVaultModal as unknown as LazyComponent,
    })),
);
