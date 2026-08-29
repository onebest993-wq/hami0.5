import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    ExecutionDossierInstantBody,
    type ExecutionDossierPaintFile,
} from '@/app/components/lawyer/dashboard/ExecutionDossierInstantFrame';

/** هيكل هندسي يطابق بطاقة تفاصيل الإضبارة — صفر CLS أثناء hydration. بلا نبض. */
export function PhoneBodyLoadingShell({
    file,
    onExitToHome,
}: {
    file?: ExecutionDossierPaintFile | FileData | null;
    onExitToHome?: () => void;
}) {
    return <ExecutionDossierInstantBody file={file} onExitToHome={onExitToHome} />;
}
