import React from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { ExecutionDossierInstantFrame } from '@/app/components/lawyer/dashboard/ExecutionDossierInstantFrame';

/**
 * غطاء Suspense على OverlayHosts/OverlayEntry — نفس هندسة InstantChrome
 * إذا بوابة الإضبارة لم تُقيَّم بعد. بلا ExecutionDashboard ولا lucide.
 */
export function ExecutionDossierInstantPaintCover({
    file,
    onExitToHome,
}: {
    file: FileData;
    onExitToHome: () => void;
}): React.ReactElement {
    return <ExecutionDossierInstantFrame file={file} onExitToHome={onExitToHome} />;
}
