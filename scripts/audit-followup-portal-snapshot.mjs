import fs from 'node:fs';

/**
 * يقارن مفاتيح Portal مع حقول snapshot الحية (followupSnapshotFieldKeys)
 * بدل مسار ExecutionDashboard.tsx القديم الذي لم يعد يبني الـ snapshot.
 */
const portalPath = 'src/app/components/lawyer/ExecutionDashboard/ExecutionFollowupModalPortal.tsx';
const keysPath = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';

const portal = fs.readFileSync(portalPath, 'utf8');
const keysSrc = fs.readFileSync(keysPath, 'utf8');

if (portal.includes('useExecutionFollowupModalPortalController')) {
    const controllerPath =
        'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts';
    const viewPath =
        'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupModalView.tsx';
    if (!fs.existsSync(controllerPath) || !fs.existsSync(viewPath)) {
        console.error('Missing controller/view for followup portal');
        process.exit(1);
    }
    console.log('OK — followup portal uses controller bundle (snapshot keys audited separately)');
    process.exit(0);
}

const destructureStart = portal.indexOf('} = useFollowupModal()');
if (destructureStart < 0) {
    console.error('Could not locate useFollowupModal destructure in portal');
    process.exit(1);
}
const block = portal.slice(portal.indexOf('const {') + 7, destructureStart);
const portalKeys = block
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const snapshotKeys = new Set(
    [...keysSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]),
);

/** مكوّنات اختيارية تُمرَّر عبر السياق مع fallback محلي في Portal */
const OPTIONAL_COMPONENT_OVERRIDES = new Set([
    'CoerciveTab',
    'CommunicationsTab',
    'DebtorFinancialProgressBar',
    'DossierControlsTab',
    'FinancialTab',
    'OtherPartyTab',
    'PersonalTab',
    'RequestsTab',
    'SeizureRequestsTab',
]);

const missing = portalKeys.filter(
    (k) => !snapshotKeys.has(k) && !OPTIONAL_COMPONENT_OVERRIDES.has(k),
);

console.log('Portal expects', portalKeys.length, 'keys');
console.log('Snapshot field keys', snapshotKeys.size);
console.log('Missing from snapshot:', missing.length ? missing.join(', ') : 'none');
if (missing.length > 0) {
    process.exit(1);
}
console.log('OK — portal keys covered by followup snapshot field keys');
