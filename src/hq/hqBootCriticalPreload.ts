import { startHqApplicationBoot } from '@/hq/mountHqApplication';
import { loadHqAppModule } from '@/hq/hqAppModule';
import { loadHqRuntimeShellModule } from '@/app/runtime/hqRuntimeShellLoader';

export function kickoffHqBootCriticalPreload(): void {
    if (typeof window === 'undefined') return;

    void Promise.all([
        import('react'),
        import('react-dom/client'),
        loadHqAppModule(),
        loadHqRuntimeShellModule(),
    ]);

    startHqApplicationBoot();
}
