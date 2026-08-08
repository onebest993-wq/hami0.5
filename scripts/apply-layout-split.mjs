import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const p = path.join(root, 'ActiveOrderFileRoot.tsx');
let s = fs.readFileSync(p, 'utf8');

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

if (!s.includes('useStableModelRef')) {
    s = s.replace(
        "import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';",
        `import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';${extraImports}`,
    );
}

// Remove inline ValidationBanner
s = s.replace(
    /\n    const ValidationBanner = \(\{ text \}: \{ text: string \}\) => \([\s\S]*?\);\n/,
    '\n',
);

// Insert model ref + provider before return (
const returnMatch = s.match(/\n    const confirmPortal = [\s\S]*?\n\n    return \(/);
if (!returnMatch) {
    console.error('confirmPortal block not found');
    process.exit(1);
}

const providerWrap = `
    const model = useStableModelRef({
        fileData: fd,
        onClose,
        onCaseUpdated,
        caseId,
        userId,
        caseData,
        setCaseData,
        confirmPortal: null as unknown as React.ReactNode,
    });

`;

if (!s.includes('useStableModelRef')) {
    console.error('imports failed');
    process.exit(1);
}

if (!s.includes('const model = useStableModelRef')) {
    s = s.replace('\n    return (', `${providerWrap}\n    return (`);
    s = s.replace(
        '    const confirmPortal = (',
        `    const confirmPortal = (`,
    );
    // assign confirmPortal to model after it's defined - use pattern:
    s = s.replace(
        /const confirmPortal = \([\s\S]*?\);\n\n    return \(/,
        (block) => {
            const portalOnly = block.replace(/\n\n    return \($/, '');
            return `${portalOnly}\n    model.confirmPortal = confirmPortal;\n\n    return (`;
        },
    );
    s = s.replace(
        '    return (\n        <>\n        <motion.div',
        '    return (\n        <ActiveOrderFileContext.Provider value={model}>\n        <>\n        <div',
    );
    s = s.replace(
        /\{confirmPortal\}\n        <\/>\n    \);\n\};/,
        '{confirmPortal}\n        </>\n        </ActiveOrderFileContext.Provider>\n    );\n};',
    );
}

fs.writeFileSync(p, s);
console.log('provider wrap applied');
