import fs from 'node:fs';

/** مكوّنات اختيارية — fallback محلي في portal/controller وليست حقول snapshot */
export const FOLLOWUP_PORTAL_OPTIONAL_COMPONENT_KEYS = new Set([
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

export function extractFollowupSnapshotFieldKeysFromSource(keysSource) {
    return [...keysSource.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

export function extractFollowupPortalControllerKeys(controllerSource) {
    const marker = '} = useFollowupModal()';
    const end = controllerSource.indexOf(marker);
    if (end < 0) {
        throw new Error('Could not locate useFollowupModal destructure in portal controller');
    }
    const start = controllerSource.lastIndexOf('const {', end);
    if (start < 0) {
        throw new Error('Could not locate destructure start in portal controller');
    }
    const block = controllerSource.slice(start + 7, end);
    return block
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => entry.split(':')[0].trim());
}

export function readFollowupPortalControllerSource(rootDir = process.cwd()) {
    const controllerPath =
        'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts';
    return fs.readFileSync(`${rootDir}/${controllerPath}`, 'utf8');
}

export function readFollowupSnapshotKeysSource(rootDir = process.cwd()) {
    const keysPath = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';
    return fs.readFileSync(`${rootDir}/${keysPath}`, 'utf8');
}

export function findPortalKeysMissingFromSnapshot({
    controllerSource,
    keysSource,
    optionalKeys = FOLLOWUP_PORTAL_OPTIONAL_COMPONENT_KEYS,
}) {
    const portalKeys = extractFollowupPortalControllerKeys(controllerSource);
    const snapshotKeys = new Set(extractFollowupSnapshotFieldKeysFromSource(keysSource));
    const missing = portalKeys.filter((k) => !snapshotKeys.has(k) && !optionalKeys.has(k));
    return { portalKeys, snapshotKeys, missing };
}
