/**
 * عقد فتح إضبارة الدعوى — commit فوري + تسخين chrome بلا انتظار.
 * يطابق مبدأ التنفيذ/الإعدادات: لا تُعلَّق النقرة على warm.
 */
import { prefetchSmartFileOverlayEntry } from '@/app/runtime/smartFileOverlayEntryLoader';
import { prefetchSmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';
import { prefetchSmartFileModalPhased } from '@/app/runtime/smartFileModalLoader';
import { prefetchPersonalStatusDossierSurface } from '@/app/components/lawyer/personal-status/personalStatusDossierLazy';

let lawsuitDossierOpenCounter = 0;
let _lastActiveDossierLawsuitId = 0;
const lawsuitDossierSessionIdRef = { current: 0 };
const activeLawsuitDossierSessionIdRef = { current: 0 };

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

function markLawsuitDossierSessionBoot(): void {
    lawsuitDossierOpenCounter += 1;
    _lastActiveDossierLawsuitId = lawsuitDossierOpenCounter;
    lawsuitDossierSessionIdRef.current = lawsuitDossierOpenCounter;
    activeLawsuitDossierSessionIdRef.current = lawsuitDossierOpenCounter;
}

export function resetLawsuitDossierSessionForTests(): void {
    lawsuitDossierOpenCounter = 0;
    _lastActiveDossierLawsuitId = 0;
    lawsuitDossierSessionIdRef.current = 0;
    activeLawsuitDossierSessionIdRef.current = 0;
}

/** تسخين بوابة SmartFile + المحتوى + مساحة الدعاوى — fire-and-forget */
export function prepareLawsuitDossierOpen(): void {
    markLawsuitDossierSessionBoot();
    prepareLawsuitDossierChrome();
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) => {
            if (lawsuitDossierSessionIdRef.current !== activeLawsuitDossierSessionIdRef.current) return;
            m.warmLawsuitWorkspace({ includeSecondary: false });
        })
        .catch(() => undefined);
}

/**
 * commit فوري + تسخين الإضبارة فقط.
 * لا يُعاد Prime للمخزن هنا — يسرق فكّ المفاتيح/حزم الأرشيف من أول إطار SmartFile.
 */
export function openLawsuitDossierWithContract(commit: () => void): void {
    markLawsuitDossierSessionBoot();
    if (typeof window !== 'undefined') {
        if (lawsuitDossierSessionIdRef.current !== activeLawsuitDossierSessionIdRef.current) return;
        window.dispatchEvent(new CustomEvent(LAWSUIT_DOSSIER_SUPPRESS_EXECUTION_HOST_EVENT));
    }
    if (lawsuitDossierSessionIdRef.current !== activeLawsuitDossierSessionIdRef.current) return;
    prepareLawsuitDossierChrome();
    if (lawsuitDossierSessionIdRef.current !== activeLawsuitDossierSessionIdRef.current) return;
    void import('@/app/services/litigation/tearDownLitigationFloatingState').then((m) =>
        m.tearDownLitigationFloatingState({
            targetSurface: 'newcase-root',
            reason: 'contract-open',
        }),
    );
    commit();
}
