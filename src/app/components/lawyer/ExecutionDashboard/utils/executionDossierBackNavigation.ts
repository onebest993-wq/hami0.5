import {
    useExecutionDashboardStore,
    type ModalStates,
} from '@/app/stores/executionDashboardStore';

/** ترتيب إغلاق النوافذ — الأعلى بصرياً أولاً */
const EXECUTION_DOSSIER_STORE_MODAL_BACK_PRIORITY: (keyof ModalStates)[] = [
    'showUnifiedSummonsModal',
    'showUnifiedExecutionModal',
    'showCoerciveModal',
    'showDecisionsModal',
    'showSeizedAssetsModal',
    'showTimelineModal',
    'showAppointmentModal',
    'showNotesModal',
    'showPaymentModal',
    'showNotificationModal',
    'showDocumentsModal',
    'showPaymentCalculator',
    'showSettlementCalculator',
    'showLedgerModal',
    'showPauseModal',
    'showLawReferencePanel',
];

export function closeTopExecutionDashboardStoreModal(): boolean {
    const state = useExecutionDashboardStore.getState();
    for (const key of EXECUTION_DOSSIER_STORE_MODAL_BACK_PRIORITY) {
        if (state.modals[key]) {
            state.closeModal(key);
            return true;
        }
    }
    return false;
}

function isDomDialogVisible(el: Element): boolean {
    const node = el as HTMLElement;
    if (node.getAttribute('aria-hidden') === 'true') return false;
    if (node.closest('[aria-hidden="true"]')) return false;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function getVisibleDomDialogs(): Element[] {
    if (typeof document === 'undefined') return [];
    return Array.from(
        document.querySelectorAll('[role="dialog"], [role="alertdialog"]'),
    ).filter(isDomDialogVisible);
}

/** محاولة إغلاق أعلى حوار DOM مرئي (مودالات محلية خارج المخزن) */
let domDialogDismissDepth = 0;

export function dismissTopDomDialog(): boolean {
    if (typeof document === 'undefined') return false;
    if (domDialogDismissDepth > 0) return false;
    const dialogs = getVisibleDomDialogs();
    if (dialogs.length === 0) return false;

    domDialogDismissDepth += 1;
    try {
        const top = dialogs[dialogs.length - 1] as HTMLElement;
        const closeBtn = top.querySelector<HTMLElement>(
            'button[aria-label="إغلاق"], button[aria-label="اغلاق"], [data-hami-dialog-close]',
        );
        if (closeBtn) {
            closeBtn.click();
            return true;
        }
        // Escape على الحوار فقط — لا window/document (كان يعيد تشغيل مسار الرجوع → stack overflow)
        top.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
        return true;
    } finally {
        queueMicrotask(() => {
            domDialogDismissDepth = Math.max(0, domDialogDismissDepth - 1);
        });
    }
}

export type RunExecutionDossierBackStepInput = {
    closeLocalOverlay?: () => boolean;
    dossierContextBack?: () => boolean;
    /** للهروب/زر الرجوع الأصلي فقط — لا يُستخدم لزر السهم في الرأس */
    includeDomDialogDismiss?: boolean;
};

export function runExecutionDossierBackStep(input: RunExecutionDossierBackStepInput): boolean {
    if (closeTopExecutionDashboardStoreModal()) return true;
    if (input.closeLocalOverlay?.()) return true;
    if (input.includeDomDialogDismiss && dismissTopDomDialog()) return true;
    if (input.dossierContextBack?.()) return true;
    return false;
}
