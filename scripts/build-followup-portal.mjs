import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dashPath = path.join(root, 'src/app/components/lawyer/ExecutionDashboard.tsx');
const portalPath = path.join(root, 'src/app/components/lawyer/ExecutionDashboard/ExecutionFollowupModalPortal.tsx');
const contextPath = path.join(root, 'src/app/components/lawyer/ExecutionDashboard/followupModalContext.tsx');
const snapshotPath = path.join(root, 'src/app/components/lawyer/ExecutionDashboard/followupModalSnapshot.ts');

const jsxPath = path.join(root, 'scripts/followup-portal-jsx.txt');
if (!fs.existsSync(jsxPath)) {
    console.error('Missing scripts/followup-portal-jsx.txt — run git extract first');
    process.exit(1);
}
const jsxRaw = fs.readFileSync(jsxPath, 'utf8');
const jsx = jsxRaw.replace(/,\s*$/, '');

const IMPORTED_IN_PORTAL = new Set([
    'Suspense',
    'React',
    'motion',
    'X',
    'ChevronLeft',
    'ChevronRight',
    'ClipboardList',
    'LazyCoerciveTab',
    'LazyCommunicationsTab',
    'LazyDossierControlsTab',
    'LazyFinancialTab',
    'LazyOtherPartyTab',
    'LazyPersonalTab',
    'LazyRequestsTab',
    'LazySeizureRequestsTab',
    'LazyPersonalCoerciveFollowupPanel',
    'LazyEmployeeAssignmentCoerciveFollowupBlock',
    'LazyEvictionFieldProceduresPanel',
    'LazyOtherPartyActionsLog',
    'EXEC_MODAL_BACKDROP_STRONG',
    'EXEC_MODAL_Z',
    'EXEC_OVERLAY_LAZY_FALLBACK',
    'isSpecificDeliveryClaim',
    'resolveDebtorDisplayNameForKey',
    'normalizeDossierLifecycleStatus',
    'EVICTION_TIMELINE_ACTION_IDS',
    'SecureStoreService',
]);

const SKIP = new Set([
    'undefined',
    'null',
    'true',
    'false',
    'NaN',
    'Infinity',
    'JSON',
    'document',
    'console',
    'Math',
    'Date',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'Promise',
    'Set',
    'Map',
]);

const source = `const __followupJsx = (\n${jsx}\n);\n`;
const sf = ts.createSourceFile('followup.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
ts.bindSourceFile(sf, {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
});

/** @param {ts.Node} node */
function isJsxIntrinsicTagName(node) {
    const p = node.parent;
    if (!ts.isIdentifier(node)) return false;
    if (ts.isJsxOpeningElement(p) && p.tagName === node) return /^[a-z]/.test(node.text);
    if (ts.isJsxClosingElement(p) && p.tagName === node) return /^[a-z]/.test(node.text);
    if (ts.isJsxSelfClosingElement(p) && p.tagName === node) return /^[a-z]/.test(node.text);
    return false;
}

/** @param {ts.Node} node */
function isJsxAttributeName(node) {
    const p = node.parent;
    return ts.isJsxAttribute(p) && p.name === node;
}

/** @param {ts.Node} node */
function isPropertyName(node) {
    const p = node.parent;
    if (ts.isPropertyAccessExpression(p) && p.name === node) return true;
    if (ts.isPropertyAssignment(p) && p.name === node && !ts.isShorthandPropertyAssignment(p)) return true;
    if (ts.isMethodDeclaration(p) && p.name === node) return true;
    if (ts.isMethodSignature(p) && p.name === node) return true;
    if (ts.isBindingElement(p) && p.propertyName === node) return true;
    return false;
}

const externalIds = new Set();

/** @param {ts.Node} node @param {Set<string>} scope */
function walkScoped(node, scope) {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const fnScope = new Set(scope);
        for (const param of node.parameters) {
            if (ts.isIdentifier(param.name)) fnScope.add(param.name.text);
        }
        walkScoped(node.body, fnScope);
        return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (node.initializer) walkScoped(node.initializer, scope);
        scope.add(node.name.text);
        return;
    }

    if (ts.isIdentifier(node)) {
        if (node.text.startsWith('__')) return;
        if (scope.has(node.text)) return;
        if (SKIP.has(node.text)) return;
        if (IMPORTED_IN_PORTAL.has(node.text)) return;
        if (isJsxIntrinsicTagName(node)) return;
        if (isJsxAttributeName(node)) return;
        if (isPropertyName(node)) return;
        externalIds.add(node.text);
        return;
    }

    ts.forEachChild(node, (child) => walkScoped(child, scope));
}

