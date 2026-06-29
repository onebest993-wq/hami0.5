/**
 * Phase C — فصل orchestrator عن view logic (chunk execution-dashboard-state).
 * يحافظ على JSX/modals كما هي — لا تغيير سلوك.
 */
import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const viewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.tsx';
const backupPath = '.tmp-exec-dash-pre-phase-c.tsx';

let content = fs.readFileSync(dashPath, 'utf8');
fs.writeFileSync(backupPath, content);

if (!content.includes('export const ExecutionDashboard')) {
    console.error('[phase-c] ExecutionDashboard export not found');
    process.exit(1);
}

content = content.replace(
    /export const ExecutionDashboard(?:: React\.FC<[^>]+>)? = React\.memo\(\(\{/,
    'export const ExecutionDashboardView = React.memo(({',
);

if (content.includes("from './caseShare/")) {
    content = content.replaceAll(
        "from './caseShare/",
        "from '@/app/components/lawyer/caseShare/",
    );
}
content = content
    .replaceAll("from './ExecutionDashboard/hooks/", "from './")
    .replaceAll("from './ExecutionDashboard/components/", "from '../components/")
    .replaceAll("from './ExecutionDashboard/", "from '../")
    .replaceAll("from './ExecutionDashboard/types'", "from '../types'");

const viewHeader = `// @ts-nocheck
/** منطق + عرض ExecutionDashboard — chunk execution-dashboard-state */
`;

fs.writeFileSync(viewPath, viewHeader + content.replace(/^\/\/ @ts-nocheck\n/, ''));

const thinDash = `// @ts-nocheck
/** Orchestrator رفيع — يحمّل useExecutionDashboardView في chunk منفصل */
import React from 'react';
import { ExecutionDashboardView } from './ExecutionDashboard/hooks/useExecutionDashboardView';
import type { ExecutionDashboardProps } from './ExecutionDashboard/types';

export const ExecutionDashboard = React.memo(function ExecutionDashboard(props: ExecutionDashboardProps) {
    return <ExecutionDashboardView {...props} />;
});
`;

fs.writeFileSync(dashPath, thinDash);

console.log('[phase-c] split complete', {
    viewLines: fs.readFileSync(viewPath, 'utf8').split('\n').length,
    dashLines: thinDash.split('\n').length,
    backup: backupPath,
});
