import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalShell } from './ExecutionFollowupModalShell';
import { ExecutionFollowupModalTabPanels } from './ExecutionFollowupModalTabPanels';

export function ExecutionFollowupModalView({ c }: { c: ExecutionFollowupModalPortalController }) {
    return (
        <ExecutionFollowupModalShell c={c}>
            <ExecutionFollowupModalTabPanels c={c} />
        </ExecutionFollowupModalShell>
    );
}
