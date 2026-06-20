import type { CaseStage } from '../../LawyerShared';
import type { FileData, IncidentalCase } from '../../LawyerShared';
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
    onOpenLinkedFile?: (fileId: number) => void;
    lawsuitFiles?: FileData[];
    onStartConsolidationNewCase?: (ctx: ConsolidationSpawnContext) => void;
    onConsolidateWithExisting?: (
        primaryFileId: number,
        secondaryFileId: number,
        meta: ConsolidationMergeMeta,
    ) => void;
    onLinkWithExistingCase?: (
        primaryFileId: number,
        secondaryFileId: number,
        meta: { linkDate: string; reason?: string },
    ) => void;
    consolidationNavActive?: boolean;
    caseLinkNavActive?: boolean;
}
