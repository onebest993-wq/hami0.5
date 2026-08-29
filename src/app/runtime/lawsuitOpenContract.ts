/**
 * عقد فتح إضبارة الدعوى — commit فوري + تسخين chrome بلا انتظار.
 * يطابق مبدأ التنفيذ/الإعدادات: لا تُعلَّق النقرة على warm.
 */
import { prefetchSmartFileOverlayEntry } from '@/app/runtime/smartFileOverlayEntryLoader';
import { prefetchSmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';
import { prefetchSmartFileModalPhased } from '@/app/runtime/smartFileModalLoader';
import { prefetchPersonalStatusDossierSurface } from '@/app/components/lawyer/personal-status/personalStatusDossierLazy';

/** يُطلَق قبل commit فتح الدعوى — يمنع وميض إضبارة التنفيذ المسلّحة */
export const LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT =
    'hami:lawsuit-dossier-suppress-execution-host';

/** تسخين مقاطع SmartFile فقط — بلا إعادة Prime لمساحة الدعاوى */
export function prepareLawsuitDossierChrome(): void {
    if (typeof window === 'undefined') return;
    prefetchSmartFileOverlayEntry();
    prefetchSmartFileModalPortal();
    prefetchSmartFileModalPhased();
    prefetchPersonalStatusDossierSurface();
}

let dossierChromeArmed = false;

/** تسخين إضبارة مرة واحدة — hover/host؛ الفتح يستدعي chrome مباشرة لإعادة المحاولة */
export function prepareLawsuitDossierChromeOnce(): void {
    if (dossierChromeArmed) return;
    dossierChromeArmed = true;
    prepareLawsuitDossierChrome();
}

export function resetLawsuitDossierChromeArmedForTests(): void {
    dossierChromeArmed = false;
}

/** تسخين بوابة SmartFile + المحتوى + مساحة الدعاوى — fire-and-forget */
export function prepareLawsuitDossierOpen(): void {
    prepareLawsuitDossierChrome();
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
        .catch(() => undefined);
}

/**
 * commit فوري + تسخين الإضبارة فقط.
 * لا يُعاد Prime للمخزن هنا — يسرق فكّ المفاتيح/حزم الأرشيف من أول إطار SmartFile.
 */
export function openLawsuitDossierWithContract(commit: () => void): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT));
    }
    prepareLawsuitDossierChrome();
    commit();
}
