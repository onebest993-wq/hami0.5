import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const srcPath = path.join(root, 'ActiveOrderFileRoot.tsx');
let lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function collectNames(bodyLines) {
    const names = new Set();
    for (const line of bodyLines) {
        let m = line.match(/^\s*const \[(\w+), (\w+)\]/);
        if (m) {
            names.add(m[1]);
            names.add(m[2]);
            continue;
        }
        m = line.match(/^\s*const (\w+) =/);
        if (m && m[1] !== 'fd') names.add(m[1]);
        m = line.match(/^\s*function (\w+)\s*\(/);
        if (m) names.add(m[1]);
    }
    return names;
}

const exportLine = lines.findIndex((l) => l.includes('export const Dashboard_Active_Order_File'));
const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
const confirmLine = lines.findIndex((l) => l.includes('const confirmPortal ='));
const returnLine = lines.findIndex((l, i) => i > confirmLine && /^\s+return \(\s*$/.test(l));

const bodyLines = lines.slice(bodyStart, confirmLine);
const names = collectNames(bodyLines);
names.add('fd');
names.add('onClose');
names.add('onCaseUpdated');
names.add('fileData');

const extraImports = `
import { ValidationBanner } from './components/ValidationBanner';
import { ActiveOrderFileHeader } from './layout/ActiveOrderFileHeader';
import { ArchiveBanner } from './layout/ArchiveBanner';
import { PartiesSidebar } from './layout/PartiesSidebar';
import { MetaEditModal } from './modals/MetaEditModal';
import { PartyEditModal } from './modals/PartyEditModal';
import { LifecyclePanel } from './layout/LifecyclePanel';
import { AdminWorkspacePanel } from './layout/AdminWorkspacePanel';
import { ActiveOrderFileContext } from './context/ActiveOrderFileContext';
import { useStableModelRef } from './hooks/useStableModelRef';
`;

let content = lines.join('\n');
if (!content.includes('useStableModelRef')) {
    content = content.replace(
        "import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';",
        `import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';${extraImports}`,
    );
}

content = content.replace(
    /\n    const ValidationBanner = \(\{ text \}: \{ text: string \}\) => \([\s\S]*?\);\n/,
    '\n',
);

// Header replacement
const headerStart = content.indexOf('<motion.div className="sticky top-0 z-50');
if (headerStart < 0) {
    const headerStart2 = content.indexOf('<div className="sticky top-0 z-50');
    if (headerStart2 < 0) throw new Error('header not found');
}
const headerStartFinal = content.indexOf('<motion.div className="sticky top-0 z-50') >= 0
    ? content.indexOf('<motion.div className="sticky top-0 z-50')
    : content.indexOf('<motion.div className="sticky top-0 z-50'.replace('motion.', '')) >= 0
      ? content.indexOf('<div className="sticky top-0 z-50')
      : content.indexOf('<motion.div className="sticky top-0 z-50');

// use div version
const hStart = content.indexOf('            <div className="sticky top-0 z-50');
const hEnd = content.indexOf('            {isFinalized && (', hStart);
if (hStart >= 0 && hEnd > hStart) {
    const headerBlock = `            <ActiveOrderFileHeader
                workspaceHeaderTitle={workspaceHeaderTitle}
                requestNumberText={
                    caseData?.requestNumber
                        ? formatRequestNumberText(caseData.requestNumber, caseData?.requestDate)
                        : ''
                }
                procedureDetailsForPopover={procedureDetailsForPopover}
                courtName={String(caseData?.courtName ?? '')}
                isFinalized={isFinalized}
                isIqrarContext={isIqrarContext}
                statusConfig={statusConfig}
                nextHearingDate={String(nextHearingDate ?? '')}
                reportDueSoon={reportDueSoon}
                formatDateText={formatDateText}
                onClose={onClose}
                onOpenMetaEdit={openMetaEdit}
            />`;
    content = content.slice(0, hStart) + headerBlock + '\n\n' + content.slice(hEnd);
}

// Archive banner
const aStart = content.indexOf('            {isFinalized && (\n                <div className="border-b border-amber-500/25');
const aEnd = content.indexOf('            <div className="h-[calc(100vh-58px)]');
if (aStart >= 0 && aEnd > aStart) {
    const archiveBlock = `            {isFinalized && (
                <ArchiveBanner
                    isIqrarContext={isIqrarContext}
                    archiveSummaryText={archiveSummaryText}
                    archivedAt={(caseData as any)?.archivedAt}
                    formatDateTimeText={formatDateTimeText}
                />
            )}\n\n`;
    content = content.slice(0, aStart) + archiveBlock + content.slice(aEnd);
}

// Parties sidebar
const pStart = content.indexOf('                    <div className="lg:col-span-1 space-y-4">');
const pEnd = content.indexOf('                    <div className="lg:col-span-3 space-y-4">', pStart);
if (pStart >= 0 && pEnd > pStart) {
    const partiesBlock = `                    <PartiesSidebar
                        party1Entries={party1Entries}
                        party2Entries={party2Entries}
                        procedureType={String(caseData?.specificActionType ?? '')}
                        isFinalized={isFinalized}
                        onEditParty={openPartyEdit}
                    />\n\n`;
    content = content.slice(0, pStart) + partiesBlock + content.slice(pEnd);
}

// Meta + party modals block
const mStart = content.indexOf('                        <AnimatePresence>\n                {isMetaEditOpen &&');
const mEnd = content.indexOf('            </AnimatePresence>\n\n            <ActiveOrderFileHeader');
if (mStart < 0) {
    const mEnd2 = content.indexOf('            </AnimatePresence>\n\n            <div className="sticky');
}
const mEndFinal =
    content.indexOf('            </AnimatePresence>\n\n            <ActiveOrderFileHeader') >= 0
        ? content.indexOf('            </AnimatePresence>\n\n            <ActiveOrderFileHeader')
        : content.indexOf('            </AnimatePresence>\n\n            <div className="sticky top-0');
if (mStart >= 0 && mEndFinal > mStart) {
    const modalsBlock = `            <MetaEditModal
                open={isMetaEditOpen}
                isIqrarContext={isIqrarContext}
                khulasaText={khulasaText}
                metaEditForm={metaEditForm}
                setMetaEditForm={setMetaEditForm}
                onClose={closeMetaEdit}
                onSave={saveMetaEdit}
            />
            <PartyEditModal
                partyEditTarget={partyEditTarget}
                partyEditForm={partyEditForm}
                setPartyEditForm={setPartyEditForm}
                onClose={closePartyEdit}
                onSave={savePartyEdit}
            />\n\n`;
    content = content.slice(0, mStart) + modalsBlock + content.slice(mEndFinal);
}

// Provider + model
if (!content.includes('useStableModelRef({')) {
    const sorted = [...names].sort();
    const modelFields = sorted.map((n) => `        ${n},`).join('\n');
    const modelBlock = `
    const model = useStableModelRef({
${modelFields}
        confirmPortal: undefined as unknown as React.ReactNode,
    });
`;
    content = content.replace(/\n    const confirmPortal = \(/, `${modelBlock}\n    const confirmPortal = (`);
    content = content.replace(
        /(\s+const confirmPortal = \([\s\S]*?\);\n)/,
        `$1    model.confirmPortal = confirmPortal;\n`,
    );
    content = content.replace(
        '\n    return (\n        <>\n        <div\n            className="fixed inset-0 z-[200]',
        '\n    return (\n        <ActiveOrderFileContext.Provider value={model}>\n        <>\n        <motion.div\n            className="fixed inset-0 z-[200]',
    );
    content = content.replace(
        '{confirmPortal}\n        </>\n    );\n};',
        '{confirmPortal}\n        </>\n        </ActiveOrderFileContext.Provider>\n    );\n};',
    );
}

fs.writeFileSync(srcPath, content);
console.log('finalize patches applied');
