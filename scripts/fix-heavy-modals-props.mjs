import fs from 'fs';

const filePath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const skip = new Set([
    'React',
    'Suspense',
    's',
    'Record',
    'any',
    'String',
    'Boolean',
    'import',
    'from',
    'export',
    'function',
    'return',
    'null',
    'true',
    'false',
    'void',
    'type',
    'const',
    'if',
    'else',
    'new',
    'Date',
    'prev',
    'next',
    'open',
    'info',
    'event',
    'message',
    'default',
    'then',
    'catch',
    'queueMicrotask',
    'find',
    'undefined',
    'async',
    'await',
    'LazyDocumentVault',
    'LazyRealEstateSeizurePostApprovalModal',
    'LazyExecutionDecisionsModalContainer',
    'LazyExecutionSeizedAssetsModalContainer',
    'LazyExecutionPaymentModalContainer',
    'LazyExecutionFullTimelineModalContainer',
    'LazyExecutionDebtorNotificationMemoModalContainer',
    'LazyExecutionCoerciveActionsModalContainer',
    'LazyExecutionHeirsNotificationModalContainer',
    'LazyExecutionModalsContainer',
    'LazyAlimonyBeneficiaryDeathModal',
    'LazyUnifiedSummonsModalContainer',
    'LazyPaymentCalculator',
    'LazySettlementCalculator',
    'LazyExecutionFinancialLedgerPortalContainer',
    'LazyExecutionTransferFileNumberModal',
    'LazyLinkedDossierTimelineModal',
    'LazyGuarantorDetailsPostApprovalModal',
    'LazyStayOfExecutionModal',
    'LazyPartyDeathReportModal',
    'LazyDecisionsAndAppealsEngine',
    'LazyModalSeizedAssetsManager',
    'LazyPremiumTimelineAuditLog',
    'LazyUnifiedSummonsHub',
    'EXEC_OVERLAY_LAZY_FALLBACK',
    'TimelineEvent',
]);

const bareIds = new Set();
const re = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
for (const line of content.split('\n')) {
    if (line.trim().startsWith('import ')) continue;
    let m;
    while ((m = re.exec(line))) {
        const id = m[1];
        if (skip.has(id)) continue;
        const idx = m.index;
        const before = line.slice(Math.max(0, idx - 2), idx);
        if (before.endsWith('s.')) continue;
        if (before.endsWith('.')) continue;
        if (line.includes(`${id}:`) && line.indexOf(`${id}:`) < idx) continue;
        bareIds.add(id);
    }
}

const ordered = [...bareIds].sort((a, b) => b.length - a.length);
for (const id of ordered) {
    const rx = new RegExp(`(?<!s\\.)\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    content = content.replace(rx, `s.${id}`);
}

if (!content.includes('executionDashboardConstants')) {
    content = content.replace(
        "} from '../executionDashboardLazyShell';",
        `} from '../executionDashboardLazyShell';\nimport {\n    EXEC_MODAL_BACKDROP_STRONG,\n    EXEC_MODAL_Z,\n} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';`,
    );
}

content = content.replace(
    'export function ExecutionDashboardHeavyModals(s: Record<string, any>) {',
    'export function ExecutionDashboardHeavyModals(props: Record<string, any>) {\n    const s = props;',
);

fs.writeFileSync(filePath, content);
console.log('patched HeavyModals, prefixed', ordered.length, 'identifiers');
