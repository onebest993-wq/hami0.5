import { useCallback } from 'react';

type InlineSeveranceDeps = {
    resumePendingSeveranceForm: () => boolean;
    stashPendingSeveranceForm: () => void;
    setIsInlineSeveranceFormOpen: (open: boolean) => void;
};

/** فتح/إغلاق نموذج التفريق المضمّن مع stash/resume لسياق التفريق معلّق. */
export function useCriminalDashboardInlineSeverance({
    resumePendingSeveranceForm,
    stashPendingSeveranceForm,
    setIsInlineSeveranceFormOpen,
}: InlineSeveranceDeps) {
    const openInlineSeveranceForm = useCallback(() => {
        if (!resumePendingSeveranceForm()) return;
        setIsInlineSeveranceFormOpen(true);
    }, [resumePendingSeveranceForm, setIsInlineSeveranceFormOpen]);

    const closeInlineSeveranceForm = useCallback(() => {
        stashPendingSeveranceForm();
        setIsInlineSeveranceFormOpen(false);
    }, [stashPendingSeveranceForm, setIsInlineSeveranceFormOpen]);

    return { openInlineSeveranceForm, closeInlineSeveranceForm };
}
