/** تسخين وحدات محرّر تخطيط الرئيسية قبل الفتح — يقلّل تأخير أول سحب */
export function prefetchHomeLayoutEditModules(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/HomeLayoutEditChrome').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/DraggableHomeWidget').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/HomeDropZone').catch(() => undefined);
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/HomeDropIndicator').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/HomeDockTransferHint').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/dashboard/homeLayoutEdit/EditableDockShell').catch(
        () => undefined,
    );
}
