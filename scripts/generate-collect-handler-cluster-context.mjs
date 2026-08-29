import fs from 'fs';

const coreKeys = JSON.parse(
    fs.readFileSync('scripts/handler-cluster-core-keys.json', 'utf8'),
);

const namesPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/handlerClusterCoreKeyNames.ts';

const ts = `/** مفاتي core المتبقية (مرجع للتوليد — ${coreKeys.length} key) */
export const HANDLER_CLUSTER_CORE_KEY_NAMES = ${JSON.stringify(coreKeys, null, 4)} as const;
`;

fs.writeFileSync(namesPath, ts, 'utf8');
console.log('handlerClusterCoreKeyNames.ts OK, core keys', coreKeys.length);
