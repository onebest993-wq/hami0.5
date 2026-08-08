import type { CaseStage } from '../../LawyerShared';
import type { FileData } from '../../LawyerShared';
import type { IncidentalSpawnContext } from './incidentalCaseLinking';
import type { ConsolidationMergeMeta, ConsolidationSpawnContext } from './caseConsolidationLinking';

export function readFileString(file: Record<string, unknown>, key: string, fallback = ''): string {
    const value = file[key];
    return typeof value === 'string' ? value : fallback;
}

export interface SmartFileModalProps {
    file: Record<string, unknown>;
    theme?: Record<string, unknown>;
    shapeClass?: string;
    onClose: () => void;
    onUpdate?: (file: Record<string, unknown>) => void;
    onDelete?: () => void;
    onAddStage?: (stage: CaseStage) => void;
    onAddAlert?: (alert: unknown) => void;
    onSpawnLinkedIncidentalCase?: (ctx: IncidentalSpawnContext) => void;
    onOpenLinkedFile?: (linkedFileId: number, linkedCriminalId?: string) => void;
    lawsuitFiles?: FileData[];
    onStartConsolidationNewCase?: (ctx: ConsolidationSpawnContext) => void;
    onConsolidateWithExisting?: (
        primaryFileId: number,
        secondaryFileId: number,
        meta: ConsolidationMergeMeta,
    ) => void;
    onLinkWithExistingCase?: (
        primaryFileId: number,
        peer: {
            dossierKind: 'lawsuit' | 'criminal';
            lawsuitFileId?: number;
            criminalId?: string;
            caseNo: string;
        },
        meta: { linkDate: string; reason?: string },
    ) => void;
    onOpenLinkedCriminalCase?: (criminalId: string) => void;
    consolidationNavActive?: boolean;
    caseLinkNavActive?: boolean;
    /** نسخة معزولة للاطلاع عند التصفح من الإضبارة الأصلية — لا تُكتب على ملف المخزن */
    caseLinkViewOnly?: boolean;
    onReturnFromCaseLinkBrowse?: () => void;
    onUnlinkCaseLink?: (peer: { peerFileId?: number; peerCriminalId?: string }) => void;
    caseLinkBrowseMeta?: {
        originCaseNo: string;
        peerCaseNo: string;
        peerFileId?: number;
        peerCriminalId?: string;
        peerDossierKind?: 'lawsuit' | 'criminal';
    };
    onExitToProfile?: () => void;
}
