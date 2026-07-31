import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalPersonalCoercivePanels } from './ExecutionFollowupModalPersonalCoercivePanels';
import { ExecutionFollowupModalMidPanels } from './ExecutionFollowupModalMidPanels';
import { ExecutionFollowupModalLatePanels } from './ExecutionFollowupModalLatePanels';

/** Keep-alive tab panels for followup modal — split by panel groups. */
export function ExecutionFollowupModalTabPanels({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    return (
        <>
            <ExecutionFollowupModalPersonalCoercivePanels c={c} />
            <ExecutionFollowupModalMidPanels c={c} />
            <ExecutionFollowupModalLatePanels c={c} />
        </>
    );
}
