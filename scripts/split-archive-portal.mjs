/**
 * Extract ArchivePortal trash dialogs + enrichment util.
 * Run: node scripts/split-archive-portal.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const portalPath = path.join(root, 'src/app/components/lawyer/ArchivePortal.tsx');
const componentsDir = path.join(root, 'src/app/components/lawyer/ArchivePortal/components');

const lines = fs.readFileSync(portalPath, 'utf8').split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

fs.mkdirSync(componentsDir, { recursive: true });

const trashDialogsBody = slice(1342, 1490);
fs.writeFileSync(
    path.join(componentsDir, 'ArchivePortalTrashDialogs.tsx'),
    `import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import type { LooseArchiveFile } from '../types';

export type ArchivePortalTrashDialogsProps = {
    type: string;
    trashConfirmTarget: LooseArchiveFile | null;
    setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    permanentCountdown: number;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveExecutionToTrash?: (id: string | number) => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onDeleteCriminalCase?: (id: string) => void;
};

export function ArchivePortalTrashDialogs({
    type,
    trashConfirmTarget,
    setTrashConfirmTarget,
    lawsuitTrashConfirmTarget,
    setLawsuitTrashConfirmTarget,
    criminalDeleteTarget,
    setCriminalDeleteTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    permanentCountdown,
    permanentIdsRef,
    onMoveExecutionToTrash,
    onMoveLawsuitToTrash,
    onDeleteCriminalCase,
}: ArchivePortalTrashDialogsProps) {
    return (
        <>
${trashDialogsBody.split('\n').map((l) => `            ${l}`).join('\n')}
        </>
    );
}
`,
);

const enrichmentBody = slice(364, 506)
    .replace(/^    const enrichedFiles = useMemo\(\(\): ArchiveEnrichedRow\[\] => \{\n/, '')
    .replace(/\n    \}, \[files, filteredExecutionFiles, filteredLawsuitFiles, type\]\);\n$/, '');

fs.writeFileSync(
    path.join(root, 'src/app/components/lawyer/ArchivePortal/archivePortalEnrichment.ts'),
    `import type { CaseFile } from '@/app/types/common';
import type { ComputedSmartStatus, ArchiveEnrichedRow, LooseArchiveFile, StageWithCaseMeta } from './types';
import { isExecutionInTrash } from '@/app/utils/executionTrash';
import { executionTotalDemandEstimate } from './utils';

const DEFAULT_ARCHIVE_SMART_STATUS: ComputedSmartStatus = {
    type: 'active',
    label: '🟢 مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
};

export function computeArchiveEnrichedFiles(
    type: string,
    files: unknown[],
    filteredExecutionFiles: unknown[],
    filteredLawsuitFiles: unknown[],
): ArchiveEnrichedRow[] {
${enrichmentBody.split('\n').map((l) => `    ${l}`).join('\n')}
}
`,
);

let portal = fs.readFileSync(portalPath, 'utf8');

portal = portal.replace(
    /const DEFAULT_ARCHIVE_SMART_STATUS[\s\S]*?timers: null,\n\};\n\n/,
    '',
);

portal = portal.replace(
    "import {\n    mergedPreviewTimelineEvents,",
    `import { computeArchiveEnrichedFiles } from './ArchivePortal/archivePortalEnrichment';
import { ArchivePortalTrashDialogs } from './ArchivePortal/components/ArchivePortalTrashDialogs';
import {
    mergedPreviewTimelineEvents,`,
);

portal = portal.replace(
    /    const enrichedFiles = useMemo\(\(\): ArchiveEnrichedRow\[\] => \{[\s\S]*?\}, \[files, filteredExecutionFiles, filteredLawsuitFiles, type\]\);\n\n/,
    `    const enrichedFiles = useMemo(
        () => computeArchiveEnrichedFiles(type, files, filteredExecutionFiles, filteredLawsuitFiles),
        [files, filteredExecutionFiles, filteredLawsuitFiles, type],
    );

`,
);

portal = portal.replace(
    /\n            \{type === 'executions' && trashConfirmTarget[\s\S]*?\n            \)\}\n\n            \{\/\* ⭐ Floating Action Button/,
    `
            <ArchivePortalTrashDialogs
                type={type}
                trashConfirmTarget={trashConfirmTarget}
                setTrashConfirmTarget={setTrashConfirmTarget}
                lawsuitTrashConfirmTarget={lawsuitTrashConfirmTarget}
                setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
                criminalDeleteTarget={criminalDeleteTarget}
                setCriminalDeleteTarget={setCriminalDeleteTarget}
                permanentDeleteOpen={permanentDeleteOpen}
                setPermanentDeleteOpen={setPermanentDeleteOpen}
                permanentCountdown={permanentCountdown}
                permanentIdsRef={permanentIdsRef}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
                onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                onDeleteCriminalCase={onDeleteCriminalCase}
            />

            {/* ⭐ Floating Action Button`,
);

fs.writeFileSync(portalPath, portal);
console.log('Split ArchivePortal → trash dialogs + enrichment util');
