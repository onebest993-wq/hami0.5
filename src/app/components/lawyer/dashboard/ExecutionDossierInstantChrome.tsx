import React from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { ExecutionDossierInstantFrame } from '@/app/components/lawyer/dashboard/ExecutionDossierInstantFrame';

/**
 * قشرة فورية لإضبارة التنفيذ على Portal — بلا Portal/BootChrome السمين
 * حتى لا يُسحب ExecutionDashboard* إلى stem البارد.
 */
export function ExecutionDossierInstantChrome({
    file,
    onExitToHome,
}: {
    file: FileData;
    onExitToHome: () => void;
}): React.ReactElement {
    return <ExecutionDossierInstantFrame file={file} onExitToHome={onExitToHome} />;
}
