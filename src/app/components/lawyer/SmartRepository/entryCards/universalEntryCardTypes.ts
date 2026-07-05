import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryFeedLayoutId } from '../repositoryFeedLayout';
import type { ViewMode } from '@/app/components/lawyer/hooks/useSmartVault';

export type UniversalEntryCardProps = {
    item: RepositoryFeedItem;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    dossiers: DossierPickerOption[];
    vaultDocsById: Map<string, SmartVaultDoc>;
    feedLayout?: RepositoryFeedLayoutId;
    /** @deprecated — استخدم feedLayout */
    viewMode?: ViewMode;
    onSaveGlobal: (note: GlobalNote) => void;
    onDeleteGlobal: (id: string | number) => void;
    onUpdateLawsuit: (file: FileData) => void;
    onUpdateExecution: (file: ExecutionFile) => void;
    onLinkGlobalToDossier: (note: GlobalNote, dossier: DossierPickerOption) => Promise<void>;
    onBindVaultDoc: (doc: SmartVaultDoc, dossier: DossierPickerOption) => Promise<void>;
    onDeleteVaultDoc?: (doc: SmartVaultDoc) => void | Promise<void>;
    onEditVaultDoc?: (doc: SmartVaultDoc) => void;
    onViewVaultDoc?: (doc: SmartVaultDoc) => void | Promise<void>;
    viewingVaultDocId?: string | null;
};

export function stripEntryHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
