/**
 * Extract ArchivePortal file grid into ArchivePortalFileGrid component.
 * Run: node scripts/split-archive-portal-grid.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const portalPath = path.join(root, 'src/app/components/lawyer/ArchivePortal.tsx');
const gridPath = path.join(root, 'src/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid.tsx');

const raw = fs.readFileSync(portalPath, 'utf8');
const lines = raw.split(/\r?\n/);

const gridStart = lines.findIndex((l) => l.includes('{/* Grid */}'));
const gridEnd = lines.findIndex(
    (l, i) => i > gridStart && l.trim() === '</div>' && lines[i + 1]?.trim() === '',
);

const gridInner = lines
    .slice(gridStart + 1, gridEnd)
    .join('\n')
    .replace(/^            /gm, '')
    .replace(/^<div className="flex-1 overflow-y-auto p-8">\r?\n/, '');

const gridComponent = `import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import ExecutionSmartCard from './ExecutionSmartCard';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { CriminalArchiveCard } from './CriminalArchiveCard';
import { UnifiedDossierCard, type DossierKind } from './UnifiedDossierCard';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { buildLawsuitWorkspacePin, buildTransactionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { criminalCaseReference } from '../criminalArchiveUtils';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { ExecutionArchiveFilter } from './ExecutionArchiveToolbar';
import type { ExecutionPerspectiveFilter } from '../executionArchiveFilterUtils';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { ArchiveDossierViewMode } from './ArchiveDossierToolbar';

export type ArchivePortalFileGridProps = {
    type: 'lawsuits' | 'executions' | 'deleted' | 'execution';
    enrichedFiles: ArchiveEnrichedRow[];
    searchQuery: string;
    filterType: ExecutionArchiveFilter;
    perspectiveFilter: ExecutionPerspectiveFilter;
    executionTrashView: boolean;
    setExecutionTrashView: (v: boolean) => void;
    lawsuitFilesForCluster: unknown[];
    onFileClick: (file: unknown) => void;
    setExecutionPreviewFile: (file: LooseArchiveFile | null) => void;
    onMoveExecutionToTrash?: (id: string) => void;
    onRestoreExecutionFromTrash?: (id: string) => void;
    onPermanentlyDeleteExecutions?: (ids: string[]) => void;
    executionTrashDaysRemaining: (file: LooseArchiveFile) => number | undefined;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    setTrashConfirmTarget: (file: LooseArchiveFile) => void;
    hasLawsuitLifecycle: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    showCriminalCardsInGrid: boolean;
    filteredCriminalCases: Array<{ id: string | number } & Record<string, unknown>>;
    showLawsuitCardsInGrid: boolean;
    onOpenCriminalCase?: (id: string) => void;
    lawsuitViewMode: 'active' | 'archived' | 'trash';
    onMoveLawsuitToTrash?: (id: string) => void;
    onArchiveLawsuit?: (id: string) => void;
    onRestoreLawsuitFromTrash?: (id: string) => void;
    onRestoreArchivedLawsuit?: (id: string) => void;
    onPermanentlyDeleteLawsuits?: (ids: string[]) => void;
    setLawsuitTrashConfirmTarget: (file: LooseArchiveFile) => void;
    setCriminalDeleteTarget: (target: { id: string; title: string }) => void;
    onDeleteCriminalCase?: (id: string) => void;
    dossierSearchQuery: string;
    lawsuitJurisdictionTab: LawsuitJurisdictionTab;
};

export function ArchivePortalFileGrid(props: ArchivePortalFileGridProps) {
    const {
        type,
        enrichedFiles,
        searchQuery,
        filterType,
        perspectiveFilter,
        executionTrashView,
        setExecutionTrashView,
        lawsuitFilesForCluster,
        onFileClick,
        setExecutionPreviewFile,
        onMoveExecutionToTrash,
        onRestoreExecutionFromTrash,
        onPermanentlyDeleteExecutions,
        executionTrashDaysRemaining,
        selectedTrashIds,
        toggleTrashSelect,
        setTrashConfirmTarget,
        hasLawsuitLifecycle,
        dossierViewMode,
        showCriminalCardsInGrid,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        onOpenCriminalCase,
        lawsuitViewMode,
        onMoveLawsuitToTrash,
        onArchiveLawsuit,
        onRestoreLawsuitFromTrash,
        onRestoreArchivedLawsuit,
        onPermanentlyDeleteLawsuits,
        setLawsuitTrashConfirmTarget,
        setCriminalDeleteTarget,
        onDeleteCriminalCase,
        dossierSearchQuery,
        lawsuitJurisdictionTab,
    } = props;

    return (
        <>
${gridInner}
        </>
    );
}
`;

fs.writeFileSync(gridPath, gridComponent);

const gridPropsUsage = `            <div className="flex-1 overflow-y-auto p-8">
                <ArchivePortalFileGrid
                type={type}
                enrichedFiles={enrichedFiles}
                searchQuery={searchQuery}
                filterType={filterType}
                perspectiveFilter={perspectiveFilter}
                executionTrashView={executionTrashView}
                setExecutionTrashView={setExecutionTrashView}
                lawsuitFilesForCluster={lawsuitFilesForCluster}
                onFileClick={onFileClick}
                setExecutionPreviewFile={setExecutionPreviewFile}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
                onRestoreExecutionFromTrash={onRestoreExecutionFromTrash}
                onPermanentlyDeleteExecutions={onPermanentlyDeleteExecutions}
                executionTrashDaysRemaining={executionTrashDaysRemaining}
                selectedTrashIds={selectedTrashIds}
                toggleTrashSelect={toggleTrashSelect}
                setTrashConfirmTarget={setTrashConfirmTarget}
                hasLawsuitLifecycle={hasLawsuitLifecycle}
                dossierViewMode={dossierViewMode}
                showCriminalCardsInGrid={showCriminalCardsInGrid}
                filteredCriminalCases={filteredCriminalCases}
                showLawsuitCardsInGrid={showLawsuitCardsInGrid}
                onOpenCriminalCase={onOpenCriminalCase}
                lawsuitViewMode={lawsuitViewMode}
                onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                onArchiveLawsuit={onArchiveLawsuit}
                onRestoreLawsuitFromTrash={onRestoreLawsuitFromTrash}
                onRestoreArchivedLawsuit={onRestoreArchivedLawsuit}
                onPermanentlyDeleteLawsuits={onPermanentlyDeleteLawsuits}
                setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
                setCriminalDeleteTarget={setCriminalDeleteTarget}
                onDeleteCriminalCase={onDeleteCriminalCase}
                dossierSearchQuery={dossierSearchQuery}
                lawsuitJurisdictionTab={lawsuitJurisdictionTab}
                />
            </div>`;

const newPortalLines = [
    ...lines.slice(0, gridStart + 1),
    gridPropsUsage,
    ...lines.slice(gridEnd),
];

let portalOut = newPortalLines.join('\n');
const importAnchor = "import { ArchivePortalTrashDialogs } from './ArchivePortal/components/ArchivePortalTrashDialogs';";
portalOut = portalOut.replace(
    importAnchor,
    `${importAnchor}\nimport { ArchivePortalFileGrid } from './ArchivePortal/components/ArchivePortalFileGrid';`,
);

fs.writeFileSync(portalPath, portalOut);
console.log('Split ArchivePortal grid → ArchivePortalFileGrid');