walkScoped(sf, new Set());

const sortedIds = [...externalIds].filter(Boolean).sort();

const contextFile = `import { createContext, useContext } from 'react';

/** Snapshot passed from ExecutionDashboard while محضر المتابعة is open. */
export type FollowupModalSnapshot = Record<string, unknown>;

export const FollowupModalContext = createContext<FollowupModalSnapshot | null>(null);

export function useFollowupModal(): FollowupModalSnapshot {
    const ctx = useContext(FollowupModalContext);
    if (!ctx) {
        throw new Error('useFollowupModal must run inside FollowupModalContext.Provider');
    }
    return ctx;
}
`;

const snapshotFile = `import type { FollowupModalSnapshot } from './followupModalContext';

/** Shallow pass-through — keeps ExecutionDashboard call site generated and typed. */
export function buildFollowupModalSnapshot(snapshot: FollowupModalSnapshot): FollowupModalSnapshot {
    return snapshot;
}
`;

const portalFile = `import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyEvictionFieldProceduresPanel,
    LazyFinancialTab,
    LazyOtherPartyActionsLog,
    LazyOtherPartyTab,
    LazyPersonalCoerciveFollowupPanel,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from './executionDashboardLazyShell';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { EVICTION_TIMELINE_ACTION_IDS, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import SecureStoreService from '@/app/services/SecureStoreService';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/partyDisplayName';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { useFollowupModal } from './followupModalContext';

export function ExecutionFollowupModalPortal() {
    const {
        ${sortedIds.join(',\n        ')}
    } = useFollowupModal() as Record<string, never>;

    if (typeof document === 'undefined') return null;

    return createPortal(
${jsx},
        document.body,
    );
}
`;

fs.writeFileSync(contextPath, contextFile);
fs.writeFileSync(snapshotPath, snapshotFile);
fs.writeFileSync(portalPath, portalFile);

const snapshotFields = sortedIds.map((id) => `        ${id},`).join('\n');
const snapshotBlock = `{showUnifiedExecutionModal && (
                <FollowupModalContext.Provider
                    value={buildFollowupModalSnapshot({
${snapshotFields}
                    })}
                >
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutionFollowupModalPortal />
                    </Suspense>
                </FollowupModalContext.Provider>
                )}`;

fs.writeFileSync(
    path.join(root, 'scripts/followup-portal-replacement.txt'),
    snapshotBlock,
);

const dashLines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);
const startIdx = dashLines.findIndex((l) => l.includes('{/* UNIFIED EXECUTION & ASSETS MODAL'));
const endIdx = dashLines.findIndex(
    (l, i) => i > startIdx && l.trim() === ')}' && dashLines[i - 1]?.trim() === 'document.body',
);
if (startIdx >= 0 && endIdx >= 0 && !dashLines[startIdx + 1]?.includes('FollowupModalContext')) {
    const newDashLines = [
        ...dashLines.slice(0, startIdx),
        '                {/* UNIFIED EXECUTION & ASSETS MODAL — lazy portal (نفس الشكل؛ chunk منفصل) */}',
        ...snapshotBlock.split('\n'),
        ...dashLines.slice(endIdx + 1),
    ];
    fs.writeFileSync(dashPath, newDashLines.join('\n'));
    console.log('Patched ExecutionDashboard.tsx lines', startIdx + 1, '-', endIdx + 1);
} else if (startIdx >= 0) {
    console.log('ExecutionDashboard already patched — portal JSX only regenerated');
}

console.log('External refs:', sortedIds.length);
