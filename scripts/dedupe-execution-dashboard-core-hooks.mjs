import fs from 'fs';

const p = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let c = fs.readFileSync(p, 'utf8');

function removeBetween(a, b) {
    const i = c.indexOf(a);
    if (i < 0) {
        console.log('[skip]', a.slice(0, 48));
        return;
    }
    const j = c.indexOf(b, i);
    if (j < 0) throw new Error(`end not found for ${a.slice(0, 48)}`);
    c = c.slice(0, i) + c.slice(j);
    console.log('[removed]', a.slice(0, 52).trim());
}

removeBetween(
    '    const [summonsHubInitialMainTab, setSummonsHubInitialMainTab] = useState<\n',
    '    // ===========================\n    // 7-YEAR STATUTE',
);
removeBetween(
    '    const [decisionsReloadEpoch, setDecisionsReloadEpoch] = useState(0);\n',
    '    const [showGuarantorDetailsModal, setShowGuarantorDetailsModal] = useState(false);\n',
);
removeBetween(
    '    useEffect(() => {\n        if (!executionData?.id) return;\n        setSummoningRound(executionData.summoningRound ?? 1);\n',
    '    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {\n',
);

const oldHandler = `            const tabRaw = String(ce.detail?.tab || '').trim();
            const tab =
                tabRaw === 'current' || tabRaw === 'previous' || tabRaw === 'appeals'
                    ? tabRaw
                    : undefined;
            const did = String(ce.detail?.decisionId || '').trim() || null;
            const boot = resolveDecisionsModalBootState(
                tab || did ? { tab: tab ?? null, decisionId: did } : undefined
            );
            setDecisionsModalBootHubTab(boot.hubTab);
            setDecisionsModalBootListTab(boot.listTab);
            setDecisionsModalScrollToDecisionId(boot.scrollDecisionId);
            setAppealsModalScrollToDecisionId(boot.scrollAppealId);
            setShowDecisionsModal(true);`;

const newHandler = `            const tabRaw = String(ce.detail?.tab || '').trim();
            const tab =
                tabRaw === 'current' || tabRaw === 'previous' || tabRaw === 'appeals'
                    ? tabRaw
                    : undefined;
            const did = String(ce.detail?.decisionId || '').trim() || null;
            openDecisionsModalWithBoot(
                tab || did ? { tab: tab ?? undefined, decisionId: did } : undefined,
            );`;

if (!c.includes(oldHandler)) throw new Error('handler block not found');
c = c.replace(oldHandler, newHandler);

fs.writeFileSync(p, c);
console.log('[dedupe-execution-dashboard-core-hooks] lines', c.split('\n').length);
